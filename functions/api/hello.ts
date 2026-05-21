// Cloudflare Pages Function. Reachable at `/api/hello` once deployed.
// Files under `functions/` are auto-deployed by Cloudflare Pages as edge
// endpoints alongside the static Next.js export — no separate Worker project.
export const onRequestGet = () =>
  new Response(
    JSON.stringify({ ok: true, message: "Hello from the puzzle backend." }),
    { headers: { "content-type": "application/json" } },
  );
