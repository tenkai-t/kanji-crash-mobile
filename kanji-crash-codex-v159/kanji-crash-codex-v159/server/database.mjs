export const database = env => {
  if (!env.DB) throw new Error('対戦サーバーに接続できません。時間をおいて再度お試しください。');
  return {
    schemaToken: env.DB,
    batch: queries => env.DB.batch(queries.map(([sql,...args])=>env.DB.prepare(sql).bind(...args))),
    first: (sql,...args) => env.DB.prepare(sql).bind(...args).first(),
    all: async (sql,...args) => (await env.DB.prepare(sql).bind(...args).all()).results,
    run: (sql,...args) => env.DB.prepare(sql).bind(...args).run(),
  };
};
