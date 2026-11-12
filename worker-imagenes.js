/* Worker de Cloudflare «imagenes-del-tiempo»: guarda y sirve las imágenes de las planchas nuevas en R2.
   Cada usuario solo puede leer y escribir en su carpeta <user_id>/img/. La sesión se verifica contra Supabase.
   Binding necesario: R2 bucket «imagenes-del-tiempo» con el nombre FOTOS.
   Este archivo es copia de lo que está pegado en el panel de Cloudflare (Workers → imagenes-del-tiempo). */
const SB_URL = "https://nzgljqcgygzjxpqmvrsh.supabase.co";
const SB_KEY = "sb_publishable_1MftcxSIE0_Rb5tT57ikhA_z-FSRkHj";
const ORIGENES = ["https://imagenesdeltiempo.app", "https://www.imagenesdeltiempo.app"];
const MAX = 20 * 1024 * 1024;
const sesiones = new Map(); // token -> { id, hasta }

async function usuario(auth) {
  const t = (auth || "").replace(/^Bearer\s+/i, "");
  if (!t) return null;
  const c = sesiones.get(t);
  if (c && c.hasta > Date.now()) return c.id;
  const r = await fetch(SB_URL + "/auth/v1/user", { headers: { Authorization: "Bearer " + t, apikey: SB_KEY } });
  if (!r.ok) return null;
  const u = await r.json();
  if (!u || !u.id) return null;
  if (sesiones.size > 5000) sesiones.clear();
  sesiones.set(t, { id: u.id, hasta: Date.now() + 5 * 60 * 1000 });
  return u.id;
}

export default {
  async fetch(req, env) {
    const origen = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0],
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const res = (cuerpo, status, extra) => new Response(cuerpo, { status, headers: { ...cors, ...(extra || {}) } });
    if (req.method === "OPTIONS") return res(null, 204);
    const m = /^\/img\/([A-Za-z0-9_-]{1,64}\.(png|jpg|gif|webp|bin))$/.exec(new URL(req.url).pathname);
    if (!m) return res("No existe", 404);
    const id = await usuario(req.headers.get("Authorization"));
    if (!id) return res("Sin sesión", 401);
    const clave = id + "/img/" + m[1];

    if (req.method === "PUT") {
      const largo = Number(req.headers.get("Content-Length") || 0);
      if (largo > MAX) return res("Muy grande", 413);
      const tipo = req.headers.get("Content-Type") || "application/octet-stream";
      if (!/^image\//.test(tipo) && tipo !== "application/octet-stream") return res("Solo imágenes", 415);
      const cuerpo = await req.arrayBuffer();
      if (cuerpo.byteLength > MAX) return res("Muy grande", 413);
      await env.FOTOS.put(clave, cuerpo, { httpMetadata: { contentType: tipo } });
      return res("ok", 200);
    }
    if (req.method === "GET") {
      const o = await env.FOTOS.get(clave);
      if (!o) return res("No existe", 404);
      return res(o.body, 200, {
        "Content-Type": (o.httpMetadata && o.httpMetadata.contentType) || "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      });
    }
    return res("Método no permitido", 405);
  },
};
