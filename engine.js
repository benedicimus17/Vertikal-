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

/* стеля рейтингу по дивізіонах: CEIL[12] = 28 */
const CEIL=[0,99,88,78,70,62,55,49,44,39,35,31,28,25,22,20];

/* ---------- імена ---------- */
const F1="Дієго Пабло Хав'єр Ніко Аран Ізан Марко Ерік Начо Ману Бруно Айтор Хуліан Рубен Іван Серхіо Адам Лукас Тьяго Рафа Хорхе Альваро Гонсало Кіко Хуан Дані Мігель Артем Матео Ясін Омар Луїс Феліпе Андрій Карлос Хоакін Рікардо Педро Тоні".split(" ");
const L1="Ортега Салазар Бенітес Кабрера Ромеро Наварро Ібаньєс Кампос Естевес Мендес Гальярдо Сеговія Аранда Пірес Домінго Валеро Ескудеро Морено Кастро Рейна Сорія Марсаль Пуйоль Аларкон Гуерра Осуна Вергара Ліма Дуарте Ковач Мельник Рібас Соарес Аюсо Бланко Кінтана Ферран Урбіна Ібарра Салас Тревіньо Ленц Пасторе Кіріко Фалькао".split(" ");
const CLUBS=["Кантера","Атлетіко Марбелья","Реал Пенья","Ла Пальма","Естрелья","Аврора","Сітадель","Костеро","Вердемар","Санта Крус","Ібеля","Норте","Оріон","Кастельо","Понтеведра","Лагуна"];
const uname=()=>pick(F1)+" "+pick(L1);

/* ---------- гравець ---------- */
const AGE_CAP = a=>Math.min(1,.55+.045*(a-16));
class P{
  constructor(name,role,level,gk=false,age=null,spread=.22){
    this.name=name;this.role=role;this.gk=gk;
    this.age = age ?? ri(18,31);
    const w = gk?GK_W:ROLES[role];
    this.attrs=[...Array(8)].map((_,i)=>Math.max(5,Math.min(99,
      level*(1+(w[i]-12.5)/12.5*spread)*rf(.93,1.07))));
    const k=level/this.power();            // сила в ролі = рівень, щоб стеля дивізіону трималась
    this.attrs=this.attrs.map(a=>Math.max(5,Math.min(99,a*k)));
    this.pot  = Math.min(99, this.power()*rf(1.08,1.55));
    this.glass= rf(.5,2);
    this.prof = rf(.6,1.2);
    this.form = rf(.85,1.12);
    this.reset();
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
  starPct(){return Math.max(4,Math.min(100,this.pot/99*100))}   // зірки абсолютні: шкала світу, не дивізіону
  pos(){return ROLE_POS[this.role]||"—"}
  train(focus){
    const cur=this.power();
    const kAge = this.age<=20?1.35 : this.age<=23?1.15 : this.age<=26?1 : this.age<=29?.7 : .4;
    const kCeil= Math.max(0,(this.pot-cur)/this.pot);
    const cap  = this.pot*AGE_CAP(this.age);
    const w=this.gk?GK_W:ROLES[this.role];
    for(let i=0;i<8;i++){
      if(this.attrs[i]>=cap) continue;
      const kF = (focus===i)?1.6:.55;
      const kB = .6+ (w[i]/100)*2.2;
      this.attrs[i]=Math.min(cap, this.attrs[i] + .45*kAge*kB*kF*this.prof*kCeil*this.form*.25);
    }
  }
}

/* ---------- команда ---------- */
const SPECS=[["RB","fb_def"],["CB1","cb_destroyer"],["CB2","cb_builder"],["LB","fb_wing"],
             ["DM","dm_breaker"],["CM","cm_b2b"],["AM","cm_play"],
             ["RW","w_fast"],["ST","st_fast"],["LW","w_inv"]];
const BENCHR=["cb_builder","fb_wing","dm_deep","am_ten","w_cross","st_target","st_false9"];
const SLOTS=["GK","RB","CB1","CB2","LB","DM","CM","AM","RW","ST","LW"];

class Team{
  constructor(name,level,human=false){
    this.name=name;this.level=level;this.human=human;
    this.press=1;this.line=1;this.tacBonus=0;this.presence=0;this.actions=0;
    this.gk=new P(uname(),"gk",level,true);
    this.xi={};
    SPECS.forEach(([slot,role])=>{this.xi[slot]=new P(uname(),role,level*rf(.92,1.08))});
    this.bench=[new P(uname(),"gk",level*.92,true),
      ...BENCHR.map(r=>new P(uname(),r,level*rf(.82,1.0)))];
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

/* ---------- економіка (формули з docs/economy.html і ПЕРЕДАЧІ) ---------- */
const ageWageK = a => a<=20?.75 : a<=23?.9 : a<=28?1 : a<=31?.85 : .6;
const agePriceK= a => a<=20?1.6 : a<=23?1.35 : a<=25?1.2 : a<=28?1 : a<=31?.6 : .3;

/* річна зарплата гравця */
function wageOf(p){
  const potK = 1 + Math.max(0,(p.pot - p.power()))/140;
  return Math.round(7.6 * Math.pow(p.power(), 2.2) * ageWageK(p.age) * potK);
}
/* трансферна вартість */
function valueOf(p){ return Math.round(wageOf(p) * 4.2 * agePriceK(p.age)) }

/* типовий сезонний дохід дивізіону: Д12 ≈ 450 000, ×1,3 на кожен дивізіон угору */
function divisionIncome(d){ return Math.round(450000 * Math.pow(1.3, 12 - d)) }
/* стеля зарплат: 60 % від (половина типового доходу дивізіону + половина власного) */
function wageCap(d, ownIncome){ return Math.round(.6 * (divisionIncome(d)/2 + ownIncome/2)) }

/* будівлі */
function buildCost(level){ return Math.round(135000 * Math.pow(1.27, level-1)) }
function buildHours(level){ return +(4 * Math.pow(1.25, level-1)).toFixed(1) }

/* стеля підпису: стеля дивізіону × (0,86 + 0,016×стадіон + 0,008×комерційний) */
function signingCeiling(d, stadium, commercial){
  const base = CEIL[d] || 20;
  const raw  = base * (.86 + .016*stadium + .008*commercial);
  const above = CEIL[Math.max(1,d-1)] || 99;
  return Math.min(raw, above);
}

window.VERT = {
  R, ri, rf, pick, wpick, reseed, get SEED(){return SEED},
  ATTR, ATTR_SHORT, ROLES, GK_W, ROLE_UA, ROLE_POS, SLOT_POS, SLOT_UA,
  CEIL, AGE_CAP, P, Team, SPECS, BENCHR, SLOTS,
  episode, quickMatch, makeFixtures, duel, uname, CLUBS,
  wageOf, valueOf, divisionIncome, wageCap, buildCost, buildHours, signingCeiling,
};
