// =============================================================================
// «ВЕРТИКАЛЬ: FOOTBALL MANAGER» — СПРАВЖНІЙ 3D WEBGL МАТЧЕВИЙ РУШІЙ (THREE.JS)
// 3 Повноцінні 3D-Концепції:
//   Варіант 1: 🏟️ Champions TV 3D (Класична телекамера, смугастий газон ЛЧ, 3D-чаша арени)
//   Варіант 2: 🎥 Spidercam 3D (Динамічна низька 3D-камера над полем, клітинний газон АПЛ)
//   Варіант 3: 📋 Tactical 3D VIP (Панорама, круговий газон, 3D-лінії формацій та дуги пасів)
// 100% ПЛАВНА БЕЗПЕРЕРВНА ХОРЕОГРАФІЯ БЕЗ РИВКІВ (Look-Ahead + Інерція)
// =============================================================================

(function () {
  const container = document.getElementById("webglContainer");
  const hudCanvas = document.getElementById("hudCanvas");
  const ctx = hudCanvas.getContext("2d");

  const HUD_W = 1280;
  const HUD_H = 720;

  // Розміри 3D-поля (105м x 68м)
  const PITCH_W = 105;
  const PITCH_D = 68;
  const HALF_W = PITCH_W * 0.5; // 52.5
  const HALF_D = PITCH_D * 0.5; // 34.0

  const urlParams = new URLSearchParams(window.location.search);
  let currentVariant = parseInt(urlParams.get("v") || "1", 10);
  if (![1, 2, 3].includes(currentVariant)) currentVariant = 1;

  // ===========================================================================
  // 1. ІНІЦІАЛІЗАЦІЯ THREE.JS СЦЕНИ ТА ОСВІТЛЕННЯ СТАДІОНУ
  // ===========================================================================
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050912);
  scene.fog = new THREE.FogExp2(0x050912, 0.0022);

  const camera = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 1.0, 500);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  container.appendChild(renderer.domElement);

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    hudCanvas.width = HUD_W * dpr;
    hudCanvas.height = HUD_H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", onResize);
  onResize();

  const hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x064e3b, 0.45);
  hemiLight.position.set(0, 90, 0);
  scene.add(hemiLight);

  const mainStadiumLight = new THREE.DirectionalLight(0xfffbeb, 1.18);
  mainStadiumLight.position.set(32, 82, 54);
  mainStadiumLight.castShadow = true;
  mainStadiumLight.shadow.mapSize.width = 2048;
  mainStadiumLight.shadow.mapSize.height = 2048;
  mainStadiumLight.shadow.camera.near = 15;
  mainStadiumLight.shadow.camera.far = 210;
  mainStadiumLight.shadow.camera.left = -68;
  mainStadiumLight.shadow.camera.right = 68;
  mainStadiumLight.shadow.camera.top = 50;
  mainStadiumLight.shadow.camera.bottom = -50;
  mainStadiumLight.shadow.bias = -0.0005;
  scene.add(mainStadiumLight);

  const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.48);
  rimLight.position.set(-45, 65, -55);
  scene.add(rimLight);

  // ===========================================================================
  // 2. ГЕНЕРАЦІЯ 3 РІЗНИХ ВИСОКОДЕТАЛІЗОВАНИХ ТЕКСТУР 3D-ГАЗОНУ (ДЛЯ V1, V2, V3)
  // ===========================================================================
  function drawPitchMarkingsAndGrain(g, c) {
    // 22 000 мікро-травинок для живої текстури дерну
    for (let i = 0; i < 22000; i++) {
      const x = Math.random() * c.width;
      const y = Math.random() * c.height;
      g.fillStyle = Math.random() > 0.5 ? "rgba(187, 247, 208, 0.07)" : "rgba(4, 28, 12, 0.12)";
      g.fillRect(x, y, 2, 4);
    }

    const padX = 64;
    const padY = 52;
    const pw = c.width - padX * 2;
    const ph = c.height - padY * 2;
    const cx = c.width * 0.5;
    const cy = c.height * 0.5;

    // Витоптаність у воротарських майданчиках
    function drawWear(wx, wy, rx, ry) {
      const grad = g.createRadialGradient(wx, wy, 4, wx, wy, rx);
      grad.addColorStop(0, "rgba(110, 82, 44, 0.32)");
      grad.addColorStop(1, "rgba(110, 82, 44, 0)");
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(wx, wy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    }
    drawWear(padX + 24, cy, 42, 85);
    drawWear(padX + pw - 24, cy, 42, 85);

    // Чітка біла крейдяна розмітка
    g.strokeStyle = "rgba(255, 255, 255, 0.95)";
    g.fillStyle = "rgba(255, 255, 255, 0.95)";
    g.lineWidth = 5.5;

    g.strokeRect(padX, padY, pw, ph);

    g.beginPath();
    g.moveTo(cx, padY);
    g.lineTo(cx, padY + ph);
    g.stroke();

    const circleR = ph * (9.15 / 68);
    g.beginPath();
    g.arc(cx, cy, circleR, 0, Math.PI * 2);
    g.stroke();

    g.beginPath();
    g.arc(cx, cy, 7.5, 0, Math.PI * 2);
    g.fill();

    const boxW = pw * (16.5 / 105);
    const boxH = ph * (40.3 / 68);
    const smallW = pw * (5.5 / 105);
    const smallH = ph * (18.3 / 68);
    const penDist = pw * (11.0 / 105);

    // Лівий штрафний
    g.strokeRect(padX, cy - boxH * 0.5, boxW, boxH);
    g.strokeRect(padX, cy - smallH * 0.5, smallW, smallH);
    g.beginPath();
    g.arc(padX + penDist, cy, 6.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(padX + penDist, cy, circleR, -0.92, 0.92);
    g.stroke();

    // Правий штрафний
    g.strokeRect(padX + pw - boxW, cy - boxH * 0.5, boxW, boxH);
    g.strokeRect(padX + pw - smallW, cy - smallH * 0.5, smallW, smallH);
    g.beginPath();
    g.arc(padX + pw - penDist, cy, 6.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(padX + pw - penDist, cy, circleR, Math.PI - 0.92, Math.PI + 0.92);
    g.stroke();

    // Кутові дуги
    const cR = 20;
    [[padX, padY, 0, Math.PI * 0.5],
     [padX + pw, padY, Math.PI * 0.5, Math.PI],
     [padX + pw, padY + ph, Math.PI, Math.PI * 1.5],
     [padX, padY + ph, Math.PI * 1.5, Math.PI * 2]].forEach(([x, y, a1, a2]) => {
      g.beginPath();
      g.arc(x, y, cR, a1, a2);
      g.stroke();
    });
  }

  function createVariantGrassTexture(styleId) {
    const c = document.createElement("canvas");
    c.width = 2048;
    c.height = 1024;
    const g = c.getContext("2d");

    if (styleId === 1) {
      // Стиль 1: Насичений смарагдовий газон Ліги Чемпіонів (широкі контрастні смуги)
      const stripes = 16;
      const sw = c.width / stripes;
      for (let i = 0; i < stripes; i++) {
        g.fillStyle = i % 2 === 0 ? "#0f5428" : "#166b35";
        g.fillRect(i * sw, 0, sw + 1, c.height);
      }
    } else if (styleId === 2) {
      // Стиль 2: Шаховий «англійський» газон Прем'єр-Ліги з діагональним відтінком
      const cols = 18, rows = 10;
      const cw = c.width / cols, rh = c.height / rows;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          g.fillStyle = (i + j) % 2 === 0 ? "#115e2e" : "#0b4621";
          g.fillRect(i * cw, j * rh, cw + 1, rh + 1);
        }
      }
    } else {
      // Стиль 3: Концентричний радіальний покіс кільцями + тактична розмітка зон
      g.fillStyle = "#0a3f22";
      g.fillRect(0, 0, c.width, c.height);
      const cx = c.width * 0.5, cy = c.height * 0.5;
      for (let r = 1200; r > 60; r -= 85) {
        g.fillStyle = Math.round(r / 85) % 2 === 0 ? "#0f522d" : "#0a3d20";
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.fill();
      }
    }

    drawPitchMarkingsAndGrain(g, c);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  const grassTex1 = createVariantGrassTexture(1);
  const grassTex2 = createVariantGrassTexture(2);
  const grassTex3 = createVariantGrassTexture(3);

  // Bump-рельєф трави
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 512;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext("2d");
  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 16000; i++) {
    bCtx.fillStyle = Math.random() > 0.5 ? "#adadad" : "#525252";
    bCtx.fillRect(Math.random() * 512, Math.random() * 256, 2, 3);
  }
  const pitchBump = new THREE.CanvasTexture(bumpCanvas);
  pitchBump.wrapS = THREE.RepeatWrapping;
  pitchBump.wrapT = THREE.RepeatWrapping;
  pitchBump.repeat.set(8, 5);

  const pitchGeo = new THREE.PlaneGeometry(PITCH_W + 7, PITCH_D + 6.5, 48, 32);
  pitchGeo.rotateX(-Math.PI * 0.5);
  const posAttr = pitchGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const pz = posAttr.getZ(i);
    const crown = Math.max(0, 1 - (px * px) / 3400 - (pz * pz) / 1500) * 0.22;
    posAttr.setY(i, crown);
  }
  pitchGeo.computeVertexNormals();

  const pitchMat = new THREE.MeshStandardMaterial({
    map: currentVariant === 1 ? grassTex1 : (currentVariant === 2 ? grassTex2 : grassTex3),
    bumpMap: pitchBump,
    bumpScale: 0.09,
    roughness: 0.78,
    metalness: 0.04
  });
  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.receiveShadow = true;
  scene.add(pitchMesh);

  // Доріжка навколо поля (Tartan Track + технічна зона)
  const apronGeo = new THREE.PlaneGeometry(180, 130);
  apronGeo.rotateX(-Math.PI * 0.5);
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x0c1f17, roughness: 0.92 });
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.position.y = -0.05;
  apronMesh.receiveShadow = true;
  scene.add(apronMesh);

  // Кутові прапорці
  function addCornerFlags() {
    const poleGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.8, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const flagGeo = new THREE.PlaneGeometry(0.75, 0.5);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide });
    [[-HALF_W, -HALF_D], [HALF_W, -HALF_D], [-HALF_W, HALF_D], [HALF_W, HALF_D]].forEach(([cx, cz]) => {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(cx, 0.9, cz);
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.38, 0.55, 0);
      pole.add(flag);
      scene.add(pole);
    });
  }
  addCornerFlags();

  // ===========================================================================
  // 3. ЗАКРИТА 3D-ЧАША СТАДІОНУ НА 360° З КУТОВИМИ СЕКТОРАМИ ТА ПРОЖЕКТОРАМИ
  // ===========================================================================
  const ledCanvas = document.createElement("canvas");
  ledCanvas.width = 1024;
  ledCanvas.height = 64;
  const ledCtx = ledCanvas.getContext("2d");
  const ledTexture = new THREE.CanvasTexture(ledCanvas);
  ledTexture.wrapS = THREE.RepeatWrapping;
  ledTexture.repeat.set(2, 1);

  function updateLEDBoard(nowMs) {
    ledCtx.fillStyle = "#070b14";
    ledCtx.fillRect(0, 0, 1024, 64);
    ledCtx.strokeStyle = "#38bdf8";
    ledCtx.lineWidth = 3;
    ledCtx.strokeRect(0, 2, 1024, 60);

    const offset = (nowMs * 0.08) % 512;
    ledCtx.font = "bold 28px sans-serif";
    for (let i = -1; i < 3; i++) {
      ledCtx.fillStyle = "#fbbf24";
      ledCtx.fillText("⚡ ВЕРТИКАЛЬ FM", i * 512 - offset + 20, 42);
      ledCtx.fillStyle = "#38bdf8";
      ledCtx.fillText("• АВРОРА vs КАНТЕРА •", i * 512 - offset + 255, 42);
    }
    ledTexture.needsUpdate = true;
  }

  let crowdInstancedMesh = null;
  const crowdData = [];

  function buildStadiumBowl3D() {
    const stadiumGroup = new THREE.Group();

    // 3D LED-борти по периметру поля
    const ledMat = new THREE.MeshBasicMaterial({ map: ledTexture, side: THREE.DoubleSide });
    const northLed = new THREE.Mesh(new THREE.PlaneGeometry(114, 1.45), ledMat);
    northLed.position.set(0, 0.75, -HALF_D - 3.6);
    stadiumGroup.add(northLed);

    const westLed = new THREE.Mesh(new THREE.PlaneGeometry(74, 1.45), ledMat);
    westLed.rotation.y = Math.PI * 0.5;
    westLed.position.set(-HALF_W - 4.2, 0.75, 0);
    stadiumGroup.add(westLed);

    const eastLed = new THREE.Mesh(new THREE.PlaneGeometry(74, 1.45), ledMat);
    eastLed.rotation.y = -Math.PI * 0.5;
    eastLed.position.set(HALF_W + 4.2, 0.75, 0);
    stadiumGroup.add(eastLed);

    // Тренерські бокси та лави запасних на передньому плані
    const dugoutMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.38 });
    [-16, 16].forEach((dx) => {
      const dGroup = new THREE.Group();
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(9.5, 2.2, 0.25), glassMat);
      backWall.position.set(0, 1.1, 0.8);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.22, 2.1), dugoutMat);
      roof.position.set(0, 2.2, 0);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.6, 0.7), dugoutMat);
      bench.position.set(0, 0.3, 0.3);
      dGroup.add(backWall, roof, bench);
      dGroup.position.set(dx, 0, HALF_D + 3.6);
      stadiumGroup.add(dGroup);
    });

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const seatRowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
    const vipGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.35, metalness: 0.4 });

    function createGrandstand(width, distZ, rotY, includeRoof) {
      const stand = new THREE.Group();
      stand.rotation.y = rotY;

      for (let s = 0; s < 11; s++) {
        const stepH = 1.48;
        const stepD = 2.05;
        const y = (s + 1) * stepH;
        const z = -distZ - s * stepD;
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(width, stepH, stepD),
          s % 2 === 0 ? concreteMat : seatRowMat
        );
        stepMesh.position.set(0, y - stepH * 0.5, z);
        stepMesh.receiveShadow = true;
        stand.add(stepMesh);

        const fanCount = Math.floor(width / 1.4);
        for (let f = 0; f < fanCount; f++) {
          if (Math.random() < 0.12) continue;
          const localX = -width * 0.485 + f * 1.4 + (Math.random() - 0.5) * 0.3;
          const localY = y + 0.48;
          const localZ = z + (Math.random() - 0.5) * 0.35;
          const vec = new THREE.Vector3(localX, localY, localZ).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
          crowdData.push({
            x: vec.x,
            baseY: vec.y,
            z: vec.z,
            phase: Math.random() * Math.PI * 2 + vec.x * 0.07,
            colorHex: Math.random() < 0.44 ? 0x2563eb : (Math.random() < 0.55 ? 0xdc2626 : (Math.random() < 0.5 ? 0xfbbf24 : 0xe2e8f0))
          });
        }
      }

      const vipStrip = new THREE.Mesh(new THREE.BoxGeometry(width, 0.5, 0.45), vipGlowMat);
      vipStrip.position.set(0, 8.2, -distZ - 10.0);
      stand.add(vipStrip);

      if (includeRoof) {
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(width + 6, 22, 1.8), concreteMat);
        backWall.position.set(0, 11, -distZ - 22.5);
        stand.add(backWall);

        const canopy = new THREE.Mesh(new THREE.BoxGeometry(width + 8, 0.8, 20), roofMat);
        canopy.position.set(0, 21.8, -distZ - 14);
        canopy.rotation.x = 0.08;
        stand.add(canopy);

        const lightBarMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
        const lightBar = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.5, 0.7), lightBarMat);
        lightBar.position.set(0, 21.1, -distZ - 4.8);
        stand.add(lightBar);
      }
      stadiumGroup.add(stand);
    }

    // Збільшена ширина трибун, щоб кути стадіону повністю змикалися в єдину чашу!
    createGrandstand(152, HALF_D + 6.2, 0, true);
    createGrandstand(110, HALF_W + 7.2, Math.PI * 0.5, true);
    createGrandstand(110, HALF_W + 7.2, -Math.PI * 0.5, true);
    createGrandstand(148, HALF_D + 9.0, Math.PI, false);

    // 4 Кутові вежі прожекторів
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    [[-64, -44], [64, -44], [-64, 44], [64, 44]].forEach(([tx, tz]) => {
      const tGroup = new THREE.Group();
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 34, 8), towerMat);
      pillar.position.y = 17;
      const headFrame = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.8, 1.2), lampMat);
      headFrame.position.set(0, 34, 0);
      headFrame.lookAt(0, 0, 0);
      tGroup.add(pillar, headFrame);
      tGroup.position.set(tx, 0, tz);
      stadiumGroup.add(tGroup);
    });

    const fanGeo = new THREE.BoxGeometry(0.78, 1.2, 0.58);
    const fanMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    crowdInstancedMesh = new THREE.InstancedMesh(fanGeo, fanMat, crowdData.length);
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();

    for (let i = 0; i < crowdData.length; i++) {
      const cd = crowdData[i];
      dummy.position.set(cd.x, cd.baseY, cd.z);
      dummy.updateMatrix();
      crowdInstancedMesh.setMatrixAt(i, dummy.matrix);
      col.setHex(cd.colorHex);
      crowdInstancedMesh.setColorAt(i, col);
    }
    crowdInstancedMesh.instanceMatrix.needsUpdate = true;
    if (crowdInstancedMesh.instanceColor) crowdInstancedMesh.instanceColor.needsUpdate = true;
    stadiumGroup.add(crowdInstancedMesh);

    scene.add(stadiumGroup);
  }
  buildStadiumBowl3D();

  // ===========================================================================
  // 4. ВИРАЗНІ 3D-ВОРОТА З ПРУЖНОЮ 3D-СІТКОЮ
  // ===========================================================================
  const GOAL_W = 10.2;
  const GOAL_H = 3.6;
  const GOAL_D = 3.0;

  let leftNetGeo = null, rightNetGeo = null;
  let leftNetBaseVerts = null, rightNetBaseVerts = null;
  let leftNetShake = 0, rightNetShake = 0, netPhase = 0;

  function build3DGoal(isLeft) {
    const dir = isLeft ? -1 : 1;
    const goalX = isLeft ? -HALF_W : HALF_W;
    const gGroup = new THREE.Group();
    gGroup.position.set(goalX, 0, 0);

    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.2 });
    const postRadius = 0.20;

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, GOAL_H, 14), postMat);
    leftPost.position.set(0, GOAL_H * 0.5, -GOAL_W * 0.5);
    leftPost.castShadow = true;

    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, GOAL_H, 14), postMat);
    rightPost.position.set(0, GOAL_H * 0.5, GOAL_W * 0.5);
    rightPost.castShadow = true;

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(postRadius, postRadius, GOAL_W + postRadius * 2, 14), postMat);
    crossbar.rotation.x = Math.PI * 0.5;
    crossbar.position.set(0, GOAL_H, 0);
    crossbar.castShadow = true;

    gGroup.add(leftPost, rightPost, crossbar);

    const netGeo = new THREE.BoxGeometry(GOAL_D, GOAL_H, GOAL_W, 6, 6, 12);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(dir * GOAL_D * 0.5, GOAL_H * 0.5, 0);
    gGroup.add(netMesh);

    const baseArr = new Float32Array(netGeo.attributes.position.array);
    if (isLeft) { leftNetGeo = netGeo; leftNetBaseVerts = baseArr; }
    else { rightNetGeo = netGeo; rightNetBaseVerts = baseArr; }

    scene.add(gGroup);
  }
  build3DGoal(true);
  build3DGoal(false);

  function updateGoalNets(dt) {
    netPhase += dt * 26;
    leftNetShake *= Math.pow(0.03, dt);
    rightNetShake *= Math.pow(0.03, dt);

    function deformNet(geo, base, shake, dir) {
      if (!geo || shake < 0.005) return;
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
        const isFront = (dir < 0 && bx > GOAL_D * 0.45) || (dir > 0 && bx < -GOAL_D * 0.45);
        if (isFront) {
          pos.setXYZ(i, bx, by, bz);
        } else {
          const wave = Math.sin(netPhase + by * 1.5 + bz * 0.8) * shake * 0.95;
          pos.setXYZ(i, bx + dir * shake * 1.25 + wave, by, bz + wave * 0.4);
        }
      }
      pos.needsUpdate = true;
    }
    deformNet(leftNetGeo, leftNetBaseVerts, leftNetShake, -1);
    deformNet(rightNetGeo, rightNetBaseVerts, rightNetShake, 1);
  }

  // ===========================================================================
  // 5. 22 СКЕЛЕТНІ 3D-ФУТБОЛІСТИ ТА ТАКТИЧНІ 3D-ЛІНІЇ ФОРМАЦІЙ
  // ===========================================================================
  const playersHome = [];
  const playersAway = [];
  const allPlayers = [];
  const allPlayersMap = {};

  function shortSurname(fullName) {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    return parts[parts.length - 1];
  }

  function createPlayerBadgeTexture(number, surname, isHome, isGK) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 80;
    const g = c.getContext("2d");

    g.fillStyle = "rgba(8, 13, 25, 0.86)";
    g.beginPath();
    g.roundRect(14, 14, 228, 48, 24);
    g.fill();

    g.strokeStyle = isHome ? "#fbbf24" : "#f43f5e";
    g.lineWidth = 3.5;
    g.stroke();

    g.fillStyle = isGK ? "#10b981" : (isHome ? "#2563eb" : "#e11d48");
    g.beginPath();
    g.arc(40, 38, 19, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#ffffff";
    g.font = "bold 21px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(number), 40, 39);

    g.fillStyle = "#f8fafc";
    g.font = "bold 22px sans-serif";
    g.textAlign = "left";
    g.fillText(surname.slice(0, 10), 68, 39);

    return new THREE.CanvasTexture(c);
  }

  function build3DPlayerMesh(isHome, isGK, number, surname) {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const kitHex = isGK ? (isHome ? 0x10b981 : 0xf59e0b) : (isHome ? 0x2563eb : 0xe11d48);
    const shortsHex = isGK ? 0x111827 : (isHome ? 0x0f172a : 0xffffff);
    const socksHex = isHome ? 0x1d4ed8 : 0xbe123c;

    const kitMat = new THREE.MeshStandardMaterial({ color: kitHex, roughness: 0.45 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: shortsHex, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.55 });
    const hairMat = new THREE.MeshStandardMaterial({ color: number % 2 === 0 ? 0x18181b : 0x5c3a21, roughness: 0.8 });
    const sockMat = new THREE.MeshStandardMaterial({ color: socksHex, roughness: 0.55 });
    const bootMat = new THREE.MeshStandardMaterial({ color: isHome ? 0xfbbf24 : 0x111827, roughness: 0.35 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.02, 0.46), kitMat);
    torso.position.y = 1.48;
    torso.castShadow = true;
    bodyPivot.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), skinMat);
    head.position.y = 2.28;
    head.castShadow = true;
    bodyPivot.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.335, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
    hair.position.y = 2.31;
    hair.rotation.x = -0.15;
    bodyPivot.add(hair);

    function makeArm(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.52, 1.88, 0);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.38, 8), kitMat);
      sleeve.position.y = -0.17;
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.085, 0.44, 8), skinMat);
      forearm.position.y = -0.52;
      pivot.add(sleeve, forearm);
      bodyPivot.add(pivot);
      return pivot;
    }
    const leftArm = makeArm(-1);
    const rightArm = makeArm(1);

    function makeLeg(side) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.22, 0.98, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.44, 8), shortsMat);
      thigh.position.y = -0.21;
      thigh.castShadow = true;
      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.46, 8), sockMat);
      calf.position.y = -0.62;
      calf.castShadow = true;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.42), bootMat);
      boot.position.set(0, -0.89, 0.07);
      pivot.add(thigh, calf, boot);
      bodyPivot.add(pivot);
      return pivot;
    }
    const leftLeg = makeLeg(-1);
    const rightLeg = makeLeg(1);

    const ringGeo = new THREE.RingGeometry(0.92, 1.22, 28);
    ringGeo.rotateX(-Math.PI * 0.5);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isHome ? 0xfbbf24 : 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.07;
    root.add(ring);

    const badgeTex = createPlayerBadgeTexture(number, surname, isHome, isGK);
    const badgeMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true, depthTest: false });
    const badgeSprite = new THREE.Sprite(badgeMat);
    badgeSprite.scale.set(3.5, 1.1, 1);
    badgeSprite.position.y = 3.25;
    root.add(badgeSprite);

    scene.add(root);
    return { root, bodyPivot, leftArm, rightArm, leftLeg, rightLeg, ringMat, badgeSprite };
  }

  function normToWorld(fx, fy) {
    return {
      x: (fx - 0.5) * PITCH_W,
      z: (fy - 0.5) * PITCH_D
    };
  }

  function initPlayers3D() {
    const hp = (MATCH_DATA.home && MATCH_DATA.home.players) || [];
    hp.forEach((p, idx) => {
      const fx = 0.04 + (p.x / 100) * 0.44;
      const fy = p.y / 100;
      const wpos = normToWorld(fx, fy);
      const num = p.number || (idx + 1);
      const surname = shortSurname(p.name);
      const rig = build3DPlayerMesh(true, p.slot === "GK", num, surname);
      const obj = {
        name: p.name, surname, number: num, slot: p.slot,
        isHome: true, isGK: p.slot === "GK",
        baseX: wpos.x, baseZ: wpos.z,
        x: wpos.x, z: wpos.z, vx: 0, vz: 0,
        targetX: wpos.x, targetZ: wpos.z,
        facing: Math.PI * 0.5,
        stridePhase: Math.random() * Math.PI * 2,
        kickTimer: 0, jumpY: 0, diveTimer: 0, diveDir: 0, card: "",
        rig
      };
      playersHome.push(obj);
      allPlayers.push(obj);
      allPlayersMap[obj.name] = obj;
    });

    const ap = (MATCH_DATA.away && MATCH_DATA.away.players) || [];
    ap.forEach((p, idx) => {
      const fx = 1.0 - (0.04 + (p.x / 100) * 0.44);
      const fy = p.y / 100;
      const wpos = normToWorld(fx, fy);
      const num = p.number || (idx + 1);
      const surname = shortSurname(p.name);
      const rig = build3DPlayerMesh(false, p.slot === "GK", num, surname);
      const obj = {
        name: p.name, surname, number: num, slot: p.slot,
        isHome: false, isGK: p.slot === "GK",
        baseX: wpos.x, baseZ: wpos.z,
        x: wpos.x, z: wpos.z, vx: 0, vz: 0,
        targetX: wpos.x, targetZ: wpos.z,
        facing: -Math.PI * 0.5,
        stridePhase: Math.random() * Math.PI * 2,
        kickTimer: 0, jumpY: 0, diveTimer: 0, diveDir: 0, card: "",
        rig
      };
      playersAway.push(obj);
      allPlayers.push(obj);
      allPlayersMap[obj.name] = obj;
    });
  }
  initPlayers3D();

  // 3D-лінії побудови формації (для Варіанту 3 — Тактика 3D VIP)
  function createFormationLineMesh(colorHex, count) {
    const pts = [];
    for (let i = 0; i < count; i++) pts.push(new THREE.Vector3(0, 0.18, 0));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.0 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return { geo, mat };
  }
  const homeDefLine = createFormationLineMesh(0x38bdf8, 4);
  const homeMidLine = createFormationLineMesh(0x38bdf8, 3);
  const awayDefLine = createFormationLineMesh(0xf43f5e, 4);
  const awayMidLine = createFormationLineMesh(0xf43f5e, 5);

  function updateFormationLines3D() {
    const show = currentVariant === 3;
    const op = show ? 0.65 : 0.0;
    homeDefLine.mat.opacity = op;
    homeMidLine.mat.opacity = op;
    awayDefLine.mat.opacity = op;
    awayMidLine.mat.opacity = op;
    if (!show) return;

    function syncLine(lineObj, pool, indices) {
      const group = indices.map(i => pool[i]).filter(Boolean).sort((a, b) => a.z - b.z);
      const pos = lineObj.geo.attributes.position;
      for (let i = 0; i < group.length; i++) {
        pos.setXYZ(i, group[i].x, 0.22, group[i].z);
      }
      pos.needsUpdate = true;
    }
    syncLine(homeDefLine, playersHome, [1, 2, 3, 4]);
    syncLine(homeMidLine, playersHome, [5, 6, 7]);
    syncLine(awayDefLine, playersAway, [1, 2, 3, 4]);
    syncLine(awayMidLine, playersAway, [5, 6, 7, 8, 9]);
  }

  // 3D М'яч
  const ballGeo = new THREE.IcosahedronGeometry(0.45, 2);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.1 });
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  scene.add(ballMesh);

  // 3D-дуга польоту м'яча
  const arcPoints = [];
  for (let i = 0; i <= 24; i++) arcPoints.push(new THREE.Vector3(0, 0.2, 0));
  const passArcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const passArcMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 });
  const passArcLine = new THREE.Line(passArcGeo, passArcMat);
  scene.add(passArcLine);

  const confettiMeshes = [];
  const confettiGeo = new THREE.PlaneGeometry(0.48, 0.30);
  const confettiColors = [0xfbbf24, 0x38bdf8, 0xffffff, 0x4ade80, 0xf43f5e];

  function spawn3DConfetti(worldX, worldZ) {
    for (let i = 0; i < 95; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: confettiColors[i % confettiColors.length],
        side: THREE.DoubleSide
      });
      const m = new THREE.Mesh(confettiGeo, mat);
      m.position.set(worldX + (Math.random() - 0.5) * 6, 2.5 + Math.random() * 4, worldZ + (Math.random() - 0.5) * 10);
      const ang = Math.random() * Math.PI * 2;
      const spd = 6 + Math.random() * 14;
      scene.add(m);
      confettiMeshes.push({
        mesh: m,
        vx: Math.cos(ang) * spd,
        vy: 8 + Math.random() * 14,
        vz: Math.sin(ang) * spd,
        rx: (Math.random() - 0.5) * 10,
        ry: (Math.random() - 0.5) * 10,
        life: 2.4 + Math.random() * 1.2
      });
    }
  }

  // ===========================================================================
  // 6. БЕЗПЕРЕРВНИЙ ФІЗИЧНИЙ РУШІЙ МАТЧУ БЕЗ РИВКІВ (LOOK-AHEAD CHOREOGRAPHY)
  // ===========================================================================
  const events = MATCH_DATA.events || [];
  let eventIdx = 0;
  let preppedEventIdx = -1;
  let matchMinute = 0.0;
  let scoreHome = 0, scoreAway = 0;
  let speedMult = 1.0, timeScale = 1.0;
  let isPaused = false, matchEnded = false;

  const stats = {
    shotsHome: 0, shotsAway: 0,
    savesHome: 0, savesAway: 0,
    cornersHome: 0, cornersAway: 0,
    possHome: 54, possAway: 46
  };

  const ball = {
    x: 0, y: 0.45, z: 0,
    mode: "dribble",
    carrier: playersHome[5],
    startX: 0, startY: 0.45, startZ: 0,
    targetX: 0, targetY: 0.45, targetZ: 0,
    targetReceiver: null,
    peakY: 1.5,
    flightTime: 0,
    flightDur: 0.6,
    isShot: false
  };

  let possessingTeam = "home";
  let passCooldown = 0.8;
  let crowdExcitement = 0.15;
  let shakeIntensity = 0;
  let isReplaying = false, replayTimer = 0;

  let commentary = "Матч розпочався! Аврора (4-3-3) розігрує м'яч у центрі поля.";
  let badgeTitle = "", badgeSub = "", badgeColor = "#38bdf8", badgeTimer = 0;

  function triggerBadge(title, sub, color, dur = 2.1) {
    badgeTitle = title;
    badgeSub = sub || "";
    badgeColor = color;
    badgeTimer = dur;
  }

  function findPlayer(team, name, fallbackRole) {
    if (name && allPlayersMap[name]) return allPlayersMap[name];
    const pool = team === "home" ? playersHome : playersAway;
    if (fallbackRole === "ST") return pool[pool.length - 1];
    if (fallbackRole === "CB") return pool[2] || pool[1];
    const field = pool.filter(p => !p.isGK);
    return field[Math.floor(Math.random() * field.length)] || pool[0];
  }

  function launchBallFlight(tx, tz, peakY, dur, receiver = null, isShot = false) {
    if (ball.carrier) ball.carrier.kickTimer = 0.35;
    ball.mode = "flight";
    ball.carrier = null;
    ball.startX = ball.x;
    ball.startY = ball.y;
    ball.startZ = ball.z;
    ball.targetX = tx;
    ball.targetY = 0.45;
    ball.targetZ = tz;
    ball.targetReceiver = receiver;
    ball.peakY = peakY;
    ball.flightDur = Math.max(0.28, dur);
    ball.flightTime = 0;
    ball.isShot = isShot;

    const pos = passArcGeo.attributes.position;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const ax = ball.startX + (tx - ball.startX) * t;
      const az = ball.startZ + (tz - ball.startZ) * t;
      const ay = 0.25 + Math.sin(t * Math.PI) * Math.max(0.8, peakY);
      pos.setXYZ(i, ax, ay, az);
    }
    pos.needsUpdate = true;
    passArcMat.color.setHex(isShot ? 0xfbbf24 : 0x38bdf8);
    passArcMat.opacity = currentVariant === 3 ? 0.9 : 0.35;
  }

  function prepareUpcomingEvent(ev) {
    const team = ev.team || "home";
    const isHome = team === "home";
    possessingTeam = team;
    const actor = findPlayer(team, ev.player, "ST");

    if (ev.type === "goal" || ev.type === "shot" || ev.type === "block") {
      const attackX = isHome ? 34 + Math.random() * 6 : -34 - Math.random() * 6;
      const attackZ = (Math.random() - 0.5) * 16;
      actor.targetX = attackX;
      actor.targetZ = attackZ;
      if (ball.carrier !== actor) {
        launchBallFlight(attackX, attackZ, 1.8, 0.65, actor, false);
      }
    } else if (ev.type === "stop") {
      const z = ev.zone === "L" ? -22 : (ev.zone === "R" ? 22 : 0);
      const x = isHome ? 18 : -18;
      actor.targetX = x;
      actor.targetZ = z;
      if (ball.carrier !== actor) {
        launchBallFlight(x, z, 1.2, 0.55, actor, false);
      }
    } else if (ev.type === "corner") {
      const cx = isHome ? HALF_W - 0.8 : -HALF_W + 0.8;
      const cz = -HALF_D + 0.8;
      actor.targetX = cx;
      actor.targetZ = cz;
      launchBallFlight(cx, cz, 1.4, 0.6, actor, false);
    }
  }

  function executeMatchEvent(ev) {
    const type = ev.type;
    const team = ev.team || "home";
    const isHome = team === "home";
    possessingTeam = team;
    commentary = `[${ev.minute}'] ${ev.text}`;
    passCooldown = 1.15;

    const actor = findPlayer(team, ev.player, "ST");
    const oppGK = isHome ? playersAway[0] : playersHome[0];

    if (type === "goal") {
      if (isHome) { scoreHome++; stats.shotsHome++; }
      else { scoreAway++; stats.shotsAway++; }

      const goalX = isHome ? HALF_W + 1.8 : -HALF_W - 1.8;
      const goalZ = (Math.random() - 0.5) * (GOAL_W * 0.65);

      actor.kickTimer = 0.45;
      if (ev.text.indexOf("КУТОВИЙ") !== -1) actor.jumpY = 1.65;

      launchBallFlight(goalX, goalZ, 2.4, 0.42, null, true);

      oppGK.diveTimer = 0.95;
      oppGK.diveDir = goalZ >= 0 ? 1 : -1;

      crowdExcitement = 1.0;
      shakeIntensity = 0.85;

      setTimeout(() => {
        if (isHome) rightNetShake = 1.0;
        else leftNetShake = 1.0;
        spawn3DConfetti(isHome ? HALF_W : -HALF_W, 0);
      }, 340);

      triggerBadge(
        isHome ? "⚽ ГОООЛ! АВРОРА!" : "⚽ ГОЛ! КАНТЕРА!",
        `${actor.name} (${ev.minute}') — Рахунок ${scoreHome}:${scoreAway}`,
        isHome ? "#fbbf24" : "#f43f5e",
        2.8
      );

      isReplaying = true;
      replayTimer = 2.4;
      timeScale = 0.38;

    } else if (type === "shot") {
      if (isHome) { stats.shotsHome++; stats.savesAway++; }
      else { stats.shotsAway++; stats.savesHome++; }

      const gkX = isHome ? HALF_W - 1.2 : -HALF_W + 1.2;
      const gkZ = (Math.random() - 0.5) * (GOAL_W * 0.55);

      actor.kickTimer = 0.4;
      launchBallFlight(gkX, gkZ, 2.1, 0.38, oppGK, true);

      oppGK.diveTimer = 0.85;
      oppGK.diveDir = gkZ >= 0 ? 1 : -1;
      shakeIntensity = 0.3;

      triggerBadge("🧤 СЕЙВ ВОРОТАРЯ!", `${oppGK.surname} рятує ворота після удару ${actor.surname}`, "#38bdf8", 1.5);

      setTimeout(() => {
        const def = isHome ? playersAway[2] : playersHome[2];
        if (def && !isPaused) {
          possessingTeam = isHome ? "away" : "home";
          launchBallFlight(def.x, def.z, 2.2, 0.65, def, false);
        }
      }, 460);

    } else if (type === "block") {
      const def = findPlayer(team, null, "CB");
      def.kickTimer = 0.35;
      const clearPeer = findPlayer(team, null, "CM");
      launchBallFlight(clearPeer.x, clearPeer.z, 2.8, 0.62, clearPeer, false);
      triggerBadge("🛡️ БЛОК ЗАХИСТУ", ev.text, "#94a3b8", 1.3);

    } else if (type === "corner") {
      if (isHome) stats.cornersHome++; else stats.cornersAway++;
      const targetBoxX = isHome ? HALF_W - 10 : -HALF_W + 10;
      const targetBoxZ = (Math.random() - 0.5) * 8;
      const jumper = findPlayer(team, null, "ST");
      jumper.targetX = targetBoxX;
      jumper.targetZ = targetBoxZ;
      jumper.jumpY = 1.4;
      launchBallFlight(targetBoxX, targetBoxZ, 6.2, 0.72, jumper, false);
      triggerBadge("🚩 ПОДАЧА КУТОВОГО", ev.text, "#4ade80", 1.5);

    } else if (type === "yel" || type === "red") {
      actor.card = type;
      triggerBadge(
        type === "red" ? "🟥 ЧЕРВОНА КАРТКА" : "🟨 ЖОВТА КАРТКА",
        actor.name,
        type === "red" ? "#ef4444" : "#facc15",
        1.8
      );

    } else {
      const pool = isHome ? playersHome : playersAway;
      const receiver = pool[5 + Math.floor(Math.random() * 5)] || pool[5];
      launchBallFlight(receiver.x, receiver.z, 1.4, 0.55, receiver, false);
    }
  }

  function updateContinuousPassPlay(dt) {
    passCooldown -= dt;
    if (passCooldown > 0 || ball.mode === "flight" || isReplaying || matchEnded) return;

    passCooldown = 0.72 + Math.random() * 0.45;
    const pool = possessingTeam === "home" ? playersHome : playersAway;
    const fieldPlayers = pool.filter(p => !p.isGK && p !== ball.carrier);
    const nextReceiver = fieldPlayers[Math.floor(Math.random() * fieldPlayers.length)];
    if (nextReceiver) {
      const leadX = nextReceiver.x + (possessingTeam === "home" ? 4.5 : -4.5);
      const leadZ = Math.max(-HALF_D + 4, Math.min(HALF_D - 4, nextReceiver.z + (Math.random() - 0.5) * 5));
      nextReceiver.targetX = Math.max(-HALF_W + 6, Math.min(HALF_W - 6, leadX));
      nextReceiver.targetZ = leadZ;
      launchBallFlight(nextReceiver.targetX, nextReceiver.targetZ, Math.random() > 0.65 ? 3.2 : 0.6, 0.54, nextReceiver, false);
    }
  }

  // Розрахунок ідеальної 3D-позиції камери для кожного з 3 варіантів
  function computeDesiredCamera() {
    if (currentVariant === 1) {
      // Варіант 1: Широка телетрансляція з центральної трибуни (видно обидва 3D-ворота та чашу стадіону)
      return {
        px: ball.x * 0.25,
        py: 38,
        pz: 74 + ball.z * 0.12,
        lx: ball.x * 0.38,
        ly: 1.5,
        lz: -3.5
      };
    } else if (currentVariant === 2) {
      // Варіант 2: Динамічна низька 3D Spidercam (камера летить над газоном за спиною атаки з видом на трибуни!)
      return {
        px: ball.x * 0.55 - 24,
        py: 12.5,
        pz: ball.z * 0.65 + 26,
        lx: ball.x * 0.85 + 14,
        ly: 2.8,
        lz: ball.z * 0.35 - 6.0
      };
    } else {
      // Варіант 3: Висока тактична VIP-панорама тренера (видно всі схеми 4-3-3 vs 4-5-1 зверху під кутом)
      return {
        px: 0,
        py: 68,
        pz: 52,
        lx: 0,
        ly: 0,
        lz: -2.0
      };
    }
  }

  const camPos = new THREE.Vector3();
  const camLookAt = new THREE.Vector3();

  function snapCameraAndTurfToVariant() {
    pitchMat.map = currentVariant === 1 ? grassTex1 : (currentVariant === 2 ? grassTex2 : grassTex3);
    pitchMat.needsUpdate = true;
    const d = computeDesiredCamera();
    camPos.set(d.px, d.py, d.pz);
    camLookAt.set(d.lx, d.ly, d.lz);
    camera.position.copy(camPos);
    camera.lookAt(camLookAt);
  }

  function resetMatch() {
    matchMinute = 0;
    eventIdx = 0;
    preppedEventIdx = -1;
    scoreHome = 0;
    scoreAway = 0;
    matchEnded = false;
    isReplaying = false;
    timeScale = 1.0;
    stats.shotsHome = 0; stats.shotsAway = 0;
    stats.savesHome = 0; stats.savesAway = 0;
    stats.cornersHome = 0; stats.cornersAway = 0;

    allPlayers.forEach(p => {
      p.x = p.baseX; p.z = p.baseZ;
      p.vx = 0; p.vz = 0;
      p.targetX = p.baseX; p.targetZ = p.baseZ;
    });
    ball.x = 0; ball.y = 0.45; ball.z = 0;
    ball.mode = "dribble";
    ball.carrier = playersHome[5];
    snapCameraAndTurfToVariant();
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
          }
          eventIdx++;
        }
        const gEv = events[i];
        matchMinute = gEv.minute;
        const isHome = gEv.team === "home";
        const scorer = findPlayer(gEv.team, gEv.player, "ST");
        scorer.x = isHome ? 35 : -35;
        scorer.z = (Math.random() - 0.5) * 10;
        ball.x = scorer.x + (isHome ? 0.8 : -0.8);
        ball.y = 0.45;
        ball.z = scorer.z;
        ball.carrier = scorer;
        executeMatchEvent(gEv);
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
    spawn3DConfetti(0, 0);
  }

  function updateSimulation(dt, nowMs) {
    updateLEDBoard(nowMs);
    updateFormationLines3D();

    if (isPaused) return;
    const effDt = dt * timeScale * speedMult;

    if (!matchEnded) {
      matchMinute += effDt * (90.0 / 108.0);
      if (matchMinute >= 90.0) {
        matchMinute = 90.0;
        matchEnded = true;
        commentary = `ФІНАЛЬНИЙ СВИСТОК! Аврора перемагає Кантеру ${scoreHome}:${scoreAway}!`;
        triggerBadge("МАТЧ ЗАВЕРШЕНО", `Підсумковий рахунок ${scoreHome}:${scoreAway}`, "#fbbf24", 4.0);
        spawn3DConfetti(0, 0);
      }

      if (eventIdx < events.length && preppedEventIdx !== eventIdx) {
        if (matchMinute >= events[eventIdx].minute - 1.2) {
          preppedEventIdx = eventIdx;
          prepareUpcomingEvent(events[eventIdx]);
        }
      }

      while (eventIdx < events.length && matchMinute >= events[eventIdx].minute) {
        executeMatchEvent(events[eventIdx]);
        eventIdx++;
      }
    }

    updateContinuousPassPlay(effDt);

    if (ball.mode === "flight") {
      ball.flightTime += effDt;
      const t = Math.min(1.0, ball.flightTime / ball.flightDur);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      if (ball.targetReceiver && !ball.isShot) {
        ball.targetX = ball.targetReceiver.x + Math.sin(ball.targetReceiver.facing) * 0.7;
        ball.targetZ = ball.targetReceiver.z + Math.cos(ball.targetReceiver.facing) * 0.7;
      }

      ball.x = ball.startX + (ball.targetX - ball.startX) * ease;
      ball.z = ball.startZ + (ball.targetZ - ball.startZ) * ease;
      ball.y = 0.45 + Math.sin(t * Math.PI) * ball.peakY;

      ballMesh.rotation.x += effDt * 14;
      ballMesh.rotation.z -= effDt * 12;

      if (t >= 1.0) {
        ball.y = 0.45;
        if (ball.targetReceiver) {
          ball.mode = "dribble";
          ball.carrier = ball.targetReceiver;
        } else {
          const midPlayer = possessingTeam === "home" ? playersAway[5] : playersHome[5];
          ball.mode = "dribble";
          ball.carrier = midPlayer;
        }
      }
    } else if (ball.carrier) {
      const c = ball.carrier;
      const dribbleX = c.x + Math.sin(c.facing) * 0.85;
      const dribbleZ = c.z + Math.cos(c.facing) * 0.85;
      ball.x += (dribbleX - ball.x) * Math.min(1.0, effDt * 14.0);
      ball.z += (dribbleZ - ball.z) * Math.min(1.0, effDt * 14.0);
      ball.y = 0.45 + Math.abs(Math.sin(c.stridePhase)) * 0.08;
      ballMesh.rotation.x += c.vz * effDt * 2.2;
      ballMesh.rotation.z -= c.vx * effDt * 2.2;
      passArcMat.opacity *= Math.pow(0.05, effDt);
    }
    ballMesh.position.set(ball.x, ball.y, ball.z);

    const teamShiftX = ball.x * 0.36;
    const teamShiftZ = ball.z * 0.25;

    for (let i = 0; i < allPlayers.length; i++) {
      const p = allPlayers[i];

      if (!p.isGK) {
        let desiredX = Math.max(-HALF_W + 4, Math.min(HALF_W - 4, p.baseX + teamShiftX));
        let desiredZ = Math.max(-HALF_D + 3, Math.min(HALF_D - 3, p.baseZ + teamShiftZ));

        if (ball.carrier === p) {
          desiredX = p.isHome ? Math.min(HALF_W - 9, p.x + 8) : Math.max(-HALF_W + 9, p.x - 8);
          desiredZ = p.z * 0.85;
        } else {
          const distToBall = Math.hypot(ball.x - p.x, ball.z - p.z);
          if (distToBall < 14.5) {
            desiredX = desiredX * 0.45 + ball.x * 0.55;
            desiredZ = desiredZ * 0.45 + ball.z * 0.55;
          }
        }
        p.targetX += (desiredX - p.targetX) * Math.min(1, effDt * 3.5);
        p.targetZ += (desiredZ - p.targetZ) * Math.min(1, effDt * 3.5);
      } else {
        p.targetX = p.baseX;
        p.targetZ = Math.max(-GOAL_W * 0.38, Math.min(GOAL_W * 0.38, ball.z * 0.22));
      }

      const dx = p.targetX - p.x;
      const dz = p.targetZ - p.z;
      const dist = Math.hypot(dx, dz);
      const maxSpd = (ball.carrier === p || dist > 10) ? 9.5 : 6.8;
      let targetVx = 0, targetVz = 0;
      if (dist > 0.15) {
        const speedFactor = Math.min(maxSpd, dist * 2.4);
        targetVx = (dx / dist) * speedFactor;
        targetVz = (dz / dist) * speedFactor;
      }

      p.vx += (targetVx - p.vx) * Math.min(1.0, effDt * 15.0);
      p.vz += (targetVz - p.vz) * Math.min(1.0, effDt * 15.0);

      p.x += p.vx * effDt;
      p.z += p.vz * effDt;

      const curSpd = Math.hypot(p.vx, p.vz);
      if (curSpd > 0.35) {
        const targetAng = Math.atan2(p.vx, p.vz);
        let diff = targetAng - p.facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.facing += diff * Math.min(1.0, effDt * 10.0);
      } else {
        const lookAng = Math.atan2(ball.x - p.x, ball.z - p.z);
        let diff = lookAng - p.facing;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.facing += diff * Math.min(1.0, effDt * 5.0);
      }

      p.stridePhase += effDt * (2.2 + curSpd * 1.65);
      const swingAmp = Math.min(0.75, curSpd * 0.095);
      const legAngle = Math.sin(p.stridePhase) * swingAmp;

      if (p.kickTimer > 0) {
        p.kickTimer = Math.max(0, p.kickTimer - effDt);
        p.rig.rightLeg.rotation.x = -Math.sin((p.kickTimer / 0.4) * Math.PI) * 1.15;
        p.rig.leftLeg.rotation.x = 0.2;
      } else {
        p.rig.leftLeg.rotation.x = legAngle;
        p.rig.rightLeg.rotation.x = -legAngle;
      }

      p.rig.leftArm.rotation.x = -legAngle * 0.8;
      p.rig.rightArm.rotation.x = legAngle * 0.8;

      if (p.jumpY > 0) p.jumpY = Math.max(0, p.jumpY - effDt * 3.8);
      if (p.diveTimer > 0) {
        p.diveTimer = Math.max(0, p.diveTimer - effDt);
        const diveSin = Math.sin((p.diveTimer / 0.9) * Math.PI);
        p.rig.bodyPivot.rotation.x = p.diveDir * diveSin * 1.25;
        p.rig.bodyPivot.position.y = diveSin * 0.65;
      } else {
        p.rig.bodyPivot.rotation.x = curSpd * 0.025;
        p.rig.bodyPivot.position.y = Math.abs(Math.sin(p.stridePhase)) * (curSpd * 0.015);
      }

      p.rig.root.position.set(p.x, p.jumpY, p.z);
      p.rig.bodyPivot.rotation.y = p.facing;

      const isActive = (ball.carrier === p) || (ball.targetReceiver === p);
      p.rig.ringMat.opacity = isActive ? 0.92 : (currentVariant === 3 ? 0.42 : 0.0);
      p.rig.badgeSprite.material.opacity = (isActive || currentVariant === 3) ? 0.98 : 0.62;
    }

    if (crowdInstancedMesh) {
      const dummy = new THREE.Object3D();
      const waveTime = nowMs * 0.0055;
      for (let i = 0; i < crowdData.length; i++) {
        const cd = crowdData[i];
        const jump = Math.max(0, Math.sin(waveTime + cd.phase)) * (0.25 + crowdExcitement * 1.35);
        dummy.position.set(cd.x, cd.baseY + jump, cd.z);
        dummy.updateMatrix();
        crowdInstancedMesh.setMatrixAt(i, dummy.matrix);
      }
      crowdInstancedMesh.instanceMatrix.needsUpdate = true;
    }

    updateGoalNets(effDt);
    crowdExcitement = Math.max(0.15, crowdExcitement - effDt * 0.3);
    if (shakeIntensity > 0) shakeIntensity = Math.max(0, shakeIntensity - effDt * 2.2);

    if (isReplaying) {
      replayTimer -= dt;
      if (replayTimer <= 0) {
        isReplaying = false;
        timeScale = 1.0;
      }
    }
    if (badgeTimer > 0) badgeTimer -= dt;

    for (let i = confettiMeshes.length - 1; i >= 0; i--) {
      const c = confettiMeshes[i];
      c.mesh.position.x += c.vx * dt;
      c.mesh.position.y += c.vy * dt;
      c.mesh.position.z += c.vz * dt;
      c.vy -= 18 * dt;
      c.mesh.rotation.x += c.rx * dt;
      c.mesh.rotation.y += c.ry * dt;
      c.life -= dt;
      if (c.mesh.position.y < 0.1) c.mesh.position.y = 0.1;
      if (c.life <= 0) {
        scene.remove(c.mesh);
        confettiMeshes.splice(i, 1);
      }
    }

    const d = computeDesiredCamera();
    const camSmooth = Math.min(1.0, dt * 4.2);
    camPos.x += (d.px - camPos.x) * camSmooth;
    camPos.y += (d.py - camPos.y) * camSmooth;
    camPos.z += (d.pz - camPos.z) * camSmooth;

    camLookAt.x += (d.lx - camLookAt.x) * camSmooth;
    camLookAt.y += (d.ly - camLookAt.y) * camSmooth;
    camLookAt.z += (d.lz - camLookAt.z) * camSmooth;

    const sx = (Math.random() - 0.5) * shakeIntensity * 1.4;
    const sy = (Math.random() - 0.5) * shakeIntensity * 1.4;
    camera.position.set(camPos.x + sx, camPos.y + sy, camPos.z);
    camera.lookAt(camLookAt.x, camLookAt.y, camLookAt.z);
  }

  // ===========================================================================
  // 7. HUD ТА ПЕРЕМИКАННЯ 3 ВАРІАНТІВ
  // ===========================================================================
  const uiButtons = [
    {
      id: "v1", x: 18, y: 10, w: 152, h: 36,
      label: "🏟️ 1. TV Стадіон 3D",
      isActive: () => currentVariant === 1,
      onClick: () => {
        currentVariant = 1;
        snapCameraAndTurfToVariant();
        triggerBadge("ВАРІАНТ 1: CHAMPIONS TV 3D", "Смугастий газон ЛЧ • Висока телекамера • Повна 3D-арена", "#38bdf8", 1.8);
      }
    },
    {
      id: "v2", x: 176, y: 10, w: 156, h: 36,
      label: "🎥 2. Камера-Павук 3D",
      isActive: () => currentVariant === 2,
      onClick: () => {
        currentVariant = 2;
        snapCameraAndTurfToVariant();
        triggerBadge("ВАРІАНТ 2: 3D SPIDERCAM", "Шаховий газон АПЛ • Низька екшн-камера з видом на трибуни", "#fbbf24", 1.8);
      }
    },
    {
      id: "v3", x: 338, y: 10, w: 152, h: 36,
      label: "📋 3. Тактика 3D VIP",
      isActive: () => currentVariant === 3,
      onClick: () => {
        currentVariant = 3;
        snapCameraAndTurfToVariant();
        triggerBadge("ВАРІАНТ 3: TACTICAL 3D VIP", "Круговий газон • Висока панорама • 3D-лінії формацій", "#4ade80", 1.8);
      }
    },
    {
      id: "goal", x: HUD_W - 365, y: 10, w: 88, h: 36,
      label: "⚽ Гол!",
      isAccent: true,
      isActive: () => false,
      onClick: () => jumpToNextGoal()
    },
    {
      id: "pause", x: HUD_W - 271, y: 10, w: 38, h: 36,
      label: () => isPaused ? "▶" : "⏸",
      isActive: () => isPaused,
      onClick: () => { isPaused = !isPaused; }
    },
    {
      id: "1x", x: HUD_W - 227, y: 10, w: 38, h: 36,
      label: "1x",
      isActive: () => speedMult === 1.0,
      onClick: () => { speedMult = 1.0; }
    },
    {
      id: "2x", x: HUD_W - 183, y: 10, w: 38, h: 36,
      label: "2x",
      isActive: () => speedMult === 2.0,
      onClick: () => { speedMult = 2.0; }
    },
    {
      id: "4x", x: HUD_W - 139, y: 10, w: 38, h: 36,
      label: "4x",
      isActive: () => speedMult === 4.0,
      onClick: () => { speedMult = 4.0; }
    },
    {
      id: "skip", x: HUD_W - 95, y: 10, w: 78, h: 36,
      label: () => matchEnded ? "↺ Старт" : "⏭ Кінець",
      isActive: () => false,
      onClick: () => { if (matchEnded) resetMatch(); else skipToEnd(); }
    }
  ];

  let fps = 60, frameCount = 0, fpsTimer = 0;

  function drawHUD() {
    ctx.clearRect(0, 0, HUD_W, HUD_H);

    const sbW = 340, sbH = 40;
    const sbX = (HUD_W - sbW) * 0.5 + 42, sbY = 8;

    ctx.save();
    ctx.fillStyle = "rgba(8, 13, 25, 0.92)";
    ctx.beginPath();
    ctx.roundRect(sbX, sbY, sbW, sbH, 9);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.arc(sbX + 19, sbY + 20, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("АВРОРА", sbX + 34, sbY + 25);

    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(sbX + sbW - 19, sbY + 20, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText("КАНТЕРА", sbX + sbW - 34, sbY + 25);

    const midX = sbX + sbW * 0.5;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(midX - 50, sbY + 5, 100, 30, 6);
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${scoreHome} : ${scoreAway}`, midX - 14, sbY + 26);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`${Math.floor(matchMinute)}'`, midX + 30, sbY + 25);

    for (let i = 0; i < uiButtons.length; i++) {
      const b = uiButtons[i];
      const active = b.isActive();
      const text = typeof b.label === "function" ? b.label() : b.label;

      ctx.fillStyle = active
        ? "#1d4ed8"
        : (b.isAccent ? "rgba(217, 119, 6, 0.92)" : "rgba(10, 16, 30, 0.88)");
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 8);
      ctx.fill();

      ctx.strokeStyle = active
        ? "#fbbf24"
        : (b.isAccent ? "#fde047" : "rgba(100, 116, 139, 0.65)");
      ctx.lineWidth = active ? 2.2 : 1.2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, b.x + b.w * 0.5, b.y + 22);
    }

    if (currentVariant === 3) {
      ctx.fillStyle = "rgba(9, 14, 26, 0.88)";
      ctx.beginPath();
      ctx.roundRect(210, HUD_H - 80, HUD_W - 420, 26, 6);
      ctx.fill();
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `📊 3D ТЕЛЕМЕТРІЯ  •  Схеми: 4-3-3 vs 4-5-1  •  Удари: ${stats.shotsHome}–${stats.shotsAway}  •  Сейви: ${stats.savesHome}–${stats.savesAway}  •  Кутові: ${stats.cornersHome}–${stats.cornersAway}  •  Володіння: ${stats.possHome}%–${stats.possAway}%`,
        HUD_W * 0.5,
        HUD_H - 63
      );
    }

    const commW = 820, commH = 38;
    const commX = (HUD_W - commW) * 0.5, commY = HUD_H - 46;
    ctx.fillStyle = "rgba(8, 12, 24, 0.90)";
    ctx.beginPath();
    ctx.roundRect(commX, commY, commW, commH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(commentary, commX + 18, commY + 24);

    ctx.fillStyle = "rgba(10, 16, 30, 0.88)";
    ctx.beginPath();
    ctx.roundRect(HUD_W - 122, HUD_H - 42, 104, 30, 6);
    ctx.fill();
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`3D FPS:${fps} V${currentVariant}`, HUD_W - 70, HUD_H - 23);

    if (badgeTimer > 0) {
      const a = Math.min(1, badgeTimer / 0.35);
      ctx.save();
      ctx.globalAlpha = a;
      const bw = 390, bh = 54;
      const bx = (HUD_W - bw) * 0.5, by = 56;
      ctx.fillStyle = "rgba(8, 12, 24, 0.94)";
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      ctx.fill();
      ctx.strokeStyle = badgeColor;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.fillStyle = badgeColor;
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(badgeTitle, HUD_W * 0.5, by + 22);

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "12px sans-serif";
      ctx.fillText(badgeSub, HUD_W * 0.5, by + 42);
      ctx.restore();
    }

    if (isReplaying) {
      ctx.fillStyle = "rgba(220, 38, 38, 0.92)";
      ctx.beginPath();
      ctx.roundRect(22, 56, 215, 28, 6);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("● 3D ПОВТОР ГОЛУ (SLOW-MO)", 34, 74);
    }

    ctx.restore();
  }

  hudCanvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const rect = hudCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (HUD_W / rect.width);
    const y = (e.clientY - rect.top) * (HUD_H / rect.height);
    for (let i = 0; i < uiButtons.length; i++) {
      const b = uiButtons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        b.onClick();
        return;
      }
    }
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Digit1") uiButtons[0].onClick();
    else if (e.code === "Digit2") uiButtons[1].onClick();
    else if (e.code === "Digit3") uiButtons[2].onClick();
    else if (e.code === "Space") isPaused = !isPaused;
    else if (e.code === "KeyG") jumpToNextGoal();
  });

  resetMatch();

  let lastTime = performance.now();
  function animate(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    frameCount++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      fps = Math.round(frameCount / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
    }

    updateSimulation(dt, now);
    renderer.render(scene, camera);
    drawHUD();

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
