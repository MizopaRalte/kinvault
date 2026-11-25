import {
  generateBase32Secret,
  generatePukCode,
  hashPin,
  hashPuk,
  signJwt,
  verifyJwt,
  verifyPin,
  verifyTotp,
} from '../../_lib/crypto';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  GLOBAL_ADMIN_SECRET?: string;
  GLOBAL_ADMIN_TOTP_SECRET?: string; // Optional Base32 TOTP secret env override
}

const GLOBAL_ADMIN_SUBJECT = '__GLOBAL_ADMIN__';

interface AdminConfig {
  envLockedSecret: boolean;
  envLockedTotp: boolean;
  dbSecretHash: string;
  dbSecretSalt: string;
  totpSecret: string;
}

async function getAdminConfig(env: Env): Promise<AdminConfig> {
  let rows: Array<{ key: string; value: string }> = [];
  try {
    const res = await env.DB.prepare(
      "SELECT key, value FROM system_config WHERE key IN ('admin_secret_hash', 'admin_secret_salt', 'admin_totp_secret')"
    ).all<{ key: string; value: string }>();
    rows = res.results || [];
  } catch {
    // Table may not exist on older setups; ignore safely
  }

  const map = new Map<string, string>();
  for (const r of rows) map.set(r.key, r.value);

  return {
    envLockedSecret: Boolean(env.GLOBAL_ADMIN_SECRET),
    envLockedTotp: Boolean(env.GLOBAL_ADMIN_TOTP_SECRET),
    dbSecretHash: map.get('admin_secret_hash') || '',
    dbSecretSalt: map.get('admin_secret_salt') || '',
    totpSecret: env.GLOBAL_ADMIN_TOTP_SECRET || map.get('admin_totp_secret') || '',
  };
}

async function verifyAdminCredentials(
  request: Request,
  env: Env,
  totpOverride?: string,
  allowToken: boolean = true
): Promise<{ authorized: boolean; reason?: string; config: AdminConfig }> {
  const config = await getAdminConfig(env);

  // 1. Check short-lived Admin JWT if allowed
  if (allowToken) {
    const authHeader = request.headers.get('Authorization');
    const token =
      request.headers.get('X-Admin-Token') ||
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '');
    if (token) {
      const payload = await verifyJwt(token, env.JWT_SECRET);
      if (payload && payload.treeId === GLOBAL_ADMIN_SUBJECT) {
        return { authorized: true, config };
      }
      return { authorized: false, reason: 'Admin session expired. Please sign in again.', config };
    }
  }

  const hasSecretConfigured = Boolean(env.GLOBAL_ADMIN_SECRET || (config.dbSecretHash && config.dbSecretSalt));
  const hasTotpConfigured = Boolean(config.totpSecret);

  if (!hasSecretConfigured && !hasTotpConfigured) {
    return {
      authorized: false,
      reason: 'Global Admin authentication is not configured. Set GLOBAL_ADMIN_SECRET in Cloudflare environment variables.',
      config,
    };
  }

  // 2. Verify Admin Secret Key if configured
  if (hasSecretConfigured) {
    const providedSecret = request.headers.get('X-Admin-Secret')?.trim() || '';
    if (!providedSecret) {
      return { authorized: false, reason: 'Missing Global Admin Secret.', config };
    }

    let secretValid = false;
    if (env.GLOBAL_ADMIN_SECRET) {
      secretValid = providedSecret === env.GLOBAL_ADMIN_SECRET;
    } else {
      secretValid = await verifyPin(providedSecret, config.dbSecretHash, config.dbSecretSalt);
    }

    if (!secretValid) {
      return { authorized: false, reason: 'Invalid Global Admin Secret.', config };
    }
  }

  // 3. Verify 2FA TOTP if active
  if (hasTotpConfigured) {
    const totpCode = (totpOverride ?? request.headers.get('X-Admin-Totp') ?? '').trim();
    if (!totpCode) {
      return { authorized: false, reason: '2FA Authenticator code is required.', config };
    }
    const validTotp = await verifyTotp(totpCode, config.totpSecret);
    if (!validTotp) {
      return { authorized: false, reason: 'Invalid 2FA Authenticator code.', config };
    }
  }

  return { authorized: true, config };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const auth = await verifyAdminCredentials(request, env);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: auth.reason }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('q')?.trim() || '';

    let query = `
      SELECT t.id, t.invite_code, t.name, t.puk_created_at, t.created_at,
             COUNT(DISTINCT p.id) as member_count,
             COUNT(DISTINCT h.id) as household_count,
             CASE WHEN t.puk_hash IS NOT NULL AND t.puk_hash != '' THEN 1 ELSE 0 END as has_puk
      FROM trees t
      LEFT JOIN persons p ON p.tree_id = t.id
      LEFT JOIN households h ON h.tree_id = t.id
    `;
    const params: any[] = [];

    if (search) {
      query += ` WHERE t.invite_code LIKE ? OR t.name LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY t.id ORDER BY t.created_at DESC LIMIT 50`;

    const result = await env.DB.prepare(query).bind(...params).all<{
      id: string;
      invite_code: string;
      name: string;
      puk_created_at: number;
      created_at: number;
      member_count: number;
      household_count: number;
      has_puk: number;
    }>();

    return new Response(
      JSON.stringify({
        success: true,
        trees: result.results || [],
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

export const onRequestPost = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const body = (await request.json()) as {
      action?: string;
      treeId?: string;
      personId?: string;
      householdId?: string;
      newPin?: string;
      totpCode?: string;
      secret?: string;
      newSecret?: string;
    };

    const action = body.action;
    const isVerifyAction = action === 'verify_admin';

    const auth = await verifyAdminCredentials(request, env, body.totpCode, !isVerifyAction);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: auth.reason }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { config } = auth;

    if (action === 'verify_admin') {
      const exp = Math.floor(Date.now() / 1000) + 7200; // 2 hours
      const adminToken = await signJwt(
        { treeId: GLOBAL_ADMIN_SUBJECT, deviceId: 'global-admin', exp },
        env.JWT_SECRET
      );
      return new Response(
        JSON.stringify({
          success: true,
          adminToken,
          is2faEnabled: Boolean(config.totpSecret),
          hasCustomSecret: Boolean(config.envLockedSecret || config.dbSecretHash),
          envLockedSecret: config.envLockedSecret,
          envLockedTotp: config.envLockedTotp,
          message: 'Admin verified successfully.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_security_status') {
      return new Response(
        JSON.stringify({
          success: true,
          is2faEnabled: Boolean(config.totpSecret),
          hasCustomSecret: Boolean(config.envLockedSecret || config.dbSecretHash),
          envLockedSecret: config.envLockedSecret,
          envLockedTotp: config.envLockedTotp,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'init_totp_setup') {
      if (config.envLockedTotp) {
        return new Response(
          JSON.stringify({ error: '2FA is currently managed via Cloudflare environment variables.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const secret = generateBase32Secret(32);
      const otpauthUrl = `otpauth://totp/KinVault:GlobalAdmin?secret=${secret}&issuer=KinVault&digits=6&period=30`;

      return new Response(
        JSON.stringify({
          success: true,
          secret,
          otpauthUrl,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'enable_totp') {
      if (config.envLockedTotp) {
        return new Response(
          JSON.stringify({ error: '2FA is managed via Cloudflare environment variables.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const candidateSecret = body.secret?.trim().toUpperCase().replace(/[^A-Z2-7]/g, '') || '';
      const code = body.totpCode?.trim() || '';

      if (candidateSecret.length < 16 || !/^\d{6}$/.test(code)) {
        return new Response(
          JSON.stringify({ error: 'Valid Base32 secret and 6-digit Authenticator code are required.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const valid = await verifyTotp(code, candidateSecret);
      if (!valid) {
        return new Response(
          JSON.stringify({ error: '6-digit code does not match. Check your Authenticator app and device clock.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const now = Date.now();
      await env.DB.prepare(
        `INSERT INTO system_config (key, value, updated_at) VALUES ('admin_totp_secret', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
        .bind(candidateSecret, now)
        .run();

      return new Response(
        JSON.stringify({ success: true, is2faEnabled: true, message: '2FA Authenticator activated.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'disable_totp') {
      if (config.envLockedTotp) {
        return new Response(
          JSON.stringify({ error: 'Remove GLOBAL_ADMIN_TOTP_SECRET in Cloudflare environment variables to disable.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!config.envLockedSecret && !(config.dbSecretHash && config.dbSecretSalt)) {
        return new Response(
          JSON.stringify({ error: 'Set a Master Admin Secret Key first before disabling 2FA.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const code = body.totpCode?.trim() || '';
      if (!config.totpSecret || !/^\d{6}$/.test(code)) {
        return new Response(
          JSON.stringify({ error: 'Enter your current 6-digit Authenticator code to disable 2FA.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const valid = await verifyTotp(code, config.totpSecret);
      if (!valid) {
        return new Response(
          JSON.stringify({ error: 'Invalid 6-digit Authenticator code.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      await env.DB.prepare("DELETE FROM system_config WHERE key = 'admin_totp_secret'").run();

      return new Response(
        JSON.stringify({ success: true, is2faEnabled: false, message: '2FA Authenticator disabled.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update_admin_secret') {
      if (config.envLockedSecret) {
        return new Response(
          JSON.stringify({ error: 'Admin Secret Key is managed via Cloudflare environment variable GLOBAL_ADMIN_SECRET.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const newSecret = body.newSecret?.trim() || '';
      if (newSecret.length < 8) {
        return new Response(
          JSON.stringify({ error: 'Admin Secret Key must be at least 8 characters.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { hash, salt } = await hashPin(newSecret);
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO system_config (key, value, updated_at) VALUES ('admin_secret_hash', ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        ).bind(hash, now),
        env.DB.prepare(
          `INSERT INTO system_config (key, value, updated_at) VALUES ('admin_secret_salt', ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        ).bind(salt, now),
      ]);

      return new Response(
        JSON.stringify({ success: true, hasCustomSecret: true, message: 'Custom Admin Secret Key saved.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reset_pin') {
      const treeId = body.treeId;
      const newPin = body.newPin?.trim();

      if (!treeId || !newPin || !/^\d{6}$/.test(newPin)) {
        return new Response(
          JSON.stringify({ error: 'Valid treeId and 6-digit numeric newPin required.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { hash: pinHash, salt: pinSalt } = await hashPin(newPin);
      await env.DB.prepare('UPDATE trees SET pin_hash = ?, pin_salt = ? WHERE id = ?')
        .bind(pinHash, pinSalt, treeId)
        .run();

      return new Response(
        JSON.stringify({ success: true, message: 'Tree PIN reset successfully.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate_puk') {
      const treeId = body.treeId;
      if (!treeId) {
        return new Response(JSON.stringify({ error: 'Tree ID required.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const pukCode = generatePukCode();
      const { hash: pukHash, salt: pukSalt } = await hashPuk(pukCode);
      const now = Date.now();

      await env.DB.prepare('UPDATE trees SET puk_hash = ?, puk_salt = ?, puk_created_at = ? WHERE id = ?')
        .bind(pukHash, pukSalt, now, treeId)
        .run();

      return new Response(
        JSON.stringify({
          success: true,
          treeId,
          pukCode,
          message: 'New PUK recovery code generated successfully.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'inspect_tree') {
      const treeId = body.treeId;
      if (!treeId) {
        return new Response(JSON.stringify({ error: 'Tree ID required.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const [tree, householdsRes, personsRes, relsRes] = await Promise.all([
        env.DB.prepare('SELECT id, invite_code, name, created_at FROM trees WHERE id = ?').bind(treeId).first(),
        env.DB.prepare('SELECT id, family_name, branch_color, city, country, updated_at FROM households WHERE tree_id = ? ORDER BY updated_at ASC')
          .bind(treeId)
          .all(),
        env.DB.prepare('SELECT id, household_id, full_name, nickname_or_maiden, phone_e164, birth_year, death_year, is_living, role, claimed_device_id, created_by_device_id, updated_at FROM persons WHERE tree_id = ? ORDER BY updated_at ASC')
          .bind(treeId)
          .all(),
        env.DB.prepare('SELECT id, person_a_id, person_b_id, rel_type FROM relationships WHERE tree_id = ?')
          .bind(treeId)
          .all(),
      ]);

      if (!tree) {
        return new Response(JSON.stringify({ error: 'Family tree not found.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          tree,
          households: householdsRes.results || [],
          persons: personsRes.results || [],
          relationships: relsRes.results || [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_person') {
      const { treeId, personId } = body;
      if (!treeId || !personId) {
        return new Response(JSON.stringify({ error: 'Tree ID and Person ID required.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await env.DB.batch([
        env.DB.prepare('DELETE FROM relationships WHERE tree_id = ? AND (person_a_id = ? OR person_b_id = ?)').bind(treeId, personId, personId),
        env.DB.prepare('DELETE FROM persons WHERE id = ? AND tree_id = ?').bind(personId, treeId),
      ]);

      return new Response(
        JSON.stringify({ success: true, treeId, deletedPersonId: personId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_household') {
      const { treeId, householdId } = body;
      if (!treeId || !householdId) {
        return new Response(JSON.stringify({ error: 'Tree ID and Household ID required.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const personsInH = await env.DB.prepare('SELECT id FROM persons WHERE household_id = ? AND tree_id = ?')
        .bind(householdId, treeId)
        .all<{ id: string }>();

      const stmts = [
        env.DB.prepare('DELETE FROM households WHERE id = ? AND tree_id = ?').bind(householdId, treeId),
      ];
      for (const pRow of personsInH.results || []) {
        stmts.push(
          env.DB.prepare('DELETE FROM relationships WHERE tree_id = ? AND (person_a_id = ? OR person_b_id = ?)').bind(treeId, pRow.id, pRow.id),
          env.DB.prepare('DELETE FROM persons WHERE id = ? AND tree_id = ?').bind(pRow.id, treeId)
        );
      }

      await env.DB.batch(stmts);

      return new Response(
        JSON.stringify({ success: true, treeId, deletedHouseholdId: householdId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete_tree') {
      const treeId = body.treeId;
      if (!treeId) {
        return new Response(JSON.stringify({ error: 'Tree ID required.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      await env.DB.batch([
        env.DB.prepare('DELETE FROM relationships WHERE tree_id = ?').bind(treeId),
        env.DB.prepare('DELETE FROM persons WHERE tree_id = ?').bind(treeId),
        env.DB.prepare('DELETE FROM households WHERE tree_id = ?').bind(treeId),
        env.DB.prepare('DELETE FROM trees WHERE id = ?').bind(treeId),
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          treeId,
          message: 'Tree and all associated records deleted successfully.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: `Unsupported action: ${action}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
