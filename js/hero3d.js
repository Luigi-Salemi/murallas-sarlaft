/* ============================================================
   Murallas · Hero 3D — Vectrfl-style isometric scene
   ------------------------------------------------------------
   Proper Three.js lighting (directional + ambient + hemi) with
   shadow maps. White buildings with soft cast shadows on a pale
   ground. One central HQ as the focal point, a clean blue scan
   beam fanning from its entrance, a few satellite buildings,
   curving blue & red routes, tiny human figures.
   ============================================================ */
(function () {
  "use strict";

  if (typeof THREE === "undefined") return;

  var canvas = document.getElementById("heroCanvas");
  var visual = document.getElementById("heroVisual");
  var heroSection = document.getElementById("heroSection");
  if (!canvas) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Palette ----------
  var WHITE       = 0xffffff;
  var PAPER       = 0xf6f8fc;
  var SHADE_LT    = 0xe5e9f2;
  var SHADE_MID   = 0xb8c1d4;
  var SHADE_DARK  = 0x7d8aa5;
  var INK         = 0x1f2937;
  var BLUE        = 0x3b82f6;
  var BLUE_DEEP   = 0x1d4ed8;
  var RED         = 0xef4444;
  var BG_TINT     = 0xf2f6ff;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true, antialias: true, powerPreference: "low-power"
    });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  var scene = new THREE.Scene();

  // ---------- Camera (isometric ortho) ----------
  var frustum = 5.0;
  var camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
  camera.position.set(7, 5, 8);
  camera.lookAt(0, 0, 0);

  // Camera keyframes — wide → close to HQ → opposite swing
  var camStops = [
    { pos: new THREE.Vector3( 7,    5,    8   ), look: new THREE.Vector3( 0,   0.2, 0   ), zoom: 1.30 },
    { pos: new THREE.Vector3( 2.5,  3,    5   ), look: new THREE.Vector3( 0,   0.7, 0   ), zoom: 1.75 },
    { pos: new THREE.Vector3(-7,    5,    6   ), look: new THREE.Vector3( 1.2, 0,  -1.0 ), zoom: 1.35 }
  ];
  var camPos = new THREE.Vector3();
  var camLook = new THREE.Vector3();
  function easeInOut(t) { return t * t * (3 - 2 * t); }
  function updateCameraFromScroll(p) {
    var n = camStops.length - 1;
    var scaled = Math.min(n, Math.max(0, p * n));
    var idx = Math.min(n - 1, Math.floor(scaled));
    var frac = easeInOut(scaled - idx);
    var a = camStops[idx], b = camStops[idx + 1];
    camPos.lerpVectors(a.pos, b.pos, frac);
    camLook.lerpVectors(a.look, b.look, frac);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    camera.zoom = a.zoom + (b.zoom - a.zoom) * frac;
    camera.updateProjectionMatrix();
  }

  // ============================================================
  // LIGHTING (the key change — gives us real shadows)
  // ============================================================
  scene.add(new THREE.AmbientLight(0xf4f8ff, 0.55));
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc7d2fe, 0.45));

  var keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
  keyLight.position.set(7, 13, -2);
  keyLight.target.position.set(0, 0, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 28;
  keyLight.shadow.bias = -0.0008;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);
  scene.add(keyLight.target);

  // ============================================================
  // Materials (Lambert so they receive lighting + shadows)
  // ============================================================
  var matWhite     = new THREE.MeshLambertMaterial({ color: WHITE });
  var matPaper     = new THREE.MeshLambertMaterial({ color: PAPER });
  var matShadeLt   = new THREE.MeshLambertMaterial({ color: SHADE_LT });
  var matGround    = new THREE.MeshLambertMaterial({ color: BG_TINT });
  var matBlue      = new THREE.MeshLambertMaterial({ color: BLUE });
  var matBlueDeep  = new THREE.MeshLambertMaterial({ color: BLUE_DEEP });
  var matRed       = new THREE.MeshLambertMaterial({ color: RED });
  var matFigure    = new THREE.MeshLambertMaterial({ color: SHADE_MID });
  var matHead      = new THREE.MeshLambertMaterial({ color: SHADE_DARK });
  var matTree      = new THREE.MeshLambertMaterial({ color: SHADE_DARK });
  var matCabinet   = new THREE.MeshLambertMaterial({ color: SHADE_LT });
  // Line materials for routes (no lighting needed)
  var matRouteBlue = new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.95 });
  var matRouteRed  = new THREE.LineBasicMaterial({ color: RED,  transparent: true, opacity: 0.95 });

  var world = new THREE.Group();
  scene.add(world);

  // ---------- Helpers ----------
  function addBox(parent, w, h, d, x, y, z, mat) {
    var geo = new THREE.BoxGeometry(w, h, d);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // ============================================================
  // Ground — receives shadows, has a faint grid texture via lines
  // ============================================================
  var GROUND_Y = -0.45;
  var GROUND_S = 14;
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_S, GROUND_S), matGround);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  world.add(ground);

  // Faint grid lines (decorative, no lighting needed)
  (function () {
    var divisions = 14, half = GROUND_S / 2;
    var pts = [];
    for (var i = -divisions / 2; i <= divisions / 2; i++) {
      var x = (i / (divisions / 2)) * half;
      pts.push(new THREE.Vector3(x, GROUND_Y + 0.001, -half));
      pts.push(new THREE.Vector3(x, GROUND_Y + 0.001,  half));
      pts.push(new THREE.Vector3(-half, GROUND_Y + 0.001, x));
      pts.push(new THREE.Vector3( half, GROUND_Y + 0.001, x));
    }
    var lineMat = new THREE.LineBasicMaterial({ color: SHADE_MID, transparent: true, opacity: 0.18 });
    world.add(new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts), lineMat
    ));
  })();

  // ============================================================
  // CENTRAL HQ — the focal point, detailed multi-section building
  // ============================================================
  var hqGroup = new THREE.Group();
  world.add(hqGroup);
  // Base
  addBox(hqGroup, 1.8, 0.55, 1.8, 0, GROUND_Y + 0.275, 0, matWhite);
  // Mid section
  addBox(hqGroup, 1.4, 0.50, 1.4, 0, GROUND_Y + 0.80, 0, matPaper);
  // Upper section
  addBox(hqGroup, 0.9, 0.45, 0.9, 0, GROUND_Y + 1.275, 0, matWhite);
  // Roof platform
  addBox(hqGroup, 0.7, 0.07, 0.7, 0, GROUND_Y + 1.535, 0, matShadeLt);
  // Rooftop unit (HVAC/control box)
  addBox(hqGroup, 0.35, 0.18, 0.35, 0, GROUND_Y + 1.66, 0, matShadeLt);
  // Antenna / spire
  var spireGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.55, 6);
  var spire = new THREE.Mesh(spireGeo, matFigure);
  spire.position.set(0, GROUND_Y + 2.0, 0);
  spire.castShadow = true;
  hqGroup.add(spire);
  // Spire ball top
  var spireBall = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), matBlueDeep);
  spireBall.position.set(0, GROUND_Y + 2.30, 0);
  hqGroup.add(spireBall);

  // Blue entrance door on east face of base
  var doorGeo = new THREE.BoxGeometry(0.04, 0.30, 0.30);
  var door = new THREE.Mesh(doorGeo, matBlue);
  door.position.set(0.92, GROUND_Y + 0.20, 0);
  hqGroup.add(door);

  // Window stripes on mid-section (4 sides — just front for simplicity)
  for (var i = 0; i < 3; i++) {
    var yWin = GROUND_Y + 0.55 + i * 0.14;
    var stripeGeo = new THREE.BoxGeometry(1.42, 0.04, 1.42);
    var stripe = new THREE.Mesh(stripeGeo, matShadeLt);
    stripe.position.set(0, yWin, 0);
    hqGroup.add(stripe);
  }
  // Window stripes on base
  for (var i = 0; i < 2; i++) {
    var yWin = GROUND_Y + 0.18 + i * 0.18;
    var stripeGeo = new THREE.BoxGeometry(1.82, 0.04, 1.82);
    var stripe = new THREE.Mesh(stripeGeo, matShadeLt);
    stripe.position.set(0, yWin, 0);
    hqGroup.add(stripe);
  }

  var hqTop = GROUND_Y + 1.66;

  // ============================================================
  // Satellite buildings (kept simple, not competing for attention)
  // ============================================================
  // NE warehouse — long flat roof with ribs
  var warehouse = new THREE.Group();
  world.add(warehouse);
  addBox(warehouse, 1.5, 0.65, 2.0, 3.2, GROUND_Y + 0.325, -2.6, matWhite);
  // Roof ribs (visible from above)
  for (var i = 0; i < 6; i++) {
    var rib = addBox(warehouse, 1.55, 0.04, 0.16,
      3.2, GROUND_Y + 0.67, -2.6 + (i - 2.5) * 0.36, matShadeLt);
  }

  // NW customs / checkpoint — small stepped with red stripe
  var customs = new THREE.Group();
  world.add(customs);
  addBox(customs, 1.1, 0.55, 1.1, -3.2, GROUND_Y + 0.275, -2.0, matWhite);
  addBox(customs, 0.8, 0.30, 0.8, -3.2, GROUND_Y + 0.70, -2.0, matPaper);
  // Red accent on east side
  var redStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.55), matRed);
  redStripe.position.set(-3.2 + 0.55 + 0.025, GROUND_Y + 0.15, -2.0);
  customs.add(redStripe);

  // SE storage hub — small wide platform
  var storage = new THREE.Group();
  world.add(storage);
  addBox(storage, 1.6, 0.35, 1.0, 2.8, GROUND_Y + 0.175, 2.8, matWhite);
  addBox(storage, 0.5, 0.25, 0.5, 2.8, GROUND_Y + 0.475, 2.8, matPaper);

  // SW small depot
  var depot = new THREE.Group();
  world.add(depot);
  addBox(depot, 1.4, 0.42, 1.4, -2.8, GROUND_Y + 0.21, 2.6, matWhite);

  // ============================================================
  // Container stacks (2 yards — modest, vectrfl-style)
  // ============================================================
  function makeContainerStack(cx, cz, rows, cols, layers) {
    var w = 0.38, h = 0.16, d = 0.20, gap = 0.025;
    for (var l = 0; l < layers; l++) {
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (l > 0 && Math.random() > 0.65) continue;
          var x = cx + (c - (cols - 1) / 2) * (w + gap);
          var z = cz + (r - (rows - 1) / 2) * (d + gap);
          var y = GROUND_Y + 0.005 + h / 2 + l * (h + 0.005);
          var mat = l === 0 ? matWhite : matShadeLt;
          addBox(world, w, h, d, x, y, z, mat);
        }
      }
    }
  }
  makeContainerStack(-5.0, 0.5, 2, 3, 2);
  makeContainerStack( 0.0, 5.0, 2, 4, 2);

  // ============================================================
  // Tiny human figures (sphere head + cylinder body)
  // ============================================================
  function makeFigure(x, z) {
    var grp = new THREE.Group();
    var body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.18, 6), matFigure
    );
    body.position.y = GROUND_Y + 0.10;
    body.castShadow = true;
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matHead);
    head.position.y = GROUND_Y + 0.24;
    head.castShadow = true;
    grp.add(body); grp.add(head);
    grp.position.set(x, 0, z);
    world.add(grp);
    return grp;
  }
  makeFigure(-1.3, 1.5);
  makeFigure( 1.5, -1.2);
  makeFigure( 2.0,  2.0);
  makeFigure(-1.8, -1.5);
  makeFigure( 4.0,  0.3);
  makeFigure(-3.5,  1.0);

  // ============================================================
  // Bezier routes (blue + red)
  // ============================================================
  var routes = [];
  var BLDGS = {
    hq:       new THREE.Vector3( 0,    GROUND_Y + 0.04,  0   ),
    warehouse:new THREE.Vector3( 3.2,  GROUND_Y + 0.04, -2.6 ),
    customs:  new THREE.Vector3(-3.2,  GROUND_Y + 0.04, -2.0 ),
    storage:  new THREE.Vector3( 2.8,  GROUND_Y + 0.04,  2.8 ),
    depot:    new THREE.Vector3(-2.8,  GROUND_Y + 0.04,  2.6 )
  };

  function makeRoute(from, to, curvature, color) {
    var c = (typeof curvature === "number") ? curvature : 0.32;
    var p0 = from.clone(); p0.y = GROUND_Y + 0.025;
    var p2 = to.clone();   p2.y = GROUND_Y + 0.025;
    var mid = p0.clone().lerp(p2, 0.5);
    var dir = p2.clone().sub(p0);
    var perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    var p1 = mid.add(perp.multiplyScalar(dir.length() * c));
    var curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    var pts = curve.getPoints(80);
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mainMat = color === "red" ? matRouteRed : matRouteBlue;
    world.add(new THREE.Line(geo, mainMat));
    routes.push({ curve: curve, color: color });
  }
  makeRoute(BLDGS.hq, BLDGS.warehouse,  0.32, "blue");
  makeRoute(BLDGS.hq, BLDGS.customs,   -0.32, "red");
  makeRoute(BLDGS.hq, BLDGS.storage,   -0.28, "blue");
  makeRoute(BLDGS.hq, BLDGS.depot,      0.28, "blue");
  makeRoute(BLDGS.warehouse, BLDGS.storage,  0.45, "red");
  makeRoute(BLDGS.depot, BLDGS.customs,      0.40, "blue");

  // ============================================================
  // Trucks following the curves
  // ============================================================
  function makeTruck(accent) {
    var truck = new THREE.Group();
    var cargoGeo = new THREE.BoxGeometry(0.30, 0.24, 0.42);
    var cargo = new THREE.Mesh(cargoGeo, accent === "red" ? matRed : matWhite);
    cargo.position.set(0, 0.13, -0.10);
    cargo.castShadow = true;
    truck.add(cargo);
    var cabGeo = new THREE.BoxGeometry(0.28, 0.18, 0.20);
    var cab = new THREE.Mesh(cabGeo, matCabinet);
    cab.position.set(0, 0.10, 0.22);
    cab.castShadow = true;
    truck.add(cab);
    // Headlight (small bright box)
    var hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.06, 0.04),
      new THREE.MeshLambertMaterial({ color: WHITE, emissive: 0xfff5d6 })
    );
    hl.position.set(0, 0.10, 0.34);
    truck.add(hl);
    return truck;
  }
  var trucks = [];
  var TRUCK_COUNT = 8;
  for (var i = 0; i < TRUCK_COUNT; i++) {
    var routeForTruck = routes[i % routes.length];
    var accent = routeForTruck.color === "red" ? "red" : null;
    var tk = makeTruck(accent);
    world.add(tk);
    trucks.push({
      mesh: tk,
      routeIdx: i % routes.length,
      offset: Math.random(),
      direction: Math.random() > 0.5 ? 1 : -1,
      speedMult: 0.6 + Math.random() * 0.5
    });
  }

  // ============================================================
  // Compliance core (floats above HQ) + scan beam
  // ============================================================
  var coreBaseY = hqTop + 0.85;
  var coreFaces = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.30, 0),
    new THREE.MeshLambertMaterial({ color: WHITE, emissive: 0x99c6ff, emissiveIntensity: 0.15 })
  );
  var coreEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.30, 0)),
    new THREE.LineBasicMaterial({ color: BLUE_DEEP, transparent: true, opacity: 1 })
  );
  coreFaces.position.y = coreBaseY;
  coreEdges.position.y = coreBaseY;
  world.add(coreFaces); world.add(coreEdges);

  var seedEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.11, 0)),
    new THREE.LineBasicMaterial({ color: RED, transparent: true, opacity: 1 })
  );
  seedEdges.position.y = coreBaseY;
  world.add(seedEdges);

  // Scan beam — blue dots fanning east from HQ entrance
  var beamCount = 280;
  var beamGeo = new THREE.BufferGeometry();
  var beamPos = new Float32Array(beamCount * 3);
  var beamMeta = [];
  var beamOrigin = new THREE.Vector3(0.98, GROUND_Y + 0.05, 0);
  var BEAM_LENGTH = 3.5;
  var BEAM_SPREAD = Math.PI / 3.2;
  for (var i = 0; i < beamCount; i++) {
    var rNorm = Math.pow(Math.random(), 0.6);
    var ang = (Math.random() - 0.5) * BEAM_SPREAD;
    var r = rNorm * BEAM_LENGTH;
    beamPos[i * 3]     = beamOrigin.x + Math.cos(ang) * r;
    beamPos[i * 3 + 1] = beamOrigin.y;
    beamPos[i * 3 + 2] = beamOrigin.z + Math.sin(ang) * r;
    beamMeta.push({ ang: ang, baseR: rNorm });
  }
  beamGeo.setAttribute("position", new THREE.BufferAttribute(beamPos, 3));
  var beamMat = new THREE.PointsMaterial({
    color: BLUE, size: 0.055, transparent: true, opacity: 0.85, sizeAttenuation: true
  });
  var beam = new THREE.Points(beamGeo, beamMat);
  world.add(beam);

  // ============================================================
  // Scenery cones (trees) — small gray cones at the edges
  // ============================================================
  (function () {
    var count = 18;
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      var r = 5.8 + Math.random() * 0.8;
      var x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      var scale = 0.55 + Math.random() * 0.5;
      var cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.13 * scale, 0.36 * scale, 5),
        matTree
      );
      cone.position.set(x, GROUND_Y + 0.18 * scale, z);
      cone.castShadow = true;
      world.add(cone);
    }
  })();

  // ============================================================
  // Resize
  // ============================================================
  function resize() {
    var w = canvas.clientWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 0);
    var h = canvas.clientHeight || (canvas.parentElement ? canvas.parentElement.clientHeight : 0);
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    var a = w / h;
    camera.left = -frustum * a; camera.right = frustum * a;
    camera.top  =  frustum;     camera.bottom = -frustum;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("load", resize);
  requestAnimationFrame(resize);
  if (window.ResizeObserver && visual) new ResizeObserver(resize).observe(visual);

  // ============================================================
  // Scroll progress
  // ============================================================
  var scrollProgress = 0;
  function updateScrollProgress() {
    if (!heroSection) return;
    var rect = heroSection.getBoundingClientRect();
    var sectionH = heroSection.offsetHeight;
    var vh = window.innerHeight;
    var scrolled = Math.max(0, -rect.top);
    var maxScroll = Math.max(1, sectionH - vh);
    scrollProgress = Math.max(0, Math.min(1, scrolled / maxScroll));
  }
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);
  updateScrollProgress();

  // ============================================================
  // Interaction
  // ============================================================
  var rotY = -Math.PI / 16, rotX = 0;
  var velY = 0, velX = 0;
  var isDragging = false, dragMoved = false;
  var lastX = 0, lastY = 0;
  var pulse = 1, hover = false, idleFrames = 0;
  var IDLE_THRESHOLD = 120, corePulse = 0;

  function ptr(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }
  function onDown(e) {
    isDragging = true; dragMoved = false; idleFrames = 0;
    var p = ptr(e); lastX = p.x; lastY = p.y; velX = 0; velY = 0;
    if (visual) visual.classList.add("engaged");
    if (e.cancelable) e.preventDefault();
  }
  function onMove(e) {
    if (!isDragging) return;
    var p = ptr(e);
    var dx = p.x - lastX, dy = p.y - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
    velY = dx * 0.005; velX = dy * 0.004;
    rotY += velY; rotX += velX;
    rotX = Math.max(-0.35, Math.min(0.35, rotX));
    lastX = p.x; lastY = p.y;
    idleFrames = 0;
  }
  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    if (!dragMoved) { pulse = 1.10; corePulse = 1; }
  }
  function onEnter() { hover = true; idleFrames = 0; }
  function onLeave() { hover = false; }
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerenter", onEnter);
  canvas.addEventListener("pointerleave", onLeave);

  // ============================================================
  // Animation loop
  // ============================================================
  var t = 0, smoothedProgress = 0;
  var tangentTmp = new THREE.Vector3();
  var posTmp = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);
    if (!reduceMotion) t += 0.004;

    if (!isDragging) {
      rotY += velY; rotX += velX;
      velY *= 0.94; velX *= 0.94;
      rotX *= 0.97;
      idleFrames++;
      if (idleFrames > IDLE_THRESHOLD && !reduceMotion) rotY += 0.0008;
    }

    pulse += (1 - pulse) * 0.09;
    world.scale.setScalar(pulse);
    world.rotation.y = rotY;
    world.rotation.x = rotX;

    smoothedProgress += (scrollProgress - smoothedProgress) * 0.10;
    if (!reduceMotion) smoothedProgress += 0.00015;
    updateCameraFromScroll(scrollProgress);

    var floatY = coreBaseY + Math.sin(t * 2.5) * 0.05;
    coreFaces.position.y = floatY;
    coreEdges.position.y = floatY;
    seedEdges.position.y = floatY;
    coreFaces.rotation.y = -t * 0.5;
    coreEdges.rotation.y = -t * 0.5;
    seedEdges.rotation.y =  t * 1.4;
    seedEdges.rotation.x =  t * 0.8;

    var globalT = smoothedProgress * 4.5;
    for (var i = 0; i < trucks.length; i++) {
      var tk = trucks[i];
      var raw = (globalT * tk.speedMult * tk.direction + tk.offset);
      var u = raw - Math.floor(raw);
      if (tk.direction < 0) u = 1 - u;
      var route = routes[tk.routeIdx];
      route.curve.getPointAt(u, posTmp);
      route.curve.getTangentAt(u, tangentTmp).normalize();
      tk.mesh.position.set(posTmp.x, posTmp.y + 0.02, posTmp.z);
      tk.mesh.rotation.y = Math.atan2(
        tangentTmp.x * tk.direction,
        tangentTmp.z * tk.direction
      );
      var prevU = tk._lastU;
      tk._lastU = u;
      if (typeof prevU === "number" && Math.abs(u - prevU) > 0.4) {
        tk.routeIdx = Math.floor(Math.random() * routes.length);
        if (i % 3 === 0) corePulse = Math.min(1, corePulse + 0.4);
      }
    }

    // Scan beam pulse
    var beamPosAttr = beam.geometry.attributes.position;
    var beamPulse = (Math.sin(t * 1.5) + 1) * 0.5;
    for (var i = 0; i < beamCount; i++) {
      var m = beamMeta[i];
      var driftR = m.baseR * (0.8 + beamPulse * 0.25);
      var rr = driftR * BEAM_LENGTH;
      beamPosAttr.array[i * 3]     = beamOrigin.x + Math.cos(m.ang) * rr;
      beamPosAttr.array[i * 3 + 2] = beamOrigin.z + Math.sin(m.ang) * rr;
    }
    beamPosAttr.needsUpdate = true;
    beamMat.opacity = 0.55 + beamPulse * 0.35;

    if (corePulse > 0.01) corePulse *= 0.93;
    seedEdges.scale.setScalar(1 + corePulse * 0.6);

    var tg = hover ? 1.0 : 0.95;
    matRouteBlue.opacity += (tg - matRouteBlue.opacity) * 0.08;
    matRouteRed.opacity  += (tg - matRouteRed.opacity)  * 0.08;

    renderer.render(scene, camera);
  }
  animate();
})();
