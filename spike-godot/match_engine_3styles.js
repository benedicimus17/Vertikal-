// =============================================================================
// «ВЕРТИКАЛЬ: FOOTBALL MANAGER» — 3 ВАРІАНТИ ВІЗУАЛІЗАЦІЇ МАТЧУ
// Використовує 100% реальні дані з match_sample.json (Аврора 4:1 Кантера, 71 подія)
// =============================================================================

(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const W = 1280;
  const H = 720;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Визначення стартового варіанту з URL (?v=1, ?v=2, ?v=3)
  const urlParams = new URLSearchParams(window.location.search);
  let currentVariant = parseInt(urlParams.get("v") || "1", 10);
  if (![1, 2, 3].includes(currentVariant)) currentVariant = 1;

  // Координати базового поля
  const PITCH = {
    L: 120,
    R: 1160,
    T: 138,
    B: 642,
    get W() { return this.R - this.L; },
    get H() { return this.B - this.T; },
    get CX() { return (this.L + this.R) * 0.5; },
    get CY() { return (this.T + this.B) * 0.5; }
  };

  // Стан матчу
  const events = MATCH_DATA.events || [];
  let eventIdx = 0;
  let matchMinute = 0.0;
  let scoreHome = 0;
  let scoreAway = 0;
  let speedMult = 1.0;
  let timeScale = 1.0;
  let isPaused = false;
  let matchEnded = false;

  // Жива телеметрія для Варіанту 2 (Тактична дошка)
  const stats = {
    shotsHome: 0, shotsAway: 0,
    savesHome: 0, savesAway: 0,
    cornersHome: 0, cornersAway: 0,
    blocksHome: 0, blocksAway: 0,
    possHome: 54, possAway: 46
  };

  // Гравці
  const playersHome = [];
  const playersAway = [];
  const allPlayersMap = {};

  function shortSurname(fullName) {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1];
  }

  function initPlayers() {
    playersHome.length = 0;
    playersAway.length = 0;
    const hp = (MATCH_DATA.home && MATCH_DATA.home.players) || [];
    hp.forEach((p, idx) => {
      const fx = 0.04 + (p.x / 100) * 0.45;
      const fy = p.y / 100;
      const obj = {
        name: p.name,
        surname: shortSurname(p.name),
        number: p.number || (idx + 1),
        pos: p.pos,
        slot: p.slot,
        isHome: true,
        isGK: p.slot === "GK",
        baseFx: fx,
        baseFy: fy,
        fx: fx,
        fy: fy,
        targetFx: fx,
        targetFy: fy,
        vx: 0,
        vy: 0,
        facing: 0,
        runPhase: Math.random() * Math.PI * 2,
        jumpZ: 0,
        diveOffset: 0,
        card: "",
        emoji: "",
        emojiTimer: 0
      };
      playersHome.append ? playersHome.append(obj) : playersHome.push(obj);
      allPlayersMap[obj.name] = obj;
    });

    const ap = (MATCH_DATA.away && MATCH_DATA.away.players) || [];
    ap.forEach((p, idx) => {
      const fx = 1.0 - (0.04 + (p.x / 100) * 0.45);
      const fy = p.y / 100;
      const obj = {
        name: p.name,
        surname: shortSurname(p.name),
        number: p.number || (idx + 1),
        pos: p.pos,
        slot: p.slot,
        isHome: false,
        isGK: p.slot === "GK",
        baseFx: fx,
        baseFy: fy,
        fx: fx,
        fy: fy,
        targetFx: fx,
        targetFy: fy,
        vx: 0,
        vy: 0,
        facing: Math.PI,
        runPhase: Math.random() * Math.PI * 2,
        jumpZ: 0,
        diveOffset: 0,
        card: "",
        emoji: "",
        emojiTimer: 0
      };
      playersAway.push(obj);
      allPlayersMap[obj.name] = obj;
    });
  }

  // М'яч у нормалізованих координатах поля (fx: 0..1, fy: 0..1)
  const ball = {
    fx: 0.5, fy: 0.5, z: 0,
    startFx: 0.5, startFy: 0.5,
    targetFx: 0.5, targetFy: 0.5,
    peakZ: 0,
    flightTime: 0, flightDur: 0.4,
    spin: 0,
    owner: null,
    isShot: false,
    trail: []
  };

  // Ефекти стадіону та камери
  let leftNetShake = 0;
  let rightNetShake = 0;
  let netPhase = 0;
  let crowdExcitement = 0.15;
  let shakeIntensity = 0;
  let camFocusX = W * 0.5;
  let camFocusY = H * 0.5;
  let camZoom = 1.0;
  let targetCamZoom = 1.0;

  // Повтор (Slow-Mo Replay)
  let isReplaying = false;
  let replayTimer = 0;

  // Частинки: конфеті, іскри сейву, трава, спалахи камер на трибунах
  const confetti = [];
  const sparks = [];
  const cameraFlashes = [];
  const fans = [];

  function initFans() {
    fans.length = 0;
    for (let r = 0; r < 4; r++) {
      for (let x = 45; x < W - 45; x += 15) {
        const isBlue = (x + r * 7) % 3 === 0;
        const isRed = (x + r * 11) % 5 === 0;
        fans.push({
          x: x + (r % 2) * 6,
          y: 58 + r * 16,
          row: r,
          phase: Math.random() * Math.PI * 2,
          color: isBlue ? "#3b82f6" : (isRed ? "#ef4444" : (r % 2 === 0 ? "#cbd5e1" : "#fbbf24"))
        });
      }
    }
  }

  // Коментар та банери
  let commentary = "Матч розпочався! Аврора (4-3-3) приймає Кантеру (4-5-1).";
  let badgeTitle = "";
  let badgeSub = "";
  let badgeColor = "#fbbf24";
  let badgeTimer = 0;
  let ambientPassTimer = 0.6;
  let possessingTeam = "home";

  // Проекція координат поля (fx 0..1, fy 0..1) -> екранні координати залежно від варіанту
  function projectField(fx, fy) {
    if (currentVariant === 1) {
      // Варіант 1: Глибока телевізійна перспектива (трапеція)
      const py = PITCH.T + fy * PITCH.H;
      const yf = (py - PITCH.T) / PITCH.H;
      const wScale = 0.86 + yf * 0.22; // Звуження вгорі, розширення внизу
      const px = PITCH.CX + (fx - 0.5) * PITCH.W * wScale;
      return { x: px, y: py, scale: 0.84 + yf * 0.28 };
    } else if (currentVariant === 2) {
      // Варіант 2: Чистий тактичний планшет 2D+
      const padX = 135, padT = 138, padB = 640;
      const pw = W - padX * 2;
      const ph = padB - padT;
      return {
        x: padX + fx * pw,
        y: padT + fy * ph,
        scale: 1.0
      };
    } else {
      // Варіант 3: Нічна 3D-арена з нахилом
      const py = PITCH.T + fy * PITCH.H;
      const yf = (py - PITCH.T) / PITCH.H;
      const wScale = 0.90 + yf * 0.16;
      const px = PITCH.CX + (fx - 0.5) * PITCH.W * wScale;
      return { x: px, y: py, scale: 0.88 + yf * 0.22 };
    }
  }

  function kickBallTo(tx, ty, peakZ, dur, isShot = false) {
    ball.startFx = ball.fx;
    ball.startFy = ball.fy;
    ball.targetFx = Math.max(-0.03, Math.min(1.03, tx));
    ball.targetFy = Math.max(0.03, Math.min(0.97, ty));
    ball.peakZ = peakZ;
    ball.flightDur = Math.max(0.18, dur);
    ball.flightTime = 0;
    ball.isShot = isShot;
  }

  function triggerBadge(title, sub, color, dur = 2.0) {
    badgeTitle = title;
    badgeSub = sub || "";
    badgeColor = color;
    badgeTimer = dur;
  }

  function spawnConfetti(fx, fy) {
    const pt = projectField(fx, fy);
    const colors = ["#fbbf24", "#38bdf8", "#ffffff", "#4ade80", "#f43f5e", "#a855f7"];
    for (let i = 0; i < 130; i++) {
      const ang = (fx > 0.5 ? Math.PI : 0) + (Math.random() - 0.5) * 2.2;
      const spd = 160 + Math.random() * 440;
      confetti.push({
        x: pt.x,
        y: pt.y - 20,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 140 - Math.random() * 180,
        size: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 6.28,
        rotSpd: (Math.random() - 0.5) * 12,
        life: 1.8 + Math.random() * 1.4
      });
    }
  }

  function spawnSparks(fx, fy, color, count = 24) {
    const pt = projectField(fx, fy);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 50 + Math.random() * 180;
      sparks.push({
        x: pt.x,
        y: pt.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 2 + Math.random() * 3.5,
        color: color,
        life: 0.35 + Math.random() * 0.35
      });
    }
  }

  function triggerCameraFlashes(count = 35) {
    for (let i = 0; i < count; i++) {
      cameraFlashes.push({
        x: 50 + Math.random() * (W - 100),
        y: 52 + Math.random() * 65,
        r: 8 + Math.random() * 18,
        life: 0.15 + Math.random() * 0.25
      });
    }
  }

  function findPlayer(team, name, fallbackRole) {
    if (name && allPlayersMap[name]) return allPlayersMap[name];
    const pool = team === "home" ? playersHome : playersAway;
    if (fallbackRole === "ST") return pool[pool.length - 1];
    if (fallbackRole === "CB") return pool[2] || pool[1];
    const fieldPlayers = pool.filter(p => !p.isGK);
    return fieldPlayers[Math.floor(Math.random() * fieldPlayers.length)] || pool[0];
  }

  // Виконання події з match_sample.json
  function executeMatchEvent(ev) {
    const type = ev.type;
    const team = ev.team || "home";
    const isHome = team === "home";
    possessingTeam = team;
    commentary = `[${ev.minute}'] ${ev.text}`;
    ambientPassTimer = 1.1;

    const actor = findPlayer(team, ev.player, "ST");
    const oppGK = isHome ? playersAway[0] : playersHome[0];

    if (type === "goal") {
      if (isHome) { scoreHome++; stats.shotsHome++; }
      else { scoreAway++; stats.shotsAway++; }

      const goalFx = isHome ? 1.015 : -0.015;
      const goalFy = 0.5 + (Math.random() - 0.5) * 0.10;

      actor.fx = isHome ? 0.84 : 0.16;
      actor.fy = 0.5 + (Math.random() - 0.5) * 0.22;
      actor.emoji = "⚽";
      actor.emojiTimer = 2.5;

      if (ev.text.indexOf("КУТОВИЙ") !== -1) {
        ball.fx = isHome ? 0.98 : 0.02;
        ball.fy = 0.06;
        actor.jumpZ = 22;
        kickBallTo(goalFx, goalFy, 48, 0.45, true);
      } else {
        ball.fx = actor.fx;
        ball.fy = actor.fy;
        kickBallTo(goalFx, goalFy, 32, 0.38, true);
      }

      oppGK.diveOffset = goalFy > 0.5 ? -22 : 22;
      crowdExcitement = 1.0;
      shakeIntensity = 1.0;
      targetCamZoom = currentVariant === 3 ? 1.42 : 1.18;
      triggerCameraFlashes(55);

      setTimeout(() => {
        if (isHome) rightNetShake = 1.0;
        else leftNetShake = 1.0;
        spawnConfetti(isHome ? 0.98 : 0.02, 0.5);
        spawnSparks(isHome ? 0.99 : 0.01, goalFy, "#fbbf24", 35);
      }, 280);

      triggerBadge(
        isHome ? "⚽ ГОООЛ! АВРОРА!" : "⚽ ГОЛ! КАНТЕРА!",
        `${actor.name} (${ev.minute}') — Рахунок ${scoreHome}:${scoreAway}`,
        isHome ? "#fbbf24" : "#f43f5e",
        2.6
      );

      // Slow-Mo Повтор
      isReplaying = true;
      replayTimer = 2.4;
      timeScale = 0.38;

    } else if (type === "shot") {
      if (isHome) { stats.shotsHome++; stats.savesAway++; }
      else { stats.shotsAway++; stats.savesHome++; }

      actor.fx = isHome ? 0.79 : 0.21;
      actor.fy = 0.5 + (Math.random() - 0.5) * 0.28;
      actor.emoji = "💥";
      actor.emojiTimer = 1.2;
      ball.fx = actor.fx;
      ball.fy = actor.fy;

      const gkFx = isHome ? 0.95 : 0.05;
      const gkFy = 0.5 + (Math.random() - 0.5) * 0.12;
      kickBallTo(gkFx, gkFy, 26, 0.38, true);

      oppGK.diveOffset = (gkFy - 0.5) * 160;
      oppGK.emoji = "🧤";
      oppGK.emojiTimer = 1.5;
      shakeIntensity = 0.4;
      targetCamZoom = currentVariant === 3 ? 1.34 : 1.12;
      triggerCameraFlashes(25);

      setTimeout(() => {
        spawnSparks(gkFx, gkFy, "#38bdf8", 22);
        kickBallTo(isHome ? 0.76 : 0.24, 0.5 + (Math.random() - 0.5) * 0.35, 16, 0.45, false);
      }, 340);

      triggerBadge("🧤 СЕЙВ ВОРОТАРЯ!", `${oppGK.surname} рятує після удару ${actor.surname}`, "#38bdf8", 1.5);

    } else if (type === "block") {
      if (isHome) stats.blocksHome++; else stats.blocksAway++;
      const def = findPlayer(team, null, "CB");
      def.fx = isHome ? 0.24 : 0.76;
      def.fy = 0.5 + (Math.random() - 0.5) * 0.22;
      def.emoji = "🛡️";
      def.emojiTimer = 1.2;
      spawnSparks(def.fx, def.fy, "#e2e8f0", 18);
      kickBallTo(0.5 + (Math.random() - 0.5) * 0.2, 0.5 + (Math.random() - 0.5) * 0.4, 18, 0.45, false);
      triggerBadge("🛡️ БЛОК ОБОРОНИ", ev.text, "#94a3b8", 1.3);

    } else if (type === "corner") {
      if (isHome) stats.cornersHome++; else stats.cornersAway++;
      const cFx = isHome ? 0.98 : 0.02;
      const cFy = Math.random() > 0.5 ? 0.04 : 0.96;
      ball.fx = cFx;
      ball.fy = cFy;
      targetCamZoom = currentVariant === 3 ? 1.32 : 1.10;
      triggerBadge("🚩 КУТОВИЙ УДАР", ev.text, "#4ade80", 1.6);
      setTimeout(() => {
        kickBallTo(isHome ? 0.86 : 0.14, 0.5 + (Math.random() - 0.5) * 0.16, 46, 0.65, false);
      }, 280);

    } else if (type === "yel" || type === "red") {
      actor.card = type;
      actor.emoji = type === "red" ? "🟥" : "🟨";
      actor.emojiTimer = 2.5;
      triggerBadge(
        type === "red" ? "🟥 ЧЕРВОНА КАРТКА" : "🟨 ЖОВТА КАРТКА",
        actor.name,
        type === "red" ? "#ef4444" : "#facc15",
        1.8
      );

    } else if (type === "stop") {
      const z = ev.zone;
      const ty = z === "L" ? 0.16 : (z === "R" ? 0.84 : 0.5);
      const tx = isHome ? 0.66 : 0.34;
      actor.fx = tx;
      actor.fy = ty;
      spawnSparks(tx, ty, "#4ade80", 12);
      kickBallTo(tx + (isHome ? -0.10 : 0.10), ty + (Math.random() - 0.5) * 0.15, 10, 0.45, false);

    } else {
      const tx = 0.5 + (Math.random() - 0.5) * 0.22;
      const ty = 0.5 + (Math.random() - 0.5) * 0.38;
      kickBallTo(tx, ty, 12, 0.45, false);
    }
  }

  // Живий рух пасів між подіями, щоб гра виглядала безперервною
  function updateAmbientChoreography(dt) {
    ambientPassTimer -= dt;
    if (ambientPassTimer <= 0 && !isReplaying && !matchEnded) {
      ambientPassTimer = 0.55 + Math.random() * 0.45;
      const pool = possessingTeam === "home" ? playersHome : playersAway;
      const fieldPool = pool.filter(p => !p.isGK);
      const receiver = fieldPool[Math.floor(Math.random() * fieldPool.length)];
      if (receiver) {
        const shiftX = possessingTeam === "home" ? 0.08 : -0.08;
        const tx = Math.max(0.12, Math.min(0.88, receiver.fx + shiftX * Math.random()));
        const ty = Math.max(0.10, Math.min(0.90, receiver.fy + (Math.random() - 0.5) * 0.08));
        kickBallTo(tx, ty, Math.random() > 0.7 ? 22 : 4, 0.42, false);
        ball.owner = receiver;
      }
    }
  }

  function resetMatch() {
    matchMinute = 0;
    eventIdx = 0;
    scoreHome = 0;
    scoreAway = 0;
    matchEnded = false;
    isReplaying = false;
    timeScale = 1.0;
    stats.shotsHome = 0; stats.shotsAway = 0;
    stats.savesHome = 0; stats.savesAway = 0;
    stats.cornersHome = 0; stats.cornersAway = 0;
    initPlayers();
    ball.fx = 0.5; ball.fy = 0.5; ball.z = 0;
    ball.targetFx = 0.5; ball.targetFy = 0.5;
    commentary = "Матч розпочався! Аврора (4-3-3) проти Кантери (4-5-1).";
    triggerBadge("СТАРТОВИЙ СВИСТОК", "Аврора vs Кантера", "#38bdf8", 1.6);
  }

  function jumpToNextGoal() {
    for (let i = eventIdx; i < events.length; i++) {
      if (events[i].type === "goal") {
        while (eventIdx < i) {
          const e = events[eventIdx];
          if (e.type === "shot") {
            if (e.team === "home") { stats.shotsHome++; stats.savesAway++; }
            else { stats.shotsAway++; stats.savesHome++; }
          } else if (e.type === "corner") {
            if (e.team === "home") stats.cornersHome++; else stats.cornersAway++;
          } else if (e.type === "yel" || e.type === "red") {
            const p = findPlayer(e.team, e.player, "ST");
            if (p) p.card = e.type;
          }
          eventIdx++;
        }
        matchMinute = events[i].minute;
        executeMatchEvent(events[i]);
        eventIdx++;
        return;
      }
    }
    resetMatch();
    jumpToNextGoal();
  }

  function skipToEnd() {
    while (eventIdx < events.length) {
      const e = events[eventIdx];
      if (e.type === "goal") {
        if (e.team === "home") scoreHome++; else scoreAway++;
      }
      eventIdx++;
    }
    matchMinute = 90.0;
    matchEnded = true;
    isReplaying = false;
    timeScale = 1.0;
    commentary = `ФІНАЛЬНИЙ СВИСТОК! Перемога Аврори ${scoreHome}:${scoreAway}!`;
    triggerBadge("ФІНАЛЬНИЙ СВИСТОК", `Аврора ${scoreHome} : ${scoreAway} Кантера`, "#fbbf24", 4.0);
    spawnConfetti(0.5, 0.5);
  }

  function update(dt) {
    if (isPaused) return;

    const effDt = dt * timeScale * speedMult;

    if (!matchEnded) {
      matchMinute += effDt * (90.0 / 100.0);
      if (matchMinute >= 90.0) {
        matchMinute = 90.0;
        matchEnded = true;
        commentary = `ФІНАЛЬНИЙ СВИСТОК! Аврора перемагає Кантеру ${scoreHome}:${scoreAway}!`;
        triggerBadge("МАТЧ ЗАВЕРШЕНО", `Підсумковий рахунок ${scoreHome}:${scoreAway}`, "#fbbf24", 4.0);
        spawnConfetti(0.5, 0.5);
      }

      while (eventIdx < events.length && matchMinute >= events[eventIdx].minute) {
        executeMatchEvent(events[eventIdx]);
        eventIdx++;
      }
    }

    updateAmbientChoreography(effDt);

    const prevPt = projectField(ball.fx, ball.fy);
    ball.trail.unshift({ x: prevPt.x, y: prevPt.y - ball.z, isShot: ball.isShot });
    if (ball.trail.length > 10) ball.trail.pop();

    if (ball.flightTime < ball.flightDur) {
      ball.flightTime += effDt;
      const t = Math.min(1.0, ball.flightTime / ball.flightDur);
      const ease = 1 - Math.pow(1 - t, 2);
      ball.fx = ball.startFx + (ball.targetFx - ball.startFx) * ease;
      ball.fy = ball.startFy + (ball.targetFy - ball.startFy) * ease;
      ball.z = Math.sin(t * Math.PI) * ball.peakZ;
      ball.spin += effDt * 18;
    } else {
      ball.z = Math.max(0, ball.z - effDt * 90);
    }

    const allP = playersHome.concat(playersAway);
    const ballShiftX = (ball.fx - 0.5) * 0.22;
    const ballShiftY = (ball.fy - 0.5) * 0.16;

    for (let i = 0; i < allP.length; i++) {
      const p = allP[i];
      let tx = p.baseFx;
      let ty = p.baseFy;

      if (!p.isGK) {
        tx = Math.max(0.08, Math.min(0.92, p.baseFx + ballShiftX));
        ty = Math.max(0.08, Math.min(0.92, p.baseFy + ballShiftY));

        const dxB = ball.fx - p.fx;
        const dyB = ball.fy - p.fy;
        const distB = Math.hypot(dxB, dyB);
        if (distB < 0.16) {
          tx = tx * 0.55 + ball.fx * 0.45;
          ty = ty * 0.55 + ball.fy * 0.45;
        }
      } else {
        ty = 0.5 + (ball.fy - 0.5) * 0.16;
      }

      const moveDx = tx - p.fx;
      const moveDy = ty - p.fy;
      const spd = Math.hypot(moveDx, moveDy);
      if (spd > 0.002) {
        p.facing = Math.atan2(moveDy, moveDx);
        p.runPhase += effDt * (8 + spd * 45);
      }

      p.fx += moveDx * Math.min(1, effDt * 4.2);
      p.fy += moveDy * Math.min(1, effDt * 4.2);
      p.jumpZ = Math.max(0, p.jumpZ - effDt * 45);
      p.diveOffset *= Math.pow(0.08, effDt);
      if (p.emojiTimer > 0) p.emojiTimer -= effDt;
    }

    netPhase += effDt * 24;
    leftNetShake *= Math.pow(0.04, effDt);
    rightNetShake *= Math.pow(0.04, effDt);
    crowdExcitement = Math.max(0.15, crowdExcitement - effDt * 0.35);

    if (shakeIntensity > 0) {
      shakeIntensity = Math.max(0, shakeIntensity - effDt * 2.4);
    }

    const bScreen = projectField(ball.fx, ball.fy);
    if (currentVariant === 3) {
      const targetX = W * 0.5 + (bScreen.x - W * 0.5) * 0.35;
      const targetY = H * 0.5 + (bScreen.y - H * 0.5) * 0.28;
      camFocusX += (targetX - camFocusX) * Math.min(1, effDt * 3.5);
      camFocusY += (targetY - camFocusY) * Math.min(1, effDt * 3.5);
      if (shakeIntensity < 0.05 && !isReplaying) {
        const edgeDist = Math.abs(ball.fx - 0.5) * 2;
        targetCamZoom = 1.08 + edgeDist * 0.22;
      }
    } else {
      camFocusX += (W * 0.5 - camFocusX) * Math.min(1, effDt * 4.0);
      camFocusY += (H * 0.5 - camFocusY) * Math.min(1, effDt * 4.0);
      if (shakeIntensity < 0.05 && !isReplaying) targetCamZoom = 1.0;
    }
    camZoom += (targetCamZoom - camZoom) * Math.min(1, effDt * 3.2);

    if (isReplaying) {
      replayTimer -= dt;
      if (replayTimer <= 0) {
        isReplaying = false;
        timeScale = 1.0;
      }
    }

    if (badgeTimer > 0) badgeTimer -= dt;

    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 220 * dt;
      c.rot += c.rotSpd * dt;
      c.life -= dt;
      if (c.life <= 0) confetti.splice(i, 1);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) sparks.splice(i, 1);
    }
    for (let i = cameraFlashes.length - 1; i >= 0; i--) {
      cameraFlashes[i].life -= dt;
      if (cameraFlashes[i].life <= 0) cameraFlashes.splice(i, 1);
    }
  }

  // ===========================================================================
  // РЕНДЕРИНГ СЦЕНИ ЗАЛЕЖНО ВІД ОБРАНОГО ВАРІАНТУ (1, 2, 3)
  // ===========================================================================

  function drawWorld() {
    ctx.save();

    const sx = (Math.random() - 0.5) * shakeIntensity * 14;
    const sy = (Math.random() - 0.5) * shakeIntensity * 14;
    ctx.translate(W * 0.5 + sx, H * 0.5 + sy);
    ctx.scale(camZoom, camZoom);
    ctx.translate(-camFocusX, -camFocusY);

    if (currentVariant === 1) {
      drawVariant1_TVBroadcast();
    } else if (currentVariant === 2) {
      drawVariant2_TacticalBoard();
    } else {
      drawVariant3_NightArena();
    }

    drawParticles();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // ВАРІАНТ 1: 🏟️ TV BROADCAST 3D (Фігурки гравців, трапеція поля, двоярусні трибуни)
  // ---------------------------------------------------------------------------
  function drawVariant1_TVBroadcast() {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#090d16");
    bgGrad.addColorStop(0.25, "#111827");
    bgGrad.addColorStop(1, "#0b131e");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#161f33";
    ctx.fillRect(30, 48, W - 60, 74);
    ctx.strokeStyle = "#2dd4bf33";
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 48, W - 60, 74);

    ctx.fillStyle = "#334155";
    for (let sx = 180; sx < W - 150; sx += 180) {
      ctx.fillRect(sx, 50, 14, 70);
    }

    const now = performance.now() * 0.006;
    for (let i = 0; i < fans.length; i++) {
      const f = fans[i];
      const jump = Math.abs(Math.sin(now + f.phase)) * (2.5 + crowdExcitement * 11);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y - jump, 3.8, 0, Math.PI * 2);
      ctx.fill();
    }

    const ledGrad = ctx.createLinearGradient(140, 120, 1140, 120);
    ledGrad.addColorStop(0, "#0f172a");
    ledGrad.addColorStop(0.5, "#1e293b");
    ledGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = ledGrad;
    ctx.fillRect(145, 118, W - 290, 16);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(145, 118, W - 290, 16);

    ctx.save();
    ctx.beginPath();
    ctx.rect(148, 118, W - 296, 16);
    ctx.clip();
    const scrollX = (performance.now() * 0.06) % 520;
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 10px sans-serif";
    for (let k = -1; k < 3; k++) {
      ctx.fillText(
        "⚡ ВЕРТИКАЛЬ FOOTBALL MANAGER  •  МАТЧ ТУРУ: АВРОРА vs КАНТЕРА  •  ЖИВА ТРАНСЛЯЦІЯ ⚡",
        160 + k * 520 - scrollX,
        130
      );
    }
    ctx.restore();

    const stripes = 14;
    for (let i = 0; i < stripes; i++) {
      const fx1 = i / stripes;
      const fx2 = (i + 1) / stripes;
      const pTL = projectField(fx1, 0);
      const pTR = projectField(fx2, 0);
      const pBR = projectField(fx2, 1);
      const pBL = projectField(fx1, 1);

      ctx.fillStyle = i % 2 === 0 ? "#186a3b" : "#1d7a44";
      ctx.beginPath();
      ctx.moveTo(pTL.x, pTL.y);
      ctx.lineTo(pTR.x, pTR.y);
      ctx.lineTo(pBR.x, pBR.y);
      ctx.lineTo(pBL.x, pBL.y);
      ctx.closePath();
      ctx.fill();
    }

    drawPerspectivePitchLines("rgba(255,255,255,0.82)", 2.2);

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(360, 648, 160, 14);
    ctx.fillRect(760, 648, 160, 14);
    ctx.strokeStyle = "#64748b";
    ctx.strokeRect(360, 648, 160, 14);
    ctx.strokeRect(760, 648, 160, 14);

    draw3DGoals();

    const sorted = playersHome.concat(playersAway).slice().sort((a, b) => a.fy - b.fy);
    for (let i = 0; i < sorted.length; i++) {
      drawHumanoidPlayer(sorted[i]);
    }

    drawBall3D(false);
  }

  // ---------------------------------------------------------------------------
  // ВАРІАНТ 2: 📋 TACTICAL COMMAND BOARD (Тренерський планшет + вектори + лінії схем)
  // ---------------------------------------------------------------------------
  function drawVariant2_TacticalBoard() {
    ctx.fillStyle = "#080f1a";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.strokeRect(95, 105, W - 190, 565);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(105, 112, W - 210, 550);

    const tl = projectField(0, 0);
    const br = projectField(1, 1);
    const pw = br.x - tl.x;
    const ph = br.y - tl.y;

    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#0f4c3a" : "#125844";
      ctx.fillRect(tl.x + (i * pw) / 12, tl.y, pw / 12 + 1, ph);
    }

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tl.x + pw * 0.33, tl.y);
    ctx.lineTo(tl.x + pw * 0.33, br.y);
    ctx.moveTo(tl.x + pw * 0.67, tl.y);
    ctx.lineTo(tl.x + pw * 0.67, br.y);
    ctx.moveTo(tl.x, tl.y + ph * 0.33);
    ctx.lineTo(br.x, tl.y + ph * 0.33);
    ctx.moveTo(tl.x, tl.y + ph * 0.67);
    ctx.lineTo(br.x, tl.y + ph * 0.67);
    ctx.stroke();
    ctx.restore();

    drawPerspectivePitchLines("rgba(255,255,255,0.85)", 2.0);
    draw3DGoals();

    drawFormationLinks(playersHome, "rgba(56, 189, 248, 0.28)", [1, 2, 3, 4], [5, 6, 7], [8, 9, 10]);
    drawFormationLinks(playersAway, "rgba(244, 63, 94, 0.24)", [1, 2, 3, 4], [5, 6, 7, 8, 9], [10]);

    if (ball.flightTime < ball.flightDur) {
      const pStart = projectField(ball.startFx, ball.startFy);
      const pEnd = projectField(ball.targetFx, ball.targetFy);
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = ball.isShot ? "#fbbf24" : "#38bdf8";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(pEnd.x, pEnd.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const allP = playersHome.concat(playersAway);
    for (let i = 0; i < allP.length; i++) {
      drawTacticalTokenPlayer(allP[i]);
    }

    drawBall3D(false);
  }

  // ---------------------------------------------------------------------------
  // ВАРІАНТ 3: 🔥 DYNAMIC NIGHT ARENA (Рухома камера, круговий газон, 4 тіні, спалахи)
  // ---------------------------------------------------------------------------
  function drawVariant3_NightArena() {
    ctx.fillStyle = "#050811";
    ctx.fillRect(-200, -200, W + 400, H + 400);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(20, 42, W - 40, 88);

    const now = performance.now() * 0.008;
    for (let i = 0; i < fans.length; i++) {
      const f = fans[i];
      const jump = Math.abs(Math.sin(now + f.phase)) * (3.5 + crowdExcitement * 13);
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y - jump, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < cameraFlashes.length; i++) {
      const fl = cameraFlashes[i];
      const grad = ctx.createRadialGradient(fl.x, fl.y, 1, fl.x, fl.y, fl.r);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(0.5, "rgba(186,230,253,0.4)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, fl.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const pTL = projectField(0, 0);
    const pTR = projectField(1, 0);
    const pBR = projectField(1, 1);
    const pBL = projectField(0, 1);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pTL.x, pTL.y);
    ctx.lineTo(pTR.x, pTR.y);
    ctx.lineTo(pBR.x, pBR.y);
    ctx.lineTo(pBL.x, pBL.y);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = "#115e38";
    ctx.fillRect(0, 0, W, H);

    for (let r = 620; r > 40; r -= 52) {
      ctx.fillStyle = (Math.round(r / 52) % 2 === 0) ? "#13683e" : "#0e5230";
      ctx.beginPath();
      ctx.ellipse(PITCH.CX, PITCH.CY, r, r * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    drawPerspectivePitchLines("rgba(255,255,255,0.9)", 2.5);
    draw3DGoals();

    const sorted = playersHome.concat(playersAway).slice().sort((a, b) => a.fy - b.fy);
    for (let i = 0; i < sorted.length; i++) {
      drawNightArenaPlayer(sorted[i]);
    }

    drawBall3D(true);
    drawFloodlightBeams();
  }

  function drawPerspectivePitchLines(strokeColor, lineWidth) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;

    const pTL = projectField(0, 0);
    const pTR = projectField(1, 0);
    const pBR = projectField(1, 1);
    const pBL = projectField(0, 1);

    ctx.beginPath();
    ctx.moveTo(pTL.x, pTL.y);
    ctx.lineTo(pTR.x, pTR.y);
    ctx.lineTo(pBR.x, pBR.y);
    ctx.lineTo(pBL.x, pBL.y);
    ctx.closePath();
    ctx.stroke();

    const pCT = projectField(0.5, 0);
    const pCB = projectField(0.5, 1);
    ctx.beginPath();
    ctx.moveTo(pCT.x, pCT.y);
    ctx.lineTo(pCB.x, pCB.y);
    ctx.stroke();

    const pMid = projectField(0.5, 0.5);
    ctx.beginPath();
    ctx.ellipse(pMid.x, pMid.y, 72, currentVariant === 2 ? 72 : 54, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(pMid.x, pMid.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    drawBoxSide(true);
    drawBoxSide(false);
  }

  function drawBoxSide(isLeft) {
    const xEdge = isLeft ? 0 : 1;
    const xBox = isLeft ? 0.16 : 0.84;
    const xSmall = isLeft ? 0.055 : 0.945;
    const xPen = isLeft ? 0.11 : 0.89;

    const b1 = projectField(xEdge, 0.21);
    const b2 = projectField(xBox, 0.21);
    const b3 = projectField(xBox, 0.79);
    const b4 = projectField(xEdge, 0.79);
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(b3.x, b3.y);
    ctx.lineTo(b4.x, b4.y);
    ctx.stroke();

    const s1 = projectField(xEdge, 0.36);
    const s2 = projectField(xSmall, 0.36);
    const s3 = projectField(xSmall, 0.64);
    const s4 = projectField(xEdge, 0.64);
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.lineTo(s3.x, s3.y);
    ctx.lineTo(s4.x, s4.y);
    ctx.stroke();

    const pen = projectField(xPen, 0.5);
    ctx.beginPath();
    ctx.arc(pen.x, pen.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw3DGoals() {
    drawSingleGoal(true, leftNetShake);
    drawSingleGoal(false, rightNetShake);
  }

  function drawSingleGoal(isLeft, shakeVal) {
    const xLine = isLeft ? 0 : 1;
    const postTop = projectField(xLine, 0.41);
    const postBot = projectField(xLine, 0.59);
    const dir = isLeft ? -1 : 1;
    const wave = Math.sin(netPhase) * shakeVal * 15;
    const depth = (28 + shakeVal * 18) * dir + wave;
    const heightZ = 24;

    ctx.save();
    ctx.fillStyle = `rgba(226, 232, 240, ${0.22 + shakeVal * 0.25})`;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 + shakeVal * 0.3})`;
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.moveTo(postTop.x, postTop.y - heightZ);
    ctx.lineTo(postTop.x + depth, postTop.y - heightZ + 4);
    ctx.lineTo(postBot.x + depth, postBot.y + 4);
    ctx.lineTo(postBot.x, postBot.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.lineWidth = 0.7;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    for (let t = 0.2; t < 1.0; t += 0.2) {
      const yA = (postTop.y - heightZ) + (postBot.y - (postTop.y - heightZ)) * t;
      ctx.beginPath();
      ctx.moveTo(postTop.x + (postBot.x - postTop.x) * t, yA);
      ctx.lineTo(postTop.x + depth, yA + 3);
      ctx.stroke();
    }

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(postTop.x, postTop.y);
    ctx.lineTo(postTop.x, postTop.y - heightZ);
    ctx.lineTo(postBot.x, postBot.y - heightZ);
    ctx.lineTo(postBot.x, postBot.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawHumanoidPlayer(p) {
    const pt = projectField(p.fx, p.fy);
    const sc = pt.scale;
    const x = pt.x;
    const y = pt.y + p.diveOffset - p.jumpZ;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y + 4, 10 * sc, 5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    const distBall = Math.hypot(ball.fx - p.fx, ball.fy - p.fy);
    if (distBall < 0.055) {
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y + 3, 14 * sc, 7 * sc, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    let shirtCol = p.isHome ? "#1d4ed8" : "#dc2626";
    let trimCol = p.isHome ? "#fbbf24" : "#ffffff";
    let shortsCol = p.isHome ? "#0f172a" : "#ffffff";
    if (p.isGK) {
      shirtCol = p.isHome ? "#10b981" : "#f59e0b";
      trimCol = "#ffffff";
      shortsCol = "#111827";
    }

    const legSwing = Math.sin(p.runPhase) * 4 * sc;
    ctx.strokeStyle = "#f1c27d";
    ctx.lineWidth = 2.8 * sc;
    ctx.beginPath();
    ctx.moveTo(x - 3 * sc, y - 5 * sc);
    ctx.lineTo(x - 3 * sc - legSwing * 0.5, y + 2 * sc);
    ctx.moveTo(x + 3 * sc, y - 5 * sc);
    ctx.lineTo(x + 3 * sc + legSwing * 0.5, y + 2 * sc);
    ctx.stroke();

    ctx.fillStyle = shortsCol;
    ctx.fillRect(x - 5.5 * sc, y - 10 * sc, 11 * sc, 5 * sc);

    ctx.fillStyle = shirtCol;
    ctx.beginPath();
    ctx.roundRect(x - 6.5 * sc, y - 20 * sc, 13 * sc, 11 * sc, 3 * sc);
    ctx.fill();
    ctx.strokeStyle = trimCol;
    ctx.lineWidth = 1.2 * sc;
    ctx.stroke();

    ctx.fillStyle = "#f1c27d";
    ctx.beginPath();
    ctx.arc(x, y - 24 * sc, 4.4 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.number % 2 === 0 ? "#27272a" : "#713f12";
    ctx.beginPath();
    ctx.arc(x, y - 25.2 * sc, 4.2 * sc, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(9 * sc)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(String(p.number), x, y - 11.5 * sc);

    if (distBall < 0.065 || p.emojiTimer > 0) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(x - 32, y - 41 * sc, 64, 13);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText(p.surname, x, y - 32 * sc);
    }

    if (p.card) {
      ctx.fillStyle = p.card === "red" ? "#ef4444" : "#facc15";
      ctx.fillRect(x + 8 * sc, y - 28 * sc, 6, 9);
    }
    ctx.restore();
  }

  function drawTacticalTokenPlayer(p) {
    const pt = projectField(p.fx, p.fy);
    const x = pt.x;
    const y = pt.y;
    const r = 11.5;

    ctx.save();
    const ang = p.facing;
    ctx.fillStyle = p.isHome ? "#38bdf8" : "#fb7185";
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * (r + 6), y + Math.sin(ang) * (r + 6));
    ctx.lineTo(x + Math.cos(ang + 0.5) * (r - 1), y + Math.sin(ang + 0.5) * (r - 1));
    ctx.lineTo(x + Math.cos(ang - 0.5) * (r - 1), y + Math.sin(ang - 0.5) * (r - 1));
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(x, y + 3, r, 0, Math.PI * 2);
    ctx.fill();

    let col = p.isHome ? "#1d4ed8" : "#dc2626";
    if (p.isGK) col = p.isHome ? "#059669" : "#d97706";
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.isHome ? "#fbbf24" : "#ffffff";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(p.number), x, y + 0.5);

    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.fillRect(x - 28, y + r + 3, 56, 12);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "9px sans-serif";
    ctx.fillText(p.surname, x, y + r + 9.5);

    if (p.card) {
      ctx.fillStyle = p.card === "red" ? "#ef4444" : "#facc15";
      ctx.fillRect(x + r - 2, y - r - 4, 6, 8);
    }
    ctx.restore();
  }

  function drawFormationLinks(pool, color, defIdx, midIdx, attIdx) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    const lines = [defIdx, midIdx, attIdx];
    for (let g = 0; g < lines.length; g++) {
      const group = lines[g].map(idx => pool[idx]).filter(Boolean).sort((a, b) => a.fy - b.fy);
      if (group.length < 2) continue;
      ctx.beginPath();
      for (let i = 0; i < group.length; i++) {
        const pt = projectField(group[i].fx, group[i].fy);
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawNightArenaPlayer(p) {
    const pt = projectField(p.fx, p.fy);
    const sc = pt.scale;
    const x = pt.x;
    const y = pt.y + p.diveOffset - p.jumpZ;

    ctx.save();
    const shadowOffsets = [
      [-9 * sc, -5 * sc], [9 * sc, -5 * sc],
      [-9 * sc, 6 * sc], [9 * sc, 6 * sc]
    ];
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    for (let s = 0; s < shadowOffsets.length; s++) {
      ctx.beginPath();
      ctx.ellipse(pt.x + shadowOffsets[s][0], pt.y + shadowOffsets[s][1], 7 * sc, 3.2 * sc, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const auraCol = p.isHome ? "rgba(56, 189, 248, 0.45)" : "rgba(244, 63, 94, 0.45)";
    ctx.strokeStyle = auraCol;
    ctx.lineWidth = 2 * sc;
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y + 2, 12 * sc, 6 * sc, 0, 0, Math.PI * 2);
    ctx.stroke();

    let shirtCol = p.isHome ? "#2563eb" : "#e11d48";
    if (p.isGK) shirtCol = p.isHome ? "#10b981" : "#f59e0b";

    ctx.fillStyle = shirtCol;
    ctx.beginPath();
    ctx.roundRect(x - 7 * sc, y - 18 * sc, 14 * sc, 14 * sc, 5 * sc);
    ctx.fill();
    ctx.strokeStyle = p.isHome ? "#fbbf24" : "#ffffff";
    ctx.lineWidth = 1.6 * sc;
    ctx.stroke();

    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(x, y - 22 * sc, 4.5 * sc, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(9.5 * sc)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(String(p.number), x, y - 8 * sc);

    if (p.emojiTimer > 0 && p.emoji) {
      ctx.font = `${Math.round(14 * sc)}px sans-serif`;
      ctx.fillText(p.emoji, x, y - 30 * sc);
    }
    ctx.restore();
  }

  function drawBall3D(neonMode) {
    const pt = projectField(ball.fx, ball.fy);
    const visualY = pt.y - ball.z;

    ctx.save();
    for (let i = 0; i < ball.trail.length; i++) {
      const tr = ball.trail[i];
      const alpha = ((ball.trail.length - i) / ball.trail.length) * (tr.isShot ? 0.55 : 0.25);
      ctx.fillStyle = (neonMode && tr.isShot)
        ? `rgba(251, 191, 36, ${alpha})`
        : `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, Math.max(1.5, 4.8 - i * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }

    const shScale = Math.max(0.35, 1.0 - ball.z / 75.0);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * shScale})`;
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y + 3, 5.5 * shScale, 3.2 * shScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(pt.x, visualY, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    const sx = Math.cos(ball.spin) * 2.2;
    const sy = Math.sin(ball.spin) * 2.2;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(pt.x + sx, visualY + sy, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFloodlightBeams() {
    const corners = [
      [0, 0], [W, 0], [0, H], [W, H]
    ];
    for (let i = 0; i < corners.length; i++) {
      const cx = corners[i][0];
      const cy = corners[i][1];
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 340);
      grad.addColorStop(0, "rgba(254, 249, 195, 0.25)");
      grad.addColorStop(0.5, "rgba(186, 230, 253, 0.06)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 340, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawParticles() {
    for (let i = 0; i < confetti.length; i++) {
      const c = confetti[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size * 0.5, -c.size * 0.5, c.size, c.size * 0.65);
      ctx.restore();
    }
    for (let i = 0; i < sparks.length; i++) {
      const s = sparks[i];
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ===========================================================================
  // HUD ТА КНОПКИ МИТТЄВОГО ПЕРЕМИКАННЯ 3 ВАРІАНТІВ
  // ===========================================================================
  const uiButtons = [];

  function setupUIButtons() {
    uiButtons.length = 0;
    uiButtons.push({
      id: "v1", x: 18, y: 10, w: 146, h: 34,
      label: "🏟️ 1. Телематч 3D",
      isActive: () => currentVariant === 1,
      onClick: () => { currentVariant = 1; triggerBadge("ВАРІАНТ 1: TV BROADCAST 3D", "Фігурки футболістів + трапеція поля + LED борти", "#38bdf8", 1.6); }
    });
    uiButtons.push({
      id: "v2", x: 170, y: 10, w: 148, h: 34,
      label: "📋 2. Тактична Дошка",
      isActive: () => currentVariant === 2,
      onClick: () => { currentVariant = 2; triggerBadge("ВАРІАНТ 2: TACTICAL BOARD", "3D-фішки з векторами + лінії формацій + телеметрія", "#4ade80", 1.6); }
    });
    uiButtons.push({
      id: "v3", x: 324, y: 10, w: 148, h: 34,
      label: "🔥 3. Нічна Арена",
      isActive: () => currentVariant === 3,
      onClick: () => { currentVariant = 3; triggerBadge("ВАРІАНТ 3: DYNAMIC NIGHT ARENA", "Рухома екшн-камера + 4 тіні прожекторів + спалахи трибун", "#fbbf24", 1.6); }
    });

    uiButtons.push({
      id: "goal", x: W - 365, y: 10, w: 88, h: 34,
      label: "⚽ Гол!",
      isAccent: true,
      isActive: () => false,
      onClick: () => jumpToNextGoal()
    });
    uiButtons.push({
      id: "pause", x: W - 271, y: 10, w: 38, h: 34,
      label: () => isPaused ? "▶" : "⏸",
      isActive: () => isPaused,
      onClick: () => { isPaused = !isPaused; }
    });
    uiButtons.push({
      id: "1x", x: W - 227, y: 10, w: 38, h: 34,
      label: "1x",
      isActive: () => speedMult === 1.0,
      onClick: () => { speedMult = 1.0; }
    });
    uiButtons.push({
      id: "2x", x: W - 183, y: 10, w: 38, h: 34,
      label: "2x",
      isActive: () => speedMult === 2.0,
      onClick: () => { speedMult = 2.0; }
    });
    uiButtons.push({
      id: "4x", x: W - 139, y: 10, w: 38, h: 34,
      label: "4x",
      isActive: () => speedMult === 4.0,
      onClick: () => { speedMult = 4.0; }
    });
    uiButtons.push({
      id: "skip", x: W - 95, y: 10, w: 78, h: 34,
      label: () => matchEnded ? "↺ Старт" : "⏭ Кінець",
      isActive: () => false,
      onClick: () => { if (matchEnded) resetMatch(); else skipToEnd(); }
    });
  }
  setupUIButtons();

  let fps = 60;
  let frameCount = 0;
  let fpsTimer = 0;

  function drawHUD() {
    const sbW = 340, sbH = 38;
    const sbX = (W - sbW) * 0.5 + 32, sbY = 8;

    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 28, 0.94)";
    ctx.beginPath();
    ctx.roundRect(sbX, sbY, sbW, sbH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.arc(sbX + 18, sbY + 19, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("АВРОРА", sbX + 32, sbY + 24);

    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(sbX + sbW - 18, sbY + 19, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText("КАНТЕРА", sbX + sbW - 32, sbY + 24);

    const midX = sbX + sbW * 0.5;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(midX - 50, sbY + 4, 100, 30, 6);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${scoreHome} : ${scoreAway}`, midX - 14, sbY + 25);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`${Math.floor(matchMinute)}'`, midX + 30, sbY + 24);

    for (let i = 0; i < uiButtons.length; i++) {
      const b = uiButtons[i];
      const active = b.isActive();
      const text = typeof b.label === "function" ? b.label() : b.label;

      ctx.fillStyle = active
        ? "#1d4ed8"
        : (b.isAccent ? "rgba(217, 119, 6, 0.92)" : "rgba(15, 23, 42, 0.9)");
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 7);
      ctx.fill();

      ctx.strokeStyle = active
        ? "#fbbf24"
        : (b.isAccent ? "#fde047" : "rgba(100, 116, 139, 0.6)");
      ctx.lineWidth = active ? 2 : 1.2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, b.x + b.w * 0.5, b.y + 21);
    }

    if (currentVariant === 2) {
      drawTacticalTelemetryHUD();
    }

    const commW = 820, commH = 38;
    const commX = (W - commW) * 0.5, commY = H - 46;
    ctx.fillStyle = "rgba(9, 13, 24, 0.92)";
    ctx.beginPath();
    ctx.roundRect(commX, commY, commW, commH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(commentary, commX + 18, commY + 24);

    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(W - 115, H - 42, 98, 30, 6);
    ctx.fill();
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`FPS: ${fps} | V${currentVariant}`, W - 66, H - 23);

    if (badgeTimer > 0) {
      const a = Math.min(1, badgeTimer / 0.35);
      ctx.save();
      ctx.globalAlpha = a;
      const bw = 380, bh = 54;
      const bx = (W - bw) * 0.5, by = 56;
      ctx.fillStyle = "rgba(10, 15, 28, 0.95)";
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      ctx.fill();
      ctx.strokeStyle = badgeColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = badgeColor;
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(badgeTitle, W * 0.5, by + 22);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "12px sans-serif";
      ctx.fillText(badgeSub, W * 0.5, by + 42);
      ctx.restore();
    }

    if (isReplaying) {
      ctx.fillStyle = "rgba(220, 38, 38, 0.9)";
      ctx.beginPath();
      ctx.roundRect(24, 58, 210, 28, 6);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("● ПОВТОР ГОЛУ (SLOW-MO)", 36, 76);
    }

    ctx.restore();
  }

  function drawTacticalTelemetryHUD() {
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.fillRect(135, 646, W - 270, 22);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `📊 ТАКТИЧНА ТЕЛЕМЕТРІЯ  •  Схеми: 4-3-3 vs 4-5-1  •  Удари: ${stats.shotsHome}–${stats.shotsAway}  •  Сейви: ${stats.savesHome}–${stats.savesAway}  •  Кутові: ${stats.cornersHome}–${stats.cornersAway}  •  Володіння: ${stats.possHome}%–${stats.possAway}%`,
      W * 0.5,
      661
    );
    ctx.restore();
  }

  function handlePointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    for (let i = 0; i < uiButtons.length; i++) {
      const b = uiButtons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        b.onClick();
        return;
      }
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handlePointer(e.clientX, e.clientY);
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Digit1") uiButtons[0].onClick();
    else if (e.code === "Digit2") uiButtons[1].onClick();
    else if (e.code === "Digit3") uiButtons[2].onClick();
    else if (e.code === "Space") { isPaused = !isPaused; }
    else if (e.code === "KeyG") jumpToNextGoal();
  });

  initFans();
  resetMatch();

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      fps = Math.round(frameCount / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
    }

    update(dt);
    drawWorld();
    drawHUD();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
