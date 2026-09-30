/* ВЕРТИКАЛЬ — інтерфейс.
   Горизонтальна оболонка: верхня смуга, ліве меню, сцена з восьми розділів.
   Симуляція живе в engine.js, тут тільки екрани, навігація і стан. */

const V = window.VERT;
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const fmt = n => Math.round(n).toLocaleString("uk-UA").replace(/,/g, " ");
/* vert6: новий розподіл доходу, зарплати, піраміда. Старі збереження лишаються в пам'яті
   телефону, але новій версії не підходять — клуб створюється заново. */
const SAVE_KEY = "vert9";
/* номер версії видно внизу меню — щоб на телефоні одразу було ясно, що відкрилось */
const VERSION = "v24.5";

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
/* =======================================================================
   ЕМБЛЕМИ-КАРТИНКИ З НАЗВОЮ КЛУБУ (тест 30.09)
   Малюнок емблеми (вирізаний, прозорий) + назва клубу, яку гра пише в «зоні напису» емблеми.
   Зона — прямокутник або дуга; розміри виміряні на малюнку (vertical/tools/cut_emblem.py).
   Довга назва: літери стискаються до мінімуму, далі — ініціали (як «ФКМ» на гербах справжніх клубів).
   ======================================================================= */
const IMG_BASE = 100;
const IMG_CRESTS = {
  100: { file: "crest-lighthouse", w: 389, h: 512, color: "#D8BA7A", edge: "#0B1A3A",
         zone: { t: "rect", cx: 194, cy: 106, w: 288, max: 40, min: 18 } },
  101: { file: "crest-bridge", w: 406, h: 512, color: "#F0DCA0", edge: "#4A0A18",
         zone: { t: "arc", x0: 108, y0: 61, cx: 205, cy: 23, x1: 302, y1: 61, w: 186, max: 34, min: 16 } },
  102: { file: "crest-ship", w: 410, h: 512, color: "#134B57", edge: "#FFF6E0",           // кремова стрічка вигнута: вісь у центрі y 88, по краях 101
         zone: { t: "arc", x0: 45, y0: 101, cx: 202, cy: 75, x1: 360, y1: 101, w: 290, max: 38, min: 16 } },
  103: { file: "crest-wolf", w: 430, h: 512, color: "#3B1563", edge: "#FFFFFF",
         zone: { t: "arc", x0: 105, y0: 83, cx: 215, cy: 8, x1: 325, y1: 83, w: 215, max: 34, min: 14 } },   // біла смуга: вісь у центрі y 45,5
  104: { file: "crest-sun", w: 512, h: 511, color: "#E6C67E", edge: "#141414",
         zone: { t: "rect", cx: 256, cy: 256, w: 330, max: 40, min: 16 } },                // смуга між золотими лініями: y 224–288
};
const IMG_IDS = Object.keys(IMG_CRESTS).map(Number);
const CREST_FONT = '"Cormorant Garamond", Georgia, serif', CREST_WEIGHT = 600;
let _cctx = null, _cid = 0;
function crestTextW(txt, size){
  _cctx = _cctx || document.createElement("canvas").getContext("2d");
  _cctx.font = `${CREST_WEIGHT} ${size}px ${CREST_FONT}`;
  return _cctx.measureText(txt).width + txt.length * size * .05;          // + розрядка
}
const xmlEsc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function fitCrestText(name, z){
  let txt = name.toUpperCase().trim(), size = z.max, w = crestTextW(txt, size);
  if (w > z.w){ size = Math.max(z.min, size * z.w / w); w = crestTextW(txt, size) }
  if (w > z.w && /\s/.test(txt)){                                        // багатослівна назва не влізла — ініціали
    txt = txt.split(/\s+/).map(x => x[0]).join("").slice(0, 4); size = z.max; w = crestTextW(txt, size);
    if (w > z.w){ size = Math.max(z.min, size * z.w / w); w = crestTextW(txt, size) }
  }
  return { txt, size, squeeze: w > z.w + .5 };
}
function imgCrestSVG(id, name, showName){
  const c = IMG_CRESTS[id];
  let label = "";
  if (showName){
    const z = c.zone, f = fitCrestText(name || "НАЗВА", z);
    const st = `font-family='${CREST_FONT}' font-weight="${CREST_WEIGHT}" font-size="${f.size.toFixed(1)}" fill="${c.color}" stroke="${c.edge}" stroke-width="${(f.size * .05).toFixed(2)}" paint-order="stroke" stroke-linejoin="round" letter-spacing="${(f.size * .05).toFixed(2)}"`;
    const tl = f.squeeze ? ` textLength="${z.w}" lengthAdjust="spacingAndGlyphs"` : "";
    if (z.t === "rect") label = `<text x="${z.cx}" y="${z.cy}" text-anchor="middle" dominant-baseline="central" ${st}${tl}>${xmlEsc(f.txt)}</text>`;
    else {
      const off = f.size * .35, pid = "cp" + (++_cid);                   // базова лінія нижче осі стрічки
      label = `<defs><path id="${pid}" d="M${z.x0},${z.y0 + off} Q${z.cx},${z.cy + off} ${z.x1},${z.y1 + off}"/></defs>
        <text text-anchor="middle" ${st}><textPath href="#${pid}" startOffset="50%"${tl}>${xmlEsc(f.txt)}</textPath></text>`;
    }
  }
  return `<svg x="0" y="0" width="52" height="60" viewBox="0 0 ${c.w} ${c.h}" preserveAspectRatio="xMidYMid meet" overflow="visible">
    <image href="img/crests/${c.file}.webp" x="0" y="0" width="${c.w}" height="${c.h}"/>${label}</svg>`;
}
function crestSVG(id, name, showName){
  if (IMG_CRESTS[id]) return imgCrestSVG(id, name, showName);
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
  month: { y: 2026, m: 9 }, day: 1,   // сезон = календарний місяць (час гри — Іспанія), день місяця
  clock: { last: 0 },            // до якої миті годинник гри вже все прорахував (матчі, кінці днів)
  lastRep: "",                   // звіт останнього матчу — відкривається з головної
  money: 1250000, gold: 100, focus: 0,
  table: {}, results: [], feed: [],
  buildings: { stadium: 3, training: 2, academy: 1, scouts: 1, medical: 1, commercial: 1 },
  queue: [],
  owned: { crests: [], kits: [] },
  academy: { candidates: [], offers: [] },   // вихованці { p } (готовність p.rd 0–60, картки p.cd, здібності p.abl/p.abp) і набір сезону від скаута
  trained: "",                   // "сезон-тур", коли востаннє проведено тренування
  test: { on: false, win: false, shift: 0 },   // режим перевірки: миттєві матчі й будівлі, перемотка годинника (shift, мс)
  fin: { tickets: 0, sponsor: 0, merch: 0, match: 0, prize: 0, sales: 0, wages: 0, upkeep: 0, build: 0, buys: 0 },  // гроші за сезон
  scout: { left: 10 },           // { left } — звіти скаута: 10 на старті, далі щодня від скаутського центру
  scouted: null,                 // { season, map: ім'я → що відкрив скаут } — щоб перезапуск не стирав
  taken: null,                   // { season, names } — кого вже купили в цьому сезоні
  lastSeason: null,              // підсумок останнього сезону для вікна кінця сезону
  fa: [],                        // вільні агенти: гравці, у яких скінчився контракт { p, div, from }
  sys: [],                       // продані системі — система виставляє їх на ринок за повну вартість { p, div }
  remind: 0,                     // сезон, у якому вже нагадали про кінець контрактів
  lineupAt: null,                // день (сезон×100 + тур), коли менеджер сам ставив чи підтверджував склад
  kits: { g: 10, r: 5, day: 0, gUsed: 0, rUsed: [] },   // аптечки: зелені (свіжість), червоні (травма); ліміти за день
  login: { last: "", streak: 0, tok: 0, pending: null },  // серія входу: остання дата, днів підряд, жетони незгоряння, нагорода, яку ще не забрали
  exch: { season: 0, pct: 0 },   // обмін золота на гроші: скільки відсотків доходу вже взято цього сезону
  q3: 0,                         // сезон, на який куплена третя черга будівництва
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
  const rivalTeams = rivals.map(n => new V.Team(n, base * V.rf(0.82, 1.1), false, V.pick(V.FORM_NAMES)));
  if (!keepMe) ME = new V.Team(mine, base * 0.95, true);
  /* кого вже купили в суперників цього сезону — після перезапуску вони в них не з'являються */
  if (S.taken && S.taken.season === S.season)
    rivalTeams.forEach(t => { t.bench = t.bench.filter(p => !S.taken.names.includes(p.name)) });
  LEAGUE = [ME, ...rivalTeams];
  LEAGUE.forEach((t, i) => { t.crest = i === 0 ? S.club.crest : (i * 5 + 3) % CREST_COUNT });
  LEAGUE.forEach(t => { if (!S.table[t.name]) S.table[t.name] = { p:0, w:0, d:0, l:0, gf:0, ga:0 } });
  Object.keys(S.table).forEach(n => { if (!LEAGUE.some(t => t.name === n)) delete S.table[n] });
  S.fixtures = V.makeFixtures(LEAGUE.map(t => t.name));
  swapFixtures();
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

/* =======================================================================
   КАЛЕНДАР І ГОДИННИК (ОСНОВА §14, рішення 29–30.09)
   Сезон = календарний місяць за європейським часом (Іспанія). На телефоні кожен бачить свій місцевий час. 30 турів; де днів не вистачає — подвійні
   тури в суботи. Останній день місяця — без ліги (продажі, контракти, плей-оф), опівночі — новий сезон.
   Гра живе за годинником: матч починається сам о своїй годині, година щодня випадкова.
   ======================================================================= */
const TZ = "Europe/Madrid";                  // час гри — європейський (Іспанія), рішення 30.09
const KFMT = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" });
function gz(ts){
  const o = {}; KFMT.formatToParts(ts).forEach(p => { o[p.type] = +p.value });
  return { y: o.year, m: o.month - 1, d: o.day, h: o.hour % 24, mi: o.minute };
}
/* час гри → мітка часу (враховує літній і зимовий час) */
function gzTs(y, m, d, h = 0, mi = 0){
  const want = Date.UTC(y, m, d, h, mi);
  let t = want;
  for (let i = 0; i < 3; i++){ const k = gz(t); t += want - Date.UTC(k.y, k.m, k.d, k.h, k.mi) }
  return t;
}
/* годинник гри; у режимі перевірки його можна перемотати вперед (S.test.shift), у справжній грі — ні */
/* місцевий час телефону — лише для показу годин людині */
function loc(ts){ const d = new Date(ts); return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), h: d.getHours(), mi: d.getMinutes() } }
const nowTs = () => Date.now() + (S.test.shift || 0);
const monthDays = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const nextMonth = ({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 };
const curDays = () => monthDays(S.month.y, S.month.m);
const dayK = () => 30 / curDays();            // ріст за день: за будь-який місяць гравець виростає однаково
/* години матчів — окремий генератор, щоб не збивати випадковість матчу й ринку */
function hash32(str){ let h = 2166136261; for (const c of str){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
const pickSlot = (key, from, count) => from + 10 * (hash32(key) % count);   // хвилини від півночі, крок 10 хв
const EP_MS = 4300, HALF_MS = 3200;
const MATCH_LEN = 76 * EP_MS + HALF_MS + 5000;   // найдовший матч наживо ≈ 5,6 хв
const PLAN_CACHE = {};
function monthPlan(mo){
  const key = `${mo.y}-${mo.m}-${S.division}`;
  if (PLAN_CACHE[key]) return PLAN_CACHE[key];
  const days = monthDays(mo.y, mo.m), league = days - 1, doubles = 30 - league;
  const sats = [];
  for (let d = 1; d <= league; d++) if (new Date(Date.UTC(mo.y, mo.m, d)).getUTCDay() === 6) sats.push(d);
  const dbl = [...Array(Math.max(0, doubles)).keys()].map(i => sats[Math.floor((i + .5) * sats.length / doubles)]);
  const ev = []; let r = 1;
  /* Кубок (Д5 і нижче): 3, 8, 13, 18, 23, 27 числа удень; збіг із подвійною суботою — на день раніше */
  const cupAt = {};
  if (S.division >= 5) CUP_DAYS.forEach((cd, i) => { cupAt[dbl.includes(cd) ? cd - 1 : cd] = i + 1 });
  else {
    /* Ліга чемпіонів (Д1–Д4): 16 днів, рівно по місяцю, без подвійних субот, удень; фінал — останній день увечері */
    const cand = [...Array(league).keys()].map(i => i + 1).filter(d => !dbl.includes(d));
    for (let i = 0; i < 16; i++) cupAt[cand[Math.round(i * (cand.length - 1) / 15)]] = i + 1;
  }
  for (let d = 1; d <= days; d++){
    const k = `${key}-${d}`;
    if (cupAt[d]) ev.push({ t: "c", r: cupAt[d], ts: gzTs(mo.y, mo.m, d, 0, pickSlot(k + "c", 600, 30)) });   // Кубок удень 10:00–14:50
    if (d <= league){
      if (dbl.includes(d)){
        ev.push({ t: "m", r: r++, ts: gzTs(mo.y, mo.m, d, 0, pickSlot(k + "a", 600, 30)) });   // удень 10:00–14:50
        ev.push({ t: "m", r: r++, ts: gzTs(mo.y, mo.m, d, 0, pickSlot(k + "b", 1080, 19)) });  // увечері 18:00–21:00
      } else ev.push({ t: "m", r: r++, ts: gzTs(mo.y, mo.m, d, 0, pickSlot(k, 1080, 19)) });  // 18:00–21:00
    }
    if (d === days && S.division <= 4) ev.push({ t: "c", r: CL_LAST, ts: gzTs(mo.y, mo.m, d, 0, pickSlot(k + "f", 1080, 19)) });   // фінал ЛЧ увечері
    ev.push({ t: "d", d, last: d === days, ts: gzTs(mo.y, mo.m, d + 1, 0, 0) });            // опівночі — кінець дня
  }
  return PLAN_CACHE[key] = { days, dbl, ev };
}
const nextEvent = () => monthPlan(S.month).ev.find(e => e.ts > S.clock.last);
const matchEvent = r => monthPlan(S.month).ev.find(e => e.t === "m" && e.r === r);
const MONTHS = ["січня","лютого","березня","квітня","травня","червня","липня","серпня","вересня","жовтня","листопада","грудня"];
const MONTHS1 = ["січень","лютий","березень","квітень","травень","червень","липень","серпень","вересень","жовтень","листопад","грудень"];
const WDAYS = ["нд","пн","вт","ср","чт","пт","сб"];
const hhmm = k => `${String(k.h).padStart(2, "0")}:${String(k.mi).padStart(2, "0")}`;
function dayLabel(ts){
  const k = loc(ts), n = loc(nowTs());
  const wd = WDAYS[new Date(Date.UTC(k.y, k.m, k.d)).getUTCDay()];
  const rel = k.y === n.y && k.m === n.m && k.d === n.d ? "сьогодні" : Date.UTC(k.y, k.m, k.d) - Date.UTC(n.y, n.m, n.d) === 864e5 ? "завтра" : "";
  return `${rel ? rel + ", " : ""}${wd}, ${k.d} ${MONTHS[k.m]}`;
}
function untilText(ms){
  const m = Math.max(0, Math.ceil(ms / 60000)), h = Math.floor(m / 60);
  return h ? `через ${h} год ${m % 60} хв` : m ? `через ${m} хв` : "за хвилину";
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
  if (p === "match"){ if (!M.hm || (M.done && !M.live)) openMatch(); else ensurePitchLoop() }
  if (p === "league" && leagueView === "cup") renderLeague();
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
  $("#topSub").textContent = `Дивізіон ${S.division} · Сезон ${S.season} · Тур ${Math.min(S.round, 30)} · ${hhmm(loc(nowTs()))}${S.test.on ? " · перевірка" : ""}`;
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
  inj:  '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
};
function renderHome(){
  const done = S.round > 30 && !myCupPair(), f = done ? myFixture() : nextFixture(), opp = f.isHome ? f.away : f.home;
  $("#homeTag").textContent = `Дивізіон ${S.division} · Сезон ${S.season} (${MONTHS1[S.month.m]}) · ${done ? "усі тури зіграно" : `тур ${S.round} з 30`}`;
  $("#homeTitle").textContent = S.club.name;
  $("#homeLine").textContent = done
    ? `${ord(tablePos(ME.name))} у таблиці. Усі 30 турів зіграно. Сьогодні останній день сезону: продажі, купівлі й продовження контрактів. Опівночі — підсумок і новий сезон.${expiringText()}`
    : `${ord(tablePos(ME.name))} у таблиці. Наступний суперник — ${opp.name}${f.cup ? ` (${compName()}, Дивізіон ${cupInfo(opp.name).d})` : ""}, ${f.isHome ? "удома" : "у гостях"}. Склад оцінюється в ${f1(ME.rate())} за силою в ролі. ${trainedToday() ? "Сьогодні вже тренувались." : "Сьогодні ще не тренувались — тренування в розділі «Тренування»."}${expiringText()}`;
  $("#nmCrestH").innerHTML = done ? "" : crestSVG(f.home.crest ?? 0);
  $("#nmCrestA").innerHTML = done ? "" : crestSVG(f.away.crest ?? 0);
  const posOf = n => f.cup ? `Дивізіон ${cupInfo(n).d}` : ord(tablePos(n));
  $("#nmHome").textContent = done ? "—" : f.home.name;  $("#nmHomePos").textContent = done ? "" : posOf(f.home.name);
  $("#nmAway").textContent = done ? "—" : f.away.name;  $("#nmAwayPos").textContent = done ? "" : posOf(f.away.name);
  $("#nmVenue").textContent = done ? "суперники нового сезону — після переходу" : f.isHome ? `Стадіон «${S.club.name}» · рівень ${S.buildings.stadium}` : `Виїзд · ${opp.name}`;
  $("#newsList").innerHTML = S.feed.slice(0, 6).map(n =>
    `<div class="row"><div class="thumb"><svg viewBox="0 0 24 24">${NEWS_ICON[n.i] || NEWS_ICON.cap}</svg></div>
     <div><b>${n.b}</b><i>${n.t}</i></div></div>`).join("")
    || `<div class="row"><div><b>Новин поки немає</b><i>з'являться після першого туру</i></div></div>`;
  S.feed.forEach(n => n.seen = true);
  $("#homeSeason").style.display = S.test.on && !done ? "" : "none";
  $("#homeLast").hidden = !S.lastRep;
  homeRewardBlock();
  homeClock();
  renderTop();
}
/* наступний матч і скільки до нього — оновлюється щосекунди */
function homeClock(){
  const now = nowTs();
  if (M.live){
    $("#nmRound").textContent = `${M.kind === "cup" ? compName() + " · " : ""}Наживо · ${M.min}'`;
    $("#nmDate").textContent = "матч іде зараз";
    $("#nmTime").textContent = `рахунок ${M.hm.goals} : ${M.aw.goals}`;
    $("#homePlay").textContent = "Матч наживо";
  } else if (S.round > 30 && !myCupPair()){
    const n = nextMonth(S.month), ev = monthPlan(S.month).ev;
    $("#nmRound").textContent = "Сезон зіграно";
    $("#nmDate").textContent = `новий сезон — 1 ${MONTHS[n.m]}`;
    $("#nmTime").textContent = `перехід опівночі · ${untilText(ev[ev.length - 1].ts - now)}`;
    $("#homePlay").textContent = S.test.on ? "Перейти в новий сезон" : "Склад";
  } else {
    const nf = nextFixture(), e = nf.e, dbl = monthPlan(S.month).dbl.includes(gz(e.ts).d);
    $("#nmRound").textContent = nf.cup ? `${compName()} · ${cupRoundName(S.cup.round)}` : `Ліга · тур ${S.round}${dbl ? " · подвійний тур" : ""}`;
    $("#nmDate").textContent = dayLabel(e.ts);
    $("#nmTime").textContent = `${hhmm(loc(e.ts))} · ${untilText(e.ts - now)}`;
    $("#homePlay").textContent = S.test.on ? "Зіграти матч миттєво" : "Підготовка до матчу";
  }
}
$("#homePlay").onclick = () => {
  if (M.live) return show("match");
  if (S.round > 30 && !myCupPair()) return S.test.on ? simSeason() : show("team");
  S.test.on ? playInstant() : show("match");
};
$("#homeLast").onclick = () => showReport();
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
const dayW = n => pl(n, "день", "дні", "днів");
const yrs = n => { const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? "рік" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "роки" : "років" };
/* вік усередині сезону: з кожним туром гравець трохи старший — лінія росту рухається плавно */
const ageF = p => p.age + (S.day - 1) / curDays();
/* позиція з флангом: «КЗ п» — правий, «ВНГ л» — лівий */
const posLbl = p => p.pos() + (p.side ? (p.side === "R" ? " п" : " л") : "");
/* як гравець знає місце в складі, у відсотках (100 — своя позиція) */
const famPct = (p, slot) => Math.round(V.fam(p, slot) * 100);
function prow(p, slot, isSub){
  const fr = Math.round(p.fresh * 100);
  const label = isSub ? posLbl(p) : V.SLOT_POS[slot];
  const fp = isSub ? 100 : famPct(p, slot);
  return `<div class="p drag" data-slot="${slot}">
    <div class="pos ${isSub ? "sub" : ""}">${label}</div>
    <div class="pn"><b>${p.name}</b><i>${p.age} р · ${V.ROLE_UA[p.role]}${fp < 100 ? ` · позиція ${fp} %` : ""} · ${stars(p)}${lastCareer(p) ? ' · <span class="ctw">останній сезон кар\'єри</span>' : lastYear(p) ? ' · <span class="ctw">останній сезон контракту</span>' : ""}</i></div>
    <div class="pv"><b>${Math.round(p.power())}</b><div class="frbar"><i style="width:${fr}%"></i></div></div></div>`;
}
/* Розташування на полі: атака вправо, ворота зліва; координати в % ширини/висоти. */
const FORM_XY = {
  "4-3-3":   { GK:[7,50], RB:[25,88], CB1:[21,63], CB2:[21,37], LB:[25,12], DM:[40,50], CM:[58,28], AM:[58,72], RW:[82,86], ST:[89,50], LW:[82,14] },
  "4-4-2":   { GK:[7,50], RB:[25,88], CB1:[21,63], CB2:[21,37], LB:[25,12], RM:[58,88], CM1:[52,62], CM2:[52,38], LM:[58,12], ST:[86,63], ST2:[86,37] },
  "3-5-2":   { GK:[7,50], CB1:[22,74], CB2:[19,50], CB3:[22,26], RWB:[50,90], LWB:[50,10], DM:[38,50], CM:[58,64], AM:[64,36], ST:[87,62], ST2:[87,38] },
  "4-5-1":   { GK:[7,50], RB:[25,88], CB1:[21,63], CB2:[21,37], LB:[25,12], RM:[62,88], CM1:[56,67], DM:[40,50], CM2:[56,33], LM:[62,12], ST:[89,50] },
  "4-2-3-1": { GK:[7,50], RB:[25,88], CB1:[21,63], CB2:[21,37], LB:[25,12], DM:[40,66], DM2:[40,34], RW:[72,86], AM:[66,50], LW:[72,14], ST:[89,50] },
  "5-3-2":   { GK:[7,50], RB:[32,90], CB1:[21,72], CB2:[19,50], CB3:[21,28], LB:[32,10], CM1:[52,70], DM:[42,50], CM2:[52,30], ST:[86,62], ST2:[86,38] },
  "3-4-3":   { GK:[7,50], CB1:[22,74], CB2:[19,50], CB3:[22,26], RWB:[52,90], CM1:[48,62], CM2:[48,38], LWB:[52,10], RW:[80,84], ST:[89,50], LW:[80,16] },
};
const mySlots = () => ME.slots();
const PITCH_XY_OF = s => (FORM_XY[ME.form] || FORM_XY["4-3-3"])[s] || [50, 50];
/* вибір схеми — список у підготовці до матчу й у «Команді»; під час матчу — теж, і це дія менеджера */
function syncFormSel(){ $$(".formsel").forEach(el => { if (!el.options.length) el.innerHTML = V.FORM_NAMES.map(f => `<option>${f}</option>`).join(""); el.value = ME.form }) }
function changeForm(f){
  if (!V.FORMS[f] || f === ME.form) return;
  ME.setForm(f);
  if (M.live){ act("схему"); initDots(); say(M.min, `Тренер перебудовує команду на ${f}.`, "warn"); renderBench() }
  else { bestLineup(); markLineup(); toast(`Схема ${f}: поставили найкращий склад під неї — з основи й лави`) }   // під час матчу — ті самі десятеро, без замін
  save(); renderTeamIfOpen();
}
document.addEventListener("change", e => { if (e.target.classList && e.target.classList.contains("formsel")) changeForm(e.target.value) });
const PITCH_LINES = `<svg class="ln" viewBox="0 0 105 68" preserveAspectRatio="none">
  <rect x="1.5" y="1.5" width="102" height="65"/><line x1="52.5" y1="1.5" x2="52.5" y2="66.5"/>
  <circle cx="52.5" cy="34" r="8"/><rect x="1.5" y="18" width="14" height="32"/>
  <rect x="89.5" y="18" width="14" height="32"/><rect x="1.5" y="26" width="5" height="16"/>
  <rect x="98.5" y="26" width="5" height="16"/></svg>`;
/* кружечок гравця: на полі (з позицією слота) або на лаві (з його позицією); під ним — прізвище, вік і зірки */
function token(p, slot, onPitch){
  const fp = onPitch ? famPct(p, slot) : 100, off = fp < 100;
  const sur = p.name.split(" ").slice(-1)[0];
  const pos = onPitch ? `left:${PITCH_XY_OF(slot)[0]}%;top:${PITCH_XY_OF(slot)[1]}%` : "";
  const warn = lastCareer(p) ? "кінець кар'єри" : lastYear(p) ? "кінець контракту" : "";
  const pw = Math.round(onPitch ? p.fitIn(slot) : p.power());
  const hurt = p.out > 0 || p.ban > 0, fr = Math.round(p.fresh * 100);
  const state = p.out > 0 ? `<span class="hu">травма ${p.out} д</span>` : p.ban > 0 ? `<span class="hu">диск.</span>` : off ? `<span class="fp">${fp} %</span>` : `${p.age} · <s>${"★".repeat(p.stars())}</s>`;
  return `<button class="tk drag ${onPitch ? "" : "bt"} ${off ? "off" : ""} ${hurt ? "hurt" : ""} ${warn ? "ctl" : ""}" data-slot="${slot}"
      style="${pos}" title="${p.name} · ${posLbl(p)} · свіжість ${fr} %${p.out > 0 ? " · " + p.inj + ", ще " + p.out + " " + dayW(p.out) : ""}${off ? ` · на цьому місці ${fp} %` : ""}${warn ? " · " + warn : ""}">
    <span class="c">${faceOf(p) ? `<img src="${faceSmall(p)}" alt="">` : (onPitch ? V.SLOT_POS[slot] : posLbl(p))}<b>${pw}</b><span class="fbar ${fr < 50 ? "vlo" : fr < 75 ? "lo" : ""}"><i style="width:${fr}%"></i></span><span class="md" style="background:${moodOf(p)[2]}"></span></span>
    <i>${sur}</i><em>${state}</em></button>`;
}
const pitchToken = (p, slot) => token(p, slot, true);
/* склад: поле + лава кружечками; однаковий у «Команді» й у підготовці до матчу */
function renderLineup(pitchEl, benchEl){
  pitchEl.innerHTML = `${PITCH_LINES}<div class="fm">${ME.form}</div>` + mySlots().map(s => pitchToken(s === "GK" ? ME.gk : ME.xi[s], s)).join("");
  syncFormSel();
  benchEl.innerHTML = ME.bench.map((p, i) => token(p, "B" + i, false)).join("");
  $$(".lustat").forEach(el => el.textContent = lineupMine()
    ? "склад ваш — автовибір його не чіпає (лише травмованих замінить)"
    : "перед матчем найкращий склад поставить автовибір");
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
/* Обличчя гравців (тест 30.09): набір img/faces/tNN.jpg. Кожному гравцю обличчя дається один раз і зберігається. */
const FACE_N = 19;
function faceOf(p){
  if (!p) return "";
  if (!p.face || p.face === "img/faces/f01.jpg"){
    if (ME && squadAll().includes(p)) ensureDemoFace();                     // свій склад — усім різні обличчя
    if (!p.face || p.face === "img/faces/f01.jpg") p.face = `img/faces/t${String(1 + hash32(p.name || "x") % FACE_N).padStart(2, "0")}.jpg`;
  }
  return p.face;
}
/* Форма клубу на фото (рішення Марії 30.09): сіру футболку на обличчі перефарбовує гра в форму команди гравця.
   Футболка знаходиться за кольором (майже без відтінку, нижня частина кадру), візерунок — за формою клубу (смуги, обручі, половини, діагональ).
   Складки тканини лишаються: яскравість пікселя множить колір форми. Результат кешується. */
const KIT_FACE_CACHE = {};
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function kitFace(img, src, kitId){
  const key = src + "|" + kitId;
  if (KIT_FACE_CACHE[key]){ img.src = KIT_FACE_CACHE[key]; return }
  img.style.opacity = 0;
  const im = new Image();
  im.onload = () => {
    try {
      const W = im.width, H = im.height, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const cx = cv.getContext("2d"); cx.drawImage(im, 0, 0);
      const d = cx.getImageData(0, 0, W, H), a = d.data;
      const [c1, c2] = KIT_PAL[kitId % KIT_PAL.length].map(hexRGB), type = Math.floor(kitId / 2) % 4;
      const y0 = Math.floor(H * .72), lums = [];
      const isShirt = i => { const r = a[i], g = a[i + 1], b = a[i + 2], lum = (r + g + b) / 3; return Math.max(r, g, b) - Math.min(r, g, b) <= 16 && lum > 62 && lum < 215 };
      for (let y = y0; y < H; y += 3) for (let x = 0; x < W; x += 3){ const i = (y * W + x) * 4; if (isShirt(i)) lums.push((a[i] + a[i + 1] + a[i + 2]) / 3) }
      lums.sort((p, q) => p - q); const ref = lums.length ? lums[lums.length >> 1] : 128;
      for (let y = y0; y < H; y++) for (let x = 0; x < W; x++){
        const i = (y * W + x) * 4; if (!isShirt(i)) continue;
        const alt = type === 0 ? (Math.floor(x / (W / 9)) % 2)
                  : type === 1 ? (Math.floor((y - y0) / (H / 16)) % 2)
                  : type === 2 ? (x > W / 2 ? 1 : 0)
                  : (Math.floor((x + y) / (W / 6)) % 2);
        const c = alt ? c2 : c1, sh = .55 + .45 * Math.min(1.6, ((a[i] + a[i + 1] + a[i + 2]) / 3) / ref);
        a[i] = Math.min(255, c[0] * sh); a[i + 1] = Math.min(255, c[1] * sh); a[i + 2] = Math.min(255, c[2] * sh);
      }
      cx.putImageData(d, 0, 0);
      KIT_FACE_CACHE[key] = cv.toDataURL("image/jpeg", .9); img.src = KIT_FACE_CACHE[key];
    } catch (e) { img.src = src }
    img.style.opacity = 1;
  };
  im.onerror = () => { img.style.opacity = 1 };
  im.src = src;
}
/* щільний кадр (голова) для маленьких кружечків */
const faceSmall = p => { const f = faceOf(p); return f ? f.replace(".jpg", "_s.jpg") : "" };
function ensureDemoFace(){
  const all = [ME.gk, ...Object.values(ME.xi), ...ME.bench];
  /* склад свого клубу — усім різні обличчя, скільки вистачає */
  const used = new Set(all.map(p => p.face).filter(Boolean));
  all.forEach(p => { if (p.face && p.face !== "img/faces/f01.jpg") return;
    let k = hash32(p.name) % FACE_N, g = 0; while (used.has(`img/faces/t${String(1 + k).padStart(2, "0")}.jpg`) && g++ < FACE_N) k = (k + 1) % FACE_N;
    p.face = `img/faces/t${String(1 + k).padStart(2, "0")}.jpg`; used.add(p.face) });
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
const matchBoost = p => ageF(p) < 20 ? 3 : 1;      // молоді ростуть від матчів утричі швидше
const trainedToday = () => S.trained === String(dayNo());
function squadAll(){ return [ME.gk, ...ME.slots().slice(1).map(s => ME.xi[s]), ...ME.bench] }
function trainToday(quiet){
  if (trainedToday()) return;
  const k = V.kBase(S.buildings.training);
  const gains = [];
  squadAll().forEach(p => {
    if (p.out > 0) return;                       // травмований не тренується
    p.fresh = Math.max(0, p.fresh - FRESH_TRAIN);
    const g = p.grow(p.slopeDay(ageF(p)) * k * dayK(), ageF(p), S.focus);
    p._tg = (p._tg || 0) + g; gains.push([p, g]);
  });
  /* академія тренується разом із клубом, на тій самій базі */
  S.academy.candidates.forEach(c => { c.p.grow(c.p.slopeDay(ageF(c.p)) * k * dayK(), ageF(c.p), S.focus); c.p.rd = Math.min(60, (c.p.rd || 0) + 1) });
  S.trained = String(dayNo());
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
const slotOK = (slot, p) => slot === "GK" ? p.gk && canPlay(p) : slot[0] === "B" ? true : !p.gk && canPlay(p);
function swap(a, b){
  const pa = getP(a), pb = getP(b);
  if (!slotOK(a, pb) || !slotOK(b, pa)) return false;
  setP(a, pb); setP(b, pa); return true;
}

/* =======================================================================
   АВТОВИБІР СКЛАДУ (рішення 29.09, ОСНОВА 13–14)
   Перед кожним матчем гра ставить найкращих: свої позиції, сильніші й свіжіші, без травмованих.
   Якщо менеджер сам поставив чи підтвердив склад за останні 2 дні — склад не чіпаємо, лише
   травмованого міняємо найкращим з лави на те саме місце й пишемо про це в новинах.
   ======================================================================= */
/* =======================================================================
   РОЛІ Й МОРАЛЬ (рішення 29.09, прогін morale.js)
   Підписуючи, обіцяєш роль. Гравець сам вважає себе кимось — за місцем за силою у твоєму складі.
   Та сама роль — звичайна з.п.; на сходинку нижче +25 %; на дві й більше — відмова; на сходинку вище −10 %.
   Мораль 0–100 (старт 70): зіграв +1; не зіграв — Зірка −4, Основа −3, Ротація −1,5, Запас −0,5; перемога +0,5, поразка −0,5.
   Нижче 40 — не продовжує контракт; нижче 25 — просить продати. У матчі мораль основи дає до ±3 %.
   ======================================================================= */
const ROLE_T = {
  young: { name: "Молодий", tier: 1, need: 0,   miss: 0,   promise: "без обіцянки" },
  bench: { name: "Запас",   tier: 1, need: .10, miss: .5,  promise: "гратиме ≥ 10 % матчів" },
  rot:   { name: "Ротація", tier: 2, need: .35, miss: 1.5, promise: "гратиме ≥ 35 % матчів" },
  main:  { name: "Основа",  tier: 3, need: .60, miss: 3,   promise: "гратиме ≥ 60 % матчів" },
  star:  { name: "Зірка",   tier: 4, need: .80, miss: 4,   promise: "гратиме ≥ 80 % матчів" },
};
const ROLE_LIMIT = { star: 2, main: 10, rot: 6 };            // місць у складі: Зірок до 2, Зірка+Основа до 10, Ротація до 6
function selfRole(p){
  if (p.age < 20 && !p.gk) return "young";
  const same = squadAll().filter(q => q !== p && !!q.gk === !!p.gk && q.power() > p.power());
  const r = same.length + 1;
  if (p.gk) return r === 1 ? "main" : "bench";
  return r <= 2 ? "star" : r <= 10 ? "main" : r <= 15 ? "rot" : "bench";
}
/* множник з.п. за обіцяну роль; null — відмовиться */
function roleMult(p, chosen){
  if (chosen === "young") return p.age < 20 ? .9 : null;
  const d = ROLE_T[chosen].tier - ROLE_T[selfRole(p)].tier;
  return d === 0 ? 1 : d === -1 ? 1.25 : d <= -2 ? null : .9;
}
const roleCount = (id, except) => squadAll().filter(q => q !== except && q.rl === id).length;
function roleFull(p, id){
  if (id === "star") return roleCount("star", p) >= ROLE_LIMIT.star;
  if (id === "main") return roleCount("star", p) + roleCount("main", p) >= ROLE_LIMIT.main;
  if (id === "rot") return roleCount("rot", p) >= ROLE_LIMIT.rot;
  return false;
}
function ensureRoles(){
  squadAll().forEach(p => {
    if (p.mr == null) p.mr = 70;
    if (!p.rl) p.rl = selfRole(p);
    if (p.gp == null){ p.gp = 0; p.gt = 0 }
  });
}
const moodOf = p => (p.mr ?? 70) >= 60 ? ["🙂", "задоволений", "var(--live)"] : (p.mr ?? 70) >= 40 ? ["😐", "терпить", "var(--gold)"] : ["🙁", "ображений", "var(--bad)"];
/* мораль після матчу: зіграв — +1; не зіграв — за роллю; результат команди ±0,5 */
function moraleAfterMatch(diff){
  const played = M.played || new Set();
  squadAll().forEach(p => {
    if (p.mr == null) p.mr = 70;
    const r = ROLE_T[p.rl || "main"];
    if (played.has(p)){ p.mr += 1; p.gp = (p.gp || 0) + 1; if (p.gp % 6 === 0 && (p.abl || []).length) applyCard(p, "ab", 1) }
    else if (!((p.out > 0) || (p.ban > 0))) p.mr -= r.miss;
    if (!(p.out > 0 && !played.has(p)) && !(p.ban > 0 && !played.has(p))) p.gt = (p.gt || 0) + 1;
    p.mr += diff > 0 ? .5 : diff < 0 ? -.5 : 0;
    p.mr = Math.max(0, Math.min(100, p.mr));
    if (p.mr < 25 && !p.wo){ p.wo = true; addNews("cap", `${p.name} просить продати: мало грає (мораль ${Math.round(p.mr)}). Можеш відмовити — але тоді мораль лишиться низькою.`) }
    else if (p.mr >= 35 && p.wo) p.wo = false;
    if (p.mr < 40 && !p.warned && p.ct != null && p.ct <= S.season){ p.warned = true; addNews("cap", `${p.name} не хоче продовжувати контракт: мало грає (мораль ${Math.round(p.mr)}).`) }
  });
}
function setMorale(){
  const xi = ME.onPitch();
  ME.morale = xi.reduce((a, p) => a + ((p.mr ?? 70) - 70) / 30 * .03, 0) / xi.length;
}
/* номер дня гри (за календарем) — для «сьогодні вже тренувались», аптечок і підтвердженого складу */
const dayNo = () => Math.floor(Date.UTC(S.month.y, S.month.m, S.day) / 864e5);
let CUPCTX = false;                     // готуємо кубковий матч: діє кубкова червона (cban), не лігова
const canPlay = p => p && !(p.out > 0) && !(CUPCTX ? p.cban > 0 : p.ban > 0);
const fitNow = (p, slot) => p.fitIn(slot) * (.7 + .3 * p.fresh);
/* борг за обіцянкою: скільки матчів не догравав проти обіцяного цього сезону; 3 очка за матч боргу, не більше 4 матчів */
const promiseDebt = p => Math.min(4, Math.max(0, (ROLE_T[p.rl || "main"].need) * ((p.gt || 0) + 1) - (p.gp || 0)));
const fitPick = (p, slot) => fitNow(p, slot) + 3 * promiseDebt(p);
function markLineup(){ S.lineupAt = dayNo() }
const lineupMine = () => S.lineupAt != null && dayNo() >= S.lineupAt && dayNo() - S.lineupAt <= 2;
/* найкращий склад: спершу жадібно найкращі пари «гравець — місце», далі обміни, доки стає краще */
function bestLineup(){
  const all = squadAll(), fs = mySlots().slice(1), ok = all.filter(canPlay);
  const gk = ok.filter(p => p.gk).sort((a, b) => fitPick(b, "GK") - fitPick(a, "GK"))[0] || ME.gk;
  const field = ok.filter(p => !p.gk), xi = {}, used = new Set();
  const pairs = []; field.forEach(p => fs.forEach(s => pairs.push([fitPick(p, s), p, s])));
  pairs.sort((a, b) => b[0] - a[0]);
  for (const [, p, s] of pairs){ if (xi[s] || used.has(p)) continue; xi[s] = p; used.add(p) }
  for (let better = true, guard = 0; better && guard < 60; guard++){
    better = false;
    for (const a of fs) for (const b of fs){
      if (a >= b || !xi[a] || !xi[b]) continue;
      if (fitPick(xi[a], b) + fitPick(xi[b], a) > fitPick(xi[a], a) + fitPick(xi[b], b) + 1e-9){ [xi[a], xi[b]] = [xi[b], xi[a]]; better = true }
    }
    for (const s of fs) for (const q of field){
      if (used.has(q) || !xi[s]) continue;
      if (fitPick(q, s) > fitPick(xi[s], s) + 1e-9){ used.delete(xi[s]); used.add(q); xi[s] = q; better = true }
    }
  }
  /* здорових польових не вистачило — на порожнє місце хоч когось */
  fs.forEach(s => { if (!xi[s]){ const q = all.find(p => !p.gk && !used.has(p)); if (q){ xi[s] = q; used.add(q) } } });
  const was = [ME.gk, ...fs.map(s => ME.xi[s])], now = [gk, ...fs.map(s => xi[s])];
  ME.gk = gk; fs.forEach(s => ME.xi[s] = xi[s]);
  const inXI = new Set(now);
  ME.bench = all.filter(p => !inXI.has(p));
  return now.some((p, i) => p !== was[i]);
}
/* перед матчем */
function autoLineup(){
  if (lineupMine()){
    const ch = [];
    mySlots().forEach(s => {
      const p = getP(s); if (canPlay(p)) return;
      const b = ME.bench.map((q, i) => [q, i]).filter(([q]) => canPlay(q) && slotOK(s, q))
        .sort((x, y) => fitNow(y[0], s) - fitNow(x[0], s))[0];
      if (b && swap(s, "B" + b[1])) ch.push(`${b[0].name} замість ${p.name}`);
    });
    if (ch.length) addNews("eye", `Автовибір: у вашому складі травмовані — ${ch.join(", ")}. Решту складу лишили, як ви поставили.`);
  } else if (bestLineup())
    addNews("eye", "Автовибір поставив найкращий склад на матч: свої позиції, найсильніші, без травмованих. Щоб склад лишався вашим — змініть його або натисніть «Підтвердити склад».");
}
/* кнопки «Найкращий склад» і «Підтвердити склад» — у «Команді» й у підготовці до матчу */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-lu]"); if (!b || M.live) return;
  if (b.dataset.lu === "best"){ bestLineup(); toast("Поставили найкращий склад") }
  else toast("Склад підтверджено — 2 дні автовибір його не чіпатиме");
  markLineup(); save(); renderTeamIfOpen();
});

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
      if (swap(DRAG.slot, DRAG.over.dataset.slot)){ markLineup(); save() }
      else toast("Так поставити не можна: воротар грає лише у воротах, а травмований чи дискваліфікований — не грає");
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
const peakTxt = (a, b) => `${Math.round(a)}–${Math.round(b)} років`;
/* Що каже картка про ріст — простими словами, з тими самими числами, що рахує гра. */
function growthText(p){
  const a = ageF(p), line = p.line(a), pw = p.power();
  const lim = `Межа — <b style="color:var(--gold)">${Math.round(p.pot)}</b>: може дорости до рівня Д${V.divOf(p.pot)}. Пік — у ${peakTxt(p.pk, p.pk1)}.`;
  let now;
  if (a >= p.pk1 + 2) now = "Пік позаду: більше не росте, слабшають швидкість і сила, потім витривалість; техніка й пас тримаються довше.";
  else if (a >= p.pk1) now = "Пік позаду: більше не росте, але поки майже не слабшає.";
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
/* ---- аптечки (рішення 29.09): зелена +15 % свіжості одному гравцю, до 4 на день на команду; червона −1 день травми ---- */
const MED_PRICE = { g: 6, r: 10 };            // золото за штуку (200 золота ≈ 5 €)
function kitsToday(){
  if (S.kits.day !== dayNo()) S.kits = { ...S.kits, day: dayNo(), gUsed: 0, rUsed: [] };
  return S.kits;
}
function useKit(kind, slot){
  const p = getP(slot), k = kitsToday();
  if (M.live) return toast("Під час матчу аптечки не діють — до свистка чи після");
  if (kind === "g"){
    if (p.fresh >= .999) return toast(`${p.name} і так свіжий`);
    if (k.gUsed >= GREEN_DAY) return toast(`Не більше ${GREEN_DAY} зелених на день — решту завтра`);
  } else {
    if (!(p.out > 0)) return toast(`${p.name} не травмований`);
    if (k.rUsed.includes(p.name)) return toast("Одному гравцю — одна червона на день");
  }
  if (k[kind] > 0) k[kind]--;
  else if (S.gold >= MED_PRICE[kind]) S.gold -= MED_PRICE[kind];
  else return toast(`Аптечок немає, а золота бракує (${MED_PRICE[kind]})`);
  if (kind === "g"){ p.fresh = Math.min(1, p.fresh + GREEN); k.gUsed++ }
  else { k.rUsed.push(p.name); p.out--; if (p.out === 0){ p.inj = null; addNews("inj", `${p.name} одужав завдяки аптечці.`) } }
  renderTop(); save(); renderTeamIfOpen(); openPlayer(slot);
}
window.useKit = useKit;
function abilBlock(p){
  const n = (p.abl || []).length; if (!n) return "";
  const rows = p.abl.map((id, k) => k < abOpen(p)
    ? `<div class="ab"><b>${V.ABIL[id].name}</b><i>рівень ${V.abLv(p, id)} з 5 — ${V.ABIL[id].hint}</i></div>`
    : `<div class="ab lock"><b>? закрита</b><i>відкриється, коли набереш очки здібностей (академія: картка «Здібність»)</i></div>`).join("");
  return `<div class="note"><h3>Здібності · ${p.stars()} ★ дають ${n}</h3>${rows}
    <p style="margin-top:6px;font-size:11px">Очки: ${p.abp || 0} (рівень = 10 очок). Дорослий отримує 1 очко за 6 зіграних матчів.</p></div>`;
}
function kitBar(slot, p){
  const k = kitsToday(), cap = kitCap();
  const lbl = (kind, txt) => k[kind] > 0 ? `${txt} · є ${k[kind]}` : `Купити й використати · ${MED_PRICE[kind]} золота`;
  return `<div class="note"><h3>Стан гравця</h3>
    <p>Роль: <b>${ROLE_T[p.rl || "main"].name}</b> (${ROLE_T[p.rl || "main"].promise}) · зіграв цього сезону ${p.gp || 0} з ${p.gt || 0}. Мораль <b style="color:${moodOf(p)[2]}">${Math.round(p.mr ?? 70)} ${moodOf(p)[0]} ${moodOf(p)[1]}</b>${p.wo ? ' · <span style="color:var(--bad)">просить продати</span>' : ""}.</p>
    <p>Свіжість <b>${Math.round(p.fresh * 100)} %</b>${p.out > 0 ? ` · <span style="color:var(--bad)">${p.inj}, ще ${p.out} ${dayW(p.out)}</span>` : ""}${p.ban > 0 ? ` · дискваліфікація, пропустить матч` : ""}.
    Аптечок: зелених ${k.g} з ${cap.g}, червоних ${k.r} з ${cap.r} · зелених сьогодні ${k.gUsed} з ${GREEN_DAY}.</p>
    <div class="kits">
      <button class="btn sm ${p.fresh >= .999 ? "ghost" : ""}" onclick="useKit('g','${slot}')">Зелена +15 % · ${lbl("g", "використати")}</button>
      ${p.out > 0 ? `<button class="btn sm" onclick="useKit('r','${slot}')">Червона −1 день · ${lbl("r", "використати")}</button>` : ""}
    </div></div>`;
}
function openPlayer(slot){
  const p = getP(slot);
  const face = faceOf(p);
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
    ${abilBlock(p)}
    ${kitBar(slot, p)}
    <div class="note"><h3>${V.ROLE_UA[p.role]}</h3><p>${growthText(p)}</p>
      <p style="margin-top:6px">${contractText(p)} Оціночна вартість ${fmt(V.valueOf(p))}.</p>
      ${p.ct != null && p.ct <= S.season && !lastCareer(p) ? `<button class="btn sm" id="renewBtn" style="margin-top:8px">Продовжити контракт</button>` : ""}</div>
    <div class="strip">${mySlots().map(s => {
      const q = getP(s), f = faceOf(q);
      return `<button data-s="${s}" class="${s === slot ? "on" : ""}" title="${q.name}">
        ${f ? `<img src="${faceSmall(q)}" alt="">` : SILHOUETTE}<u>${V.SLOT_POS[s]}</u></button>`;
    }).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn ghost sm" onclick="closeSheet()">Закрити</button>
    </div>
    <p style="font-size:11px;color:var(--dim);margin:8px 0 0">Щоб поміняти гравців місцями — перетягни одного на іншого в розділі «Команда».</p>`;
  $$("#sheet .strip button").forEach(b => b.onclick = () => openPlayer(b.dataset.s));
  if ($("#renewBtn")) $("#renewBtn").onclick = () => contractSheet(p, { title: `Продовження: ${p.name}`, renew: true });
  const fimg = $("#sheet .pc .face img"); if (fimg && face) kitFace(fimg, face, S.club.kit);   // футболка — у формі свого клубу
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
function cupHTML(){
  const C = S.cup;
  if (C && C.kind === "cl") return clHTML();
  if (!C || C.none) return `<div class="note"><h3>Кубку немає</h3><p>Кубок грають дивізіони 5–12. Дивізіони 1–4 гратимуть Лігу чемпіонів (скоро).</p></div>`;
  const { up, low } = cupLevels(S.division);
  const next = C.round <= 6 ? cupEvent(C.round) : null;
  const head = `<div class="note"><h3>Кубок · сезон ${C.season}</h3><p>64 клуби: Дивізіон ${up} і три ліги Дивізіону ${low}. На виліт, нічия — пенальті, удома — нижчий дивізіон. Кубкові дні — 3, 8, 13, 18, 23, 27 числа, удень.
    ${C.round > 6 ? `<br><b>${C.won ? "Кубок зіграно — він наш! 🏆" : "Кубок зіграно."}</b>` : `<br>Зараз: <b>${CUP_NAMES[C.round - 1]}</b>, лишилось ${C.alive.length} клубів${next ? ` · ${dayLabel(next.ts)}, ${hhmm(loc(next.ts))}` : ""}. ${C.out ? "Ми вибули." : "Ми граємо."}`}</p></div>`;
  const path = C.log.length ? `<div class="lab" style="margin-top:10px">Наш шлях</div><div class="plist">${C.log.map(l => `<div class="p">
    <div class="pos ${l.won ? "" : "sub"}">${l.gh}:${l.ga}</div><div class="pn"><b>${l.h} — ${l.a}</b><i>${CUP_NAMES[l.r - 1]}${l.pens ? " · " + l.pens : ""} · ${l.won ? "далі" : "виліт"}</i></div></div>`).join("")}</div>` : "";
  const pairs = C.round <= 6 && C.draw ? `<div class="lab" style="margin-top:10px">Пари · ${CUP_NAMES[C.round - 1]}</div><div class="plist">${[...C.draw].sort((x, y) => (y.includes(ME.name) ? 1 : 0) - (x.includes(ME.name) ? 1 : 0)).map(([h, a]) => `<div class="p ${h === ME.name || a === ME.name ? "me" : ""}">
    <div class="pos sub">Д${cupInfo(h).d}</div><div class="pn"><b>${h} — ${a}</b><i>Дивізіон ${cupInfo(h).d} удома · гість з Дивізіону ${cupInfo(a).d}</i></div></div>`).join("")}</div>` : "";
  return head + path + pairs;
}
function renderLeague(){
  const tb = $('#leagueTabs [data-v="cup"]'); if (tb) tb.textContent = compName();
  const z = zones(S.division);
  $("#leagueSub").textContent = `Дивізіон ${S.division} · тур ${S.round} з 30 · ${S.division <= 4 ? (z.up ? "3 перші вгору" : "вища ліга") : "чемпіон угору, 2-ге місце — плей-оф в останній день місяця"} · ${z.down ? `${z.down} останні вилітають` : "нижче нікуди — це дно"}`;
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
    box.innerHTML = cupHTML();
  }
}

/* =======================================================================
   ГРОШІ (ОСНОВА.md, розділ 3)
   Квитки — за кожен домашній матч, спонсор і атрибутика — щотуру, призові за
   місце — у кінці сезону. Зарплати й утримання — щотуру. Усе пишеться в
   підсумок сезону (S.fin), щоб у кінці було видно, куди пішли гроші.
   ======================================================================= */
const FIN0 = () => ({ gold: 0, login: 0, cup: 0, tickets: 0, sponsor: 0, merch: 0, match: 0, prize: 0, sales: 0, wages: 0, upkeep: 0, build: 0, buys: 0 });
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
/* підтримка трибун удома (рішення 29.09): скільки прийшло проти звичайного стадіону дивізіону, від ×0,5 до ×1,5 */
function crowdNow(){
  const d = S.division, came = Math.min(V.fans(d), V.seats(S.buildings.stadium)), norm = V.seats(Math.round(V.need(d)));
  return Math.max(.5, Math.min(1.5, came / norm));
}
function stadiumLine(){
  if (M.hm !== ME) return "";
  const f = stadiumFill(), c = crowdNow();
  return `<p style="font-size:11.5px;color:${f.lost ? "var(--warn)" : "var(--dim)"};margin:6px 0 0">Стадіон: ${fmt(f.cap)} місць, заповнений на ${Math.round(f.fill * 100)} %. Підтримка трибун ×${c.toFixed(2).replace(".", ",")}${c > 1.05 ? " — більший стадіон дає більшу перевагу дому" : c < .95 ? " — стадіон замалий для дивізіону, дома допомагає менше" : ""}.${f.lost ? ` Ще ≈ ${fmt(f.lost)} вболівальників не потрапили — втрачено ≈ ${fmt(f.lostMoney)} за матч. Час думати про більший стадіон.` : ""}</p>`;
}
/* травма минає за тур із таким шансом — медцентр прискорює */
/* свіжість за день і аптечки (рішення 29.09, прогони fatigue.js і greens.js) */
const FRESH_DAY = .28;                                  // за ніч (рішення 30.09): звичайний день — знову 100 %
const FRESH_TRAIN = .03;                                // тренування трохи втомлює
const GREEN = .15, GREEN_DAY = 4;                     // зелена: +15 % одному гравцю, не більше 4 на день на команду
const kitCap = () => ({ g: 10 + S.buildings.medical, r: 5 + Math.floor(S.buildings.medical / 2) });   // скільки вміщує медцентр

/* =======================================================================
   ІНФРАСТРУКТУРА
   ======================================================================= */
const MIN_PER_HOUR = 60000;            // у прототипі година будівництва = хвилина
function canBuild(id){
  const lvl = S.buildings[id];
  if (S.queue.find(q => q.id === id)) return "вже будується";
  if (lvl >= 20) return "максимальний рівень";
  if (S.queue.length >= 2 + (S.q3 === S.season ? 1 : 0)) return S.q3 === S.season ? "усі черги зайняті" : "обидві черги зайняті";
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
  if (id === "scouts") return `Безкоштовних звітів скаута на день: ${scoutPerDay(lvl)} (лежать до 3 днів).`;
  if (id === "medical") return `Травми коротші на ${3 * Math.min(20, lvl)} %. Аптечок уміщує: зелених ${10 + lvl}, червоних ${5 + Math.floor(lvl / 2)}.`;
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
/* золото: k = скільки золота коштує 1 % доходу сезону (рішення 29.09); ціни самі йдуть за розвитком клубу */
const GOLD_K = 10;
const goldFor = money => Math.max(1, Math.round(GOLD_K * money / (incomeEstimate() / 100)));
const speedCost = q => {
  const left = Math.max(0, q.endAt - Date.now()), total = V.buildHours(q.lvl) * MIN_PER_HOUR;
  return Math.max(1, Math.round(.5 * goldFor(V.buildCost(q.lvl)) * Math.min(1, left / total)));
};
function speedUp(i){
  const q = S.queue[i]; if (!q) return;
  const left = q.endAt - Date.now(); if (left <= 1000) return;
  const c = speedCost(q);
  if (S.gold < c){ toast(`Бракує золота: прискорення коштує ${c}`); return }
  S.gold -= c; q.endAt = Date.now() + left * .4;
  addNews("build", `Будівництво прискорено на 60 % за ${c} золота`);
  renderTop(); renderQueue(); save();
}
function buyThirdQueue(){
  if (S.q3 === S.season) return;
  if (S.gold < 100){ toast("Бракує золота: третя черга коштує 100 на сезон"); return }
  S.gold -= 100; S.q3 = S.season; renderTop(); renderInfra(); save();
}
window.speedUp = speedUp; window.buyThirdQueue = buyThirdQueue;
function renderQueue(){
  const box = $("#qlist"); if (!box) return;
  const third = S.q3 === S.season ? "" : `<div class="qrow"><b>Третя черга на цей сезон</b><span style="color:var(--dim)">будувати три будівлі водночас</span><button class="btn ghost sm" onclick="buyThirdQueue()">100 золота</button></div>`;
  if (!S.queue.length){ box.innerHTML = `<div class="qrow"><b>Черга порожня</b><span class="time">—</span></div>` + third; return }
  box.innerHTML = S.queue.map((q, qi) => {
    const b = BUILDINGS.find(x => x.id === q.id);
    const left = Math.max(0, q.endAt - Date.now());
    const mm = String(Math.floor(left / 60000)).padStart(2, "0");
    const ss = String(Math.floor(left % 60000 / 1000)).padStart(2, "0");
    return `<div class="qrow"><b>${b.name}</b><span style="color:var(--dim)">рівень ${q.lvl}</span><span class="time">${mm}:${ss}</span><button class="btn ghost sm" onclick="speedUp(${qi})" title="−60 % часу">Прискорити · ${speedCost(q)} золота</button></div>`;
  }).join("") + third;
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
/* Звіти: щодня безкоштовно 1 + рівень/5 (рівень 1 — 1, 5 — 2, 10 — 3, 15 — 4, 20 — 5), лежать до 3 днів; старт — 10;
   далі за золото (3). Реклама — коли з'явиться сервер. Два види: на зірки (kn |= 1) і на силу з межею (kn |= 2). */
const scoutPerDay = lvl => 1 + Math.floor(Math.min(20, lvl) / 5);
const SCOUT_GOLD = 3;
function scoutLeft(){ if (!S.scout || S.scout.left == null) S.scout = { left: 10 }; return S.scout.left }
function scoutTick(){
  scoutLeft();
  const per = scoutPerDay(S.buildings.scouts), cap = per * 3;
  if (S.scout.left < cap) S.scout.left = Math.min(cap, S.scout.left + per);
}
function makeRange(p){
  const s = p.stars(), w = S.buildings.scouts >= 5 ? 1 : 2;
  let lo = s - V.ri(0, w), hi = lo + w;
  if (hi > 6){ hi = 6; lo = 6 - w } if (lo < 1){ lo = 1; hi = 1 + w }
  const pw = Math.round(p.power()), plo = pw - V.ri(1, 5);
  p.sr = [lo, hi]; p.pr = [plo, plo + 6]; p.ap = Math.round((p.power() + V.rf(-3, 3)) / 5) * 5; p.kn = 0;
}
const kStars = p => p.kn == null || (p.kn & 1) > 0;
const kPow = p => p.kn == null || (p.kn & 2) > 0;
const known = p => kStars(p) && kPow(p);
function starsView(p){ return kStars(p) ? stars(p) : `<span class="rngst">${p.sr[0]}–${p.sr[1]} ★</span>` }
const powShown = p => kPow(p) ? p.power() : (p.pr ? (p.pr[0] + p.pr[1]) / 2 : p.ap);
const powView = p => kPow(p) ? String(Math.round(p.power())) : (p.pr ? `${p.pr[0]}–${p.pr[1]}` : `≈${p.ap}`);
function scoutReport(p, type, after){
  if (type === "s" ? kStars(p) : kPow(p)) return;
  if (scoutLeft() > 0) S.scout.left--;
  else if (S.gold >= SCOUT_GOLD) S.gold -= SCOUT_GOLD;
  else { toast(`Безкоштовні звіти скінчились (завтра прийдуть нові), а золота бракує (${SCOUT_GOLD})`); return }
  p.kn = (p.kn || 0) | (type === "s" ? 1 : 2);
  if (!S.scouted || S.scouted.season !== S.season) S.scouted = { season: S.season, map: {} };
  S.scouted.map[p.name] = p.kn;
  addNews("eye", type === "s" ? `Скаут: ${p.name} — ${p.stars()} ★` : `Скаут: ${p.name} — сила ${Math.round(p.power())}, межа ${Math.round(p.pot)}`);
  renderTop(); save(); if (after) after();
}
const scoutBtns = (p, attr) => (kStars(p) ? "" : `<button class="btn ghost sm" ${attr} data-st="s" ${scoutLeft() > 0 || S.gold >= SCOUT_GOLD ? "" : "disabled"}>★ Зірки</button>`)
  + (kPow(p) ? "" : `<button class="btn ghost sm" ${attr} data-st="w" ${scoutLeft() > 0 || S.gold >= SCOUT_GOLD ? "" : "disabled"}>Сила й межа</button>`);

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
/* ---- готовність, картки дня, інтенсив (рішення 29.09, прогін academy-path.js) ----
   Готовність 0–60: тренував — +1, не заходив — +2/3, картка +1…+3, «Інтенсив» за золото +10. В основу — з 60 і не раніше 17 років. */
const isReadyC = c => (c.p.rd || 0) >= 60 && c.p.age >= 17;
const CARD_T = { pw: "Сила", rd: "Готовність", ab: "Здібність" };
const CARD_PRICE = 4, INTENSIVE = 20;       // золота: перекинути картки одразу всім, «Інтенсив» на вихованця
function dealCards(p){
  if (p.cd && p.cd.day === dayNo()) return;
  const card = () => ({ t: V.pick(["pw", "rd", "ab"]), v: (x => x < .6 ? 1 : x < .9 ? 2 : 3)(V.R()) });
  p.cd = { day: dayNo(), hand: [card(), card(), card(), card()], done: null };
}
function applyCard(p, t, v){
  if (t === "pw") p.grow(p.slopeDay(ageF(p)) * V.kBase(S.buildings.training) * v * 1.5, ageF(p), S.focus);
  else if (t === "rd") p.rd = Math.min(60, (p.rd || 0) + v);
  else {
    const before = abOpen(p); p.abp = (p.abp || 0) + v;
    if (abOpen(p) > before) addNews("eye", `${p.name}: відкрилась нова здібність — ${V.ABIL[p.abl[abOpen(p) - 1]].name}`);
  }
}
const abOpen = p => Math.min((p.abl || []).length, 1 + Math.floor((p.abp || 0) / 10));
function pickCard(ci, k){
  const c = S.academy.candidates[ci]; if (!c) return;
  const p = c.p; dealCards(p);
  if (p.cd.done) return;
  const h = p.cd.hand[k]; applyCard(p, h.t, h.v); p.cd.done = h;
  renderAcademyPage(); save();
}
function rerollCards(){
  if (S.gold < CARD_PRICE){ toast(`Бракує золота (${CARD_PRICE})`); return }
  S.gold -= CARD_PRICE;
  S.academy.candidates.forEach(c => { if (!c.p.cd || !c.p.cd.done){ c.p.cd = null; dealCards(c.p) } });
  renderTop(); renderAcademyPage(); save();
}
function intensive(ci, kind){
  const c = S.academy.candidates[ci]; if (!c) return; const p = c.p;
  if (!p.it || p.it.s !== S.season) p.it = { s: S.season, n: 0 };
  if (p.it.n >= 2){ toast("«Інтенсив» — не більше двох разів за сезон на вихованця"); return }
  if (S.gold < INTENSIVE){ toast(`Бракує золота (${INTENSIVE})`); return }
  S.gold -= INTENSIVE; p.it.n++;
  if (kind === "rd") p.rd = Math.min(60, (p.rd || 0) + 10); else applyCard(p, "ab", 10);
  addNews("eye", `«Інтенсив» для ${p.name}: ${kind === "rd" ? "готовність +10" : "здібності +10 очок"}`);
  renderTop(); renderAcademyPage(); save();
}
window.pickCard = pickCard; window.rerollCards = rerollCards; window.intensive = intensive;
/* юнак: yearsLeft 2 — щойно прийшов (16 років), 0 — уже готовий (18) */
function genYouth(yearsLeft){
  const p = genYouth0(yearsLeft);
  p.abp = 0; p.rd = yearsLeft <= 0 ? 60 : 0;     // вихованець стартує без прокачаних здібностей; готовність 0–60
  return p;
}
function genYouth0(yearsLeft){
  const isGK = V.R() < 1 / 7;
  const role = isGK ? "gk" : V.pick(ACAD_ROLES);
  const st = V.wpick([1, 2, 3, 4, 5, 6], starChances(S.buildings.academy));
  const [lo, hi] = V.LIM_BAND[st - 1];
  const lim = V.rf(lo, hi), age = 18 - yearsLeft;
  return new V.P(V.uname(), role, V.lineFor(lim, isGK ? "gk" : role, age) * V.rf(0.85, 1.0), isGK, age, 0.30, lim);
}
function newIntake(){
  S.academy.offers = Array.from({ length: V.ri(6, 8) }, () => { const p = genYouth(2); makeRange(p); return p });
}
function stockAcademyAtFounding(){
  /* один уже готовий — є кого підписати в перший сезон; решту слотів обираєш із набору */
  S.academy.candidates = [{ p: genYouth(0) }];
  newIntake();
}
function ageAcademyOneSeason(){ newIntake() }
function enroll(i){
  if (S.academy.candidates.length >= academySlots()){ toast("Вільних слотів в академії немає"); return }
  const p = S.academy.offers.splice(i, 1)[0]; if (!p) return;
  p.kn = null;                                   // своїх вихованців знаєш повністю
  p.rd = 0; p.abp = 0; p.cd = null;
  S.academy.candidates.push({ p });
  addNews("eye", `${p.name} (${p.stars()} ★) узятий в академію.`);
  renderAcademyPage(); save();
}
function signCandidate(i){
  const c = S.academy.candidates[i];
  if (!c || !isReadyC(c)) return;
  contractSheet(c.p, { title: `Підписати з академії: ${c.p.name}`, onSign: (years, wage, role) => {
    const k = S.academy.candidates.indexOf(c); if (k === -1) return;
    signAcademy(c, years, wage, role);
    addNews("eye", `${c.p.name} з академії підписаний в основну команду: контракт на ${years} ${yrs(years)}, з.п. ${fmt(wage)}.`);
    renderAcademyPage(); if (page === "team") renderTeam(); save();
  } });
}
function signAcademy(c, years, wage, role){
  c.p.ss = c.p.power(); c.p.wg = wage; c.p.ct = S.season + years - 1; c.p.js = S.season;
  c.p.rl = role || selfRole(c.p); c.p.mr = 70; c.p.gp = 0; c.p.gt = 0; c.p.wo = false; c.p.warned = false;
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
  if (o.renew && (p.mr ?? 70) < 40){
    $("#sheet").innerHTML = `<h2>${p.name} відмовляється</h2>
      <div class="s">мораль ${Math.round(p.mr)} — ${moodOf(p)[0]} ${moodOf(p)[1]}</div>
      <p style="font-size:13px;color:var(--muted);margin:0 0 12px">Він не хоче продовжувати контракт: мало грає, а обіцяли більше. Дай йому грати — мораль піднімається з кожним матчем, — і проси знову. Або продай його, поки контракт діє.</p>
      <button class="btn ghost sm" onclick="closeSheet()">Закрити</button>`;
    return openSheet();
  }
  const self = selfRole(p);
  const role = o.role && ROLE_T[o.role] && roleMult(p, o.role) != null && !roleFull(p, o.role) ? o.role : (roleFull(p, self) ? "rot" : self);
  o.role = role;
  const rm = roleMult(p, role);
  const base = (o.baseWage ?? V.wageFor(p)) * rm;
  const today = o.today || 0;
  const oldWage = o.renew ? V.wageOf(p) : 0;
  const rolesUI = (p.age < 20 && !p.gk ? ["young", "bench", "rot", "main", "star"] : ["bench", "rot", "main", "star"]).map(id => {
    const m = roleMult(p, id), full = roleFull(p, id);
    const t = m == null ? "відмовиться" : full ? "місць немає" : m === 1 ? "звичайна з.п." : m > 1 ? `з.п. +${Math.round((m - 1) * 100)} %` : `з.п. −${Math.round((1 - m) * 100)} %`;
    return `<button class="cterm ${id === role ? "on" : ""}" data-role="${id}" ${m == null || full ? "disabled" : ""}><b>${ROLE_T[id].name}</b><i>${ROLE_T[id].promise}</i><s>${t}</s></button>`;
  }).join("");
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
    <div class="lab" style="margin-top:6px">Роль у команді · він вважає себе: ${ROLE_T[self].name}</div>
    <div class="cterms">${rolesUI}</div>
    <p style="font-size:11px;color:var(--dim);margin:6px 0 0">Якщо не даси грати стільки, скільки обіцяв, мораль падає (Зірка — найшвидше). Нижче 40 — не продовжить контракт, нижче 25 — попросить продати.</p>
    <div class="lab" style="margin-top:10px">Строк контракту · коротший дорожчий за рік</div>
    <div class="cterms">${rows.map(r => `<button class="cterm" data-y="${r.y}" ${r.why ? "disabled" : ""}>
        <b>${r.y} ${yrs(r.y)}</b><i>до кінця сезону ${until(r.y)}</i>
        <u>${fmt(r.w)} / сезон</u><s>${r.why || "разом " + fmt(r.w * r.y)}</s></button>`).join("")}</div>
    <p style="font-size:11.5px;color:var(--dim);margin:10px 0 0">Вільно в стелі зарплат: ${fmt(Math.max(0, wageCapNow() - ME.wageBill() + oldWage))} · бюджет ${fmt(S.money)}</p>
    <button class="btn ghost sm" style="margin-top:12px" onclick="closeSheet()">Скасувати</button>`;
  $$("#sheet [data-role]").forEach(b => b.onclick = () => { o.role = b.dataset.role; contractSheet(p, o) });
  $$("#sheet .cterm[data-y]").forEach(b => b.onclick = () => {
    const r = rows.find(x => x.y === +b.dataset.y); if (!r || r.why) return;
    closeSheet();
    if (o.renew){
      p.wg = r.w; p.ct = until(r.y); p.wagePrem = undefined; p.rl = role; p.gp = 0; p.gt = 0; p.warned = false;
      addNews("cap", `${p.name}: контракт продовжено до кінця сезону ${p.ct}, з.п. ${fmt(r.w)}`);
      save(); if (page === "team") renderTeam();
    } else o.onSign(r.y, r.w, role);
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
  $("#acadSub").textContent = `Щодня 4 картки на вихованця — обери одну (не вибереш — день пропаде). Не влаштовують — «Нові картки» за ${CARD_PRICE} золота. · ${S.academy.candidates.length} / ${academySlots()} слотів · академія рівня ${S.buildings.academy}: шанс на тризіркового й кращого — ${good} %`;
  box.innerHTML = S.academy.candidates.length ? S.academy.candidates.map((c, i) => {
    const p = c.p, ready = isReadyC(c), rd = Math.min(60, Math.round(p.rd || 0));
    dealCards(p);
    const ab = (p.abl || []).map((id, k) => k < abOpen(p) ? `<b>${V.ABIL[id].name} ${V.abLv(p, id)}</b>` : `<u title="відкриється карткою «Здібність»">? закрита</u>`).join(" · ");
    const cards = p.cd.done
      ? `<p class="cdone">Сьогодні вибрано: ${CARD_T[p.cd.done.t]} +${p.cd.done.v}. Нові картки — завтра.</p>`
      : `<div class="cards">${p.cd.hand.map((h, k) => `<button class="card c-${h.t}" onclick="pickCard(${i},${k})"><i>${CARD_T[h.t]}</i><b>+${h.v}</b></button>`).join("")}</div>`;
    return `<div class="acad-card">
      <div class="h"><div class="pos">${p.pos()}</div><b>${p.name}</b></div>
      <p>${p.age} ${yrs(p.age)} · ${V.ROLE_UA[p.role]} · сила ${f1(p.power())} · межа ${Math.round(p.pot)} (рівень Д${V.divOf(p.pot)}) · ${stars(p)}</p>
      <div class="rdrow"><span>Готовність ${rd} з 60</span><div class="rdbar"><i style="width:${rd / 60 * 100}%"></i></div></div>
      <p class="abl">Здібності: ${ab || "—"}</p>
      <div class="status ${ready ? "ready" : "wait"}">${ready ? "готовий підписати" : rd >= 60 ? "готовий, але ще не 17 років" : "у академії: тренуй щодня — +1 до готовності"}</div>
      ${cards}
      <div class="row">
        <button class="btn sm ${ready ? "" : "ghost"}" data-sign="${i}" ${ready ? "" : "disabled"}>Підписати</button>
        <button class="btn ghost sm" data-release="${i}">Відрахувати</button>
        <button class="btn ghost sm" onclick="intensive(${i},'rd')" title="${INTENSIVE} золота">Інтенсив: готовність +10</button>
        <button class="btn ghost sm" onclick="intensive(${i},'ab')" title="${INTENSIVE} золота">Інтенсив: здібності +10</button>
      </div>
    </div>`;
  }).join("") : `<div class="acad-empty">В академії поки нікого. Обери кандидатів із набору нижче.</div>`;
  $$("#acadGrid [data-sign]").forEach(b => b.onclick = () => signCandidate(+b.dataset.sign));
  $$("#acadGrid [data-release]").forEach(b => b.onclick = () => releaseCandidate(+b.dataset.release));
  const free = academySlots() - S.academy.candidates.length, offers = S.academy.offers || [];
  $("#offerSub").textContent = offers.length
    ? `${offers.length} кандидатів від скаута, 16 років. Вільних слотів: ${free}. Звітів скаута: ${scoutLeft()} (безкоштовні щодня, далі ${SCOUT_GOLD} золота). Решта піде, коли прийде новий набір.`
    : `Набір цього сезону розібрано. Новий прийде на початку наступного сезону.`;
  $("#acadOffers").innerHTML = offers.map((p, i) => `<div class="acad-card">
      <div class="h"><div class="pos">${p.pos()}</div><b>${p.name}</b></div>
      <p>${p.age} ${yrs(p.age)} · ${V.ROLE_UA[p.role]} · сила ${powView(p)} · ${starsView(p)}${kPow(p) ? ` · межа ${Math.round(p.pot)}` : ""}</p>
      <div class="row">
        <button class="btn sm ${free > 0 ? "" : "ghost"}" data-enroll="${i}" ${free > 0 ? "" : "disabled"}>Взяти</button>
        ${scoutBtns(p, `data-scout="${i}"`)}
      </div>
    </div>`).join("");
  $$("#acadOffers [data-enroll]").forEach(b => b.onclick = () => enroll(+b.dataset.enroll));
  $$("#acadOffers [data-scout]").forEach(b => b.onclick = () => scoutReport(offers[+b.dataset.scout], b.dataset.st, renderAcademyPage));
}
function renderAcademyPage(){
  renderAcademy();
  $("#scoutLvl").textContent = S.buildings.scouts;
  $("#scoutNote").textContent = `Скаутський центр дає ${scoutPerDay(S.buildings.scouts)} безкоштовних звітів на день (лежать до 3 днів), зараз є ${scoutLeft()}; понад це — ${SCOUT_GOLD} золота. Два види звітів: на зірки й на силу з межею. Діють і на кандидатів академії, і на гравців інших дивізіонів на ринку.${S.buildings.scouts >= 5 ? "" : " З 5-го рівня початковий діапазон зірок вужчий."}`;
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
const starsSeen = p => kStars(p) ? [p.stars(), p.stars()] : p.sr;
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
const avatar = p => `<div class="av">${faceOf(p) ? `<img src="${faceSmall(p)}" alt="">` : `<span>${p.pos()}</span>`}</div>`;
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
    ${known(p) ? "" : `<div class="mscout">${scoutBtns(p, `data-scout="${i}"`)}</div>`}
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
    $$("#marketBody [data-scout]").forEach(b => b.onclick = () => scoutReport(rows[+b.dataset.scout].p, b.dataset.st, renderMarket));
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
    onSign: (years, wage, role) => completeBuy(row, years, wage, role),
  });
}
function completeBuy(row, years, wage, role){
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
  row.p.rl = role || selfRole(row.p); row.p.mr = 70; row.p.gp = 0; row.p.gt = 0; row.p.wo = false; row.p.warned = false;
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
   НАГОРОДИ ЗА ВХІД (рішення 29.09, ПЛАН «Нагороди за вхід»)
   Цикл 30 днів = сезон; серія згоряє при пропуску, рятують жетони незгоряння (10-й день і кожні 100).
   Круглі дні (підряд): 50/150/250/350/450 — емблема; 100/200/300/400 — жетон + форма; 365 — форма + 100 золота;
   500 — форма, емблема, жетон. Золото кожні 7 днів; гроші — частка доходу сезону; аптечки; звіти скаута; на 30-й день — здібність.
   ======================================================================= */
const todayStr = () => window.__today || new Date().toLocaleDateString("sv-SE");   // YYYY-MM-DD
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
function rewardFor(streak){
  const cyc = (streak - 1) % 30 + 1, R = { cyc, streak, money: 0, g: 0, r: 0, scouts: 0, gold: 0, tok: 0, ab: null, crest: 0, kit: 0 };
  if (cyc <= 28){
    const d = (cyc - 1) % 7 + 1, w = Math.floor((cyc - 1) / 7);
    if (d === 1 || d === 4) R.money = .3;
    if (d === 2){ R.g = 1; R.scouts = 1 }
    if (d === 3){ R.r = 1; R.scouts = 1 }
    if (d === 5){ R.g = 1; R.scouts = 1 }
    if (d === 6) R.money = .5;
    if (d === 7){ R.gold = [3, 5, 7, 10][w]; R.scouts = 2 }
  } else if (cyc === 29) R.money = 1;
  else { R.ab = V.pick(["def", "mid", "att", "gk"]); R.r = 1 }
  if (streak === 10) R.tok++;
  if (streak >= 100 && streak % 100 === 0) R.tok++;
  if ([50, 150, 250, 350, 450].includes(streak)) R.crest = 1;
  if ([100, 200, 300, 400].includes(streak)) R.kit = 1;
  if (streak === 365){ R.kit = 1; R.gold += 100 }
  if (streak === 500){ R.kit = 1; R.crest = 1 }
  return R;
}
const AB_GROUP = { def: "захисник", mid: "півзахисник", att: "нападник", gk: "воротар" };
function rewardText(R){
  const t = [];
  if (R.money) t.push(`гроші клубу: ${String(R.money).replace(".", ",")} % доходу сезону ≈ ${fmt(incomeEstimate() * R.money / 100)}`);
  if (R.gold) t.push(`золото: ${R.gold}`);
  if (R.g) t.push(`зелена аптечка: ${R.g}`);
  if (R.r) t.push(`червона аптечка: ${R.r}`);
  if (R.scouts) t.push(`звіти скаута: ${R.scouts}`);
  if (R.ab) t.push(`здібність (+10 очок) для гравця-${AB_GROUP[R.ab]}`);
  if (R.tok) t.push(`жетон незгоряння: ${R.tok}`);
  if (R.crest) t.push("нова емблема");
  if (R.kit) t.push("нова форма");
  return t;
}
function loginCheck(){
  const L = S.login, t = todayStr();
  if (L.last === t) return;
  let burnt = false;
  if (!L.last) L.streak = 1;
  else {
    const diff = daysBetween(L.last, t);
    if (diff <= 0) return;
    if (diff === 1) L.streak++;
    else if (L.tok >= diff - 1){ L.tok -= diff - 1; L.streak++; addNews("cap", `Жетон незгоряння врятував серію: пропущено ${diff - 1} ${dayW(diff - 1)}.`) }
    else { burnt = L.streak > 1; L.streak = 1 }
  }
  L.last = t; L.pending = { streak: L.streak, burnt };
  save();
}
function rewardSheet(){
  const P = S.login.pending; if (!P) return;
  const R = rewardFor(P.streak), items = rewardText(R);
  $("#sheet").innerHTML = `<h2>Нагорода за вхід · день ${P.streak}</h2>
    <div class="s">цикл ${R.cyc} з 30 · жетонів незгоряння: ${S.login.tok}</div>
    ${P.burnt ? `<p style="font-size:12.5px;color:var(--bad);margin:0 0 8px">Серію перервано — почалась нова. Жетон незгоряння дають на 10-й день і кожні 100 днів.</p>` : ""}
    <div class="plist">${items.map(x => `<div class="p"><div class="pn"><b>${x}</b></div></div>`).join("")}</div>
    <p style="font-size:11.5px;color:var(--dim);margin:8px 0 0">Пропустиш день — серія згорить (крім випадку, коли є жетон). Круглі дні: 50 — емблема, 100 — жетон і форма, 365, 500 — особливі.</p>
    <button class="btn" style="margin-top:12px" onclick="claimReward()">Забрати</button>`;
  openSheet(true);
}
function claimReward(){
  const P = S.login.pending; if (!P) return;
  const R = rewardFor(P.streak), k = kitsToday(), cap = kitCap();
  if (R.money){ const m = Math.round(incomeEstimate() * R.money / 100); book("login", m) }
  S.gold += R.gold; k.g = Math.min(Math.max(k.g, cap.g), k.g + R.g); k.r = Math.min(Math.max(k.r, cap.r), k.r + R.r);
  scoutLeft(); S.scout.left += R.scouts; S.login.tok += R.tok;
  const gift = (kind, n, all) => { const free = [...Array(n).keys()].filter(i => !S.owned[kind].includes(i)); if (free.length){ const i = V.pick(free); S.owned[kind].push(i); return true } S.gold += 100; return false };
  if (R.crest) gift("crests", CREST_COUNT);
  if (R.kit) gift("kits", KIT_COUNT);
  S.login.pending = null;
  addNews("cap", `Нагорода за вхід (день ${P.streak}): ${rewardText(R).join(", ")}.`);
  renderTop(); save();
  if (R.ab) abilityTargetSheet(R.ab); else { closeSheet(); if (page === "home") renderHome() }
}
function abilityTargetSheet(group){
  const grp = p => p.gk ? "gk" : ["ЦЗ", "КЗ"].includes(p.pos()) ? "def" : ["ОП", "ЦП", "АП"].includes(p.pos()) ? "mid" : "att";
  const list = squadAll().filter(p => (p.abl || []).length && grp(p) === group);
  window.__abList = list;
  $("#sheet").innerHTML = `<h2>Здібність для ${AB_GROUP[group]}а</h2>
    <div class="s">+10 очок здібностей — обери, кому</div>
    <div class="plist">${list.map((p, i) => `<div class="p" onclick="giveAbility(${i})" style="cursor:pointer"><div class="pos">${p.pos()}</div>
      <div class="pn"><b>${p.name}</b><i>${p.age} р · ${stars(p)} · очок ${p.abp || 0}</i></div></div>`).join("") || "<p style=\"font-size:12.5px\">У складі немає підходящого гравця — очки перейдуть у золото (+30).</p>"}</div>
    <button class="btn ghost sm" style="margin-top:12px" onclick="${list.length ? "closeSheet()" : "giveGold30()"}">${list.length ? "Пізніше" : "Добре"}</button>`;
  openSheet(true);
}
window.giveAbility = i => { const p = window.__abList[i]; if (!p) return; applyCard(p, "ab", 10); addNews("eye", `${p.name} отримав +10 очок здібностей за нагороду`); closeSheet(); save(); if (page === "home") renderHome() };
window.giveGold30 = () => { S.gold += 30; closeSheet(); renderTop(); save() };
window.claimReward = claimReward; window.rewardSheet = rewardSheet;
function homeRewardBlock(){
  const L = S.login, box = $("#homeReward"); if (!box) return;
  const next = rewardFor(L.streak + 1), toRound = [10, 50, 100, 150, 200, 250, 300, 350, 365, 400, 450, 500].find(x => x >= L.streak + (L.pending ? 0 : 1));
  box.innerHTML = L.pending
    ? `<div class="rwd"><b>Нагорода за вхід чекає · день ${L.pending.streak}</b><br>${rewardText(rewardFor(L.pending.streak)).join(" · ")}<br><button class="btn sm" onclick="rewardSheet()">Забрати</button></div>`
    : `<div class="rwd" style="border-color:var(--line)"><span style="color:var(--dim)">Серія входу: <b>${L.streak}</b> ${pl(L.streak, "день", "дні", "днів")} · жетонів незгоряння: ${L.tok}${toRound ? ` · до особливого дня (${toRound}): ${toRound - L.streak}` : ""}. Завтра: ${rewardText(next).join(", ")}.</span></div>`;
}

/* =======================================================================
   МАГАЗИН
   ======================================================================= */
const CREST_PRICE = 120, KIT_PRICE = 200;
let shopView = "buy";
$$("#shopTabs button").forEach(b => b.onclick = () => {
  shopView = b.dataset.v;
  $$("#shopTabs button").forEach(x => x.classList.toggle("on", x === b));
  renderShop();
});
/* аптечки пачками: ціна за штуку знижується, як у Top Eleven (5 / 10 / 25) */
const PACKS = { g: { 5: 28, 10: 54, 25: 130 }, r: { 5: 45, 10: 85, 25: 200 } };
function buyPack(kind, n){
  const k = kitsToday(), cap = kitCap()[kind], price = PACKS[kind][n];
  if (k[kind] + n > cap){ toast(`Сховище медцентру вміщує ${cap}, у тебе ${k[kind]} — стільки не влізе. Підніми медцентр.`); return }
  if (S.gold < price){ toast(`Бракує золота: ${price}`); return }
  S.gold -= price; k[kind] += n; renderShop(); renderTop(); save();
}
window.buyPack = buyPack;
/* золото → гроші клубу: 10 золота = 1 % доходу сезону, не більше 80 % за сезон */
function exchange(pct){
  if (S.exch.season !== S.season) S.exch = { season: S.season, pct: 0 };
  if (S.exch.pct + pct > 80){ toast(`За сезон можна обміняти не більше 80 % доходу — ще ${80 - S.exch.pct} %`); return }
  const gold = pct * GOLD_K; if (S.gold < gold){ toast(`Бракує золота: ${gold}`); return }
  const money = Math.round(incomeEstimate() * pct / 100);
  S.gold -= gold; S.exch.pct += pct; book("gold", money);
  addNews("cap", `Обмін золота: ${gold} золота → ${fmt(money)} на рахунок клубу`);
  renderShop(); renderTop(); save();
}
window.exchange = exchange;
function renderShop(){
  const box = $("#shopBody");
  if (shopView === "med"){
    const k = kitsToday(), cap = kitCap();
    box.innerHTML = `<div class="note"><h3>Аптечки</h3><p>Зелена — +15 % свіжості одному гравцю (не більше ${GREEN_DAY} на день на команду). Червона — на день менше травми.
      Тепер є: зелених ${k.g} з ${cap.g}, червоних ${k.r} з ${cap.r}. Поштучно — в картці гравця (${MED_PRICE.g} і ${MED_PRICE.r} золота).</p></div>
      <div class="lab" style="margin-top:12px">Зелені</div>
      <div class="kits">${[5, 10, 25].map(n => `<button class="btn sm ghost" onclick="buyPack('g',${n})">${n} шт · ${PACKS.g[n]} золота</button>`).join("")}</div>
      <div class="lab" style="margin-top:12px">Червоні</div>
      <div class="kits">${[5, 10, 25].map(n => `<button class="btn sm ghost" onclick="buyPack('r',${n})">${n} шт · ${PACKS.r[n]} золота</button>`).join("")}</div>`;
    return;
  }
  if (shopView === "gold"){
    if (S.exch.season !== S.season) S.exch = { season: S.season, pct: 0 };
    const inc = incomeEstimate();
    box.innerHTML = `<div class="note"><h3>Золото → гроші клубу</h3>
      <p>${GOLD_K} золота = 1 % доходу сезону твого клубу (зараз ≈ ${fmt(inc)}). За сезон можна обміняти до 80 %: взято ${S.exch.pct} %.</p></div>
      <div class="kits" style="margin-top:12px">${[5, 10, 20].map(p => `<button class="btn sm ghost" onclick="exchange(${p})">${p * GOLD_K} золота → ${fmt(inc * p / 100)}</button>`).join("")}</div>
      <div class="note" style="margin-top:16px"><h3>Скаути, картки, інтенсив</h3>
        <p>Звіт скаута — ${SCOUT_GOLD} золота (безкоштовні — щодня). Перекинути картки академії всім — ${CARD_PRICE}. «Інтенсив» вихованця — ${INTENSIVE}. Прискорення будівництва й третя черга — в «Інфраструктурі».</p></div>`;
    return;
  }
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
        <p>Золото продаватиметься пакетами через Google Play: 200 — 4,99 € · 450 — 9,99 € · 1500 — 29,99 € · 6000 — 99,99 €. У прототипі справжньої оплати немає — тільки золото на рахунку.</p></div>`;
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
/* коротке повідомлення: смужка внизу, сама зникає й нічого не закриває (рішення 30.09 — вікно на весь екран дратувало) */
let toastTimer = null;
function toast(txt){
  let el = $("#toastbar");
  if (!el){ el = document.createElement("div"); el.id = "toastbar"; document.body.appendChild(el) }
  el.textContent = String(txt).replace(/<[^>]+>/g, "");
  el.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("on"), 2800);
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
  $("#testState").textContent = S.test.on ? `увімкнено · час гри: ${dayLabel(nowTs())}, ${hhmm(loc(nowTs()))}` : "вимкнено";
  $("#testNext").hidden = !S.test.on;
  $("#testNext").onclick = () => { testNext(); renderSettings() };
  $("#testOn").textContent = S.test.on ? "Вимкнути" : "Увімкнути";
  $("#testWin").textContent = `Завжди перемагати: ${S.test.win ? "так" : "ні"}`;
  $("#testOn").onclick = () => { S.test.on = !S.test.on; if (S.test.on) finishQueueNow(); renderSettings(); renderTop(); save() };
  $("#testWin").onclick = () => { S.test.win = !S.test.win; renderSettings(); save() };
  $("#testMoney").onclick = () => { S.money += 5000000; addNews("cap", "Режим перевірки: +5 000 000 на рахунок"); renderTop(); save() };
  $("#testD4").hidden = !S.test.on;
  $("#testD4").onclick = () => testToD4();
}
/* у режимі перевірки будівлі добудовуються одразу */
function finishQueueNow(){ S.queue.forEach(q => { q.endAt = Date.now() }); processQueue() }

/* =======================================================================
   МАТЧ
   ======================================================================= */
/* точки на полі матчу: схема кожної команди (гості — дзеркально) */
const dotsOf = (t, away) => t.slots().map(s => { const [x, y] = (FORM_XY[t.form] || FORM_XY["4-3-3"])[s] || [50, 50];
  const hx = .05 + x * .0047, hy = 1 - y / 100; return away ? [1 - hx, 1 - hy] : [hx, hy] });
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
function openMatch(fix){
  const f = fix || nextFixture();
  CUPCTX = !!f.cup; M.kind = f.cup ? "cup" : "league";
  M.hm = f.home; M.aw = f.away; M.hm.home = true; M.aw.home = false;
  ME.crowd = M.hm === ME ? crowdNow() : 1;
  if (f.neutral){ M.hm.home = false; ME.crowd = 1 }   // фінал ЛЧ — нейтральне поле
  ensureRoles();
  if (M.day !== f.key){ M.day = f.key; autoLineup() }   // перед кожним матчем (і другим у суботу, і кубковим)
  M.hm.reset(); M.aw.reset(); setMorale();
  M.live = false; M.min = 0; M.ep = 0; M.half = 1; M.over = false; M.forced = false; M.N = V.ri(64, 76);
  M.ph = V.possession(M.hm, M.aw);
  $("#mh").textContent = M.hm.name; $("#ma").textContent = M.aw.name;
  $("#mgh").textContent = 0; $("#mga").textContent = 0;
  $("#mclock").className = "clock paused"; $("#mclock").textContent = "до стартового свистка";
  $("#comm").innerHTML = "";
  M.done = false; M.auto = false; M.ev = null; M.pens = ""; M.cupWon = false;
  const e = f.e;
  if (e) $("#mclock").textContent = `${f.cup ? `${compName()} · ${cupRoundName(S.cup.round)} · ` : ""}${dayLabel(e.ts)}, ${hhmm(loc(e.ts))}`;
  $("#startBtn").textContent = e ? `${f.cup ? compName() + " · " : ""}Матч почнеться сам о ${hhmm(loc(e.ts))}` : "Сезон зіграно";
  $("#startBtn").style.display = "";
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
  $("#spd").parentElement.style.display = S.test.on ? "" : "none";   // у справжній грі швидкість одна для обох
}
function renderCtrl(){
  syncFormSel();
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
       <i>${posLbl(p)}</i><b>${p.name.split(" ")[1] || p.name}</b><u>${Math.round(p.power())}</u>
     </button>`).join("");
  $$("#benchRow button").forEach(b => b.onclick = () => askSub(+b.dataset.i));
}
function askSub(i){
  if (ME.subsMade >= 5) return;
  const inP = ME.bench[i];
  $("#sheet").innerHTML = `<h2>Заміна</h2>
    <div class="s">виходить ${inP.pos()} ${inP.name} · сила ${Math.round(inP.power())}</div>
    ${inP.gk ? `<p style="font-size:11.5px;color:var(--dim);margin:0 0 8px">Воротар може замінити лише воротаря.</p>` : ""}
    <div class="plist">${(inP.gk ? ["GK"] : mySlots().slice(1)).map(s => {
      const p = getP(s), fit = Math.round(inP.fitIn(s));
      return `<div class="p" data-s="${s}"><div class="pos">${V.SLOT_POS[s]}</div>
        <div class="pn"><b>${p.name}</b><i>${V.SLOT_UA[s]} · ${p.injured ? '<span style="color:var(--bad)">травмований у цьому матчі</span> · ' : ""}свіжість ${Math.round(p.fresh * 100)} %</i></div>
        <div class="pv"><b>${Math.round(p.fitIn(s))}</b><i style="font-style:normal;font-size:10px;color:${fit >= p.fitIn(s) ? "var(--live)" : "var(--dim)"}">стане ${fit}${famPct(inP, s) < 100 ? ` (${famPct(inP, s)} %)` : ""}</i></div></div>`;
    }).join("")}</div>
    <button class="btn ghost sm" style="margin-top:14px" onclick="closeSheet()">Скасувати</button>`;
  openSheet();
  $$("#sheet .p").forEach(el => el.onclick = () => {
    const s = el.dataset.s, outP = getP(s);
    setP(s, inP); ME.bench[i] = outP; ME.subsMade++;
    if (M.played) M.played.add(inP);
    closeSheet(); renderBench(); act("склад");
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
  homeDots = (M.hm ? dotsOf(M.hm, false) : HF_BASE).map(mk);
  awayDots = (M.aw ? dotsOf(M.aw, true) : AF_BASE).map(mk);
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

/* ---- цикл матчу: іде за годинником, однаково для обох суперників (рішення 30.09) ----
   Хто зайшов посеред матчу, потрапляє на поточну хвилину: попередні вже зіграні й видні в стрічці. */
$("#startBtn").onclick = () => {
  if (M.over && S.lastRep) return showReport();
  const e = nextFixture().e;
  if (e && !M.live) toast(`Матч почнеться сам: ${dayLabel(e.ts)}, ${hhmm(loc(e.ts))}`);
};
const spd = () => S.test.on ? M.speed : 1;            // прискорення — лише в режимі перевірки
const matchSeed = e => hash32(`${S.club.name}-${S.season}-${e.t}${e.r}`);   // той самий хід матчу, хоч коли зайти
/* матч за подією календаря: тур ліги або раунд Кубка */
function fixtureFor(e){
  if (e.t === "c") return { ...cupFixture(), e, key: `c${S.season}-${e.r}`, neutral: S.cup.kind === "cl" && e.r === CL_LAST };
  return { ...myFixture(), e, key: `${S.season}-${S.round}` };
}
/* мій найближчий матч: тур ліги чи раунд Кубка — що раніше */
function nextFixture(){
  const le = S.round <= 30 ? matchEvent(S.round) : null;
  const ce = myCupPair() ? cupEvent(S.cup.round) : null;
  if (ce && (!le || ce.ts < le.ts)) return fixtureFor(ce);
  return { ...myFixture(), e: le, key: `${S.season}-${S.round}` };
}
/* після матчу: тур ліги чи раунд Кубка */
function afterMatch(e){ if (M.kind === "cup") cupRoundDone(e, M.cupWon); else roundDone(e); M.done = true; CUPCTX = false }
/* свіжість основи суперника-ШІ перед матчем: він теж ротує, але подвійна субота втомлює й його */
function aiFreshFor(e){
  if (e.t === "c") return 1;                          // Кубок — перший матч дня
  const sameDay = (a, b) => a && b && gz(a.ts).d === gz(b.ts).d;
  if (monthPlan(S.month).ev.some(x => x.t === "c" && sameDay(x, e))) return .85;   // увечері після Кубка ШІ частково ротує
  const ms = monthPlan(S.month).ev.filter(x => x.t === "m"), i = ms.indexOf(e);
  if (sameDay(ms[i - 1], e)) return .75;
  if (i >= 2 && sameDay(ms[i - 2], ms[i - 1])) return .85;
  return 1;
}
function kickoff(e){
  V.setAiFresh(aiFreshFor(e));
  const fx = fixtureFor(e);
  V.reseed(matchSeed(e));
  M.day = null; openMatch(fx);                        // склад перед свистком: автовибір (підтверджений не чіпає)
  M.live = true; M.ev = e; M.nextAt = e.ts + EP_MS / spd(); M.h2 = false;
  $("#startBtn").style.display = "none";
  setMorale();
  M.played = new Set(ME.onPitch());
  renderMatchPrep();
  if (page === "match") keepAwake(true);
  say(0, `Стартовий свисток. ${M.hm.name} — ${M.aw.name}.`, "big");
}
/* доганяє матч до теперішньої миті: кожен епізод — 4,3 с, перерва — 3,2 с */
function liveDrive(now){
  let guard = 0;
  while (M.live && !M.over && now >= M.nextAt && guard++ < 200){
    const paused = step();
    M.nextAt += (paused ? HALF_MS : EP_MS) / spd();
  }
}
function step(){
  M.ep++;
  M.min = Math.min(90, Math.round(M.ep * 90 / M.N));
  if (M.half === 1 && M.min >= 45){
    M.half = 2; M.min = 45; M.ep--;
    $("#mclock").className = "clock paused"; $("#mclock").textContent = "перерва";
    say(45, `Перерва. ${M.hm.goals} : ${M.aw.goals}`, "big");
    M.hm.onPitch().forEach(p => p.fresh = Math.min(1, p.fresh + .07));
    M.aw.onPitch().forEach(p => p.fresh = Math.min(1, p.fresh + .07));
    return true;
  }
  if (M.half === 2 && !M.h2){ M.h2 = true; say(46, "Другий тайм почався.") }
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
  M.over = true; M.live = false;
  keepAwake(false);
  $("#mclock").className = "clock paused"; $("#mclock").textContent = "фінальний свисток";
  say(90, `Фінальний свисток. ${M.hm.name} ${M.hm.goals} : ${M.aw.goals} ${M.aw.name}`, "big");
  settleRound();
  afterMatch(M.ev);
  renderTop(); if (page === "home") renderHome(); save();
  setTimeout(showReport, 900);
}
/* Підсумок туру: мій результат, решта матчів туру, приріст від матчу, призові. */
function settleRound(){
  const cup = M.kind === "cup";
  if (cup) settleCup();
  else {
    regResult(M.hm.name, M.aw.name, M.hm.goals, M.aw.goals, true);
    S.fixtures[(S.round - 1) % S.fixtures.length].forEach(([h, a]) => {
      if (h === ME.name || a === ME.name) return;
      const [gh, ga] = V.quickMatch(teamBy(h), teamBy(a));
      regResult(h, a, gh, ga, false);
    });
  }
  /* матч додає росту тим, хто грав (без фокуса — просто ігрова практика);
     тренувальна база тут ні до чого — вона впливає лише на тренування */
  (M.played || new Set()).forEach(p => {
    p._mg = (p._mg || 0) + p.grow(p.slopeDay(ageF(p)) * V.MATCH_K * matchBoost(p), ageF(p));
  });
  /* травми й червоні після матчу (рішення 29.09): травма — за видом, медцентр скорочує строк;
     червона — пропуск наступного матчу */
  squadAll().forEach(p => {
    if (p.injured && !(p.out > 0)){
      const j = V.rollInjury(S.buildings.medical); p.out = j.days; p.inj = j.name;
      addNews("inj", `${p.name}: ${j.name} — не гратиме ${j.days} ${dayW(j.days)}.`);
    }
    if (p.red){
      if (cup){ p.cban = 1; addNews("cap", `${p.name} отримав червону в Кубку — пропустить наступний матч Кубка.`) }
      else { p.ban = 2; addNews("cap", `${p.name} отримав червону — пропустить наступний матч.`) }
    }
  });
  const diff = M.hm === ME ? M.hm.goals - M.aw.goals : M.aw.goals - M.hm.goals;
  if (!cup){
    /* квитки — лише за домашній матч (15 домашніх за сезон) */
    M.gate = M.hm === ME ? Math.round(V.tickets(S.division, S.buildings.stadium) / 15) : 0;
    if (M.gate) book("tickets", M.gate);
    /* гроші за результат матчу: перемога 3 : нічия 1 : поразка 0,3 */
    M.pay = Math.round(V.matchPay(S.division, diff > 0 ? "w" : diff === 0 ? "d" : "l"));
    book("match", M.pay);
  }
  moraleAfterMatch(diff);
  const opp = M.hm === ME ? M.aw.name : M.hm.name;
  if (cup && S.cup.kind === "cl") addNews(M.cupWon ? "up" : "goal", `Ліга чемпіонів, ${cupRoundName(S.cup.round)}: ${M.hm.name} — ${M.aw.name} ${M.hm.goals}:${M.aw.goals}${M.clMsg ? " — " + M.clMsg : ""}`);
  else if (cup) addNews(M.cupWon ? "up" : "goal",
    `Кубок, ${CUP_NAMES[S.cup.round - 1]}: ${M.hm.name} — ${M.aw.name} ${M.hm.goals}:${M.aw.goals}${M.pens ? " (" + M.pens + ")" : ""} — ${M.cupWon ? (S.cup.round >= 6 ? "Кубок виграно!" : "проходимо далі") : "виліт із Кубка"}${M.pay ? ` · призові ${fmt(M.pay)}` : ""}`);
  else addNews(diff > 0 ? "up" : "goal",
    `${diff > 0 ? "Перемога" : diff === 0 ? "Нічия" : "Поразка"} ${M.hm.goals}:${M.aw.goals} з «${opp}»${M.gate ? ` — квитки ${fmt(M.gate)}` : ""}`);
  S.lastRep = reportHTML();
  $("#startBtn").textContent = "Звіт матчу";
  $("#startBtn").style.display = "";
}
/* Матч без менеджера (не зайшов у гру): автопілот — автовибір складу, без замін, дій і аптечок. */
function autoMatch(e){
  V.setAiFresh(aiFreshFor(e));
  const fx = fixtureFor(e);
  V.reseed(matchSeed(e));
  M.day = null; openMatch(fx);
  setMorale();
  V.quickMatch(M.hm, M.aw);
  M.forced = false;
  if (S.test.win){
    const home = M.hm === ME, mine = home ? M.hm : M.aw, opp = home ? M.aw : M.hm;
    if (mine.goals <= opp.goals){ mine.goals = opp.goals + 1; M.forced = true }
  }
  M.over = true; M.ev = e; M.auto = true; M.played = new Set(ME.onPitch());
  $("#mgh").textContent = M.hm.goals; $("#mga").textContent = M.aw.goals;
  $("#mclock").className = "clock paused"; $("#mclock").textContent = "зіграно без тебе";
  settleRound();
  afterMatch(e);
}
/* Тур зіграно. Кінець дня — окремо, опівночі (dayEnd): у суботу два тури, а відпочинок один. */
function roundDone(e){
  if (e) S.clock.last = Math.max(S.clock.last, e.ts);
  S.round++;
  M.done = true;
  /* за 5 турів до кінця сезону — нагадування, у кого закінчується контракт (ПЛАН 44) */
  if (S.round === 26 && S.remind !== S.season){
    S.remind = S.season;
    const ex = squadAll().filter(lastYear);
    if (ex.length) addNews("cap", `Контракт закінчується наприкінці сезону: ${ex.map(p => p.name).join(", ")}. Продовж у картці гравця, інакше вони підуть вільними агентами.`);
  }
}
/* Годинник гри: прораховує все, що вже настало, — матчі (наживо, якщо гра відкрита в їхній час,
   інакше автопілот) і кінці днів. Кнопки «наступний тур» немає: гра живе сама 24/7. */
let GAME_ON = false, lastSec = 0;
function clockTick(){
  if (!GAME_ON || !ME) return;
  const now = nowTs();
  if (M.live) liveDrive(now);
  let autos = 0, rolled = false, changed = false, guard = 0;
  while (!M.live && guard++ < 400){
    const e = nextEvent();
    if (!e || e.ts > now) break;
    changed = true;
    if (e.t === "m"){
      if (e.r !== S.round){ S.clock.last = e.ts; continue }
      if (now < e.ts + MATCH_LEN){ kickoff(e); liveDrive(now); continue }   // гра відкрита — матч наживо
      autoMatch(e); autos++;
    } else if (e.t === "c"){
      if (!S.cup || S.cup.none || e.r !== S.cup.round){ S.clock.last = e.ts; continue }
      if (myCupPair()){
        if (now < e.ts + MATCH_LEN){ kickoff(e); liveDrive(now); continue }   // гра відкрита — кубковий матч наживо
        autoMatch(e); autos++;
      } else cupRoundDone(e, false);                  // ми вже вибули — раунд грається без нас
    } else if (dayEnd(e)) rolled = true;
  }
  if (changed){
    if (autos && !S.test.on) toast(`Поки тебе не було, зіграно ${autos} ${pl(autos, "матч", "матчі", "матчів")} — результати в новинах`);
    renderTop(); if (page === "home") renderHome();
    save();
    if (rolled) seasonWindow();
  }
  const sec = Math.floor(now / 1000);
  if (sec !== lastSec){ lastSec = sec; renderTop(); if (page === "home") homeClock() }
}
setInterval(clockTick, 250);
window.clockTick = clockTick;
/* ---- режим перевірки: перемотка годинника (у справжній грі її немає) ---- */
function shiftTo(ts){ S.test.shift = (S.test.shift || 0) + Math.max(0, ts - nowTs()) }
function playInstant(){
  if (M.live){ shiftTo(M.ev.ts + MATCH_LEN); clockTick(); return }
  const e = nextFixture().e;
  if (!e) return toast("Сезон зіграно — перехід опівночі останнього дня");
  shiftTo(e.ts + MATCH_LEN + 1000);
  clockTick();
  showReport();
}
function simSeason(){
  const ev = monthPlan(S.month).ev;
  shiftTo(ev[ev.length - 1].ts + 1000);
  clockTick();
  show("home");
}
/* перевірка: перенести клуб у Дивізіон 4, щоб подивитись Лігу чемпіонів (у справжній грі такого немає) */
function testToD4(){
  if (M.live) return toast("Спершу дочекайся кінця матчу");
  S.division = 4; S.table = {}; buildWorld(true);
  newCup(); cupCatchUpPast();
  M.hm = null; openMatch(); save(); renderTop(); show("home");
  toast("Режим перевірки: клуб у Дивізіоні 4 — грає Лігу чемпіонів");
}
window.testToD4 = testToD4;
function testNext(){
  const e = nextEvent(); if (!e) return;
  shiftTo(e.ts + 500);
  clockTick();
}
window.playInstant = playInstant; window.simSeason = simSeason; window.testNext = testNext;
/* Новий менеджер посеред місяця (рішення 30.09) отримує бот-команду з її місцем у таблиці — місця 10–16.
   Тури, що вже минули, дограються без нього. Гроші, золото, аптечки й будівлі — стартові. */
function joinMidSeason(){
  const past = monthPlan(S.month).ev.filter(e => e.t === "m" && e.ts <= S.clock.last);
  if (!past.length) return;
  V.reseed(hash32(`${S.club.name}-join-${S.month.y}-${S.month.m}`));
  past.forEach(e => S.fixtures[(e.r - 1) % S.fixtures.length].forEach(([h, a]) => {
    const [gh, ga] = V.quickMatch(teamBy(h), teamBy(a)); regResult(h, a, gh, ga, false);
  }));
  /* кубкові раунди, що вже минули, — теж без менеджера (його клуб поки грає як бот) */
  const pastCup = monthPlan(S.month).ev.filter(e => e.t === "c" && e.ts <= S.clock.last);
  cupCatchUpPast();
  squadAll().forEach(p => { p.reset(); p.out = 0; p.ban = 0; p.cban = 0; p.inj = null });
  S.round = past.length + 1;
  const rows = sortedTable(), pos = 10 + hash32(S.club.name) % 7, tgt = rows[pos - 1].n;
  if (tgt !== ME.name){
    S.join = { season: S.season, tgt };
    const t = S.table[tgt]; S.table[tgt] = S.table[ME.name]; S.table[ME.name] = t;
    const sw = n => n === tgt ? ME.name : n === ME.name ? tgt : n;
    S.results = S.results.map(r => ({ ...r, h: sw(r.h), a: sw(r.a), me: false }));
    swapFixtures();
    if (S.cup && !S.cup.none){                        // кубкова доля бота теж переходить до менеджера
      const sw2 = n => n === tgt ? ME.name : n === ME.name ? tgt : n;
      S.cup.teams.forEach(t => { t.n = sw2(t.n) }); S.cup.alive = S.cup.alive.map(sw2);
      if (S.cup.draw) S.cup.draw = S.cup.draw.map(p => p.map(sw2));
      S.cup.out = !S.cup.alive.includes(ME.name);
    }
  }
  const row = S.table[ME.name];
  addNews("cap", `Ти прийняв клуб посеред сезону: ${pos} місце, ${row.p} ${pl(row.p, "очко", "очки", "очок")} після ${past.length} ${pl(past.length, "туру", "турів", "турів")}.`);
}
/* =======================================================================
   КУБОК (v23, основа 30.09 — ПЛАН «v23 — Кубок», прогін vertical/sim/cup.js)
   64 клуби: ліга й три ліги під нею (Д5+3×Д6 … Д11+3×Д12); Д1–Д4 — Ліга чемпіонів (пізніше).
   6 раундів на виліт, один матч, нічия — одразу пенальті. Удома — клуб нижчого дивізіону.
   Гроші: призові за виграний раунд (разом переможцю 9 % доходу сезону) + половина квитків. Золота немає.
   Червона в Кубку — пропуск наступного матчу Кубка (не ліги).
   ======================================================================= */
const CUP_DAYS = [3, 8, 13, 18, 23, 27];
const CUP_PRIZE = [0, .005, .0075, .01, .015, .02, .0325];
const CUP_NAMES = ["1/32 фіналу", "1/16 фіналу", "1/8 фіналу", "1/4 фіналу", "півфінал", "фінал"];
const CUP_PREF = ["Атлетіко", "Реал", "Спортінг", "Уніон", "Расінг", "Депортіво", "Олімпік", "Кантера", "Академія", "Ферровіарія"];
const cupLevels = d => { const up = d % 2 ? d : d - 1; return { up, low: up + 1 } };
const cupInfo = n => S.cup.teams.find(t => t.n === n);
const cupEvent = r => monthPlan(S.month).ev.find(e => e.t === "c" && e.r === r);
let CUPT = {}, CUPT_KEY = "";
function newCup(){
  squadAll().forEach(p => { p.cban = 0 });
  CUPT = {}; CUPT_KEY = "";
  if (S.division <= 4) return newCL();
  const { up, low } = cupLevels(S.division);
  V.reseed(hash32(`cup-${S.season}-${S.club.name}`));
  const used = new Set(LEAGUE.map(t => t.name));
  const mk = d => { let n, g = 0; do { n = `${V.pick(CUP_PREF)} ${V.pick(OTHER_CLUBS)}` } while (used.has(n) && g++ < 500);
    if (used.has(n)) n += " " + used.size; used.add(n);
    return { n, d, f: V.pick(V.FORM_NAMES), k: +V.rf(.82, 1.1).toFixed(3), c: V.ri(0, CREST_COUNT - 1) } };
  const others = [];
  if (S.division === low){ for (let i = 0; i < 32; i++) others.push(mk(low)); for (let i = 0; i < 16; i++) others.push(mk(up)) }
  else for (let i = 0; i < 48; i++) others.push(mk(low));
  const teams = [...LEAGUE.map(t => ({ n: t.name, d: S.division })), ...others];
  S.cup = { season: S.season, teams, alive: teams.map(t => t.n), round: 1, out: false, won: false, log: [], draw: null };
  cupDraw();
}
/* жереб раунду: випадкові пари; удома — клуб нижчого дивізіону (однаковий — хто випав першим) */
function cupDraw(){
  if (S.cup.kind === "cl") return clDraw();
  const a = S.cup.alive.slice();
  V.reseed(hash32(`cupdraw-${S.season}-${S.cup.round}-${S.club.name}`));
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(V.R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  S.cup.draw = [];
  for (let i = 0; i + 1 < a.length; i += 2){ const x = a[i], y = a[i + 1]; S.cup.draw.push(cupInfo(y).d > cupInfo(x).d ? [y, x] : [x, y]) }
}
function cupTeam(n){
  const lt = teamBy(n); if (lt) return lt;
  if (CUPT_KEY !== String(S.season)){ CUPT = {}; CUPT_KEY = String(S.season) }
  if (!CUPT[n]){
    const t = cupInfo(n);
    V.reseed(hash32(`cupteam-${S.season}-${n}`));
    CUPT[n] = new V.Team(n, levelFor(t.d) * t.k, false, t.f); CUPT[n].crest = t.c;
  }
  return CUPT[n];
}
const myCupPair = () => S.cup && !S.cup.none && !S.cup.out && S.cup.draw ? S.cup.draw.find(p => p.includes(ME.name)) : null;
function cupFixture(){
  const p = myCupPair(); if (!p) return null;
  return { home: cupTeam(p[0]), away: cupTeam(p[1]), isHome: p[0] === ME.name, cup: true };
}
/* мій кубковий матч: пенальті при нічиї, призові за раунд, половина квитків господаря */
function settleCup(){
  if (S.cup.kind === "cl") return settleCL();
  const r = S.cup.round, mine = M.hm === ME ? M.hm : M.aw, opp = M.hm === ME ? M.aw : M.hm;
  squadAll().forEach(p => { if (p.cban > 0) p.cban-- });          // кубкову дискваліфікацію відбуто
  let won = mine.goals > opp.goals;
  if (mine.goals === opp.goals){
    won = V.R() < .5;
    M.pens = won ? "пенальті виграли" : "пенальті програли";
    say(90, `Нічия — серія пенальті. ${won ? `${ME.name} проходить далі!` : `Далі проходить «${opp.name}».`}`, "big");
  }
  M.cupWon = won;
  const hd = cupInfo(M.hm.name).d;
  const gate = M.hm === ME ? V.tickets(S.division, S.buildings.stadium) / 15 : V.tickets(hd, V.need(hd)) / 15;
  M.gate = Math.round(gate * .5); book("tickets", M.gate);
  M.pay = won ? Math.round(CUP_PRIZE[r] * V.typicalTotal(S.division)) : 0;
  if (M.pay) book("cup", M.pay);
  S.cup.log.push({ r, h: M.hm.name, a: M.aw.name, gh: M.hm.goals, ga: M.aw.goals, pens: M.pens, won });
  if (!won) S.cup.out = true;
}
/* решта пар раунду — без менеджера; нічия — пенальті 50/50 */
function cupPlayOthers(r, withMe){
  V.reseed(hash32(`cupai-${S.season}-${r}-${S.club.name}`));
  const win = [];
  S.cup.draw.forEach(([h, a]) => {
    if (!withMe && (h === ME.name || a === ME.name)) return;
    const [gh, ga] = V.quickMatch(cupTeam(h), cupTeam(a));
    win.push(gh > ga ? h : ga > gh ? a : (V.R() < .5 ? h : a));
  });
  return win;
}
const cupBotWins = () => null;                       // позначка: при вході посеред місяця наш клуб грає як бот
/* кубкові раунди, що вже минули (вхід посеред місяця, перенос у перевірці), — без менеджера, його клуб грає як бот */
function cupCatchUpPast(){
  if (!S.cup || S.cup.none) return;
  monthPlan(S.month).ev.filter(e => e.t === "c" && e.ts <= S.clock.last).forEach(e => { if (e.r === S.cup.round) cupRoundDone(null, cupBotWins(), true) });
  if (S.cup.kind !== "cl") S.cup.out = !S.cup.alive.includes(ME.name);
}

/* =======================================================================
   ЛІГА ЧЕМПІОНІВ (v24, рішення Марії 30.09 — як справжня)
   Д1–Д4, 64 клуби, кошики = дивізіони. Етап ліги: 8 матчів — по 2 суперники з кожного кошика (1 удома, 1 у гостях),
   одна таблиця на 64. 1–8 — одразу в 1/8; 9–24 — стикові (два матчі); 25–64 вибувають.
   1/8, 1/4, півфінал — по два матчі (сума голів; рівно — пенальті); фінал — один матч, нейтральне поле, останній день увечері.
   16 днів ЛЧ удень (ліга того дня — увечері): утома, аптечки й другий склад — свідомий вибір. Призи — пізніше.
   ======================================================================= */
const CL_LAST = 17;
const clStage = r => r <= 8 ? "lp" : r <= 10 ? "po" : r <= 12 ? "r16" : r <= 14 ? "qf" : r <= 16 ? "sf" : "f";
const CL_STAGE_UA = { po: "стикові", r16: "1/8 фіналу", qf: "1/4 фіналу", sf: "півфінал" };
const compName = () => S.division <= 4 ? "Ліга чемпіонів" : "Кубок";
const cupLast = () => S.cup && S.cup.kind === "cl" ? CL_LAST : 6;
function cupRoundName(r){
  if (!S.cup || S.cup.kind !== "cl") return CUP_NAMES[r - 1] || "";
  const st = clStage(r);
  if (st === "lp") return `етап ліги, тур ${r} з 8`;
  if (st === "f") return "фінал";
  return `${CL_STAGE_UA[st]}, ${r % 2 ? 1 : 2}-й матч`;
}
const clShuffle = a => { for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(V.R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };
function newCL(){
  V.reseed(hash32(`cl-${S.season}-${S.club.name}`));
  const used = new Set(LEAGUE.map(t => t.name));
  const mk = d => { let n, g = 0; do { n = `${V.pick(CUP_PREF)} ${V.pick(OTHER_CLUBS)}` } while (used.has(n) && g++ < 500);
    if (used.has(n)) n += " " + used.size; used.add(n);
    return { n, d, f: V.pick(V.FORM_NAMES), k: +V.rf(.82, 1.1).toFixed(3), c: V.ri(0, CREST_COUNT - 1) } };
  const teams = [];
  for (let d = 1; d <= 4; d++){
    if (d === S.division) LEAGUE.forEach(t => teams.push({ n: t.name, d }));
    else for (let i = 0; i < 16; i++) teams.push(mk(d));
  }
  const pots = [1, 2, 3, 4].map(d => teams.filter(t => t.d === d).map(t => t.n));
  /* 8 турів, у кожному всі 64 грають по разу: 2 — усередині кошика (коло з 16), 6 — між кошиками (по 2 з кожного) */
  const rounds = [...Array(8)].map(() => []);
  pots.forEach(p => { const c = clShuffle(p.slice());
    for (let i = 0; i < 16; i += 2) rounds[0].push([c[i], c[i + 1]]);
    for (let i = 1; i < 16; i += 2) rounds[1].push([c[i], c[(i + 1) % 16]]) });
  const cross = (a, b, r1, r2) => {
    const B = clShuffle(pots[b].slice()); let C, g = 0;
    do { C = clShuffle(pots[b].slice()) } while (C.some((x, i) => x === B[i]) && g++ < 999);
    pots[a].forEach((n, i) => { rounds[r1].push([n, B[i]]); rounds[r2].push([C[i], n]) });
  };
  cross(0, 1, 2, 3); cross(2, 3, 2, 3); cross(0, 2, 4, 5); cross(1, 3, 4, 5); cross(0, 3, 6, 7); cross(1, 2, 6, 7);
  const table = {}; teams.forEach(t => { table[t.n] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 } });
  S.cup = { kind: "cl", season: S.season, teams, sched: clShuffle(rounds), table, round: 1, out: false, won: false, log: [], draw: null, ties: null, top8: null, rank: null, final: null, pos: 0 };
  clDraw();
}
function clTable(){
  return Object.entries(S.cup.table).map(([n, v]) => ({ n, ...v, gd: v.gf - v.ga }))
    .sort((a, b) => b.p - a.p || b.gd - a.gd || b.gf - a.gf || a.n.localeCompare(b.n));
}
const clRankOf = n => S.cup.rank ? S.cup.rank.indexOf(n) : 99;
function clDraw(){
  const C = S.cup, r = C.round, st = clStage(r);
  if (st === "lp") C.draw = C.sched[r - 1];
  else if (st === "f") C.draw = [[C.final.a, C.final.b]];
  else C.draw = C.ties.map(t => r % 2 ? [t.b, t.a] : [t.a, t.b]);      // 1-й матч — удома в гіршого за етапом ліги
}
/* записати результат: таблиця етапу ліги, сума двох матчів стику або фінал */
function clApply(h, a, gh, ga, r){
  const C = S.cup, st = clStage(r);
  if (st === "lp"){
    const H = C.table[h], A = C.table[a];
    H.gf += gh; H.ga += ga; A.gf += ga; A.ga += gh;
    if (gh > ga){ H.w++; A.l++; H.p += 3 } else if (gh < ga){ A.w++; H.l++; A.p += 3 } else { H.d++; A.d++; H.p++; A.p++ }
  } else if (st === "f"){ C.final.gh = C.final.a === h ? gh : ga; C.final.ga = C.final.a === h ? ga : gh }
  else { const t = C.ties.find(x => (x.a === h && x.b === a) || (x.a === a && x.b === h)); if (!t) return;
    t.ga += t.a === h ? gh : ga; t.gb += t.a === h ? ga : gh; }
}
function clResolve(t){ if (t.w) return t.w;
  if (t.ga !== t.gb) t.w = t.ga > t.gb ? t.a : t.b; else { t.pens = true; t.w = V.R() < .5 ? t.a : t.b }
  return t.w }
/* мій матч ЛЧ: таблиця чи сума двох матчів; квитки — господарю; призи — пізніше */
function settleCL(){
  const C = S.cup, r = C.round, st = clStage(r);
  squadAll().forEach(p => { if (p.cban > 0) p.cban-- });
  clApply(M.hm.name, M.aw.name, M.hm.goals, M.aw.goals, r);
  M.gate = M.hm === ME && st !== "f" ? Math.round(V.tickets(S.division, S.buildings.stadium) / 15) : 0;
  if (M.gate) book("tickets", M.gate);
  M.pay = 0; M.pens = ""; M.clMsg = ""; M.cupWon = true;
  if (st === "lp") M.clMsg = `тур ${r} з 8 етапу ліги`;
  else if (st === "f"){
    const f = C.final; let w = f.gh > f.ga ? f.a : f.ga > f.gh ? f.b : null;
    if (!w){ w = V.R() < .5 ? f.a : f.b; M.pens = w === ME.name ? "пенальті виграли" : "пенальті програли" }
    f.w = w; M.cupWon = w === ME.name;
    M.clMsg = (M.pens ? "Нічия, " + M.pens + ". " : "") + (M.cupWon ? "ЛІГА ЧЕМПІОНІВ НАША! 🏆" : "Фінал програно.");
  } else {
    const t = C.ties.find(x => x.a === ME.name || x.b === ME.name), mine = t.a === ME.name ? t.ga : t.gb, theirs = t.a === ME.name ? t.gb : t.ga;
    if (r % 2){ M.clMsg = `перший матч; за сумою ${mine}:${theirs}` }
    else {
      const w = clResolve(t); M.cupWon = w === ME.name;
      if (t.pens) M.pens = M.cupWon ? "пенальті виграли" : "пенальті програли";
      M.clMsg = `за сумою двох матчів ${mine}:${theirs}${t.pens ? ", " + M.pens : ""} — ${M.cupWon ? "проходимо далі" : "виліт"}`;
    }
  }
  C.log.push({ r, h: M.hm.name, a: M.aw.name, gh: M.hm.goals, ga: M.aw.goals, pens: M.pens, won: M.cupWon, note: M.clMsg });
}
function clRoundDone(e, asBot){
  const C = S.cup, r = C.round;
  V.reseed(hash32(`clai-${S.season}-${r}-${S.club.name}`));
  C.draw.forEach(([h, a]) => {
    if (!asBot && (h === ME.name || a === ME.name)) return;         // наш матч уже записано (settleCL)
    const [gh, ga] = V.quickMatch(cupTeam(h), cupTeam(a)); clApply(h, a, gh, ga, r);
  });
  if (e) S.clock.last = Math.max(S.clock.last, e.ts);
  clAdvance(r, asBot);
}
/* перехід між етапами: таблиця → стикові й 1/8 → 1/4 → півфінал → фінал */
function clAdvance(r, asBot){
  const C = S.cup, involved = t => t.a === ME.name || t.b === ME.name;
  if (r === 8){
    C.rank = clTable().map(x => x.n);
    C.top8 = C.rank.slice(0, 8);
    C.ties = []; for (let i = 0; i < 8; i++) C.ties.push({ a: C.rank[8 + i], b: C.rank[23 - i], ga: 0, gb: 0 });
    C.pos = C.rank.indexOf(ME.name) + 1;
    if (C.pos > 24) C.out = true;
    if (!asBot) addNews(C.pos <= 24 ? "up" : "goal", `Ліга чемпіонів, етап ліги: ${C.pos} місце з 64 — ${C.pos <= 8 ? "одразу в 1/8 фіналу!" : C.pos <= 24 ? "граємо стикові матчі за 1/8." : "виліт."}`);
  } else if (r === 10 || r === 12 || r === 14 || r === 16){
    C.ties.forEach(clResolve);
    const mt = C.ties.find(involved);
    if (mt && mt.w !== ME.name) C.out = true;
    const w = C.ties.map(t => t.w);
    if (r === 10) C.ties = C.top8.map((n, j) => ({ a: n, b: w[7 - j], ga: 0, gb: 0 }));           // сіяні 1–8 проти переможців стикових
    else if (r === 16){ C.final = { a: w[0], b: w[1] }; C.ties = null }
    else { const ws = clShuffle(w.slice()); C.ties = [];
      for (let i = 0; i + 1 < ws.length; i += 2){ const [x, y] = clRankOf(ws[i]) <= clRankOf(ws[i + 1]) ? [ws[i], ws[i + 1]] : [ws[i + 1], ws[i]]; C.ties.push({ a: x, b: y, ga: 0, gb: 0 }) } }
  } else if (r === CL_LAST){
    const f = C.final; if (!f.w){ f.w = f.gh > f.ga ? f.a : f.ga > f.gh ? f.b : (V.R() < .5 ? f.a : f.b) }
    C.won = f.w === ME.name;
    if (!C.won && (f.a === ME.name || f.b === ME.name)) C.out = true;
    if (!asBot && !C.won) addNews("cap", `Лігу чемпіонів сезону ${S.season} виграв «${f.w}» (Дивізіон ${cupInfo(f.w).d}).`);
    if (!asBot && C.won) addNews("up", `ЛІГА ЧЕМПІОНІВ НАША! ${S.club.name} — найкращий клуб сезону ${S.season}.`);
    C.round = CL_LAST + 1; C.draw = null; return;
  }
  C.round = r + 1; clDraw();
}
function clHTML(){
  const C = S.cup, tbl = clTable(), myPos = tbl.findIndex(x => x.n === ME.name) + 1;
  const next = C.round <= CL_LAST ? cupEvent(C.round) : null;
  const head = `<div class="note"><h3>Ліга чемпіонів · сезон ${C.season}</h3><p>64 клуби: Дивізіони 1–4 (кошики). Етап ліги — 8 матчів, по 2 суперники з кожного кошика, одна таблиця.
    1–8 — одразу в 1/8, 9–24 — стикові, далі по два матчі (сума голів, рівно — пенальті), фінал — один матч в останній день увечері.
    ${C.round > CL_LAST ? `<br><b>${C.won ? "Ліга чемпіонів наша! 🏆" : `Переможець — «${C.final.w}».`}</b>` : `<br>Зараз: <b>${cupRoundName(C.round)}</b>${next ? ` · ${dayLabel(next.ts)}, ${hhmm(loc(next.ts))}` : ""}. ${C.out ? "Ми вибули." : myCupPair() ? "Ми граємо." : "Ми відпочиваємо цей раунд."}`}</p></div>`;
  const path = C.log.length ? `<div class="lab" style="margin-top:10px">Наші матчі</div><div class="plist">${C.log.map(l => `<div class="p">
    <div class="pos">${l.gh}:${l.ga}</div><div class="pn"><b>${l.h} — ${l.a}</b><i>${cupRoundName(l.r)}${l.note && clStage(l.r) !== "lp" ? " · " + l.note : ""}</i></div></div>`).join("")}</div>` : "";
  const pairs = C.round <= CL_LAST && C.draw ? `<div class="lab" style="margin-top:10px">Матчі · ${cupRoundName(C.round)}</div><div class="plist">${[...C.draw].sort((x, y) => (y.includes(ME.name) ? 1 : 0) - (x.includes(ME.name) ? 1 : 0)).slice(0, 12).map(([h, a]) => `<div class="p ${h === ME.name || a === ME.name ? "me" : ""}">
    <div class="pos sub">Д${cupInfo(h).d}</div><div class="pn"><b>${h} — ${a}</b><i>Дивізіон ${cupInfo(h).d} удома · гість з Дивізіону ${cupInfo(a).d}</i></div></div>`).join("")}</div>` : "";
  const rows = tbl.map((r, i) => ({ ...r, i })).filter(r => r.i < 24 || r.n === ME.name);
  const table = `<div class="lab" style="margin-top:10px">Таблиця етапу ліги · ми — ${myPos} місце</div><table><thead><tr><th class="l">#</th><th class="l">Клуб</th><th>Д</th><th>І</th><th>М</th><th>О</th></tr></thead><tbody>${rows.map(r =>
    `<tr class="${[r.n === ME.name ? "me" : "", r.i < 8 ? "up" : r.i < 24 ? "po" : "down"].join(" ")}"><td class="l">${r.i + 1}</td><td class="l">${r.n}</td><td>${cupInfo(r.n).d}</td><td>${r.w + r.d + r.l}</td><td>${r.gf}:${r.ga}</td><td style="color:var(--gold-hi)">${r.p}</td></tr>`).join("")}</tbody></table>`;
  return head + path + pairs + table;
}
/* раунд Кубка завершено: переможці, наступний жереб */
function cupRoundDone(e, myWin, asBot){
  if (S.cup.kind === "cl") return clRoundDone(e, asBot);
  const r = S.cup.round;
  const winners = cupPlayOthers(r, !!asBot);
  if (!asBot && myWin) winners.push(ME.name);
  S.cup.alive = winners;
  if (e) S.clock.last = Math.max(S.clock.last, e.ts);
  if (r >= 6 || winners.length < 2){
    S.cup.round = 7; S.cup.draw = null;
    const champ = winners[0];
    if (champ === ME.name){ S.cup.won = true; if (!asBot) addNews("up", `КУБОК НАШ! ${S.club.name} — переможець Кубка сезону ${S.season}.`) }
    else if (!asBot) addNews("cap", `Кубок сезону ${S.season} виграв «${champ}» (Дивізіон ${cupInfo(champ).d}).`);
  } else {
    S.cup.round = r + 1; cupDraw();
    if (!asBot && S.cup.out && r === S.cup.log.length) {}   // ми вибули цього раунду — новину вже написано
  }
}
function cupSummary(){
  if (!S.cup || S.cup.none) return "";
  if (S.cup.kind === "cl"){
    if (S.cup.won) return "Ліга чемпіонів виграна! 🏆";
    const last = S.cup.log[S.cup.log.length - 1];
    return last ? `Ліга чемпіонів: останній матч — ${cupRoundName(last.r)}${S.cup.pos ? ` (етап ліги — ${S.cup.pos} місце)` : ""}.` : "";
  }
  if (S.cup.won) return "Кубок виграно! 🏆";
  const last = S.cup.log[S.cup.log.length - 1];
  return last ? `Кубок: виліт — ${CUP_NAMES[last.r - 1]}.` : "";
}

/* клуб, який прийняв новий менеджер, грає за розкладом того бота, чиє місце він зайняв */
function swapFixtures(){
  if (!S.join || S.join.season !== S.season) return;
  const a = S.join.tgt, b = ME.name, sw = n => n === a ? b : n === b ? a : n;
  S.fixtures = S.fixtures.map(rd => rd.map(([h, w]) => [sw(h), sw(w)]));
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
  const D = curDays();                 // сезонні суми діляться на дні місяця
  return { sponsor: V.sponsor(S.division, S.buildings.commercial) / D, merch: V.merch(S.division, S.buildings.commercial) / D,
           wages: ME.wageBill() / D, upkeep: V.upkeepSeason(S.division, levelsSum()) / D };
}
function showReport(){
  if (!S.lastRep) return;
  $("#sheet").innerHTML = S.lastRep;
  openSheet();
}
window.showReport = showReport;
function reportHTML(){
  const mine = ME.onPitch().slice(1).concat([ME.gk]);
  const best = [...mine].sort((a, b) => b.rating - a.rating).slice(0, 4);
  const scored = mine.filter(p => p.goals > 0);
  const hurt = mine.filter(p => p.injured || p.red);
  const dm = dayMoney(), net = (M.gate || 0) + (M.pay || 0) + dm.sponsor + dm.merch - dm.wages - dm.upkeep;
  const e = M.ev, when = e ? `${dayLabel(e.ts).replace(/^(сьогодні|завтра), /, "")}, ${hhmm(loc(e.ts))}` : "";
  return `<h2>${M.hm.goals} : ${M.aw.goals}</h2>
    <div class="s">${M.hm.name} — ${M.aw.name} · ${M.kind === "cup" ? `${compName()}, ${cupRoundName(S.cup.round)}` : `тур ${S.round}`}${when ? " · " + when : ""}${M.auto ? " · грав автопілот" : ""}</div>
    ${M.kind === "cup" && S.cup.kind === "cl" ? (M.clMsg ? `<p style="font-size:13px;color:var(--gold-hi);margin:0 0 8px"><b>${M.clMsg}</b></p>` : "") : M.kind === "cup" ? `<p style="font-size:13px;color:${M.cupWon ? "var(--live)" : "var(--bad)"};margin:0 0 8px"><b>${M.pens ? "Нічия, " + M.pens + ". " : ""}${M.cupWon ? (S.cup.round >= 6 ? "Кубок виграно!" : "Проходимо в наступний раунд.") : "Виліт із Кубка."}</b></p>` : ""}
    ${M.forced ? `<p style="font-size:11.5px;color:var(--dim);margin:0 0 8px">Режим перевірки: рахунок підправлено на перемогу.</p>` : ""}
    ${scored.length ? `<div class="lab">Голи</div><div class="plist">${scored.map(p =>
      `<div class="p"><div class="pos">${p.goals}</div><div class="pn"><b>${p.name}</b>
       <i>${p.assists ? p.assists + " гольова · " : ""}${p.touches} дотиків</i></div></div>`).join("")}</div>` : ""}
    ${hurt.length ? `<div class="lab" style="margin-top:12px">Травми й вилучення</div><div class="plist">${hurt.map(p =>
      `<div class="p"><div class="pos">${p.red ? "ЧК" : "+"}</div><div class="pn"><b>${p.name}</b>
       <i>${p.red ? "червона — пропустить наступний матч" : p.inj ? `${p.inj}, не гратиме ${p.out} ${dayW(p.out)}` : "травма"}</i></div></div>`).join("")}</div>` : ""}
    <div class="lab" style="margin-top:12px">Найкращі в матчі</div>
    <div class="plist">${best.map(p => `<div class="p"><div class="pos">${p.rating.toFixed(1)}</div>
      <div class="pn"><b>${p.name}</b><i>${p.pos()} · свіжість ${Math.round(p.fresh * 100)} %${p.injured ? ' · <span style="color:var(--bad)">травма</span>' : ""}</i></div>
      <div class="pv"><b>${Math.round(p.power())}</b></div></div>`).join("")}</div>
    ${growthReport()}
    <div class="lab" style="margin-top:12px">Гроші · разом за день ${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))}</div>
    <p style="font-size:11.5px;color:var(--dim);margin:0">${M.kind === "cup" ? `призові Кубка +${fmt(M.pay || 0)} · половина квитків +${fmt(M.gate || 0)} · ` : `за результат +${fmt(M.pay || 0)} · ${M.gate ? `квитки +${fmt(M.gate)} · ` : "матч на виїзді — квитків немає · "}`}спонсор +${fmt(dm.sponsor)} · атрибутика +${fmt(dm.merch)} · зарплати −${fmt(dm.wages)} · утримання будівель −${fmt(dm.upkeep)} (денні суми — опівночі)</p>
    ${stadiumLine()}
    <div class="note" style="margin-top:12px"><h3>Бонус присутності</h3>
      <p>Дій під час гри: ${ME.actions}. Команда грала з надбавкою
      <b style="color:var(--gold)">+${(ME.presence * 100).toFixed(1).replace(".", ",")} %</b> до ефективної сили.
      Стеля — 4 %, і вона рахується всередині загальної стелі бонусів 12 %.</p></div>
    <button class="btn" style="margin-top:14px" onclick="closeSheet()">Добре</button>`;
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
  const k = V.kBase(aiBase(S.division)) * dayK();
  LEAGUE.forEach(t => { if (t === ME) return;
    t.onPitch().forEach(p => p.grow(p.slopeDay(ageF(p)) * (k + V.MATCH_K * matchBoost(p)), ageF(p)));
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
  const ac = S.academy.candidates.filter(c => (isReadyC(c) || c.p.age >= 18) && fit(c.p) >= 0).sort((a, b) => fit(b.p) - fit(a.p))[0];
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
  mySlots().slice(1).forEach(slot => {
    if (gone.includes(ME.xi[slot])) ME.xi[slot] = take(q => q.gk ? -Infinity : q.fitIn(slot), true) || fillSlot(V.SLOT_ROLE[slot]);
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
/* золото за місце (рішення 29.09, Г3) і за справжній підйом; кубок — без золота */
const GOLD_PLACE = [40, 25, 15, 10, 10, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0], GOLD_UP = 20;
function zones(d){
  if (d <= 4) return { up: d > 1 ? 3 : 0, playoff: false, down: d === BOTTOM ? 0 : d <= 3 ? 3 : 4 };
  return { up: 1, playoff: true, down: d === BOTTOM ? 0 : 4 };
}
/* Плей-оф трьох других місць (останній день місяця, увечері): найкращий другий за очками чекає у фіналі,
   двоє інших грають півфінал, потім фінал на полі найкращого. Нічия — серія пенальті. */
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
/* Опівночі — кінець дня: гроші дня, відпочинок (+20 % свіжості), травми й дискваліфікації на день коротші,
   академія, скаут. У суботу з подвійним туром відпочинок один — між двома матчами його немає. */
function dayEnd(e){
  if (S.test.on && !trainedToday()) trainToday(true);    // режим перевірки: команда тренується щодня сама
  if (!trainedToday()) S.academy.candidates.forEach(c => { c.p.rd = Math.min(60, (c.p.rd || 0) + 2 / 3) });   // не тренував — тренер сам, слабше
  /* гроші дня: спонсор і атрибутика, зарплати, утримання (квитки — у звіті матчу) */
  const dm = dayMoney();
  book("sponsor", dm.sponsor); book("merch", dm.merch); book("wages", -dm.wages); book("upkeep", -dm.upkeep);
  /* за день: свіжість +20 % (рішення 29.09), травма й дискваліфікація — на день менше */
  [...ME.onPitch(), ...ME.bench].forEach(p => {
    p.decline(ageF(p)); p._mg = 0; p._tg = 0;
    p.fresh = Math.min(1, p.fresh + FRESH_DAY);
    if (p.out > 0 && --p.out === 0){ p.inj = null; addNews("inj", `${p.name} одужав і знову може грати.`) }
    if (p.ban > 0) p.ban--;
  });
  aiDay();
  scoutTick();
  S.clock.last = e.ts;
  if (e.last) return seasonRollover();
  S.day++;
  return false;
}
/* Опівночі останнього дня місяця — перехід: підсумок сезону, підвищення й виліт (ОСНОВА §12, §14), новий сезон 1-го */
function seasonRollover(){
  while (S.round <= 30) autoMatch(matchEvent(S.round));   // запобіжник: недограних турів бути не повинно
  while (S.cup && !S.cup.none && S.cup.round <= cupLast()){ if (myCupPair()) autoMatch(cupEvent(S.cup.round)); else cupRoundDone(null, false) }
  const cupSum = cupSummary();
  /* підвищення й виліт — ОСНОВА, розділ 12 */
  const pos = tablePos(ME.name), was = S.division, row = S.table[ME.name];
  const prize = Math.round(V.placePrize(was, pos));
  book("prize", prize);
  const z = zones(was);
  let po = null;
  if (pos <= z.up && was > 1) S.division--;
  else if (pos === 2 && z.playoff){ po = playoff(was, row.p); if (po.won) S.division-- }
  else if (pos > 16 - z.down && was < BOTTOM) S.division++;
  const gold = GOLD_PLACE[pos - 1] + (S.division < was ? GOLD_UP : 0);
  S.gold += gold;
  S.round = 1; S.season++; S.month = nextMonth(S.month); S.day = 1; S.join = null;
  squadAll().forEach(p => { p.gp = 0; p.gt = 0; p.warned = false });
  addNews("up", `Сезон ${S.season - 1} завершено: ${pos} місце, призові ${fmt(prize)}. ` +
    (po ? po.text + " " : "") +
    (S.division < was ? `Підвищення — тепер Дивізіон ${S.division}!` : S.division > was ? `Виліт у Дивізіон ${S.division}.` : `Лишаємось у Дивізіоні ${S.division}.`));
  const rec = { w: row.w, d: row.d, l: row.l, gf: row.gf, ga: row.ga, p: row.p };
  Object.values(S.table).forEach(v => { v.p = v.w = v.d = v.l = v.gf = v.ga = 0 });
  const sum = endOfSeason(was);
  ageAcademyOneSeason();
  S.lastSeason = { season: S.season - 1, pos, was, now: S.division, prize, gold, rec, fin: S.fin, ...sum, playoff: po && po.text,
    expiring: squadAll().filter(p => p.ct === S.season).map(p => p.name), intake: S.academy.offers.length, cup: cupSum };
  S.fin = FIN0();
  newCup();
  M.hm = null;
  return true;
}
/* Вікно кінця сезону: місце, призові, гроші, ріст, кар'єри, контракти, набір в академію */
function seasonWindow(){
  const L = S.lastSeason; if (!L) return;
  const f = L.fin, inc = f.tickets + f.sponsor + (f.merch || 0) + (f.match || 0) + f.prize + (f.cup || 0) + f.sales + (f.login || 0) + (f.gold || 0), out = f.wages + f.upkeep + f.build + f.buys;
  const moved = L.now < L.was ? `Підвищення — тепер Дивізіон ${L.now}!` : L.now > L.was ? `Виліт — тепер Дивізіон ${L.now}.` : `Лишаєшся в Дивізіоні ${L.now}.`;
  const line = (t, v, plus) => `<div class="at"><span>${t}</span><u style="width:auto">${plus ? "+" : "−"}${fmt(v)}</u></div>`;
  $("#sheet").innerHTML = `<h2>Сезон ${L.season}: ${L.pos} місце</h2>
    <div class="s">${L.rec.w} ${pl(L.rec.w, "перемога", "перемоги", "перемог")} · ${L.rec.d} ${pl(L.rec.d, "нічия", "нічиї", "нічиїх")} · ${L.rec.l} ${pl(L.rec.l, "поразка", "поразки", "поразок")} · м'ячі ${L.rec.gf}:${L.rec.ga} · ${L.rec.p} ${pl(L.rec.p, "очко", "очки", "очок")}</div>
    ${L.playoff ? `<p style="font-size:12.5px;color:var(--muted);margin:0 0 6px">${L.playoff}</p>` : ""}
    ${L.cup ? `<p style="font-size:12.5px;color:var(--muted);margin:0 0 6px">${L.cup}</p>` : ""}
    <p style="font-size:14px;color:var(--gold-hi);margin:0 0 12px"><b>${moved}</b> Призові за місце: ${fmt(L.prize)}.${L.gold ? ` Золото за місце й підйом: +${L.gold}.` : ""}</p>
    <div class="lab">Гроші за сезон</div>
    <div class="ftot">
      <div><i>Усього доходів</i><b class="plus">+${fmt(inc)}</b></div>
      <div><i>Усього витрат</i><b class="minus">−${fmt(out)}</b></div>
      <div><i>Чистий прибуток</i><b class="${inc - out >= 0 ? "plus" : "minus"}">${inc - out >= 0 ? "+" : "−"}${fmt(Math.abs(inc - out))}</b></div>
    </div>
    <div class="attrs" style="grid-template-columns:1fr 1fr;margin-bottom:12px">
      ${line("Квитки", f.tickets, true)}${line("Спонсор", f.sponsor, true)}
      ${line("Атрибутика", f.merch || 0, true)}${line("Гроші за матчі", f.match || 0, true)}
      ${line("Призові за місце", f.prize, true)}${f.cup ? line("Кубок: призові", f.cup, true) : ""}${line("Продаж гравців", f.sales, true)}
      ${f.login ? line("Нагороди за вхід (гроші)", f.login, true) : ""}${f.gold ? line("Золото → гроші", f.gold, true) : ""}${L.gold ? `<div class="at"><span>Золото за досягнення</span><u style="width:auto">+${L.gold}</u></div>` : ""}
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
  S.feed.unshift({ i: icon, b: text, t: `${S.day} ${MONTHS[S.month.m]} · сезон ${S.season}, тур ${Math.min(S.round, 30)}`, seen: false });
  S.feed = S.feed.slice(0, 20);
}
const sp = p => ({ cb:p.cban || undefined, n:p.name, r:p.role, g:p.gk, a:p.age, at:p.attrs, po:p.pot, gl:p.glass, pr:p.prof, fo:p.form, wp:p.wagePrem, fc:p.face, rt:p.ret, ss:p.ss, ct:p.ct, wg:p.wg, sr:p.sr, rg:p.pr, ap:p.ap, kn:p.kn, pd:p.paid, js:p.js, sd:p.side, fr:p.fresh, ou:p.out, bn:p.ban, ij:p.inj, rl:p.rl, mr:p.mr, gp:p.gp, gt:p.gt, wo:p.wo, wn:p.warned, rd:p.rd, cd:p.cd, ab:p.abl, ap2:p.abp, it:p.it });
function serial(t){
  return { form: t.form, gk: sp(t.gk), xi: Object.fromEntries(t.slots().slice(1).map(k => [k, sp(t.xi[k])])), bench: t.bench.map(sp) };
}
function mkPlayer(d){
  const p = new V.P(d.n, d.r, 25, d.g, d.a); p.attrs = d.at; p.pot = d.po;
  p.glass = d.gl; p.prof = d.pr; p.form = d.fo; if (d.wp) p.wagePrem = d.wp; if (d.fc) p.face = d.fc;
  if (d.rt) p.ret = d.rt; if (d.ss != null) p.ss = d.ss;
  if (d.ct != null) p.ct = d.ct; if (d.wg != null) p.wg = d.wg;
  if (d.sr) p.sr = d.sr; if (d.rg) p.pr = d.rg; if (d.ap != null) p.ap = d.ap; if (d.kn != null) p.kn = d.kn;
  if (d.pd != null) p.paid = d.pd; if (d.js != null) p.js = d.js;
  if (d.sd !== undefined) p.side = d.sd;
  p.reset();
  if (d.fr != null) p.fresh = d.fr;
  if (d.ou > 0){ p.out = d.ou; p.inj = d.ij } if (d.bn > 0) p.ban = d.bn;
  if (d.rd != null) p.rd = d.rd; if (d.cd) p.cd = d.cd; if (d.ab) p.abl = d.ab; if (d.ap2 != null) p.abp = d.ap2; if (d.it) p.it = d.it;
  if (d.cb) p.cban = d.cb; if (d.rl) p.rl = d.rl; if (d.mr != null) p.mr = d.mr; if (d.gp != null){ p.gp = d.gp; p.gt = d.gt } if (d.wo) p.wo = true; if (d.wn) p.warned = true;
  return p;
}
function hydrate(o, t){
  t.gk = mkPlayer(o.gk); t.bench = o.bench.map(mkPlayer);
  t.form = V.FORMS[o.form] ? o.form : "4-3-3"; t.xi = {};
  /* старе збереження без флангів: фланговий в основі — на своєму фланзі */
  Object.entries(o.xi).forEach(([k, d]) => { const p = t.xi[k] = mkPlayer(d); if (d.sd === undefined && V.SLOT_SIDE[k] && V.isFlank(p.role)) p.side = V.SLOT_SIDE[k] });
}
function save(){
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      club: S.club, division: S.division, season: S.season, round: S.round, month: S.month, day: S.day, clock: S.clock, lastRep: S.lastRep, join: S.join, cup: S.cup,
      money: S.money, gold: S.gold, focus: S.focus, table: S.table,
      results: S.results, feed: S.feed.slice(0, 12), buildings: S.buildings,
      queue: S.queue, owned: S.owned, squad: serial(ME), trained: S.trained, test: S.test,
      academy: S.academy.candidates.map(c => ({ p: sp(c.p) })),
      offers: (S.academy.offers || []).map(sp), fin: S.fin, scout: S.scout, scouted: S.scouted,
      taken: S.taken, lastSeason: S.lastSeason, remind: S.remind, lineupAt: S.lineupAt, kits: S.kits, login: S.login, exch: S.exch, q3: S.q3,
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
      month: o.month, day: o.day || 1, clock: o.clock || { last: Date.now() }, lastRep: o.lastRep || "", join: o.join || null, cup: o.cup || null,
      money: o.money, gold: o.gold, focus: o.focus, table: o.table || {},
      results: o.results || [], feed: o.feed || [], buildings: o.buildings || S.buildings,
      queue: o.queue || [], owned: o.owned || { crests: [o.club.crest], kits: [o.club.kit] },
      trained: o.trained || "", test: o.test || { on: false, win: false, shift: 0 },
      fin: o.fin || FIN0(), scout: o.scout && o.scout.left != null ? { left: o.scout.left } : { left: 10 }, scouted: o.scouted || null,
      taken: o.taken || null, lastSeason: o.lastSeason || null, remind: o.remind || 0,
      lineupAt: o.lineupAt ?? null, kits: o.kits || { g: 10, r: 5, day: 0, gUsed: 0, rUsed: [] },
      login: o.login || { last: "", streak: 0, tok: 0, pending: null }, exch: o.exch || { season: 0, pct: 0 }, q3: o.q3 || 0,
    });
    S.fa = (o.fa || []).map(r => ({ p: mkPlayer(r.p), div: r.div, from: r.from, mine: r.mine }));
    S.sys = (o.sys || []).map(r => ({ p: mkPlayer(r.p), div: r.div }));
    buildWorld();
    if (o.squad){ hydrate(o.squad, ME); ensureRoles() }
    if (!S.cup || S.cup.season !== S.season) newCup();
    S.academy.candidates = (o.academy || []).map(c => { const p = mkPlayer(c.p); if (p.rd == null) p.rd = (c.yearsLeft || 0) <= 0 ? 60 : 30 * (2 - c.yearsLeft); return { p } });
    S.academy.offers = (o.offers || []).map(mkPlayer);
    return true;
  } catch(e){ return false }
}

/* =======================================================================
   СТВОРЕННЯ КЛУБА І ЗАПУСК
   ======================================================================= */
let newCrest = 100, newKit = 0;
function renderCreate(){
  const typed = $("#cname").value.trim();
  $("#crestsNew").innerHTML = IMG_IDS.map(i =>
    `<button class="pickitem big ${i === newCrest ? "on" : ""}" data-c="${i}"><svg viewBox="0 0 52 60">${crestSVG(i, typed, true)}</svg></button>`).join("");
  $("#crests").innerHTML = [...Array(CREST_COUNT).keys()].map(i =>
    `<button class="pickitem ${i === newCrest ? "on" : ""}" data-c="${i}"><svg viewBox="0 0 52 60">${crestSVG(i)}</svg></button>`).join("");
  $("#kits").innerHTML = [...Array(KIT_COUNT).keys()].map(i =>
    `<button class="pickitem ${i === newKit ? "on" : ""}" data-k="${i}"><svg viewBox="0 0 40 46">${kitSVG(i)}</svg></button>`).join("");
  $$("#crests button, #crestsNew button").forEach(b => b.onclick = () => { newCrest = +b.dataset.c; renderCreate() });
  $$("#kits button").forEach(b   => b.onclick = () => { newKit  = +b.dataset.k; renderCreate() });
}
/* кроки: 1 — назва, 2 — емблема (вже з назвою), 3 — форма */
let cStep = 1;
function goStep(n, instant){
  const cur = $(`.cstep[data-s="${cStep}"]`), nxt = $(`.cstep[data-s="${n}"]`);
  if (!nxt) return;
  const show = () => {
    $$(".cstep").forEach(e => { e.hidden = e !== nxt; e.classList.remove("out", "in") });
    nxt.classList.add("in");
    $$("#cSteps i").forEach((d, i) => d.classList.toggle("on", i < n));
    cStep = n;
    if (n === 2) $("#cnameEcho").textContent = `Назва: ${$("#cname").value.trim()}`;
    renderCreate(); $("#create").scrollTop = 0;
  };
  if (instant || !cur) return show();
  cur.classList.add("out"); setTimeout(show, 180);
}
$("#cnext1").onclick = () => {
  const n = $("#cname").value.trim();
  if (n.length < 3){ $("#cerr").textContent = "Назва закоротка — щонайменше три літери."; return }
  $("#cerr").textContent = ""; goStep(2);
};
$("#cname").addEventListener("keydown", e => { if (e.key === "Enter"){ e.preventDefault(); $("#cnext1").click() } });
$("#cnext2").onclick = () => goStep(3);
$$("[data-back]").forEach(b => b.onclick = () => goStep(cStep - 1));
$("#cname").addEventListener("input", renderCreate);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if ($("#create").classList.contains("on")) renderCreate() });
$("#cgo").onclick = () => {
  const name = $("#cname").value.trim();
  if (name.length < 3){ goStep(1, true); $("#cerr").textContent = "Назва закоротка — щонайменше три літери."; return }
  S.club = { name, crest: newCrest, kit: newKit };
  S.owned = { crests: [newCrest], kits: [newKit] };
  /* сезон — поточний місяць за часом гри (Іспанія); якщо тури вже йдуть, клуб заходить на місце бота (joinMidSeason) */
  const n = gz(Date.now());
  S.month = { y: n.y, m: n.m }; S.day = n.d; S.clock = { last: Date.now() }; S.test.shift = 0;
  buildWorld();
  /* стартові контракти: закінчуються в різні сезони, щоб не всі разом */
  squadAll().forEach(p => { p.ss = p.power(); p.wg = V.wageFor(p); p.ct = S.season + V.ri(0, 3) });
  ensureRoles();
  S.fin = FIN0();
  stockAcademyAtFounding();
  initialFreeAgents();
  addNews("cap", "Президент купив клуб. Ти — новий менеджер.");
  addNews("eye", "Скаут склав список кандидатів на сезон");
  addNews("build", `Тренувальна база: рівень ${S.buildings.training}`);
  newCup();
  joinMidSeason();
  $("#create").classList.remove("on");
  startGame();
  save();
};
function startGame(){
  loginCheck();
  $("#app").classList.add("on");
  buildRail();
  openMatch();
  GAME_ON = true;
  show("home");
  clockTick();                 // догнати все, що сталося, поки гра була закрита
  renderTop();
  if (S.login.pending) rewardSheet();
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
