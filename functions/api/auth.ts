import { signJwt, verifyPin } from '../_lib/crypto';
import type { DbPerson } from '../_lib/permissions';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const body = (await request.json()) as {
      inviteCode?: string;
      pin?: string;
      deviceId?: string;
    };

    const inviteCode = body.inviteCode?.trim().toUpperCase();
    const pin = body.pin?.trim();
    const deviceId = body.deviceId?.trim();

    if (!inviteCode || !pin || !deviceId) {
      return new Response(JSON.stringify({ error: 'Invite code, 6-digit PIN, and device ID are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tree = await env.DB.prepare(
      'SELECT id, invite_code, name, pin_hash, pin_salt, created_at FROM trees WHERE invite_code = ?'
    )
      .bind(inviteCode)
      .first<{
        id: string;
        invite_code: string;
        name: string;
        pin_hash: string;
        pin_salt: string;
        created_at: number;
      }>();

    if (!tree) {
      return new Response(JSON.stringify({ error: 'Tree not found with this invite code.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isPinValid = await verifyPin(pin, tree.pin_hash, tree.pin_salt);
    if (!isPinValid) {
      return new Response(JSON.stringify({ error: 'Incorrect 6-digit PIN.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Look for any profile already claimed by this device in this tree
    const claimedPerson = await env.DB.prepare(
      'SELECT id, tree_id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, avatar_b64, role, claimed_device_id, updated_at FROM persons WHERE tree_id = ? AND claimed_device_id = ? LIMIT 1'
    )
      .bind(tree.id, deviceId)
      .first<DbPerson>();

    // 365-day token
    const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
    const token = await signJwt({ treeId: tree.id, deviceId, exp }, env.JWT_SECRET);

    return new Response(
      JSON.stringify({
        success: true,
        tree: {
          id: tree.id,
          name: tree.name,
          inviteCode: tree.invite_code,
          createdAt: tree.created_at,
        },
        claimedPerson: claimedPerson || null,
        token,
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
