/* ===== App de celu: una capa aparte para anotar rápido (ideas, diario, frases, listas). Usa los mismos datos que la web. =====
   Se prende en el celu (para todos) o con ?celu en la dirección. ?celu=0 la apaga. */
(function(){
"use strict";
const qs=new URLSearchParams(location.search);
const forzar=qs.has("celu")&&qs.get("celu")!=="0",apagar=qs.get("celu")==="0";
const LSg=k=>{try{return localStorage.getItem(k)}catch(_){return null}},LSs=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
if(apagar)return;
if(typeof INVITADO!=="undefined"&&INVITADO)return;
if(/^#guion(vivo|ver)=/.test(location.hash))return;
if(location.hash==="#recorrido"&&!forzar)return;
const esCelu=document.body.classList.contains("es-celu"),esLenny=LSg("gh_repo")==="banco-de-ideas-datos";
if(!forzar&&!esCelu)return;

/* ---------- helpers ---------- */
const h=(tag,props,...kids)=>{const e=document.createElement(tag);if(props)for(const [k,v] of Object.entries(props)){if(v==null||v===false)continue;if(k==="class")e.className=v;else if(k==="style")e.style.cssText=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else if(k==="html")e.innerHTML=v;else e.setAttribute(k,v===true?"":v)}
  for(const c of kids.flat()){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(String(c)))}return e};
const ico=(d,w)=>{const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 24 24");s.setAttribute("width",w||24);s.setAttribute("height",w||24);s.setAttribute("fill","none");s.setAttribute("stroke","currentColor");s.setAttribute("stroke-width","1.9");s.setAttribute("stroke-linecap","round");s.setAttribute("stroke-linejoin","round");s.innerHTML=d;return s};
const I={
  anotar:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  ideas:'<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M14 20v-4.5a1.5 1.5 0 0 1 1.5-1.5H20"/>',
  diario:'<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5Z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19v-3"/><path d="M9 8h6"/>',
  listas:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
  atras:'<path d="m15 18-6-6 6-6"/>',buscar:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',mas:'<path d="M12 5v14M5 12h14"/>',
  foto:'<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',x:'<path d="M18 6 6 18M6 6l12 12"/>',flecha:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  basura:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',link:'<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',stop:'<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>',chev:'<path d="m9 6 6 6-6 6"/>',web:'<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/>'};
const hoyK=()=>hoyDia();
const fechaCorta=t=>{const d=new Date(t),hoy=new Date();const dias=Math.floor((new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate())-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/864e5);
  if(dias<=0)return "hoy";if(dias===1)return "ayer";if(dias<7)return d.toLocaleDateString("es-AR",{weekday:"long"});return d.toLocaleDateString("es-AR",{day:"numeric",month:"short",...(d.getFullYear()!==hoy.getFullYear()?{year:"numeric"}:{})}).replace(".","")};
const textoIdea=i=>(i.texto||"").trim()||((i.bloques||[]).find(b=>(b.t==="post"||b.t==="txt"||b.t==="tx")&&(b.v||"").trim())||{}).v||"";
const sinT=t=>(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const autosize=t=>{t.style.height="auto";t.style.height=Math.max(t.scrollHeight,parseFloat(getComputedStyle(t).minHeight)||0)+"px"};
const vibrar=()=>{try{navigator.vibrate&&navigator.vibrate(8)}catch(_){}};
/* nombre para el saludo: primero el de la plancha (Lenny, Helena…), después el usuario de la cuenta; el nombre de «En vivo» no, porque puede ser cualquier cosa */
const nombreUsuario=()=>{try{const r=typeof NOMBRES_REPO!=="undefined"&&NOMBRES_REPO[LSg("gh_repo")];if(r)return r}catch(_){}
  try{const c=JSON.parse(LSg("idt-cuenta")||"null"),m=c&&c.user&&c.user.email;if(m){const u=m.endsWith("@imagenesdeltiempo.app")?m.split("@")[0]:m.split("@")[0];if(u)return u.charAt(0).toUpperCase()+u.slice(1)}}catch(_){}return ""};

/* ---------- host + shadow DOM (así los estilos de la web no se meten) ---------- */
document.documentElement.classList.add("celu-app");
const est=document.createElement("style");est.textContent=`
html.celu-app.celu-on{overflow:hidden!important}html.celu-app.celu-on body{overflow:hidden!important;background:transparent!important}
html.celu-app.celu-on body>:not(#celu-host):not(#conectar):not(#novedades):not(#ayuda):not(#cargando):not(#nombre-vivo):not(#toast):not(.guia){visibility:hidden!important}
html.celu-app.celu-on #toast{z-index:70;bottom:calc(env(safe-area-inset-bottom,0px) + 84px)}
html.celu-app.celu-on .rc-tira,html.celu-app.celu-on .rc-bur,html.celu-app.celu-on .rc-velo{display:none!important}
#celu-host{position:fixed;inset:0;z-index:50}
html.celu-app:not(.celu-on) #celu-host .x{display:none}
#celu-volver{position:fixed;z-index:75;right:12px;top:calc(env(safe-area-inset-top,0px) + 62px);border:0;border-radius:999px;background:#2b2520;color:#fffdf6;font:600 14px "Instrument Sans",system-ui,sans-serif;padding:10px 16px;box-shadow:0 6px 18px rgba(0,0,0,.35)}
html.celu-on #celu-volver{display:none}`;
document.head.append(est);
const host=h("div",{id:"celu-host"});document.body.append(host);
const root=host.attachShadow({mode:"open"});
root.append(h("style",null,`
:host{all:initial;--mat:#1f6b4a;--mat-o:#174f37;--ink:#2b2520;--soft:#7a6e62;--line:rgba(43,37,32,.1);--paper:#fffdf6;--bg:#f5efe3;--card:#fffdf6;--red:#c8372d;
  --hand:"Bricolage Grotesque","Avenir Next",system-ui,sans-serif;--ui:"Instrument Sans",system-ui,-apple-system,sans-serif;
  --st:env(safe-area-inset-top,0px);--sb:env(safe-area-inset-bottom,0px);
  position:fixed;inset:0;display:block;font-family:var(--ui);color:var(--ink);font-size:16px;line-height:1.4;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%}
:host([hidden]){display:none}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
input,textarea{font:inherit;color:inherit}
.app{position:absolute;inset:0;background:var(--bg);overflow:hidden;margin:0 auto;max-width:520px}
.pant{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:calc(var(--st) + 10px) 0 calc(var(--sb) + 96px)}
.pant[hidden]{display:none}
/* cabecera grande */
.cab{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;padding:10px 20px 6px}
.cab h1{margin:0;font:800 34px/1.05 var(--hand);letter-spacing:-.02em}
.cab .sub{font:500 14px var(--ui);color:var(--soft);margin:2px 0 0}
.cab-der{display:flex;align-items:center;gap:8px;padding-bottom:4px}
.redondo{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--card);box-shadow:0 1px 0 var(--line),0 2px 8px rgba(43,37,32,.08)}
.redondo.verde{background:var(--mat);color:#fff}
.ava{flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;font:700 17px/1 var(--hand);background:var(--paper);color:var(--ink);box-shadow:0 0 0 2px rgba(255,255,255,.55),0 4px 12px rgba(0,0,0,.25)}
.ava img{width:100%;height:100%;object-fit:cover;display:block}
.hoja .quien .ava{box-shadow:0 0 0 1px var(--line)}
.foto-btn{font:600 13px var(--ui);color:var(--mat);margin-top:3px;display:inline-block;padding:2px 0}
.foto-btn+.foto-btn{margin-left:12px;color:var(--soft)}
/* inicio */
.mat{position:relative;margin:0;padding:calc(var(--st) + 14px) 16px 22px;background-color:var(--mat);color:#fff;
  background-image:linear-gradient(rgba(210,245,200,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(210,245,200,.16) 1px,transparent 1px),linear-gradient(rgba(190,235,190,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(190,235,190,.07) 1px,transparent 1px);
  background-size:96px 96px,96px 96px,24px 24px,24px 24px;background-position:-1px -1px}
#p-inicio{padding-top:0;background-color:var(--mat);display:flex;flex-direction:column}#p-inicio[hidden]{display:none}
#p-inicio .mat{flex:1;padding-bottom:calc(var(--sb) + 96px)}
.app.en-inicio{background:var(--mat)}
.app.en-inicio .tabs{background:rgba(20,66,46,.82);border-top-color:rgba(255,255,255,.12)}
.app.en-inicio .tabs button{color:rgba(255,255,255,.55)}.app.en-inicio .tabs button.on{color:#fff}
.comp textarea.alta{min-height:34vh}
.saludo{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin:2px 4px 16px}
.saludo h1{margin:0;font:800 30px/1.05 var(--hand);letter-spacing:-.02em}
.saludo .fecha{font:600 13px var(--ui);opacity:.78;margin:0 0 4px}
.sync{display:inline-flex;align-items:center;gap:6px;font:600 12px var(--ui);opacity:.85;margin-top:6px}
.sync i{width:7px;height:7px;border-radius:50%;background:#9fe3a8}.sync.pend i{background:#ffd36b;animation:lat 1s infinite alternate}.sync.off i{background:#ff9f80}
@keyframes lat{to{opacity:.3}}
.comp{background:var(--paper);color:var(--ink);border-radius:20px;padding:12px 12px 12px;box-shadow:0 14px 30px -12px rgba(0,0,0,.55)}
.dest{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;background:rgba(43,37,32,.06);border-radius:12px;padding:3px}
.dest button{font:600 14px var(--ui);padding:8px 0;border-radius:9px;color:var(--soft);transition:background .15s,color .15s}
.dest button.on{background:var(--paper);color:var(--ink);box-shadow:0 1px 3px rgba(43,37,32,.18)}
.comp textarea{display:block;width:100%;border:0;outline:0;resize:none;background:transparent;font:500 19px/1.35 var(--ui);padding:14px 4px 6px;min-height:104px;max-height:46vh}
.comp textarea::placeholder{color:#b3a898}
.ctx{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -12px;padding:4px 12px 2px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12px,#000 calc(100% - 18px),transparent)}
.ctx::-webkit-scrollbar{display:none}
.chip{flex:none;display:inline-flex;align-items:center;gap:6px;font:600 13.5px var(--ui);padding:7px 12px;border-radius:999px;background:rgba(43,37,32,.06);white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis}
.chip i{width:10px;height:10px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.chip.on{background:var(--ink);color:var(--paper)}
.chip.nuevo{background:transparent;box-shadow:inset 0 0 0 1.5px rgba(43,37,32,.2)}
.ctx-txt{font:500 13.5px var(--ui);color:var(--soft);padding:6px 2px}
.autor{width:100%;border:0;outline:0;background:rgba(43,37,32,.05);border-radius:10px;padding:9px 12px;font:500 16px var(--ui)}
.comp-pie{display:flex;align-items:center;gap:8px;margin-top:10px}
.comp-pie .foto{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:rgba(43,37,32,.06)}
.comp-pie .foto.tiene{background:#e8f2ec;color:var(--mat)}
.mic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:rgba(43,37,32,.06);flex:none;transition:background .15s,color .15s,width .2s}
.mic.grab{width:auto;padding:0 14px;display:flex;gap:8px;background:var(--red);color:#fff;font:700 14px var(--ui);font-variant-numeric:tabular-nums}
.mic.grab::before{content:"";width:8px;height:8px;border-radius:50%;background:#fff;animation:lat .8s infinite alternate}
.mic.pensando{opacity:.6;pointer-events:none}.mic.pensando svg{animation:lat .6s infinite alternate}
.mic.chico{width:36px;height:36px;border-radius:10px;background:transparent;color:var(--soft)}.mic.chico.grab{width:auto;height:36px;color:#fff;background:var(--red)}
.guardar{flex:1;height:44px;border-radius:12px;background:var(--mat);color:#fff;font:700 16px var(--ui);display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .15s,transform .1s}
.guardar:disabled{opacity:.35}.guardar:active:not(:disabled){transform:scale(.98)}
.prev-foto{display:flex;align-items:center;gap:8px;margin:6px 0 0;font:500 13px var(--ui);color:var(--soft)}
.prev-foto img{width:44px;height:44px;object-fit:cover;border-radius:8px}
.prev-foto button{margin-left:auto;padding:6px}
/* secciones y filas */
.sec{padding:18px 16px 0}
.sec h2{font:700 13px var(--ui);text-transform:uppercase;letter-spacing:.06em;color:var(--soft);margin:0 4px 8px;display:flex;justify-content:space-between;align-items:baseline}
.sec h2 button{font:600 13px var(--ui);text-transform:none;letter-spacing:0;color:var(--mat)}
.grupo{background:var(--card);border-radius:16px;overflow:hidden;box-shadow:0 1px 0 var(--line)}
.fila{display:flex;align-items:flex-start;gap:12px;padding:13px 14px;width:100%;text-align:left;position:relative}
.fila+.fila::before,.fila+.fila-w::before,.fila-w+.fila::before,.fila-w+.fila-w::before{content:"";position:absolute;top:0;left:50px;right:0;height:1px;background:var(--line)}
.fila:active{background:rgba(43,37,32,.04)}
.post{flex:none;width:26px;height:26px;border-radius:4px;margin-top:1px;box-shadow:0 1px 2px rgba(0,0,0,.18),inset 0 -6px 8px -6px rgba(0,0,0,.1)}
.f-cuerpo{flex:1;min-width:0}
.f-txt{font:500 16px/1.32 var(--ui);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.f-txt.vacio{color:var(--soft);font-style:italic}
.f-meta{font:500 12.5px var(--ui);color:var(--soft);margin-top:3px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.f-meta .est{display:inline-flex;align-items:center;gap:4px}.f-meta .est i{width:6px;height:6px;border-radius:50%}
.f-chev{flex:none;color:#c9bfb1;align-self:center}
.comilla{flex:none;width:26px;font:800 34px/26px var(--hand);color:#c9bfb1;text-align:center}
.vacio-box{padding:38px 24px;text-align:center;color:var(--soft);font:500 15px/1.45 var(--ui)}
.vacio-box b{display:block;font:700 18px var(--hand);color:var(--ink);margin-bottom:4px}
.hoy-card{display:block;width:100%;text-align:left;background:var(--card);border-radius:16px;padding:14px 16px;box-shadow:0 1px 0 var(--line);background-image:linear-gradient(90deg,transparent 33px,rgba(226,59,59,.4) 33px 34px,transparent 34px);padding-left:46px}
.hoy-card .t{font:700 15px var(--ui)}.hoy-card .d{font:500 14.5px/1.4 var(--ui);color:var(--soft);margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* buscador y filtros */
.busca{margin:6px 16px 10px;display:flex;align-items:center;gap:8px;background:rgba(43,37,32,.07);border-radius:12px;padding:0 12px;color:var(--soft)}
.busca input{flex:1;border:0;outline:0;background:transparent;padding:10px 0;font:500 16px var(--ui);color:var(--ink);min-width:0}
.busca button{padding:4px;display:none}.busca.con button{display:block}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:rgba(43,37,32,.07);border-radius:10px;padding:2px;margin:0 16px 10px}
.seg button{font:600 14px var(--ui);padding:7px 0;border-radius:8px;color:var(--soft)}.seg button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 3px rgba(43,37,32,.15)}
.filtros{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0 16px 4px}.filtros::-webkit-scrollbar{display:none}
.mas-btn{display:block;margin:14px auto 0;font:600 14px var(--ui);color:var(--mat);padding:10px 18px}
/* tabbar */
.tabs{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(4,1fr);padding:6px 6px max(6px,calc(var(--sb) - 18px));background:rgba(250,246,238,.86);-webkit-backdrop-filter:saturate(1.6) blur(18px);backdrop-filter:saturate(1.6) blur(18px);border-top:1px solid var(--line);z-index:5;transition:transform .2s}
.tabs button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 0 2px;font:600 11px var(--ui);color:#a69a8b}
.tabs button.on{color:var(--mat)}
.app.tecleando .tabs{transform:translateY(110%)}
/* pantallas que se apilan (detalle) */
.capa{position:absolute;inset:0;background:var(--bg);z-index:10;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:0 0 calc(var(--sb) + 40px);transform:translateX(100%);transition:transform .28s cubic-bezier(.2,.8,.2,1);box-shadow:-10px 0 30px rgba(0,0,0,.08)}
.capa.in{transform:none}
.barra{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:calc(var(--st) + 6px) 8px 6px;background:rgba(245,239,227,.9);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
.barra .volver{display:flex;align-items:center;gap:0;font:600 16px var(--ui);color:var(--mat);padding:8px 8px 8px 2px}
.barra .der{display:flex;gap:4px}
.barra .acc{font:600 15px var(--ui);color:var(--mat);padding:8px 10px;border-radius:10px}
.barra .acc.peligro{color:var(--red)}.barra .acc.sure{background:var(--red);color:#fff}
.det{padding:4px 18px 0}
.det-cats{margin:0 0 10px}
.det textarea.grande{width:100%;border:0;outline:0;resize:none;background:transparent;font:600 24px/1.25 var(--hand);letter-spacing:-.01em;padding:4px 0;min-height:40px}
.det .meta{font:500 13px var(--ui);color:var(--soft);margin:4px 0 14px}
.estados{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}
.estados .chip.on{background:var(--c);color:#fff}
.det h3{font:700 13px var(--ui);text-transform:uppercase;letter-spacing:.06em;color:var(--soft);margin:22px 0 8px}
.bloques{display:grid;gap:8px}
.bl-post{padding:12px 14px;border-radius:6px;font:500 15.5px/1.38 var(--ui);white-space:pre-wrap;overflow-wrap:anywhere;box-shadow:0 1px 3px rgba(0,0,0,.14)}
.bl-txt{font:500 15.5px/1.45 var(--ui);white-space:pre-wrap;overflow-wrap:anywhere;padding:2px 2px}
.bl-img{border-radius:12px;overflow:hidden;background:#e7dfd1;min-height:80px}.bl-img img{display:block;width:100%;height:auto}
.bl-link{display:flex;gap:12px;align-items:center;background:var(--card);border-radius:12px;padding:10px;text-decoration:none;color:inherit;box-shadow:0 1px 0 var(--line)}
.bl-link img{width:56px;height:56px;object-fit:cover;border-radius:8px;flex:none;background:#e7dfd1}
.bl-link .t{font:600 14.5px/1.3 var(--ui);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.bl-link .u{font:500 12.5px var(--ui);color:var(--soft)}
.bl-lista{display:flex;align-items:center;gap:10px;background:var(--card);border-radius:12px;padding:12px 14px;font:600 15px var(--ui);box-shadow:0 1px 0 var(--line);width:100%;text-align:left}
.bl-lista span{flex:1}
.bl-nota{font:500 13.5px/1.4 var(--ui);color:var(--soft);padding:4px 2px}
.sumar{display:flex;gap:8px;align-items:flex-end;margin-top:10px;background:var(--card);border-radius:14px;padding:8px 8px 8px 14px;box-shadow:0 1px 0 var(--line)}
.sumar textarea{flex:1;border:0;outline:0;resize:none;background:transparent;font:500 16px/1.35 var(--ui);padding:6px 0;min-height:24px;max-height:30vh}
.sumar .ir{width:36px;height:36px;border-radius:10px;background:var(--mat);color:#fff;display:grid;place-items:center;flex:none}
.sumar .ir:disabled{opacity:.3}
.sumar .cam{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;flex:none;color:var(--soft)}
/* diario */
.dia-hoy{margin:8px 16px 0;background:var(--paper);border-radius:18px;box-shadow:0 1px 0 var(--line),0 8px 24px -16px rgba(43,37,32,.4);overflow:hidden;
  background-image:linear-gradient(90deg,transparent 35px,rgba(226,59,59,.45) 35px 36px,transparent 36px),repeating-linear-gradient(transparent 0 27px,rgba(80,120,170,.13) 27px 28px);background-position:0 0,0 10px}
.dia-hoy .fe{font:800 20px var(--hand);padding:14px 16px 4px 48px}
.tramos{padding:0 16px 0 48px}
.tramo{position:relative;font:500 16px/28px var(--ui);white-space:pre-wrap;overflow-wrap:anywhere}
.tramo .hh{position:absolute;left:-44px;width:38px;text-align:right;font:600 10.5px/28px var(--ui);color:#b0473e;letter-spacing:-.02em}
.dia-hoy textarea{display:block;width:100%;border:0;outline:0;resize:none;background:transparent;font:500 16px/28px var(--ui);padding:0 16px 0 48px;min-height:56px}
.dia-hoy textarea::placeholder{color:#b9ae9f}
.dia-pie{display:flex;justify-content:space-between;align-items:center;padding:6px 10px 10px 48px}
.dia-pie span{font:500 12.5px var(--ui);color:var(--soft)}
.btn-chico{height:36px;padding:0 16px;border-radius:10px;background:var(--mat);color:#fff;font:700 14.5px var(--ui)}.btn-chico:disabled{opacity:.3}
.racha{display:inline-flex;align-items:center;gap:6px;background:#fff1d6;color:#8a5a12;font:700 12.5px var(--ui);padding:5px 10px;border-radius:999px}
.dia-fila .f-txt{-webkit-line-clamp:4}
.dia-num{flex:none;width:40px;text-align:center}
.dia-num b{display:block;font:800 22px/1 var(--hand)}.dia-num span{font:600 11px var(--ui);color:var(--soft);text-transform:uppercase}
.mes{font:700 13px var(--ui);text-transform:uppercase;letter-spacing:.06em;color:var(--soft);margin:20px 4px 8px}
.leer{padding:4px 18px}.leer .fe{font:800 26px/1.1 var(--hand);margin:4px 0 14px}
.leer .tramo{padding-left:50px}.leer .tramo .hh{left:0}
/* listas */
.l-card{display:block;width:100%;text-align:left;background:var(--card);border-radius:16px;padding:14px 16px;box-shadow:0 1px 0 var(--line)}
.l-card+.l-card{margin-top:10px}
.l-card .t{display:flex;justify-content:space-between;gap:10px;font:700 18px var(--hand)}
.l-card .t span{font:600 13px var(--ui);color:var(--soft);white-space:nowrap;padding-top:3px}
.l-card ul{margin:6px 0 0;padding:0;list-style:none;font:500 14.5px/1.5 var(--ui);color:var(--soft)}
.l-card li{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.l-card li::before{content:"○ ";color:#c9bfb1}
.l-tit{width:100%;border:0;outline:0;background:transparent;font:800 30px/1.1 var(--hand);letter-spacing:-.02em;padding:2px 0;margin:0}
.l-tit::placeholder{color:#c9bfb1}
.l-add{display:flex;align-items:center;gap:10px;background:var(--card);border-radius:14px;padding:4px 6px 4px 14px;margin:12px 0 14px;box-shadow:0 1px 0 var(--line)}
.l-add .mas{color:var(--mat);flex:none;display:grid}
.l-add textarea{flex:1;border:0;outline:0;resize:none;background:transparent;font:500 16px/1.35 var(--ui);padding:10px 0;min-height:44px}
.items{background:var(--card);border-radius:16px;overflow:hidden;box-shadow:0 1px 0 var(--line)}
.it-w{position:relative;overflow:hidden;background:var(--card)}.it-w.sw{background:var(--red)}
.it-w+.it-w{border-top:1px solid var(--line)}
.it-bor{position:absolute;right:0;top:0;bottom:0;display:flex;align-items:center;padding:0 20px;color:#fff;font:700 14px var(--ui)}
.it{position:relative;display:flex;align-items:flex-start;gap:12px;padding:11px 14px;background:var(--card);touch-action:pan-y;transition:transform .2s}
.it.arr{transition:none}
.tilde{flex:none;width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 2px #cdbfae;display:grid;place-items:center;color:transparent;margin-top:1px;transition:background .15s,box-shadow .15s}
.tilde.on{background:var(--mat);box-shadow:none;color:#fff}
.it textarea{flex:1;min-width:0;border:0;outline:0;resize:none;background:transparent;font:500 16px/1.4 var(--ui);padding:1px 0;height:24px;overflow:hidden}
.it.hecha textarea,.it.hecha .lk .t{color:var(--soft);text-decoration:line-through;text-decoration-color:rgba(43,37,32,.35)}
.it .cuerpo{flex:1;min-width:0}
.it .tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}.it .tags span{font:700 11px var(--ui);color:#fff;padding:2px 7px;border-radius:999px}
.lk{display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit}
.lk img{width:44px;height:44px;border-radius:8px;object-fit:cover;flex:none;background:#e7dfd1}
.lk .t{font:600 15px/1.3 var(--ui);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.lk .u{font:500 12px var(--ui);color:var(--soft)}
.l-sub{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px}
.pesos-btn{flex:none;font:700 13px var(--ui);padding:6px 11px;border-radius:999px;background:rgba(43,37,32,.07);color:var(--soft)}
.pesos-btn.sug{background:#fff1c7;color:#7a5a12}.pesos-btn.on{background:transparent;color:var(--soft);font-weight:600;text-decoration:underline}
.precio{flex:none;width:88px;border:0;border-bottom:1.5px dashed rgba(43,37,32,.2);outline:0;background:transparent;font:600 16px var(--ui);text-align:right;padding:1px 0;color:var(--ink);font-variant-numeric:tabular-nums}
.precio:focus{border-bottom-color:var(--mat)}.precio::placeholder{color:#c9bfb1}
.it.hecha .precio{color:var(--soft);text-decoration:line-through}
.ns{flex:none;width:26px;height:26px;margin-left:2px;border-radius:50%;font:700 14px/26px var(--ui);color:var(--ink);background:rgba(43,37,32,.06);text-align:center}
.it.no-suma .ns{color:var(--soft);background:transparent;text-decoration:line-through}.it.no-suma .precio{color:var(--soft);font-style:italic}
.tot-bar{position:sticky;bottom:calc(var(--sb) + 10px);margin:14px 0 0;display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;background:var(--ink);color:var(--paper);border-radius:14px;padding:12px 16px;box-shadow:0 10px 24px -10px rgba(0,0,0,.45);font:600 13px var(--ui);text-transform:uppercase;letter-spacing:.06em}
.tot-bar[hidden]{display:none}
.tot-bar b{margin-left:auto;font:800 22px var(--hand);letter-spacing:0;text-transform:none;font-variant-numeric:tabular-nums}
.tot-bar small{flex-basis:100%;text-align:right;font:500 13px var(--ui);text-transform:none;letter-spacing:0;opacity:.75}
.l-tot{margin-top:6px;font:700 14px var(--ui);color:var(--mat)}
.hechas-btn{display:flex;align-items:center;gap:6px;font:700 13px var(--ui);text-transform:uppercase;letter-spacing:.06em;color:var(--soft);margin:20px 4px 8px}
.hechas-btn svg{transition:transform .2s}.hechas-btn.ab svg{transform:rotate(90deg)}
.peligro-btn{display:block;margin:30px auto 0;font:600 15px var(--ui);color:var(--red);padding:10px 16px;border-radius:10px}.peligro-btn.sure{background:var(--red);color:#fff}
.nota-ref{font:500 13px/1.4 var(--ui);color:var(--soft);text-align:center;margin-top:24px}
/* ajustes */
.velo{position:absolute;inset:0;z-index:20;background:rgba(20,14,10,.4);opacity:0;transition:opacity .2s}
.velo.in{opacity:1}
.hoja{position:absolute;left:0;right:0;bottom:0;z-index:21;background:var(--bg);border-radius:22px 22px 0 0;padding:8px 16px calc(var(--sb) + 18px);transform:translateY(100%);transition:transform .28s cubic-bezier(.2,.8,.2,1)}
.hoja.in{transform:none}
.hoja .asa{width:38px;height:5px;border-radius:3px;background:#d8cdbd;margin:0 auto 14px}
.hoja .quien{display:flex;align-items:center;gap:12px;margin:0 4px 16px}.hoja .quien .redondo{width:46px;height:46px;font-size:20px}
.hoja .quien b{font:800 20px var(--hand)}.hoja .quien span{display:block;font:500 13px var(--ui);color:var(--soft)}
.op{display:flex;align-items:center;gap:12px;width:100%;padding:14px;font:600 16px var(--ui);text-align:left}
.op svg{color:var(--soft)}.op.peligro{color:var(--red)}.op.sure{background:var(--red);color:#fff}.op.sure svg{color:#fff}
.op span{flex:1}
.hoja .grupo .op+.op{border-top:1px solid var(--line)}
.hoja .chiquito{font:500 12.5px/1.4 var(--ui);color:var(--soft);text-align:center;margin:14px 10px 0}
.hoja .chiquito a{color:var(--mat);font-weight:600}
/* toast */
.tst{position:absolute;left:12px;right:12px;bottom:calc(var(--sb) + 76px);z-index:30;display:flex;align-items:center;gap:10px;background:var(--ink);color:var(--paper);border-radius:14px;padding:12px 14px;font:600 14.5px var(--ui);box-shadow:0 10px 26px rgba(0,0,0,.3);transform:translateY(20px);opacity:0;transition:transform .22s,opacity .22s;pointer-events:none}
.tst.in{transform:none;opacity:1;pointer-events:auto}
.tst span{flex:1}.tst button{font:700 14.5px var(--ui);color:#9fe3a8;padding:2px 4px}
.app.tecleando .tst{bottom:12px}
@media (min-width:521px){.app{box-shadow:0 0 0 1px var(--line),0 20px 60px rgba(0,0,0,.25)}:host{background:#2a2420}}
`));
const app=h("div",{class:"app"});root.append(app);

/* ---------- toast propio (con «Deshacer») ---------- */
const tst=h("div",{class:"tst",role:"status"});app.append(tst);let tT=null;
function aviso(t,accion,fn){tst.replaceChildren(h("span",null,t));if(accion){tst.append(h("button",{type:"button",onclick:()=>{tst.classList.remove("in");fn()}},accion))}tst.classList.add("in");clearTimeout(tT);tT=setTimeout(()=>tst.classList.remove("in"),accion?5200:2600)}
const deshacerBtn=()=>{if(window.deshacer&&window.deshacer())aviso("Listo, lo volví atrás.")};

/* ---------- pestañas ---------- */
const P={};const tabsEl=h("nav",{class:"tabs"});let tab=LSg("celu_tab")||"inicio";
const TABS=[["inicio","Anotar",I.anotar],["ideas","Ideas",I.ideas],["diario","Diario",I.diario],["listas","Listas",I.listas]];
for(const [id,nom,ic] of TABS){P[id]=h("section",{class:"pant",id:"p-"+id,hidden:true});app.append(P[id]);
  const b=h("button",{type:"button","data-t":id,onclick:()=>{if(tab===id){P[id].scrollTo({top:0,behavior:"smooth"});return}irTab(id)}},ico(ic,25),nom);tabsEl.append(b)}
app.append(tabsEl);
function colorArriba(){const v=tab==="inicio"&&!capas.length?"#1f6b4a":"#f5efe3";const m=document.querySelector('meta[name="theme-color"]');if(m&&m.content!==v)m.content=v;document.documentElement.style.setProperty("background",v,"important")}
function irTab(id){tab=id;app.classList.toggle("en-inicio",id==="inicio");tst.classList.remove("in");LSs("celu_tab",id);cerrarCapas();for(const [k] of TABS){P[k].hidden=k!==id;tabsEl.querySelector(`[data-t="${k}"]`).classList.toggle("on",k===id)}pintar()}
/* que el teclado no tape: mientras se escribe se esconde la barra de abajo */
root.addEventListener("focusin",e=>{if(e.target.matches("textarea,input"))app.classList.add("tecleando")});
root.addEventListener("focusout",()=>setTimeout(()=>{const a=root.activeElement;if(!a||!a.matches("textarea,input"))app.classList.remove("tecleando")},60));

/* ---------- capas que se apilan (detalle de una idea, una lista, un día) ---------- */
const capas=[];
function abrirCapa(titVolver,armar,acciones){const c=h("div",{class:"capa"});const bar=h("div",{class:"barra"});
  const v=h("button",{type:"button",class:"volver",onclick:()=>cerrarCapa(c)},ico(I.atras,26),titVolver);const der=h("div",{class:"der"});bar.append(v,der);
  const cuerpo=h("div");c.append(bar,cuerpo);c._der=der;c._cuerpo=cuerpo;c._armar=armar;app.append(c);capas.push(c);colorArriba();
  armar(cuerpo,der,c);requestAnimationFrame(()=>requestAnimationFrame(()=>c.classList.add("in")));
  /* deslizar desde el borde izquierdo para volver */
  let x0=null,y0=0,dx=0;c.addEventListener("touchstart",e=>{const t=e.touches[0];if(t.clientX<28){x0=t.clientX;y0=t.clientY;dx=0}},{passive:true});
  c.addEventListener("touchmove",e=>{if(x0===null)return;const t=e.touches[0];dx=t.clientX-x0;if(Math.abs(t.clientY-y0)>Math.abs(dx)&&dx<20){x0=null;c.style.transform="";return}if(dx>0){c.style.transition="none";c.style.transform=`translateX(${dx}px)`}},{passive:true});
  c.addEventListener("touchend",()=>{if(x0===null)return;x0=null;c.style.transition="";if(dx>innerWidth*.3)cerrarCapa(c);else c.style.transform=""});
  return c}
function cerrarCapa(c){const a=root.activeElement;if(a&&a.blur)a.blur();c.classList.remove("in");c.style.transform="";const i=capas.indexOf(c);if(i>=0)capas.splice(i,1);if(c._alCerrar)c._alCerrar();setTimeout(()=>c.remove(),300);pintar()}
function cerrarCapas(){for(const c of [...capas])cerrarCapa(c)}
const capaArriba=()=>capas[capas.length-1];

/* ---------- datos ---------- */
let D=null,listo=false;
const todasIdeas=()=>(typeof data!=="undefined"&&data.ideas)||[],ideas=()=>todasIdeas().filter(i=>!i.dentro&&!(typeof enPila==="function"&&enPila(i))),frases=()=>(typeof data!=="undefined"&&data.frases)||[],dias=()=>(typeof data!=="undefined"&&data.diario)||[];
const misListas=()=>(typeof listas!=="undefined"&&listas)||[];
const categorias=()=>{const usadas=new Map();for(const i of ideas())usadas.set(i.tipo,(usadas.get(i.tipo)||0)+1);return [...cats].sort((a,b)=>(usadas.get(b.id)||0)-(usadas.get(a.id)||0))};
const usoListas=()=>{try{return JSON.parse(LSg("celu_uso_listas")||"{}")||{}}catch(_){return {}}};
const marcarUsoLista=id=>{const u=usoListas();u[id]=Date.now();LSs("celu_uso_listas",JSON.stringify(u))};
const listasOrden=()=>{const u=usoListas();return [...misListas()].sort((a,b)=>(u[b.id]||0)-(u[a.id]||0)||(b.creado||0)-(a.creado||0))};
const sigNumero=arr=>arr.reduce((a,i)=>Math.max(a,+i.numero||0),0)+1;
const colorCat=i=>i.colorPropio||cat(i.tipo).color;

/* ================= DICTADO (dictado.js: Whisper vía el Worker; no usa el del iPhone) ================= */
function botonMic(destino,chico,alTexto){const b=h("button",{type:"button",class:"mic"+(chico?" chico":""),"aria-label":"Dictar con la voz"},ico(I.mic,chico?20:22));
  const normal=()=>{b.classList.remove("grab","pensando");b.setAttribute("aria-label","Dictar con la voz");b.replaceChildren(ico(I.mic,chico?20:22))};
  const o={onTick:s=>{b.classList.add("grab");b.setAttribute("aria-label","Terminar de dictar");b.replaceChildren(ico(I.stop,16),Math.floor(s/60)+":"+String(s%60).padStart(2,"0"))},
    onPensando:()=>{normal();b.classList.add("pensando");vibrar()},onError:m=>aviso(m),onFin:normal,
    onTexto:t=>{if(alTexto&&alTexto(t))return;const ta=destino();if(!ta){aviso("Dictado: "+t);return}
      const a=ta.value,foc=root.activeElement===ta,i0=foc&&ta.selectionStart!=null?ta.selectionStart:a.length,i1=foc&&ta.selectionEnd!=null?ta.selectionEnd:a.length;
      const antes=a.slice(0,i0),sep=antes&&!/\s$/.test(antes)?" ":"";ta.value=antes+sep+t+a.slice(i1);ta.dispatchEvent(new Event("input"));vibrar()}};
  b.onclick=()=>{if(!window.Dictado){aviso("El dictado no cargó. Recargá la página.");return}if(Dictado.de(o))Dictado.parar();else{vibrar();Dictado.empezar(o)}};return b}
/* en Anotar, si arrancás diciendo «diario…», «frase…», «lista…» o «idea/nota…», se elige solo a dónde va */
function rutearDictado(t){const n=sinT(t),corta=k=>t.slice(k).replace(/^[\s,.:;\-–—]+/,"").trim();let m;
  if(comp.ta.value.trim())return false;
  if((m=/^(querido diario|diario)\b/.exec(n))){dest="diario";comp.ta.value=mayus(corta(m[0].length))}
  else if((m=/^frase\b/.exec(n))){dest="frase";let r=corta(m[0].length);const a=/^de ([^:,.]+?)\s*[:,.]\s*/i.exec(r);if(a){r=r.slice(a[0].length);dest="frase";pintarComp();if(comp.autor)comp.autor.value=a[1].trim()}comp.ta.value=mayus(r)}
  else if((m=/^(nota|idea)( nueva)?\b/.exec(n))){dest="idea";comp.ta.value=mayus(corta(m[0].length))}
  else if((m=/^(a la )?lista\b/.exec(n))){dest="lista";let r=corta(m[0].length);const ls=listasOrden();const L=ls.find(l=>{const nm=sinT(nombreLista(l)).trim();return nm&&sinT(r).startsWith(nm)});
    if(L){listaSel=L.id;LSs("celu_lista",L.id);r=r.slice(nombreLista(L).length).replace(/^[\s,.:;\-–—]+/,"")}comp.ta.value=mayus(r)}
  else return false;
  LSs("celu_dest",dest);LSs("celu_borrador",comp.ta.value);pintarComp();vibrar();return true}

/* ================= ANOTAR ================= */
let dest=LSg("celu_dest")||"idea",catSel=LSg("celu_cat")||"otro",listaSel=LSg("celu_lista")||"",fotoSel=null;
const PH={idea:"Una idea, una locación, lo que sea…",diario:"¿Qué pasó hoy?",frase:"La frase…",lista:"Algo para la lista…"};
const comp={};
function armarInicio(){const p=P.inicio;p.replaceChildren();
  const mat=h("div",{class:"mat"});p.append(mat);
  comp.sync=h("div",{class:"sync"},h("i"),h("span",null,"Guardado"));
  const hora=new Date().getHours(),nom=nombreUsuario(),sal=(hora<6?"Buenas noches":hora<13?"Buen día":hora<20?"Buenas tardes":"Buenas noches")+(nom?", "+nom:"");
  mat.append(h("div",{class:"saludo"},h("div",null,h("p",{class:"fecha"},fechaLarga(hoyK())),h("h1",null,sal),comp.sync),avatar("button",{"aria-label":"Tu cuenta",onclick:abrirAjustes})));
  const c=h("div",{class:"comp"});mat.append(c);
  const ds=h("div",{class:"dest",role:"tablist"});for(const [id,n] of [["idea","Idea"],["diario","Diario"],["frase","Frase"],["lista","Lista"]])ds.append(h("button",{type:"button","data-d":id,role:"tab",onclick:()=>{dest=id;LSs("celu_dest",id);pintarComp();comp.ta.focus()}},n));
  comp.ta=h("textarea",{rows:3,class:"alta","aria-label":"Escribí acá",enterkeyhint:"enter",oninput:()=>{autosize(comp.ta);estadoGuardar();LSs("celu_borrador",comp.ta.value)},onkeydown:e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)){e.preventDefault();guardarComp()}}});
  comp.ctx=h("div");comp.foto=h("input",{type:"file",accept:"image/*",hidden:true,onchange:()=>{const f=comp.foto.files[0];comp.foto.value="";if(f){fotoSel=f;pintarComp()}}});
  comp.prev=h("div");
  comp.btnFoto=h("button",{type:"button",class:"foto","aria-label":"Sumar una foto",onclick:()=>comp.foto.click()},ico(I.foto,22));
  comp.btn=h("button",{type:"button",class:"guardar",onclick:guardarComp},"Guardar");
  comp.mic=botonMic(()=>comp.ta,false,t=>rutearDictado(t));
  c.append(ds,comp.ta,comp.prev,comp.ctx,h("div",{class:"comp-pie"},comp.mic,comp.btnFoto,comp.btn),comp.foto);
  comp.ds=ds;comp.ta.value=LSg("celu_borrador")||"";
  pintarComp();pintarRecientes()}
function estadoGuardar(){const t=comp.ta.value.trim();comp.btn.disabled=!(t||(dest==="idea"&&fotoSel))}
function pintarComp(){if(!comp.ta)return;for(const b of comp.ds.children)b.classList.toggle("on",b.dataset.d===dest);comp.ta.placeholder=PH[dest];
  comp.btnFoto.hidden=dest!=="idea";comp.btnFoto.classList.toggle("tiene",!!fotoSel);
  comp.prev.replaceChildren();if(fotoSel&&dest==="idea"){const im=h("img",{alt:""});im.src=URL.createObjectURL(fotoSel);comp.prev.append(h("div",{class:"prev-foto"},im,"Va con esta foto",h("button",{type:"button","aria-label":"Sacar la foto",onclick:()=>{fotoSel=null;pintarComp()}},ico(I.x,18))))}
  const x=comp.ctx;x.replaceChildren();
  if(dest==="idea"){const r=h("div",{class:"ctx"});const cs=categorias();if(!cs.some(c=>c.id===catSel))catSel=(cs.find(c=>c.id==="otro")||cs[0]||{}).id;
    for(const c of cs){const b=h("button",{type:"button",class:"chip"+(c.id===catSel?" on":""),onclick:()=>{catSel=c.id;LSs("celu_cat",c.id);pintarComp()}},h("i",{style:"background:"+c.color}),c.nombre);r.append(b)}
    x.append(r);requestAnimationFrame(()=>{const on=r.querySelector(".on");if(on&&on.offsetLeft+on.offsetWidth>r.clientWidth)r.scrollLeft=on.offsetLeft-40})}
  else if(dest==="frase"){comp.autor=comp.autor||h("input",{class:"autor",type:"text",placeholder:"¿De quién es? (si sabés)",autocomplete:"off"});x.append(comp.autor)}
  else if(dest==="lista"){const r=h("div",{class:"ctx"});const ls=listasOrden();if(!ls.some(l=>l.id===listaSel))listaSel=ls[0]?ls[0].id:"";
    for(const L of ls)r.append(h("button",{type:"button",class:"chip"+(L.id===listaSel?" on":""),onclick:()=>{listaSel=L.id;LSs("celu_lista",L.id);pintarComp()}},nombreLista(L)));
    r.append(h("button",{type:"button",class:"chip nuevo",onclick:async()=>{const n=prompt("¿Cómo se llama la lista nueva?","");if(n===null)return;const id=await nuevaLista({titulo:n.trim()});if(id){listaSel=id;LSs("celu_lista",id);marcarUsoLista(id);setTimeout(pintarComp,50)}}},"+ Nueva"));x.append(r)}
  else x.append(h("div",{class:"ctx-txt"},"Va a la página de hoy, con la hora."));
  autosize(comp.ta);estadoGuardar()}
const RX_URL=/^(https?:\/\/\S+|www\.\S+)$/i;
let guardando=false;
async function guardarComp(){if(guardando)return;const t=comp.ta.value.trim();if(!t&&!(dest==="idea"&&fotoSel))return;if(!listo){aviso("Todavía estoy cargando tu plancha, esperá un toque.");return}
  guardando=true;try{
  if(dest==="idea"){const o={texto:t,tipo:catSel||"otro",creado:Date.now(),numero:sigNumero(ideas()),origen:"celu"};
    if(fotoSel){comp.btn.textContent="Subiendo foto…";const r=await subir(fotoSel);comp.btn.textContent="Guardar";if(!r){aviso("No se pudo subir la foto. Probá de nuevo.");return}o.bloques=[{id:bid(),t:"img",a:r.id,alt:fotoSel.name||"Foto",x:480,y:0,w:300}];if(!t)o.texto=""}
    const ref=await cols.ideas.add(o);fotoSel=null;vibrar();aviso("Guardada en "+cat(o.tipo).nombre+" (#"+o.numero+").","Ver",()=>abrirIdea(ref.id))}
  else if(dest==="frase"){const autor=(comp.autor&&comp.autor.value.trim())||"";await cols.frases.add({texto:t,autor,creado:Date.now(),numero:sigNumero(frases()),origen:"celu"});if(comp.autor)comp.autor.value="";vibrar();aviso("Frase guardada.","Ver",()=>{irTab("ideas");segIdeas="frases";pintar()})}
  else if(dest==="diario"){if(!anotarEnDiario(t)){aviso("El diario todavía está cargando. Probá en un toque.");return}vibrar();aviso("Anotado en el diario de hoy.","Ver",()=>irTab("diario"))}
  else if(dest==="lista"){let L=misListas().find(l=>l.id===listaSel);
    if(!L){const id=await nuevaLista({titulo:"Lista"});await new Promise(r=>setTimeout(r,60));L=misListas().find(l=>l.id===id);if(!L){aviso("No se pudo crear la lista.");return}listaSel=id;LSs("celu_lista",id)}
    const n=sumarALista(L,t);marcarUsoLista(L.id);vibrar();aviso((n===1?"Sumado a ":`Sumé ${n} cosas a `)+nombreLista(L)+".","Ver",()=>abrirLista(L.id))}
  comp.ta.value="";LSs("celu_borrador","");autosize(comp.ta);pintarComp();
  }finally{guardando=false}}
function sumarALista(L,txt,arriba){if(!Array.isArray(L.lista))L.lista=[];const nuevos=[];
  for(const ln of txt.split(/\n+/).map(s=>s.trim()).filter(Boolean)){if(RX_URL.test(ln)){const u=/^www\./i.test(ln)?"https://"+ln:ln;nuevos.push(itemLink(u))}else nuevos.push({id:bid(),v:ln,hecho:null})}
  if(arriba){const i=L.lista.findIndex(t=>t.hecho);L.lista.splice(i<0?L.lista.length:i,0,...nuevos)}else{const i=L.lista.findIndex(t=>t.hecho);L.lista.splice(i<0?L.lista.length:i,0,...nuevos)}
  guardarLista(L);try{pintarTareas()}catch(_){}for(const it of nuevos)if(it.url)try{completarItem(L,it)}catch(_){}return nuevos.length}
function filaIdea(i,k){const esF=k==="frases";const t=textoIdea(i);
  const meta=h("div",{class:"f-meta"});if(esF){if(i.autor)meta.append(h("span",null,i.autor+" ·"))}else meta.append(h("span",null,"#"+(i.numero||"")+" · "+cat(i.tipo).nombre+" ·"));meta.append(h("span",null,fechaCorta(i.creado||0)));
  if(!esF&&i.estado){const e=estadoDe(i.estado);if(e)meta.append(h("span",{class:"est"},h("i",{style:"background:"+e.color}),e.nombre))}
  const nImg=(i.bloques||[]).filter(b=>b.t==="img").length;if(nImg)meta.append(h("span",null,"· "+nImg+(nImg===1?" foto":" fotos")));
  return h("button",{type:"button",class:"fila",onclick:()=>esF?abrirFrase(i.id):abrirIdea(i.id,i.dentro?"Atrás":null)},esF?h("span",{class:"comilla"},"“"):h("span",{class:"post",style:"background:"+colorCat(i)}),
    h("div",{class:"f-cuerpo"},h("div",{class:"f-txt"+(t?"":" vacio")},t||(nImg?"Una foto":"Sin texto")),meta),ico(I.chev,18))}
function pintarRecientes(){if(!comp.rec)return;const r=comp.rec;r.replaceChildren();
  const e=entradaDia(hoyK()),tr=e?tramosDe(e).filter(t=>(t.texto||"").trim()):[];
  const s1=h("div",{class:"sec"},h("h2",null,"Hoy en el diario"));const hc=h("button",{type:"button",class:"hoy-card",onclick:()=>irTab("diario")});
  if(tr.length){const ult=tr[tr.length-1];hc.append(h("div",{class:"t"},tr.length===1?"1 cosa anotada":tr.length+" cosas anotadas"),h("div",{class:"d"},(ult.h?ult.h+" · ":"")+ult.texto))}else hc.append(h("div",{class:"t"},"Todavía nada"),h("div",{class:"d"},"Tocá Diario arriba y contá cómo viene el día."));
  s1.append(hc);r.append(s1);
  const todo=[...ideas().map(i=>[i,"ideas"]),...frases().map(i=>[i,"frases"])].sort((a,b)=>(b[0].creado||0)-(a[0].creado||0)).slice(0,6);
  const s2=h("div",{class:"sec"},h("h2",null,"Lo último",h("button",{type:"button",onclick:()=>irTab("ideas")},"Ver todo")));
  if(!todo.length)s2.append(h("div",{class:"grupo"},h("div",{class:"vacio-box"},listo?"Acá van a aparecer las últimas cosas que anotes.":"Cargando…")));
  else{const g=h("div",{class:"grupo"});for(const [i,k] of todo)g.append(filaIdea(i,k));s2.append(g)}
  r.append(s2)}

/* ================= IDEAS ================= */
let segIdeas="ideas",qIdeas="",catFiltro=null,limIdeas=60;const ideasUI={};
function armarIdeas(){const p=P.ideas;p.replaceChildren();
  p.append(h("div",{class:"cab"},h("div",null,h("h1",null,"Ideas"),ideasUI.sub=h("p",{class:"sub"}))));
  const inp=h("input",{type:"search",placeholder:"Buscar",enterkeyhint:"search","aria-label":"Buscar",oninput:()=>{qIdeas=inp.value;limIdeas=60;bs.classList.toggle("con",!!qIdeas);pintarListaIdeas()}});
  const bs=h("div",{class:"busca"},ico(I.buscar,18),inp,h("button",{type:"button","aria-label":"Borrar búsqueda",onclick:()=>{inp.value="";qIdeas="";bs.classList.remove("con");pintarListaIdeas()}},ico(I.x,16)));
  ideasUI.seg=h("div",{class:"seg"},h("button",{type:"button","data-s":"ideas",onclick:()=>{segIdeas="ideas";limIdeas=60;pintarListaIdeas()}},"Ideas"),h("button",{type:"button","data-s":"frases",onclick:()=>{segIdeas="frases";limIdeas=60;pintarListaIdeas()}},"Frases"));
  ideasUI.fil=h("div",{class:"filtros"});ideasUI.lista=h("div",{class:"sec",style:"padding-top:10px"});
  p.append(bs,ideasUI.seg,ideasUI.fil,ideasUI.lista);pintarListaIdeas()}
function pintarListaIdeas(){if(!ideasUI.lista)return;for(const b of ideasUI.seg.children)b.classList.toggle("on",b.dataset.s===segIdeas);
  const esF=segIdeas==="frases";let arr=esF?frases():ideas();
  ideasUI.fil.hidden=esF;
  if(!esF){const f=ideasUI.fil;f.replaceChildren();const mk=(id,nom,color)=>h("button",{type:"button",class:"chip"+(catFiltro===id?" on":""),onclick:()=>{catFiltro=catFiltro===id||id===null?null:id;limIdeas=60;pintarListaIdeas()}},color?h("i",{style:"background:"+color}):null,nom);
    f.append(mk(null,"Todas"));for(const c of categorias())if(arr.some(i=>i.tipo===c.id))f.append(mk(c.id,c.nombre,c.color));
    if(catFiltro)arr=arr.filter(i=>i.tipo===catFiltro)}
  if(qIdeas.trim()){const q=sinT(qIdeas.trim());arr=arr.filter(i=>sinT((i.texto||"")+" "+(i.autor||"")+" "+(esF?"":textoBloques(i))+" #"+(i.numero||"")).includes(q))}
  arr=[...arr].sort((a,b)=>(b.creado||0)-(a.creado||0));
  ideasUI.sub.textContent=listo?(esF?frases().length+(frases().length===1?" frase":" frases"):ideas().length+(ideas().length===1?" idea":" ideas")):"Cargando…";
  const L=ideasUI.lista;L.replaceChildren();
  if(!arr.length){L.append(h("div",{class:"grupo"},h("div",{class:"vacio-box"},qIdeas?h("b",null,"Nada con eso"):h("b",null,esF?"Ninguna frase todavía":"Ninguna idea todavía"),qIdeas?"Probá con otra palabra.":"Anotalas desde Anotar.")));return}
  const g=h("div",{class:"grupo"});for(const i of arr.slice(0,limIdeas))g.append(filaIdea(i,esF?"frases":"ideas"));L.append(g);
  if(arr.length>limIdeas)L.append(h("button",{type:"button",class:"mas-btn",onclick:()=>{limIdeas+=80;pintarListaIdeas()}},`Mostrar más (${arr.length-limIdeas})`))}

function botonBorrar(der,texto,fn){const b=h("button",{type:"button",class:"acc peligro"},texto);let sure=false,t=null;
  b.onclick=()=>{if(!sure){sure=true;b.classList.add("sure");b.textContent="¿Seguro?";t=setTimeout(()=>{sure=false;b.classList.remove("sure");b.textContent=texto},3000);return}clearTimeout(t);fn()};der.append(b);return b}
function abrirIdea(id,volverA){const c=abrirCapa(volverA||"Ideas",(cu,der,capa)=>{
  botonBorrar(der,"Borrar",async()=>{const i=todasIdeas().find(x=>x.id===id);cerrarCapa(capa);try{await cols.ideas.doc(id).delete();try{borrarFlechasDe(id)}catch(_){}aviso("Borré la idea"+(i&&i.numero?" #"+i.numero:"")+".","Deshacer",deshacerBtn)}catch(_){aviso("No se pudo borrar.")}});
  const d=h("div",{class:"det"});cu.append(d);
  const cs=h("div",{class:"det-cats"}),ta=h("textarea",{class:"grande",rows:1,placeholder:"Escribí la idea…","aria-label":"Texto de la idea"}),meta=h("div",{class:"meta"}),ests=h("div",{class:"estados"}),bl=h("div");
  let tG=null;const guardarTxt=()=>{clearTimeout(tG);const i=todasIdeas().find(x=>x.id===id);if(i&&(i.texto||"")!==ta.value)cols.ideas.doc(id).update({texto:ta.value})};
  ta.oninput=()=>{autosize(ta);clearTimeout(tG);tG=setTimeout(guardarTxt,700)};ta.onblur=guardarTxt;capa._alCerrar=guardarTxt;
  const sum=h("textarea",{rows:1,placeholder:"Sumarle algo…","aria-label":"Sumarle algo a la idea",oninput:()=>{autosize(sum);ir.disabled=!sum.value.trim()}});
  const ir=h("button",{type:"button",class:"ir","aria-label":"Sumar",disabled:true,onclick:()=>{const v=sum.value.trim();if(!v)return;const i=todasIdeas().find(x=>x.id===id);if(!i)return;const b=[...(i.bloques||[])];const y=b.reduce((a,x)=>Math.max(a,(x.y||0)+(x.h||200)),0);
    b.push({id:bid(),t:"post",v,c:"#fff4a8",x:480,y,w:220});cols.ideas.doc(id).update({bloques:b});sum.value="";autosize(sum);ir.disabled=true;vibrar();aviso("Sumado adentro de la idea.")}},ico(I.flecha,20));
  const fi=h("input",{type:"file",accept:"image/*",hidden:true,onchange:async()=>{const f=fi.files[0];fi.value="";if(!f)return;aviso("Subiendo foto…");const r=await subir(f);if(!r){return}const i=todasIdeas().find(x=>x.id===id);if(!i)return;const b=[...(i.bloques||[])];const y=b.reduce((a,x)=>Math.max(a,(x.y||0)+(x.h||200)),0);
    b.push({id:bid(),t:"img",a:r.id,alt:f.name||"Foto",x:480,y,w:300});cols.ideas.doc(id).update({bloques:b});aviso("Foto sumada.")}});
  const cam=h("button",{type:"button",class:"cam","aria-label":"Sumar una foto",onclick:()=>fi.click()},ico(I.foto,22));
  d.append(cs,ta,meta,ests,h("div",{class:"sumar"},sum,botonMic(()=>sum,true),cam,ir,fi),bl);
  capa._pintar=()=>{const i=todasIdeas().find(x=>x.id===id);if(!i){cerrarCapa(capa);return}
    const cc=cat(i.tipo);cs.replaceChildren(h("span",{class:"chip"},h("i",{style:"background:"+colorCat(i)}),cc.nombre));
    if(root.activeElement!==ta){ta.value=i.texto||"";requestAnimationFrame(()=>autosize(ta))}
    meta.textContent="#"+(i.numero||"")+" · anotada "+fechaCorta(i.creado||0);
    ests.replaceChildren();for(const e of ESTADOS)ests.append(h("button",{type:"button",class:"chip"+(i.estado===e.id?" on":""),style:"--c:"+e.color,onclick:()=>cols.ideas.doc(id).update({estado:i.estado===e.id?null:e.id})},h("i",{style:"background:"+e.color}),e.nombre));
    pintarBloques(bl,i)};
  capa._pintar();if(!(todasIdeas().find(x=>x.id===id)||{}).texto)setTimeout(()=>ta.focus(),350)});return c}
function pintarBloques(cont,i){const firma=JSON.stringify(i.bloques||[]);if(cont._f===firma)return;cont._f=firma;cont.replaceChildren();
  const bs=[...(i.bloques||[])].sort((a,b)=>(a.y||0)-(b.y||0)||(a.x||0)-(b.x||0));if(!bs.length)return;
  const g=h("div",{class:"bloques"});let otros=0;
  for(const b of bs){
    if((b.t==="post"||b.t==="txt"||b.t==="tx")&&(b.v||"").trim())g.append(h("div",{class:b.t==="post"?"bl-post":"bl-txt",style:b.t==="post"?"background:"+(b.c||"#fff4a8"):null},b.v));
    else if(b.t==="img"&&b.a){const im=h("img",{alt:b.alt||"",loading:"lazy"});const w=h("div",{class:"bl-img"},im);try{cargarImg(im,b.a)}catch(_){}im.onclick=()=>{try{verImagen&&verImagen(im.src)}catch(_){}};g.append(w)}
    else if(b.t==="link"&&b.url){const a=h("a",{class:"bl-link",href:b.url,target:"_blank",rel:"noopener"});if(b.img)a.append(h("img",{src:b.img,alt:"",loading:"lazy",onerror:e=>e.target.remove()}));a.append(h("div",null,h("div",{class:"t"},b.titulo||b.tt||hostDe(b.url)),h("div",{class:"u"},hostDe(b.url))));g.append(a)}
    else if(b.t==="links"&&(b.items||[]).length){for(const x of b.items){if(!x.url)continue;const a=h("a",{class:"bl-link",href:x.url,target:"_blank",rel:"noopener"});if(x.img)a.append(h("img",{src:x.img,alt:"",loading:"lazy",onerror:e=>e.target.remove()}));a.append(h("div",null,h("div",{class:"t"},x.titulo||x.tt||hostDe(x.url)),h("div",{class:"u"},hostDe(x.url))));g.append(a)}}
    else if(b.t==="ref"&&b.ref){const k=b.k==="frases"?"frases":"ideas",x=(k==="frases"?frases():todasIdeas()).find(z=>z.id===b.ref);if(x)g.append(h("div",{class:"grupo"},filaIdea(x,k)));else otros++}
    else if(b.t==="tar"&&b.ref){const L=misListas().find(l=>l.id===b.ref);if(L){const pend=(L.lista||[]).filter(t=>!t.hecho).length;g.append(h("button",{type:"button",class:"bl-lista",onclick:()=>abrirLista(L.id,"Idea")},ico(I.listas,20),h("span",null,nombreLista(L)),ico(I.chev,16)))}}
    else otros++}
  cont.append(h("h3",null,"Adentro"),g);
  if(otros)cont.append(h("div",{class:"bl-nota"},otros===1?"Hay una cosa más adentro (un dibujo, un hilo, un guion…) que se ve en la compu.":`Hay ${otros} cosas más adentro (dibujos, hilos, guiones…) que se ven en la compu.`))}
function abrirFrase(id){abrirCapa("Frases",(cu,der,capa)=>{
  botonBorrar(der,"Borrar",async()=>{cerrarCapa(capa);try{await cols.frases.doc(id).delete();aviso("Borré la frase.","Deshacer",deshacerBtn)}catch(_){aviso("No se pudo borrar.")}});
  const d=h("div",{class:"det"});cu.append(d);
  const ta=h("textarea",{class:"grande",rows:1,placeholder:"La frase…"}),au=h("input",{class:"autor",type:"text",placeholder:"¿De quién es?",style:"margin-top:10px"}),meta=h("div",{class:"meta"});
  let tG=null;const g=()=>{clearTimeout(tG);const f=frases().find(x=>x.id===id);if(f&&((f.texto||"")!==ta.value||(f.autor||"")!==au.value))cols.frases.doc(id).update({texto:ta.value,autor:au.value.trim()})};
  ta.oninput=()=>{autosize(ta);clearTimeout(tG);tG=setTimeout(g,700)};au.oninput=()=>{clearTimeout(tG);tG=setTimeout(g,700)};ta.onblur=g;au.onblur=g;capa._alCerrar=g;
  d.append(ta,au,meta);
  capa._pintar=()=>{const f=frases().find(x=>x.id===id);if(!f){cerrarCapa(capa);return}if(root.activeElement!==ta){ta.value=f.texto||"";requestAnimationFrame(()=>autosize(ta))}if(root.activeElement!==au)au.value=f.autor||"";meta.textContent="Frase #"+(f.numero||"")+" · "+fechaCorta(f.creado||0)};capa._pintar()})}

/* ================= DIARIO ================= */
const tramosDe=e=>{if(!e)return [];if(Array.isArray(e.tramos)&&e.tramos.length)return e.tramos;try{return migrarTramos(JSON.parse(JSON.stringify(e)))}catch(_){return e.texto?[{id:"x",h:null,texto:e.texto}]:[]}};
const diaUI={};let limDias=40;
function armarDiario(){const p=P.diario;p.replaceChildren();
  diaUI.racha=h("div");p.append(h("div",{class:"cab"},h("div",null,h("h1",null,"Diario"),h("p",{class:"sub"},"Lo que vas viviendo, día por día.")),diaUI.racha));
  const card=h("div",{class:"dia-hoy"});diaUI.fe=h("div",{class:"fe"});diaUI.tr=h("div",{class:"tramos"});
  diaUI.ta=h("textarea",{rows:2,placeholder:"¿Qué pasó? Contalo como te salga…","aria-label":"Escribir en el diario",oninput:()=>{autosize(diaUI.ta);diaUI.ok.disabled=!diaUI.ta.value.trim()}});
  diaUI.ok=h("button",{type:"button",class:"btn-chico",disabled:true,onclick:()=>{const t=diaUI.ta.value.trim();if(!t)return;if(!anotarEnDiario(t)){aviso("El diario todavía está cargando. Probá en un toque.");return}diaUI.ta.value="";autosize(diaUI.ta);diaUI.ok.disabled=true;vibrar();setTimeout(pintarDiarioC,80)}},"Anotar");
  card.append(diaUI.fe,diaUI.tr,diaUI.ta,h("div",{class:"dia-pie"},h("span",null,"Se guarda con la hora"),h("div",{style:"display:flex;gap:6px;align-items:center"},botonMic(()=>diaUI.ta,true),diaUI.ok)));
  diaUI.lista=h("div",{class:"sec"});p.append(card,diaUI.lista);pintarDiarioC()}
function pintarDiarioC(){if(!diaUI.tr)return;const k=hoyK();diaUI.fe.textContent=fechaLarga(k);
  const tr=tramosDe(entradaDia(k)).filter(t=>(t.texto||"").trim());diaUI.tr.replaceChildren(...tr.map(t=>h("div",{class:"tramo"},t.h?h("span",{class:"hh"},t.h):null,t.texto)));
  let r=0;try{r=racha()}catch(_){}diaUI.racha.replaceChildren(r>1?h("span",{class:"racha"},r+" días seguidos"):"");
  const L=diaUI.lista;L.replaceChildren();
  const pasados=dias().filter(e=>e.id<k&&/^\d{4}-\d\d-\d\d$/.test(e.id)&&nivelDia(e)>0).sort((a,b)=>a.id<b.id?1:-1);
  if(!pasados.length){L.append(h("div",{class:"vacio-box"},listo?"Los días que vayas escribiendo van a quedar acá abajo.":"Cargando…"));return}
  let mes=null,g=null;
  for(const e of pasados.slice(0,limDias)){const f=fechaDe(e.id),m=f.toLocaleDateString("es-AR",{month:"long",year:"numeric"});
    if(m!==mes){mes=m;L.append(h("div",{class:"mes"},m));g=h("div",{class:"grupo"});L.append(g)}
    const txt=tramosDe(e).map(t=>t.texto||"").filter(x=>x.trim()).join(" · ")||textoDia(e);const nImg=(e.bloques||[]).filter(b=>b.t==="img").length;
    g.append(h("button",{type:"button",class:"fila dia-fila",onclick:()=>abrirDia(e.id)},h("div",{class:"dia-num"},h("b",null,f.getDate()),h("span",null,f.toLocaleDateString("es-AR",{weekday:"short"}).replace(".",""))),
      h("div",{class:"f-cuerpo"},h("div",{class:"f-txt"+(txt.trim()?"":" vacio")},txt.trim()||(nImg?"Fotos":"…")),nImg?h("div",{class:"f-meta"},nImg+(nImg===1?" foto":" fotos")):null),ico(I.chev,18)))}
  if(pasados.length>limDias)L.append(h("button",{type:"button",class:"mas-btn",onclick:()=>{limDias+=60;pintarDiarioC()}},"Ver días anteriores"))}
function abrirDia(k){abrirCapa("Diario",(cu,der,capa)=>{const d=h("div",{class:"leer"});cu.append(d);
  capa._pintar=()=>{const e=entradaDia(k);d.replaceChildren(h("div",{class:"fe"},fechaLarga(k,{weekday:"long",day:"numeric",month:"long",year:"numeric"})));if(!e)return;
    for(const t of tramosDe(e))if((t.texto||"").trim())d.append(h("div",{class:"tramo"},t.h?h("span",{class:"hh"},t.h):null,t.texto));
    const imgs=(e.bloques||[]).filter(b=>b.t==="img"&&b.a);if(imgs.length){const g=h("div",{class:"bloques",style:"margin-top:16px"});for(const b of imgs){const im=h("img",{alt:"",loading:"lazy"});try{cargarImg(im,b.a)}catch(_){}g.append(h("div",{class:"bl-img"},im))}d.append(g)}
    const otros=(e.bloques||[]).filter(b=>b.t!=="img"&&(b.v||"").trim());for(const b of otros)d.append(h("div",{class:"bl-txt",style:"margin-top:10px"},b.v))};capa._pintar()})}

/* ================= LISTAS ================= */
const listUI={};
function armarListas(){const p=P.listas;p.replaceChildren();
  p.append(h("div",{class:"cab"},h("div",null,h("h1",null,"Listas"),listUI.sub=h("p",{class:"sub"})),h("div",{class:"cab-der"},h("button",{type:"button",class:"redondo verde","aria-label":"Lista nueva",onclick:async()=>{const id=await nuevaLista({titulo:""});if(id){marcarUsoLista(id);setTimeout(()=>abrirLista(id,"Listas",true),80)}}},ico(I.mas,22)))));
  listUI.c=h("div",{class:"sec",style:"padding-top:8px"});p.append(listUI.c);pintarListasC()}
function pintarListasC(){if(!listUI.c)return;const ls=listasOrden();listUI.sub.textContent=listo?(ls.length===1?"1 lista":ls.length+" listas"):"Cargando…";const c=listUI.c;c.replaceChildren();
  if(!ls.length){c.append(h("div",{class:"grupo"},h("div",{class:"vacio-box"},h("b",null,"Ninguna lista todavía"),"Tocá el + para armar la primera.")));return}
  for(const L of ls){const pend=(L.lista||[]).filter(t=>!t.hecho);const ul=h("ul");for(const t of pend.slice(0,3))ul.append(h("li",null,txtItem(t)||"…"));
    c.append(h("button",{type:"button",class:"l-card",onclick:()=>abrirLista(L.id)},h("div",{class:"t"},nombreLista(L),(L.lista||[]).length?null:h("span",null,"vacía")),pend.length?ul:null,L.precios&&totalLista(L).hay?h("div",{class:"l-tot"},"Total "+fmtPrecio(totalLista(L).tot)):null))}}
function abrirLista(id,volver,nueva){marcarUsoLista(id);abrirCapa(volver||"Listas",(cu,der,capa)=>{const d=h("div",{class:"det",style:"padding-top:0"});cu.append(d);
  const L0=()=>misListas().find(l=>l.id===id);
  const tit=h("input",{class:"l-tit",type:"text",placeholder:"Nombre de la lista","aria-label":"Nombre de la lista",enterkeyhint:"next"});let tT2=null;
  const gTit=()=>{clearTimeout(tT2);const L=L0();if(L&&(L.titulo||"")!==tit.value){L.titulo=tit.value;guardarLista(L)}};
  tit.oninput=()=>{clearTimeout(tT2);tT2=setTimeout(gTit,700)};tit.onblur=gTit;tit.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();add.focus()}};
  const cnt=h("div",{class:"meta",style:"margin:2px 0 0"});
  const pesos=h("button",{type:"button",class:"pesos-btn",onclick:()=>{const L=L0();if(!L)return;L.precios=!L.precios;guardarLista(L);try{pintarTareas()}catch(_){}vibrar();capa._pintar(true)}});
  const totBar=h("div",{class:"tot-bar"});
  capa._total=()=>{const L=L0();if(!L)return;totBar.hidden=!L.precios;if(!L.precios)return;const {tot,falta,hay,fuera}=totalLista(L);const extra=[hay&&falta!==tot?"Falta comprar "+fmtPrecio(falta):"",fuera?(fuera===1?"1 opción sin sumar":fuera+" opciones sin sumar"):""].filter(Boolean).join(" · ");totBar.replaceChildren(h("span",null,"Total"),h("b",null,fmtPrecio(tot)),extra?h("small",null,extra):null)};
  const add=h("textarea",{rows:1,placeholder:"Agregar…","aria-label":"Agregar a la lista",enterkeyhint:"done",oninput:()=>autosize(add),onkeydown:e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();agregar()}}});
  const agregar=()=>{const v=add.value.trim();if(!v)return;const L=L0();if(!L)return;sumarALista(L,v);add.value="";autosize(add);vibrar();capa._pintar(true)};
  const items=h("div");d.append(tit,h("div",{class:"l-sub"},cnt,pesos),h("div",{class:"l-add"},h("span",{class:"mas"},ico(I.mas,22)),add,botonMic(()=>add,true)),items);
  let verHechas=false;
  capa._alCerrar=()=>{gTit();const L=L0();if(L&&!(L.titulo||"").trim()&&!(L.lista||[]).length&&!L.enPlancha&&!refsLista(L.id).length)colTareas.doc(L.id).delete().catch(()=>{})};
  capa._pintar=forzarItems=>{const L=L0();if(!L){cerrarCapa(capa);return}if(root.activeElement!==tit)tit.value=L.titulo||"";
    const todas=L.lista||[],pend=todas.filter(t=>!t.hecho),hechas=todas.filter(t=>t.hecho);cnt.textContent=todas.length?"":"Vacía. Escribí abajo del título.";
    pesos.textContent=L.precios?"Sacar precios":(pareceCompras(L)?"$ Sumar precios":"$ Precios");pesos.classList.toggle("on",!!L.precios);pesos.classList.toggle("sug",!L.precios&&pareceCompras(L));capa._total();
    const firma=JSON.stringify([limpiarItems(todas),verHechas,!!L.precios,etiquetas().map(e=>e.id+e.color)]);const ed=root.activeElement&&items.contains(root.activeElement);if(!forzarItems&&(items._f===firma||ed))return;items._f=firma;items.replaceChildren();
    if(pend.length){const g=h("div",{class:"items"});for(const t of pend)g.append(filaItem(L,t,capa));items.append(g)}
    if(hechas.length){const b=h("button",{type:"button",class:"hechas-btn"+(verHechas?" ab":""),onclick:()=>{verHechas=!verHechas;capa._pintar(true)}},ico(I.chev,16),"Hechas ("+hechas.length+")");items.append(b);
      if(verHechas){const g=h("div",{class:"items"});for(const t of hechas)g.append(filaItem(L,t,capa));items.append(g)}}
    items.append(totBar);
    const refs=refsLista(L.id);
    if(refs.length)items.append(h("div",{class:"nota-ref"},"Esta lista está adentro de "+refs.map(i=>"#"+i.numero).join(", ")+"."));
    else if(todas.length||(L.titulo||"").trim()){let sure=false;const bb=h("button",{type:"button",class:"peligro-btn",onclick:()=>{if(!sure){sure=true;bb.classList.add("sure");bb.textContent="¿Seguro? Tocá de nuevo";setTimeout(()=>{sure=false;bb.classList.remove("sure");bb.textContent="Borrar la lista"},3000);return}
      cerrarCapa(capa);colTareas.doc(L.id).delete().then(()=>aviso("Borré la lista.","Deshacer",deshacerBtn)).catch(()=>aviso("No se pudo borrar."))}},"Borrar la lista");items.append(bb)}};
  capa._pintar(true);if(nueva)setTimeout(()=>tit.focus(),350)})}
function filaItem(L,t,capa){const w=h("div",{class:"it-w"}),bor=h("div",{class:"it-bor"},"Borrar"),row=h("div",{class:"it"+(t.hecho?" hecha":"")});w.append(bor,row);
  const tl=h("button",{type:"button",class:"tilde"+(t.hecho?" on":""),"aria-label":t.hecho?"Desmarcar":"Marcar como hecha"},ico(I.check,15));
  tl.onclick=()=>{const it=(L.lista||[]).find(z=>z.id===t.id);if(!it)return;vibrar();tl.classList.toggle("on");row.classList.toggle("hecha");setTimeout(()=>{tildarTarea(L,it);capa._pintar(true)},t.hecho?0:260)};
  const cuerpo=h("div",{class:"cuerpo"});
  if(t.url&&!(t.v||"").trim()){const a=h("a",{class:"lk",href:t.url,target:"_blank",rel:"noopener"});if(t.img)a.append(h("img",{src:t.img,alt:"",loading:"lazy",onerror:e=>e.target.remove()}));a.append(h("div",{style:"min-width:0"},h("div",{class:"t"},t.tt||hostDe(t.url)),h("div",{class:"u"},hostDe(t.url))));cuerpo.append(a)}
  else{const ta=h("textarea",{rows:1,"aria-label":"Renglón"});ta.value=t.v||"";let tG=null;const g=()=>{clearTimeout(tG);const it=(L.lista||[]).find(z=>z.id===t.id);if(!it)return;const v=ta.value.replace(/\n/g," ");if(it.v===v)return;it.v=v;guardarLista(L);try{pintarTareas()}catch(_){}};
    ta.oninput=()=>{fit();clearTimeout(tG);tG=setTimeout(g,700)};ta.onblur=()=>{g();if(!ta.value.trim()){const i=L.lista.findIndex(z=>z.id===t.id);if(i>=0&&!L.lista[i].url){L.lista.splice(i,1);guardarLista(L);try{pintarTareas()}catch(_){}capa._pintar(true)}}};
    ta.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();ta.blur()}};const fit=()=>{ta.style.height="24px";ta.style.height=ta.scrollHeight+"px"};requestAnimationFrame(fit);cuerpo.append(ta);
    if(t.url)cuerpo.append(h("a",{class:"lk",href:t.url,target:"_blank",rel:"noopener",style:"margin-top:4px"},h("div",{class:"u"},"↗ "+hostDe(t.url))))}
  if((t.tags||[]).length){const tg=h("div",{class:"tags"});for(const id of t.tags){const e=etqDe(id);if(e)tg.append(h("span",{style:"background:"+e.color},e.nombre))}cuerpo.append(tg)}
  row.append(tl,cuerpo);
  if(L.precios){const pr=h("input",{class:"precio",type:"text",inputmode:"decimal",placeholder:"$","aria-label":"Precio",enterkeyhint:"next"});pr.value=typeof t.precio==="number"?(+t.precio).toLocaleString("es-AR",{maximumFractionDigits:2}):"";let tG=null;
    const g=()=>{clearTimeout(tG);const it=(L.lista||[]).find(z=>z.id===t.id);if(!it)return;const n=leerPrecio(pr.value);if(n===null){if(!("precio" in it))return;delete it.precio}else{if(it.precio===n)return;it.precio=n}guardarLista(L);try{pintarTareas()}catch(_){}};
    pr.oninput=()=>{const it=(L.lista||[]).find(z=>z.id===t.id);if(it){const n=leerPrecio(pr.value);if(n===null)delete it.precio;else it.precio=n}capa._total();clearTimeout(tG);tG=setTimeout(g,800)};
    pr.onblur=()=>{g();const it=(L.lista||[]).find(z=>z.id===t.id);if(it&&typeof it.precio==="number")pr.value=(+it.precio).toLocaleString("es-AR",{maximumFractionDigits:2})};
    pr.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();const ps=[...root.querySelectorAll(".capa.in .precio")],i=ps.indexOf(pr);if(ps[i+1])ps[i+1].focus();else pr.blur()}};
    if(t.noSuma)row.classList.add("no-suma");const ns=h("button",{type:"button",class:"ns","aria-label":t.noSuma?"No se suma al total. Tocá para sumarlo":"Se suma al total. Tocá si es una opción",onclick:()=>{const it=(L.lista||[]).find(z=>z.id===t.id);if(!it)return;if(it.noSuma)delete it.noSuma;else it.noSuma=true;vibrar();guardarLista(L);try{pintarTareas()}catch(_){}capa._pintar(true)}},"Σ");
    row.append(pr,ns)}
  /* deslizar a la izquierda para borrar */
  let x0=null,y0=0,dx=0,mov=false;
  row.addEventListener("touchstart",e=>{const p=e.touches[0];x0=p.clientX;y0=p.clientY;dx=0;mov=false},{passive:true});
  row.addEventListener("touchmove",e=>{if(x0===null)return;const p=e.touches[0];const ddx=p.clientX-x0,ddy=p.clientY-y0;if(!mov){if(Math.abs(ddy)>8&&Math.abs(ddy)>Math.abs(ddx)){x0=null;return}if(Math.abs(ddx)>10&&ddx<0){mov=true;row.classList.add("arr")}}
    if(mov){w.classList.add("sw");dx=Math.min(0,ddx);row.style.transform=`translateX(${dx}px)`;bor.style.opacity=Math.min(1,-dx/80)}},{passive:true});
  row.addEventListener("touchend",()=>{if(x0===null)return;x0=null;row.classList.remove("arr");if(!mov)return;
    if(-dx>Math.min(140,row.offsetWidth*.35)){row.style.transform="translateX(-110%)";vibrar();setTimeout(()=>{const i=L.lista.findIndex(z=>z.id===t.id);if(i<0)return;const [it]=L.lista.splice(i,1);if(it.dia&&it.hecho)try{quitarDeDiario(it.dia.k,it.dia.id)}catch(_){}guardarLista(L);try{pintarTareas()}catch(_){}capa._pintar(true);aviso("Lo saqué de la lista.","Deshacer",()=>{L.lista.splice(Math.min(i,L.lista.length),0,it);guardarLista(L);try{pintarTareas()}catch(_){}capa._pintar(true)})},180)}
    else{row.style.transform="";setTimeout(()=>w.classList.remove("sw"),220)}});
  return w}

/* ================= CUENTA / AJUSTES ================= */
/* foto de perfil: se guarda en config/perfil (así la ves en todos tus dispositivos) */
let perfil={};const avatares=new Set();
function avatar(tag,props){const e=h(tag,{type:tag==="button"?"button":null,class:"redondo ava",...props});e._pintar=()=>{e.replaceChildren();if(perfil.foto){const im=h("img",{alt:""});im.onerror=()=>{e.replaceChildren((nombreUsuario()||"·").charAt(0).toUpperCase())};try{cargarImg(im,perfil.foto)}catch(_){}e.append(im)}else e.append((nombreUsuario()||"·").charAt(0).toUpperCase())};e._pintar();avatares.add(e);return e}
function pintarAvatares(){for(const e of [...avatares]){if(!e.isConnected){avatares.delete(e);continue}e._pintar()}}
const fotoIn=h("input",{type:"file",accept:"image/*",hidden:true,onchange:async()=>{const f=fotoIn.files[0];fotoIn.value="";if(!f||!D)return;aviso("Subiendo tu foto…");
  try{const bmp=await createImageBitmap(f),lado=Math.min(bmp.width,bmp.height),cv=document.createElement("canvas");cv.width=cv.height=400;cv.getContext("2d").drawImage(bmp,(bmp.width-lado)/2,(bmp.height-lado)/2,lado,lado,0,0,400,400);
    const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",.88));const r=await subir(new File([blob],"perfil.jpg",{type:"image/jpeg"}));if(!r)return;
    await D.doc("config/perfil").set({...perfil,foto:r.id});perfil={...perfil,foto:r.id};pintarAvatares();aviso("Listo, ya tenés foto.")}catch(_){aviso("No pude usar esa foto. Probá con otra.")}}});
app.append(fotoIn);
function elegirFoto(){fotoIn.click()}
function abrirAjustes(){tst.classList.remove("in");const velo=h("div",{class:"velo"}),hj=h("div",{class:"hoja",role:"dialog","aria-label":"Tu cuenta"});
  const cerrar=()=>{velo.classList.remove("in");hj.classList.remove("in");setTimeout(()=>{velo.remove();hj.remove()},300)};velo.onclick=cerrar;
  const nom=nombreUsuario();
  const salir=h("button",{type:"button",class:"op peligro"},ico(I.x,22),h("span",null,"Salir de mi cuenta"));let sure=false;
  salir.onclick=()=>{if(!sure){sure=true;salir.classList.add("sure");salir.querySelector("span").textContent="¿Salir? Tocá de nuevo";setTimeout(()=>{sure=false;salir.classList.remove("sure");salir.querySelector("span").textContent="Salir de mi cuenta"},3500);return}window.salirGH&&window.salirGH()};
  hj.append(h("div",{class:"asa"}),h("div",{class:"quien"},avatar("button",{"aria-label":"Cambiar la foto",onclick:()=>elegirFoto()}),h("div",null,h("b",null,nom||"Tu plancha"),h("span",null,`${ideas().length} ideas · ${frases().length} frases · ${misListas().length===1?"1 lista":misListas().length+" listas"}`),h("button",{type:"button",class:"foto-btn",onclick:()=>elegirFoto()},perfil.foto?"Cambiar foto":"Poner una foto"),perfil.foto?h("button",{type:"button",class:"foto-btn",onclick:()=>{D&&D.doc("config/perfil").set({...perfil,foto:null});cerrar()}},"Sacarla"):null)),
    h("div",{class:"grupo"},
      h("button",{type:"button",class:"op",onclick:()=>{cerrar();try{verNovedades(true,false)}catch(_){}}},ico(I.anotar,22),h("span",null,"Novedades"),ico(I.chev,18)),
      h("button",{type:"button",class:"op",onclick:()=>{cerrar();modoWeb(true)}},ico(I.web,22),h("span",null,"Ver la web completa"),ico(I.chev,18)),
      h("button",{type:"button",class:"op",onclick:()=>{cerrar();aviso("Recargando…");setTimeout(()=>location.reload(),300)}},ico(I.flecha,22),h("span",null,"Recargar la app"),ico(I.chev,18)),
      salir),
    h("p",{class:"chiquito",html:'La web completa (la plancha, el guion, los hilos) anda mejor en la compu.<br>¿Algo no anda o se te ocurre algo? <a href="https://wa.me/5491168342011" target="_blank" rel="noopener">Escribime</a>.'}));
  app.append(velo,hj);requestAnimationFrame(()=>requestAnimationFrame(()=>{velo.classList.add("in");hj.classList.add("in")}))}

/* web completa ↔ app */
const volverBtn=h("button",{id:"celu-volver",type:"button",onclick:()=>modoWeb(false)},"← Volver a la app");
function modoWeb(si){LSs("celu_web",si?"1":"0");document.documentElement.classList.toggle("celu-on",!si);host.hidden=si;if(si){if(!volverBtn.isConnected)document.body.append(volverBtn);const m=document.querySelector('meta[name="theme-color"]');if(m)m.content="#1f6b4a";document.documentElement.style.removeProperty("background")}else{volverBtn.remove();pintar()}}

/* ---------- pintar ---------- */
let tP=null;
function pintar(){cancelAnimationFrame(tP);tP=requestAnimationFrame(()=>{if(host.hidden)return;
  if(tab==="inicio"){if(!comp.ta)armarInicio();else{if(root.activeElement!==comp.ta&&!(comp.autor&&root.activeElement===comp.autor))pintarComp();pintarRecientes()}}
  else if(tab==="ideas"){if(!ideasUI.lista)armarIdeas();else pintarListaIdeas()}
  else if(tab==="diario"){if(!diaUI.tr)armarDiario();else pintarDiarioC()}
  else if(tab==="listas"){if(!listUI.c)armarListas();else pintarListasC()}
  for(const c of capas)if(c._pintar)try{c._pintar()}catch(e){console.error(e)}
  pintarSync();colorArriba()})}
function pintarSync(){if(!comp.sync)return;const pendiente=[...ideas(),...frases(),...dias()].some(x=>x._pend);const off=navigator.onLine===false;
  comp.sync.className="sync"+(off?" off":pendiente?" pend":"");comp.sync.lastChild.textContent=off?"Sin conexión: queda guardado acá y se sube solo":pendiente?"Guardando…":listo?"Todo guardado":"Conectando…"}
addEventListener("online",pintarSync);addEventListener("offline",pintarSync);setInterval(pintarSync,2000);

/* ---------- arranque ---------- */
modoWeb(LSg("celu_web")==="1");irTab(TABS.some(t=>t[0]===tab)?tab:"inicio");
/* en la app la guía de la compu no sale sola (es para la plancha) */
try{const ay=window.abrirAyuda,t0=Date.now();window.abrirAyuda=function(){if(!host.hidden&&Date.now()-t0<20000)return;return ay.apply(this,arguments)}}catch(_){}
(async()=>{try{D=await window.claude.use("db")}catch(_){D=null}if(!D)return;
  const ping=()=>setTimeout(()=>{listo=true;pintar()},0);
  for(const c of ["ideas","frases","diario","tareas"])D.collection(c).onSnapshot(ping,()=>{});
  D.doc("config/categorias").onSnapshot(ping,()=>{});D.doc("config/perfil").onSnapshot(sn=>{perfil=(sn.exists&&sn.data())||{};pintarAvatares()},()=>{});D.doc("config/etiquetas").onSnapshot(ping,()=>{});})();
})();
