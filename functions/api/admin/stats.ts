export interface Env {
  DB: D1Database;
  GLOBAL_ADMIN_SECRET?: string;
  GLOBAL_ADMIN_TOTP_SECRET?: string;
}

export const onRequestGet = async ({ env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const [treesCount, personsCount, householdsCount, livingCount, dbTotpRow] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM trees').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM persons').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM households').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM persons WHERE is_living = 1').first<{ count: number }>(),
      env.DB.prepare("SELECT value FROM system_config WHERE key = 'admin_totp_secret'")
        .first<{ value: string }>()
        .catch(() => null),
    ]);

    const totalTrees = treesCount?.count || 0;
    const totalPersons = personsCount?.count || 0;
    const totalHouseholds = householdsCount?.count || 0;
    const livingPersons = livingCount?.count || 0;
    const deceasedPersons = totalPersons - livingPersons;
    const is2faEnabled = Boolean(env.GLOBAL_ADMIN_TOTP_SECRET || dbTotpRow?.value);

    return new Response(
      JSON.stringify({
        totalTrees,
        totalPersons,
        totalHouseholds,
        livingPersons,
        deceasedPersons,
        is2faEnabled,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
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
