/* ===== Dictado por voz: graba en el navegador y lo pasa a texto con Whisper (Groq) a través del Worker /dictar.
   Lo usan la app de celu (celu.js) y el micrófono de la compu (index.html). No usa el dictado del sistema. ===== */
(function(){
const URL_DICTAR="https://imagenes-del-tiempo.rental-bff.workers.dev/dictar";
const LSg=k=>{try{return localStorage.getItem(k)}catch(_){return null}};
let grab=null;
const tipoAudio=()=>{if(typeof MediaRecorder==="undefined")return null;for(const t of ["audio/mp4","audio/webm;codecs=opus","audio/webm","audio/ogg"])if(MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))return t;return ""};
async function cabeceras(){const hd={};if(LSg("idt-cuenta")){try{const m=await import("./cuenta.js?v=4");const t=await m.token();if(t)hd.Authorization="Bearer "+t}catch(_){}}
  const gh=LSg("gh_token"),repo=LSg("gh_repo");if(gh&&repo){hd["X-GH"]=gh;hd["X-GH-Repo"]=repo}return hd}
/* Whisper a veces «escucha» frases fijas cuando no hay voz (ruido, silencio): esas no cuentan */
const inventado=t=>/^(¡?gracias( por ver( el video)?)?[.!]*|subt[ií]tulos.*amara\.org.*|¡?suscr[ií]bete.*|\.+)$/i.test(t);
/* o: {onTick(segundos), onPensando(), onTexto(texto), onError(mensaje), onFin()} */
async function empezar(o){if(grab)parar();const tipo=tipoAudio();if(tipo===null||!navigator.mediaDevices){o.onError&&o.onError("Este navegador no deja grabar audio.");o.onFin&&o.onFin();return false}
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})}catch(_){o.onError&&o.onError("Necesito permiso para usar el micrófono. Fijate en la configuración del navegador.");o.onFin&&o.onFin();return false}
  const rec=tipo?new MediaRecorder(stream,{mimeType:tipo}):new MediaRecorder(stream);const g={rec,stream,trozos:[],o,t0:Date.now()};grab=g;
  rec.ondataavailable=e=>{if(e.data&&e.data.size)g.trozos.push(e.data)};rec.onstop=()=>transcribir(g);rec.start(1000);
  const tick=()=>{const s=Math.floor((Date.now()-g.t0)/1000);o.onTick&&o.onTick(s);if(s>=600)parar()};tick();g.tick=setInterval(tick,500);return true}
function parar(){const g=grab;if(!g)return;grab=null;clearInterval(g.tick);try{g.rec.stop()}catch(_){}g.stream.getTracks().forEach(t=>t.stop());g.o.onPensando&&g.o.onPensando()}
async function transcribir(g){const o=g.o,err=m=>o.onError&&o.onError(m);
  try{const tipo=(g.rec.mimeType||g.trozos[0]&&g.trozos[0].type||"audio/webm"),blob=new Blob(g.trozos,{type:tipo});
    if(Date.now()-g.t0<700||blob.size<2000){err("Mantené un poco más: tocás, hablás y tocás de nuevo.");return}
    const r=await fetch(URL_DICTAR,{method:"POST",headers:{...(await cabeceras()),"Content-Type":tipo.split(";")[0]},body:blob});
    if(r.status===429){err("Se usó mucho el dictado en poco rato. Probá en unos minutos.");return}
    if(r.status===401){err("No pude verificar tu cuenta para dictar. Probá salir y volver a entrar.");return}
    if(!r.ok)throw 0;const j=await r.json();let t=(j.texto||"").trim();if(inventado(t))t="";
    if(!t){err("No escuché nada. Probá de nuevo, más cerca del micrófono.");return}
    o.onTexto&&o.onTexto(t)}
  catch(_){err("No pude pasar el audio a texto. Revisá la conexión y probá de nuevo.")}finally{o.onFin&&o.onFin()}}
document.addEventListener("visibilitychange",()=>{if(document.hidden&&grab)parar()});
window.Dictado={empezar,parar,grabando:()=>!!grab,de:o=>!!grab&&grab.o===o};
})();
