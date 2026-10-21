// =============================================================================
// «ВЕРТИКАЛЬ: FOOTBALL MANAGER» — ПРОФЕСІЙНИЙ 3D WEBGL СТАДІОН ТА РУШІЙ МАТЧУ
// Реалістична графіка рівня футбольних симуляторів ПК (FIFA / PES / Football Manager 3D)
// 1. Повна 3D-арена: двоярусні трибуни з секторами, проходами, VIP-ложами, сталевими фермами даху
// 2. Реалістичний газон 2048x1024: мікро-трава, смуги/клітинка/радіальний покіс, потертості, bump-рельєф
// 3. Справжня футбольна тактика: нападники діють біля штрафного суперника (35-44м), забігання по флангах,
//    командний блок підтискає суперника при атаці, удари та голи виключно зі штрафного майданчика!
// =============================================================================

(function () {
  const container = document.getElementById("webglContainer");
  const hudCanvas = document.getElementById("hudCanvas");
  const ctx = hudCanvas.getContext("2d");

  const HUD_W = 1280;
  const HUD_H = 720;

  // Реальні розміри поля (105м x 68м)
  const PITCH_W = 105;
  const PITCH_D = 68;
  const HALF_W = PITCH_W * 0.5; // 52.5м
  const HALF_D = PITCH_D * 0.5; // 34.0м

  const urlParams = new URLSearchParams(window.location.search);
  let currentVariant = parseInt(urlParams.get("v") || "1", 10);
  if (![1, 2, 3].includes(currentVariant)) currentVariant = 1;

  // ===========================================================================
  // 1. СЦЕНА THREE.JS, РЕАЛІСТИЧНЕ СТАДІОННЕ ОСВІТЛЕННЯ ТА ТІНІ
  // ===========================================================================
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060c18);
  scene.fog = new THREE.FogExp2(0x060c18, 0.0018);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1.0, 600);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
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

  // Атмосферне блакитно-смарагдове світло нічного стадіону
  const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x064e3b, 0.52);
  hemiLight.position.set(0, 100, 0);
  scene.add(hemiLight);

  // Головний прожекторний пучок (імітація потужних щогл освітлення)
  const stadiumLight = new THREE.DirectionalLight(0xfffbeb, 1.35);
  stadiumLight.position.set(38, 92, 58);
  stadiumLight.castShadow = true;
  stadiumLight.shadow.mapSize.width = 2048;
  stadiumLight.shadow.mapSize.height = 2048;
  stadiumLight.shadow.camera.near = 10;
  stadiumLight.shadow.camera.far = 240;
  stadiumLight.shadow.camera.left = -72;
  stadiumLight.shadow.camera.right = 72;
  stadiumLight.shadow.camera.top = 54;
  stadiumLight.shadow.camera.bottom = -54;
  stadiumLight.shadow.bias = -0.0004;
  scene.add(stadiumLight);

  // Заповнююче протилежне світло для об'єму гравців
  const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
  fillLight.position.set(-42, 75, -50);
  scene.add(fillLight);

  // ===========================================================================
  // 2. РЕАЛІСТИЧНА ПРОЦЕДУРНА ТЕКСТУРА ГАЗОНУ РІВНЯ ФУТБОЛЬНОГО СИМУЛЯТОРА
  // ===========================================================================
  function drawChalkMarkings(g, c) {
    const padX = 64;
    const padY = 52;
    const pw = c.width - padX * 2;
    const ph = c.height - padY * 2;
    const cx = c.width * 0.5;
    const cy = c.height * 0.5;

    // Зони витоптаності газону (біля воріт та на 11 метрах)
    function drawWornTurf(wx, wy, rx, ry) {
      const grad = g.createRadialGradient(wx, wy, 4, wx, wy, rx);
      grad.addColorStop(0, "rgba(82, 60, 32, 0.42)");
      grad.addColorStop(0.6, "rgba(95, 78, 48, 0.22)");
      grad.addColorStop(1, "rgba(95, 78, 48, 0)");
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(wx, wy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    }
    drawWornTurf(padX + 22, cy, 54, 88);
    drawWornTurf(padX + pw - 22, cy, 54, 88);
    drawWornTurf(cx, cy, 40, 40);

    // Чітка біла крейдяна розмітка з легким розсіюванням по краях трави
    g.strokeStyle = "rgba(255, 255, 255, 0.96)";
    g.fillStyle = "rgba(255, 255, 255, 0.96)";
    g.lineWidth = 5.2;

    // Зовнішній периметр
    g.strokeRect(padX, padY, pw, ph);

    // Середня лінія
    g.beginPath();
    g.moveTo(cx, padY);
    g.lineTo(cx, padY + ph);
    g.stroke();

    // Центральне коло (радіус 9.15м)
    const circleR = ph * (9.15 / 68);
    g.beginPath();
    g.arc(cx, cy, circleR, 0, Math.PI * 2);
    g.stroke();

    // Центральна точка
    g.beginPath();
    g.arc(cx, cy, 7.5, 0, Math.PI * 2);
    g.fill();

    const boxW = pw * (16.5 / 105);
    const boxH = ph * (40.3 / 68);
    const smallW = pw * (5.5 / 105);
    const smallH = ph * (18.3 / 68);
    const penDist = pw * (11.0 / 105);

    // Лівий штрафний майданчик
    g.strokeRect(padX, cy - boxH * 0.5, boxW, boxH);
    g.strokeRect(padX, cy - smallH * 0.5, smallW, smallH);
    g.beginPath();
    g.arc(padX + penDist, cy, 6.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(padX + penDist, cy, circleR, -0.92, 0.92);
    g.stroke();

    // Правий штрафний майданчик
    g.strokeRect(padX + pw - boxW, cy - boxH * 0.5, boxW, boxH);
    g.strokeRect(padX + pw - smallW, cy - smallH * 0.5, smallW, smallH);
    g.beginPath();
    g.arc(padX + pw - penDist, cy, 6.5, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(padX + pw - penDist, cy, circleR, Math.PI - 0.92, Math.PI + 0.92);
    g.stroke();

    // 4 Кутові сектори (радіус 1м)
    const cR = 19;
    [[padX, padY, 0, Math.PI * 0.5],
     [padX + pw, padY, Math.PI * 0.5, Math.PI],
     [padX + pw, padY + ph, Math.PI, Math.PI * 1.5],
     [padX, padY + ph, Math.PI * 1.5, Math.PI * 2]].forEach(([x, y, a1, a2]) => {
      g.beginPath();
      g.arc(x, y, cR, a1, a2);
      g.stroke();
    });

    // Технічні зони тренерів біля бровки
    g.strokeStyle = "rgba(255, 255, 255, 0.45)";
    g.lineWidth = 3.0;
    g.strokeRect(cx - 180, padY + ph + 8, 120, 24);
    g.strokeRect(cx + 60, padY + ph + 8, 120, 24);
  }

  function createProfessionalPitchTexture(variantId) {
    const c = document.createElement("canvas");
    c.width = 2048;
    c.height = 1024;
    const g = c.getContext("2d");

    if (variantId === 1) {
      // Варіант 1: Ліга Чемпіонів — смарагдовий смугастий газон преміум-класу
      const stripes = 18;
      const sw = c.width / stripes;
      for (let i = 0; i < stripes; i++) {
        g.fillStyle = i % 2 === 0 ? "#124924" : "#1a5e30";
        g.fillRect(i * sw, 0, sw + 1, c.height);
      }
    } else if (variantId === 2) {
      // Варіант 2: АПЛ — елітний шаховий газон Wembley з чергуванням відтінків
      const cols = 20, rows = 12;
      const cw = c.width / cols, rh = c.height / rows;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          g.fillStyle = (i + j) % 2 === 0 ? "#145228" : "#0e3e1d";
          g.fillRect(i * cw, j * rh, cw + 1, rh + 1);
        }
      }
    } else {
      // Варіант 3: Тактичний Camp Nou — концентричні кільця покосу
      g.fillStyle = "#0d3f20";
      g.fillRect(0, 0, c.width, c.height);
      const cx = c.width * 0.5, cy = c.height * 0.5;
      for (let r = 1300; r > 40; r -= 78) {
        g.fillStyle = Math.round(r / 78) % 2 === 0 ? "#16552b" : "#0e4121";
        g.beginPath();
        g.arc(cx, cy, r, 0, Math.PI * 2);
        g.fill();
      }
    }

    // 25 000 мікро-травинок та зернистість структури дерну
    for (let i = 0; i < 26000; i++) {
      const rx = Math.random() * c.width;
      const ry = Math.random() * c.height;
      g.fillStyle = Math.random() > 0.45 ? "rgba(167, 243, 208, 0.08)" : "rgba(3, 25, 10, 0.14)";
      g.fillRect(rx, ry, 2, 4);
    }

    drawChalkMarkings(g, c);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  const pitchTex1 = createProfessionalPitchTexture(1);
  const pitchTex2 = createProfessionalPitchTexture(2);
  const pitchTex3 = createProfessionalPitchTexture(3);

  // Bump-карта рельєфу трави
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = 512;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext("2d");
  bCtx.fillStyle = "#808080";
  bCtx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 18000; i++) {
    bCtx.fillStyle = Math.random() > 0.5 ? "#b8b8b8" : "#484848";
    bCtx.fillRect(Math.random() * 512, Math.random() * 256, 2, 3);
  }
  const pitchBump = new THREE.CanvasTexture(bumpCanvas);
  pitchBump.wrapS = THREE.RepeatWrapping;
  pitchBump.wrapT = THREE.RepeatWrapping;
  pitchBump.repeat.set(10, 6);

  // 3D-геометрія поля з природним дренажним куполом
  const pitchGeo = new THREE.PlaneGeometry(PITCH_W + 6.8, PITCH_D + 6.2, 54, 36);
  pitchGeo.rotateX(-Math.PI * 0.5);
  const posAttr = pitchGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const pz = posAttr.getZ(i);
    const crown = Math.max(0, 1 - (px * px) / 3600 - (pz * pz) / 1600) * 0.24;
    posAttr.setY(i, crown);
  }
  pitchGeo.computeVertexNormals();

  const pitchMat = new THREE.MeshStandardMaterial({
    map: currentVariant === 1 ? pitchTex1 : (currentVariant === 2 ? pitchTex2 : pitchTex3),
    bumpMap: pitchBump,
    bumpScale: 0.11,
    roughness: 0.72,
    metalness: 0.05
  });
  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.receiveShadow = true;
  scene.add(pitchMesh);

  // Доріжка навколо поля (асфальт + гумова бровка)
  const apronGeo = new THREE.PlaneGeometry(186, 134);
  apronGeo.rotateX(-Math.PI * 0.5);
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x091410, roughness: 0.94 });
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.position.y = -0.06;
  apronMesh.receiveShadow = true;
  scene.add(apronMesh);

  // Прапорці в 4 кутах
  function addCornerFlags() {
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    const flagGeo = new THREE.PlaneGeometry(0.75, 0.48);
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
  // 3. АРХІТЕКТУРА 3D-СТАДІОНУ РІВНЯ ФУТБОЛЬНИХ СИМУЛЯТОРІВ
  //    (Двоярусні трибуни, сектори, жовті сходи, VIP-скло, ферми даху, щогли)
  // ===========================================================================
  function createCrowdTexture(isHomeEnd) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d");

    // Бетонна основа трибун зі східцями
    g.fillStyle = "#161f33";
    g.fillRect(0, 0, c.width, c.height);

    // Ряди глядацьких сидінь
    const rows = 28;
    const rH = c.height / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rH;
      // Тінь під рядом
      g.fillStyle = "rgba(0, 0, 0, 0.45)";
      g.fillRect(0, y + rH - 3, c.width, 3);

      // Глядачі у футболках клубних кольорів
      const fans = 90;
      const fW = c.width / fans;
      for (let f = 0; f < fans; f++) {
        if (Math.random() < 0.08) continue; // Порожнє місце
        const x = f * fW;
        let col = "#1e40af"; // Синій (Аврора)
        const rnd = Math.random();
        if (isHomeEnd) {
          if (rnd < 0.65) col = "#2563eb"; // Синій
          else if (rnd < 0.85) col = "#fbbf24"; // Золотий
          else col = "#e2e8f0"; // Білий
        } else {
          if (rnd < 0.60) col = "#dc2626"; // Червоний (Кантера)
          else if (rnd < 0.82) col = "#991b1b"; // Бордовий
          else col = "#f8fafc";
        }
        g.fillStyle = col;
        // Тіло глядача
        g.fillRect(x + 1, y + 4, fW - 2, rH * 0.55);
        // Голова
        g.fillStyle = "#fed7aa";
        g.beginPath();
        g.arc(x + fW * 0.5, y + 4, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }

    // Жовті сходи-проходи між секторами (як на справжніх стадіонах)
    const aisles = [120, 340, 560, 780, 960];
    aisles.forEach(ax => {
      g.fillStyle = "#eab308";
      g.fillRect(ax - 8, 0, 16, c.height);
      g.fillStyle = "rgba(0, 0, 0, 0.25)";
      g.fillRect(ax - 2, 0, 4, c.height);
    });

    // Фанатські банери на огорожах
    g.fillStyle = "#0f172a";
    g.fillRect(0, c.height - 30, c.width, 30);
    g.fillStyle = "#fbbf24";
    g.font = "bold 16px sans-serif";
    g.fillText("⚡ АВРОРА ВПЕРЕД! • VERTICAL FOOTBALL • ULTRA ULTRAS ⚡", 60, c.height - 10);
    g.fillText("⚡ ТІЛЬКИ ПЕРЕМОГА! • DIVISION 1 ROAD TO GLORY ⚡", 560, c.height - 10);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1.5, 1);
    return tex;
  }

  const crowdHomeTex = createCrowdTexture(true);
  const crowdAwayTex = createCrowdTexture(false);

  // 3D LED-борти з анімацією біжучого рядка
  const ledCanvas = document.createElement("canvas");
  ledCanvas.width = 1024;
  ledCanvas.height = 64;
  const ledCtx = ledCanvas.getContext("2d");
  const ledTexture = new THREE.CanvasTexture(ledCanvas);
  ledTexture.wrapS = THREE.RepeatWrapping;
  ledTexture.repeat.set(2, 1);

  function updateLEDBoard(nowMs) {
    ledCtx.fillStyle = "#060913";
    ledCtx.fillRect(0, 0, 1024, 64);
    ledCtx.strokeStyle = "#38bdf8";
    ledCtx.lineWidth = 3;
    ledCtx.strokeRect(0, 1, 1024, 62);

    const offset = (nowMs * 0.09) % 512;
    ledCtx.font = "bold 26px sans-serif";
    for (let i = -1; i < 3; i++) {
      ledCtx.fillStyle = "#fbbf24";
      ledCtx.fillText("⚡ ВЕРТИКАЛЬ FOOTBALL MANAGER", i * 512 - offset + 15, 42);
      ledCtx.fillStyle = "#38bdf8";
      ledCtx.fillText("• СЕЗОН 1: ШЛЯХ ДО Д1 •", i * 512 - offset + 260, 42);
    }
    ledTexture.needsUpdate = true;
  }

  function buildProfessionalStadium() {
    const stadium = new THREE.Group();

    // 1. LED Рекламні борти навколо всього поля
    const ledMat = new THREE.MeshBasicMaterial({ map: ledTexture, side: THREE.DoubleSide });
    const northLed = new THREE.Mesh(new THREE.PlaneGeometry(116, 1.45), ledMat);
    northLed.position.set(0, 0.75, -HALF_D - 3.4);
    stadium.add(northLed);

    const westLed = new THREE.Mesh(new THREE.PlaneGeometry(76, 1.45), ledMat);
    westLed.rotation.y = Math.PI * 0.5;
    westLed.position.set(-HALF_W - 4.0, 0.75, 0);
    stadium.add(westLed);

    const eastLed = new THREE.Mesh(new THREE.PlaneGeometry(76, 1.45), ledMat);
    eastLed.rotation.y = -Math.PI * 0.5;
    eastLed.position.set(HALF_W + 4.0, 0.75, 0);
    stadium.add(eastLed);

    // 2. Двоярусні трибуни з VIP-ложами
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.88 });
    const roofTrussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.35 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0a101f, metalness: 0.4, roughness: 0.3 });
    const vipGlassMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.55,
      metalness: 0.8,
      roughness: 0.1
    });

    function createProStand(width, distZ, rotY, isNorth, hasRoof = true) {
      const standGroup = new THREE.Group();
      standGroup.rotation.y = rotY;

      // Нижній ярус трибуни (Lower Tier)
      const lowerGeo = new THREE.PlaneGeometry(width, 18);
      lowerGeo.rotateX(-0.55);
      const lowerMesh = new THREE.Mesh(lowerGeo, new THREE.MeshBasicMaterial({
        map: isNorth ? crowdHomeTex : crowdAwayTex,
        side: THREE.DoubleSide
      }));
      lowerMesh.position.set(0, 5.2, -distZ - 6.5);
      standGroup.add(lowerMesh);

      // VIP-ярус зі скляними ложами (Club Level Suites)
      const vipWall = new THREE.Mesh(new THREE.BoxGeometry(width, 3.2, 2.5), concreteMat);
      vipWall.position.set(0, 11.2, -distZ - 14.5);
      const vipGlass = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 2.4, 0.3), vipGlassMat);
      vipGlass.position.set(0, 11.2, -distZ - 13.2);
      standGroup.add(vipWall, vipGlass);

      // Верхній ярус трибуни (Upper Tier)
      const upperGeo = new THREE.PlaneGeometry(width + 8, 22);
      upperGeo.rotateX(-0.68);
      const upperMesh = new THREE.Mesh(upperGeo, new THREE.MeshBasicMaterial({
        map: isNorth ? crowdHomeTex : crowdAwayTex,
        side: THREE.DoubleSide
      }));
      upperMesh.position.set(0, 19.8, -distZ - 21.5);
      standGroup.add(upperMesh);

      // Задня опорна стіна стадіону
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(width + 12, 34, 3.0), concreteMat);
      backWall.position.set(0, 17, -distZ - 30);
      standGroup.add(backWall);

      if (hasRoof) {
        // Дах стадіону з консольними фермами
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(width + 14, 0.9, 28), canopyMat);
      canopy.position.set(0, 32.5, -distZ - 17);
      canopy.rotation.x = 0.08;
      standGroup.add(canopy);

      // Сталеві ферми під дахом (Lattice Girders)
      const trussCount = 6;
      for (let t = 0; t < trussCount; t++) {
        const tx = -width * 0.44 + t * (width * 0.88 / (trussCount - 1));
        const truss = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 26), roofTrussMat);
        truss.position.set(tx, 31.0, -distZ - 17);
        standGroup.add(truss);
      }

      // Світлова панель під дахом (Floodlight Ribbon)
      const lightRibbonMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
      const lightRibbon = new THREE.Mesh(new THREE.BoxGeometry(width * 0.88, 0.6, 0.8), lightRibbonMat);
      lightRibbon.position.set(0, 31.2, -distZ - 4.2);
      standGroup.add(lightRibbon);
      }

      stadium.add(standGroup);
    }

    createProStand(164, HALF_D + 5.5, 0, true, true);              // Північна трибуна з дахом
    createProStand(122, HALF_W + 6.8, Math.PI * 0.5, true, true);  // Західна трибуна з дахом
    createProStand(122, HALF_W + 6.8, -Math.PI * 0.5, false, true);// Східна трибуна з дахом
    createProStand(160, HALF_D + 7.5, Math.PI, false, false);      // Південна ТВ-трибуна (відкрита для камери)

    // 3. Лави запасних із тренерами та запасними (Dugouts)
    const dugoutMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 });
    [-18, 18].forEach((dx, isAway) => {
      const dg = new THREE.Group();
      const acrylic = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.4, 0.2), vipGlassMat);
      acrylic.position.set(0, 1.2, 1.1);
      const canopyD = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.25, 2.4), dugoutMat);
      canopyD.position.set(0, 2.4, 0);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.6, 0.8), dugoutMat);
      bench.position.set(0, 0.35, 0.3);
      dg.add(acrylic, canopyD, bench);

      // Фігурки тренерів та запасних на лаві
      for (let s = 0; s < 5; s++) {
        const sub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.28, 0.9, 8),
          new THREE.MeshStandardMaterial({ color: isAway ? 0xdc2626 : 0x2563eb })
        );
        sub.position.set(-3.6 + s * 1.8, 0.8, 0.3);
        dg.add(sub);
      }
      dg.position.set(dx, 0, HALF_D + 3.8);
      stadium.add(dg);
    });

    // 4. Щогли прожекторів з галогеновими спалахами у 4 кутах
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    [[-68, -46], [68, -46], [-68, 46], [68, 46]].forEach(([tx, tz]) => {
      const tGroup = new THREE.Group();
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.3, 38, 8), towerMat);
      p1.position.y = 19;
      const head = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.2, 1.4), lampMat);
      head.position.set(0, 38, 0);
      head.lookAt(0, 0, 0);
      tGroup.add(p1, head);
      tGroup.position.set(tx, 0, tz);
      stadium.add(tGroup);
    });

    scene.add(stadium);
  }
  buildProfessionalStadium();

  // ===========================================================================
  // 4. СУЧАСНІ ЄВРОПЕЙСЬКІ 3D-ВОРОТА З НАТЯЖНИМИ ОПОРАМИ ТА ДЕФОРМАЦІЄЮ СІТКИ
  // ===========================================================================
  const GOAL_W = 10.4;
  const GOAL_H = 3.65;
  const GOAL_D = 3.2;

  let leftNetGeo = null, rightNetGeo = null;
  let leftNetBase = null, rightNetBase = null;
  let leftShake = 0, rightShake = 0, netWave = 0;

  function buildModernGoal(isLeft) {
    const dir = isLeft ? -1 : 1;
    const goalX = isLeft ? -HALF_W : HALF_W;
    const gGroup = new THREE.Group();
    gGroup.position.set(goalX, 0, 0);

    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0.15
    });
    const stanchionMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.25
    });

    const pr = 0.18;
    // Ліва і права штанги
    const lp = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, GOAL_H, 14), postMat);
    lp.position.set(0, GOAL_H * 0.5, -GOAL_W * 0.5);
    lp.castShadow = true;

    const rp = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, GOAL_H, 14), postMat);
    rp.position.set(0, GOAL_H * 0.5, GOAL_W * 0.5);
    rp.castShadow = true;

    // Перекладина
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, GOAL_W + pr * 2, 14), postMat);
    cross.rotation.x = Math.PI * 0.5;
    cross.position.set(0, GOAL_H, 0);
    cross.castShadow = true;

    // Задні натяжні штанги-опори (Stanchions)
    const stL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 8), stanchionMat);
    stL.position.set(dir * GOAL_D * 0.85, GOAL_H * 0.6, -GOAL_W * 0.5);
    stL.rotation.z = dir * 0.35;

    const stR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.4, 8), stanchionMat);
    stR.position.set(dir * GOAL_D * 0.85, GOAL_H * 0.6, GOAL_W * 0.5);
    stR.rotation.z = dir * 0.35;

    gGroup.add(lp, rp, cross, stL, stR);

    // Глибинна сітка воріт
    const netGeo = new THREE.BoxGeometry(GOAL_D, GOAL_H, GOAL_W, 6, 6, 12);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      wireframe: true,
      transparent: true,
      opacity: 0.68
    });
    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(dir * GOAL_D * 0.5, GOAL_H * 0.5, 0);
    gGroup.add(netMesh);

    const baseArr = new Float32Array(netGeo.attributes.position.array);
    if (isLeft) { leftNetGeo = netGeo; leftNetBase = baseArr; }
    else { rightNetGeo = netGeo; rightNetBase = baseArr; }

    scene.add(gGroup);
  }
  buildModernGoal(true);
  buildModernGoal(false);

  function updateGoalNets(dt) {
    netWave += dt * 28;
    leftShake *= Math.pow(0.04, dt);
    rightShake *= Math.pow(0.04, dt);

    function deform(geo, base, shake, dir) {
      if (!geo || shake < 0.005) return;
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3], by = base[i * 3 + 1], bz = base[i * 3 + 2];
        const isBack = (dir < 0 && bx < 0) || (dir > 0 && bx > 0);
        if (isBack) {
          const w = Math.sin(netWave + by * 2.0 + bz * 1.2) * shake * 1.1;
          pos.setXYZ(i, bx + dir * shake * 1.35 + w, by, bz + w * 0.4);
        } else {
          pos.setXYZ(i, bx, by, bz);
        }
      }
      pos.needsUpdate = true;
    }
    deform(leftNetGeo, leftNetBase, leftShake, -1);
    deform(rightNetGeo, rightNetBase, rightShake, 1);
  }

  // ===========================================================================
  // 5. СКЕЛЕТНІ 3D-ГРАВЦІ ТА РЕАЛІСТИЧНА ФУТБОЛЬНА ТАКТИКА (4-3-3 vs 4-5-1)
  //    (Нападники живуть біля штрафного 35-44м, забігання вінгерів, пресинг)
  // ===========================================================================
  const playersHome = [];
  const playersAway = [];
  const allPlayers = [];
  const allPlayersMap = {};

  function shortSurname(fullName) {
    if (!fullName) return "";
    const p = fullName.trim().split(/\s+/);
    return p[p.length - 1];
  }

  function createPlayerBadgeTexture(num, surname, isHome, isGK, role) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 76;
    const g = c.getContext("2d");

    g.fillStyle = "rgba(7, 12, 24, 0.90)";
    g.beginPath();
    g.roundRect(10, 10, 236, 56, 28);
    g.fill();

    g.strokeStyle = isHome ? "#fbbf24" : "#f43f5e";
    g.lineWidth = 3.2;
    g.stroke();

    // Номер гравця у колі
    g.fillStyle = isGK ? "#10b981" : (isHome ? "#2563eb" : "#e11d48");
    g.beginPath();
    g.arc(42, 38, 20, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#ffffff";
    g.font = "bold 20px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(String(num), 42, 39);

    // Прізвище та роль
    g.fillStyle = "#f8fafc";
    g.font = "bold 21px sans-serif";
    g.textAlign = "left";
    g.fillText(surname.slice(0, 10), 72, 33);

    g.fillStyle = isHome ? "#fbbf24" : "#94a3b8";
    g.font = "bold 13px monospace";
    g.fillText(role || "", 72, 53);

    return new THREE.CanvasTexture(c);
  }

  function build3DPlayerModel(isHome, isGK, num, surname, role) {
    const root = new THREE.Group();
    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    const kitHex = isGK ? (isHome ? 0x10b981 : 0xf59e0b) : (isHome ? 0x2563eb : 0xe11d48);
    const shortsHex = isGK ? 0x111827 : (isHome ? 0x0f172a : 0xffffff);
    const socksHex = isHome ? 0x1d4ed8 : 0xbe123c;

    const kitMat = new THREE.MeshStandardMaterial({ color: kitHex, roughness: 0.45 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: shortsHex, roughness: 0.55 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf3c58d, roughness: 0.5 });
    const hairMat = new THREE.MeshStandardMaterial({ color: num % 2 === 0 ? 0x18181b : 0x54331b, roughness: 0.75 });
    const sockMat = new THREE.MeshStandardMaterial({ color: socksHex, roughness: 0.5 });
    const bootMat = new THREE.MeshStandardMaterial({ color: isHome ? 0xfbbf24 : 0x111827, roughness: 0.3 });

    // Торс з клубною смугою
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.05, 0.48), kitMat);
    torso.position.y = 1.52;
    torso.castShadow = true;
    bodyPivot.add(torso);

    // Голова та зачіска
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 14), skinMat);
    head.position.y = 2.32;
    head.castShadow = true;
    bodyPivot.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.345, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
    hair.position.y = 2.36;
    hair.rotation.x = -0.15;
    bodyPivot.add(hair);

    // Руки
    function makeArm(side) {
      const armPivot = new THREE.Group();
      armPivot.position.set(side * 0.54, 1.92, 0);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.40, 8), kitMat);
      sleeve.position.y = -0.18;
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.46, 8), skinMat);
      forearm.position.y = -0.54;
      armPivot.add(sleeve, forearm);
      bodyPivot.add(armPivot);
      return armPivot;
    }
    const leftArm = makeArm(-1);
    const rightArm = makeArm(1);

    // Ноги (стегна, гомілки, бутси)
    function makeLeg(side) {
      const legPivot = new THREE.Group();
      legPivot.position.set(side * 0.23, 1.0, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.46, 8), shortsMat);
      thigh.position.y = -0.22;
      thigh.castShadow = true;
      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.48, 8), sockMat);
      calf.position.y = -0.64;
      calf.castShadow = true;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.44), bootMat);
      boot.position.set(0, -0.92, 0.08);
      legPivot.add(thigh, calf, boot);
      bodyPivot.add(legPivot);
      return legPivot;
    }
    const leftLeg = makeLeg(-1);
    const rightLeg = makeLeg(1);

    // Кільце виділення під ногами активного гравця
    const ringGeo = new THREE.RingGeometry(0.95, 1.25, 28);
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

    // 3D-бейдж над головою
    const badgeTex = createPlayerBadgeTexture(num, surname, isHome, isGK, role);
    const badgeMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true, depthTest: false });
    const badgeSprite = new THREE.Sprite(badgeMat);
    badgeSprite.scale.set(3.6, 1.15, 1);
    badgeSprite.position.y = 3.35;
    root.add(badgeSprite);

    scene.add(root);
    return { root, bodyPivot, leftArm, rightArm, leftLeg, rightLeg, ringMat, badgeSprite };
  }

  // ===========================================================================
  // АВТЕНТИЧНІ ТАКТИЧНІ КООРДИНАТИ НА ВСЬОМУ ПОЛІ (4-3-3 vs 4-5-1)
  // Нападники починають і діють ГЛИБОКО НА ПОЛОВИНІ СУПЕРНИКА!
  // ===========================================================================
  const homeFormationSlots = [
    { role: "GK",  baseX: -48.0, baseZ: 0.0 },   // Воротар
    { role: "LB",  baseX: -26.0, baseZ: -23.0 }, // Лівий захисник
    { role: "CB1", baseX: -32.0, baseZ: -7.5 },  // Центрбек 1
    { role: "CB2", baseX: -32.0, baseZ: 7.5 },   // Центрбек 2
    { role: "RB",  baseX: -26.0, baseZ: 23.0 },  // Правий захисник
    { role: "DM",  baseX: -14.0, baseZ: 0.0 },   // Опорний півзахисник
    { role: "LCM", baseX: 4.0,   baseZ: -14.0 }, // Центральний півзахисник
    { role: "RCM", baseX: 6.0,   baseZ: 14.0 },  // Центральний півзахисник
    { role: "LW",  baseX: 28.0,  baseZ: -24.0 }, // Лівий вінгер (в зоні атаки!)
    { role: "ST",  baseX: 35.0,  baseZ: 0.0 },   // ЦЕНТРАЛЬНИЙ НАПАДНИК (біля штрафного суперника!)
    { role: "RW",  baseX: 28.0,  baseZ: 24.0 }   // Правий вінгер (в зоні атаки!)
  ];

  const awayFormationSlots = [
    { role: "GK",  baseX: 48.0,  baseZ: 0.0 },   // Воротар Кантери
    { role: "RB",  baseX: 26.0,  baseZ: -23.0 }, // Захисник
    { role: "CB1", baseX: 32.0,  baseZ: -7.5 },  // Центрбек 1
    { role: "CB2", baseX: 32.0,  baseZ: 7.5 },   // Центрбек 2
    { role: "LB",  baseX: 26.0,  baseZ: 23.0 },  // Захисник
    { role: "DM",  baseX: 14.0,  baseZ: 0.0 },   // Опорник
    { role: "RM",  baseX: 0.0,   baseZ: -22.0 }, // Правий півзахисник
    { role: "CM1", baseX: -4.0,  baseZ: -8.0 },  // Центр півзахисту
    { role: "CM2", baseX: -4.0,  baseZ: 8.0 },   // Центр півзахисту
    { role: "LM",  baseX: 0.0,   baseZ: 22.0 },  // Лівий півзахисник
    { role: "ST",  baseX: -28.0, baseZ: 0.0 }    // Нападник Кантери (на половині Аврори!)
  ];

  function initPlayers3D() {
    const hp = (MATCH_DATA.home && MATCH_DATA.home.players) || [];
    hp.forEach((p, idx) => {
      const slot = homeFormationSlots[idx] || homeFormationSlots[0];
      const num = p.number || (idx + 1);
      const surname = shortSurname(p.name);
      const rig = build3DPlayerModel(true, p.slot === "GK", num, surname, slot.role);
      const obj = {
        name: p.name, surname, number: num, slot: p.slot || slot.role, role: slot.role,
        isHome: true, isGK: p.slot === "GK",
        baseX: slot.baseX, baseZ: slot.baseZ,
        x: slot.baseX, z: slot.baseZ, vx: 0, vz: 0,
        targetX: slot.baseX, targetZ: slot.baseZ,
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
      const slot = awayFormationSlots[idx] || awayFormationSlots[0];
      const num = p.number || (idx + 1);
      const surname = shortSurname(p.name);
      const rig = build3DPlayerModel(false, p.slot === "GK", num, surname, slot.role);
      const obj = {
        name: p.name, surname, number: num, slot: p.slot || slot.role, role: slot.role,
        isHome: false, isGK: p.slot === "GK",
        baseX: slot.baseX, baseZ: slot.baseZ,
        x: slot.baseX, z: slot.baseZ, vx: 0, vz: 0,
        targetX: slot.baseX, targetZ: slot.baseZ,
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

  // 3D-лінії тактичної схеми (для Варіанту 3 — Тактика 3D VIP)
  function createFormationLine(colorHex, count) {
    const pts = [];
    for (let i = 0; i < count; i++) pts.push(new THREE.Vector3(0, 0.22, 0));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.0 });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    return { geo, mat };
  }
  const homeDefLine = createFormationLine(0x38bdf8, 4);
  const homeMidLine = createFormationLine(0x38bdf8, 3);
  const homeAttLine = createFormationLine(0x38bdf8, 3);
  const awayDefLine = createFormationLine(0xf43f5e, 4);
  const awayMidLine = createFormationLine(0xf43f5e, 5);

  function updateFormationLines3D() {
    const show = currentVariant === 3;
    const op = show ? 0.75 : 0.0;
    homeDefLine.mat.opacity = op;
    homeMidLine.mat.opacity = op;
    homeAttLine.mat.opacity = op;
    awayDefLine.mat.opacity = op;
    awayMidLine.mat.opacity = op;
    if (!show) return;

    function syncLine(lineObj, pool, indices) {
      const group = indices.map(i => pool[i]).filter(Boolean).sort((a, b) => a.z - b.z);
      const pos = lineObj.geo.attributes.position;
      for (let i = 0; i < group.length; i++) {
        pos.setXYZ(i, group[i].x, 0.24, group[i].z);
      }
      pos.needsUpdate = true;
    }
    syncLine(homeDefLine, playersHome, [1, 2, 3, 4]);
    syncLine(homeMidLine, playersHome, [5, 6, 7]);
    syncLine(homeAttLine, playersHome, [8, 9, 10]);
    syncLine(awayDefLine, playersAway, [1, 2, 3, 4]);
    syncLine(awayMidLine, playersAway, [5, 6, 7, 8, 9]);
  }

  // 3D М'яч
  const ballGeo = new THREE.IcosahedronGeometry(0.44, 2);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.08 });
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  scene.add(ballMesh);

  // Дуга польоту м'яча
  const arcPts = [];
  for (let i = 0; i <= 24; i++) arcPts.push(new THREE.Vector3(0, 0.2, 0));
  const passArcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
  const passArcMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 });
  const passArcLine = new THREE.Line(passArcGeo, passArcMat);
  scene.add(passArcLine);

  // Святкове 3D-конфеті при голі
  const confettiMeshes = [];
  const confettiGeo = new THREE.PlaneGeometry(0.45, 0.28);
  const confettiColors = [0xfbbf24, 0x38bdf8, 0xffffff, 0x4ade80, 0xf43f5e];

  function spawnGoalConfetti(worldX, worldZ) {
    for (let i = 0; i < 110; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: confettiColors[i % confettiColors.length],
        side: THREE.DoubleSide
      });
      const m = new THREE.Mesh(confettiGeo, mat);
      m.position.set(worldX + (Math.random() - 0.5) * 6, 2.5 + Math.random() * 4, worldZ + (Math.random() - 0.5) * 10);
      const ang = Math.random() * Math.PI * 2;
      const spd = 6 + Math.random() * 15;
      scene.add(m);
      confettiMeshes.push({
        mesh: m,
        vx: Math.cos(ang) * spd,
        vy: 9 + Math.random() * 15,
        vz: Math.sin(ang) * spd,
        rx: (Math.random() - 0.5) * 10,
        ry: (Math.random() - 0.5) * 10,
        life: 2.5 + Math.random() * 1.2
      });
    }
  }

  // ===========================================================================
  // 6. ХОРЕОГРАФІЯ ТА ФУТБОЛЬНА ЛОГІКА ПОДІЙ (АТАКИ, КОНСТРУКТИВНІ ПАСИ)
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
    x: 0, y: 0.44, z: 0,
    mode: "dribble",
    carrier: playersHome[5], // Починає опорник у центрі
    startX: 0, startY: 0.44, startZ: 0,
    targetX: 0, targetY: 0.44, targetZ: 0,
    targetReceiver: null,
    peakY: 1.5,
    flightTime: 0,
    flightDur: 0.55,
    isShot: false
  };

  let possessingTeam = "home";
  let attackStage = 0; // 0: build-up, 1: progression, 2: final third attack
  let passCooldown = 0.8;
  let shakeIntensity = 0;
  let isReplaying = false, replayTimer = 0;

  let commentary = "Матч розпочався! Аврора (4-3-3) проти Кантери (4-5-1).";
  let badgeTitle = "", badgeSub = "", badgeColor = "#38bdf8", badgeTimer = 0;

  function triggerBadge(title, sub, color, dur = 2.2) {
    badgeTitle = title;
    badgeSub = sub || "";
    badgeColor = color;
    badgeTimer = dur;
  }

  function findPlayer(team, name, fallbackRole) {
    if (name && allPlayersMap[name]) return allPlayersMap[name];
    const pool = team === "home" ? playersHome : playersAway;
    if (fallbackRole) {
      const match = pool.find(p => p.role === fallbackRole);
      if (match) return match;
    }
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
    ball.targetY = 0.44;
    ball.targetZ = tz;
    ball.targetReceiver = receiver;
    ball.peakY = peakY;
    ball.flightDur = Math.max(0.26, dur);
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
    passArcMat.opacity = currentVariant === 3 ? 0.92 : 0.35;
  }

  // Завчасна підготовка події (за 1.2 хв до удару/голу)
  // Нападник та вінгери НАБІГАЮТЬ ПРЯМО В ШТРАФНИЙ МАЙДАНЧИК СУПЕРНИКА!
  function prepareUpcomingEvent(ev) {
    const team = ev.team || "home";
    const isHome = team === "home";
    possessingTeam = team;
    const actor = findPlayer(team, ev.player, "ST");

    if (ev.type === "goal" || ev.type === "shot" || ev.type === "block") {
      // Точка удару строго в межах або на лінії штрафного майданчика (36м - 44м)
      const attackX = isHome ? 38 + Math.random() * 5 : -38 - Math.random() * 5;
      const attackZ = (Math.random() - 0.5) * 14;
      actor.targetX = attackX;
      actor.targetZ = attackZ;

      // Підготовчий простріл або розрізний пас під удар у штрафний
      if (ball.carrier !== actor) {
        launchBallFlight(attackX, attackZ, 1.6, 0.58, actor, false);
      }
    } else if (ev.type === "stop") {
      const z = ev.zone === "L" ? -22 : (ev.zone === "R" ? 22 : 0);
      const x = isHome ? 22 : -22;
      actor.targetX = x;
      actor.targetZ = z;
      if (ball.carrier !== actor) {
        launchBallFlight(x, z, 1.2, 0.52, actor, false);
      }
    } else if (ev.type === "corner") {
      const cx = isHome ? HALF_W - 0.8 : -HALF_W + 0.8;
      const cz = -HALF_D + 0.8;
      actor.targetX = cx;
      actor.targetZ = cz;
      launchBallFlight(cx, cz, 1.3, 0.56, actor, false);
    }
  }

  function executeMatchEvent(ev) {
    const type = ev.type;
    const team = ev.team || "home";
    const isHome = team === "home";
    possessingTeam = team;
    commentary = `[${ev.minute}'] ${ev.text}`;
    passCooldown = 1.1;

    const actor = findPlayer(team, ev.player, "ST");
    const oppGK = isHome ? playersAway[0] : playersHome[0];

    if (type === "goal") {
      if (isHome) { scoreHome++; stats.shotsHome++; }
      else { scoreAway++; stats.shotsAway++; }

      // М'яч летить точно у площину 3D-воріт
      const goalX = isHome ? HALF_W + 1.6 : -HALF_W - 1.6;
      const goalZ = (Math.random() - 0.5) * (GOAL_W * 0.72);

      actor.kickTimer = 0.45;
      if (ev.text.indexOf("КУТОВИЙ") !== -1) actor.jumpY = 1.7;

      launchBallFlight(goalX, goalZ, 2.5, 0.40, null, true);

      // Воротар здійснює стрибок за м'ячем
      oppGK.diveTimer = 0.95;
      oppGK.diveDir = goalZ >= 0 ? 1 : -1;
      shakeIntensity = 0.85;

      setTimeout(() => {
        if (isHome) rightShake = 1.0;
        else leftShake = 1.0;
        spawnGoalConfetti(isHome ? HALF_W : -HALF_W, 0);
      }, 320);

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
      launchBallFlight(gkX, gkZ, 2.1, 0.36, oppGK, true);

      oppGK.diveTimer = 0.85;
      oppGK.diveDir = gkZ >= 0 ? 1 : -1;
      shakeIntensity = 0.3;

      triggerBadge("🧤 СЕЙВ ВОРОТАРЯ!", `${oppGK.surname} рятує ворота після удару ${actor.surname}`, "#38bdf8", 1.5);

      setTimeout(() => {
        const def = isHome ? playersAway[2] : playersHome[2];
        if (def && !isPaused) {
          possessingTeam = isHome ? "away" : "home";
          launchBallFlight(def.x, def.z, 2.2, 0.62, def, false);
        }
      }, 440);

    } else if (type === "block") {
      const def = findPlayer(team, null, "CB1");
      def.kickTimer = 0.35;
      const clearPeer = findPlayer(team, null, "DM");
      launchBallFlight(clearPeer.x, clearPeer.z, 2.8, 0.60, clearPeer, false);
      triggerBadge("🛡️ БЛОК ЗАХИСТУ", ev.text, "#94a3b8", 1.3);

    } else if (type === "corner") {
      if (isHome) stats.cornersHome++; else stats.cornersAway++;
      const targetBoxX = isHome ? HALF_W - 9.5 : -HALF_W + 9.5;
      const targetBoxZ = (Math.random() - 0.5) * 8.5;
      const jumper = findPlayer(team, null, "ST");
      jumper.targetX = targetBoxX;
      jumper.targetZ = targetBoxZ;
      jumper.jumpY = 1.5;
      launchBallFlight(targetBoxX, targetBoxZ, 6.2, 0.70, jumper, false);
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
      const receiver = pool[6] || pool[5];
      launchBallFlight(receiver.x, receiver.z, 1.4, 0.54, receiver, false);
    }
  }

  // ===========================================================================
  // ДИНАМІЧНИЙ ПАСОВИЙ РОЗІГРАШ ТА ВПЕРЕД-СПРЯМОВАНІ АТАКИ (FORWARD PROGRESSION)
  // Замість пасів назад — гра на загострення: опорник -> півзахист -> фланг -> нападник!
  // ===========================================================================
  function updateContinuousPassPlay(dt) {
    passCooldown -= dt;
    if (passCooldown > 0 || ball.mode === "flight" || isReplaying || matchEnded) return;

    passCooldown = 0.75 + Math.random() * 0.45;
    const isHome = possessingTeam === "home";
    const pool = isHome ? playersHome : playersAway;
    const carrier = ball.carrier;

    // Визначаємо логіку наступного передачі: просування вперед!
    let candidates = [];
    if (carrier && (carrier.role === "CB1" || carrier.role === "CB2" || carrier.role === "GK")) {
      // Від захисту -> до півзахисту або крайніх захисників
      candidates = pool.filter(p => ["DM", "LCM", "RCM", "LB", "RB"].includes(p.role));
    } else if (carrier && (carrier.role === "DM" || carrier.role === "LCM" || carrier.role === "RCM" || carrier.role === "CM1" || carrier.role === "CM2")) {
      // З центру -> на вінгера або в ноги нападнику!
      candidates = pool.filter(p => ["LW", "RW", "ST", "LM", "RM"].includes(p.role));
    } else if (carrier && (carrier.role === "LW" || carrier.role === "RW" || carrier.role === "LM" || carrier.role === "RM")) {
      // З флангу -> простріл у штрафний на нападника!
      candidates = pool.filter(p => p.role === "ST" || ["LCM", "RCM"].includes(p.role));
    } else {
      candidates = pool.filter(p => !p.isGK && p !== carrier);
    }

    if (candidates.length === 0) candidates = pool.filter(p => !p.isGK);
    const nextReceiver = candidates[Math.floor(Math.random() * candidates.length)];

    if (nextReceiver) {
      // Набігання отримувача пасу вперед
      const forwardPush = isHome ? 5.5 : -5.5;
      const targetX = Math.max(-HALF_W + 6, Math.min(HALF_W - 6, nextReceiver.x + forwardPush));
      const targetZ = Math.max(-HALF_D + 4, Math.min(HALF_D - 4, nextReceiver.z + (Math.random() - 0.5) * 5));
      nextReceiver.targetX = targetX;
      nextReceiver.targetZ = targetZ;

      const isHighLob = Math.random() > 0.7;
      launchBallFlight(targetX, targetZ, isHighLob ? 3.4 : 0.6, 0.52, nextReceiver, false);
    }
  }

  // ===========================================================================
  // КАМЕРА ТА ПЕРЕМИКАННЯ РЕЖИМІВ
  // ===========================================================================
  function computeDesiredCamera() {
    if (currentVariant === 1) {
      // Варіант 1: Телекамера FIFA / Champions League (широкий огляд з трибуни)
      return {
        px: ball.x * 0.30,
        py: 39,
        pz: 72 + ball.z * 0.12,
        lx: ball.x * 0.42,
        ly: 1.6,
        lz: -3.0
      };
    } else if (currentVariant === 2) {
      // Варіант 2: Динамічна Spidercam (низька камера прямо за атакою)
      return {
        px: ball.x * 0.60 - 22,
        py: 13.5,
        pz: ball.z * 0.65 + 24,
        lx: ball.x * 0.88 + 15,
        ly: 2.8,
        lz: ball.z * 0.35 - 5.5
      };
    } else {
      // Варіант 3: VIP Тактична панорама тренера (вид зверху на формації)
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
    pitchMat.map = currentVariant === 1 ? pitchTex1 : (currentVariant === 2 ? pitchTex2 : pitchTex3);
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
    ball.x = 0; ball.y = 0.44; ball.z = 0;
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
        // Голевий нападник переміщується в штрафний
        scorer.x = isHome ? 38 : -38;
        scorer.z = (Math.random() - 0.5) * 10;
        ball.x = scorer.x + (isHome ? 0.8 : -0.8);
        ball.y = 0.44;
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
    spawnGoalConfetti(0, 0);
  }

  // ===========================================================================
  // 7. СИМУЛЯЦІЙНИЙ ЦИКЛ ОНОВЛЕННЯ (60 FPS)
  //    (Командний блок підтискає при володінні, нападники набігають у штрафний)
  // ===========================================================================
  function updateSimulation(dt, nowMs) {
    updateLEDBoard(nowMs);
    updateFormationLines3D();

    if (isPaused) return;
    const effDt = dt * timeScale * speedMult;

    if (!matchEnded) {
      matchMinute += effDt * (90.0 / 105.0);
      if (matchMinute >= 90.0) {
        matchMinute = 90.0;
        matchEnded = true;
        commentary = `ФІНАЛЬНИЙ СВИСТОК! Аврора ${scoreHome}:${scoreAway} Кантера!`;
        triggerBadge("МАТЧ ЗАВЕРШЕНО", `Підсумковий рахунок ${scoreHome}:${scoreAway}`, "#fbbf24", 4.0);
        spawnGoalConfetti(0, 0);
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

    // Оновлення м'яча
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
      ball.y = 0.44 + Math.sin(t * Math.PI) * ball.peakY;

      ballMesh.rotation.x += effDt * 14;
      ballMesh.rotation.z -= effDt * 12;

      if (t >= 1.0) {
        ball.y = 0.44;
        if (ball.targetReceiver) {
          ball.mode = "dribble";
          ball.carrier = ball.targetReceiver;
        } else {
          const defRec = possessingTeam === "home" ? playersAway[2] : playersHome[2];
          ball.mode = "dribble";
          ball.carrier = defRec;
        }
      }
    } else if (ball.carrier) {
      const c = ball.carrier;
      const dribbleX = c.x + Math.sin(c.facing) * 0.85;
      const dribbleZ = c.z + Math.cos(c.facing) * 0.85;
      ball.x += (dribbleX - ball.x) * Math.min(1.0, effDt * 14.0);
      ball.z += (dribbleZ - ball.z) * Math.min(1.0, effDt * 14.0);
      ball.y = 0.44 + Math.abs(Math.sin(c.stridePhase)) * 0.08;
      ballMesh.rotation.x += c.vz * effDt * 2.2;
      ballMesh.rotation.z -= c.vx * effDt * 2.2;
      passArcMat.opacity *= Math.pow(0.05, effDt);
    }
    ballMesh.position.set(ball.x, ball.y, ball.z);

    // =========================================================================
    // ТАКТИЧНЕ ЗМІЩЕННЯ КОМАНДНОГО БЛОКУ (TEAM BLOCK DYNAMICS)
    // Коли команда володіє м'ячем — вся лінія йде вперед!
    // Нападники вриваються в штрафний майданчик (36-44м)
    // =========================================================================
    const isHomePoss = possessingTeam === "home";
    const attackShiftHome = isHomePoss ? 12.0 : -6.0;
    const attackShiftAway = !isHomePoss ? -12.0 : 6.0;

    for (let i = 0; i < allPlayers.length; i++) {
      const p = allPlayers[i];

      if (!p.isGK) {
        const teamShift = p.isHome ? attackShiftHome : attackShiftAway;
        let desiredX = Math.max(-HALF_W + 5, Math.min(HALF_W - 5, p.baseX + teamShift));
        let desiredZ = Math.max(-HALF_D + 3, Math.min(HALF_D - 3, p.baseZ + ball.z * 0.20));

        // Нападник у фазі атаки активно відкривається у штрафному майданчику!
        if (p.role === "ST") {
          if (p.isHome && isHomePoss) {
            desiredX = Math.max(34, Math.min(44, ball.x + 6));
            desiredZ = Math.max(-10, Math.min(10, ball.z * 0.6));
          } else if (!p.isHome && !isHomePoss) {
            desiredX = Math.min(-34, Math.max(-44, ball.x - 6));
            desiredZ = Math.max(-10, Math.min(10, ball.z * 0.6));
          }
        }

        // Вінгер біжить по бровці у вільну зону
        if (p.role === "LW" || p.role === "RW") {
          if (p.isHome && isHomePoss) {
            desiredX = Math.max(26, Math.min(42, ball.x + 4));
          }
        }

        // Дриблер веде м'яч у бік воріт суперника
        if (ball.carrier === p) {
          desiredX = p.isHome ? Math.min(HALF_W - 9, p.x + 7.5) : Math.max(-HALF_W + 9, p.x - 7.5);
          desiredZ = p.z * 0.85;
        } else {
          // Гравці поруч підтягуються для пасу
          const distToBall = Math.hypot(ball.x - p.x, ball.z - p.z);
          if (distToBall < 13.0) {
            desiredX = desiredX * 0.5 + ball.x * 0.5;
            desiredZ = desiredZ * 0.5 + ball.z * 0.5;
          }
        }

        p.targetX += (desiredX - p.targetX) * Math.min(1, effDt * 3.6);
        p.targetZ += (desiredZ - p.targetZ) * Math.min(1, effDt * 3.6);
      } else {
        // Воротар контролює ворота та зміщується за м'ячем
        p.targetX = p.baseX;
        p.targetZ = Math.max(-GOAL_W * 0.38, Math.min(GOAL_W * 0.38, ball.z * 0.22));
      }

      // Інерція та фізика руху (нуль телепортацій!)
      const dx = p.targetX - p.x;
      const dz = p.targetZ - p.z;
      const dist = Math.hypot(dx, dz);
      const maxSpd = (ball.carrier === p || dist > 10) ? 9.8 : 6.8;
      let targetVx = 0, targetVz = 0;
      if (dist > 0.15) {
        const speedFactor = Math.min(maxSpd, dist * 2.4);
        targetVx = (dx / dist) * speedFactor;
        targetVz = (dz / dist) * speedFactor;
      }

      p.vx += (targetVx - p.vx) * Math.min(1.0, effDt * 14.0);
      p.vz += (targetVz - p.vz) * Math.min(1.0, effDt * 14.0);

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
      p.rig.ringMat.opacity = isActive ? 0.92 : (currentVariant === 3 ? 0.40 : 0.0);
      p.rig.badgeSprite.material.opacity = (isActive || currentVariant === 3) ? 0.98 : 0.62;
    }

    updateGoalNets(effDt);
    if (shakeIntensity > 0) shakeIntensity = Math.max(0, shakeIntensity - effDt * 2.2);

    if (isReplaying) {
      replayTimer -= dt;
      if (replayTimer <= 0) {
        isReplaying = false;
        timeScale = 1.0;
      }
    }
    if (badgeTimer > 0) badgeTimer -= dt;

    // Конфеті
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

    // Плавна камера
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
  // 8. HUD ТА ІНТЕРФЕЙС
  // ===========================================================================
  const uiButtons = [
    {
      id: "v1", x: 18, y: 10, w: 152, h: 36,
      label: "🏟️ 1. TV Стадіон 3D",
      isActive: () => currentVariant === 1,
      onClick: () => {
        currentVariant = 1;
        snapCameraAndTurfToVariant();
        triggerBadge("ВАРІАНТ 1: TV СТАДІОН 3D", "Смарагдовий газон ЛЧ • Двоярусні трибуни • Висока ТВ-камера", "#38bdf8", 1.8);
      }
    },
    {
      id: "v2", x: 176, y: 10, w: 156, h: 36,
      label: "🎥 2. Камера-Павук 3D",
      isActive: () => currentVariant === 2,
      onClick: () => {
        currentVariant = 2;
        snapCameraAndTurfToVariant();
        triggerBadge("ВАРІАНТ 2: 3D SPIDERCAM", "Шаховий газон АПЛ • Низька динамічна екшн-камера", "#fbbf24", 1.8);
      }
    },
    {
      id: "v3", x: 338, y: 152, w: 152, h: 36,
      label: "📋 3. Тактика 3D VIP",
      isActive: () => currentVariant === 3,
      onClick: () => {
        currentVariant = 3;
        snapCameraAndTurfToVariant();
        triggerBadge("ВАРІАНТ 3: TACTICAL 3D VIP", "Круговий газон Camp Nou • VIP-панорама • Лінії тактики", "#4ade80", 1.8);
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
  // Виправлення позиції кнопки v3
  uiButtons[2].y = 10;

  let fps = 60, frameCount = 0, fpsTimer = 0;

  function drawHUD() {
    ctx.clearRect(0, 0, HUD_W, HUD_H);

    const sbW = 340, sbH = 40;
    const sbX = (HUD_W - sbW) * 0.5 + 42, sbY = 8;

    ctx.save();
    ctx.fillStyle = "rgba(7, 12, 24, 0.94)";
    ctx.beginPath();
    ctx.roundRect(sbX, sbY, sbW, sbH, 9);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
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
        : (b.isAccent ? "rgba(217, 119, 6, 0.94)" : "rgba(10, 16, 30, 0.90)");
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
      ctx.fillStyle = "rgba(7, 12, 24, 0.90)";
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
    ctx.fillStyle = "rgba(7, 12, 24, 0.92)";
    ctx.beginPath();
    ctx.roundRect(commX, commY, commW, commH, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(commentary, commX + 18, commY + 24);

    ctx.fillStyle = "rgba(10, 16, 30, 0.90)";
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
      const bw = 400, bh = 54;
      const bx = (HUD_W - bw) * 0.5, by = 56;
      ctx.fillStyle = "rgba(7, 12, 24, 0.96)";
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
      ctx.fillStyle = "rgba(220, 38, 38, 0.94)";
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
