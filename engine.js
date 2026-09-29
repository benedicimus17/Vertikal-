/* ВЕРТИКАЛЬ — ядро симуляції.
   Тут немає жодного звертання до сторінки: тільки правила, формули й рушій матчу.
   Константи калібровані прогонами (k=40, STEP_P .712, CONV .0728 …) — не чіпати. */

/* ---------- rng ---------- */
let SEED = 20260911;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let rnd = mulberry(SEED);
const R  = ()=>rnd();
const ri = (a,b)=>a+Math.floor(rnd()*(b-a+1));
const rf = (a,b)=>a+rnd()*(b-a);
const pick = a=>a[Math.floor(rnd()*a.length)];
function wpick(arr,w){let s=w.reduce((x,y)=>x+y,0),r=rnd()*s;for(let i=0;i<arr.length;i++){r-=w[i];if(r<=0)return arr[i]}return arr[arr.length-1]}
function reseed(s){SEED=s;rnd=mulberry(s)}

/* ---------- ролі (ваги 8 характеристик, сума 100) ---------- */
const ATTR = ["Швидкість","Сила","Витривалість","Техніка","Пас","Удар","Відбір","Гра в повітрі"];
const ATTR_SHORT = ["Швидк.","Сила","Витр.","Техніка","Пас","Удар","Відбір","Повітря"];
const ROLES = {
  cb_destroyer:[8,24,10,2,5,1,28,22],  cb_builder:[8,14,5,14,22,1,24,12],
  fb_def:[22,14,16,7,10,1,26,4],       fb_wing:[24,7,22,12,14,4,16,1],
  dm_breaker:[2,20,18,8,16,1,28,7],    dm_deep:[3,10,14,20,30,6,16,1],
  cm_b2b:[14,10,26,10,18,5,16,1],      cm_play:[6,3,14,26,32,8,10,1],
  am_ten:[10,3,8,28,32,14,4,1],        am_shadow:[22,5,10,20,14,26,1,2],
  w_fast:[30,5,12,25,10,15,2,1],       w_inv:[18,4,8,24,16,28,1,1],
  w_cross:[22,6,14,20,26,8,1,3],       st_target:[2,24,8,12,6,22,0,26],
  st_fast:[30,8,12,16,4,28,0,2],       st_false9:[12,5,10,26,26,18,1,2],
};
const GK_W=[30,8,22,4,12,16,6,2];
const ROLE_UA={cb_destroyer:"руйнівник",cb_builder:"розігруючий ЦЗ",fb_def:"захисний фланг",
  fb_wing:"фланг-крайній",dm_breaker:"опорний-руйнівник",dm_deep:"глибокий плеймейкер",
  cm_b2b:"від штрафної до штрафної",cm_play:"плеймейкер",am_ten:"десятка",am_shadow:"тіньовий форвард",
  w_fast:"швидкий вінгер",w_inv:"зміщений вінгер",w_cross:"навіси",st_target:"таргетмен",
  st_fast:"швидкий нападник",st_false9:"хибна дев'ятка",gk:"воротар"};

/* природна позиція ролі — щоб на лаві було видно позицію, а не назву ролі */
const ROLE_POS={cb_destroyer:"ЦЗ",cb_builder:"ЦЗ",fb_def:"КЗ",fb_wing:"КЗ",
  dm_breaker:"ОП",dm_deep:"ОП",cm_b2b:"ЦП",cm_play:"ЦП",am_ten:"АП",am_shadow:"АП",
  w_fast:"ВНГ",w_inv:"ВНГ",w_cross:"ВНГ",st_target:"НП",st_fast:"НП",st_false9:"НП",gk:"ВР"};

/* позиція кожного слота складу + які ролі туди пасують природно */
const SLOT_POS={GK:"ВР",RB:"КЗ",CB1:"ЦЗ",CB2:"ЦЗ",LB:"КЗ",DM:"ОП",CM:"ЦП",AM:"АП",RW:"ВНГ",ST:"НП",LW:"ВНГ"};
const SLOT_UA={GK:"воротар",RB:"правий захисник",CB1:"центральний захисник",CB2:"центральний захисник",
  LB:"лівий захисник",DM:"опорний півзахисник",CM:"центральний півзахисник",AM:"атакувальний півзахисник",
  RW:"правий вінгер",ST:"нападник",LW:"лівий вінгер"};

/* Як гравець знає позицію (рішення 29.09, прогін vertical/sim/positions.js): своя 100 % · своя, але інший фланг 95 % ·
   сусідня 92 % · через одну 85 % · чужа 70 % · воротар у полі чи польовий у воротах 30 %.
   Сусідні позиції: ЦЗ–ОП, ЦЗ–КЗ, КЗ–ВНГ, ОП–ЦП, ЦП–АП, АП–НП, АП–ВНГ, ВНГ–НП. У кожного флангового свій фланг. */
const SLOT_SIDE={RB:"R",LB:"L",RW:"R",LW:"L"};
const POS_EDGES=[["ЦЗ","ОП"],["ЦЗ","КЗ"],["КЗ","ВНГ"],["ОП","ЦП"],["ЦП","АП"],["АП","НП"],["АП","ВНГ"],["ВНГ","НП"]];
function posDist(a,b){
  if(a===b) return 0;
  const seen={[a]:0}, q=[a];
  while(q.length){ const x=q.shift();
    for(const [u,v] of POS_EDGES){ const y=u===x?v:v===x?u:null; if(y&&seen[y]==null){ seen[y]=seen[x]+1; q.push(y) } } }
  return seen[b] ?? 9;
}
const isFlank = role => ROLE_POS[role]==="КЗ" || ROLE_POS[role]==="ВНГ";
function fam(p, slot){
  const g = p.gk ? "ВР" : ROLE_POS[p.role], sg = SLOT_POS[slot];
  if(!g || !sg) return 1;
  if(g==="ВР" || sg==="ВР") return g===sg ? 1 : .3;
  const d = posDist(g, sg);
  if(d===0) return SLOT_SIDE[slot] && p.side && p.side!==SLOT_SIDE[slot] ? .95 : 1;
  return d===1 ? .92 : d===2 ? .85 : .7;
}

/* ---------- калібровані ручки ---------- */
let K=40, STEP_P=.712, CONV=.0728, FOUL_BASE=.50,
    CORNER_P=.30, CORNER_CONV=.095, FK_P=.10, FK_CONV=.19,
    PEN_P=.016, PEN_CONV=.76, INJ_BASE=.0069, HOME_BASE=.045, HOME_STAND=.034,
    YEL_BAND=.225, RED_P=.0012;
let AI_FRESH=1;   // свіжість основи ШІ перед матчем — гра ставить її за календарем (setAiFresh)

/* ---------- травми за видами (рішення 29.09; 1 день гри ≈ 12 днів життя) ----------
   [назва, частка, від, до] днів; медцентр рівня M скорочує строк на 3 % × M. */
const INJURIES=[["забій",.25,1,1],["розтягнення м'яза",.30,2,3],["травма задньої поверхні стегна",.20,3,5],
  ["пошкодження зв'язок гомілкостопу",.12,4,6],["травма меніска",.07,6,10],["перелом",.03,6,10],["розрив хрестоподібних зв'язок",.03,15,23]];
function rollInjury(medical){
  let r=rnd();
  for(const [n,p,a,b] of INJURIES){ if(r<p){ const d=a+Math.floor(rnd()*(b-a+1));
    return { name:n, days:Math.max(1,Math.round(d*(1-.03*Math.min(20,medical||0)))) } } r-=p }
  return { name:"забій", days:1 };
}
const BIAS = -K*Math.log10(1/STEP_P-1);
const duel=(a,b,bias=0,k=K)=>1/(1+Math.pow(10,-((a-b+bias)/k)));

/* Стеля сили по дивізіонах: рівні кроки по 5, вгорі 6–7, бо там характеристики
   впираються в 99 і та сама різниця дає меншу перевагу. Заміряно: команда на
   дивізіон сильніша виграє 52–61 % матчів у будь-якому місці піраміди. */
const CEIL=[0,99,92,86,80,75,70,65,60,55,50,45,40,35,30,25,20];
/* рівень якого дивізіону ця сила: Д12 — від 35 до 40, Д11 — від 40 до 45 … */
function divOf(x){ for(let d=16;d>=1;d--) if(x<=CEIL[d]+1e-9) return d; return 1 }

/* ---------- зірки, межа, пік ----------
   Зірки — межа гравця: до якого рівня він може дорости за кар'єру. Кожна зірка —
   два дивізіони: ★ Д11–12 · ★★ Д9–10 · ★★★ Д7–8 · ★★★★ Д5–6 · ★★★★★ Д3–4 · ★★★★★★ Д1–2. */
const STAR_TOP=[45,55,65,75,86];
const starsOfLim = lim => 1 + STAR_TOP.filter(t => lim > t + 1e-9).length;
const LIM_BAND=[[36,45],[45,55],[55,65],[65,75],[75,86],[86,99]];
/* Пік за позицією: нападники й вінгери раніше, захисники пізніше, воротарі найпізніше. */
const PEAK={"НП":24.5,"ВНГ":24.5,"АП":25.5,"ЦП":25.5,"ОП":25.5,"ЦЗ":27.5,"КЗ":27.5,"ВР":29};
/* У 16 років усі приблизно однакові (≈30), різняться межею. Слабкий талант стартує
   ближче до своєї межі, тому й росте менше. */
const S16=30;
const s16Of = lim => Math.min(.7*lim, S16);
/* Лінія віку: сильнішим за неї гравець бути не може. Від 16 років до піку вона
   рівномірно доходить до межі — так ріст розтягується на всі роки до піку. */
function lineAt(lim, pk, age){
  const s=s16Of(lim), f=Math.max(0,Math.min(1,(age-16)/(pk-16)));
  return s+(lim-s)*f;
}
/* зворотне: яку межу має гравець, який у цьому віці стоїть на лінії з силою y */
function limFor(y, age, pk){
  const f=Math.max(0,Math.min(1,(age-16)/(pk-16)));
  if(f>=1) return y;
  let lim = y>S16 ? S16+(y-S16)/f : 0;
  if(lim < S16/.7) lim = y/(.7+.3*f);
  return lim;
}
/* Сила тренування від рівня бази (ОСНОВА 2.3): база 1 — гравець розкриває ≈ 55 % таланту,
   база 10 — ≈ 80 %, база 20 — повністю й може наздогнати, якщо відстав (разом із матчами 0,25).
   Понад 20 — престиж, сила вже не росте. */
const kBase = lvl => .30 + .55*(Math.min(20, Math.max(1, lvl)) - 1)/19;
const MATCH_K = .25;
/* Молодий гравець на рівні дивізіону обов'язково має високу межу — інакше він не
   був би таким сильним у свої роки. Щоб легенди не траплялись на кожному кроці,
   межа гравця команди звичайно не вища за стелю дивізіону на два вище (на одну
   зірку більше, ніж природно для дивізіону); лише кожен тридцятий — «самородок»
   з межею на шість дивізіонів вище. Якщо межа не вміщується, гравець стає старшим. */
function limCapFor(level){
  const d=divOf(level/.92);
  return CEIL[Math.max(1, d-(rnd()<.03?6:2))];
}
/* ---------- кожна характеристика старіє по-своєму (рішення 29.09, прогін vertical/sim/age-attrs.js) ----------
   Швидкість і сила ростуть до 24–27 і в’януть найшвидше; пас, техніка, відбір, повітря — пізніше й повільніше;
   воротар — найпізніше. Крива ролі виходить сама з ваг її характеристик: вінгери — пік раніше, захисники й півзахисники — пізніше. */
const APEAK=[24,27,25,27,28,26,29,29], AHOLD=[26,30,28,31,32,30,32,32], ADROP=[.035,.02,.03,.01,.008,.015,.015,.015];
function attrC(i,age,gk){
  const st=.45, pk=gk?30:APEAK[i], hold=gk?33:AHOLD[i], drop=gk?.02:ADROP[i];
  if(age<=pk){ const f=Math.max(0,(age-16)/(pk-16)); return st+(1-st)*(1-Math.pow(1-f,2)) }
  if(age<=hold) return 1;
  let v=1; for(let a=hold+1;a<=age;a++) v-=drop*(a>31?1.5:1);
  return Math.max(.3,v);
}
const CURVES={};
/* крива ролі: 0 у 16 років … 1 у піку, далі спадає; pk0–pk1 — роки піку (для тексту в картці) */
function roleCurve(key){
  if(CURVES[key]) return CURVES[key];
  const gk=key==="gk", w=gk?GK_W:ROLES[key];
  const C=a=>w.reduce((sum,wi,i)=>sum+wi*attrC(i,a,gk),0)/100;
  const c16=C(16); let mx=0; for(let a=16;a<=36;a+=.25) mx=Math.max(mx,C(a));
  const f=a=>{ const fl=Math.floor(a), fr=a-fl; return (C(fl)*(1-fr)+C(fl+1)*fr-c16)/(mx-c16) };
  let pk0=16,pk1=16; for(let a=16;a<=36;a+=.25){ if(f(a)>=.985){ if(pk0===16) pk0=a; pk1=a } }
  return CURVES[key]={f,pk0,pk1};
}
/* сила на лінії віку: від старту (у 16) до межі за кривою ролі */
const lineFor=(lim,role,age)=>{ const st=s16Of(lim); return st+(lim-st)*Math.max(0,roleCurve(role).f(Math.min(36,age))) };
/* яку межу має гравець, який у цьому віці стоїть на лінії з силою y */
function limForCurve(y,role,age){
  const g=Math.max(.15,roleCurve(role).f(Math.min(36,age)));
  let lim = y>S16 ? S16+(y-S16)/g : 0;
  if(lim < S16/.7) lim = y/(.7+.3*g);
  return lim;
}
function fitAge(level, role, age, cap=99){
  while(age<33 && limForCurve(level/.94, role, age)>cap) age++;
  return age;
}

/* ---------- імена ---------- */
const F1="Дієго Пабло Хав'єр Ніко Аран Ізан Марко Ерік Начо Ману Бруно Айтор Хуліан Рубен Іван Серхіо Адам Лукас Тьяго Рафа Хорхе Альваро Гонсало Кіко Хуан Дані Мігель Артем Матео Ясін Омар Луїс Феліпе Андрій Карлос Хоакін Рікардо Педро Тоні".split(" ");
const L1="Ортега Салазар Бенітес Кабрера Ромеро Наварро Ібаньєс Кампос Естевес Мендес Гальярдо Сеговія Аранда Пірес Домінго Валеро Ескудеро Морено Кастро Рейна Сорія Марсаль Пуйоль Аларкон Гуерра Осуна Вергара Ліма Дуарте Ковач Мельник Рібас Соарес Аюсо Бланко Кінтана Ферран Урбіна Ібарра Салас Тревіньо Ленц Пасторе Кіріко Фалькао".split(" ");
const CLUBS=["Кантера","Атлетіко Марбелья","Реал Пенья","Ла Пальма","Естрелья","Аврора","Сітадель","Костеро","Вердемар","Санта Крус","Ібеля","Норте","Оріон","Кастельо","Понтеведра","Лагуна"];
const uname=()=>pick(F1)+" "+pick(L1);

/* ---------- здібності (рішення 25–29.09; числа ефектів — пробні, без прогону) ----------
   Скільки їх — за зірками: 1–2★ одна, 3★ дві, 4–6★ три. Рівні 1–5, рівень = 10 очок; друга відкривається на 10 очках, третя на 20.
   Діє лише у своєму моменті матчу: гра головою — кутові, стандарти — штрафні й пенальті, витривалий — втома,
   швидкий — атака з флангів, рефлекси й ловець пенальті — воротар. */
const FIELD_POS=["ЦЗ","КЗ","ОП","ЦП","АП","ВНГ","НП"];
const ABIL={
  head:{name:"Гра головою",hint:"кутові й навіси: гол головою частіше",pos:FIELD_POS},
  stam:{name:"Витривалий",hint:"повільніше втомлюється",pos:FIELD_POS},
  set:{name:"Стандарти",hint:"штрафні й пенальті — точніше",pos:["ОП","ЦП","АП","ВНГ","НП"]},
  fast:{name:"Швидкий",hint:"атака з флангів — трохи сильніший",pos:["КЗ","ВНГ","НП","АП"]},
  gkref:{name:"Рефлекси",hint:"воротар сильніший у матчі",pos:["ВР"]},
  gkpen:{name:"Ловець пенальті",hint:"частіше відбиває пенальті",pos:["ВР"]},
};
const abilCount = stars => stars<=2 ? 1 : stars===3 ? 2 : 3;
function pickAbilities(p){
  const ids=Object.keys(ABIL).filter(id=>ABIL[id].pos.includes(ROLE_POS[p.key]));
  const out=[]; while(out.length<abilCount(p.stars()) && ids.length){ out.push(ids.splice(Math.floor(rnd()*ids.length),1)[0]) }
  return out;
}
/* рівень здібності гравця: 0 — немає чи ще не відкрита */
function abLv(p,id){
  if(!p||!p.abl) return 0;
  const i=p.abl.indexOf(id); if(i<0) return 0;
  const T=p.abp||0, open=Math.min(p.abl.length,1+Math.floor(T/10));
  if(i>=open) return 0;
  return Math.min(5,1+Math.floor(Math.max(0,T-10*i)/10));
}

/* ---------- гравець ----------
   pot — межа гравця (до якої сили він може дорости за кар'єру), з неї — зірки.
   Якщо межу не задано, її виводимо з сили й віку: гравець стоїть на своїй лінії
   віку або трохи нижче. Тоді в усьому світі вік, сила й зірки узгоджені. */
class P{
  constructor(name,role,level,gk=false,age=null,spread=.22,lim=null){
    this.name=name;this.role=role;this.gk=gk;
    this.age = age ?? ri(18,31);
    const w = gk?GK_W:ROLES[role];
    this.attrs=[...Array(8)].map((_,i)=>Math.max(5,Math.min(99,
      level*(1+(w[i]-12.5)/12.5*spread)*rf(.93,1.07))));
    const k=level/this.power();            // сила в ролі = рівень, щоб стеля дивізіону трималась
    this.attrs=this.attrs.map(a=>Math.max(5,Math.min(99,a*k)));
    this.key = gk?"gk":role;
    const rc = roleCurve(this.key); this.pk = rc.pk0; this.pk1 = rc.pk1;
    this.pot = lim ?? Math.min(99, Math.max(this.power(), limForCurve(this.power()/rf(.88,1), this.key, this.age)));
    this.ret = 33 + ri(0,2) + (gk?2:0);    // вік завершення кар'єри; точно його не знає ніхто
    this.glass= rf(.5,2);
    this.prof = rf(.6,1.2);
    this.form = rf(.85,1.12);
    this.side = isFlank(role) ? (rnd()<.5 ? "R" : "L") : null;   // фланг захисника чи вінгера
    this.abl = pickAbilities(this);
    this.abp = Math.floor(rnd()*(8*this.abl.length+1));            // дорослі мають трохи прокачаних; вихованець стартує з 0
    this.reset();
  }
  stars(){return starsOfLim(this.pot)}
  line(ageF){return lineFor(this.pot,this.key,ageF)}
  /* скільки сили за день дає лінія: вона росте лише до піку, далі — 0 */
  slopeDay(ageF){ return Math.max(0, this.line(ageF+1/30)-this.line(ageF)) }
  /* Піднімає силу в ролі на dP, але не вище лінії віку. Фокус тренування тягне
     свою характеристику сильніше; сила в ролі від цього росте так само. */
  grow(dP, ageF, focus=-1){
    const cur=this.power(), d=Math.min(dP, this.line(ageF)-cur);
    if(d<=0) return 0;
    const w=this.gk?GK_W:ROLES[this.role];
    const v=w.map((wi,i)=>wi+(i===focus?25:0));
    const k=d*100/v.reduce((s,vi,i)=>s+vi*w[i],0);
    this.attrs=this.attrs.map((a,i)=>Math.min(99,a+k*v[i]));
    return this.power()-cur;
  }
  /* Понад лінією віку триматись не можна: якщо сила вища за лінію — всі характеристики опускаються до неї
     (лінія після піку спадає за кривою ролі: швидкість першою, пас останнім). */
  decline(ageF){
    const l=this.line(ageF), cur=this.power();
    if(cur<=l) return 0;
    const k=l/cur; this.attrs=this.attrs.map(x=>Math.max(5,x*k));
    return this.power()-cur;
  }
  /* keep — свіжість не скидати: у твоїй команді вона переходить з дня на день (рішення 29.09) */
  reset(keep){if(!keep)this.fresh=1;this.rating=6;this.goals=0;this.assists=0;
          this.yellow=0;this.red=false;this.injured=false;this.touches=0}
  power(){const w=this.gk?GK_W:ROLES[this.role];
    return this.attrs.reduce((s,a,i)=>s+a*w[i],0)/100}
  /* сила в чужій ролі: ті самі характеристики, інші ваги */
  powerIn(role){const w=(role==="gk")?GK_W:ROLES[role];
    if(!w) return this.power();
    return this.attrs.reduce((s,a,i)=>s+a*w[i],0)/100}
  eff(m){return this.power()*(.7+.3*this.fresh)*m*this.form}
  /* сила на місці в складі: за роллю місця × як знає позицію */
  fitIn(slot){return (slot==="GK" ? (this.gk ? this.power() : this.powerIn("gk")) : this.powerIn(SLOT_ROLE[slot])) * fam(this,slot)}
  effIn(slot,m){
    const fa = SLOT_ROLE[slot] && ["RB","LB","RW","LW","ST","AM"].includes(slot) ? .008*abLv(this,"fast") : 0;
    return this.fitIn(slot)*(1+fa)*(.7+.3*this.fresh)*m*this.form;
  }
  pos(){return ROLE_POS[this.role]||"—"}
}

/* ---------- команда ---------- */
const SPECS=[["RB","fb_def"],["CB1","cb_destroyer"],["CB2","cb_builder"],["LB","fb_wing"],
             ["DM","dm_breaker"],["CM","cm_b2b"],["AM","cm_play"],
             ["RW","w_fast"],["ST","st_fast"],["LW","w_inv"]];
const BENCHR=["cb_builder","fb_wing","dm_deep","am_ten","w_cross","st_target","st_false9"];
const SLOTS=["GK","RB","CB1","CB2","LB","DM","CM","AM","RW","ST","LW"];
const SLOT_ROLE=Object.fromEntries(SPECS);

/* Вік гравця основи: здебільшого 23–29, молодь в основі рідко. Стартовий склад
   твого клубу — 22–29 років (середній ≈ 24–25). */
const AGE_XI=[19,20,21,22,23,24,25,26,27,28,29,30,31,32], AGE_XI_W=[1,2,3,5,7,8,9,9,8,7,6,4,3,2];
function mkAt(role,level,gk,age){ return new P(uname(),role,level,gk,fitAge(level,gk?"gk":role,age,limCapFor(level))) }
class Team{
  constructor(name,level,human=false){
    this.name=name;this.level=level;this.human=human;
    this.press=1;this.line=1;this.tacBonus=0;this.presence=0;this.actions=0;
    const ageXI = () => human ? ri(22,29) : wpick(AGE_XI,AGE_XI_W);
    this.gk=mkAt("gk",level,true,ri(22,32));
    this.xi={};
    SPECS.forEach(([slot,role])=>{this.xi[slot]=mkAt(role,level*rf(.92,1.08),false,ageXI())});
    this.bench=[mkAt("gk",level*.92,true,ri(19,33)),
      ...BENCHR.map(r=>mkAt(r,level*rf(.82,1.0),false,ri(18,33)))];
    Object.entries(SLOT_SIDE).forEach(([s,sd])=>{this.xi[s].side=sd});   // основа — на своїх флангах
    this.subsMade=0;
    this.reset();
  }
  all(){return [this.gk,...SLOTS.slice(1).map(s=>this.xi[s]),...this.bench]}
  onPitch(){return [this.gk,...SLOTS.slice(1).map(s=>this.xi[s])]}
  /* свіжість: твоя команда несе втому з дня на день; суперник-ШІ робить ротацію сам —
     його основа виходить на AI_FRESH: звичайно 100 %, після подвійної суботи менше (рішення 30.09) */
  reset(){const keep=this.human;this.onPitch().forEach(p=>p.reset(keep));this.bench.forEach(p=>p.reset(keep));
    if(!keep) this.onPitch().forEach(p=>{p.fresh=AI_FRESH});
    this.goals=0;this.shots=0;this.attacks=0;this.yellows=0;this.reds=0;
    this.injuries=0;this.men=11;this.subsMade=0;this.presence=0;this.actions=0}
  chem(){ /* хімія: природна позиція + свіжість зв'язків */
    let ok=0;SPECS.forEach(([s,r])=>{if(this.xi[s].role===r)ok++});
    return Math.max(-.04, .02 + .005*ok - .03);
  }
  mult(){
    let b=this.chem()+this.tacBonus+this.presence+(this.morale||0);   // мораль основи: до ±3 % (рішення 29.09)
    let m=1+Math.min(.12,b);                       // стеля сумарних бонусів 12 %
    /* дома: частина переваги — від уболівальників, × заповненість (crowd: маленький 0,5 … великий повний 1,5) */
    if(this.home) m*=1+HOME_BASE+HOME_STAND*.5*(this.crowd ?? 1);
    if(this.men<11) m*=.85;
    return m;
  }
  zone(names){
    const ps=names.map(n=>[n,this.xi[n]]).filter(([,p])=>p&&!p.red);
    if(!ps.length) return [1,[]];
    const m=this.mult();
    return [ps.reduce((s,[n,p])=>s+p.effIn(n,m),0)/ps.length, ps.map(([,p])=>p)];
  }
  gkPower(){return this.gk.fitIn("GK")*(1+.01*abLv(this.gk,"gkref"))}
  zDef(){return this.zone(["RB","CB1","CB2","LB"])}
  zMid(){return this.zone(["DM","CM","AM"])}
  zLeft(){return this.zone(["LW","LB"])}
  zRight(){return this.zone(["RW","RB"])}
  zAtt(){return this.zone(["ST","RW","LW","AM"])}
  tire(mins){this.onPitch().forEach(p=>{if(p.red)return;
    p.fresh=Math.max(.35,p.fresh-.0030*(1.5-p.attrs[2]/100)*this.press*mins*(1-.05*abLv(p,"stam")))})}
  rate(){const ps=this.onPitch();return ps.reduce((s,p)=>s+p.power(),0)/ps.length}
  wageBill(){return this.all().reduce((s,p)=>s+wageOf(p),0)}
}

/* ---------- фол / стандарт ---------- */
function foulCheck(att,dfn,df,danger,out){
  const care = df.yellow>=1 ? .35 : 1;
  if(R()>=FOUL_BASE*(1.4-df.attrs[6]/100)*dfn.press*care) return;
  const r=R();
  if(r<RED_P){df.red=true;dfn.reds++;dfn.men--;df.rating-=1.2;
    out.push({t:"red",team:dfn,p:df,txt:`${df.name} — червона. ${dfn.name} удесятьох.`});}
  else if(r<YEL_BAND){df.yellow++;dfn.yellows++;df.rating-=.3;
    if(df.yellow>=2){df.red=true;dfn.reds++;dfn.men--;
      out.push({t:"red",team:dfn,p:df,txt:`Друга жовта — ${df.name} іде з поля.`});}
    else out.push({t:"yel",team:dfn,p:df,txt:`Жовта картка: ${df.name}.`});}
  if(danger && R()<FK_P){
    const sh=att.onPitch().slice(1).reduce((a,b)=>a.attrs[5]>b.attrs[5]?a:b);
    if(R()<FK_CONV*(1+.06*abLv(sh,"set"))*duel(sh.attrs[5],dfn.gkPower(),0,90)){
      att.goals++;sh.goals++;sh.rating+=1;
      out.push({t:"goal",team:att,p:sh,txt:`ШТРАФНИЙ! ${sh.name} кладе м'яч у дев'ятку.`});}
    else out.push({t:"sp",team:att,txt:`Штрафний небезпечно, але повз.`});
  }
}

/* ---------- один епізод ---------- */
function episode(hm,aw,ph){
  const out=[];
  const att = R()<ph ? hm:aw, dfn = att===hm?aw:hm;
  att.attacks++;
  const lineAtt = (att.line-1)*2.2, lineDef = (dfn.line-1)*-1.8;

  const [a1,ap1]=att.zMid(); let [d1,dp1]=dfn.zMid(); d1*=dfn.press;
  if(R()>duel(a1,d1,BIAS+lineAtt)){
    if(dp1.length) foulCheck(att,dfn,pick(dp1),false,out);
    out.push({t:"lose",team:dfn,zone:"mid",txt:`${dfn.name} перехоплює в центрі.`});
    return out;
  }
  const ch=wpick(["L","C","R"],[.32,.36,.32]);
  let a2,ap,d2,dp;
  if(ch==="L"){[a2,ap]=att.zLeft();[d2,dp]=dfn.zRight()}
  else if(ch==="R"){[a2,ap]=att.zRight();[d2,dp]=dfn.zLeft()}
  else {[a2,ap]=att.zMid();[d2,dp]=dfn.zMid()}
  const carrier = ap.length?pick(ap):null; if(carrier) carrier.touches++;
  if(R()>duel(a2,d2,BIAS+lineAtt)){
    if(dp.length) foulCheck(att,dfn,pick(dp),true,out);
    out.push({t:"stop",team:att,zone:ch,p:carrier,
      txt:carrier?`${carrier.name} йде ${ch==="L"?"лівим":ch==="R"?"правим":"центром"}, але його зупиняють.`:"Атака глухне."});
    return out;
  }
  const [a3,ap3]=att.zAtt(); const [d3]=dfn.zDef();
  if(ap3.length){
    const v=pick(ap3);
    /* утомлений травмується частіше: свіжість 50 % — удвічі частіше за свіжого (рішення 29.09) */
    if(!v.injured && R()<INJ_BASE*v.glass*(3-2*v.fresh)){v.injured=true;att.injuries++;
      out.push({t:"inj",team:att,p:v,txt:`${v.name} лишається лежати. Схоже на пошкодження.`});}
  }
  if(R()>duel(a3,d3,BIAS+lineDef)){
    if(R()<CORNER_P && ap3.length){
      const hdr=ap3.reduce((a,b)=>a.attrs[7]>b.attrs[7]?a:b);
      const [ah]=att.zAtt(),[dh]=dfn.zDef();
      if(R()<CORNER_CONV*(1+.08*abLv(hdr,"head"))*duel(ah,dh,0,90)*2){
        att.goals++;hdr.goals++;hdr.rating+=1;
        out.push({t:"goal",team:att,p:hdr,zone:"box",txt:`КУТОВИЙ — ${hdr.name} виграє повітря і б'є головою!`});}
      else out.push({t:"corner",team:att,zone:"box",txt:`Кутовий у ${att.name}. Захист вибиває.`});
    } else out.push({t:"block",team:dfn,zone:"box",txt:`Оборона ${dfn.name} встигає перекрити.`});
    return out;
  }
  if(R()<PEN_P){
    const k=ap3.length?ap3.reduce((a,b)=>a.attrs[5]>b.attrs[5]?a:b):att.xi.ST;
    if(R()<Math.min(.95,PEN_CONV*(1+.03*abLv(k,"set"))*(1-.05*abLv(dfn.gk,"gkpen")))){att.goals++;k.goals++;k.rating+=1;
      out.push({t:"goal",team:att,p:k,zone:"box",txt:`ПЕНАЛЬТІ — ${k.name} б'є впевнено. Гол!`});}
    else {k.rating-=.8;out.push({t:"sp",team:att,zone:"box",txt:`ПЕНАЛЬТІ — і ${k.name} не влучає!`});}
    return out;
  }
  att.shots++;
  const sh = ap3.length? wpick(ap3,ap3.map(p=>p.attrs[5])) : att.xi.ST;
  sh.touches++;
  if(R()<CONV*2*duel(sh.attrs[5],dfn.gkPower(),0,90)){
    att.goals++;sh.goals++;sh.rating+=1;
    const others=ap3.filter(p=>p!==sh);
    let asst=null; if(others.length){asst=pick(others);asst.assists++;asst.rating+=.6}
    out.push({t:"goal",team:att,p:sh,zone:"box",
      txt:`ГОЛ! ${sh.name} б'є${asst?` після передачі ${asst.name}`:""} — і не лишає шансів.`});
  } else {
    dfn.gk.rating+=.15;
    out.push({t:"shot",team:att,p:sh,zone:"box",txt:`${sh.name} б'є — ${dfn.gk.name} рятує.`});
  }
  return out;
}

/* ---------- швидкий матч (для ШІ-пар) ---------- */
function quickMatch(hm,aw){
  hm.reset();aw.reset();hm.home=true;aw.home=false;
  const [hmid]=hm.zMid(),[amid]=aw.zMid();
  const ph=hmid/(hmid+amid), N=ri(64,76);
  for(let i=0;i<N;i++){ if(i%6===0){hm.tire(90/N*6);aw.tire(90/N*6)}
    /* перерва — як у матчі наживо: +7 % свіжості, щоб автопілот утомлював так само */
    if(i===Math.round(N/2)) [hm,aw].forEach(t=>t.onPitch().forEach(p=>p.fresh=Math.min(1,p.fresh+.07)));
    episode(hm,aw,ph); }
  return [hm.goals,aw.goals];
}

/* ---------- календар ---------- */
function makeFixtures(names){
  const n=names.length, arr=[...names], rounds=[];
  for(let r=0;r<n-1;r++){
    const pairs=[];
    for(let i=0;i<n/2;i++) pairs.push([arr[i],arr[n-1-i]]);
    rounds.push(pairs);
    arr.splice(1,0,arr.pop());
  }
  return [...rounds, ...rounds.map(rd=>rd.map(([a,b])=>[b,a]))];
}

/* ---------- економіка (ОСНОВА.md, розділи 0 і 3) ----------
   Одна мірка для всіх грошей — дохід розвиненого клубу дивізіону: скільки за сезон
   заробляє клуб, у якого стадіон і комерційний відділ на рівні, типовому для дивізіону.
   Від неї рахуються ціни, зарплати й стеля зарплат, тож вони ростуть разом із будівлями. */

/* типовий дохід дивізіону на старті: Д12 ≈ 450 000, ×1,3 на кожен дивізіон угору */
const baseIncome = L => 450000 * Math.pow(1.3, 12 - L);
function divisionIncome(d){ return Math.round(baseIncome(d)) }
/* типовий рівень стадіону й комерційного відділу для дивізіону: Д12 — 4 … Д1 — 20 */
const need = L => 4 + (12 - L) * 16 / 11;
/* рівень дивізіону для сили (дробовий): 40 → 12, 45 → 11 … 99 → 1 */
function levelOf(x){
  if(x>=99) return 1;
  for(let d=1;d<16;d++) if(x>=CEIL[d+1]) return d+(CEIL[d]-x)/(CEIL[d]-CEIL[d+1]);
  return 16;
}
/* сила, що відповідає дробовому рівню дивізіону (зворотне до levelOf) */
function strengthAt(L){
  L=Math.max(1,Math.min(16,L)); const d=Math.floor(L), f=L-d;
  return d>=16 ? CEIL[16] : CEIL[d]-f*(CEIL[d]-CEIL[d+1]);
}
/* частини сезонного доходу. Квитки й спонсор ростуть з будівлями лише до «типовий + 2»:
   завеликий стадіон стоїть напівпорожній */
const ticketsSeason = (d, stadium)    => .30 * baseIncome(d) * (.5 + .25*Math.min(stadium, need(d)+2));
const sponsorSeason = (d, commercial) => .45 * baseIncome(d) * (.75 + .25*Math.min(commercial, need(d)+2));
const upkeepSeason  = (d, levels)     => baseIncome(d) * (.05 + .0006*levels);
/* дохід розвиненого клубу дивізіону (L може бути дробовим) — мірка цін і зарплат */
const devIncome = L => ticketsSeason(L, need(L)) + sponsorSeason(L, need(L)) + .244*baseIncome(L);
/* стеля зарплат: 75 % від (половини доходу розвиненого клубу + половини власного) — підняли разом
   із зарплатами вгорі (прогін money-wage.js, 28.09: зі стелею 60 % ринок стає) */
function wageCap(d, ownIncome){ return Math.round(.75 * (devIncome(d)/2 + ownIncome/2)) }

/* ---------- звідки клуб бере гроші (рішення 28.09, прогін vertical/sim/money-split.js, варіант 8) ----------
   Мірка — сезонний дохід «звичайного» клубу дивізіону на 8-му місці, з будівлями, типовими для дивізіону.
   Його частки: квитки 38 %, спонсор 20 % (Д4 24 %, Д3 28 %, Д2 32 %, Д1 35 % — угорі клуби стають брендами),
   атрибутика 8 %, решта — призові: 40 % з них за матчі (перемога 3 : нічия 1 : поразка 0,3),
   60 % — за місце в кінці сезону рівними кроками, як у Прем'єр-лізі й Ла Лізі. */
const typicalTotal = d => { const dev = devIncome(d), L = need(d);
  const unit = .40*.174*1.5*dev/(11.25*3+7.5+11.25*.3), p1 = .60*.174*1.5*dev/(8.5/16);
  return ticketsSeason(d, L) + sponsorSeason(d, L) + unit*(11*3+8+11*.3) + p1*9/16 };
const SP_SHARE = d => d >= 5 ? .20 : ({ 4: .24, 3: .28, 2: .32, 1: .35 })[d];
const tickets = (d, st)  => ticketsSeason(d, st)  * .38 * typicalTotal(d) / ticketsSeason(d, need(d));
const sponsor = (d, com) => sponsorSeason(d, com) * SP_SHARE(d) * typicalTotal(d) / sponsorSeason(d, need(d));
const merch   = (d, com) => sponsorSeason(d, com) * .08 * typicalTotal(d) / sponsorSeason(d, need(d));
const prizeMid = d => typicalTotal(d) - tickets(d, need(d)) - sponsor(d, need(d)) - merch(d, need(d));
const MATCH_W = { w: 3, d: 1, l: .3 };
const matchPay = (d, res) => .40 * prizeMid(d) / (11*3 + 8 + 11*.3) * MATCH_W[res];
const placePrize = (d, pos) => .60 * prizeMid(d) / (9/16) * (17 - pos) / 16;
/* скільки призових за сезон отримує клуб на 8-му місці (11 перемог, 8 нічиїх, 11 поразок) — для прогнозу */
const prizeAt8 = d => 11*matchPay(d,"w") + 8*matchPay(d,"d") + 11*matchPay(d,"l") + placePrize(d, 8);
/* стадіон: місткість від 1 000 на 1-му рівні до 400 000 на 20-му; вболівальників приходить стільки,
   скільки вміщує стадіон рівня «типовий для дивізіону + 2» — більший стадіон стоїть напівпорожній */
const seats = L => Math.round(1000 * Math.pow(400, (Math.max(1, L) - 1) / 19) / 100) * 100;
const fans  = d => seats(Math.round(need(d) + 2));
/* контракт на 1–4 роки: коротший дорожчий за рік, довший дешевший (ОСНОВА, ПЛАН 43) */
const CONTRACT_K = { 1: 1.15, 2: 1.07, 3: 1.00, 4: 0.95 };

const ageW = a => a<=20?.6 : a<=24?.85 : a<=29?1 : a<=32?.9 : .75;
const ageV = a => a<=20?1.3 : a<=23?1.2 : a<=26?1.1 : a<=29?1 : a<=31?.6 : .3;
const youthK = a => a<=19?1 : a<=21?.7 : a<=23?.4 : 0;
/* зарплата за сезон: 1,5 % доходу розвиненого клубу того рівня, якому відповідає сила,
   помножене на криву: до рівня Д6 склад забирає ≈ 15 % доходу, вище частка росте до ≈ 30 % у Д1 —
   зірки «з'їдають» дохід угорі, і гроші не накопичуються (рішення 28.09, прогін money-wage.js, W7б).
   Якщо в гравця є контракт — платимо зарплату з контракту. */
const wageK = L => (L >= 6 ? .15 : .15 + .25 * (6 - Math.max(1, L)) / 5) / .14;
function wageFor(p){ const L = levelOf(p.power());
  return Math.round(.015 * devIncome(L) * wageK(L) * ageW(p.age) * (p.wagePrem || 1)) }
function wageOf(p){ return p.wg != null ? p.wg : wageFor(p) }
/* ціна: 14 % доходу розвиненого клубу його рівня (з поправкою на вік); молодий талант —
   не менше 0,4 від ціни гравця, яким він стане */
function valueOf(p){
  return Math.round(Math.max(.14 * devIncome(levelOf(p.power())) * ageV(p.age),
                             .4 * .14 * devIncome(levelOf(p.pot)) * youthK(p.age)));
}

/* будівлі: 135 000 × 1,27^(рівень−1); час 8 год × 1,25^(рівень−1) — подвоєно 26.09, щоб прискорення
   за золото мало сенс (ОСНОВА 3.4) */
function buildCost(level){ return Math.round(135000 * Math.pow(1.27, level-1)) }
function buildHours(level){ return +(8 * Math.pow(1.25, level-1)).toFixed(1) }

/* Хто погоджується перейти (ОСНОВА 4.1), усе в дивізіонах.
   Стеля — рівень твого дивізіону; кожні 4 рівні стадіону понад типовий — пів дивізіону
   вгору, нижче типового — стеля нижча. До стелі — згода; до 1 дивізіону вище — за більшу
   зарплату; до 2 — переговори, лише якщо стадіон не нижчий за типовий; далі — відмова.
   Гравцям від 30 років розрив рахується на 1 менше. */
const ceilLevel = (d, stadium) => d - .125*(stadium - need(d));
function signTier(p, d, stadium){
  let gap = ceilLevel(d, stadium) - levelOf(p.power());
  if(p.age>=30) gap -= 1;
  if(gap<=0) return { ok:true,  prem:1,    bonus:0,  gap, tag:"погодиться",     cls:"ok" };
  if(gap<=1) return { ok:true,  prem:1.35, bonus:0,  gap, tag:"за більшу з.п.", cls:"warn" };
  if(gap<=2 && stadium>=need(d)) return { ok:true, prem:1.8, bonus:.3, offer:true, gap, tag:"переговори", cls:"offer" };
  return { ok:false, prem:1, bonus:0, gap, tag:"відмовить", cls:"no" };
}
/* який стадіон потрібен, щоб гравець погодився без надбавок */
function stadiumFor(p, d){
  const lv = levelOf(p.power()) + (p.age>=30 ? 1 : 0);
  return Math.ceil(need(d) + 8*(d - lv));
}
/* комісія з трансферів: прогресивна 5–12 % залежно від суми угоди */
function transferCommission(value){
  const t = Math.max(0, Math.min(1, value / 3000000));
  return .05 + .07 * t;
}

window.VERT = {
  R, ri, rf, pick, wpick, reseed, get SEED(){return SEED},
  ATTR, ATTR_SHORT, ROLES, GK_W, ROLE_UA, ROLE_POS, SLOT_POS, SLOT_UA,
  CEIL, divOf, STAR_TOP, LIM_BAND, starsOfLim, PEAK, S16, s16Of, lineAt, limFor,
  kBase, MATCH_K, fitAge, limCapFor, lineFor, roleCurve, ABIL, abLv, abilCount, pickAbilities, P, Team, SPECS, BENCHR, SLOTS, SLOT_ROLE, SLOT_SIDE, fam, isFlank,
  episode, quickMatch, makeFixtures, duel, uname, CLUBS,
  wageOf, wageFor, valueOf, divisionIncome, baseIncome, devIncome, need, levelOf, strengthAt, ceilLevel, signTier, stadiumFor,
  ticketsSeason, sponsorSeason, placePrize, upkeepSeason, wageCap, buildCost, buildHours, transferCommission, CONTRACT_K,
  typicalTotal, tickets, sponsor, merch, matchPay, prizeAt8, seats, fans, INJURIES, rollInjury, get AI_FRESH(){return AI_FRESH}, setAiFresh(v){AI_FRESH=v},
};
