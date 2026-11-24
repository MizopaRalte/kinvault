import { hashPin, signJwt, verifyPuk } from '../../_lib/crypto';
import type { DbPerson } from '../../_lib/permissions';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const body = (await request.json()) as {
      inviteCode?: string;
      pukCode?: string;
      newPin?: string;
      deviceId?: string;
    };

    const inviteCode = body.inviteCode?.trim().toUpperCase();
    const pukCode = body.pukCode?.trim().toUpperCase();
    const newPin = body.newPin?.trim();
    const deviceId = body.deviceId?.trim();

    if (!inviteCode || !pukCode || !newPin || !deviceId) {
      return new Response(
        JSON.stringify({ error: 'Invite code, PUK recovery code, new 6-digit PIN, and device ID are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!/^\d{6}$/.test(newPin)) {
      return new Response(
        JSON.stringify({ error: 'New PIN must be exactly 6 digits.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tree = await env.DB.prepare(
      'SELECT id, invite_code, name, puk_hash, puk_salt, created_at FROM trees WHERE invite_code = ?'
    )
      .bind(inviteCode)
      .first<{
        id: string;
        invite_code: string;
        name: string;
        puk_hash: string | null;
        puk_salt: string | null;
        created_at: number;
      }>();

    if (!tree) {
      return new Response(
        JSON.stringify({ error: 'Family tree not found with this invite code.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!tree.puk_hash || !tree.puk_salt) {
      return new Response(
        JSON.stringify({ error: 'This tree has no PUK recovery code configured. Please contact the global administrator for assistance.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isPukValid = await verifyPuk(pukCode, tree.puk_hash, tree.puk_salt);
    if (!isPukValid) {
      return new Response(
        JSON.stringify({ error: 'Incorrect PUK recovery code.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reset PIN with new salt and hash
    const { hash: pinHash, salt: pinSalt } = await hashPin(newPin);
    await env.DB.prepare('UPDATE trees SET pin_hash = ?, pin_salt = ? WHERE id = ?')
      .bind(pinHash, pinSalt, tree.id)
      .run();

    // Look for any profile already claimed by this device in this tree
    const claimedPerson = await env.DB.prepare(
      'SELECT id, tree_id, household_id, full_name, role FROM persons WHERE tree_id = ? AND claimed_device_id = ? LIMIT 1'
    )
      .bind(tree.id, deviceId)
      .first<DbPerson>();

    // Issue 365-day session JWT
    const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
    const token = await signJwt({ treeId: tree.id, deviceId, exp }, env.JWT_SECRET);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Family PIN reset successfully.',
        tree: {
          id: tree.id,
          name: tree.name,
          inviteCode: tree.invite_code,
          createdAt: tree.created_at,
        },
        claimedPerson: claimedPerson || null,
        token,
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
