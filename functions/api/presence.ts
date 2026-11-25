import { verifyJwt } from '../_lib/crypto';
import type { DbPerson } from '../_lib/permissions';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface PresenceRow {
  tree_id: string;
  device_id: string;
  person_id: string;
  display_name: string;
  active_household_id: string;
  activity: string;
  target_name: string;
  updated_at: number;
}

interface TreeEventRow {
  last_mutated_at: number;
  actor_name: string;
  summary: string;
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
    const now = Date.now();
    const body = (await request.json().catch(() => ({}))) as {
      activeHouseholdId?: string;
      activity?: string;
      targetName?: string;
      guestName?: string;
      leave?: boolean;
    };

    if (body.leave) {
      await env.DB.prepare('DELETE FROM tree_presence WHERE tree_id = ? AND device_id = ?')
        .bind(treeId, deviceId)
        .run();
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let caller: DbPerson | null = null;
    if (activePersonId) {
      caller = await env.DB.prepare(
        'SELECT id, full_name FROM persons WHERE id = ? AND tree_id = ? AND claimed_device_id = ?'
      )
        .bind(activePersonId, treeId, deviceId)
        .first<DbPerson>();
    }
    if (!caller) {
      caller = await env.DB.prepare(
        'SELECT id, full_name FROM persons WHERE tree_id = ? AND claimed_device_id = ? LIMIT 1'
      )
        .bind(treeId, deviceId)
        .first<DbPerson>();
    }

    const personId = caller?.id || '';
    const cleanGuest = typeof body.guestName === 'string' ? body.guestName.trim().slice(0, 60) : '';
    const displayName = caller?.full_name || cleanGuest || 'Guest';
    const activeHouseholdId = typeof body.activeHouseholdId === 'string' ? body.activeHouseholdId.slice(0, 64) : '';
    const activity =
      body.activity === 'editing' || body.activity === 'adding' ? body.activity : 'viewing';
    const targetName = typeof body.targetName === 'string' ? body.targetName.slice(0, 80) : '';
    const staleCutoff = now - 45_000;

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO tree_presence (tree_id, device_id, person_id, display_name, active_household_id, activity, target_name, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tree_id, device_id) DO UPDATE SET
           person_id = excluded.person_id,
           display_name = excluded.display_name,
           active_household_id = excluded.active_household_id,
           activity = excluded.activity,
           target_name = excluded.target_name,
           updated_at = excluded.updated_at`
      ).bind(treeId, deviceId, personId, displayName, activeHouseholdId, activity, targetName, now),
      env.DB.prepare('DELETE FROM tree_presence WHERE tree_id = ? AND updated_at < ?')
        .bind(treeId, now - 90_000),
    ]);

    const [presenceRes, eventRow] = await Promise.all([
      env.DB.prepare(
        `SELECT device_id, person_id, display_name, active_household_id, activity, target_name, updated_at
         FROM tree_presence
         WHERE tree_id = ? AND updated_at >= ?
         ORDER BY updated_at DESC`
      )
        .bind(treeId, staleCutoff)
        .all<PresenceRow>(),
      env.DB.prepare(
        'SELECT last_mutated_at, actor_name, summary FROM tree_events WHERE tree_id = ?'
      )
        .bind(treeId)
        .first<TreeEventRow>(),
    ]);

    const activeUsers = (presenceRes.results || []).map((row) => ({
      deviceId: row.device_id,
      personId: row.person_id || '',
      displayName: row.display_name || 'Guest',
      activeHouseholdId: row.active_household_id || '',
      activity: row.activity || 'viewing',
      targetName: row.target_name || '',
      updatedAt: row.updated_at,
    }));

    return new Response(
      JSON.stringify({
        activeUsers,
        lastEvent: eventRow
          ? {
              lastMutatedAt: eventRow.last_mutated_at,
              actorName: eventRow.actor_name,
              summary: eventRow.summary,
            }
          : null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Presence error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
