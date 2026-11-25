import { generateInviteCode, generatePukCode, hashPin, hashPuk, signJwt } from '../../_lib/crypto';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const body = (await request.json()) as {
      treeName?: string;
      pin?: string;
      creatorName?: string;
      deviceId?: string;
      branchColor?: string;
      city?: string;
      country?: string;
    };

    const treeName = body.treeName?.trim();
    const pin = body.pin?.trim();
    const creatorName = body.creatorName?.trim();
    const deviceId = body.deviceId?.trim();

    if (!treeName || treeName.length < 2) {
      return new Response(JSON.stringify({ error: 'Tree name must be at least 2 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!pin || !/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: 'PIN must be exactly 6 digits.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!creatorName || creatorName.length < 2) {
      return new Response(JSON.stringify({ error: 'Creator name must be at least 2 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!deviceId) {
      return new Response(JSON.stringify({ error: 'Device identifier is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate unique 8-character invite code
    let inviteCode = '';
    let isUnique = false;
    for (let attempts = 0; attempts < 10; attempts++) {
      const codeCandidate = generateInviteCode(8);
      const existing = await env.DB.prepare('SELECT id FROM trees WHERE invite_code = ?')
        .bind(codeCandidate)
        .first();
      if (!existing) {
        inviteCode = codeCandidate;
        isUnique = true;
        break;
      }
    }

    if (!isUnique) {
      return new Response(JSON.stringify({ error: 'Failed to generate unique invite code. Please try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { hash: pinHash, salt: pinSalt } = await hashPin(pin);
    const pukCode = generatePukCode();
    const { hash: pukHash, salt: pukSalt } = await hashPuk(pukCode);
    const now = Date.now();

    const treeId = crypto.randomUUID();
    const householdId = crypto.randomUUID();
    const personId = crypto.randomUUID();

    const branchColor = body.branchColor?.trim() || '#0F172A';
    const city = body.city?.trim() || '';
    const country = body.country?.trim() || '';

    // Batch execute creation in D1
    await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO trees (id, invite_code, name, pin_hash, pin_salt, puk_hash, puk_salt, puk_created_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(treeId, inviteCode, treeName, pinHash, pinSalt, pukHash, pukSalt, now, now),
      env.DB.prepare(
        'INSERT INTO households (id, tree_id, family_name, branch_color, address_line, city, postal_code, country, family_photo_b64, created_by_device_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(householdId, treeId, `${creatorName} Family`, branchColor, '', city, '', country, '', deviceId, now),
      env.DB.prepare(
        'INSERT INTO persons (id, tree_id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, avatar_b64, role, claimed_device_id, created_by_device_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(personId, treeId, householdId, creatorName, '', '', '', '', 1, '', 'super_admin', deviceId, deviceId, now),
    ]);

    // Sign JWT valid for 365 days
    const exp = Math.floor(now / 1000) + 365 * 24 * 3600;
    const token = await signJwt({ treeId, deviceId, exp }, env.JWT_SECRET);

    return new Response(
      JSON.stringify({
        success: true,
        treeId,
        inviteCode,
        pukCode,
        personId,
        householdId,
        token,
      }),
      {
        status: 201,
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
