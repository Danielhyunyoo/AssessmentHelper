function authorized(request, password) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = atob(header.slice(6));
  return decoded.slice(decoded.indexOf(":") + 1) === password;
}

export default {
  async fetch(request, env) {
    if (env.PASSWORD && !authorized(request, env.PASSWORD)) {
      return new Response("Sign in with the shared demo password.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Assessment Helper demo"' },
      });
    }

    const url = new URL(request.url);
    const forwarded = new Request(new URL(url.pathname + url.search, env.ORIGIN), request);
    forwarded.headers.delete("Authorization");
    return fetch(forwarded, { redirect: "manual" });
  },
};
