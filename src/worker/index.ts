// API server. Placeholder until step 9 (Hono routes: /api/turn, /api/intent, /api/roadmap, /api/ask).
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") return Response.json({ ok: true });
    return Response.json({ error: "not_implemented" }, { status: 501 });
  },
};
