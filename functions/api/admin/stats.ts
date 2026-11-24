export interface Env {
  DB: D1Database;
  GLOBAL_ADMIN_SECRET?: string;
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }): Promise<Response> => {
  try {
    const [treesCount, personsCount, householdsCount, livingCount] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM trees').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM persons').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM households').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM persons WHERE is_living = 1').first<{ count: number }>(),
    ]);

    const totalTrees = treesCount?.count || 0;
    const totalPersons = personsCount?.count || 0;
    const totalHouseholds = householdsCount?.count || 0;
    const livingPersons = livingCount?.count || 0;
    const deceasedPersons = totalPersons - livingPersons;

    const authSecret = request.headers.get('X-Admin-Secret');
    const adminSecret = env.GLOBAL_ADMIN_SECRET || 'kinvault-admin-2026';
    const isAdmin = authSecret && authSecret === adminSecret;

    return new Response(
      JSON.stringify({
        totalTrees,
        totalPersons,
        totalHouseholds,
        livingPersons,
        deceasedPersons,
        isAdmin: !!isAdmin,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=15', // 15-second caching for telemetry
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
