import { verifyJwt } from '../_lib/crypto';
import type { DbPerson } from '../_lib/permissions';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const tokenPayload = await verifyJwt(token, env.JWT_SECRET);
    if (!tokenPayload) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { treeId, deviceId } = tokenPayload;
    const activePersonId = request.headers.get('X-Person-Id');

    // Super-admin verification - strictly bound to authenticated deviceId
    let caller: DbPerson | null = null;
    if (activePersonId) {
      caller = await env.DB.prepare('SELECT * FROM persons WHERE id = ? AND tree_id = ? AND claimed_device_id = ?')
        .bind(activePersonId, treeId, deviceId)
        .first<DbPerson>();
    }
    if (!caller) {
      caller = await env.DB.prepare('SELECT * FROM persons WHERE tree_id = ? AND claimed_device_id = ? LIMIT 1')
        .bind(treeId, deviceId)
        .first<DbPerson>();
    }

    if (!caller || caller.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only the Super Admin can perform a full tree restore.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as {
      tree?: { id: string; name: string };
      households?: any[];
      persons?: any[];
      relationships?: any[];
    };

    if (!body || !Array.isArray(body.households) || !Array.isArray(body.persons) || !Array.isArray(body.relationships)) {
      return new Response(JSON.stringify({ error: 'Invalid backup structure.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const now = Date.now();

    // Prepare batch operations
    const batchStatements: D1PreparedStatement[] = [
      // Clear existing records for this tree (except trees record itself)
      env.DB.prepare('DELETE FROM relationships WHERE tree_id = ?').bind(treeId),
      env.DB.prepare('DELETE FROM persons WHERE tree_id = ?').bind(treeId),
      env.DB.prepare('DELETE FROM households WHERE tree_id = ?').bind(treeId),
    ];

    // If backup contains a tree name update
    if (body.tree?.name) {
      batchStatements.push(
        env.DB.prepare('UPDATE trees SET name = ? WHERE id = ?').bind(body.tree.name, treeId)
      );
    }

    // Insert households
    for (const h of body.households) {
      batchStatements.push(
        env.DB.prepare(
          `INSERT INTO households (id, tree_id, family_name, branch_color, address_line, city, postal_code, country, family_photo_b64, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          h.id || crypto.randomUUID(),
          treeId,
          h.family_name || 'Restored Family',
          h.branch_color || '#0F172A',
          h.address_line || '',
          h.city || '',
          h.postal_code || '',
          h.country || '',
          h.family_photo_b64 || '',
          h.updated_at || now
        )
      );
    }

    // Insert persons
    for (const p of body.persons) {
      batchStatements.push(
        env.DB.prepare(
          `INSERT INTO persons (id, tree_id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, avatar_b64, role, claimed_device_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          p.id || crypto.randomUUID(),
          treeId,
          p.household_id || null,
          p.full_name || 'Restored Person',
          p.nickname_or_maiden || '',
          p.phone_e164 || '',
          p.birth_year || '',
          p.death_year || '',
          p.is_living !== undefined ? (p.is_living ? 1 : 0) : 1,
          p.avatar_b64 || '',
          p.role || 'member',
          p.claimed_device_id || '',
          p.updated_at || now
        )
      );
    }

    // Insert relationships
    for (const r of body.relationships) {
      batchStatements.push(
        env.DB.prepare(
          `INSERT INTO relationships (id, tree_id, person_a_id, person_b_id, rel_type)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          r.id || crypto.randomUUID(),
          treeId,
          r.person_a_id,
          r.person_b_id,
          r.rel_type || 'parent_child'
        )
      );
    }

    // Execute in batches to prevent potential D1 limit per batch
    const BATCH_CHUNK_SIZE = 50;
    for (let i = 0; i < batchStatements.length; i += BATCH_CHUNK_SIZE) {
      const chunk = batchStatements.slice(i, i + BATCH_CHUNK_SIZE);
      await env.DB.batch(chunk);
    }

    return new Response(
      JSON.stringify({
        success: true,
        restored: {
          households: body.households.length,
          persons: body.persons.length,
          relationships: body.relationships.length,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
