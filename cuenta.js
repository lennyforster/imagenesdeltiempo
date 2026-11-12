/* Cuentas con mail y contraseña (Supabase).
   Cada cuenta está unida a su plancha: la tabla public.cuentas guarda el repo de datos y la clave de GitHub,
   y solo el dueño de la cuenta puede leer su fila. Los datos siguen en GitHub, igual que antes. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/+esm";

const URL_SB = "https://nzgljqcgygzjxpqmvrsh.supabase.co";
const CLAVE_SB = "sb_publishable_1MftcxSIE0_Rb5tT57ikhA_z-FSRkHj";
export const CLAVE_SESION = "idt-cuenta";
const sb = createClient(URL_SB, CLAVE_SB, { auth: { persistSession: true, storageKey: CLAVE_SESION, detectSessionInUrl: true, flowType: "implicit" } });

const volver = () => location.origin + "/";
const traducir = e => {
  const m = String((e && (e.code || e.message)) || "");
  if (/invalid.*credentials|invalid_credentials/i.test(m)) return "Usuario o contraseña incorrectos.";
  if (/not.*confirmed|email_not_confirmed/i.test(m)) return "Todavía no confirmaste tu mail. Buscá el mail que te mandamos (fijate en spam).";
  if (/already.*registered|user_already_exists/i.test(m)) return "Ya existe una cuenta con ese usuario.";
  if (/password.*(6|short|weak)|weak_password/i.test(m)) return "La contraseña tiene que tener al menos 6 caracteres.";
  if (/rate|too many|over_email_send_rate_limit|429/i.test(m)) return "Se mandaron muchos mails seguidos. Esperá un rato y probá de nuevo.";
  if (/valid email|email_address_invalid|invalid.*email/i.test(m)) return "Ese mail no parece válido.";
  if (/same_password|different from the old/i.test(m)) return "La contraseña nueva tiene que ser distinta de la anterior.";
  if (/fetch|network/i.test(m)) return "No hay conexión. Probá de nuevo.";
  return "No se pudo. Probá de nuevo.";
};
const ok = (r) => { if (r.error) { const e = new Error(traducir(r.error)); e.original = r.error; throw e; } return r.data; };

export async function sesion() { const { data } = await sb.auth.getSession(); return data.session || null; }
export async function entrar(email, pass) { return ok(await sb.auth.signInWithPassword({ email, password: pass })).session; }
/* al crear la cuenta se guarda la plancha que tenía este navegador (si tenía), para unirla cuando se confirme el mail */
export async function crear(email, pass, plancha) {
  const data = ok(await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: volver(), data: plancha || {} } }));
  return { sesion: data.session || null, yaExistia: !!(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) };
}
export async function olvide(email) { ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: volver() })); }
export async function nuevaClave(pass) { ok(await sb.auth.updateUser({ password: pass })); }
export async function salir() { try { await sb.auth.signOut({ scope: "local" }); } catch (_) {} }
export async function miPlancha() {
  const s = await sesion(); if (!s) return null;
  return ok(await sb.from("cuentas").select("repo,token,nombre,modo").eq("user_id", s.user.id).maybeSingle());
}
export async function vincular(repo, token, nombre) {
  const s = await sesion(); if (!s) throw new Error("Sin sesión");
  ok(await sb.from("cuentas").upsert({ user_id: s.user.id, modo: "github", repo, token, nombre: nombre || null }));
}
export async function mail() { const s = await sesion(); return s ? s.user.email : null; }

/* ---------- Planchas nuevas: se guardan en Supabase (tabla archivos), sin GitHub ---------- */
export async function token() { const s = await sesion(); return s ? s.access_token : null; }
export async function crearNube(nombre) {
  const s = await sesion(); if (!s) throw new Error("Sin sesión");
  ok(await sb.from("cuentas").upsert({ user_id: s.user.id, modo: "nube", repo: null, token: null, nombre: nombre || null }));
}
const errNube = r => { const e = new Error(r.error.message || "nube"); e.status = (r.status === 401 || /jwt|token/i.test(r.error.message || "")) ? 401 : 0; return e; };
/* trae filas cambiadas desde «desde» (o todas las vivas si es la primera vez), de a 1000 */
export async function nubeTraer(desde) {
  const s = await sesion(); if (!s) { const e = new Error("Sin sesión"); e.status = 401; throw e; }
  const out = [];
  for (let i = 0; ; i += 1000) {
    let q = sb.from("archivos").select("path,contenido,borrado,actualizado").eq("user_id", s.user.id).order("actualizado", { ascending: true }).order("path").range(i, i + 999);
    q = desde ? q.gt("actualizado", desde) : q.eq("borrado", false);
    const r = await q; if (r.error) throw errNube(r);
    out.push(...r.data); if (r.data.length < 1000) break;
  }
  return out;
}
export async function nubeGuardar(filas) {
  if (!filas.length) return [];
  const s = await sesion(); if (!s) { const e = new Error("Sin sesión"); e.status = 401; throw e; }
  const r = await sb.from("archivos").upsert(filas.map(f => ({ ...f, user_id: s.user.id })), { onConflict: "user_id,path" }).select("path,actualizado");
  if (r.error) throw errNube(r);
  return r.data;
}
export async function nubeCantidad() {
  const s = await sesion(); if (!s) return 0;
  const r = await sb.from("archivos").select("path", { count: "exact", head: true }).eq("user_id", s.user.id).eq("borrado", false).like("path", "ideas/%");
  return r.error ? 0 : (r.count || 0);
}
