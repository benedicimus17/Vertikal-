/* ВЕРТИКАЛЬ — грабельний прототип.
   Рушій — порт engine.py з калібрування (k=40, STEP_P .712, CONV .0728 …),
   виправлено 12-го польового гравця з тестового скрипта. */

/* ---------- rng ---------- */
let SEED = 20260911;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let rnd = mulberry(SEED);
const R  = ()=>rnd();
const ri = (a,b)=>a+Math.floor(rnd()*(b-a+1));
const rf = (a,b)=>a+rnd()*(b-a);
const pick = a=>a[Math.floor(rnd()*a.length)];
function wpick(arr,w){let s=w.reduce((x,y)=>x+y,0),r=rnd()*s;for(let i=0;i<arr.length;i++){r-=w[i];if(r<=0)return arr[i]}return arr[arr.length-1]}

/* ---------- ролі (ваги 8 характеристик, сума 100) ---------- */
const ATTR = ["Швидкість","Сила","Витривалість","Техніка","Пас","Удар","Відбір","Гра в повітрі"];
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

/* ---------- калібровані ручки ---------- */
let K=40, STEP_P=.712, CONV=.0728, FOUL_BASE=.50,
    CORNER_P=.30, CORNER_CONV=.095, FK_P=.10, FK_CONV=.19,
    PEN_P=.016, PEN_CONV=.76, INJ_BASE=.0069, HOME_BASE=.045, HOME_STAND=.034,
    YEL_BAND=.225, RED_P=.0012;
const BIAS = -K*Math.log10(1/STEP_P-1);
const duel=(a,b,bias=0,k=K)=>1/(1+Math.pow(10,-((a-b+bias)/k)));
const CEIL=[0,99,88,78,70,62,55,49,44,39,35,31,28,25,22,20];

/* ---------- імена ---------- */
const F1="Дієго Пабло Хав'єр Ніко Аран Ізан Марко Ерік ЮНацо Ману Бруно Айтор Хуліан Рубен Іван Серхіо Адам Лукас Тьяго Ману Рафа Хорхе Альваро Гонсало Кіко Хуан Дані Мігель Артем Матео Ясін Омар Луїс Феліпе Андрій Карлос Хоакін Рікардо Педро Тоні".split(" ");
const L1="Ортега Салазар Бенітес Кабрера Ромеро Наварро Ібаньєс Кампос Естевес Мендес Гальярдо Сеговія Аранда Пірес Домінго Валеро Ескудеро Морено Кастро Рейна Сорія Марсаль Пуйоль Аларкон Гуерра Осуна Вергара Ліма Дуарте Ковач Мельник Рібас Соарес Аюсо Бланко Кінтана Ферран Урбіна Ібарра Салас Тревіньо Ленц Пасторе Кіріко Фалькао".split(" ");
const CLUBS=["Горизонт","Кантера","Атлетіко Марбелья","Реал Пенья","Ла Пальма","Естрелья","Аврора","Сітадель","Костеро","Вердемар","Санта Крус","Ібеля","Норте","Оріон","Кастельо","Понтеведра"];
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
  eff(m){return this.power()*(.7+.3*this.fresh)*m*this.form}
  starPct(){return Math.max(4,Math.min(100,this.pot/99*100))}   // абсолютні зірки: шкала світу, не дивізіону
  stars(){return `<span class="st"><span class="on" style="width:${this.starPct()}%">★★★★★</span>★★★★★</span>`}
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

/* =======================================================================
   СТАН
   ======================================================================= */
const S={season:1,round:1,money:1250000,gold:250,focus:0,day:1,feed:[],
         table:{},results:[],fixtures:[]};
let ME=null, LEAGUE=[];

function buildWorld(){
  rnd=mulberry(SEED);
  LEAGUE = CLUBS.map((n,i)=> new Team(n, i===0?26.5: rf(23,30.5), i===0));
  ME = LEAGUE[0];
  LEAGUE.forEach(t=>{S.table[t.name]={p:0,w:0,d:0,l:0,gf:0,ga:0}});
  S.fixtures = makeFixtures(LEAGUE.map(t=>t.name));
  S.feed=[
    {i:"cap",b:"Президент купив клуб. Ти — новий менеджер.",t:"щойно"},
    {i:"eye",b:"Скаут склав список кандидатів на сезон",t:"2 години тому"},
    {i:"build",b:"Тренувальна база: рівень 1",t:"8 годин тому"},
  ];
}
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
const teamBy = n=>LEAGUE.find(t=>t.name===n);
function myFixture(){
  const rd=S.fixtures[(S.round-1)%S.fixtures.length];
  const f=rd.find(([a,b])=>a===ME.name||b===ME.name);
  return {home:teamBy(f[0]),away:teamBy(f[1]),isHome:f[0]===ME.name};
}
function tablePos(name){return sortedTable().findIndex(r=>r.n===name)+1}
function sortedTable(){
  return Object.entries(S.table).map(([n,v])=>({n,...v,gd:v.gf-v.ga}))
    .sort((a,b)=>b.p-a.p||b.gd-a.gd||b.gf-a.gf||a.n.localeCompare(b.n));
}

/* =======================================================================
   UI
   ======================================================================= */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Math.round(n).toLocaleString("uk-UA").replace(/,/g," ");
const ord=n=>n+" місце";

function show(p){
  $$(".page").forEach(e=>e.classList.toggle("on",e.id==="pg-"+p));
  $$("nav button").forEach(b=>b.classList.toggle("on",b.dataset.p===p));
  window.scrollTo(0,0);
  if(p==="squad")render_squad(); if(p==="league")render_league();
}
$$("nav button").forEach(b=>b.onclick=()=>show(b.dataset.p));

/* ---- стадіон на головній ---- */
function drawStadium(){
  const c=$("#stad"),d=c.getBoundingClientRect();
  c.width=d.width*2;c.height=d.height*2;const x=c.getContext("2d");
  const W=c.width,H=c.height;
  let g=x.createLinearGradient(0,0,0,H*.62);
  g.addColorStop(0,"#16243A");g.addColorStop(.55,"#20344C");g.addColorStop(1,"#2E4256");
  x.fillStyle=g;x.fillRect(0,0,W,H*.62);
  x.fillStyle="rgba(255,255,255,.05)";
  for(let i=0;i<9;i++){const w=W*rf(.1,.22),h=H*rf(.03,.07);
    x.beginPath();x.ellipse(W*rf(0,1),H*rf(.05,.35),w,h,0,0,7);x.fill()}
  // трибуна
  x.fillStyle="#0F151D";x.fillRect(0,H*.56,W,H*.2);
  for(let i=0;i<420;i++){x.fillStyle=`rgba(${ri(120,220)},${ri(140,220)},${ri(160,235)},${rf(.10,.5)})`;
    x.fillRect(rf(0,W),H*.57+rf(0,H*.17),2.4,2.4)}
  // щогли
  for(let i=0;i<4;i++){const px=W*(.14+i*.24);
    x.fillStyle="#0B1016";x.fillRect(px-3,H*.30,6,H*.28);
    x.fillStyle="#141B24";x.fillRect(px-30,H*.26,60,16);
    for(let j=0;j<5;j++){x.fillStyle="#FFF6D8";x.fillRect(px-25+j*11,H*.28,7,9)}
    const gg=x.createRadialGradient(px,H*.30,2,px,H*.30,W*.16);
    gg.addColorStop(0,"rgba(255,240,200,.30)");gg.addColorStop(1,"transparent");
    x.fillStyle=gg;x.beginPath();x.arc(px,H*.30,W*.16,0,7);x.fill()}
  // поле
  g=x.createLinearGradient(0,H*.74,0,H);g.addColorStop(0,"#20422C");g.addColorStop(1,"#15301F");
  x.fillStyle=g;x.fillRect(0,H*.74,W,H*.26);
  for(let i=0;i<7;i++){if(i%2){x.fillStyle="rgba(255,255,255,.025)";x.fillRect(0,H*.74+i*H*.037,W,H*.037)}}
}

/* ---- головна ---- */
function render_club(){
  $("#money").textContent=fmt(S.money);$("#gold").textContent=S.gold;
  $("#daylbl").textContent=`СЕЗОН ${S.season} · ТУР ${S.round}`;
  $("#cmeta").textContent=`Дивізіон 12 · Сезон ${S.season}`;
  const f=myFixture(), opp = f.isHome?f.away:f.home;
  $("#hname").textContent=ME.name; $("#aname").textContent=opp.name;
  $("#hpos").textContent=ord(tablePos(ME.name)); $("#apos").textContent=ord(tablePos(opp.name));
  $("#nextwhen").textContent = f.isHome?"вдома · 19:30":"у гостях · 19:30";
  $("#mcomp").textContent=`Дивізіон 12 · Тур ${S.round}`;
  const icons={cap:'<path d="M4 8l8-4 8 4-8 4-8-4z"/><path d="M7 10v4c0 2 2.5 3 5 3s5-1 5-3v-4"/>',
    eye:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    build:'<path d="M4 20V9l6-4 6 4v11"/><path d="M8 20v-4h4v4M20 20V13l-4-2"/>',
    goal:'<circle cx="12" cy="12" r="8"/><path d="M12 7l3 2-1 3.5h-4L9 9l3-2z"/>',
    up:'<path d="M12 19V5M6 11l6-6 6 6"/>'};
  $("#feed").innerHTML=S.feed.slice(0,5).map(r=>
    `<div class="row"><div class="ic" style="color:var(--gold)"><svg viewBox="0 0 24 24">${icons[r.i]||icons.cap}</svg></div>
     <div><b>${r.b}</b><i>${r.t}</i></div></div>`).join("");
  const FOC=["Швидк.","Сила","Витр.","Техніка","Пас","Удар","Відбір","Повітря"];
  $("#trainTabs").innerHTML=FOC.map((n,i)=>
    `<button class="${i===S.focus?"on":""}" data-f="${i}">${n}</button>`).join("");
  $$("#trainTabs button").forEach(b=>b.onclick=()=>{S.focus=+b.dataset.f;render_club();save()});
  tickClock();
}
function tickClock(){
  const el=$("#cd"); if(!el)return;
  const base = 2*3600+14*60+33 - Math.floor(Date.now()/1000)%60;
  const h=Math.floor(base/3600),m=Math.floor(base%3600/60),s=base%60;
  el.textContent=`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
setInterval(tickClock,1000);

/* ---- команда ---- */
let picked=null;
function prow(p,slot,isSub){
  const fr=Math.round(p.fresh*100);
  return `<div class="p ${picked===slot?"pick":""}" data-slot="${slot}">
    <div class="pos ${isSub?"sub":""}">${isSub?"ЗАП":slot}</div>
    <div class="pn"><b>${p.name}</b><i>${p.age} р · ${ROLE_UA[p.role]||p.role} · ${p.stars()}</i></div>
    <div class="pv"><b>${Math.round(p.power())}</b><div class="frbar"><i style="width:${fr}%"></i></div></div></div>`;
}
function render_squad(){
  $("#sqrate").textContent=`оцінка ${Math.round(ME.rate())} · хімія +${(ME.chem()*100).toFixed(1)} %`;
  $("#xi").innerHTML=["GK",...SLOTS.slice(1)].map(s=>
    prow(s==="GK"?ME.gk:ME.xi[s],s,false)).join("");
  $("#subs").innerHTML=ME.bench.map((p,i)=>prow(p,"B"+i,true)).join("");
  $$("#xi .p,#subs .p").forEach(el=>el.onclick=()=>{
    const s=el.dataset.slot;
    if(picked===null){picked=s;render_squad();return}
    if(picked===s){picked=null;render_squad();return}
    swap(picked,s);picked=null;render_squad();save();
  });
  $$(".p").forEach(el=>el.addEventListener("dblclick",()=>openPlayer(el.dataset.slot)));
}
function getP(s){return s==="GK"?ME.gk : s[0]==="B"?ME.bench[+s.slice(1)] : ME.xi[s]}
function setP(s,p){if(s==="GK")ME.gk=p;else if(s[0]==="B")ME.bench[+s.slice(1)]=p;else ME.xi[s]=p}
function swap(a,b){const pa=getP(a),pb=getP(b);
  if((a==="GK")!==(b==="GK") && (pa.gk||pb.gk) && !(pa.gk&&pb.gk)) return;
  setP(a,pb);setP(b,pa)}
function openPlayer(slot){
  const p=getP(slot);
  $("#sheet").innerHTML=`<h2>${p.name}</h2><div class="sub">${p.age} років · ${ROLE_UA[p.role]} · ${p.stars()}</div>
    <div class="attrs">${ATTR.map((n,i)=>`<div class="at"><span>${n}</span>
      <div class="b"><i style="width:${p.attrs[i]}%"></i></div><u>${Math.round(p.attrs[i])}</u></div>`).join("")}</div>
    <div class="note"><h3>Оцінка ролі</h3><p>Сила в ролі «${ROLE_UA[p.role]}» — <b style="color:var(--gold)">${Math.round(p.power())}</b>.
    Стеля за потенціалом — ${Math.round(p.pot)}, вікова межа сьогодні — ${Math.round(p.pot*AGE_CAP(p.age))}.</p></div>
    <button class="btn ghost" onclick="closeSheet()">Закрити</button>`;
  $("#modal").classList.add("on");
}
function closeSheet(){$("#modal").classList.remove("on")}
$("#modal").onclick=e=>{if(e.target.id==="modal")closeSheet()};

/* ---- ліга ---- */
function render_league(){
  $("#roundlbl").textContent=`Тур ${S.round}`;
  $("#tbl tbody").innerHTML=sortedTable().map((r,i)=>{
    const cls=[r.n===ME.name?"me":"", i<2?"up":i>12?"down":""].filter(Boolean).join(" ");
    return `<tr class="${cls}"><td class="l">${i+1}</td><td class="l">${r.n}</td>
      <td>${r.w+r.d+r.l}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
      <td>${r.gf}:${r.ga}</td><td style="color:var(--gold-hi)">${r.p}</td></tr>`}).join("");
  $("#results").innerHTML = S.results.length? S.results.map(r=>
    `<div class="row"><div class="ic" style="color:${r.me?"var(--gold)":"var(--dim)"}">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7l3 2-1 3.5h-4L9 9l3-2z"/></svg></div>
     <div><b>${r.h} ${r.gh} : ${r.ga} ${r.a}</b><i>тур ${r.r}</i></div></div>`).join("")
    : `<div class="row"><div><b>Тур ще не зіграний</b><i>результати з'являться після матчу</i></div></div>`;
}

/* =======================================================================
   МАТЧ
   ======================================================================= */
const M={live:false,min:0,ep:0,N:70,ph:.5,timer:null,half:1,speed:1,over:false,hm:null,aw:null};

function openMatch(){
  const f=myFixture();
  M.hm=f.home;M.aw=f.away;M.hm.home=true;M.aw.home=false;
  M.hm.reset();M.aw.reset();
  M.live=false;M.min=0;M.ep=0;M.half=1;M.over=false;M.N=ri(64,76);
  const [a]=M.hm.zMid(),[b]=M.aw.zMid();M.ph=a/(a+b);
  $("#mh").textContent=M.hm.name;$("#ma").textContent=M.aw.name;
  $("#mgh").textContent=0;$("#mga").textContent=0;
  $("#mclock").className="clock paused";$("#mclock").textContent="до стартового свистка";
  $("#comm").innerHTML="";
  $("#startBtn").textContent="Стартовий свисток";$("#startBtn").style.display="";
  ME.press=1;ME.line=1;ME.presence=0;ME.actions=0;
  renderCtrl();renderBench();updBonus();drawPitch();renderSpeed();
  show("match");
}
$("#goMatch").onclick=openMatch;

function renderSpeed(){
  $("#spd").innerHTML=[["×1 · 5 хв",1],["×2",2],["×4",4],["×10",10]].map(([n,v])=>
    `<button class="${M.speed===v?"on":""}" data-s="${v}">${n}</button>`).join("");
  $$("#spd button").forEach(b=>b.onclick=()=>{M.speed=+b.dataset.s;renderSpeed()});
}
const PRESS=[["Низ",.85],["Сер",1],["Вис",1.18]];
const LINE =[["Низ",.8],["Сер",1],["Вис",1.2]];
function renderCtrl(){
  $("#pressCtrl").innerHTML=PRESS.map(([n,v])=>
    `<button class="${ME.press===v?"on":""}" data-v="${v}">${n}</button>`).join("");
  $("#lineCtrl").innerHTML=LINE.map(([n,v])=>
    `<button class="${ME.line===v?"on":""}" data-v="${v}">${n}</button>`).join("");
  $$("#pressCtrl button").forEach(b=>b.onclick=()=>{ME.press=+b.dataset.v;act("пресинг");renderCtrl()});
  $$("#lineCtrl button").forEach(b=>b.onclick=()=>{ME.line=+b.dataset.v;act("лінія");renderCtrl()});
}
function act(kind){
  if(!M.live) return;
  if(ME.actions>=4) return;
  ME.actions++; ME.presence=Math.min(.04,ME.actions*.01);
  updBonus(); say(M.min,`Тренерський штаб змінює ${kind}.`,"warn");
}
function updBonus(){
  $("#bcount").textContent=`${ME.actions} ${ME.actions===1?"дія":ME.actions>1&&ME.actions<5?"дії":"дій"}`;
  $("#bval").textContent=`+${(ME.presence*100).toFixed(1).replace(".",",")} %`;
  $("#subcount").textContent=`${ME.subsMade} / 5`;
}
function renderBench(){
  $("#benchRow").innerHTML=ME.bench.map((p,i)=>
    `<button data-i="${i}" ${ME.subsMade>=5?"disabled style=opacity:.4":""}>
      <b>${p.name.split(" ")[1]||p.name}</b><u>${Math.round(p.power())}</u>
      <i>${(ROLE_UA[p.role]||"").split(" ")[0]}</i></button>`).join("");
  $$("#benchRow button").forEach(b=>b.onclick=()=>askSub(+b.dataset.i));
}
function askSub(i){
  if(ME.subsMade>=5) return;
  const inP=ME.bench[i];
  $("#sheet").innerHTML=`<h2>Заміна</h2><div class="sub">виходить ${inP.name} · ${Math.round(inP.power())}</div>
    <div class="plist">${SLOTS.slice(1).map(s=>{const p=ME.xi[s];
      return `<div class="p" data-s="${s}"><div class="pos">${s}</div>
        <div class="pn"><b>${p.name}</b><i>${p.injured?'<span style="color:var(--bad)">травма</span> · ':""}свіжість ${Math.round(p.fresh*100)} %</i></div>
        <div class="pv"><b>${Math.round(p.power())}</b></div></div>`}).join("")}</div>
    <button class="btn ghost" onclick="closeSheet()">Скасувати</button>`;
  $("#modal").classList.add("on");
  $$("#sheet .p").forEach(el=>el.onclick=()=>{
    const s=el.dataset.s, outP=ME.xi[s];
    ME.xi[s]=inP; ME.bench[i]=outP; ME.subsMade++;
    inP.fresh=1; closeSheet(); renderBench(); act("склад");
    say(M.min,`Заміна: ${inP.name} замість ${outP.name}.`,"warn");
    if(!M.live) updBonus();
  });
}

function say(min,txt,cls=""){
  const c=$("#comm");
  c.insertAdjacentHTML("afterbegin",
    `<div class="e ${cls}"><span class="m">${min}'</span><span class="t">${txt}</span></div>`);
  while(c.children.length>40) c.lastChild.remove();
  c.scrollTop=0;
}

/* ---- екран не гасне під час матчу (Wake Lock) ---- */
let wakeLock=null, wakeWarned=false;
function wakeFail(){
  const el=$("#wakewarn"); if(el) el.hidden=false;   // смужка видима весь матч, а не один рядок у стрічці
  if(wakeWarned) return; wakeWarned=true;
  say(M.min,"Телефон не дає заборонити згасання екрана. Постав більший час до згасання в налаштуваннях.","warn");
}
async function keepAwake(on){
  if(!on){ if(wakeLock){ try{ await wakeLock.release() }catch(e){} wakeLock=null } return }
  if(!("wakeLock" in navigator)){ wakeFail(); return }
  try{
    wakeLock=await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release",()=>{wakeLock=null});
    const el=$("#wakewarn"); if(el) el.hidden=true;
  }catch(e){ wakeFail() }
}
/* повертаємось у гру посеред матчу — беремо замок знову */
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible" && M.live && !wakeLock) keepAwake(true);
});

/* ---- поле ---- */
const BALL={x:.5,y:.5};
function drawPitch(){
  const c=$("#pitch"),x=c.getContext("2d"),W=c.width,H=c.height;
  x.fillStyle="#173A27";x.fillRect(0,0,W,H);
  for(let i=0;i<8;i++){if(i%2){x.fillStyle="rgba(255,255,255,.028)";x.fillRect(i*W/8,0,W/8,H)}}
  x.strokeStyle="rgba(255,255,255,.30)";x.lineWidth=2;
  x.strokeRect(14,14,W-28,H-28);
  x.beginPath();x.moveTo(W/2,14);x.lineTo(W/2,H-14);x.stroke();
  x.beginPath();x.arc(W/2,H/2,54,0,7);x.stroke();
  x.strokeRect(14,H/2-98,96,196);x.strokeRect(W-110,H/2-98,96,196);
  x.strokeRect(14,H/2-48,38,96);x.strokeRect(W-52,H/2-48,38,96);
  // 4-3-3 зліва направо: господарі → ворота праворуч
  const HF=[[.07,.5],[.20,.14],[.19,.38],[.19,.62],[.20,.86],[.31,.5],[.36,.28],[.36,.72],[.46,.12],[.47,.5],[.46,.88]];
  const AF=HF.map(([a,b])=>[1-a,1-b]);
  const dot=(px,py,fill,stroke)=>{x.beginPath();x.arc(px*W,py*H,11,0,7);
    x.fillStyle=fill;x.fill();x.lineWidth=2;x.strokeStyle=stroke;x.stroke()};
  const jig=()=>rf(-.012,.012);
  HF.forEach(([a,b])=>dot(a+jig(),b+jig(),"#D9A93C","#7A5C16"));
  AF.forEach(([a,b])=>dot(a+jig(),b+jig(),"#9BB4D0","#3C5570"));
  x.beginPath();x.arc(BALL.x*W,BALL.y*H,6.5,0,7);x.fillStyle="#fff";x.fill();
  x.strokeStyle="rgba(0,0,0,.5)";x.lineWidth=1.5;x.stroke();
}
function moveBall(ev){
  const home = ev.team===M.hm;
  const z = ev.zone||"mid";
  let x = z==="box" ? (home?.88:.12) : z==="mid"? .5 : (home?.66:.34);
  let y = z==="L"?.22 : z==="R"?.78 : rf(.35,.65);
  if(ev.t==="lose") x = home?.38:.62;
  BALL.x=x;BALL.y=y;drawPitch();
}

/* ---- цикл ---- */
$("#startBtn").onclick=()=>{
  if(M.over){ nextRound(); return; }
  if(M.live) return;
  M.live=true;$("#startBtn").style.display="none";
  keepAwake(true);
  say(0,`Стартовий свисток. ${M.hm.name} — ${M.aw.name}.`,"big");
  loop();
};
function loop(){
  const stepMs = 4300/M.speed;
  M.timer=setTimeout(()=>{
    const paused=step();
    if(!M.over && !paused) loop();
  }, stepMs);
}
function step(){
  M.ep++;
  M.min=Math.min(90,Math.round(M.ep*90/M.N));
  if(M.half===1 && M.min>=45){
    M.half=2;M.min=45;M.ep--;clearTimeout(M.timer);
    $("#mclock").className="clock paused";$("#mclock").textContent="перерва";
    say(45,`Перерва. ${M.hm.goals} : ${M.aw.goals}`,"big");
    M.hm.onPitch().forEach(p=>p.fresh=Math.min(1,p.fresh+.07));
    M.aw.onPitch().forEach(p=>p.fresh=Math.min(1,p.fresh+.07));
    setTimeout(()=>{say(46,"Другий тайм почався.");loop()},3200);
    return true;
  }
  if(M.ep%6===0){M.hm.tire(90/M.N*6);M.aw.tire(90/M.N*6)}
  const evs=episode(M.hm,M.aw,M.ph);
  evs.forEach(e=>{
    const cls = e.t==="goal"?"big" : (e.t==="yel"||e.t==="red"||e.t==="inj")?"warn":"";
    if(e.t==="lose"&&R()<.55) return;          // не засмічуємо стрічку
    if(e.t==="block"&&R()<.45) return;
    say(M.min,e.txt,cls);
    if(e.t==="goal"){$("#mgh").textContent=M.hm.goals;$("#mga").textContent=M.aw.goals}
    moveBall(e);
  });
  $("#mclock").className="clock";
  $("#mclock").innerHTML=`<span class="dot"></span>${M.min}' наживо`;
  if(M.ep>=M.N) finish();
}
function finish(){
  M.over=true;M.live=false;clearTimeout(M.timer);
  keepAwake(false);
  $("#mclock").className="clock paused";$("#mclock").textContent="фінальний свисток";
  say(90,`Фінальний свисток. ${M.hm.name} ${M.hm.goals} : ${M.aw.goals} ${M.aw.name}`,"big");
  // мій результат
  regResult(M.hm.name,M.aw.name,M.hm.goals,M.aw.goals,true);
  // решта туру
  const rd=S.fixtures[(S.round-1)%S.fixtures.length];
  rd.forEach(([h,a])=>{
    if(h===ME.name||a===ME.name) return;
    const H=teamBy(h),A=teamBy(a);
    const [gh,ga]=quickMatch(H,A);
    regResult(h,a,gh,ga,false);
  });
  const me = M.hm===ME?M.hm.goals-M.aw.goals : M.aw.goals-M.hm.goals;
  const prize = me>0?  48000 : me===0? 22000 : 9000;
  S.money+=prize;
  S.feed.unshift({i:me>0?"up":"goal",
    b: me>0?`Перемога ${M.hm.goals}:${M.aw.goals} — призові ${fmt(prize)}`
          : me===0?`Нічия ${M.hm.goals}:${M.aw.goals} — призові ${fmt(prize)}`
          :`Поразка ${M.hm.goals}:${M.aw.goals} — призові ${fmt(prize)}`, t:"щойно"});
  $("#startBtn").textContent="Далі — наступний тур";
  $("#startBtn").style.display="";
  setTimeout(showReport,900);
  save();
}
function regResult(h,a,gh,ga,me){
  const H=S.table[h],A=S.table[a];
  H.gf+=gh;H.ga+=ga;A.gf+=ga;A.ga+=gh;
  if(gh>ga){H.w++;A.l++;H.p+=3}else if(gh<ga){A.w++;H.l++;A.p+=3}else{H.d++;A.d++;H.p++;A.p++}
  S.results.unshift({h,a,gh,ga,me,r:S.round});
  S.results=S.results.slice(0,8);
}
function showReport(){
  const mine=ME.onPitch().slice(1).concat([ME.gk]);
  const best=[...mine].sort((a,b)=>b.rating-a.rating).slice(0,4);
  const scored=mine.filter(p=>p.goals>0);
  $("#sheet").innerHTML=`<h2>${M.hm.goals} : ${M.aw.goals}</h2>
    <div class="sub">${M.hm.name} — ${M.aw.name} · тур ${S.round}</div>
    ${scored.length?`<div class="lab">Голи</div><div class="plist">${scored.map(p=>
      `<div class="p"><div class="pos">${p.goals}</div><div class="pn"><b>${p.name}</b>
       <i>${p.assists?p.assists+" гольова · ":""}${p.touches} дотиків</i></div></div>`).join("")}</div>`:""}
    <div class="lab">Найкращі в матчі</div>
    <div class="plist">${best.map(p=>`<div class="p"><div class="pos">${(p.rating).toFixed(1)}</div>
      <div class="pn"><b>${p.name}</b><i>свіжість ${Math.round(p.fresh*100)} %${p.injured?' · <span style="color:var(--bad)">травма</span>':""}</i></div>
      <div class="pv"><b>${Math.round(p.power())}</b></div></div>`).join("")}</div>
    <div class="note"><h3>Бонус присутності</h3><p>Ти зробив ${ME.actions} ${ME.actions===1?"дію":"дій"} під час гри —
      команда грала з надбавкою <b style="color:var(--gold)">+${(ME.presence*100).toFixed(1).replace(".",",")} %</b> до ефективної сили.
      Стеля — 4 %, і вона рахується всередині загальної стелі бонусів 12 %.</p></div>
    <button class="btn" onclick="closeSheet();nextRound()">Наступний тур</button>`;
  $("#modal").classList.add("on");
}
function nextRound(){
  closeSheet();
  // тренування між турами
  [...ME.onPitch(),...ME.bench].forEach(p=>{p.train(S.focus);
    p.fresh=Math.min(1,p.fresh+.55); if(p.injured&&R()<.5)p.injured=false});
  LEAGUE.forEach(t=>{if(t!==ME)[...t.onPitch(),...t.bench].forEach(p=>p.train(ri(0,7)))});
  S.round++;
  if(S.round>30){ S.round=1;S.season++;
    S.feed.unshift({i:"up",b:`Сезон ${S.season-1} завершено. Починається сезон ${S.season}.`,t:"щойно"});
    Object.values(S.table).forEach(v=>{v.p=v.w=v.d=v.l=v.gf=v.ga=0}); }
  S.money-=Math.round(ME.all().reduce((s,p)=>s+7.6*Math.pow(p.power(),2.2)/30,0));
  render_club();render_league();show("club");save();
}

/* ---------- збереження ---------- */
function save(){ try{ localStorage.setItem("vert1",JSON.stringify({
  season:S.season,round:S.round,money:S.money,gold:S.gold,focus:S.focus,
  table:S.table,results:S.results,feed:S.feed.slice(0,6),
  squad:serial(ME), seed:SEED })) }catch(e){} }
function serial(t){return {gk:sp(t.gk),xi:Object.fromEntries(Object.entries(t.xi).map(([k,p])=>[k,sp(p)])),
  bench:t.bench.map(sp)}}
const sp=p=>({n:p.name,r:p.role,g:p.gk,a:p.age,at:p.attrs,po:p.pot,gl:p.glass,pr:p.prof,fo:p.form});
function hydrate(o,t){
  const mk=d=>{const p=new P(d.n,d.r,25,d.g,d.a);p.attrs=d.at;p.pot=d.po;p.glass=d.gl;
    p.prof=d.pr;p.form=d.fo;p.reset();return p};
  t.gk=mk(o.gk);Object.entries(o.xi).forEach(([k,d])=>t.xi[k]=mk(d));t.bench=o.bench.map(mk);
}
function load(){
  try{ const raw=localStorage.getItem("vert1"); if(!raw) return false;
    const o=JSON.parse(raw); if(!o.squad) return false;
    Object.assign(S,{season:o.season,round:o.round,money:o.money,gold:o.gold,
      focus:o.focus,table:o.table,results:o.results||[],feed:o.feed||S.feed});
    hydrate(o.squad,ME); return true;
  }catch(e){ return false }
}

/* ---------- старт ---------- */
buildWorld();
load();
drawStadium();
render_club();
window.addEventListener("resize",()=>{drawStadium()});
window.closeSheet=closeSheet; window.nextRound=nextRound;
