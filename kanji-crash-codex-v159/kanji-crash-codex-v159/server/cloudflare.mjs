import Worker from './worker.mjs';

// The Sites gateway authenticates this header. Public Cloudflare endpoints do
// not, so remove it before every route (including guest issuance) sees it.
// Guest tokens, legacy links and database owner keys keep their existing form.
export default {
  fetch(request, env, ctx) {
    const headers = new Headers(request.headers);
    headers.delete('oai-authenticated-user-id');
    return Worker.fetch(new Request(request, {headers}), env, ctx);
  },
};
