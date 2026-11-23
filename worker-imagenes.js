/* Worker de Cloudflare «imagenes-del-tiempo»: guarda y sirve las imágenes de las planchas nuevas en R2.
   Cada usuario solo puede leer y escribir en su carpeta <user_id>/img/. La sesión se verifica contra Supabase.
   Binding necesario: R2 bucket «imagenes-del-tiempo» con el nombre FOTOS.
   También: GET /meta?u=<link> devuelve {titulo, imagen} de una página (para los links de la plancha). No pide sesión
   (los usuarios de GitHub no tienen), pero solo responde a la web. La web guarda el resultado en el bloque, así no se vuelve a pedir.
   POST /dictar: recibe un audio y devuelve {texto} usando Whisper (Groq). Pide sesión de Supabase o, para las planchas de GitHub,
   la clave de GitHub (X-GH) con acceso a un repo banco-de-ideas-datos*. Secreto necesario: GROQ_KEY.
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

/* ---------- dictado: quién puede usarlo ---------- */
const ghOk = new Map(); // token+repo -> hasta
async function puedeDictar(req) {
  if (await usuario(req.headers.get("Authorization"))) return true;
  const t = (req.headers.get("X-GH") || "").trim(), repo = (req.headers.get("X-GH-Repo") || "").trim();
  if (!t || !/^banco-de-ideas-datos(-\d+)?$/.test(repo)) return false;
  const k = t + "|" + repo, c = ghOk.get(k);
  if (c && c > Date.now()) return true;
  const r = await fetch("https://api.github.com/repos/lennyforster/" + repo, { headers: { Authorization: "Bearer " + t, "User-Agent": "imagenes-del-tiempo", Accept: "application/vnd.github+json" } });
  if (!r.ok) return false;
  if (ghOk.size > 2000) ghOk.clear();
  ghOk.set(k, Date.now() + 30 * 60 * 1000);
  return true;
}

/* ---------- vista previa de links: título e imagen de portada ---------- */
function linkValido(u) {
  let x; try { x = new URL(u); } catch (_) { return null; }
  if (!/^https?:$/.test(x.protocol)) return null;
  const h = x.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^[\d.]+$/.test(h) || h.includes(":")) return null;
  return x;
}
const limpiar = t => (t || "").replace(/\s+/g, " ").trim().slice(0, 300);
function ytId(x) {
  const h = x.hostname.replace(/^www\.|^m\./, "");
  if (h === "youtu.be") return x.pathname.slice(1).split("/")[0] || null;
  if (h === "youtube.com" || h === "music.youtube.com") {
    if (x.searchParams.get("v")) return x.searchParams.get("v");
    const m = /^\/(shorts|embed|live)\/([\w-]{6,})/.exec(x.pathname); if (m) return m[2];
  }
  return null;
}
async function meta(x) {
  const yt = ytId(x);
  if (yt) {
    let titulo = "";
    try { const r = await fetch("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent("https://www.youtube.com/watch?v=" + yt)); if (r.ok) titulo = limpiar((await r.json()).title); } catch (_) {}
    return { titulo, imagen: "https://i.ytimg.com/vi/" + yt + "/hqdefault.jpg" };
  }
  if (/(^|\.)vimeo\.com$/.test(x.hostname)) {
    try { const r = await fetch("https://vimeo.com/api/oembed.json?url=" + encodeURIComponent(x.href)); if (r.ok) { const j = await r.json(); return { titulo: limpiar(j.title), imagen: j.thumbnail_url || "" }; } } catch (_) {}
  }
  const r = await fetch(x.href, { redirect: "follow", headers: {
    "User-Agent": "Mozilla/5.0 (compatible; ImagenesDelTiempo/1.0; +https://imagenesdeltiempo.app) facebookexternalhit/1.1",
    "Accept": "text/html,application/xhtml+xml", "Accept-Language": "es-AR,es;q=0.9,en;q=0.8" } });
  const tipo = r.headers.get("Content-Type") || "";
  if (/^image\//.test(tipo)) return { titulo: "", imagen: r.url };
  if (!r.ok || !/html/.test(tipo)) return { titulo: "", imagen: "" };
  const v = {}; let titulo = "";
  const tomar = (k, val) => { if (val && !v[k]) v[k] = val; };
  await new HTMLRewriter()
    .on("meta", { element(e) {
      const k = (e.getAttribute("property") || e.getAttribute("name") || "").toLowerCase();
      const c = e.getAttribute("content");
      if (["og:title", "twitter:title", "og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src"].includes(k)) tomar(k, c);
    } })
    .on("title", { text(t) { if (titulo.length < 400) titulo += t.text; } })
    .transform(new Response(r.body, { headers: { "Content-Type": "text/html" } })).arrayBuffer();
  let imagen = v["og:image:secure_url"] || v["og:image"] || v["og:image:url"] || v["twitter:image"] || v["twitter:image:src"] || "";
  if (imagen) { try { imagen = new URL(imagen, r.url).href; } catch (_) { imagen = ""; } }
  const txt = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return { titulo: limpiar(txt(v["og:title"] || v["twitter:title"] || titulo)), imagen };
}

export default {
  async fetch(req, env) {
    const origen = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0],
      "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-GH, X-GH-Repo",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const res = (cuerpo, status, extra) => new Response(cuerpo, { status, headers: { ...cors, ...(extra || {}) } });
    if (req.method === "OPTIONS") return res(null, 204);
    const url = new URL(req.url);
    if (url.pathname === "/meta" && req.method === "GET") {
      if (!ORIGENES.includes(origen)) return res("No", 403);
      const x = linkValido(url.searchParams.get("u") || "");
      if (!x) return res(JSON.stringify({ titulo: "", imagen: "" }), 200, { "Content-Type": "application/json" });
      const clave = new Request("https://meta.cache/" + encodeURIComponent(x.href));
      const ya = await caches.default.match(clave);
      if (ya) return res(await ya.text(), 200, { "Content-Type": "application/json" });
      let d = { titulo: "", imagen: "" };
      try { d = await meta(x); } catch (_) {}
      const cuerpo = JSON.stringify(d);
      try { await caches.default.put(clave, new Response(cuerpo, { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=86400" } })); } catch (_) {}
      return res(cuerpo, 200, { "Content-Type": "application/json" });
    }
    if (url.pathname === "/dictar" && req.method === "POST") {
      if (!ORIGENES.includes(origen)) return res("No", 403);
      if (!env.GROQ_KEY) return res("Falta la clave", 503);
      if (!(await puedeDictar(req))) return res("Sin sesión", 401);
      const largo = Number(req.headers.get("Content-Length") || 0);
      if (largo > 24 * 1024 * 1024) return res("Muy largo", 413);
      const tipo = (req.headers.get("Content-Type") || "audio/webm").split(";")[0];
      const ext = /mp4|m4a|aac/.test(tipo) ? "m4a" : /ogg/.test(tipo) ? "ogg" : /wav/.test(tipo) ? "wav" : /mpeg|mp3/.test(tipo) ? "mp3" : "webm";
      const audio = await req.arrayBuffer();
      if (!audio.byteLength) return res(JSON.stringify({ texto: "" }), 200, { "Content-Type": "application/json" });
      const f = new FormData();
      f.append("file", new Blob([audio], { type: tipo }), "dictado." + ext);
      f.append("model", "whisper-large-v3");
      f.append("language", "es");
      f.append("temperature", "0");
      f.append("response_format", "json");
      const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + env.GROQ_KEY }, body: f });
      if (r.status === 429) return res("Límite", 429, { "Retry-After": r.headers.get("retry-after") || "30" });
      if (!r.ok) return res("No se pudo", 502);
      const j = await r.json();
      return res(JSON.stringify({ texto: (j.text || "").trim() }), 200, { "Content-Type": "application/json" });
    }
    const m = /^\/img\/([A-Za-z0-9_-]{1,64}\.(png|jpg|gif|webp|bin))$/.exec(url.pathname);
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
