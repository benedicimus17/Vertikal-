/* ВЕРТИКАЛЬ — інтерфейс.
   Горизонтальна оболонка: верхня смуга, ліве меню, сцена з восьми розділів.
   Симуляція живе в engine.js, тут тільки екрани, навігація і стан. */

const V = window.VERT;
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Math.round(n).toLocaleString("uk-UA").replace(/,/g, " ");
/* vert6: новий розподіл доходу, зарплати, піраміда. Старі збереження лишаються в пам'яті
   телефону, але новій версії не підходять — клуб створюється заново. */
const SAVE_KEY = "vert6";
/* номер версії видно внизу меню — щоб на телефоні одразу було ясно, що відкрилось */
const VERSION = "v19";

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
  academy: { candidates: [], offers: [] },   // вихованці { p, yearsLeft } і набір сезону від скаута
  trained: "",                   // "сезон-тур", коли востаннє проведено тренування
  test: { on: false, win: false },   // режим перевірки: миттєві матчі й будівлі
  fin: { tickets: 0, sponsor: 0, merch: 0, match: 0, prize: 0, sales: 0, wages: 0, upkeep: 0, build: 0, buys: 0 },  // гроші за сезон
  scout: null,                   // { season, left } — звіти скаута на сезон
  scouted: null,                 // { season, map: ім'я → що відкрив скаут } — щоб перезапуск не стирав
  taken: null,                   // { season, names } — кого вже купили в цьому сезоні
  lastSeason: null,              // підсумок останнього сезону для вікна кінця сезону
  fa: [],                        // вільні агенти: гравці, у яких скінчився контракт { p, div, from }
  sys: [],                       // продані системі — система виставляє їх на ринок за повну вартість { p, div }
  remind: 0,                     // сезон, у якому вже нагадали про кінець контрактів
};
let ME = null, LEAGUE = [];

const BUILDINGS = [
  { id: "stadium",    name: "Стадіон",             desc: "Квитки й репутація: хто погоджується перейти до тебе." },
  { id: "training",   name: "Тренувальна база",    desc: "Сила щоденних тренувань основи й академії." },
  { id: "academy",    name: "Академія",            desc: "Шанс на кращих вихованців і кількість слотів." },
  { id: "scouts",     name: "Скаутський центр",    desc: "Звіти скаута про кандидатів академії й гравців ринку." },
  { id: "medical",    name: "Медцентр",            desc: "Швидкість відновлення від травм." },
  { id: "commercial", name: "Комерційний відділ",  desc: "Спонсор і продаж атрибутики." },
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
/* Суперники щосезону оновлюються під рівень свого дивізіону (старі йдуть, приходять
   нові), тому зерно залежить від сезону. Твоя команда при цьому не чіпається. */
function buildWorld(keepMe){
  V.reseed(20260911 + S.club.crest * 7 + S.club.name.length + S.season * 1009);
  const base = levelFor(S.division);
  const mine = (S.club.name || "Вертикаль").trim();
  /* суперник із таким самим іменем зіпсував би таблицю: вона ведеться за назвами,
     два однойменні клуби злилися б в один рядок, а календар вказував би не на ту команду */
  const rivals = V.CLUBS.filter(n => n.toLowerCase() !== mine.toLowerCase()).slice(0, 15);
  while (rivals.length < 15) rivals.push("Клуб " + (rivals.length + 1));
  /* спершу суперники, потім твоя команда: тоді суперники однакові і посеред гри,
     і після перезапуску (твій склад при завантаженні все одно береться зі збереження) */
  const rivalTeams = rivals.map(n => new V.Team(n, base * V.rf(0.82, 1.1)));
  if (!keepMe) ME = new V.Team(mine, base * 0.95, true);
  /* кого вже купили в суперників цього сезону — після перезапуску вони в них не з'являються */
  if (S.taken && S.taken.season === S.season)
    rivalTeams.forEach(t => { t.bench = t.bench.filter(p => !S.taken.names.includes(p.name)) });
  LEAGUE = [ME, ...rivalTeams];
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
  { id: "team",   t: "Команда",         s: "Склад на поле",           i: '<path d="M9 4h6l4 2-2 4h-2v10H9V10H7L5 6l4-2z"/>' },
  { id: "train",  t: "Тренування",      s: "Щоденне тренування",      i: '<path d="M4 12h2M18 12h2M6 8v8M18 8v8M8 10v4M16 10v4M8 12h8"/>' },
  { id: "academy", t: "Академія",       s: "Вихованці і скаути",      i: BICON.academy },
  { id: "market", t: "Ринок",           s: "Трансфери",               i: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>' },
  { id: "infra",  t: "Інфраструктура",  s: "Стадіон і будівлі",       i: BICON.commercial },
  { id: "league", t: "Ліга",            s: "Таблиця і кубок",         i: '<path d="M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M10 19h4M12 14v5"/>' },
  { id: "world",  t: "Світ",            s: "Уся піраміда",            i: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 3.8 5.4 3.8 8.5s-1.2 5.9-3.8 8.5c-2.6-2.6-3.8-5.4-3.8-8.5S9.4 6.1 12 3.5z"/>' },
  { id: "shop",   t: "Магазин",         s: "Емблеми і форми",         i: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>' },
  { id: "settings", t: "Налаштування",  s: "Гра і збереження",        i: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>' },
];
let page = "home";
function buildRail(){
  $("#rail").innerHTML = NAV.map(n =>
    `<button data-p="${n.id}" class="${n.id === page ? "on" : ""}">
       <svg viewBox="0 0 24 24">${n.i}</svg><span><b>${n.t}</b><i>${n.s}</i></span>
     </button>`).join("") + '<span class="grow"></span><span class="ver">Версія ' + VERSION + '</span>';
  $$("#rail button").forEach(b => b.onclick = () => show(b.dataset.p));
}
function show(p){
  page = p;
  $$(".sc").forEach(e => e.classList.toggle("on", e.id === "sc-" + p));
  $$("#rail button").forEach(b => b.classList.toggle("on", b.dataset.p === p));
  document.body.classList.toggle("data", p !== "home");
  /* прокручується сам розділ, а не сцена — його й повертаємо на початок */
  const sc = $("#sc-" + p); if (sc) sc.scrollTop = 0;
  if (p === "home")   renderHome();
  if (p === "team")   renderTeam();
  if (p === "train")  renderTrain();
  if (p === "league") renderLeague();
  if (p === "infra")  renderInfra();
  if (p === "academy") renderAcademyPage();
  if (p === "market") renderMarket();
  if (p === "shop")   renderShop();
  if (p === "world")  renderWorld();
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
  if (noSwipe) return;                       // палець тягнув гравця у складі, а не гортав розділи
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
  $("#topSub").textContent = `Дивізіон ${S.division} · Сезон ${S.season} · Тур ${S.round}${S.test.on ? " · перевірка" : ""}`;
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
  $("#homeLine").textContent = `${ord(tablePos(ME.name))} у таблиці. Наступний суперник — ${opp.name}, ${f.isHome ? "удома" : "у гостях"}. Склад оцінюється в ${f1(ME.rate())} за силою в ролі. ${trainedToday() ? "Сьогодні вже тренувались." : "Сьогодні ще не тренувались — тренування в розділі «Тренування»."}${expiringText()}`;
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
  $("#homePlay").textContent = S.test.on ? "Зіграти день миттєво" : "Грати матч";
  $("#homeSeason").style.display = S.test.on ? "" : "none";
  renderTop();
}
$("#homePlay").onclick  = () => S.test.on ? playInstant() : show("match");
$("#homeSeason").onclick = () => simSeason();
$("#homeSquad").onclick = () => show("team");
$("#btnMail").onclick   = () => show("home");
$("#btnProfile").onclick = () => show("settings");

/* =======================================================================
   КОМАНДА
   ======================================================================= */
/* Шість зірок, кожна — два дивізіони: зірки показують межу, до якої гравець доросте. */
function stars(p){ return `<span class="st"><span class="on">${"★".repeat(p.stars())}</span>★★★★★★</span>` }
const f1 = x => x.toFixed(1).replace(".", ",");
const sgn = x => (x >= 0 ? "+" : "−") + f1(Math.abs(x));
/* денний приріст малий (сотні частки), тому показуємо два знаки */
const sgn2 = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2).replace(".", ",");
/* відмінок після числа: 1 перемога, 2 перемоги, 5 перемог */
const pl = (n, one, few, many) => { const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many };
const yrs = n => { const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? "рік" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "роки" : "років" };
/* вік усередині сезону: з кожним туром гравець трохи старший — лінія росту рухається плавно */
const ageF = p => p.age + (S.round - 1) / 30;
function prow(p, slot, isSub){
  const fr = Math.round(p.fresh * 100);
  const label = isSub ? p.pos() : V.SLOT_POS[slot];
  const off = !isSub && p.role !== (V.SPECS.find(s => s[0] === slot) || [])[1] && slot !== "GK";
  return `<div class="p drag" data-slot="${slot}">
    <div class="pos ${isSub ? "sub" : ""}">${label}</div>
    <div class="pn"><b>${p.name}</b><i>${p.age} р · ${V.ROLE_UA[p.role]}${off ? " · не своя позиція" : ""} · ${stars(p)}${lastCareer(p) ? ' · <span class="ctw">останній сезон кар\'єри</span>' : lastYear(p) ? ' · <span class="ctw">останній сезон контракту</span>' : ""}</i></div>
    <div class="pv"><b>${Math.round(p.power())}</b><div class="frbar"><i style="width:${fr}%"></i></div></div></div>`;
}
/* Розташування на полі: атака вправо, ворота зліва; координати в % ширини/висоти. */
const PITCH_XY = { GK:[7,50], RB:[25,88], CB1:[21,63], CB2:[21,37], LB:[25,12],
                   DM:[40,50], CM:[58,28], AM:[58,72], RW:[82,86], ST:[89,50], LW:[82,14] };
const PITCH_LINES = `<svg class="ln" viewBox="0 0 105 68" preserveAspectRatio="none">
  <rect x="1.5" y="1.5" width="102" height="65"/><line x1="52.5" y1="1.5" x2="52.5" y2="66.5"/>
  <circle cx="52.5" cy="34" r="8"/><rect x="1.5" y="18" width="14" height="32"/>
  <rect x="89.5" y="18" width="14" height="32"/><rect x="1.5" y="26" width="5" height="16"/>
  <rect x="98.5" y="26" width="5" height="16"/></svg>`;
/* кружечок гравця: на полі (з позицією слота) або на лаві (з його позицією); під ним — прізвище, вік і зірки */
function token(p, slot, onPitch){
  const off = onPitch && slot !== "GK" && p.role !== (V.SPECS.find(s => s[0] === slot) || [])[1];
  const sur = p.name.split(" ").slice(-1)[0];
  const pos = onPitch ? `left:${PITCH_XY[slot][0]}%;top:${PITCH_XY[slot][1]}%` : "";
  const warn = lastCareer(p) ? "кінець кар'єри" : lastYear(p) ? "кінець контракту" : "";
  return `<button class="tk drag ${onPitch ? "" : "bt"} ${off ? "off" : ""} ${warn ? "ctl" : ""}" data-slot="${slot}"
      style="${pos}" title="${p.name}${warn ? " · " + warn : ""}">
    <span class="c">${p.face ? `<img src="${p.face}" alt="">` : (onPitch ? V.SLOT_POS[slot] : p.pos())}<b>${Math.round(p.power())}</b></span>
    <i>${sur}</i><em>${p.age} · <s>${"★".repeat(p.stars())}</s></em></button>`;
}
const pitchToken = (p, slot) => token(p, slot, true);
/* склад: поле + лава кружечками; однаковий у «Команді» й у підготовці до матчу */
function renderLineup(pitchEl, benchEl){
  pitchEl.innerHTML = `${PITCH_LINES}<div class="fm">4-3-3</div>` + V.SLOTS.map(s => pitchToken(s === "GK" ? ME.gk : ME.xi[s], s)).join("");
  benchEl.innerHTML = ME.bench.map((p, i) => token(p, "B" + i, false)).join("");
  [...pitchEl.querySelectorAll(".tk"), ...benchEl.querySelectorAll(".tk")].forEach(el => {
    el.onclick = () => { if (DRAG.suppress){ DRAG.suppress = false; return } openPlayer(el.dataset.slot) };
  });
}
/* контракт закінчується наприкінці цього сезону */
const lastYear = p => p.ct != null && p.ct <= S.season;
/* Останній сезон кар'єри: наприкінці сезону гравець завершить кар'єру. Точний вік завершення
   наперед не відомий — гравець оголошує про це на початку свого останнього сезону. */
const lastCareer = p => p.age + 1 >= p.ret;
/* ветеранам — короткі контракти: від 30 років до 2, від 32 — лише на рік (поновлюється щороку) */
const maxYears = p => lastCareer(p) || p.age >= 32 ? 1 : p.age >= 30 ? 2 : 4;
/* Демо-обличчя: поки воно одне, його отримує один гравець і живе з ним, а не зі слотом. */
function ensureDemoFace(){
  const all = [ME.gk, ...Object.values(ME.xi), ...ME.bench];
  if (!all.some(p => p.face)) ME.xi.ST.face = "img/faces/f01.jpg";
}
function renderTeam(){
  ensureDemoFace();
  $("#teamSub").textContent = `Оцінка складу ${Math.round(ME.rate())} · хімія +${(ME.chem() * 100).toFixed(1)} % · зарплатня ${fmt(ME.wageBill())} за сезон`;
  /* тап — картка гравця; обмін — перетягуванням (див. «ПЕРЕТЯГУВАННЯ» нижче) */
  renderLineup($("#teamPitch"), $("#subs"));
}
function renderTrain(){
  $("#trainSub").textContent = `Тренувальна база рівня ${S.buildings.training} · ${trainedToday() ? "сьогодні вже тренувались" : "сьогодні ще не тренувались"}`;
  $("#trainTabs").innerHTML = V.ATTR_SHORT.map((n, i) =>
    `<button class="${i === S.focus ? "on" : ""}" data-f="${i}">${n}</button>`).join("");
  $("#trainTabs button").forEach(b => b.onclick = () => { S.focus = +b.dataset.f; renderTrain(); save() });
  const done = trainedToday();
  $("#trainBtn").disabled = done;
  $("#trainBtn").textContent = done ? "Тренування проведено" : "Провести тренування";
  $("#trainBtn").onclick = () => trainToday();
  $("#trainStat").className = done ? "done" : "";
  $("#trainStat").textContent = done ? "сьогодні вже тренувались, завтра — знову" : "сьогодні тренування ще не було";
  $("#trainNote").textContent = `Головне в рості — щоденне тренування, а тренувальна база (зараз рівень ${S.buildings.training}) визначає, наскільки воно сильне. Без тренувань гравці ростуть мало, тільки від матчів. Кожен росте рівномірно до своєї межі (її показують зірки) якраз до свого піку: нападники — до 24–25 років, півзахисники — до 25–26, захисники — до 27–28, воротарі — пізніше. Фокус на «${V.ATTR[S.focus]}» тягне цю характеристику швидше за інші.`;
}
/* =======================================================================
   РІСТ
   Щоденне тренування — головне джерело росту, база визначає його силу.
   Матч додає трохи тим, хто грав. Ніхто не росте вище своєї лінії віку.
   ======================================================================= */
const trainedToday = () => S.trained === `${S.season}-${S.round}`;
function squadAll(){ return [ME.gk, ...Object.values(ME.xi), ...ME.bench] }
function trainToday(quiet){
  if (trainedToday()) return;
  const k = V.kBase(S.buildings.training);
  const gains = [];
  squadAll().forEach(p => {
    if (p.injured) return;                       // травмований не тренується
    const g = p.grow(p.slopeDay(ageF(p)) * k, ageF(p), S.focus);
    p._tg = (p._tg || 0) + g; gains.push([p, g]);
  });
  /* академія тренується разом із клубом, на тій самій базі */
  S.academy.candidates.forEach(c => { c.p.grow(c.p.slopeDay(ageF(c.p)) * k, ageF(c.p), S.focus) });
  S.trained = `${S.season}-${S.round}`;
  if (quiet) return;
  const total = gains.reduce((s, [, g]) => s + g, 0);
  const top = gains.filter(([, g]) => g > 0.004).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $("#sheet").innerHTML = `<h2>Тренування проведено</h2>
    <div class="s">база рівня ${S.buildings.training} · фокус «${V.ATTR[S.focus]}»</div>
    <p style="font-size:13px;color:var(--muted);margin:0 0 12px">Разом команда додала <b style="color:var(--live)">${sgn2(total)}</b> сили.
    ${top.length ? "Найбільше:" : "Усі гравці вже на своїй межі для свого віку — рости нікому."}</p>
    ${top.length ? `<div class="plist">${top.map(([p, g]) => `<div class="p"><div class="pos">${p.pos()}</div>
      <div class="pn"><b>${p.name}</b><i>${p.age} р · ${stars(p)}</i></div>
      <div class="pv"><b>${f1(p.power())}</b><i class="gain">${sgn2(g)}</i></div></div>`).join("")}</div>` : ""}
    <p style="font-size:11.5px;color:var(--dim);margin:10px 0 0">За день приріст малий — гравець рівномірно доростає до своєї межі за роки. За сезон із таких днів складаються помітні числа: підсумок видно в картці гравця.</p>
    <button class="btn ghost sm" style="margin-top:14px" onclick="closeSheet()">Добре</button>`;
  openSheet();
  if (page === "train") renderTrain();
  if (page === "home") renderHome();
  save();
}
const getP = s => s === "GK" ? ME.gk : s[0] === "B" ? ME.bench[+s.slice(1)] : ME.xi[s];
function setP(s, p){ if (s === "GK") ME.gk = p; else if (s[0] === "B") ME.bench[+s.slice(1)] = p; else ME.xi[s] = p }
/* воротар стоїть лише у воротах або на лаві, польовий — будь-де, крім воріт */
const slotOK = (slot, p) => slot === "GK" ? p.gk : slot[0] === "B" ? true : !p.gk;
function swap(a, b){
  const pa = getP(a), pb = getP(b);
  if (!slotOK(a, pb) || !slotOK(b, pa)) return false;
  setP(a, pb); setP(b, pa); return true;
}

/* =======================================================================
   ПЕРЕТЯГУВАННЯ У СКЛАДІ
   Гравця на полі тягнеш одразу. Гравця на лаві — затримай палець на мить,
   інакше лава не гортатиметься. Відпустив на іншому гравці — міняються місцями.
   Коли гра розвернута через CSS, координати пальця приходять «боком» —
   перераховуємо їх так само, як для свайпів.
   ======================================================================= */
const DRAG = { el: null, slot: null, sx: 0, sy: 0, on: false, armed: false, bench: false, ghost: null, timer: null, over: null, suppress: false };
let noSwipe = false;
const toLocal = (x, y) => isRotatedHack() ? { x: y, y: innerWidth - x } : { x, y };
function dragStart(el, x, y, mouse){
  DRAG.el = el; DRAG.slot = el.dataset.slot; DRAG.sx = x; DRAG.sy = y; DRAG.on = false;
  DRAG.bench = !!el.closest(".lbench"); DRAG.armed = !DRAG.bench || mouse;
  noSwipe = DRAG.armed; clearTimeout(DRAG.timer);
  if (!DRAG.armed) DRAG.timer = setTimeout(() => { DRAG.armed = true; noSwipe = true; el.classList.add("hold") }, 220);
}
function dragMove(x, y){
  const { dx, dy } = toVisual(x - DRAG.sx, y - DRAG.sy);
  if (!DRAG.on){
    if (Math.hypot(dx, dy) < 8) return false;
    if (!DRAG.armed){ dragReset(); return false }        // рух раніше за затримку — це гортання лави
    DRAG.on = true;
    const p = getP(DRAG.slot), g = document.createElement("div");
    g.className = "dghost"; g.innerHTML = `<b>${Math.round(p.power())}</b><i>${p.name.split(" ").slice(-1)[0]}</i>`;
    $("#app").appendChild(g); DRAG.ghost = g; DRAG.el.classList.add("dragging");
  }
  const l = toLocal(x, y);
  DRAG.ghost.style.left = l.x + "px"; DRAG.ghost.style.top = l.y + "px";
  const t = document.elementFromPoint(x, y), tg = t && t.closest(".lpitch .tk, .lbench .tk");
  if (DRAG.over && DRAG.over !== tg) DRAG.over.classList.remove("dropon");
  DRAG.over = tg && tg !== DRAG.el ? tg : null;
  if (DRAG.over) DRAG.over.classList.add("dropon");
  return true;
}
function dragEnd(){
  const was = DRAG.on;
  if (was){
    DRAG.suppress = true; setTimeout(() => { DRAG.suppress = false }, 350);
    if (DRAG.over){
      if (swap(DRAG.slot, DRAG.over.dataset.slot)) save();
      else toast("Воротар грає лише у воротах");
    }
  }
  /* після звичайного тапу склад не перемальовуємо — інакше зник би елемент, по якому зараз прийде «клік» */
  dragReset(); if (was) renderTeamIfOpen();
}
function dragReset(){
  clearTimeout(DRAG.timer);
  if (DRAG.ghost) DRAG.ghost.remove();
  if (DRAG.el) DRAG.el.classList.remove("hold", "dragging");
  if (DRAG.over) DRAG.over.classList.remove("dropon");
  Object.assign(DRAG, { el: null, slot: null, on: false, armed: false, ghost: null, over: null });
  setTimeout(() => { noSwipe = false }, 0);
}
function renderTeamIfOpen(){ if (page === "team") renderTeam(); if (page === "match") renderMatchPrep() }
/* під час і після матчу склад на полі не міняється перетягуванням — лише замінами */
const dragEl = t => { const el = t && t.closest && t.closest(".lpitch .drag, .lbench .drag");
  return el && (!el.closest("#sc-match") || (!M.live && !M.over)) ? el : null };
document.addEventListener("touchstart", e => {
  const el = dragEl(e.target); if (!el || e.touches.length !== 1) return;
  dragStart(el, e.touches[0].clientX, e.touches[0].clientY, false);
}, { passive: true });
document.addEventListener("touchmove", e => {
  if (!DRAG.el) return;
  if (dragMove(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault();
}, { passive: false });
document.addEventListener("touchend", () => { if (DRAG.el) dragEnd() });
document.addEventListener("touchcancel", () => { if (DRAG.el) dragReset() });
document.addEventListener("mousedown", e => { const el = dragEl(e.target); if (el && e.button === 0) dragStart(el, e.clientX, e.clientY, true) });
document.addEventListener("mousemove", e => { if (DRAG.el) dragMove(e.clientX, e.clientY) });
document.addEventListener("mouseup", () => { if (DRAG.el) dragEnd() });
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
const peakTxt = pk => pk % 1 ? `${Math.floor(pk)}–${Math.ceil(pk)} років` : `${pk} років`;
/* Що каже картка про ріст — простими словами, з тими самими числами, що рахує гра. */
function growthText(p){
  const a = ageF(p), line = p.line(a), pw = p.power();
  const lim = `Межа — <b style="color:var(--gold)">${Math.round(p.pot)}</b>: може дорости до рівня Д${V.divOf(p.pot)}. Пік — у ${peakTxt(p.pk)}.`;
  let now;
  if (a >= p.pk + 4) now = "Пік позаду: більше не росте, повільно слабшають швидкість, сила й витривалість.";
  else if (a >= p.pk + 1) now = "Пік позаду: більше не росте, але поки й не слабшає.";
  else if (line - pw < 0.3) now = `Зараз він на своїй лінії віку (${f1(line)}) — росте рівно стільки, скільки дозволяє вік.`;
  else now = `Для свого віку він міг би мати ${f1(line)} — до цієї лінії ще ${f1(line - pw)}, їх набирають тренуваннями.`;
  const season = p.ss != null ? ` За цей сезон: <b style="color:var(--live)">${sgn(pw - p.ss)}</b>.` : "";
  return `${lim} ${now}${season}`;
}
/* контракт у картці: до якого сезону і яка зарплата */
function contractText(p){
  if (lastCareer(p)) return `<b style="color:var(--warn)">Останній сезон кар'єри:</b> наприкінці сезону він завершить кар'єру. Зарплата ${fmt(V.wageOf(p))} за сезон.`;
  if (p.ct == null) return `Зарплата ${fmt(V.wageOf(p))} за сезон.`;
  const left = p.ct - S.season;
  const when = left <= 0 ? "закінчується наприкінці цього сезону — продовж, інакше гравець піде" : left === 1 ? "ще цей і наступний сезон" : `ще ${left + 1} сезони`;
  return `Контракт до кінця сезону ${p.ct} (${when}). Зарплата ${fmt(V.wageOf(p))} за сезон.`;
}
function openPlayer(slot){
  const p = getP(slot);
  const face = p.face;
  $("#sheet").innerHTML = `<div class="pc">
      <div class="face">${face ? `<img src="${face}" alt="">` : SILHOUETTE}</div>
      <div class="info">
        <h2>${p.name}</h2>
        <div class="s">${p.pos()} · ${p.age} ${yrs(p.age)} · ${V.ROLE_UA[p.role]}</div>
        <div>${stars(p)}</div>
        <div class="pw"><b>${f1(p.power())}</b><i>сила в ролі</i></div>
      </div>
      ${radarSVG(p)}
    </div>
    <div class="sec">Характеристики</div>
    <div class="attrs">${V.ATTR.map((n, i) => `<div class="at"><span>${n}</span>
      <div class="b"><i style="width:${p.attrs[i]}%"></i></div><u>${Math.round(p.attrs[i])}</u></div>`).join("")}</div>
    <div class="note"><h3>${V.ROLE_UA[p.role]}</h3><p>${growthText(p)}</p>
      <p style="margin-top:6px">${contractText(p)} Оціночна вартість ${fmt(V.valueOf(p))}.</p>
      ${p.ct != null && p.ct <= S.season && !lastCareer(p) ? `<button class="btn sm" id="renewBtn" style="margin-top:8px">Продовжити контракт</button>` : ""}</div>
    <div class="strip">${V.SLOTS.map(s => {
      const q = getP(s), f = q.face;
      return `<button data-s="${s}" class="${s === slot ? "on" : ""}" title="${q.name}">
        ${f ? `<img src="${f}" alt="">` : SILHOUETTE}<u>${V.SLOT_POS[s]}</u></button>`;
    }).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn ghost sm" onclick="closeSheet()">Закрити</button>
    </div>
    <p style="font-size:11px;color:var(--dim);margin:8px 0 0">Щоб поміняти гравців місцями — перетягни одного на іншого в розділі «Команда».</p>`;
  $$("#sheet .strip button").forEach(b => b.onclick = () => openPlayer(b.dataset.s));
  if ($("#renewBtn")) $("#renewBtn").onclick = () => contractSheet(p, { title: `Продовження: ${p.name}`, renew: true });
  openSheet();
}
function closeSheet(){ $("#modal").classList.remove("on", "lock"); $("#modal .sheet").scrollTop = 0 }
window.closeSheet = closeSheet;
/* кожне вікно відкривається згори — навіть коли вміст міняється у вже відкритому вікні */
function openSheet(lock){
  $("#modal").classList.add("on"); if (lock) $("#modal").classList.add("lock");
  const sh = $("#modal .sheet"); sh.scrollTop = 0;
  requestAnimationFrame(() => { sh.scrollTop = 0 });
}
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
  const z = zones(S.division);
  $("#leagueSub").textContent = `Дивізіон ${S.division} · тур ${S.round} з 30 · ${S.division <= 4 ? (z.up ? "3 перші вгору" : "вища ліга") : "чемпіон угору, 2-ге місце — плей-оф у неділю"} · ${z.down ? `${z.down} останні вилітають` : "нижче нікуди — це дно"}`;
  const box = $("#leagueBody");
  if (leagueView === "table"){
    box.innerHTML = `<table><thead><tr><th class="l">#</th><th class="l">Клуб</th><th>І</th><th>В</th><th>Н</th><th>П</th><th>М</th><th>О</th></tr></thead><tbody>${
      sortedTable().map((r, i) => {
        const cls = [r.n === ME.name ? "me" : "", i < z.up ? "up" : z.playoff && i === 1 ? "po" : i >= 16 - z.down ? "down" : ""].filter(Boolean).join(" ");
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
   ГРОШІ (ОСНОВА.md, розділ 3)
   Квитки — за кожен домашній матч, спонсор і атрибутика — щотуру, призові за
   місце — у кінці сезону. Зарплати й утримання — щотуру. Усе пишеться в
   підсумок сезону (S.fin), щоб у кінці було видно, куди пішли гроші.
   ======================================================================= */
const FIN0 = () => ({ tickets: 0, sponsor: 0, merch: 0, match: 0, prize: 0, sales: 0, wages: 0, upkeep: 0, build: 0, buys: 0 });
const levelsSum = () => Object.values(S.buildings).reduce((a, b) => a + b, 0);
function book(kind, amount){ S.money += amount; S.fin[kind] = (S.fin[kind] || 0) + Math.abs(amount) }
/* очікуваний дохід за сезон при нинішніх будівлях і середньому місці */
function incomeEstimate(){
  const d = S.division;
  return V.tickets(d, S.buildings.stadium) + V.sponsor(d, S.buildings.commercial) + V.merch(d, S.buildings.commercial) + V.prizeAt8(d);
}
const wageCapNow = () => V.wageCap(S.division, incomeEstimate());
/* стадіон: місткість, скільки вболівальників хоче прийти, скільки грошей втрачаємо, коли він замалий */
function stadiumFill(){
  const d = S.division, cap = V.seats(S.buildings.stadium), want = V.fans(d);
  const lostMoney = Math.max(0, (V.tickets(d, Math.round(V.need(d) + 2)) - V.tickets(d, S.buildings.stadium)) / 15);
  return { cap, want, fill: Math.min(1, want / cap), lost: Math.max(0, want - cap), lostMoney };
}
function stadiumLine(){
  if (M.hm !== ME) return "";
  const f = stadiumFill();
  return `<p style="font-size:11.5px;color:${f.lost ? "var(--warn)" : "var(--dim)"};margin:6px 0 0">Стадіон: ${fmt(f.cap)} місць, заповнений на ${Math.round(f.fill * 100)} %.${f.lost ? ` Ще ≈ ${fmt(f.lost)} вболівальників не потрапили — втрачено ≈ ${fmt(f.lostMoney)} за матч. Час думати про більший стадіон.` : ""}</p>`;
}
/* травма минає за тур із таким шансом — медцентр прискорює */
const injuryHeal = lvl => .35 + .025 * Math.min(20, lvl);

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
/* підказка під будівлею: що саме вона дає зараз */
function buildingHint(id){
  const lvl = S.buildings[id], typ = Math.round(V.need(S.division));
  if (lvl >= 20 && id !== "stadium" && id !== "commercial") return "Понад 20 — престиж: користі майже немає.";
  if (id === "stadium"){ const f = stadiumFill();
    return `${fmt(f.cap)} місць, приходить ${fmt(Math.min(f.cap, f.want))} (${Math.round(f.fill * 100)} %).${f.lost ? ` Не вміщує ще ≈ ${fmt(f.lost)} — це ≈ ${fmt(f.lostMoney)} за домашній матч.` : " Більший стадіон уже не додасть квитків, лише репутацію."}`; }
  if (id === "commercial")
    return `Для Д${S.division} типовий рівень ${typ}. Грошей додають рівні до ${typ + 2}, вище — вже нічого.`;
  if (id === "training") return `Гравці розкривають ≈ ${Math.round(Math.min(1, (V.kBase(lvl) + V.MATCH_K) / 1.1) * 100)} % таланту.`;
  if (id === "academy"){ const ch = starChances(lvl), s = ch.reduce((a, b) => a + b, 0);
    return `Слотів ${academySlots(lvl)}. Шанс на тризіркового й кращого — ${Math.round(ch.slice(2).reduce((a, b) => a + b, 0) / s * 100)} %.` }
  if (id === "scouts") return `Звітів скаута за сезон: ${scoutReportsFor(lvl)}.`;
  if (id === "medical") return `Травма минає за тур із шансом ${Math.round(injuryHeal(lvl) * 100)} %.`;
  return "";
}
function renderInfra(){
  const d = S.division;
  $("#infraSub").textContent = `Бюджет ${fmt(S.money)} · дохід за сезон ≈ ${fmt(incomeEstimate())}: квитки ${fmt(V.tickets(d, S.buildings.stadium))}, спонсор ${fmt(V.sponsor(d, S.buildings.commercial))}, атрибутика ${fmt(V.merch(d, S.buildings.commercial))}, призові на 8 місці ${fmt(V.prizeAt8(d))} · зарплати ${fmt(ME.wageBill())} зі стелі ${fmt(wageCapNow())}`;
  $("#bgrid").innerHTML = BUILDINGS.map(b => {
    const lvl = S.buildings[b.id], cost = V.buildCost(lvl + 1), why = canBuild(b.id);
    return `<div class="bcard">
      <div class="h"><svg viewBox="0 0 24 24">${BICON[b.id]}</svg><b>${b.name}</b><span class="lv">${lvl}</span></div>
      <p>${b.desc} ${buildingHint(b.id)}</p>
      <div class="bar"><i style="width:${Math.min(100, lvl / 20 * 100)}%"></i></div>
      <div class="foot">
        <span class="cost ${S.money < cost ? "no" : ""}">${fmt(cost)} · ${V.buildHours(lvl + 1)} год</span>
        <button class="btn sm" data-b="${b.id}" ${why ? "disabled" : ""}>${why || (lvl >= 20 ? "Престиж" : "Підняти")}</button>
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
  book("build", -V.buildCost(lvl));
  S.queue.push({ id, lvl, endAt: S.test.on ? Date.now() : Date.now() + V.buildHours(lvl) * MIN_PER_HOUR });
  addNews("build", `${BUILDINGS.find(b => b.id === id).name}: почалось будівництво рівня ${lvl}`);
  if (S.test.on) processQueue();
  renderInfra(); renderTop(); save();
}
/* добудовані рівні: раз на секунду, а в режимі перевірки — одразу після замовлення */
function processQueue(){
  let done = false;
  S.queue = S.queue.filter(q => {
    if (Date.now() >= q.endAt){
      S.buildings[q.id] = q.lvl; done = true;
      addNews("build", `${BUILDINGS.find(b => b.id === q.id).name} піднято до рівня ${q.lvl}`);
      return false;
    }
    return true;
  });
  if (done){ save(); renderTop(); if (page === "home") renderHome() }
  if (page === "infra"){ done ? renderInfra() : renderQueue() }
  if (done && page === "academy") renderAcademyPage();
}
setInterval(processQueue, 1000);

/* =======================================================================
   СКАУТИНГ (ОСНОВА 5.3)
   Про гравця з іншого дивізіону й кандидата в академію спершу видно лише
   діапазон зірок і приблизну силу. Перший звіт скаута відкриває зірки,
   другий — точну силу й межу. Звітів на сезон дає скаутський центр.
   kn: 0 — діапазон, 1 — зірки, 2 або немає — усе відомо.
   ======================================================================= */
const scoutReportsFor = lvl => 2 + Math.floor((Math.min(20, lvl) - 1) / 2);
function scoutLeft(){
  if (!S.scout || S.scout.season !== S.season) S.scout = { season: S.season, left: scoutReportsFor(S.buildings.scouts) };
  return S.scout.left;
}
function makeRange(p){
  const s = p.stars(), w = S.buildings.scouts >= 5 ? 1 : 2;
  let lo = s - V.ri(0, w), hi = lo + w;
  if (hi > 6){ hi = 6; lo = 6 - w } if (lo < 1){ lo = 1; hi = 1 + w }
  p.sr = [lo, hi]; p.ap = Math.round((p.power() + V.rf(-3, 3)) / 5) * 5; p.kn = 0;
}
const known = p => p.kn == null || p.kn >= 2;
function starsView(p){ return p.kn === 0 ? `<span class="rngst">${p.sr[0]}–${p.sr[1]} ★</span>` : stars(p) }
const powShown = p => known(p) ? p.power() : p.ap;
const powView = p => known(p) ? String(Math.round(p.power())) : `≈${p.ap}`;
function scoutReport(p, after){
  if (known(p)) return;
  if (scoutLeft() <= 0){ toast("Звітів скаута на цей сезон не лишилось"); return }
  S.scout.left--; p.kn = (p.kn || 0) + 1;
  if (!S.scouted || S.scouted.season !== S.season) S.scouted = { season: S.season, map: {} };
  S.scouted.map[p.name] = p.kn;
  addNews("eye", p.kn === 1 ? `Скаут: ${p.name} — ${p.stars()} ★` : `Скаут: ${p.name} — сила ${Math.round(p.power())}, межа ${Math.round(p.pot)}`);
  save(); if (after) after();
}

/* =======================================================================
   АКАДЕМІЯ (ОСНОВА 5)
   3–5 слотів залежно від рівня академії. Раз на сезон скаут приносить набір
   із 6–8 кандидатів 16 років — обираєш, кого взяти на вільні слоти. Нових
   кандидатів посеред сезону немає, тож відраховувати «до зіркового» марно.
   У академії сидять 2 сезони, продати звідти не можна.
   ======================================================================= */
const ACAD_ROLES = Object.keys(V.ROLES);
function academySlots(lvl = S.buildings.academy){
  return Math.max(3, Math.min(5, 3 + Math.floor((Math.min(20, lvl) - 1) / 5)));
}
/* Шанс на кількість зірок (1..6) залежно від рівня академії; між опорними рівнями — плавно.
   З 15-го рівня однозіркових немає, на 20-му — від трьох зірок. */
const ACAD_ANCH = [
  [1,  [60, 30,  9,  1,  .05, .005]],
  [5,  [35, 38, 22,  4.5, .4, .02]],
  [10, [12, 30, 43, 12, 2.5, .5]],
  [15, [ 0, 15, 55, 23, 6,  1]],
  [20, [ 0,  0, 55, 32, 10, 3]],
];
function starChances(lvl){
  lvl = Math.max(1, Math.min(20, lvl));
  for (let i = 0; i < ACAD_ANCH.length - 1; i++){
    const [a, wa] = ACAD_ANCH[i], [b, wb] = ACAD_ANCH[i + 1];
    if (lvl <= b){ const t = (lvl - a) / (b - a); return wa.map((x, k) => x + (wb[k] - x) * t) }
  }
  return ACAD_ANCH[ACAD_ANCH.length - 1][1];
}
/* юнак: yearsLeft 2 — щойно прийшов (16 років), 0 — уже готовий (18) */
function genYouth(yearsLeft){
  const isGK = V.R() < 1 / 7;
  const role = isGK ? "gk" : V.pick(ACAD_ROLES);
  const st = V.wpick([1, 2, 3, 4, 5, 6], starChances(S.buildings.academy));
  const [lo, hi] = V.LIM_BAND[st - 1];
  const lim = V.rf(lo, hi), age = 18 - yearsLeft;
  const pk = V.PEAK[V.ROLE_POS[role]] ?? 25.5;
  return new V.P(V.uname(), role, V.lineAt(lim, pk, age) * V.rf(0.85, 1.0), isGK, age, 0.30, lim);
}
function newIntake(){
  S.academy.offers = Array.from({ length: V.ri(6, 8) }, () => { const p = genYouth(2); makeRange(p); return p });
}
function stockAcademyAtFounding(){
  /* один уже готовий — є кого підписати в перший сезон; решту слотів обираєш із набору */
  S.academy.candidates = [{ p: genYouth(0), yearsLeft: 0 }];
  newIntake();
}
function ageAcademyOneSeason(){
  S.academy.candidates.forEach(c => { c.yearsLeft = Math.max(0, c.yearsLeft - 1) });
  newIntake();
}
function enroll(i){
  if (S.academy.candidates.length >= academySlots()){ toast("Вільних слотів в академії немає"); return }
  const p = S.academy.offers.splice(i, 1)[0]; if (!p) return;
  p.kn = null;                                   // своїх вихованців знаєш повністю
  S.academy.candidates.push({ p, yearsLeft: 2 });
  addNews("eye", `${p.name} (${p.stars()} ★) узятий в академію.`);
  renderAcademyPage(); save();
}
function signCandidate(i){
  const c = S.academy.candidates[i];
  if (!c || c.yearsLeft > 0) return;
  contractSheet(c.p, { title: `Підписати з академії: ${c.p.name}`, onSign: (years, wage) => {
    const k = S.academy.candidates.indexOf(c); if (k === -1) return;
    signAcademy(c, years, wage);
    addNews("eye", `${c.p.name} з академії підписаний в основну команду: контракт на ${years} ${yrs(years)}, з.п. ${fmt(wage)}.`);
    renderAcademyPage(); if (page === "team") renderTeam(); save();
  } });
}
function signAcademy(c, years, wage){
  c.p.ss = c.p.power(); c.p.wg = wage; c.p.ct = S.season + years - 1; c.p.js = S.season;
  ME.bench.push(c.p);
  S.academy.candidates.splice(S.academy.candidates.indexOf(c), 1);
}

/* =======================================================================
   УМОВИ КОНТРАКТУ (ПЛАН 43)
   Строк 1–4 роки: коротший дорожчий за рік, довший дешевший — ×1,15 · ×1,07 · ×1,00 · ×0,95.
   Новий контракт іде «до кінця сезону ct», поточний сезон входить у строк;
   продовження починається з наступного сезону.
   ======================================================================= */
function contractSheet(p, o){
  const base = o.baseWage ?? V.wageFor(p);
  const today = o.today || 0;
  const oldWage = o.renew ? V.wageOf(p) : 0;
  const rows = [1, 2, 3, 4].map(y => {
    const w = Math.round(base * V.CONTRACT_K[y]);
    const why = y > maxYears(p) ? `ветерану — щонайбільше ${maxYears(p)} ${yrs(maxYears(p))}` : S.money < today ? "бракує грошей" : ME.wageBill() - oldWage + w > wageCapNow() ? "понад стелю з.п." : "";
    return { y, w, why };
  });
  const until = y => o.renew ? S.season + y : S.season + y - 1;
  $("#sheet").innerHTML = `<h2>${o.title}</h2>
    <div class="s">${p.pos()} · ${p.age} ${yrs(p.age)} · сила ${powView(p)} · ${starsView(p)}</div>
    ${lastCareer(p) ? `<div class="note"><h3>Останній сезон кар'єри</h3><p>Наприкінці цього сезону ${p.name} завершить кар'єру. Контракт — лише до кінця сезону.</p></div>` : ""}
    ${o.note || ""}
    ${today ? `<div class="attrs" style="margin-top:6px;grid-template-columns:1fr">${o.costLines || ""}
      <div class="at"><span><b style="color:var(--gold-hi)">Сьогодні платиш</b></span><u style="width:auto;color:var(--gold-hi)">${fmt(today)}</u></div></div>` : ""}
    <div class="lab" style="margin-top:6px">Строк контракту · коротший дорожчий за рік</div>
    <div class="cterms">${rows.map(r => `<button class="cterm" data-y="${r.y}" ${r.why ? "disabled" : ""}>
        <b>${r.y} ${yrs(r.y)}</b><i>до кінця сезону ${until(r.y)}</i>
        <u>${fmt(r.w)} / сезон</u><s>${r.why || "разом " + fmt(r.w * r.y)}</s></button>`).join("")}</div>
    <p style="font-size:11.5px;color:var(--dim);margin:10px 0 0">Вільно в стелі зарплат: ${fmt(Math.max(0, wageCapNow() - ME.wageBill() + oldWage))} · бюджет ${fmt(S.money)}</p>
    <button class="btn ghost sm" style="margin-top:12px" onclick="closeSheet()">Скасувати</button>`;
  $$("#sheet .cterm").forEach(b => b.onclick = () => {
    const r = rows.find(x => x.y === +b.dataset.y); if (!r || r.why) return;
    closeSheet();
    if (o.renew){
      p.wg = r.w; p.ct = until(r.y); p.wagePrem = undefined;
      addNews("cap", `${p.name}: контракт продовжено до кінця сезону ${p.ct}, з.п. ${fmt(r.w)}`);
      save(); if (page === "team") renderTeam();
    } else o.onSign(r.y, r.w);
  });
  openSheet();
}
function releaseCandidate(i){
  const c = S.academy.candidates[i];
  if (!c) return;
  S.academy.candidates.splice(i, 1);
  addNews("cap", `${c.p.name} відрахований з академії. Слот вільний — можна взяти когось із набору цього сезону.`);
  renderAcademyPage(); save();
}
function renderAcademy(){
  const box = $("#acadGrid"); if (!box) return;
  const ch = starChances(S.buildings.academy), sum = ch.reduce((a, b) => a + b, 0);
  const good = Math.round(ch.slice(2).reduce((a, b) => a + b, 0) / sum * 100);
  $("#acadSub").textContent = `${S.academy.candidates.length} / ${academySlots()} слотів · академія рівня ${S.buildings.academy}: шанс на тризіркового й кращого — ${good} %`;
  box.innerHTML = S.academy.candidates.length ? S.academy.candidates.map((c, i) => {
    const ready = c.yearsLeft <= 0;
    return `<div class="acad-card">
      <div class="h"><div class="pos">${c.p.pos()}</div><b>${c.p.name}</b></div>
      <p>${c.p.age} ${yrs(c.p.age)} · ${V.ROLE_UA[c.p.role]} · сила ${f1(c.p.power())} · межа ${Math.round(c.p.pot)} (рівень Д${V.divOf(c.p.pot)}) · ${stars(c.p)}</p>
      <div class="status ${ready ? "ready" : "wait"}">${ready ? "готовий підписати" : `ще ${c.yearsLeft} ${c.yearsLeft === 1 ? "сезон" : "сезони"} в академії`}</div>
      <div class="row">
        <button class="btn sm ${ready ? "" : "ghost"}" data-sign="${i}" ${ready ? "" : "disabled"}>Підписати</button>
        <button class="btn ghost sm" data-release="${i}">Відрахувати</button>
      </div>
    </div>`;
  }).join("") : `<div class="acad-empty">В академії поки нікого. Обери кандидатів із набору нижче.</div>`;
  $$("#acadGrid [data-sign]").forEach(b => b.onclick = () => signCandidate(+b.dataset.sign));
  $$("#acadGrid [data-release]").forEach(b => b.onclick = () => releaseCandidate(+b.dataset.release));
  const free = academySlots() - S.academy.candidates.length, offers = S.academy.offers || [];
  $("#offerSub").textContent = offers.length
    ? `${offers.length} кандидатів від скаута, 16 років. Вільних слотів: ${free}. Звітів скаута лишилось: ${scoutLeft()}. Решта піде, коли прийде новий набір.`
    : `Набір цього сезону розібрано. Новий прийде на початку наступного сезону.`;
  $("#acadOffers").innerHTML = offers.map((p, i) => `<div class="acad-card">
      <div class="h"><div class="pos">${p.pos()}</div><b>${p.name}</b></div>
      <p>${p.age} ${yrs(p.age)} · ${V.ROLE_UA[p.role]} · сила ${powView(p)} · ${starsView(p)}${known(p) ? ` · межа ${Math.round(p.pot)}` : ""}</p>
      <div class="row">
        <button class="btn sm ${free > 0 ? "" : "ghost"}" data-enroll="${i}" ${free > 0 ? "" : "disabled"}>Взяти</button>
        ${known(p) ? "" : `<button class="btn ghost sm" data-scout="${i}" ${scoutLeft() > 0 ? "" : "disabled"}>Звіт скаута</button>`}
      </div>
    </div>`).join("");
  $$("#acadOffers [data-enroll]").forEach(b => b.onclick = () => enroll(+b.dataset.enroll));
  $$("#acadOffers [data-scout]").forEach(b => b.onclick = () => scoutReport(offers[+b.dataset.scout], renderAcademyPage));
}
function renderAcademyPage(){
  renderAcademy();
  $("#scoutLvl").textContent = S.buildings.scouts;
  $("#scoutNote").textContent = `Скаутський центр дає ${scoutReportsFor(S.buildings.scouts)} звітів за сезон, лишилось ${scoutLeft()}. Перший звіт про гравця відкриває зірки, другий — точну силу й межу. Звіти діють і на кандидатів академії, і на гравців інших дивізіонів на ринку.${S.buildings.scouts >= 5 ? "" : " З 5-го рівня початковий діапазон зірок вужчий."}`;
}

/* =======================================================================
   РИНОК (ОСНОВА 4)
   Свій дивізіон — справжні гравці із запасу суперників (про них усе відомо).
   Інші дивізіони й вільні агенти — через скаутинг. Хто погоджується перейти,
   рахується в дивізіонах: стеля — твій дивізіон з поправкою на стадіон.
   ======================================================================= */
let marketView = "buy";
const MF = { pos: "all", min: "", max: "", stars: 0, sort: "power", only: false };
const tierOf = p => V.signTier(p, S.division, S.buildings.stadium);
/* до якої сили гравці погоджуються без надбавок */
const marketCeiling = () => V.strengthAt(V.ceilLevel(S.division, S.buildings.stadium));
function needText(p){ const s = V.stadiumFor(p, S.division); return s <= 20 ? `потрібен стадіон ${s}` : "лише з вищого дивізіону" }

const OTHER_CLUBS = ["Ла Роса","Альтаміра","Ріо Секо","Монтанья","Пуерто","Камповерде",
  "Сан-Ремо","Вальдес","Естрелья","Ель Пасо","Норте","Костаблан","Медіна","Сьєрра","Аврора"];
let POOL = null, POOL_KEY = "";
const takenNow = () => S.taken && S.taken.season === S.season ? S.taken.names : [];
function markTaken(name){
  if (!S.taken || S.taken.season !== S.season) S.taken = { season: S.season, names: [] };
  S.taken.names.push(name);
}
/* гравець ринку з іншого дивізіону: вік, сила й зірки узгоджені, як у суперників */
function marketPlayer(d, age){
  const gk = V.R() < .12, role = gk ? "gk" : V.SPECS[Math.floor(V.R() * V.SPECS.length)][1];
  const lvl = levelFor(d) * V.rf(0.85, 1.06);
  const p = new V.P(V.uname(), role, lvl, gk, V.fitAge(lvl, gk ? "gk" : role, age ?? V.ri(18, 33), V.limCapFor(lvl)));
  makeRange(p); return p;
}
/* Ринок інших дивізіонів однаковий до кінця сезону, навіть після перезапуску:
   інакше перезапуском можна було б перекидати список і зведення скаутів. */
function buildPool(){
  V.reseed(777 + S.season * 7919 + S.division * 131 + S.club.name.length);
  const out = [];
  for (let d = Math.max(1, S.division - 3); d <= Math.min(16, S.division + 2); d++){
    if (d === S.division) continue;
    for (let i = 0; i < (d < S.division ? 7 : 4); i++) out.push({ club: V.pick(OTHER_CLUBS), div: d, p: marketPlayer(d) });
  }
  V.reseed(Date.now() % 1000000007);
  const map = S.scouted && S.scouted.season === S.season ? S.scouted.map : {};
  out.forEach(r => { if (map[r.p.name] != null) r.p.kn = map[r.p.name] });
  return out.filter(r => !takenNow().includes(r.p.name));
}
function pool(){
  const key = `${S.season}-${S.division}`;
  if (!POOL || POOL_KEY !== key){ POOL = buildPool(); POOL_KEY = key }
  return POOL;
}
/* вільні агенти — справжні гравці, у яких скінчився контракт (ведуться в S.fa) */
const faRows = () => S.fa.map(r => ({ club: r.from ? `вільний агент · був у «${r.from}»` : "вільний агент", div: r.div, p: r.p, free: true, fa: r }));

/* умови угоди: трансферна сума з комісією, премія за підпис, зарплата за контрактом на 3 роки */
function dealOf(r){
  const g = tierOf(r.p), value = Math.round(V.valueOf(r.p));
  const price = r.free ? 0 : value, comm = Math.round(price * V.transferCommission(price));
  const bonus = Math.round(value * (g.bonus + (r.free ? .5 : 0)));
  const wage = Math.round(V.wageFor(r.p) * g.prem);
  return { g, value, price, comm, bonus, total: price + comm + bonus, wage };
}
const capRoom = () => wageCapNow() - ME.wageBill();
const posGroup = p => { const x = p.gk ? "GK" : (V.ROLE_POS[p.role] || "");
  return p.gk ? "gk" : ["ЦЗ","КЗ"].includes(x) ? "def" : ["ОП","ЦП","АП"].includes(x) ? "mid" : "att" };
/* зірки, які ти бачиш: точні, якщо скаут уже відкрив, інакше — діапазон */
const starsSeen = p => known(p) || p.kn === 1 ? [p.stars(), p.stars()] : p.sr;
function marketListings(src){
  const out = src === "free" ? faRows() : [];
  if (src !== "free"){
    LEAGUE.forEach(t => { if (t !== ME) t.bench.forEach(p => out.push({ club: t.name, div: S.division, team: t, p })) });
    pool().forEach(r => out.push(r));
    S.sys.forEach(r => out.push({ club: "продає система", div: r.div, p: r.p, sys: r }));
  }
  const min = +MF.min || 0, max = +MF.max || 999;
  const rows = out.filter(r => {
    const pw = powShown(r.p);
    if (pw < min || pw > max) return false;
    if (MF.pos !== "all" && posGroup(r.p) !== MF.pos) return false;
    if (MF.stars && starsSeen(r.p)[1] < MF.stars) return false;       // може мати стільки зірок
    if (MF.only && !tierOf(r.p).ok) return false;
    return true;
  });
  const key = { power: r => -powShown(r.p), price: r => dealOf(r).total, age: r => r.p.age,
                stars: r => -(starsSeen(r.p)[0] + starsSeen(r.p)[1]) / 2 };
  return rows.sort((a, b) => key[MF.sort](a) - key[MF.sort](b));
}
const avatar = p => `<div class="av">${p.face ? `<img src="${p.face}" alt="">` : `<span>${p.pos()}</span>`}</div>`;
function mcard(r, i){
  const k = dealOf(r), g = k.g, p = r.p;
  const btn = !g.ok ? `<button class="btn ghost sm" disabled>не піде</button>`
    : Math.round(k.wage * V.CONTRACT_K[4]) > capRoom() ? `<button class="btn sm" disabled>понад стелю з.п.</button>`
    : S.money < k.total ? `<button class="btn sm" disabled>нема грошей</button>`
    : `<button class="btn sm" data-deal="${i}">${g.offer ? "Умови" : r.free ? "Підписати" : "Купити"}</button>`;
  return `<div class="mcard">
    <div class="mtop">${avatar(p)}
      <div class="mn"><b>${p.name}</b><i>${p.pos()} · ${V.ROLE_UA[p.role]}</i>${starsView(p)}</div>
      <div class="big"><b>${powView(p)}</b><i>сила</i></div>
      <div class="big"><b>${p.age}</b><i>вік</i></div>
    </div>
    <div class="mmeta"><span>${r.club} · Д${r.div}</span><span class="gate ${g.cls}" title="${g.cls === "ok" ? "" : needText(p)}">${g.tag}</span></div>
    ${g.cls === "ok" ? "" : `<div class="mneed">${needText(p)}</div>`}
    ${lastCareer(p) ? `<div class="mneed ctw">останній сезон кар'єри — наприкінці сезону завершить</div>` : ""}
    <div class="mfoot"><div class="price"><b>${fmt(k.total)}</b><i>вартість ${fmt(k.value)} · з.п. ${fmt(k.wage)} / сезон</i></div>${btn}</div>
    ${known(p) ? "" : `<b class="slink" data-scout="${i}">звіт скаута</b>`}
  </div>`;
}
function renderMarket(){
  $("#marketSub").textContent = `Без надбавок погоджуються гравці до сили ${Math.round(marketCeiling())} · бюджет ${fmt(S.money)} · вільно в зарплатах ${fmt(Math.max(0, capRoom()))} · звітів скаута ${scoutLeft()}`;
  $("#mfilters").hidden = marketView === "sell";
  const box = $("#marketBody");
  if (marketView !== "sell"){
    const rows = marketListings(marketView);
    box.innerHTML = rows.length ? `<div class="mgrid">${rows.map(mcard).join("")}</div>`
      : `<div class="mempty">${marketView === "free" && !S.fa.length
          ? "Вільних агентів зараз немає. Вони з'являються на початку сезону — це гравці, у яких скінчився контракт."
          : "За цими фільтрами нікого немає. Спробуй розширити діапазон сили чи зірок."}</div>`;
    $$("#marketBody [data-deal]").forEach(b => b.onclick = () => openDeal(rows[+b.dataset.deal]));
    $$("#marketBody [data-scout]").forEach(b => b.onclick = () => scoutReport(rows[+b.dataset.scout].p, renderMarket));
  } else {
    const mine = ME.bench;
    box.innerHTML = mine.length ? `<div class="mgrid">${mine.map((p, i) => `<div class="mcard">
        <div class="mtop">${avatar(p)}
          <div class="mn"><b>${p.name}</b><i>${p.pos()} · ${V.ROLE_UA[p.role]}</i>${stars(p)}</div>
          <div class="big"><b>${Math.round(p.power())}</b><i>сила</i></div>
          <div class="big"><b>${p.age}</b><i>вік</i></div>
        </div>
        <div class="mmeta"><span>контракт до кінця сезону ${p.ct ?? "—"}</span><span>з.п. ${fmt(V.wageOf(p))}</span></div>
        <div class="mfoot"><div class="price"><b>+${fmt(sysPrice(p))}</b><i>90 % від ціни ${fmt(V.valueOf(p))}</i></div>
          ${joinedNow(p) ? `<button class="btn ghost sm" disabled>з наступного сезону</button>` : `<button class="btn ghost sm" data-sell="${i}">Продати системі</button>`}</div>
      </div>`).join("")}</div>
      <p class="sub" style="margin:12px 0 0">Продаж системі — миттєво, за 90 % ціни, без комісії: щоб звільнити зарплату чи місце. Хто прийшов у клуб цього сезону, того можна продати лише з наступного. Продаж іншим клубам за свою ціну з'явиться разом із пропозиціями.</p>`
      : `<div class="mempty">У запасі нікого немає — продавати нема кого. Гравця з основи спершу перетягни на лаву в «Команді».</div>`;
    $$("#marketBody [data-sell]").forEach(b => b.onclick = () => askSell(mine[+b.dataset.sell]));
  }
}
$$("#marketTabs button").forEach(b => b.onclick = () => {
  marketView = b.dataset.v;
  $$("#marketTabs button").forEach(x => x.classList.toggle("on", x === b));
  renderMarket();
});
$("#fPos").onchange   = e => { MF.pos = e.target.value; renderMarket() };
$("#fStars").onchange = e => { MF.stars = +e.target.value; renderMarket() };
$("#fSort").onchange  = e => { MF.sort = e.target.value; renderMarket() };
$("#fOnly").onchange  = e => { MF.only = e.target.checked; renderMarket() };
$("#fMin").oninput    = e => { MF.min = e.target.value; renderMarket() };
$("#fMax").oninput    = e => { MF.max = e.target.value; renderMarket() };

/* угода: вікно контракту з сумою, яку платиш сьогодні, і вибором строку */
function openDeal(row){
  const k = dealOf(row);
  if (!k.g.ok){ toast("Гравець не піде в клуб нашого рівня"); return }
  const note = k.g.offer ? `<div class="note"><h3>Він на два дивізіони вище за твою стелю</h3>
      <p>Піти в клуб нижчого рівня погоджується лише на особливих умовах: премія за підпис і вища зарплата. Без надбавок погодився б, якщо ${needText(row.p)}.</p></div>`
    : k.g.prem > 1 ? `<div class="note"><h3>За більшу зарплату</h3><p>Він сильніший за твою стелю, тож просить зарплату на ${Math.round((k.g.prem - 1) * 100)} % вищу.</p></div>` : "";
  const line = (t, v) => v ? `<div class="at"><span>${t}</span><u style="width:auto">${fmt(v)}</u></div>` : "";
  contractSheet(row.p, {
    title: `${row.free ? "Підписати" : "Купити"}: ${row.p.name}`, baseWage: k.wage, today: k.total, note,
    costLines: line("Трансферна сума з комісією", k.price + k.comm) + line(row.free ? "Премія за підпис (вільний агент)" : "Премія за підпис", k.bonus),
    onSign: (years, wage) => completeBuy(row, years, wage),
  });
}
function completeBuy(row, years, wage){
  const k = dealOf(row);
  if (S.money < k.total){ toast("Бракує грошей"); return false }
  if (row.fa){ const i = S.fa.indexOf(row.fa); if (i === -1) return false; S.fa.splice(i, 1) }
  else if (row.sys){ const i = S.sys.indexOf(row.sys); if (i === -1) return false; S.sys.splice(i, 1) }
  else if (row.team){                              // свій дивізіон — справжній клуб
    const idx = row.team.bench.indexOf(row.p); if (idx === -1){ renderMarket(); return false }
    row.team.bench.splice(idx, 1); markTaken(row.p.name);
  } else {                                         // інший дивізіон
    const i = POOL.indexOf(row); if (i === -1){ renderMarket(); return false }
    POOL.splice(i, 1); markTaken(row.p.name);
  }
  row.p.wg = wage; row.p.ct = S.season + years - 1; row.p.kn = null; row.p.ss = row.p.power(); row.p.wagePrem = undefined;
  row.p.paid = k.total; row.p.js = S.season;
  ME.bench.push(row.p);
  book("buys", -k.total);
  addNews("cap", `${row.free ? "Підписано вільного агента" : "Куплено"} ${row.p.name} (Д${row.div}) за ${fmt(k.total)}: контракт на ${years} ${yrs(years)}, з.п. ${fmt(wage)}`);
  if (page === "market") renderMarket(); renderTop(); save();
  return true;
}
/* «Продати системі»: миттєво, 90 % ціни, без комісії (ПЛАН 40).
   Гравця, який прийшов у клуб цього сезону (куплений, вільний агент, навіть з академії),
   продати не можна до наступного сезону — рішення Марії 28.09. */
const joinedNow = p => p.js === S.season;
const sysPrice = p => Math.round(V.valueOf(p) * .9);
function askSell(p){
  $("#sheet").innerHTML = `<h2>Продати ${p.name}?</h2>
    <div class="s">${p.pos()} · ${p.age} ${yrs(p.age)} · сила ${Math.round(p.power())}</div>
    <p style="font-size:13px;color:var(--muted);margin:0 0 14px">Система купить його одразу за <b style="color:var(--gold-hi)">${fmt(sysPrice(p))}</b> — це 90 % ціни. Зарплата ${fmt(V.wageOf(p))} більше не списуватиметься. Скасувати не можна.</p>
    <button class="btn sm" id="sellYes">Продати</button>
    <button class="btn ghost sm" style="margin-left:8px" onclick="closeSheet()">Скасувати</button>`;
  $("#sellYes").onclick = () => { closeSheet(); sellSystem(p) };
  openSheet();
}
function sellSystem(p){
  const bi = ME.bench.indexOf(p);
  if (bi === -1 || joinedNow(p)) return;
  const net = sysPrice(p);
  ME.bench.splice(bi, 1);
  book("sales", net);
  /* гравець не зникає: система продає його далі за повну вартість — гроші з гри витікають, а не друкуються */
  p.ct = undefined; p.wg = undefined; p.js = undefined; p.paid = undefined; p.kn = null;
  S.sys.push({ p, div: S.division });
  addNews("cap", `Продано системі ${p.name} за ${fmt(net)}`);
  renderMarket(); if (page === "team") renderTeam(); renderTop(); save();
}

/* =======================================================================
   СВІТ
   Уся піраміда, по 16 команд у дивізіоні. Свій дивізіон — справжні суперники,
   які грають з тобою весь сезон; інші — команди комп'ютера, які щосезону
   оновлюються під рівень свого дивізіону.
   ======================================================================= */
let worldDiv = null;
const WORLD = {};
function worldTeams(d){
  if (d === S.division) return LEAGUE;
  const key = `${S.season}-${d}`;
  if (!WORLD[key]){
    V.reseed(424242 + S.season * 131 + d * 7919);
    const names = [...new Set([...V.CLUBS, ...OTHER_CLUBS])].filter(n => n !== ME.name);
    for (let i = names.length - 1; i > 0; i--){ const j = Math.floor(V.R() * (i + 1)); [names[i], names[j]] = [names[j], names[i]] }
    WORLD[key] = names.slice(0, 16).map(n => new V.Team(n, levelFor(d) * V.rf(0.82, 1.1)));
    V.reseed(Date.now() % 1000000007);
  }
  return WORLD[key];
}
function renderWorld(){
  if (worldDiv == null) worldDiv = S.division;
  $("#worldTabs").innerHTML = Array.from({ length: 12 }, (_, i) => i + 1).map(d =>
    `<button class="${d === worldDiv ? "on" : ""}" data-d="${d}">Д${d}${d === S.division ? " ●" : ""}</button>`).join("");
  $$("#worldTabs button").forEach(b => b.onclick = () => { worldDiv = +b.dataset.d; renderWorld() });
  const teams = worldTeams(worldDiv);
  const all = teams.flatMap(t => t.all());
  const st = [0, 0, 0, 0, 0, 0, 0]; all.forEach(p => st[p.stars()]++);
  const avgAge = all.reduce((s, p) => s + p.age, 0) / all.length;
  const avgXI = teams.reduce((s, t) => s + t.rate(), 0) / teams.length;
  $("#worldSub").textContent = `Дивізіон ${worldDiv}${worldDiv === S.division ? " — твій" : ""} · стеля сили ${V.CEIL[worldDiv]} · сезон ${S.season}`;
  const rows = teams.map((t, i) => ({ t, i, r: t.rate(), age: t.all().reduce((s, p) => s + p.age, 0) / t.all().length,
    top: t.all().filter(p => p.stars() >= 3).length })).sort((a, b) => b.r - a.r);
  $("#worldBody").innerHTML = `<p class="wsum">Гравців ${all.length} · середня сила основи ${f1(avgXI)} · середній вік ${f1(avgAge)}<br>
    Зірки: ${[1, 2, 3, 4, 5, 6].map(i => `${i}★ — ${Math.round(st[i] / all.length * 100)} %`).join(" · ")}</p>
    <table><thead><tr><th class="l">Клуб</th><th>Сила основи</th><th>Вік</th><th>3★ і вище</th></tr></thead><tbody>
    ${rows.map(x => `<tr class="${x.t === ME ? "me" : ""}" data-i="${x.i}"><td class="l">${x.t.name}</td>
      <td>${f1(x.r)}</td><td>${f1(x.age)}</td><td>${x.top}</td></tr>`).join("")}</tbody></table>
    <p class="wsum" style="margin-top:10px">${worldDiv === S.division
      ? "Це твої справжні суперники: вони грають з тобою весь сезон."
      : "Інші дивізіони — команди комп'ютера: щосезону вони оновлюються під рівень свого дивізіону."} Тап по клубу — його гравці.</p>`;
  $$("#worldBody tr[data-i]").forEach(tr => tr.onclick = () => worldTeamSheet(teams[+tr.dataset.i]));
}
function worldTeamSheet(t){
  const ps = t.all().sort((a, b) => b.power() - a.power());
  $("#sheet").innerHTML = `<h2>${t.name}</h2><div class="s">сила основи ${f1(t.rate())} · Д${worldDiv}</div>
    <div class="plist">${ps.map(p => `<div class="p"><div class="pos">${p.pos()}</div>
      <div class="pn"><b>${p.name}</b><i>${p.age} ${yrs(p.age)} · ${stars(p)} · межа ${Math.round(p.pot)}</i></div>
      <div class="pv"><b>${f1(p.power())}</b></div></div>`).join("")}</div>
    <button class="btn ghost sm" style="margin-top:14px" onclick="closeSheet()">Закрити</button>`;
  openSheet();
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
  openSheet();
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
    openSheet();
    $("#doReset").onclick = () => { localStorage.removeItem(SAVE_KEY); location.reload() };
  };
  $("#testState").textContent = S.test.on ? "увімкнено" : "вимкнено";
  $("#testOn").textContent = S.test.on ? "Вимкнути" : "Увімкнути";
  $("#testWin").textContent = `Завжди перемагати: ${S.test.win ? "так" : "ні"}`;
  $("#testOn").onclick = () => { S.test.on = !S.test.on; if (S.test.on) finishQueueNow(); renderSettings(); renderTop(); save() };
  $("#testWin").onclick = () => { S.test.win = !S.test.win; renderSettings(); save() };
  $("#testMoney").onclick = () => { S.money += 5000000; addNews("cap", "Режим перевірки: +5 000 000 на рахунок"); renderTop(); save() };
}
/* у режимі перевірки будівлі добудовуються одразу */
function finishQueueNow(){ S.queue.forEach(q => { q.endAt = Date.now() }); processQueue() }

/* =======================================================================
   МАТЧ
   ======================================================================= */
const M = { live:false, min:0, ep:0, N:70, ph:.5, timer:null, half:1, speed:1, over:false, hm:null, aw:null };
const PRESS = [["Низ",.85],["Сер",1],["Вис",1.18]];
const LINE  = [["Низ",.8],["Сер",1],["Вис",1.2]];

/* до стартового свистка — склад на полі з перетягуванням; після — живе поле */
function renderMatchPrep(){
  const prep = !M.live && !M.over;
  $("#mPrep").hidden = !prep; $("#pitch").hidden = prep;
  $("#sc-match").classList.toggle("prep", prep);
  if (prep) renderLineup($("#mPitch"), $("#mBench"));
  renderBench();
}
function openMatch(){
  const f = myFixture();
  M.hm = f.home; M.aw = f.away; M.hm.home = true; M.aw.home = false;
  M.hm.reset(); M.aw.reset();
  M.live = false; M.min = 0; M.ep = 0; M.half = 1; M.over = false; M.forced = false; M.N = V.ri(64, 76);
  const [a] = M.hm.zMid(), [b] = M.aw.zMid(); M.ph = a / (a + b);
  $("#mh").textContent = M.hm.name; $("#ma").textContent = M.aw.name;
  $("#mgh").textContent = 0; $("#mga").textContent = 0;
  $("#mclock").className = "clock paused"; $("#mclock").textContent = "до стартового свистка";
  $("#comm").innerHTML = "";
  $("#startBtn").textContent = "Стартовий свисток"; $("#startBtn").style.display = "";
  ME.press = 1; ME.line = 1; ME.presence = 0; ME.actions = 0;
  M.played = new Set(ME.onPitch());          // хто вийшов на поле — тому матч додає трохи росту
  initDots(); BALL.x = BALL.tx = .5; BALL.y = BALL.ty = .5;
  M.lastAct = null;
  renderCtrl(); renderBench(); updBonus(); drawPitch(); renderSpeed(); renderMatchPrep();
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
  if (!M.live) return;
  if (ME.actions >= 4){ say(M.min, `Тренерський штаб змінює ${kind}.`, "warn"); return }
  if (M.lastAct != null && M.min - M.lastAct < 15){
    say(M.min, `Тренерський штаб змінює ${kind}. До бонусу присутності зарахується дія не раніше ${M.lastAct + 15}-ї хвилини.`, "warn");
    return;
  }
  M.lastAct = M.min; ME.actions++; ME.presence = Math.min(.04, ME.actions * .01);
  updBonus(); say(M.min, `Тренерський штаб змінює ${kind}.`, "warn");
}
function updBonus(){
  $("#bval").textContent = `+${(ME.presence * 100).toFixed(1).replace(".", ",")} %`;
  $("#bcount").textContent = ME.actions
    ? `Зроблено дій: ${ME.actions} з 4. Далі надбавка не росте.`
    : "Кожна твоя дія під час матчу додає команді сили, якщо з попередньої минуло 15 хвилин матчу. Стеля — чотири дії.";
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
    ${inP.gk ? `<p style="font-size:11.5px;color:var(--dim);margin:0 0 8px">Воротар може замінити лише воротаря.</p>` : ""}
    <div class="plist">${(inP.gk ? ["GK"] : V.SLOTS.slice(1)).map(s => {
      const p = getP(s), fit = Math.round(inP.gk ? inP.power() : inP.powerIn(p.role));
      return `<div class="p" data-s="${s}"><div class="pos">${V.SLOT_POS[s]}</div>
        <div class="pn"><b>${p.name}</b><i>${V.SLOT_UA[s]} · ${p.injured ? '<span style="color:var(--bad)">травма</span> · ' : ""}свіжість ${Math.round(p.fresh * 100)} %</i></div>
        <div class="pv"><b>${Math.round(p.power())}</b><i style="font-style:normal;font-size:10px;color:${fit >= p.power() ? "var(--live)" : "var(--dim)"}">стане ${fit}</i></div></div>`;
    }).join("")}</div>
    <button class="btn ghost sm" style="margin-top:14px" onclick="closeSheet()">Скасувати</button>`;
  openSheet();
  $$("#sheet .p").forEach(el => el.onclick = () => {
    const s = el.dataset.s, outP = getP(s);
    setP(s, inP); ME.bench[i] = outP; ME.subsMade++;
    if (M.played) M.played.add(inP);
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
  M.played = new Set(ME.onPitch());                  // склад міг змінитись у підготовці
  renderMatchPrep();
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
  settleRound();
  setTimeout(showReport, 900);
  renderTop(); save();
}
/* Підсумок туру: мій результат, решта матчів туру, приріст від матчу, призові. */
function settleRound(){
  regResult(M.hm.name, M.aw.name, M.hm.goals, M.aw.goals, true);
  S.fixtures[(S.round - 1) % S.fixtures.length].forEach(([h, a]) => {
    if (h === ME.name || a === ME.name) return;
    const [gh, ga] = V.quickMatch(teamBy(h), teamBy(a));
    regResult(h, a, gh, ga, false);
  });
  /* матч додає росту тим, хто грав (без фокуса — просто ігрова практика);
     тренувальна база тут ні до чого — вона впливає лише на тренування */
  (M.played || new Set()).forEach(p => {
    p._mg = (p._mg || 0) + p.grow(p.slopeDay(ageF(p)) * V.MATCH_K, ageF(p));
  });
  /* квитки — лише за домашній матч (15 домашніх за сезон) */
  M.gate = M.hm === ME ? Math.round(V.tickets(S.division, S.buildings.stadium) / 15) : 0;
  if (M.gate) book("tickets", M.gate);
  const diff = M.hm === ME ? M.hm.goals - M.aw.goals : M.aw.goals - M.hm.goals;
  /* гроші за результат матчу: перемога 3 : нічия 1 : поразка 0,3 */
  M.pay = Math.round(V.matchPay(S.division, diff > 0 ? "w" : diff === 0 ? "d" : "l"));
  book("match", M.pay);
  addNews(diff > 0 ? "up" : "goal",
    `${diff > 0 ? "Перемога" : diff === 0 ? "Нічия" : "Поразка"} ${M.hm.goals}:${M.aw.goals}${M.gate ? ` — квитки ${fmt(M.gate)}` : ""}`);
  $("#startBtn").textContent = "Далі — наступний тур";
  $("#startBtn").style.display = "";
}
/* Режим перевірки: матч дня грається миттєво, одразу звіт. */
function playInstant(quiet){
  if (M.live) return;
  if (!M.hm) openMatch();
  if (M.over){ if (!quiet) showReport(); return }       // цей день уже зіграно
  V.quickMatch(M.hm, M.aw);
  M.forced = false;
  if (S.test.win){
    const home = M.hm === ME, mine = home ? M.hm : M.aw, opp = home ? M.aw : M.hm;
    if (mine.goals <= opp.goals){ mine.goals = opp.goals + 1; M.forced = true }
  }
  M.over = true; M.played = new Set(ME.onPitch());
  $("#mgh").textContent = M.hm.goals; $("#mga").textContent = M.aw.goals;
  $("#mclock").className = "clock paused"; $("#mclock").textContent = "зіграно миттєво";
  settleRound();
  if (!quiet){ showReport(); renderTop() }
  save();
}
/* Режим перевірки: догнати сезон до кінця — щодня тренування, матч, наступний день. */
function simSeason(){
  if (M.live) return;
  const s0 = S.season;
  let guard = 0;
  while (S.season === s0 && guard++ < 40){
    if (!trainedToday()) trainToday(true);
    playInstant(true);
    nextRound(true);
  }
  openMatch(); renderTop(); show("home"); save();
  seasonWindow();
}
function regResult(h, a, gh, ga, me){
  const H = S.table[h], A = S.table[a];
  H.gf += gh; H.ga += ga; A.gf += ga; A.ga += gh;
  if (gh > ga){ H.w++; A.l++; H.p += 3 } else if (gh < ga){ A.w++; H.l++; A.p += 3 } else { H.d++; A.d++; H.p++; A.p++ }
  S.results.unshift({ h, a, gh, ga, me, r: S.round });
  S.results = S.results.slice(0, 8);
}
/* гроші одного дня: квитки (удома), спонсор і атрибутика, зарплати, утримання */
function dayMoney(){
  return { sponsor: V.sponsor(S.division, S.buildings.commercial) / 30, merch: V.merch(S.division, S.buildings.commercial) / 30,
           wages: ME.wageBill() / 30, upkeep: V.upkeepSeason(S.division, levelsSum()) / 30 };
}
function showReport(){
  const mine = ME.onPitch().slice(1).concat([ME.gk]);
  const best = [...mine].sort((a, b) => b.rating - a.rating).slice(0, 4);
  const scored = mine.filter(p => p.goals > 0);
  const dm = dayMoney(), net = (M.gate || 0) + (M.pay || 0) + dm.sponsor + dm.merch - dm.wages - dm.upkeep;
  $("#sheet").innerHTML = `<h2>${M.hm.goals} : ${M.aw.goals}</h2>
    <div class="s">${M.hm.name} — ${M.aw.name} · тур ${S.round}</div>
    ${M.forced ? `<p style="font-size:11.5px;color:var(--dim);margin:0 0 8px">Режим перевірки: рахунок підправлено на перемогу.</p>` : ""}
    ${scored.length ? `<div class="lab">Голи</div><div class="plist">${scored.map(p =>
      `<div class="p"><div class="pos">${p.goals}</div><div class="pn"><b>${p.name}</b>
       <i>${p.assists ? p.assists + " гольова · " : ""}${p.touches} дотиків</i></div></div>`).join("")}</div>` : ""}
    <div class="lab" style="margin-top:12px">Найкращі в матчі</div>
    <div class="plist">${best.map(p => `<div class="p"><div class="pos">${p.rating.toFixed(1)}</div>
      <div class="pn"><b>${p.name}</b><i>${p.pos()} · свіжість ${Math.round(p.fresh * 100)} %${p.injured ? ' · <span style="color:var(--bad)">травма</span>' : ""}</i></div>
      <div class="pv"><b>${Math.round(p.power())}</b></div></div>`).join("")}</div>
    ${growthReport()}
    <div class="lab" style="margin-top:12px">Гроші за день · разом ${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))}</div>
    <p style="font-size:11.5px;color:var(--dim);margin:0">за результат +${fmt(M.pay || 0)} · ${M.gate ? `квитки +${fmt(M.gate)} · ` : "матч на виїзді — квитків немає · "}спонсор +${fmt(dm.sponsor)} · атрибутика +${fmt(dm.merch)} · зарплати −${fmt(dm.wages)} · утримання будівель −${fmt(dm.upkeep)}</p>
    ${stadiumLine()}
    <div class="note" style="margin-top:12px"><h3>Бонус присутності</h3>
      <p>Дій під час гри: ${ME.actions}. Команда грала з надбавкою
      <b style="color:var(--gold)">+${(ME.presence * 100).toFixed(1).replace(".", ",")} %</b> до ефективної сили.
      Стеля — 4 %, і вона рахується всередині загальної стелі бонусів 12 %.</p></div>
    <button class="btn" style="margin-top:14px" onclick="closeSheet();nextRound()">Наступний тур</button>`;
  openSheet(true);
}
/* Приріст у звіті: від матчу — кожен, хто грав; тренування — окремим рядком. */
function growthReport(){
  const played = [...(M.played || [])].sort((a, b) => (b._mg || 0) - (a._mg || 0));
  const mTotal = played.reduce((s, p) => s + (p._mg || 0), 0);
  const tTotal = squadAll().reduce((s, p) => s + (p._tg || 0), 0);
  const train = trainedToday()
    ? `Тренування сьогодні було: уся команда разом ${sgn2(tTotal)} — це окремо від матчу.`
    : `Тренування сьогодні не було — воно проводиться в розділі «Тренування».`;
  return `<div class="lab" style="margin-top:12px">Приріст від матчу · усі, хто грав · разом ${sgn2(mTotal)}</div>
    <div class="plist">${played.map(p => `<div class="p"><div class="pos">${p.pos()}</div>
      <div class="pn"><b>${p.name}</b><i>${p.age} р · ${stars(p)}</i></div>
      <div class="pv"><b>${f1(p.power())}</b><i class="gain">${sgn2(p._mg || 0)}</i></div></div>`).join("")}</div>
    <p style="font-size:11.5px;color:var(--dim);margin:8px 0 0">«+0,00» — гравець уже на лінії свого віку або пік позаду: рости йому нікуди. ${train}</p>`;
}
/* Суперники-ШІ теж тренуються щодня — на базі, типовій для свого дивізіону. */
const aiBase = d => Math.max(1, Math.min(20, Math.round(V.need(d))));
function aiDay(){
  const k = V.kBase(aiBase(S.division));
  LEAGUE.forEach(t => { if (t === ME) return;
    t.onPitch().forEach(p => p.grow(p.slopeDay(ageF(p)) * (k + V.MATCH_K), ageF(p)));
    t.bench.forEach(p => p.grow(p.slopeDay(ageF(p)) * k, ageF(p)));
  });
}
/* Порожнє місце в складі (ПЛАН 48): спершу будь-хто з академії (навіть ще не готовий),
   далі найдешевший гравець ринку, і лише коли грошей немає — ветеран «з вулиці» без таланту.
   Завжди контракт на 1 рік, щоб не прив'язувати клуб. Найкращих ніколи не бере. */
let FILLED = null;                    // хто закрив порожні місця в кінці сезону
function fillSlot(role){
  const got = (p, cost) => { if (FILLED) FILLED.push({ n: p.name, a: p.age, cost }); return p };
  const gk = role === "gk";
  const fit = p => gk ? (p.gk ? p.power() : -1) : (p.gk ? -1 : p.powerIn(role));
  const out = p => { ME.bench.splice(ME.bench.indexOf(p), 1); return p };
  const ac = S.academy.candidates.filter(c => c.yearsLeft <= 0 && fit(c.p) >= 0).sort((a, b) => fit(b.p) - fit(a.p))[0];
  if (ac){
    signAcademy(ac, 1, Math.round(V.wageFor(ac.p) * V.CONTRACT_K[1]));
    addNews("eye", `${ac.p.name} з академії закрив порожнє місце в складі (контракт на 1 рік).`);
    return got(out(ac.p), 0);
  }
  const room = wageCapNow() - ME.wageBill();
  const best = [...faRows().filter(r => !r.fa.mine), ...pool()]
    .filter(r => fit(r.p) >= 0 && tierOf(r.p).ok)
    .map(r => ({ r, k: dealOf(r), w: Math.round(dealOf(r).wage * V.CONTRACT_K[1]) }))
    .filter(x => x.k.total <= S.money && x.w <= room)
    .sort((a, b) => a.k.total - b.k.total || a.w - b.w)[0];
  if (best && completeBuy(best.r, 1, best.w)) return got(out(best.r.p), best.k.total);
  const p = new V.P(V.uname(), role, levelFor(S.division) * 0.82, gk, V.ri(29, 32));
  p.ss = p.power(); p.wg = Math.round(V.wageFor(p) * V.CONTRACT_K[1]); p.ct = S.season; p.paid = 0; p.js = S.season;
  addNews("cap", `${p.name} (${p.age}) прийшов вільним агентом, щоб закрити порожнє місце.`);
  return got(p, 0);
}
/* Вільні агенти нового сезону — справжні гравці, у яких скінчився контракт: твої, що пішли,
   частина гравців суперників і кілька з сусідніх дивізіонів. Минулорічні, кого не взяли, ідуть. */
function newFreeAgents(was, myLeft){
  const fa = myLeft.map(p => { p.ct = undefined; p.wg = undefined; p.kn = null; return { p, div: was, from: S.club.name, mine: true } });
  V.reseed(99991 + S.season * 31 + was);
  LEAGUE.forEach(t => {
    if (t === ME || V.R() > .5) return;
    const ps = t.all().filter(p => p.age >= 23 && p.age + 1 < p.ret);
    if (!ps.length) return;
    const p = V.pick(ps); p.age++; p.kn = null; p.reset();
    t.bench = t.bench.filter(q => q !== p);
    fa.push({ p, div: was, from: t.name });
  });
  for (let d = Math.max(1, was - 2); d <= Math.min(12, was + 1); d++){
    if (d === was) continue;
    for (let i = 0; i < 2; i++) fa.push({ p: marketPlayer(d, V.ri(24, 32)), div: d, from: V.pick(OTHER_CLUBS) });
  }
  V.reseed(Date.now() % 1000000007);
  return fa;
}
/* на старті гри — кілька вільних агентів, у яких контракт скінчився минулого літа */
function initialFreeAgents(){
  V.reseed(4242 + S.club.name.length);
  S.fa = Array.from({ length: 6 }, () => { const d = V.ri(11, 12); return { p: marketPlayer(d, V.ri(26, 32)), div: d, from: V.pick(OTHER_CLUBS) } });
  V.reseed(Date.now() % 1000000007);
}
/* рядок на головній: у скількох гравців контракт закінчується цього сезону */
function expiringText(){
  const n = squadAll().filter(lastYear).length;
  return n ? ` У ${n} ${pl(n, "гравця", "гравців", "гравців")} контракт закінчується цього сезону — продовж у картці гравця.` : "";
}
/* прибрати гравців зі складу (завершили кар'єру чи скінчився контракт) і заповнити їхні місця */
function removePlayers(gone){
  if (!gone.length) return;
  ME.bench = ME.bench.filter(p => !gone.includes(p));
  const take = fit => {
    let best = -1, bv = -Infinity;
    ME.bench.forEach((q, i) => { const v = fit(q); if (v > bv){ bv = v; best = i } });
    return best >= 0 ? ME.bench.splice(best, 1)[0] : null;
  };
  /* воротар лише з воротарів лави; польового у ворота не ставимо */
  if (gone.includes(ME.gk)) ME.gk = take(q => q.gk ? q.power() : -Infinity, true) || fillSlot("gk");
  V.SPECS.forEach(([slot, role]) => {
    if (gone.includes(ME.xi[slot])) ME.xi[slot] = take(q => q.gk ? -Infinity : q.powerIn(role), true) || fillSlot(role);
  });
  if (!ME.bench.some(p => p.gk)) ME.bench.push(fillSlot("gk"));
  while (squadAll().length < 16) ME.bench.push(fillSlot(V.pick(Object.keys(V.ROLES))));
}
/* кінець сезону: ріст, старіння, кар'єри, контракти, вільні агенти, нові суперники. Повертає підсумок. */
function endOfSeason(was){
  const grew = squadAll().filter(p => p.ss != null).map(p => ({ n: p.name, a: p.age, g: p.power() - p.ss, pw: p.power() }))
    .sort((a, b) => b.g - a.g);
  squadAll().forEach(p => p.age++);
  S.academy.candidates.forEach(c => c.p.age++);
  const retired = squadAll().filter(p => p.age >= p.ret);
  const left = squadAll().filter(p => !retired.includes(p) && p.ct != null && p.ct < S.season);
  S.fa = newFreeAgents(was, left);
  S.sys = [];                                          // за міжсезоння їх розібрали інші клуби
  FILLED = [];
  removePlayers([...retired, ...left]);
  const filled = FILLED; FILLED = null;
  squadAll().forEach(p => { p.ss = p.power() });
  buildWorld(true);
  POOL = null;
  return { grew, retired: retired.map(p => `${p.name} (${p.age})`), left: left.map(p => p.name), filled };
}
/* =======================================================================
   ПІРАМІДА (ОСНОВА, розділ 12)
   Д1–Д4 — по одній лізі: 3 перші вгору; з Д1–Д3 вилітає 3, з Д4 — 4.
   З Д5 і нижче під кожною лігою три: угору — чемпіон, а друге місце грає плей-оф
   з другими місцями двох сусідніх ліг; вилітає 4. Д12 — поки що дно.
   ======================================================================= */
const BOTTOM = 12;
function zones(d){
  if (d <= 4) return { up: d > 1 ? 3 : 0, playoff: false, down: d === BOTTOM ? 0 : d <= 3 ? 3 : 4 };
  return { up: 1, playoff: true, down: d === BOTTOM ? 0 : 4 };
}
/* Плей-оф трьох других місць (неділя після 30-го туру): найкращий другий за очками чекає у фіналі,
   двоє інших грають півфінал о 18:00, фінал — о 21:00 на полі найкращого. Нічия — серія пенальті. */
function playoff(d, myPts){
  const rivals = [0, 1].map(i => {
    const t = new V.Team(V.pick(OTHER_CLUBS) + " (" + ["Б", "В"][i] + ")", levelFor(d) * V.rf(.98, 1.08));
    return { t, pts: Math.max(40, Math.round(myPts + V.ri(-8, 8))) };
  });
  const all = [{ t: ME, pts: myPts, me: true }, ...rivals].sort((a, b) => b.pts - a.pts || V.R() - .5);
  const play = (h, a) => { const [gh, ga] = V.quickMatch(h.t, a.t);
    const pens = gh === ga ? (V.R() < .5 ? h : a) : null;
    return { win: pens || (gh > ga ? h : a), txt: `${h.t.name} — ${a.t.name} ${gh}:${ga}${pens ? `, пенальті — ${pens.t.name}` : ""}` } };
  const best = all[0], semi = play(all[1], all[2]), fin = play(best, semi.win);
  const won = fin.win.me;
  const where = best.me ? "Ми — найкращий другий, чекали у фіналі." : "Півфінал: " + semi.txt + ".";
  return { won, text: `Плей-оф других місць: ${where} Фінал: ${fin.txt}. ${won ? "Виграли плей-оф!" : "Плей-оф програно."}` };
}
function nextRound(quiet){
  closeSheet();
  /* гроші дня: спонсор і атрибутика, зарплати, утримання (квитки — у звіті матчу) */
  const dm = dayMoney();
  book("sponsor", dm.sponsor); book("merch", dm.merch); book("wages", -dm.wages); book("upkeep", -dm.upkeep);
  const heal = injuryHeal(S.buildings.medical);
  [...ME.onPitch(), ...ME.bench].forEach(p => {
    p.decline(ageF(p)); p._mg = 0; p._tg = 0;
    p.fresh = Math.min(1, p.fresh + .55); if (p.injured && V.R() < heal) p.injured = false });
  aiDay();
  S.round++;
  /* за 5 турів до кінця сезону — нагадування, у кого закінчується контракт (ПЛАН 44) */
  if (S.round === 26 && S.remind !== S.season){
    S.remind = S.season;
    const ex = squadAll().filter(lastYear);
    if (ex.length) addNews("cap", `Контракт закінчується наприкінці сезону: ${ex.map(p => p.name).join(", ")}. Продовж у картці гравця, інакше вони підуть вільними агентами.`);
  }
  let rolled = false;
  if (S.round > 30){
    /* підвищення й виліт — ОСНОВА, розділ 12 */
    const pos = tablePos(ME.name), was = S.division, row = S.table[ME.name];
    const prize = Math.round(V.placePrize(was, pos));
    book("prize", prize);
    const z = zones(was);
    let po = null;
    if (pos <= z.up && was > 1) S.division--;
    else if (pos === 2 && z.playoff){ po = playoff(was, row.p); if (po.won) S.division-- }
    else if (pos > 16 - z.down && was < BOTTOM) S.division++;
    S.round = 1; S.season++;
    addNews("up", `Сезон ${S.season - 1} завершено: ${pos} місце, призові ${fmt(prize)}. ` +
      (po ? po.text + " " : "") +
      (S.division < was ? `Підвищення — тепер Дивізіон ${S.division}!` : S.division > was ? `Виліт у Дивізіон ${S.division}.` : `Лишаємось у Дивізіоні ${S.division}.`));
    const rec = { w: row.w, d: row.d, l: row.l, gf: row.gf, ga: row.ga, p: row.p };
    Object.values(S.table).forEach(v => { v.p = v.w = v.d = v.l = v.gf = v.ga = 0 });
    const sum = endOfSeason(was);
    ageAcademyOneSeason();
    S.lastSeason = { season: S.season - 1, pos, was, now: S.division, prize, rec, fin: S.fin, ...sum, playoff: po && po.text,
      expiring: squadAll().filter(p => p.ct === S.season).map(p => p.name), intake: S.academy.offers.length };
    S.fin = FIN0();
    rolled = true;
  }
  M.hm = null;
  if (quiet) return;
  openMatch(); renderTop(); show("home"); save();
  if (rolled) seasonWindow();
}
window.nextRound = nextRound;
/* Вікно кінця сезону: місце, призові, гроші, ріст, кар'єри, контракти, набір в академію */
function seasonWindow(){
  const L = S.lastSeason; if (!L) return;
  const f = L.fin, inc = f.tickets + f.sponsor + (f.merch || 0) + (f.match || 0) + f.prize + f.sales, out = f.wages + f.upkeep + f.build + f.buys;
  const moved = L.now < L.was ? `Підвищення — тепер Дивізіон ${L.now}!` : L.now > L.was ? `Виліт — тепер Дивізіон ${L.now}.` : `Лишаєшся в Дивізіоні ${L.now}.`;
  const line = (t, v, plus) => `<div class="at"><span>${t}</span><u style="width:auto">${plus ? "+" : "−"}${fmt(v)}</u></div>`;
  $("#sheet").innerHTML = `<h2>Сезон ${L.season}: ${L.pos} місце</h2>
    <div class="s">${L.rec.w} ${pl(L.rec.w, "перемога", "перемоги", "перемог")} · ${L.rec.d} ${pl(L.rec.d, "нічия", "нічиї", "нічиїх")} · ${L.rec.l} ${pl(L.rec.l, "поразка", "поразки", "поразок")} · м'ячі ${L.rec.gf}:${L.rec.ga} · ${L.rec.p} ${pl(L.rec.p, "очко", "очки", "очок")}</div>
    ${L.playoff ? `<p style="font-size:12.5px;color:var(--muted);margin:0 0 6px">${L.playoff}</p>` : ""}
    <p style="font-size:14px;color:var(--gold-hi);margin:0 0 12px"><b>${moved}</b> Призові за місце: ${fmt(L.prize)}.</p>
    <div class="lab">Гроші за сезон</div>
    <div class="ftot">
      <div><i>Усього доходів</i><b class="plus">+${fmt(inc)}</b></div>
      <div><i>Усього витрат</i><b class="minus">−${fmt(out)}</b></div>
      <div><i>Чистий прибуток</i><b class="${inc - out >= 0 ? "plus" : "minus"}">${inc - out >= 0 ? "+" : "−"}${fmt(Math.abs(inc - out))}</b></div>
    </div>
    <div class="attrs" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
      ${line("Квитки", f.tickets, true)}${line("Спонсор", f.sponsor, true)}
      ${line("Атрибутика", f.merch || 0, true)}${line("Гроші за матчі", f.match || 0, true)}
      ${line("Призові за місце", f.prize, true)}${line("Продаж гравців", f.sales, true)}
      ${line("Зарплати", f.wages)}${line("Утримання будівель", f.upkeep)}
      ${line("Будівництво", f.build)}${line("Купівля гравців", f.buys)}
    </div>
    <div class="lab">Ріст за сезон · усі гравці стали на рік старші</div>
    <div class="plist">${L.grew.slice(0, 8).map(x => `<div class="p"><div class="pn"><b>${x.n}</b><i>${x.a} ${yrs(x.a)} на кінець сезону</i></div>
      <div class="pv"><b>${f1(x.pw)}</b><i class="gain">${sgn(x.g)}</i></div></div>`).join("")}</div>
    ${L.retired.length ? `<p style="font-size:12px;color:var(--muted);margin:10px 0 0">Завершили кар'єру: ${L.retired.join(", ")}.</p>` : ""}
    ${L.left.length ? `<p style="font-size:12px;color:var(--muted);margin:6px 0 0">Контракт скінчився, пішли: ${L.left.join(", ")}.</p>` : ""}
    ${L.filled && L.filled.length ? `<p style="font-size:12px;color:var(--muted);margin:6px 0 0">Порожні місця закрито автоматично (академія, найдешевші на ринку, контракт на 1 рік): ${L.filled.map(x => x.n).join(", ")} — разом ${fmt(L.filled.reduce((a, x) => a + x.cost, 0))}.</p>` : ""}
    ${L.expiring.length ? `<p style="font-size:12px;color:var(--gold);margin:6px 0 0">Контракт закінчується наприкінці цього сезону: ${L.expiring.join(", ")} — продовж у картці гравця.</p>` : ""}
    <p style="font-size:12px;color:var(--muted);margin:6px 0 0">Скаут приніс новий набір в академію: ${L.intake} кандидатів.</p>
    <button class="btn" style="margin-top:14px" onclick="closeSheet()">Далі</button>`;
  openSheet();
}

/* =======================================================================
   НОВИНИ, ЗБЕРЕЖЕННЯ
   ======================================================================= */
function addNews(icon, text){
  S.feed.unshift({ i: icon, b: text, t: `сезон ${S.season}, тур ${S.round}`, seen: false });
  S.feed = S.feed.slice(0, 20);
}
const sp = p => ({ n:p.name, r:p.role, g:p.gk, a:p.age, at:p.attrs, po:p.pot, gl:p.glass, pr:p.prof, fo:p.form, wp:p.wagePrem, fc:p.face, rt:p.ret, ss:p.ss, ct:p.ct, wg:p.wg, sr:p.sr, ap:p.ap, kn:p.kn, pd:p.paid, js:p.js });
function serial(t){
  return { gk: sp(t.gk), xi: Object.fromEntries(Object.entries(t.xi).map(([k, p]) => [k, sp(p)])), bench: t.bench.map(sp) };
}
function mkPlayer(d){
  const p = new V.P(d.n, d.r, 25, d.g, d.a); p.attrs = d.at; p.pot = d.po;
  p.glass = d.gl; p.prof = d.pr; p.form = d.fo; if (d.wp) p.wagePrem = d.wp; if (d.fc) p.face = d.fc;
  if (d.rt) p.ret = d.rt; if (d.ss != null) p.ss = d.ss;
  if (d.ct != null) p.ct = d.ct; if (d.wg != null) p.wg = d.wg;
  if (d.sr) p.sr = d.sr; if (d.ap != null) p.ap = d.ap; if (d.kn != null) p.kn = d.kn;
  if (d.pd != null) p.paid = d.pd; if (d.js != null) p.js = d.js;
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
      queue: S.queue, owned: S.owned, squad: serial(ME), trained: S.trained, test: S.test,
      academy: S.academy.candidates.map(c => ({ p: sp(c.p), yearsLeft: c.yearsLeft })),
      offers: (S.academy.offers || []).map(sp), fin: S.fin, scout: S.scout, scouted: S.scouted,
      taken: S.taken, lastSeason: S.lastSeason, remind: S.remind,
      fa: S.fa.map(r => ({ p: sp(r.p), div: r.div, from: r.from, mine: r.mine })),
      sys: S.sys.map(r => ({ p: sp(r.p), div: r.div })),
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
      trained: o.trained || "", test: o.test || { on: false, win: false },
      fin: o.fin || FIN0(), scout: o.scout || null, scouted: o.scouted || null,
      taken: o.taken || null, lastSeason: o.lastSeason || null, remind: o.remind || 0,
    });
    S.fa = (o.fa || []).map(r => ({ p: mkPlayer(r.p), div: r.div, from: r.from, mine: r.mine }));
    S.sys = (o.sys || []).map(r => ({ p: mkPlayer(r.p), div: r.div }));
    buildWorld();
    if (o.squad) hydrate(o.squad, ME);
    S.academy.candidates = (o.academy || []).map(c => ({ p: mkPlayer(c.p), yearsLeft: c.yearsLeft }));
    S.academy.offers = (o.offers || []).map(mkPlayer);
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
  /* стартові контракти: закінчуються в різні сезони, щоб не всі разом */
  squadAll().forEach(p => { p.ss = p.power(); p.wg = V.wageFor(p); p.ct = S.season + V.ri(0, 3) });
  S.fin = FIN0();
  stockAcademyAtFounding();
  initialFreeAgents();
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
  /* після згасання заставку прибираємо зовсім: якщо анімація не добіжить (гра згорнута),
     невидима заставка не повинна лежати поверх гри й ловити дотики */
  setTimeout(() => { $("#splash").style.display = "none" }, 650);
  if (has) startGame();
  else { renderCreate(); $("#create").classList.add("on"); $("#cname").focus() }
}, 2300);
