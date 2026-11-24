import { generatePukCode, hashPin, hashPuk, verifyTotp } from '../../_lib/crypto';

export interface Env {
  DB: D1Database;
  GLOBAL_ADMIN_SECRET?: string;
  GLOBAL_ADMIN_TOTP_SECRET?: string; // Optional Base32 TOTP secret for 2FA
}

function verifyAdminAuth(request: Request, env: Env): { authorized: boolean; reason?: string } {
  const adminSecret = env.GLOBAL_ADMIN_SECRET || 'kinvault-admin-2026';
  const providedSecret = request.headers.get('X-Admin-Secret');

  if (!providedSecret || providedSecret !== adminSecret) {
    return { authorized: false, reason: 'Invalid or missing Global Admin Secret.' };
  }

  return { authorized: true };
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const auth = verifyAdminAuth(request, env);
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
    const auth = verifyAdminAuth(request, env);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: auth.reason }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = (await request.json()) as {
      action?: string;
      treeId?: string;
      newPin?: string;
      totpCode?: string;
    };

    // If TOTP secret is configured, require valid TOTP verification
    if (env.GLOBAL_ADMIN_TOTP_SECRET) {
      const totpCode = body.totpCode || request.headers.get('X-Admin-Totp') || '';
      const validTotp = await verifyTotp(totpCode, env.GLOBAL_ADMIN_TOTP_SECRET);
      if (!validTotp) {
        return new Response(
          JSON.stringify({ error: 'Invalid 2FA Authenticator code.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const action = body.action;

    if (action === 'verify_admin') {
      return new Response(JSON.stringify({ success: true, message: 'Admin verified successfully.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
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
