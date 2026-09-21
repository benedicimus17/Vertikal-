/* ВЕРТИКАЛЬ — інтерфейс.
   Горизонтальна оболонка: верхня смуга, ліве меню, сцена з восьми розділів.
   Симуляція живе в engine.js, тут тільки екрани, навігація і стан. */

const V = window.VERT;
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Math.round(n).toLocaleString("uk-UA").replace(/,/g, " ");
const SAVE_KEY = "vert2";

/* =======================================================================
   ЕМБЛЕМИ І ФОРМИ (малюються кодом, у кожного клуба свої)
   ======================================================================= */
const CREST_SHAPES = [
  "M26 2 4 9v24c0 13 10 21 22 25 12-4 22-12 22-25V9L26 2z",
  "M26 2 5 8v22c0 14 9 23 21 28 12-5 21-14 21-28V8L26 2z",
  "M6 4h40v28c0 12-8 20-20 26C14 52 6 44 6 32V4z",
];
const CREST_PAL = [
  ["#1B2740","#D9A93C"], ["#2A1220","#E0703C"], ["#10241C","#4ADE80"],
  ["#241A2E","#B08BE8"], ["#0F1F2E","#5AA9E0"], ["#2B1A12","#E0B44A"],
  ["#1A1A1F","#E8E8EC"], ["#22120F","#E05A4A"],
];
const CREST_SYM = [
  '<circle cx="26" cy="28" r="8.5" fill="none" stroke="{a}" stroke-width="1.8"/><path d="M26 19.5v17M17.5 28h17" stroke="{a}" stroke-width="1.8"/>',
  '<path d="M26 17l3.2 6.8 7.4.9-5.5 5 1.5 7.3L26 33.4 19.4 37l1.5-7.3-5.5-5 7.4-.9L26 17z" fill="{a}"/>',
  '<circle cx="26" cy="28" r="8" fill="{a}"/><path d="M26 21.5l2.6 2-1 3.2h-3.2l-1-3.2 2.6-2z" fill="{m}"/>',
  '<path d="M20 38V22l6-5 6 5v16z" fill="{a}"/><path d="M23.5 38v-6h5v6" fill="{m}"/>',
  '<path d="M16 24l10 5 10-5M16 31l10 5 10-5" fill="none" stroke="{a}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
];
function crestSVG(id){
  const shape = CREST_SHAPES[id % CREST_SHAPES.length];
  const [m, a] = CREST_PAL[id % CREST_PAL.length];
  const sym = CREST_SYM[Math.floor(id / 3) % CREST_SYM.length].replaceAll("{a}", a).replaceAll("{m}", m);
  return `<path d="${shape}" fill="${m}" stroke="${a}" stroke-width="1.7"/>
          <path d="${shape}" fill="rgba(255,255,255,.06)"/>${sym}`;
}
const KIT_PAL = [
  ["#D9A93C","#141A24"], ["#E05A4A","#1A1214"], ["#4AA3E0","#0F1722"], ["#4ADE80","#0E1A14"],
  ["#E8E8EC","#1A1A1F"], ["#B08BE8","#151020"], ["#E0703C","#1C1410"], ["#2E5FE0","#0D1220"],
];
function kitSVG(id){
  const [c1, c2] = KIT_PAL[id % KIT_PAL.length];
  const type = Math.floor(id / 2) % 4;
  const body = "M14 6 8 9l-3 8 5 2 1-3v20h18V16l1 3 5-2-3-8-6-3-5 3-5-3z";
  let pat = "";
  if (type === 0) pat = `<path d="M17 8h3v28h-3zM23 8h3v28h-3z" fill="${c2}" opacity=".92"/>`;
  if (type === 1) pat = `<path d="M11 14h20v4H11zM11 22h20v4H11zM11 30h20v4H11z" fill="${c2}" opacity=".85"/>`;
  if (type === 2) pat = `<path d="M21.5 8h10v28h-10z" fill="${c2}" opacity=".9"/>`;
  if (type === 3) pat = `<path d="M11 34L31 9v6L15 36z" fill="${c2}" opacity=".9"/>`;
  return `<path d="${body}" fill="${c1}" stroke="#0A0E14" stroke-width="1.1" stroke-linejoin="round"/>
          <clipPath id="k${id}"><path d="${body}"/></clipPath>
          <g clip-path="url(#k${id})">${pat}</g>
          <path d="M14 6l5 3 5-3" fill="none" stroke="#0A0E14" stroke-width="1.4"/>`;
}
const CREST_COUNT = 20, KIT_COUNT = 8;

/* =======================================================================
   СТАН
   ======================================================================= */
const S = {
  club: { name: "", crest: 0, kit: 0 },
  division: 12, season: 1, round: 1,
  money: 1250000, gold: 250, focus: 0,
  table: {}, results: [], feed: [],
  buildings: { stadium: 3, training: 2, academy: 1, scouts: 1, medical: 1, commercial: 1 },
  queue: [],
  owned: { crests: [], kits: [] },
  academy: { candidates: [] },   // { p: Гравець, yearsLeft: 0..2 } — за майстер-промптом сидять 2 роки
};
let ME = null, LEAGUE = [];

const BUILDINGS = [
  { id: "stadium",    name: "Стадіон",             desc: "Місткість, дохід з матчів, стеля підпису гравців." },
  { id: "training",   name: "Тренувальна база",    desc: "Темп росту характеристик усієї команди." },
  { id: "academy",    name: "Академія",            desc: "Стеля випускників і кількість слотів молоді." },
  { id: "scouts",     name: "Скаутський центр",    desc: "Якість знахідок і глибина розвідки суперника." },
  { id: "medical",    name: "Медцентр",            desc: "Швидкість відновлення і сховище аптечок." },
  { id: "commercial", name: "Комерційний відділ",  desc: "Спонсори, дохід і стеля підпису." },
];
const BICON = {
  stadium:   '<path d="M3 15c2.5-5 5.6-7.5 9-7.5s6.5 2.5 9 7.5"/><path d="M3 15h18v4H3z"/>',
  training:  '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5v5.5l3.5 2"/>',
  academy:   '<path d="M12 4l9 4-9 4-9-4 9-4z"/><path d="M7 11v4.5c0 2 2.5 3.5 5 3.5s5-1.5 5-3.5V11"/>',
  scouts:    '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.6-4.6"/>',
  medical:   '<rect x="4" y="6" width="16" height="13" rx="2"/><path d="M12 9.5v6M9 12.5h6"/>',
  commercial:'<path d="M4 19V9l5-4 5 4v10"/><path d="M14 19v-6l5-2v8"/><path d="M3 19h18"/>',
};

/* =======================================================================
   СВІТ
   ======================================================================= */
function levelFor(d){ return (V.CEIL[d] || 20) * 0.92 }
function buildWorld(){
  V.reseed(20260911 + S.club.crest * 7 + S.club.name.length);
  const base = levelFor(S.division);
  const mine = (S.club.name || "Вертикаль").trim();
  /* суперник із таким самим іменем зіпсував би таблицю: вона ведеться за назвами,
     два однойменні клуби злилися б в один рядок, а календар вказував би не на ту команду */
  const rivals = V.CLUBS.filter(n => n.toLowerCase() !== mine.toLowerCase()).slice(0, 15);
  while (rivals.length < 15) rivals.push("Клуб " + (rivals.length + 1));
  ME = new V.Team(mine, base * 0.95, true);
  LEAGUE = [ME, ...rivals.map(n => new V.Team(n, base * V.rf(0.82, 1.1)))];
  LEAGUE.forEach((t, i) => { t.crest = i === 0 ? S.club.crest : (i * 5 + 3) % CREST_COUNT });
  LEAGUE.forEach(t => { if (!S.table[t.name]) S.table[t.name] = { p:0, w:0, d:0, l:0, gf:0, ga:0 } });
  Object.keys(S.table).forEach(n => { if (!LEAGUE.some(t => t.name === n)) delete S.table[n] });
  S.fixtures = V.makeFixtures(LEAGUE.map(t => t.name));
}
const teamBy = n => LEAGUE.find(t => t.name === n);
function myFixture(){
  const rd = S.fixtures[(S.round - 1) % S.fixtures.length];
  const f = rd.find(([a, b]) => a === ME.name || b === ME.name);
  return { home: teamBy(f[0]), away: teamBy(f[1]), isHome: f[0] === ME.name };
}
function sortedTable(){
  return Object.entries(S.table).map(([n, v]) => ({ n, ...v, gd: v.gf - v.ga }))
    .sort((a, b) => b.p - a.p || b.gd - a.gd || b.gf - a.gf || a.n.localeCompare(b.n));
}
const tablePos = name => sortedTable().findIndex(r => r.n === name) + 1;
const ord = n => n + " місце";

/* дата матчу: сезон = 35 днів, тур на день */
function matchDate(){
  const d = new Date(2026, 8, 14);
  d.setDate(d.getDate() + (S.season - 1) * 35 + (S.round - 1));
  return d.toLocaleDateString("uk-UA", { weekday: "short", day: "numeric", month: "long" });
}

/* =======================================================================
   НАВІГАЦІЯ
   ======================================================================= */
const NAV = [
  { id: "home",   t: "Головна",         s: "Клуб і найближчий матч",  i: '<path d="M4 11l8-6 8 6"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>' },
  { id: "match",  t: "Матч",            s: "Зіграти тур",             i: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5l3.2 2.3-1.2 3.8h-4L8.8 8.8 12 6.5zM12 17.5v-4.9M6.6 10.3l3.3 2.3M17.4 10.3l-3.3 2.3"/>' },
  { id: "team",   t: "Команда",         s: "Склад і тренування",      i: '<path d="M9 4h6l4 2-2 4h-2v10H9V10H7L5 6l4-2z"/>' },
  { id: "academy", t: "Академія",       s: "Вихованці і скаути",      i: BICON.academy },
  { id: "market", t: "Ринок",           s: "Трансфери",               i: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>' },
  { id: "infra",  t: "Інфраструктура",  s: "Стадіон і будівлі",       i: BICON.commercial },
  { id: "league", t: "Ліга",            s: "Таблиця і кубок",         i: '<path d="M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M10 19h4M12 14v5"/>' },
  { id: "shop",   t: "Магазин",         s: "Емблеми і форми",         i: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>' },
  { id: "settings", t: "Налаштування",  s: "Гра і збереження",        i: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>' },
];
let page = "home";
function buildRail(){
  $("#rail").innerHTML = NAV.map(n =>
    `<button data-p="${n.id}" class="${n.id === page ? "on" : ""}">
       <svg viewBox="0 0 24 24">${n.i}</svg><span><b>${n.t}</b><i>${n.s}</i></span>
     </button>`).join("") + '<span class="grow"></span><span class="ver">Прототип · 0.2</span>';
  $$("#rail button").forEach(b => b.onclick = () => show(b.dataset.p));
}
function show(p){
  page = p;
  $$(".sc").forEach(e => e.classList.toggle("on", e.id === "sc-" + p));
  $$("#rail button").forEach(b => b.classList.toggle("on", b.dataset.p === p));
  document.body.classList.toggle("data", p !== "home");
  const st = $("#stage"); if (st) st.scrollTop = 0;
  if (p === "home")   renderHome();
  if (p === "team")   renderTeam();
  if (p === "league") renderLeague();
  if (p === "infra")  renderInfra();
  if (p === "academy") renderAcademyPage();
  if (p === "market") renderMarket();
  if (p === "shop")   renderShop();
  if (p === "settings") renderSettings();
  if (p === "match"){ if (!M.hm) openMatch(); else ensurePitchLoop() }
}
/* свайпи між розділами.
   Напрям жесту фіксується один раз, одразу як рух стає помітним (перші ~12 px),
   і більше не переглядається до кінця дотику. Без цього довгий вертикальний
   скрол списку гравців (де рука природно трохи гуляє вбік) міг у кінці
   набрати достатньо dx, щоб хибно зчитатись як свайп і перекинути на інший
   розділ — саме так і траплялось у складі команди. */
let tx = 0, ty = 0, tracking = false, swipeAxis = null;

/* Коли телефон заблокований у портреті, ми розвертаємо гру самі через CSS
   (див. index.html). Але система про цей поворот не знає: координати дотику
   приходять у СПРАВЖНІХ координатах екрана, неповернутих. Тому рух пальця,
   який для ока горизонтальний, у цих координатах вертикальний — і навпаки.
   Без цього перерахунку жоден горизонтальний свайп не спрацьовував би. */
const isRotatedHack = () => matchMedia("(orientation:portrait)").matches && innerWidth <= 820;
function toVisual(dxRaw, dyRaw){
  return isRotatedHack() ? { dx: dyRaw, dy: -dxRaw } : { dx: dxRaw, dy: dyRaw };
}

document.addEventListener("touchstart", e => {
  if (e.touches.length !== 1) return;
  tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  tracking = true; swipeAxis = null;
}, { passive: true });
document.addEventListener("touchmove", e => {
  if (!tracking || swipeAxis || e.touches.length !== 1) return;
  const { dx, dy } = toVisual(e.touches[0].clientX - tx, e.touches[0].clientY - ty);
  if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;   // ще не зрозуміло, куди веде рука
  swipeAxis = Math.abs(dx) > Math.abs(dy) * 1.6 ? "h" : "v";
}, { passive: true });
document.addEventListener("touchend", e => {
  if (!tracking) return; tracking = false;
  if (swipeAxis !== "h") return;             // жест розпізнано як скрол — свайп-навігацію не чіпаємо
  const { dx } = toVisual(e.changedTouches[0].clientX - tx, e.changedTouches[0].clientY - ty);
  if (Math.abs(dx) < 70) return;
  if (M.live) return;                        // під час матчу свайпи не крадуть керування
  const i = NAV.findIndex(n => n.id === page);
  const j = dx < 0 ? Math.min(NAV.length - 1, i + 1) : Math.max(0, i - 1);
  if (i !== j) show(NAV[j].id);
}, { passive: true });

/* =======================================================================
   ВЕРХНЯ СМУГА
   ======================================================================= */
function renderTop(){
  $("#topCrest").innerHTML = crestSVG(S.club.crest);
  $("#topName").textContent = S.club.name;
  $("#topSub").textContent = `Дивізіон ${S.division} · Сезон ${S.season} · Тур ${S.round}`;
  $("#resMoney").textContent = fmt(S.money);
  $("#resGold").textContent = S.gold;
  const unread = S.feed.filter(f => !f.seen).length;
  $("#mailDot").hidden = unread === 0;
  $("#mailDot").textContent = unread;
}

/* =======================================================================
   ГОЛОВНА
   ======================================================================= */
const NEWS_ICON = {
  cap:  '<path d="M4 8l8-4 8 4-8 4-8-4z"/><path d="M7 10v4c0 2 2.5 3 5 3s5-1 5-3v-4"/>',
  goal: '<circle cx="12" cy="12" r="8"/><path d="M12 7l3 2-1 3.5h-4L9 9l3-2z"/>',
  up:   '<path d="M12 19V5M6 11l6-6 6 6"/>',
  build:'<path d="M4 20V9l6-4 6 4v11"/><path d="M8 20v-4h4v4M20 20V13l-4-2"/>',
  eye:  '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
};
function renderHome(){
  const f = myFixture(), opp = f.isHome ? f.away : f.home;
  $("#homeTag").textContent = `Дивізіон ${S.division} · Сезон ${S.season} · Тур ${S.round}`;
  $("#homeTitle").textContent = S.club.name;
  $("#homeLine").textContent = `${ord(tablePos(ME.name))} у таблиці. Наступний суперник — ${opp.name}, ${f.isHome ? "удома" : "у гостях"}. Склад оцінюється в ${Math.round(ME.rate())} за силою в ролі.`;
  $("#nmRound").textContent = `Тур ${S.round}`;
  $("#nmCrestH").innerHTML = crestSVG(f.home.crest ?? 0);
  $("#nmCrestA").innerHTML = crestSVG(f.away.crest ?? 0);
  $("#nmHome").textContent = f.home.name;  $("#nmHomePos").textContent = ord(tablePos(f.home.name));
  $("#nmAway").textContent = f.away.name;  $("#nmAwayPos").textContent = ord(tablePos(f.away.name));
  $("#nmDate").textContent = matchDate();
  $("#nmTime").textContent = "19:30";
  $("#nmVenue").textContent = f.isHome ? `Стадіон «${S.club.name}» · рівень ${S.buildings.stadium}` : `Виїзд · ${opp.name}`;
  $("#newsList").innerHTML = S.feed.slice(0, 6).map(n =>
    `<div class="row"><div class="thumb"><svg viewBox="0 0 24 24">${NEWS_ICON[n.i] || NEWS_ICON.cap}</svg></div>
     <div><b>${n.b}</b><i>${n.t}</i></div></div>`).join("")
    || `<div class="row"><div><b>Новин поки немає</b><i>з'являться після першого туру</i></div></div>`;
  S.feed.forEach(n => n.seen = true);
  renderTop();
}
$("#homePlay").onclick  = () => show("match");
$("#homeSquad").onclick = () => show("team");
$("#btnMail").onclick   = () => show("home");
$("#btnProfile").onclick = () => show("settings");

/* =======================================================================
   КОМАНДА
   ======================================================================= */
let picked = null;
function stars(p){ return `<span class="st"><span class="on" style="width:${p.starPct()}%">★★★★★</span>★★★★★</span>` }
function prow(p, slot, isSub){
  const fr = Math.round(p.fresh * 100);
  const label = isSub ? p.pos() : V.SLOT_POS[slot];
  const off = !isSub && p.role !== (V.SPECS.find(s => s[0] === slot) || [])[1] && slot !== "GK";
  return `<div class="p ${picked === slot ? "pick" : ""}" data-slot="${slot}">
    <div class="pos ${isSub ? "sub" : ""}">${label}</div>
    <div class="pn"><b>${p.name}</b><i>${p.age} р · ${V.ROLE_UA[p.role]}${off ? " · не своя позиція" : ""} · ${stars(p)}</i></div>
    <div class="pv"><b>${Math.round(p.power())}</b><div class="frbar"><i style="width:${fr}%"></i></div></div></div>`;
}
/* Розташування на полі: атака вправо, ворота зліва; координати в % ширини/висоти. */
const PITCH_XY = { GK:[7,50], RB:[24,84], CB1:[22,62], CB2:[22,38], LB:[24,16],
                   DM:[40,50], CM:[56,30], AM:[56,70], RW:[82,82], ST:[88,50], LW:[82,18] };
const PITCH_LINES = `<svg class="ln" viewBox="0 0 105 68" preserveAspectRatio="none">
  <rect x="1.5" y="1.5" width="102" height="65"/><line x1="52.5" y1="1.5" x2="52.5" y2="66.5"/>
  <circle cx="52.5" cy="34" r="8"/><rect x="1.5" y="18" width="14" height="32"/>
  <rect x="89.5" y="18" width="14" height="32"/><rect x="1.5" y="26" width="5" height="16"/>
  <rect x="98.5" y="26" width="5" height="16"/></svg>`;
function pitchToken(p, slot){
  const off = slot !== "GK" && p.role !== (V.SPECS.find(s => s[0] === slot) || [])[1];
  const sur = p.name.split(" ").slice(-1)[0];
  const [x, y] = PITCH_XY[slot];
  return `<button class="tk ${picked === slot ? "pick" : ""} ${off ? "off" : ""}" data-slot="${slot}"
      style="left:${x}%;top:${y}%" title="${p.name}">
    <span class="c">${p.face ? `<img src="${p.face}" alt="">` : V.SLOT_POS[slot]}<b>${Math.round(p.power())}</b></span>
    <i>${sur}</i></button>`;
}
/* Демо-обличчя: поки воно одне, його отримує один гравець і живе з ним, а не зі слотом. */
function ensureDemoFace(){
  const all = [ME.gk, ...Object.values(ME.xi), ...ME.bench];
  if (!all.some(p => p.face)) ME.xi.ST.face = "img/faces/f01.jpg";
}
function renderTeam(){
  ensureDemoFace();
  $("#teamSub").textContent = picked
    ? `Оберіть, з ким поміняти місцями ${getP(picked).name}. Тап по ньому самому — скасувати.`
    : `Оцінка складу ${Math.round(ME.rate())} · хімія +${(ME.chem() * 100).toFixed(1)} % · зарплатня ${fmt(ME.wageBill())} за сезон`;
  $("#teamPitch").innerHTML = `${PITCH_LINES}<div class="fm">4-3-3</div>` +
    V.SLOTS.map(s => pitchToken(s === "GK" ? ME.gk : ME.xi[s], s)).join("");
  $("#subs").innerHTML = ME.bench.map((p, i) => prow(p, "B" + i, true)).join("");
  /* Один тап = відкрити гравця. Обмін вмикається кнопкою в картці, а тоді наступний
     тап по полю чи лавці обирає, з ким поміняти. */
  $$("#teamPitch .tk,#subs .p").forEach(el => {
    el.onclick = () => {
      const s = el.dataset.slot;
      if (picked === null) { openPlayer(s); return }
      if (picked === s) { picked = null; renderTeam(); return }
      swap(picked, s); picked = null; renderTeam(); save();
    };
  });
  $("#trainTabs").innerHTML = V.ATTR_SHORT.map((n, i) =>
    `<button class="${i === S.focus ? "on" : ""}" data-f="${i}">${n}</button>`).join("");
  $$("#trainTabs button").forEach(b => b.onclick = () => { S.focus = +b.dataset.f; renderTeam(); save() });
  $("#trainNote").textContent = `Фокус на «${V.ATTR[S.focus]}» піднімає цю характеристику швидше, решта ростуть повільніше. Молодь росте в рази швидше за ветеранів, а біля стелі потенціалу ріст майже зупиняється.`;
}
const getP = s => s === "GK" ? ME.gk : s[0] === "B" ? ME.bench[+s.slice(1)] : ME.xi[s];
function setP(s, p){ if (s === "GK") ME.gk = p; else if (s[0] === "B") ME.bench[+s.slice(1)] = p; else ME.xi[s] = p }
function swap(a, b){
  const pa = getP(a), pb = getP(b);
  if ((a === "GK") !== (b === "GK") && (pa.gk || pb.gk) && !(pa.gk && pb.gk)) return;
  setP(a, pb); setP(b, pa);
}
/* Обличчя поки одне, намальоване для проби: воно належить нападнику (слот ST).
   Решта гравців показують силует, щоб картка виглядала однаково в обох випадках. */
const FACES = {};
const SILHOUETTE = `<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4.2"/>
  <path d="M4 21c0-4.4 3.6-6.8 8-6.8s8 2.4 8 6.8"/></svg>`;
/* Радар: вісім характеристик по колу. Саме він показує, чому той самий гравець
   сильний у своїй ролі й слабкий у чужій — на смужках цього не видно. */
function radarSVG(p){
  const N = 8, R = 62, cx = 93, cy = 90;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / N;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = r => Array.from({ length: N }, (_, i) => pt(i, r).map(v => v.toFixed(1)).join(",")).join(" ");
  const web = [0.34, 0.67, 1].map(k => `<polygon class="web" points="${poly(R * k)}"/>`).join("");
  const axes = Array.from({ length: N }, (_, i) => {
    const [x, y] = pt(i, R);
    return `<line class="axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }).join("");
  /* Шкала радара — не 100, а стеля дивізіону вище. Інакше в Д12, де характеристики
     близько 30, фігура перетворюється на крапку і форму гравця не видно. */
  const scale = V.CEIL[Math.max(1, S.division - 1)] || 99;
  const vals = Array.from({ length: N }, (_, i) =>
    pt(i, R * Math.min(1, Math.max(0.06, p.attrs[i] / scale))).map(v => v.toFixed(1)).join(",")).join(" ");
  const labels = V.ATTR_SHORT.map((n, i) => {
    const [x, y] = pt(i, R + 15);
    const anchor = x > cx + 3 ? "start" : x < cx - 3 ? "end" : "middle";
    return `<text class="lb" x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${anchor}">${n}</text>`;
  }).join("");
  return `<svg class="radar" viewBox="-18 -2 222 190">${web}${axes}
    <polygon class="val" points="${vals}"/>${labels}</svg>`;
}
function openPlayer(slot){
  const p = getP(slot);
  const face = p.face;
  const capNow = Math.round(p.pot * V.AGE_CAP(p.age));
  $("#sheet").innerHTML = `<div class="pc">
      <div class="face">${face ? `<img src="${face}" alt="">` : SILHOUETTE}</div>
      <div class="info">
        <h2>${p.name}</h2>
        <div class="s">${p.pos()} · ${p.age} років · ${V.ROLE_UA[p.role]}</div>
        <div>${stars(p)}</div>
        <div class="pw"><b>${Math.round(p.power())}</b><i>сила в ролі</i></div>
      </div>
      ${radarSVG(p)}
    </div>
    <div class="sec">Характеристики</div>
    <div class="attrs">${V.ATTR.map((n, i) => `<div class="at"><span>${n}</span>
      <div class="b"><i style="width:${p.attrs[i]}%"></i></div><u>${Math.round(p.attrs[i])}</u></div>`).join("")}</div>
    <div class="note"><h3>${V.ROLE_UA[p.role]}</h3><p>У своїй ролі — <b style="color:var(--gold)">${Math.round(p.power())}</b>.
      Стеля за потенціалом ${Math.round(p.pot)}, вікова межа сьогодні ${capNow}.
      Зарплата ${fmt(V.wageOf(p))} за сезон, оціночна вартість ${fmt(V.valueOf(p))}.</p></div>
    <div class="strip">${V.SLOTS.map(s => {
      const q = getP(s), f = q.face;
      return `<button data-s="${s}" class="${s === slot ? "on" : ""}" title="${q.name}">
        ${f ? `<img src="${f}" alt="">` : SILHOUETTE}<u>${V.SLOT_POS[s]}</u></button>`;
    }).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="btn ghost sm" id="swapBtn">Поміняти місцями</button>
      <button class="btn ghost sm" onclick="closeSheet()">Закрити</button>
    </div>`;
  $$("#sheet .strip button").forEach(b => b.onclick = () => openPlayer(b.dataset.s));
  $("#swapBtn").onclick = () => { picked = slot; closeSheet(); renderTeam() };
  $("#modal").classList.add("on");
}
function closeSheet(){ $("#modal").classList.remove("on") }
window.closeSheet = closeSheet;
$("#modal").onclick = e => { if (e.target.id === "modal") closeSheet() };

/* =======================================================================
   ЛІГА
   ======================================================================= */
let leagueView = "table";
$$("#leagueTabs button").forEach(b => b.onclick = () => {
  leagueView = b.dataset.v;
  $$("#leagueTabs button").forEach(x => x.classList.toggle("on", x === b));
  renderLeague();
});
function renderLeague(){
  $("#leagueSub").textContent = `Дивізіон ${S.division}, група A · тур ${S.round} з 30 · 2 підвищення, 3 вильоти`;
  const box = $("#leagueBody");
  if (leagueView === "table"){
    box.innerHTML = `<table><thead><tr><th class="l">#</th><th class="l">Клуб</th><th>І</th><th>В</th><th>Н</th><th>П</th><th>М</th><th>О</th></tr></thead><tbody>${
      sortedTable().map((r, i) => {
        const cls = [r.n === ME.name ? "me" : "", i < 2 ? "up" : i > 12 ? "down" : ""].filter(Boolean).join(" ");
        return `<tr class="${cls}"><td class="l">${i + 1}</td><td class="l">${r.n}</td>
          <td>${r.w + r.d + r.l}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
          <td>${r.gf}:${r.ga}</td><td style="color:var(--gold-hi)">${r.p}</td></tr>`;
      }).join("")}</tbody></table>`;
  } else if (leagueView === "results"){
    box.innerHTML = S.results.length
      ? `<div class="plist">${S.results.map(r => `<div class="p">
           <div class="pos ${r.me ? "" : "sub"}">${r.gh}:${r.ga}</div>
           <div class="pn"><b>${r.h} — ${r.a}</b><i>тур ${r.r}</i></div></div>`).join("")}</div>`
      : `<div class="note"><h3>Тур ще не зіграний</h3><p>Результати з'являться після першого матчу.</p></div>`;
  } else {
    box.innerHTML = `<div class="note"><h3>Наступний крок</h3><p>Кубок — шостий крок плану: 32 клуби, п'ять раундів, матчі по середах другим матчем дня. Сітку зробимо разом із золотом і фінансами.</p></div>`;
  }
}

/* =======================================================================
   ІНФРАСТРУКТУРА
   ======================================================================= */
const MIN_PER_HOUR = 60000;            // у прототипі година будівництва = хвилина
function canBuild(id){
  const lvl = S.buildings[id];
  if (S.queue.find(q => q.id === id)) return "вже будується";
  if (S.queue.length >= 2) return "обидві черги зайняті";
  if (id !== "stadium" && lvl + 1 > S.buildings.stadium) return "не вище за стадіон";
  if (S.money < V.buildCost(lvl + 1)) return "бракує грошей";
  return null;
}
function renderInfra(){
  const income = V.divisionIncome(S.division);
  $("#infraSub").textContent = `Бюджет ${fmt(S.money)} · типовий дохід дивізіону ${fmt(income)} за сезон · стеля зарплат ${fmt(V.wageCap(S.division, income))}`;
  $("#bgrid").innerHTML = BUILDINGS.map(b => {
    const lvl = S.buildings[b.id], cost = V.buildCost(lvl + 1), why = canBuild(b.id);
    return `<div class="bcard">
      <div class="h"><svg viewBox="0 0 24 24">${BICON[b.id]}</svg><b>${b.name}</b><span class="lv">${lvl}</span></div>
      <p>${b.desc}</p>
      <div class="bar"><i style="width:${Math.min(100, lvl / 20 * 100)}%"></i></div>
      <div class="foot">
        <span class="cost ${S.money < cost ? "no" : ""}">${fmt(cost)} · ${V.buildHours(lvl + 1)} год</span>
        <button class="btn sm" data-b="${b.id}" ${why ? "disabled" : ""}>${why || "Підняти"}</button>
      </div></div>`;
  }).join("");
  $$("#bgrid button[data-b]").forEach(btn => btn.onclick = () => startBuild(btn.dataset.b));
  renderQueue();
}
function renderQueue(){
  const box = $("#qlist"); if (!box) return;
  if (!S.queue.length){ box.innerHTML = `<div class="qrow"><b>Черга порожня</b><span class="time">—</span></div>`; return }
  box.innerHTML = S.queue.map(q => {
    const b = BUILDINGS.find(x => x.id === q.id);
    const left = Math.max(0, q.endAt - Date.now());
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor(left % 60000 / 1000)).padStart(2, "0");
    return `<div class="qrow"><b>${b.name}</b><span style="color:var(--dim)">рівень ${q.lvl}</span><span class="time">${mm}:${ss}</span></div>`;
  }).join("");
}
function startBuild(id){
  if (canBuild(id)) return;
  const lvl = S.buildings[id] + 1;
  S.money -= V.buildCost(lvl);
  S.queue.push({ id, lvl, endAt: Date.now() + V.buildHours(lvl) * MIN_PER_HOUR });
  addNews("build", `${BUILDINGS.find(b => b.id === id).name}: почалось будівництво рівня ${lvl}`);
  renderInfra(); renderTop(); save();
}
setInterval(() => {
  let done = false;
  S.queue = S.queue.filter(q => {
    if (Date.now() >= q.endAt){
      S.buildings[q.id] = q.lvl; done = true;
      addNews("build", `${BUILDINGS.find(b => b.id === q.id).name} піднято до рівня ${q.lvl}`);
      if (q.id === "academy") ensureAcademyStocked(false);   // новий слот — одразу видно кандидата
      return false;
    }
    return true;
  });
  if (done){ save(); renderTop(); if (page === "home") renderHome() }
  if (page === "infra"){ done ? renderInfra() : renderQueue() }
  if (done && page === "academy") renderAcademyPage();
}, 1000);

/* =======================================================================
   АКАДЕМІЯ
   3-5 слотів залежно від рівня академії (майстер-промпт: 3 на старті, 5 на
   розвинутій). Рівень академії обмежує стелю потенціалу вихованця, рівень
   скаутського центру — наскільки сильним він приходить уже зараз.
   Кандидати "сидять" 2 сезони; продати з академії не можна, лише
   підписати в основну команду (коли готовий) або відрахувати достроково —
   тоді слот звільняється одразу і чекає нового кандидата. */
const ACAD_ROLES = Object.keys(V.ROLES);
function academySlots(){
  const lvl = S.buildings.academy;
  return Math.max(3, Math.min(5, 3 + Math.floor((lvl - 1) / 5)));
}
function academyCeiling(){
  return 28 + S.buildings.academy * 3.4;
}
function genCandidate(freshIntake){
  const isGK = V.R() < 1 / 7;
  const role = isGK ? "gk" : V.pick(ACAD_ROLES);
  const baseLevel = Math.max(4, 6 + S.buildings.scouts * 0.9 + V.rf(-1.5, 1.5));   // сира сила у 16 років
  const p = new V.P(V.uname(), role, baseLevel, isGK, 16, 0.30);
  /* Не годиться формула P для дорослих підписань (power×1,08-1,55) — для
     16-річного вона майже не лишає простору рости і стеля виходить
     смішною (10-13). У скаутингу головна інтрига саме в розкиді потенціалу:
     широкий множник, обрізаний стелею академії (майстер-промпт: рівень
     академії обмежує стелю випускників). */
  p.pot = Math.min(academyCeiling(), baseLevel * V.rf(2.0, 4.2));
  /* новоприбулим у щойно збудований слот даємо розкид 0-2 роки — ніби
     академія вже щось готувала до тебе. Поповнення після сезону завжди
     стартує з повних 2 років (майстер-промпт: кандидати сидять 2 роки). */
  return { p, yearsLeft: freshIntake ? 2 : V.ri(0, 2) };
}
function ensureAcademyStocked(freshIntake){
  const slots = academySlots();
  while (S.academy.candidates.length < slots) S.academy.candidates.push(genCandidate(freshIntake));
}
function stockAcademyAtFounding(){
  S.academy.candidates = [];
  const slots = academySlots();
  for (let i = 0; i < slots; i++) S.academy.candidates.push(genCandidate(false));
  if (slots > 0) S.academy.candidates[0].yearsLeft = 0;   // хоч один готовий одразу — є кого підписати в перший сезон
}
function ageAcademyOneSeason(){
  S.academy.candidates.forEach(c => { c.yearsLeft = Math.max(0, c.yearsLeft - 1) });
  ensureAcademyStocked(true);
}
function signCandidate(i){
  const c = S.academy.candidates[i];
  if (!c || c.yearsLeft > 0) return;
  ME.bench.push(c.p);
  S.academy.candidates.splice(i, 1);
  addNews("eye", `${c.p.name} з академії підписаний в основну команду.`);
  ensureAcademyStocked(false);
  renderAcademyPage(); if (page === "team") renderTeam(); save();
}
function releaseCandidate(i){
  const c = S.academy.candidates[i];
  if (!c) return;
  S.academy.candidates.splice(i, 1);
  addNews("cap", `${c.p.name} відрахований з академії. Слот вільний.`);
  ensureAcademyStocked(false);
  renderAcademyPage(); save();
}
function renderAcademy(){
  const box = $("#acadGrid"); if (!box) return;
  $("#acadSub").textContent = `${S.academy.candidates.length} / ${academySlots()} слотів · рівень академії обмежує стелю ${Math.round(academyCeiling())}`;
  if (!S.academy.candidates.length){
    box.innerHTML = `<div class="acad-empty">Вихованців поки немає.</div>`;
    return;
  }
  box.innerHTML = S.academy.candidates.map((c, i) => {
    const ready = c.yearsLeft <= 0;
    return `<div class="acad-card">
      <div class="h"><div class="pos">${c.p.pos()}</div><b>${c.p.name}</b></div>
      <p>16 років · ${V.ROLE_UA[c.p.role]} · сила ${Math.round(c.p.power())} · стеля ${Math.round(c.p.pot)} · ${stars(c.p)}</p>
      <div class="status ${ready ? "ready" : "wait"}">${ready ? "готовий підписати" : `ще ${c.yearsLeft} ${c.yearsLeft === 1 ? "сезон" : "сезони"} в академії`}</div>
      <div class="row">
        <button class="btn sm ${ready ? "" : "ghost"}" data-sign="${i}" ${ready ? "" : "disabled"}>Підписати</button>
        <button class="btn ghost sm" data-release="${i}">Відрахувати</button>
      </div>
    </div>`;
  }).join("");
  $$("#acadGrid [data-sign]").forEach(b => b.onclick = () => signCandidate(+b.dataset.sign));
  $$("#acadGrid [data-release]").forEach(b => b.onclick = () => releaseCandidate(+b.dataset.release));
}
function renderAcademyPage(){
  renderAcademy();
  const lvl = S.buildings.scouts;
  $("#scoutLvl").textContent = lvl;
  $("#scoutNote").textContent = `Скаутський центр підіймає, з якою силою приходять нові вихованці — зараз стартова сила близько ${Math.round(Math.max(4, 6 + lvl * 0.9))}. Щоб підняти рівень, іди в Інфраструктуру.`;
}

/* =======================================================================
   РИНОК
   Відкритий: показує гравців із запасу всіх суперників дивізіону — жодних
   намальованих чисел, ціна й зарплата рахуються тими самими формулами, що
   й твій бюджет. Ринок поки в межах свого дивізіону: піраміда над ним ще
   не змодельована, це чесно видно в підзаголовку. Стеля підпису — гейт:
   занадто сильного гравця (більш ніж на 12 % вище стелі) не купиш. */
let marketView = "buy";
const MF = { pos: "all", min: "", max: "", sort: "power", only: false };
function marketCeiling(){ return V.signingCeiling(S.division, S.buildings.stadium, S.buildings.commercial) }
function signGate(power){ return power <= marketCeiling() * 1.12 }
/* Гібридний гейт підпису: до стелі — згода, до +12 % — згода за більшу зарплату,
   вище — відмова. Саме це робить ланцюг «золото → будівлі → репутація → підписи». */
function gateOf(p){
  const c = marketCeiling(), pw = p.power();
  if (pw <= c) return { ok: true, prem: 1, bonus: 0, tag: "погодиться", cls: "ok" };
  if (pw <= c * 1.12) return { ok: true, prem: 1.35, bonus: 0, tag: "за більшу з.п.", cls: "warn" };
  if (pw <= c * 1.30) return { ok: true, offer: true, prem: 1.8, bonus: .30, tag: "переговори", cls: "offer" };
  return { ok: false, prem: 1, bonus: 0, tag: "відмовить", cls: "no" };
}
/* Що треба, щоб гравець погодився без надбавок: найменший рівень стадіону, при якому
   стеля підпису доросла до його сили. Так відмова вчить, що будувати. */
function needText(p){
  const pw = p.power();
  for (let s = S.buildings.stadium + 1; s <= 40; s++)
    if (V.signingCeiling(S.division, s, S.buildings.commercial) >= pw) return `стадіон ${s}`;
  return "вищий дивізіон";
}

/* Ринок бачить усю піраміду, а не лише свій дивізіон. Клуби чужих дивізіонів не
   змодельовані, тому їхні гравці генеруються під стелю свого рівня і живуть до
   кінця сезону; свій дивізіон дає справжніх гравців із запасу суперників. */
const OTHER_CLUBS = ["Ла Роса","Альтаміра","Ріо Секо","Монтанья","Пуерто","Камповерде",
  "Сан-Ремо","Вальдес","Естрелья","Ель Пасо","Норте","Костаблан","Медіна","Сьєрра","Аврора"];
let POOL = null, POOL_SEASON = -1;
function buildPool(){
  const out = [];
  for (let d = Math.max(1, S.division - 3); d <= Math.min(16, S.division + 2); d++){
    if (d === S.division) continue;
    const ceil = V.CEIL[d] || 20, n = d < S.division ? 7 : 4;
    for (let i = 0; i < n; i++){
      const gk = Math.random() < .12;
      const role = gk ? "gk" : V.SPECS[Math.floor(Math.random() * V.SPECS.length)][1];
      const lvl = ceil * (0.78 + Math.random() * 0.24);
      const p = new V.P(V.uname(), role, lvl, gk);
      out.push({ club: OTHER_CLUBS[Math.floor(Math.random() * OTHER_CLUBS.length)], div: d, p });
    }
  }
  return out;
}
function pool(){
  if (!POOL || POOL_SEASON !== S.season){ POOL = buildPool(); POOL_SEASON = S.season }
  return POOL;
}
function marketListings(){
  const out = [];
  LEAGUE.forEach(t => { if (t !== ME) t.bench.forEach(p => out.push({ club: t.name, div: S.division, team: t, p })) });
  pool().forEach(r => out.push(r));
  const min = +MF.min || 0, max = +MF.max || 999;
  const posOf = p => p.gk ? "GK" : (V.ROLE_POS[p.role] || "");
  const group = p => p.gk ? "gk" : ["ЦЗ","КЗ"].includes(posOf(p)) ? "def"
                : ["ОП","ЦП","АП"].includes(posOf(p)) ? "mid" : "att";
  const rows = out.filter(r => {
    const pw = r.p.power();
    if (pw < min || pw > max) return false;
    if (MF.pos !== "all" && group(r.p) !== MF.pos) return false;
    if (MF.only && !gateOf(r.p).ok) return false;
    return true;
  });
  const key = { power: r => -r.p.power(), price: r => V.valueOf(r.p), age: r => r.p.age };
  return rows.sort((a, b) => key[MF.sort](a) - key[MF.sort](b));
}
function renderMarket(){
  $("#marketSub").textContent = `Уся піраміда · стеля підпису ${Math.round(marketCeiling())} · бюджет ${fmt(S.money)}`;
  $("#mfilters").hidden = marketView !== "buy";
  const box = $("#marketBody");
  if (marketView === "buy"){
    const rows = marketListings();
    box.innerHTML = rows.length ? `<div class="plist">${rows.map(r => {
      const g = gateOf(r.p);
      const price = Math.round(V.valueOf(r.p)), comm = Math.round(price * V.transferCommission(price)), total = price + comm;
      const wage = Math.round(V.wageOf(r.p) * g.prem);
      const due = total + Math.round(price * g.bonus);
      const poor = g.ok && S.money < due;
      const btn = !g.ok ? `<button class="btn ghost sm" disabled>—</button>`
        : poor ? `<button class="btn sm" disabled>нема грошей</button>`
        : g.offer ? `<button class="btn sm" data-offer="1">Умови</button>`
        : `<button class="btn sm" data-buy="1">Купити</button>`;
      return `<div class="mrow">
        <div class="pos">${r.p.pos()}</div>
        <div class="pn"><b>${r.p.name}</b><i>${r.p.age} р · ${V.ROLE_UA[r.p.role]} · сила ${Math.round(r.p.power())}</i></div>
        <div class="club">${r.club}<u>Д${r.div}</u></div>
        <div class="gate ${g.cls}">${g.tag}${g.cls === "ok" ? "" : `<u>${needText(r.p)}</u>`}</div>
        <div class="price"><b>${fmt(due)}</b><i>з.п. ${fmt(wage)}/сезон</i></div>
        ${btn}
      </div>`;
    }).join("")}</div>` : `<div class="mempty">За цими фільтрами нікого немає. Спробуй розширити діапазон сили.</div>`;
    $$("#marketBody .mrow").forEach((row, i) => {
      const b = row.querySelector("[data-buy]"); if (b) b.onclick = () => buyPlayer(rows[i]);
      const o = row.querySelector("[data-offer]"); if (o) o.onclick = () => openOffer(rows[i]);
    });
  } else {
    const mine = ME.bench;
    box.innerHTML = mine.length ? `<div class="plist">${mine.map(p => {
      const price = Math.round(V.valueOf(p)), comm = Math.round(price * V.transferCommission(price)), net = price - comm;
      return `<div class="mrow">
        <div class="pos">${p.pos()}</div>
        <div class="pn"><b>${p.name}</b><i>${p.age} р · ${V.ROLE_UA[p.role]} · сила ${Math.round(p.power())}</i></div>
        <div class="price"><b>+${fmt(net)}</b><i>комісія ${fmt(comm)}</i></div>
        <button class="btn ghost sm" data-sell="1">Продати</button>
      </div>`;
    }).join("")}</div>` : `<div class="mempty">У запасі нікого немає — продавати нема кого. З основи не продати, спершу зроби заміну в «Команді».</div>`;
    $$("#marketBody .mrow").forEach((row, i) => { const b = row.querySelector("[data-sell]"); if (b) b.onclick = () => sellPlayer(mine[i]) });
  }
}
$$("#marketTabs button").forEach(b => b.onclick = () => {
  marketView = b.dataset.v;
  $$("#marketTabs button").forEach(x => x.classList.toggle("on", x === b));
  renderMarket();
});
$("#fPos").onchange  = e => { MF.pos = e.target.value; renderMarket() };
$("#fSort").onchange = e => { MF.sort = e.target.value; renderMarket() };
$("#fOnly").onchange = e => { MF.only = e.target.checked; renderMarket() };
$("#fMin").oninput   = e => { MF.min = e.target.value; renderMarket() };
$("#fMax").oninput   = e => { MF.max = e.target.value; renderMarket() };
function buyPlayer(row){
  if (!row) return;
  const g = gateOf(row.p);
  const price = Math.round(V.valueOf(row.p)), comm = Math.round(price * V.transferCommission(price));
  const total = price + comm + Math.round(price * g.bonus);   // bonus — премія за підпис на переговорах
  if (!g.ok){ toast("Гравець не піде в клуб нашого рівня"); return }
  if (S.money < total){ toast("Бракує грошей"); return }
  if (row.team){                                  // свій дивізіон — справжній клуб
    const idx = row.team.bench.indexOf(row.p);
    if (idx === -1){ renderMarket(); return }      // хтось встиг забрати першим
    row.team.bench.splice(idx, 1);
  } else {                                        // інший дивізіон — гравець із пулу
    const i = POOL.indexOf(row);
    if (i === -1){ renderMarket(); return }
    POOL.splice(i, 1);
  }
  if (g.prem > 1) row.p.wagePrem = g.prem;
  ME.bench.push(row.p);
  S.money -= total;
  addNews("cap", `Куплено ${row.p.name} (Д${row.div}) у ${row.club} за ${fmt(total)}`);
  renderMarket(); renderTop(); save();
}
/* Переговори: гравець вище стелі називає свої умови, ти приймаєш або відмовляєшся. */
function openOffer(row){
  const g = gateOf(row.p);
  const price = Math.round(V.valueOf(row.p)), comm = Math.round(price * V.transferCommission(price));
  const bonus = Math.round(price * g.bonus), total = price + comm + bonus;
  const wageNow = V.wageOf(row.p), wageAsk = Math.round(wageNow * g.prem);
  $("#sheet").innerHTML = `<h2>Переговори: ${row.p.name}</h2>
    <div class="s">${row.p.pos()} · ${row.p.age} років · сила ${Math.round(row.p.power())} · Д${row.div}</div>
    <div class="note"><h3>Він сильніший, ніж дозволяє твоя стеля підпису ${Math.round(marketCeiling())}</h3>
      <p>Піти в клуб нижчого рівня він погоджується лише на особливих умовах.</p></div>
    <div class="attrs" style="margin-top:14px;grid-template-columns:1fr">
      <div class="at"><span>Трансферна сума з комісією</span><u style="width:auto">${fmt(price + comm)}</u></div>
      <div class="at"><span>Премія за підпис (30 %)</span><u style="width:auto">${fmt(bonus)}</u></div>
      <div class="at"><span>Зарплата на сезон, а не ${fmt(wageNow)}</span><u style="width:auto">${fmt(wageAsk)}</u></div>
      <div class="at"><span><b style="color:var(--gold-hi)">Сьогодні платиш</b></span><u style="width:auto;color:var(--gold-hi)">${fmt(total)}</u></div>
    </div>
    <p style="font-size:11.5px;color:var(--dim);margin:0 0 4px">Без надбавок він погодився б при стелі, яку дає ${needText(row.p)}.</p>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn sm" id="offYes" ${S.money < total ? "disabled" : ""}>${S.money < total ? "Бракує грошей" : "Прийняти умови"}</button>
      <button class="btn ghost sm" onclick="closeSheet()">Відмовитись</button>
    </div>`;
  $("#offYes").onclick = () => { closeSheet(); buyPlayer(row) };
  $("#modal").classList.add("on");
}
function sellPlayer(p){
  const bi = ME.bench.indexOf(p);
  if (bi === -1) return;
  const price = Math.round(V.valueOf(p)), comm = Math.round(price * V.transferCommission(price)), net = price - comm;
  ME.bench.splice(bi, 1);
  S.money += net;
  addNews("cap", `Продано ${p.name} за ${fmt(net)}`);
  renderMarket(); if (page === "team") renderTeam(); renderTop(); save();
}

/* =======================================================================
   МАГАЗИН
   ======================================================================= */
const CREST_PRICE = 120, KIT_PRICE = 150;
let shopView = "buy";
$$("#shopTabs button").forEach(b => b.onclick = () => {
  shopView = b.dataset.v;
  $$("#shopTabs button").forEach(x => x.classList.toggle("on", x === b));
  renderShop();
});
function renderShop(){
  const box = $("#shopBody");
  if (shopView === "buy"){
    const crests = [...Array(CREST_COUNT).keys()].filter(i => !S.owned.crests.includes(i)).slice(0, 8);
    const kits   = [...Array(KIT_COUNT).keys()].filter(i => !S.owned.kits.includes(i));
    box.innerHTML = `
      <div class="lab">Емблеми · ${CREST_PRICE} золота</div>
      <div class="picks">${crests.map(i => `<button class="pickitem" data-buy="crest" data-i="${i}">
        <svg viewBox="0 0 52 60">${crestSVG(i)}</svg></button>`).join("")}</div>
      <div class="lab" style="margin-top:16px">Форми · ${KIT_PRICE} золота</div>
      <div class="picks">${kits.map(i => `<button class="pickitem" data-buy="kit" data-i="${i}">
        <svg viewBox="0 0 40 46">${kitSVG(i)}</svg></button>`).join("")}</div>
      <div class="note" style="margin-top:16px"><h3>За реальні гроші</h3>
        <p>Частина позицій у грі продаватиметься за євро через Google Play. У прототипі справжньої оплати немає — тільки золото, яке вже є на рахунку.</p></div>`;
    $$("#shopBody button[data-buy]").forEach(b => b.onclick = () => buyItem(b.dataset.buy, +b.dataset.i));
  } else {
    box.innerHTML = `
      <div class="lab">Мої емблеми · тап, щоб вдягнути</div>
      <div class="picks">${S.owned.crests.map(i => `<button class="pickitem ${i === S.club.crest ? "on" : ""}" data-wear="crest" data-i="${i}">
        <svg viewBox="0 0 52 60">${crestSVG(i)}</svg></button>`).join("")}</div>
      <div class="lab" style="margin-top:16px">Мої форми</div>
      <div class="picks">${S.owned.kits.map(i => `<button class="pickitem ${i === S.club.kit ? "on" : ""}" data-wear="kit" data-i="${i}">
        <svg viewBox="0 0 40 46">${kitSVG(i)}</svg></button>`).join("")}</div>`;
    $$("#shopBody button[data-wear]").forEach(b => b.onclick = () => {
      if (b.dataset.wear === "crest"){ S.club.crest = +b.dataset.i; ME.crest = S.club.crest }
      else S.club.kit = +b.dataset.i;
      renderShop(); renderTop(); save();
    });
  }
}
function buyItem(kind, i){
  const price = kind === "crest" ? CREST_PRICE : KIT_PRICE;
  if (S.gold < price){ toast("Бракує золота"); return }
  S.gold -= price;
  (kind === "crest" ? S.owned.crests : S.owned.kits).push(i);
  addNews("cap", kind === "crest" ? "Клуб придбав нову емблему" : "Клуб придбав нову форму");
  renderShop(); renderTop(); save();
}
function toast(txt){
  $("#sheet").innerHTML = `<h2>${txt}</h2><div class="s">магазин</div>
    <button class="btn ghost sm" onclick="closeSheet()">Закрити</button>`;
  $("#modal").classList.add("on");
}

/* =======================================================================
   НАЛАШТУВАННЯ
   ======================================================================= */
function renderSettings(){
  $("#saveInfo").textContent = `Сезон ${S.season}, тур ${S.round}. Прогрес зберігається в пам'яті телефону після кожного матчу, зміни складу й будівництва.`;
  $("#btnReset").onclick = () => {
    $("#sheet").innerHTML = `<h2>Почати заново?</h2><div class="s">це не можна скасувати</div>
      <p style="font-size:13px;color:var(--muted);margin:0 0 16px">Клуб, склад, гроші, будівлі й таблиця зникнуть. Ти повернешся до створення клуба.</p>
      <button class="btn" id="doReset">Так, почати заново</button>
      <button class="btn ghost sm" style="margin-left:8px" onclick="closeSheet()">Скасувати</button>`;
    $("#modal").classList.add("on");
    $("#doReset").onclick = () => { localStorage.removeItem(SAVE_KEY); location.reload() };
  };
}

/* =======================================================================
   МАТЧ
   ======================================================================= */
const M = { live:false, min:0, ep:0, N:70, ph:.5, timer:null, half:1, speed:1, over:false, hm:null, aw:null };
const PRESS = [["Низ",.85],["Сер",1],["Вис",1.18]];
const LINE  = [["Низ",.8],["Сер",1],["Вис",1.2]];

function openMatch(){
  const f = myFixture();
  M.hm = f.home; M.aw = f.away; M.hm.home = true; M.aw.home = false;
  M.hm.reset(); M.aw.reset();
  M.live = false; M.min = 0; M.ep = 0; M.half = 1; M.over = false; M.N = V.ri(64, 76);
  const [a] = M.hm.zMid(), [b] = M.aw.zMid(); M.ph = a / (a + b);
  $("#mh").textContent = M.hm.name; $("#ma").textContent = M.aw.name;
  $("#mgh").textContent = 0; $("#mga").textContent = 0;
  $("#mclock").className = "clock paused"; $("#mclock").textContent = "до стартового свистка";
  $("#comm").innerHTML = "";
  $("#startBtn").textContent = "Стартовий свисток"; $("#startBtn").style.display = "";
  ME.press = 1; ME.line = 1; ME.presence = 0; ME.actions = 0;
  initDots(); BALL.x = BALL.tx = .5; BALL.y = BALL.ty = .5;
  renderCtrl(); renderBench(); updBonus(); drawPitch(); renderSpeed();
  ensurePitchLoop();
}
function renderSpeed(){
  $("#spd").innerHTML = [["×1 · 5 хв",1],["×2",2],["×4",4],["×10",10]].map(([n, v]) =>
    `<button class="${M.speed === v ? "on" : ""}" data-s="${v}">${n}</button>`).join("");
  $$("#spd button").forEach(b => b.onclick = () => { M.speed = +b.dataset.s; renderSpeed() });
}
function renderCtrl(){
  $("#pressCtrl").innerHTML = PRESS.map(([n, v]) => `<button class="${ME.press === v ? "on" : ""}" data-v="${v}">${n}</button>`).join("");
  $("#lineCtrl").innerHTML  = LINE.map(([n, v])  => `<button class="${ME.line === v ? "on" : ""}" data-v="${v}">${n}</button>`).join("");
  $$("#pressCtrl button").forEach(b => b.onclick = () => { ME.press = +b.dataset.v; act("пресинг"); renderCtrl() });
  $$("#lineCtrl button").forEach(b  => b.onclick = () => { ME.line  = +b.dataset.v; act("лінію оборони"); renderCtrl() });
}
function act(kind){
  if (!M.live || ME.actions >= 4) return;
  ME.actions++; ME.presence = Math.min(.04, ME.actions * .01);
  updBonus(); say(M.min, `Тренерський штаб змінює ${kind}.`, "warn");
}
function updBonus(){
  $("#bval").textContent = `+${(ME.presence * 100).toFixed(1).replace(".", ",")} %`;
  $("#bcount").textContent = ME.actions
    ? `Зроблено дій: ${ME.actions} з 4. Далі надбавка не росте.`
    : "Кожна твоя дія під час матчу додає команді сили. Стеля — чотири дії.";
  $("#subcount").textContent = `${ME.subsMade} / 5`;
}
/* на лаві видно позицію, а не назву ролі */
function renderBench(){
  $("#benchRow").innerHTML = ME.bench.map((p, i) =>
    `<button data-i="${i}" ${ME.subsMade >= 5 ? "disabled" : ""}>
       <i>${p.pos()}</i><b>${p.name.split(" ")[1] || p.name}</b><u>${Math.round(p.power())}</u>
     </button>`).join("");
  $$("#benchRow button").forEach(b => b.onclick = () => askSub(+b.dataset.i));
}
function askSub(i){
  if (ME.subsMade >= 5) return;
  const inP = ME.bench[i];
  $("#sheet").innerHTML = `<h2>Заміна</h2>
    <div class="s">виходить ${inP.pos()} ${inP.name} · сила ${Math.round(inP.power())}</div>
    <div class="plist">${V.SLOTS.slice(1).map(s => {
      const p = ME.xi[s], fit = Math.round(inP.powerIn(p.role));
      return `<div class="p" data-s="${s}"><div class="pos">${V.SLOT_POS[s]}</div>
        <div class="pn"><b>${p.name}</b><i>${V.SLOT_UA[s]} · ${p.injured ? '<span style="color:var(--bad)">травма</span> · ' : ""}свіжість ${Math.round(p.fresh * 100)} %</i></div>
        <div class="pv"><b>${Math.round(p.power())}</b><i style="font-style:normal;font-size:10px;color:${fit >= p.power() ? "var(--live)" : "var(--dim)"}">стане ${fit}</i></div></div>`;
    }).join("")}</div>
    <button class="btn ghost sm" style="margin-top:14px" onclick="closeSheet()">Скасувати</button>`;
  $("#modal").classList.add("on");
  $$("#sheet .p").forEach(el => el.onclick = () => {
    const s = el.dataset.s, outP = ME.xi[s];
    ME.xi[s] = inP; ME.bench[i] = outP; ME.subsMade++;
    inP.fresh = 1; closeSheet(); renderBench(); act("склад");
    say(M.min, `Заміна: ${inP.name} замість ${outP.name}.`, "warn");
    if (!M.live) updBonus();
  });
}
function say(min, txt, cls = ""){
  const c = $("#comm");
  c.insertAdjacentHTML("afterbegin", `<div class="e ${cls}"><span class="m">${min}'</span><span class="t">${txt}</span></div>`);
  while (c.children.length > 40) c.lastChild.remove();
  c.scrollTop = 0;
}

/* ---- екран не гасне під час матчу ---- */
let wakeLock = null, wakeWarned = false;
function wakeFail(){
  const el = $("#wakewarn"); if (el) el.hidden = false;
  if (wakeWarned) return; wakeWarned = true;
  say(M.min, "Телефон не дає заборонити згасання екрана. Постав більший час до згасання в налаштуваннях.", "warn");
}
async function keepAwake(on){
  if (!on){ if (wakeLock){ try { await wakeLock.release() } catch(e){} wakeLock = null } return }
  if (!("wakeLock" in navigator)){ wakeFail(); return }
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null });
    const el = $("#wakewarn"); if (el) el.hidden = true;
  } catch(e){ wakeFail() }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (M.live && !wakeLock) keepAwake(true);
  /* у прихованій вкладці цикл поля зупиняється (не гріємо батарею).
     Повернулись — запускаємо знову, інакше поле лишалося б замороженим. */
  if (page === "match") ensurePitchLoop();
});

/* ---- поле ----
   Гравці рухаються до цілі щокадру (requestAnimationFrame), а не стрибають
   від події до події. Ціль формації зсувається залежно від того, хто атакує:
   атакуюча лінія просувається вперед, оборона стягується до своїх воріт.
   Позиції HF_BASE відповідають порядку SLOTS (перша — воротар). */
const HF_BASE = [[.07,.5],[.20,.14],[.19,.38],[.19,.62],[.20,.86],[.31,.5],[.36,.28],[.36,.72],[.46,.12],[.47,.5],[.46,.88]];
const AF_BASE = HF_BASE.map(([a, b]) => [1 - a, 1 - b]);
const clamp01 = v => Math.max(.04, Math.min(.96, v));
let homeDots = [], awayDots = [];
function initDots(){
  const mk = ([x, y], i) => ({ bx:x, by:y, x, y, fx:x, fy:y, tx:x, ty:y,
                               delay: V.rf(0, .22), phase: V.rf(0, 6.28) });
  homeDots = HF_BASE.map(mk);
  awayDots = AF_BASE.map(mk);
  ballFrom = { x:.5, y:.5 }; ballPath = [{ x:.5, y:.5 }];
  moveT0 = performance.now(); moveDur = 4300;
}
function setFormationTargets(attacker, ballTx, ballTy){
  const dir = attacker === M.hm ? 1 : -1;             // куди веде атака цієї команди
  const mine   = attacker === M.hm ? homeDots : awayDots;
  const theirs = attacker === M.hm ? awayDots : homeDots;
  const hold = d => { d.fx = d.x; d.fy = d.y; d.delay = V.rf(0, .22) };  // звідки рушаємо цього разу
  mine.forEach((d, i) => {
    hold(d);
    if (i === 0){ d.tx = d.bx; d.ty = d.by * .5 + ballTy * .5; return }  // воротар лише зміщується за м'ячем
    const adv = .5 + i / 20;                          // передня лінія просувається сильніше за задню
    d.tx = clamp01(d.bx + dir * .13 * adv);
    d.ty = d.by * .72 + ballTy * .28;
  });
  theirs.forEach((d, i) => {
    hold(d);
    if (i === 0){ d.tx = d.bx; d.ty = d.by * .5 + ballTy * .5; return }
    d.tx = clamp01(d.bx + dir * .06);                 // та сама половина поля — стягуються ближче до своїх воріт
    d.ty = d.by * .82 + ballTy * .18;
  });
}
const BALL = { x:.5, y:.5 };
let ballFrom = { x:.5, y:.5 }, ballPath = [{ x:.5, y:.5 }];
let moveT0 = 0, moveDur = 4300;

/* М'яч не летить по прямій від події до події — між ними він робить
   кілька передач через гравців атакуючої команди. Це та сама подія рушія,
   просто показана як живий розіграш, а не як телепорт. */
function buildBallPath(ev, toX, toY){
  const atk = ev.team === M.hm ? homeDots : awayDots;
  const hops = (ev.t === "goal" || ev.t === "shot") ? 3
             : (ev.t === "lose" || ev.t === "block") ? 1 : 2;
  const path = [];
  for (let i = 1; i < hops; i++){
    const d = atk[1 + Math.floor(V.R() * (atk.length - 1))];   // будь-хто, крім воротаря
    path.push({ x: clamp01(d.tx + V.rf(-.03, .03)), y: clamp01(d.ty + V.rf(-.03, .03)) });
  }
  path.push({ x: toX, y: toY });
  return path;
}
function drawPitch(){
  const c = $("#pitch"), x = c.getContext("2d"), W = c.width, H = c.height;
  x.fillStyle = "#173A27"; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) if (i % 2){ x.fillStyle = "rgba(255,255,255,.028)"; x.fillRect(i * W / 10, 0, W / 10, H) }
  x.strokeStyle = "rgba(255,255,255,.30)"; x.lineWidth = 2;
  x.strokeRect(16, 16, W - 32, H - 32);
  x.beginPath(); x.moveTo(W / 2, 16); x.lineTo(W / 2, H - 16); x.stroke();
  x.beginPath(); x.arc(W / 2, H / 2, 62, 0, 7); x.stroke();
  x.strokeRect(16, H / 2 - 112, 112, 224); x.strokeRect(W - 128, H / 2 - 112, 112, 224);
  x.strokeRect(16, H / 2 - 56, 44, 112);    x.strokeRect(W - 60, H / 2 - 56, 44, 112);
  const dot = (px, py, fill, stroke) => { x.beginPath(); x.arc(px * W, py * H, 11, 0, 7);
    x.fillStyle = fill; x.fill(); x.lineWidth = 2; x.strokeStyle = stroke; x.stroke() };
  homeDots.forEach(d => dot(d.x, d.y, "#D9A93C", "#7A5C16"));
  awayDots.forEach(d => dot(d.x, d.y, "#9BB4D0", "#3C5570"));
  x.beginPath(); x.arc(BALL.x * W, BALL.y * H, 7, 0, 7); x.fillStyle = "#fff"; x.fill();
  x.strokeStyle = "rgba(0,0,0,.5)"; x.lineWidth = 1.5; x.stroke();
}
function moveBall(ev){
  const home = ev.team === M.hm, z = ev.zone || "mid";
  let toX = z === "box" ? (home ? .88 : .12) : z === "mid" ? .5 : (home ? .66 : .34);
  const toY = z === "L" ? .22 : z === "R" ? .78 : V.rf(.35, .65);
  if (ev.t === "lose") toX = home ? .38 : .62;
  setFormationTargets(ev.team, toX, toY);
  ballFrom = { x: BALL.x, y: BALL.y };
  ballPath = buildBallPath(ev, toX, toY);
  /* рух розтягуємо рівно до наступної події — тоді на полі немає мертвих пауз */
  moveT0 = performance.now();
  moveDur = Math.max(260, 4300 / M.speed);
}
/* такт без показаної події: команда просто перекочує м'яч між своїми */
function driftBall(){
  const atk = V.R() < M.ph ? homeDots : awayDots;
  const a = atk[1 + Math.floor(V.R() * (atk.length - 1))];
  const b = atk[1 + Math.floor(V.R() * (atk.length - 1))];
  ballFrom = { x: BALL.x, y: BALL.y };
  ballPath = [
    { x: clamp01(a.tx + V.rf(-.03, .03)), y: clamp01(a.ty + V.rf(-.03, .03)) },
    { x: clamp01(b.tx + V.rf(-.03, .03)), y: clamp01(b.ty + V.rf(-.03, .03)) },
  ];
  moveT0 = performance.now();
  moveDur = Math.max(260, 4300 / M.speed);
}
/* безперервний цикл: лерпить поточні позиції до цілей і перемальовує щокадру.
   Зупиняється, коли розділ "Матч" не на екрані, — не гріє батарею дарма. */
let pitchRAF = null;
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut   = t => 1 - Math.pow(1 - t, 2);

function pitchFrame(){
  pitchRAF = null;
  if (page !== "match" || document.hidden) return;
  const now = performance.now();
  const t = Math.min(1, (now - moveT0) / moveDur);

  /* Гравці: кожен іде від своєї попередньої точки до нової рівно стільки,
     скільки триває відрізок, з невеликою затримкою старту в кожного —
     тоді команда пливе, а не смикається вся разом. Плюс постійне
     мікродихання, щоб ніхто ніколи не стояв як вкопаний. */
  const move = d => {
    const p = easeInOut(Math.max(0, Math.min(1, (t - d.delay) / (1 - d.delay))));
    d.x = d.fx + (d.tx - d.fx) * p + Math.sin(now / 760 + d.phase) * .0035;
    d.y = d.fy + (d.ty - d.fy) * p + Math.cos(now / 910 + d.phase) * .0035;
  };
  homeDots.forEach(move); awayDots.forEach(move);

  /* М'яч іде шляхом із кількох передач; кожна передача — швидкий старт,
     м'яке прибуття, як справжній пас. */
  const segs = ballPath.length;
  const st = Math.min(segs - 1e-6, t * segs);
  const i = Math.floor(st);
  const from = i === 0 ? ballFrom : ballPath[i - 1];
  const to = ballPath[i];
  const e = easeOut(st - i);
  BALL.x = from.x + (to.x - from.x) * e;
  BALL.y = from.y + (to.y - from.y) * e;

  drawPitch();
  pitchRAF = requestAnimationFrame(pitchFrame);
}
function ensurePitchLoop(){ if (pitchRAF === null) pitchRAF = requestAnimationFrame(pitchFrame) }

/* ---- цикл матчу ---- */
$("#startBtn").onclick = () => {
  if (M.over){ nextRound(); return }
  if (M.live) return;
  M.live = true; $("#startBtn").style.display = "none";
  keepAwake(true);
  say(0, `Стартовий свисток. ${M.hm.name} — ${M.aw.name}.`, "big");
  loop();
};
function loop(){
  M.timer = setTimeout(() => { const paused = step(); if (!M.over && !paused) loop() }, 4300 / M.speed);
}
function step(){
  M.ep++;
  M.min = Math.min(90, Math.round(M.ep * 90 / M.N));
  if (M.half === 1 && M.min >= 45){
    M.half = 2; M.min = 45; M.ep--; clearTimeout(M.timer);
    $("#mclock").className = "clock paused"; $("#mclock").textContent = "перерва";
    say(45, `Перерва. ${M.hm.goals} : ${M.aw.goals}`, "big");
    M.hm.onPitch().forEach(p => p.fresh = Math.min(1, p.fresh + .07));
    M.aw.onPitch().forEach(p => p.fresh = Math.min(1, p.fresh + .07));
    setTimeout(() => { say(46, "Другий тайм почався."); loop() }, 3200);
    return true;
  }
  if (M.ep % 6 === 0){ M.hm.tire(90 / M.N * 6); M.aw.tire(90 / M.N * 6) }
  let shown = false;
  V.episode(M.hm, M.aw, M.ph).forEach(e => {
    const cls = e.t === "goal" ? "big" : (e.t === "yel" || e.t === "red" || e.t === "inj") ? "warn" : "";
    if (e.t === "lose" && V.R() < .55) return;
    if (e.t === "block" && V.R() < .45) return;
    say(M.min, e.txt, cls);
    if (e.t === "goal"){ $("#mgh").textContent = M.hm.goals; $("#mga").textContent = M.aw.goals }
    moveBall(e); shown = true;
  });
  /* частину епізодів ми навмисне не пишемо в стрічку, щоб не засмічувати
     коментар. Але м'яч у такі такти раніше просто стояв — звідси й відчуття
     "кадрів". Тепер у ці паузи йде звичайний розіграш у центрі поля. */
  if (!shown) driftBall();
  $("#mclock").className = "clock";
  $("#mclock").innerHTML = `<span class="dot"></span>${M.min}' наживо`;
  if (M.ep >= M.N) finish();
}
function finish(){
  M.over = true; M.live = false; clearTimeout(M.timer);
  keepAwake(false);
  $("#mclock").className = "clock paused"; $("#mclock").textContent = "фінальний свисток";
  say(90, `Фінальний свисток. ${M.hm.name} ${M.hm.goals} : ${M.aw.goals} ${M.aw.name}`, "big");
  regResult(M.hm.name, M.aw.name, M.hm.goals, M.aw.goals, true);
  S.fixtures[(S.round - 1) % S.fixtures.length].forEach(([h, a]) => {
    if (h === ME.name || a === ME.name) return;
    const [gh, ga] = V.quickMatch(teamBy(h), teamBy(a));
    regResult(h, a, gh, ga, false);
  });
  const diff = M.hm === ME ? M.hm.goals - M.aw.goals : M.aw.goals - M.hm.goals;
  const prize = diff > 0 ? 48000 : diff === 0 ? 22000 : 9000;
  S.money += prize;
  addNews(diff > 0 ? "up" : "goal",
    `${diff > 0 ? "Перемога" : diff === 0 ? "Нічия" : "Поразка"} ${M.hm.goals}:${M.aw.goals} — призові ${fmt(prize)}`);
  $("#startBtn").textContent = "Далі — наступний тур";
  $("#startBtn").style.display = "";
  setTimeout(showReport, 900);
  renderTop(); save();
}
function regResult(h, a, gh, ga, me){
  const H = S.table[h], A = S.table[a];
  H.gf += gh; H.ga += ga; A.gf += ga; A.ga += gh;
  if (gh > ga){ H.w++; A.l++; H.p += 3 } else if (gh < ga){ A.w++; H.l++; A.p += 3 } else { H.d++; A.d++; H.p++; A.p++ }
  S.results.unshift({ h, a, gh, ga, me, r: S.round });
  S.results = S.results.slice(0, 8);
}
function showReport(){
  const mine = ME.onPitch().slice(1).concat([ME.gk]);
  const best = [...mine].sort((a, b) => b.rating - a.rating).slice(0, 4);
  const scored = mine.filter(p => p.goals > 0);
  $("#sheet").innerHTML = `<h2>${M.hm.goals} : ${M.aw.goals}</h2>
    <div class="s">${M.hm.name} — ${M.aw.name} · тур ${S.round}</div>
    ${scored.length ? `<div class="lab">Голи</div><div class="plist">${scored.map(p =>
      `<div class="p"><div class="pos">${p.goals}</div><div class="pn"><b>${p.name}</b>
       <i>${p.assists ? p.assists + " гольова · " : ""}${p.touches} дотиків</i></div></div>`).join("")}</div>` : ""}
    <div class="lab" style="margin-top:12px">Найкращі в матчі</div>
    <div class="plist">${best.map(p => `<div class="p"><div class="pos">${p.rating.toFixed(1)}</div>
      <div class="pn"><b>${p.name}</b><i>${p.pos()} · свіжість ${Math.round(p.fresh * 100)} %${p.injured ? ' · <span style="color:var(--bad)">травма</span>' : ""}</i></div>
      <div class="pv"><b>${Math.round(p.power())}</b></div></div>`).join("")}</div>
    <div class="note" style="margin-top:12px"><h3>Бонус присутності</h3>
      <p>Дій під час гри: ${ME.actions}. Команда грала з надбавкою
      <b style="color:var(--gold)">+${(ME.presence * 100).toFixed(1).replace(".", ",")} %</b> до ефективної сили.
      Стеля — 4 %, і вона рахується всередині загальної стелі бонусів 12 %.</p></div>
    <button class="btn" style="margin-top:14px" onclick="closeSheet();nextRound()">Наступний тур</button>`;
  $("#modal").classList.add("on");
}
function nextRound(){
  closeSheet();
  [...ME.onPitch(), ...ME.bench].forEach(p => { p.train(S.focus);
    p.fresh = Math.min(1, p.fresh + .55); if (p.injured && V.R() < .5) p.injured = false });
  LEAGUE.forEach(t => { if (t !== ME) [...t.onPitch(), ...t.bench].forEach(p => p.train(V.ri(0, 7))) });
  S.round++;
  if (S.round > 30){
    S.round = 1; S.season++;
    addNews("up", `Сезон ${S.season - 1} завершено. Починається сезон ${S.season}.`);
    Object.values(S.table).forEach(v => { v.p = v.w = v.d = v.l = v.gf = v.ga = 0 });
    ageAcademyOneSeason();
  }
  const wages = Math.round(ME.wageBill() / 30);
  S.money -= wages;
  addNews("cap", `Тижневі зарплати списано: ${fmt(wages)}`);
  M.hm = null;
  openMatch(); renderTop(); show("home"); save();
}
window.nextRound = nextRound;

/* =======================================================================
   НОВИНИ, ЗБЕРЕЖЕННЯ
   ======================================================================= */
function addNews(icon, text){
  S.feed.unshift({ i: icon, b: text, t: `сезон ${S.season}, тур ${S.round}`, seen: false });
  S.feed = S.feed.slice(0, 20);
}
const sp = p => ({ n:p.name, r:p.role, g:p.gk, a:p.age, at:p.attrs, po:p.pot, gl:p.glass, pr:p.prof, fo:p.form, wp:p.wagePrem, fc:p.face });
function serial(t){
  return { gk: sp(t.gk), xi: Object.fromEntries(Object.entries(t.xi).map(([k, p]) => [k, sp(p)])), bench: t.bench.map(sp) };
}
function mkPlayer(d){
  const p = new V.P(d.n, d.r, 25, d.g, d.a); p.attrs = d.at; p.pot = d.po;
  p.glass = d.gl; p.prof = d.pr; p.form = d.fo; if (d.wp) p.wagePrem = d.wp; if (d.fc) p.face = d.fc;
  p.reset(); return p;
}
function hydrate(o, t){
  t.gk = mkPlayer(o.gk); Object.entries(o.xi).forEach(([k, d]) => t.xi[k] = mkPlayer(d)); t.bench = o.bench.map(mkPlayer);
}
function save(){
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      club: S.club, division: S.division, season: S.season, round: S.round,
      money: S.money, gold: S.gold, focus: S.focus, table: S.table,
      results: S.results, feed: S.feed.slice(0, 12), buildings: S.buildings,
      queue: S.queue, owned: S.owned, squad: serial(ME),
      academy: S.academy.candidates.map(c => ({ p: sp(c.p), yearsLeft: c.yearsLeft })),
    }));
  } catch(e){}
}
function load(){
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
    const o = JSON.parse(raw); if (!o.club || !o.club.name) return false;
    Object.assign(S, {
      club: o.club, division: o.division ?? 12, season: o.season, round: o.round,
      money: o.money, gold: o.gold, focus: o.focus, table: o.table || {},
      results: o.results || [], feed: o.feed || [], buildings: o.buildings || S.buildings,
      queue: o.queue || [], owned: o.owned || { crests: [o.club.crest], kits: [o.club.kit] },
    });
    buildWorld();
    if (o.squad) hydrate(o.squad, ME);
    S.academy.candidates = (o.academy || []).map(c => ({ p: mkPlayer(c.p), yearsLeft: c.yearsLeft }));
    ensureAcademyStocked(true);   // рівень академії міг вирости чи це старе збереження без академії
    return true;
  } catch(e){ return false }
}

/* =======================================================================
   СТВОРЕННЯ КЛУБА І ЗАПУСК
   ======================================================================= */
let newCrest = 0, newKit = 0;
function renderCreate(){
  $("#crests").innerHTML = [...Array(CREST_COUNT).keys()].map(i =>
    `<button class="pickitem ${i === newCrest ? "on" : ""}" data-c="${i}"><svg viewBox="0 0 52 60">${crestSVG(i)}</svg></button>`).join("");
  $("#kits").innerHTML = [...Array(KIT_COUNT).keys()].map(i =>
    `<button class="pickitem ${i === newKit ? "on" : ""}" data-k="${i}"><svg viewBox="0 0 40 46">${kitSVG(i)}</svg></button>`).join("");
  $$("#crests button").forEach(b => b.onclick = () => { newCrest = +b.dataset.c; renderCreate() });
  $$("#kits button").forEach(b   => b.onclick = () => { newKit  = +b.dataset.k; renderCreate() });
}
$("#cgo").onclick = () => {
  const name = $("#cname").value.trim();
  if (name.length < 3){ $("#cerr").textContent = "Назва закоротка — щонайменше три літери."; return }
  S.club = { name, crest: newCrest, kit: newKit };
  S.owned = { crests: [newCrest], kits: [newKit] };
  buildWorld();
  stockAcademyAtFounding();
  addNews("cap", "Президент купив клуб. Ти — новий менеджер.");
  addNews("eye", "Скаут склав список кандидатів на сезон");
  addNews("build", `Тренувальна база: рівень ${S.buildings.training}`);
  $("#create").classList.remove("on");
  startGame();
  save();
};
function startGame(){
  $("#app").classList.add("on");
  buildRail();
  openMatch();
  show("home");
  renderTop();
}
/* заставка → або гра, або створення клуба */
setTimeout(() => {
  const has = load();
  $("#splash").classList.add("out");
  if (has) startGame();
  else { renderCreate(); $("#create").classList.add("on"); $("#cname").focus() }
}, 2300);
