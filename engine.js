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

/* ---------- калібровані ручки ---------- */
let K=40, STEP_P=.712, CONV=.0728, FOUL_BASE=.50,
    CORNER_P=.30, CORNER_CONV=.095, FK_P=.10, FK_CONV=.19,
    PEN_P=.016, PEN_CONV=.76, INJ_BASE=.0069, HOME_BASE=.045, HOME_STAND=.034,
    YEL_BAND=.225, RED_P=.0012;
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
function fitAge(level, role, age, cap=99){
  const pk = PEAK[ROLE_POS[role]] ?? 25.5;
  while(age<33 && limFor(level/.94, age, pk)>cap) age++;
  return age;
}

/* ---------- імена ---------- */
const F1="Дієго Пабло Хав'єр Ніко Аран Ізан Марко Ерік Начо Ману Бруно Айтор Хуліан Рубен Іван Серхіо Адам Лукас Тьяго Рафа Хорхе Альваро Гонсало Кіко Хуан Дані Мігель Артем Матео Ясін Омар Луїс Феліпе Андрій Карлос Хоакін Рікардо Педро Тоні".split(" ");
const L1="Ортега Салазар Бенітес Кабрера Ромеро Наварро Ібаньєс Кампос Естевес Мендес Гальярдо Сеговія Аранда Пірес Домінго Валеро Ескудеро Морено Кастро Рейна Сорія Марсаль Пуйоль Аларкон Гуерра Осуна Вергара Ліма Дуарте Ковач Мельник Рібас Соарес Аюсо Бланко Кінтана Ферран Урбіна Ібарра Салас Тревіньо Ленц Пасторе Кіріко Фалькао".split(" ");
const CLUBS=["Кантера","Атлетіко Марбелья","Реал Пенья","Ла Пальма","Естрелья","Аврора","Сітадель","Костеро","Вердемар","Санта Крус","Ібеля","Норте","Оріон","Кастельо","Понтеведра","Лагуна"];
const uname=()=>pick(F1)+" "+pick(L1);

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
    this.pk  = PEAK[ROLE_POS[gk?"gk":role]] ?? 25.5;
    this.pot = lim ?? Math.min(99, Math.max(this.power(), limFor(this.power()/rf(.88,1), this.age, this.pk)));
    this.ret = 33 + ri(0,2) + (gk?2:0);    // вік завершення кар'єри; точно його не знає ніхто
    this.glass= rf(.5,2);
    this.prof = rf(.6,1.2);
    this.form = rf(.85,1.12);
    this.reset();
  }
  stars(){return starsOfLim(this.pot)}
  line(ageF){return lineAt(this.pot,this.pk,ageF)}
  /* скільки сили за день дає лінія: межа мінус старт, поділені на роки до піку.
     Після піку гравець більше не росте. */
  slopeDay(ageF){
    if(ageF>=this.pk+1) return 0;
    return (this.pot-s16Of(this.pot))/(this.pk-16)/30;
  }
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
  /* Після піку (+4 роки) повільно слабшають швидкість, сила й витривалість
     (у воротаря — реакція, стрибок, сила). Техніка, пас, удар не падають. */
  decline(ageF){
    const start=this.pk+4; if(ageF<start) return 0;
    const cur=this.power(), d=.10+.03*(ageF-start);
    (this.gk?[0,4,6]:[0,1,2]).forEach(i=>{this.attrs[i]=Math.max(5,this.attrs[i]-d)});
    return this.power()-cur;
  }
  reset(){this.fresh=1;this.rating=6;this.goals=0;this.assists=0;
          this.yellow=0;this.red=false;this.injured=false;this.touches=0}
  power(){const w=this.gk?GK_W:ROLES[this.role];
    return this.attrs.reduce((s,a,i)=>s+a*w[i],0)/100}
  /* сила в чужій ролі: ті самі характеристики, інші ваги */
  powerIn(role){const w=(role==="gk")?GK_W:ROLES[role];
    if(!w) return this.power();
    return this.attrs.reduce((s,a,i)=>s+a*w[i],0)/100}
  eff(m){return this.power()*(.7+.3*this.fresh)*m*this.form}
  pos(){return ROLE_POS[this.role]||"—"}
}

/* ---------- команда ---------- */
const SPECS=[["RB","fb_def"],["CB1","cb_destroyer"],["CB2","cb_builder"],["LB","fb_wing"],
             ["DM","dm_breaker"],["CM","cm_b2b"],["AM","cm_play"],
             ["RW","w_fast"],["ST","st_fast"],["LW","w_inv"]];
const BENCHR=["cb_builder","fb_wing","dm_deep","am_ten","w_cross","st_target","st_false9"];
const SLOTS=["GK","RB","CB1","CB2","LB","DM","CM","AM","RW","ST","LW"];

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
    this.subsMade=0;
    this.reset();
  }
  all(){return [this.gk,...SLOTS.slice(1).map(s=>this.xi[s]),...this.bench]}
  onPitch(){return [this.gk,...SLOTS.slice(1).map(s=>this.xi[s])]}
  reset(){this.onPitch().forEach(p=>p.reset());this.bench.forEach(p=>p.reset());
    this.goals=0;this.shots=0;this.attacks=0;this.yellows=0;this.reds=0;
    this.injuries=0;this.men=11;this.subsMade=0;this.presence=0;this.actions=0}
  chem(){ /* хімія: природна позиція + свіжість зв'язків */
    let ok=0;SPECS.forEach(([s,r])=>{if(this.xi[s].role===r)ok++});
    return Math.max(-.04, .02 + .005*ok - .03);
  }
  mult(){
    let b=this.chem()+this.tacBonus+this.presence;
    let m=1+Math.min(.12,b);                       // стеля сумарних бонусів 12 %
    if(this.home) m*=1+HOME_BASE+HOME_STAND*.5;
    if(this.men<11) m*=.85;
    return m;
  }
  zone(names){
    const ps=names.map(n=>this.xi[n]).filter(p=>p&&!p.red);
    if(!ps.length) return [1,[]];
    const m=this.mult();
    return [ps.reduce((s,p)=>s+p.eff(m),0)/ps.length, ps];
  }
  zDef(){return this.zone(["RB","CB1","CB2","LB"])}
  zMid(){return this.zone(["DM","CM","AM"])}
  zLeft(){return this.zone(["LW","LB"])}
  zRight(){return this.zone(["RW","RB"])}
  zAtt(){return this.zone(["ST","RW","LW","AM"])}
  tire(mins){this.onPitch().forEach(p=>{if(p.red)return;
    p.fresh=Math.max(.35,p.fresh-.0030*(1.5-p.attrs[2]/100)*this.press*mins)})}
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
    if(R()<FK_CONV*duel(sh.attrs[5],dfn.gk.power(),0,90)){
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
    if(R()<INJ_BASE*v.glass*(2-v.fresh)){v.injured=true;att.injuries++;
      out.push({t:"inj",team:att,p:v,txt:`${v.name} лишається лежати. Схоже на пошкодження.`});}
  }
  if(R()>duel(a3,d3,BIAS+lineDef)){
    if(R()<CORNER_P && ap3.length){
      const hdr=ap3.reduce((a,b)=>a.attrs[7]>b.attrs[7]?a:b);
      const [ah]=att.zAtt(),[dh]=dfn.zDef();
      if(R()<CORNER_CONV*duel(ah,dh,0,90)*2){
        att.goals++;hdr.goals++;hdr.rating+=1;
        out.push({t:"goal",team:att,p:hdr,zone:"box",txt:`КУТОВИЙ — ${hdr.name} виграє повітря і б'є головою!`});}
      else out.push({t:"corner",team:att,zone:"box",txt:`Кутовий у ${att.name}. Захист вибиває.`});
    } else out.push({t:"block",team:dfn,zone:"box",txt:`Оборона ${dfn.name} встигає перекрити.`});
    return out;
  }
  if(R()<PEN_P){
    const k=ap3.length?ap3.reduce((a,b)=>a.attrs[5]>b.attrs[5]?a:b):att.xi.ST;
    if(R()<PEN_CONV){att.goals++;k.goals++;k.rating+=1;
      out.push({t:"goal",team:att,p:k,zone:"box",txt:`ПЕНАЛЬТІ — ${k.name} б'є впевнено. Гол!`});}
    else {k.rating-=.8;out.push({t:"sp",team:att,zone:"box",txt:`ПЕНАЛЬТІ — і ${k.name} не влучає!`});}
    return out;
  }
  att.shots++;
  const sh = ap3.length? wpick(ap3,ap3.map(p=>p.attrs[5])) : att.xi.ST;
  sh.touches++;
  if(R()<CONV*2*duel(sh.attrs[5],dfn.gk.power(),0,90)){
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
  for(let i=0;i<N;i++){ if(i%6===0){hm.tire(90/N*6);aw.tire(90/N*6)} episode(hm,aw,ph); }
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
const PLACE_PRIZE=[[1,2,.489],[3,5,.333],[6,9,.244],[10,13,.178],[14,16,.1]];
const ticketsSeason = (d, stadium)    => .30 * baseIncome(d) * (.5 + .25*Math.min(stadium, need(d)+2));
const sponsorSeason = (d, commercial) => .45 * baseIncome(d) * (.75 + .25*Math.min(commercial, need(d)+2));
const placePrize    = (d, pos)        => PLACE_PRIZE.find(([a,b])=>pos>=a&&pos<=b)[2] * baseIncome(d);
const upkeepSeason  = (d, levels)     => baseIncome(d) * (.05 + .0006*levels);
/* дохід розвиненого клубу дивізіону (L може бути дробовим) — мірка цін і зарплат */
const devIncome = L => ticketsSeason(L, need(L)) + sponsorSeason(L, need(L)) + .244*baseIncome(L);
/* стеля зарплат: 60 % від (половини доходу розвиненого клубу + половини власного) */
function wageCap(d, ownIncome){ return Math.round(.6 * (devIncome(d)/2 + ownIncome/2)) }

const ageW = a => a<=20?.6 : a<=24?.85 : a<=29?1 : a<=32?.9 : .75;
const ageV = a => a<=20?1.3 : a<=23?1.2 : a<=26?1.1 : a<=29?1 : a<=31?.6 : .3;
const youthK = a => a<=19?1 : a<=21?.7 : a<=23?.4 : 0;
/* зарплата за сезон: 1,5 % доходу розвиненого клубу того рівня, якому відповідає сила.
   Якщо в гравця є контракт — платимо зарплату з контракту. */
function wageFor(p){ return Math.round(.015 * devIncome(levelOf(p.power())) * ageW(p.age) * (p.wagePrem || 1)) }
function wageOf(p){ return p.wg != null ? p.wg : wageFor(p) }
/* ціна: 14 % доходу розвиненого клубу його рівня (з поправкою на вік); молодий талант —
   не менше 0,4 від ціни гравця, яким він стане */
function valueOf(p){
  return Math.round(Math.max(.14 * devIncome(levelOf(p.power())) * ageV(p.age),
                             .4 * .14 * devIncome(levelOf(p.pot)) * youthK(p.age)));
}

/* будівлі — вирішено: 135 000 × 1,27^(рівень−1), 4 год × 1,25^(рівень−1) */
function buildCost(level){ return Math.round(135000 * Math.pow(1.27, level-1)) }
function buildHours(level){ return +(4 * Math.pow(1.25, level-1)).toFixed(1) }

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
  kBase, MATCH_K, fitAge, limCapFor, P, Team, SPECS, BENCHR, SLOTS,
  episode, quickMatch, makeFixtures, duel, uname, CLUBS,
  wageOf, wageFor, valueOf, divisionIncome, baseIncome, devIncome, need, levelOf, strengthAt, ceilLevel, signTier, stadiumFor,
  ticketsSeason, sponsorSeason, placePrize, upkeepSeason, wageCap, buildCost, buildHours, transferCommission,
};
