import { verifyJwt } from '../_lib/crypto';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or malformed Authorization header.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.substring(7);
    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid or expired authentication token.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const treeId = payload.treeId;

    // Load full tree metadata, households, persons, and relationships
    const [treeResult, householdsResult, personsResult, relsResult] = await Promise.all([
      env.DB.prepare('SELECT id, invite_code, name, created_at FROM trees WHERE id = ?').bind(treeId).first(),
      env.DB.prepare('SELECT * FROM households WHERE tree_id = ? ORDER BY family_name ASC').bind(treeId).all(),
      env.DB.prepare('SELECT * FROM persons WHERE tree_id = ? ORDER BY full_name ASC').bind(treeId).all(),
      env.DB.prepare('SELECT * FROM relationships WHERE tree_id = ?').bind(treeId).all(),
    ]);

    if (!treeResult) {
      return new Response(JSON.stringify({ error: 'Family tree not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        tree: treeResult,
        households: householdsResult.results || [],
        persons: personsResult.results || [],
        relationships: relsResult.results || [],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
