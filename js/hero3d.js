/* ============================================================
   Murallas · Hero 3D — Vectr-style white isometric logistics
   ------------------------------------------------------------
   Pale blue ground, pure white buildings, blue & red curving
   routes, white trucks, tiny human figures, blue scan beam.
   Scroll through the panels: camera lerps between three
   cinematic stops. Drag to rotate, click for a pulse.
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

  // ---------- Palette (vectrfl-style) ----------
  var WHITE      = 0xffffff;
  var PAPER      = 0xf8fafc;
  var SHADE_LT   = 0xe2e8f0;
  var SHADE_MID  = 0xcbd5e1;
  var SHADE_DARK = 0x94a3b8;
  var INK        = 0x1f2937;
  var BLUE       = 0x3b82f6;
  var BLUE_DEEP  = 0x1d4ed8;
  var RED        = 0xef4444;
  var RED_DEEP   = 0xb91c1c;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true, antialias: true, powerPreference: "low-power"
    });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();

  // ---------- Wide isometric ortho camera ----------
  var frustum = 5.6;
  var camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
  camera.position.set(9, 7, 10);
  camera.lookAt(0, -0.2, 0);

  // Camera keyframes (more dramatic — wide, close-up, opposite swing)
  var camStops = [
    { pos: new THREE.Vector3( 9,    7,    10  ), look: new THREE.Vector3( 0,   -0.2, 0   ), zoom: 1.00 },
    { pos: new THREE.Vector3( 3,    3.5,  6   ), look: new THREE.Vector3( 0,    0.6, 0   ), zoom: 1.55 },
    { pos: new THREE.Vector3(-9,    6,    7   ), look: new THREE.Vector3( 1.5,  0,  -1.5 ), zoom: 1.10 }
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

  // ---------- Materials ----------
  var matBldgFace   = new THREE.MeshBasicMaterial({ color: WHITE });
  var matBldgShade  = new THREE.MeshBasicMaterial({ color: PAPER });
  var matBldgAccent = new THREE.MeshBasicMaterial({ color: SHADE_LT });
  var matEdge       = new THREE.LineBasicMaterial({ color: SHADE_MID, transparent: true, opacity: 0.55 });
  var matEdgeSoft   = new THREE.LineBasicMaterial({ color: SHADE_LT,  transparent: true, opacity: 0.4  });
  var matGround     = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.55 });
  var matGroundLine = new THREE.LineBasicMaterial({ color: SHADE_MID, transparent: true, opacity: 0.16 });
  var matRouteBlue  = new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.95 });
  var matRouteRed   = new THREE.LineBasicMaterial({ color: RED,  transparent: true, opacity: 0.95 });
  var matRouteBlueSoft = new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.35 });
  var matRouteRedSoft  = new THREE.LineBasicMaterial({ color: RED,  transparent: true, opacity: 0.35 });
  var matTruck      = new THREE.MeshBasicMaterial({ color: WHITE });
  var matTruckCab   = new THREE.MeshBasicMaterial({ color: SHADE_MID });
  var matCargoBlue  = new THREE.MeshBasicMaterial({ color: BLUE });
  var matCargoRed   = new THREE.MeshBasicMaterial({ color: RED });
  var matTree       = new THREE.MeshBasicMaterial({ color: SHADE_DARK });
  var matFigure     = new THREE.MeshBasicMaterial({ color: SHADE_MID });
  var matFigureHead = new THREE.MeshBasicMaterial({ color: SHADE_DARK });
  var matCore       = new THREE.MeshBasicMaterial({ color: WHITE, transparent: true, opacity: 0.9 });
  var matCoreEdge   = new THREE.LineBasicMaterial({ color: BLUE_DEEP, transparent: true, opacity: 1 });

  var world = new THREE.Group();
  scene.add(world);

  // ---------- Helpers ----------
  function lineSeg(geo, mat) { return new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat); }
  function addBox(parent, w, h, d, x, y, z, lineMat, faceMat) {
    var geo = new THREE.BoxGeometry(w, h, d);
    var mesh = new THREE.Mesh(geo, faceMat); mesh.position.set(x, y, z);
    var edges = lineSeg(geo, lineMat); edges.position.set(x, y, z);
    parent.add(mesh); parent.add(edges);
    return { mesh: mesh, edges: edges };
  }

  // ============================================================
  // Ground (white plate with very faint grid)
  // ============================================================
  var GROUND_Y = -0.45;
  var GROUND_S = 14;
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_S, GROUND_S), matGround);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  world.add(ground);

  (function () {
    var divisions = 14, half = GROUND_S / 2;
    var pts = [];
    for (var i = -divisions / 2; i <= divisions / 2; i++) {
      var x = (i / (divisions / 2)) * half;
      pts.push(new THREE.Vector3(x, GROUND_Y + 0.002, -half));
      pts.push(new THREE.Vector3(x, GROUND_Y + 0.002,  half));
      pts.push(new THREE.Vector3(-half, GROUND_Y + 0.002, x));
      pts.push(new THREE.Vector3( half, GROUND_Y + 0.002, x));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    world.add(new THREE.LineSegments(geo, matGroundLine));
  })();

  // ============================================================
  // Stepped buildings (white with subtle gray edges)
  // ============================================================
  function makeBuilding(x, z, segments, withCap, accentColor) {
    var grp = new THREE.Group();
    var y = GROUND_Y + 0.005;
    var lastW = 0, lastD = 0;
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      var face = i % 2 === 0 ? matBldgFace : matBldgShade;
      addBox(grp, s.w, s.h, s.d, x, y + s.h / 2, z, matEdge, face);
      y += s.h;
      lastW = s.w; lastD = s.d;
    }
    if (withCap) {
      addBox(grp, lastW * 0.5, 0.14, lastD * 0.5, x, y + 0.07, z, matEdge, matBldgAccent);
      y += 0.14;
    }
    // Optional accent color stripe on side of building (entrance marker)
    if (accentColor) {
      var stripeGeo = new THREE.BoxGeometry(0.04, 0.20, lastD * 0.55);
      var stripe = new THREE.Mesh(stripeGeo, new THREE.MeshBasicMaterial({ color: accentColor }));
      stripe.position.set(x + lastW / 2 + 0.025, GROUND_Y + 0.12, z);
      grp.add(stripe);
    }
    world.add(grp);
    return { x: x, z: z, top: y };
  }

  // Central main facility — compliance HQ (with blue accent entrance)
  var hq = makeBuilding(0, 0, [
    { w: 1.7, h: 0.55, d: 1.7 },
    { w: 1.3, h: 0.50, d: 1.3 },
    { w: 0.85, h: 0.40, d: 0.85 }
  ], true, BLUE);

  // NE warehouse (long roof with ribs)
  makeBuilding(3.4, -2.8, [
    { w: 1.7, h: 0.75, d: 2.1 }
  ], true);
  for (var i = 0; i < 6; i++) {
    addBox(world, 1.8, 0.04, 0.18, 3.4, GROUND_Y + 0.79, -2.8 + (i - 2.5) * 0.36, matEdge, matBldgAccent);
  }

  // NW customs / checkpoint
  makeBuilding(-3.4, -2.5, [
    { w: 1.2, h: 0.55, d: 1.2 },
    { w: 0.85, h: 0.35, d: 0.85 }
  ], true, RED);

  // SE distribution center (wider, flagged red)
  makeBuilding(3.2, 2.8, [
    { w: 2.1, h: 0.45, d: 1.4 },
    { w: 1.5, h: 0.30, d: 0.95 }
  ], true);

  // SW depot
  makeBuilding(-3.2, 2.7, [
    { w: 1.9, h: 0.42, d: 1.5 }
  ], true);

  var BLDGS = {
    hq: new THREE.Vector3( 0,    GROUND_Y + 0.05,  0   ),
    ne: new THREE.Vector3( 3.4,  GROUND_Y + 0.05, -2.8 ),
    nw: new THREE.Vector3(-3.4,  GROUND_Y + 0.05, -2.5 ),
    se: new THREE.Vector3( 3.2,  GROUND_Y + 0.05,  2.8 ),
    sw: new THREE.Vector3(-3.2,  GROUND_Y + 0.05,  2.7 )
  };

  // ============================================================
  // Container stacks (white & gray cargo yards)
  // ============================================================
  function makeContainerStack(cx, cz, rows, cols, layers) {
    var w = 0.40, h = 0.16, d = 0.20, gap = 0.03;
    for (var l = 0; l < layers; l++) {
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (l > 0 && Math.random() > 0.7) continue;
          var x = cx + (c - (cols - 1) / 2) * (w + gap);
          var z = cz + (r - (rows - 1) / 2) * (d + gap);
          var y = GROUND_Y + 0.005 + h / 2 + l * (h + 0.005);
          var face = l === 0 ? matBldgFace : matBldgAccent;
          addBox(world, w, h, d, x, y, z, matEdge, face);
        }
      }
    }
  }
  makeContainerStack(-5.2, -0.3, 3, 4, 2);
  makeContainerStack( 5.4,  4.4, 2, 3, 2);
  makeContainerStack(-1.0, -5.0, 2, 5, 1);

  // ============================================================
  // Tiny human figures (sphere head + cylinder body)
  // ============================================================
  function makeFigure(x, z) {
    var grp = new THREE.Group();
    var body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.18, 6),
      matFigure
    );
    body.position.y = GROUND_Y + 0.10;
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), matFigureHead);
    head.position.y = GROUND_Y + 0.24;
    grp.add(body); grp.add(head);
    grp.position.set(x, 0, z);
    world.add(grp);
    return grp;
  }
  var figures = [
    makeFigure(-1.5, 1.5),
    makeFigure( 1.6, -1.3),
    makeFigure( 2.2,  2.2),
    makeFigure(-2.0, -1.5),
    makeFigure(-4.0,  1.3),
    makeFigure( 4.2,  0.5),
    makeFigure( 0.0,  3.5)
  ];

  // ============================================================
  // Curving bezier routes — blue (regular monitoring) + red (flagged)
  // ============================================================
  var routes = [];
  function makeRoute(from, to, curvature, color) {
    var c = (typeof curvature === "number") ? curvature : 0.32;
    var p0 = from.clone(); p0.y = GROUND_Y + 0.03;
    var p2 = to.clone();   p2.y = GROUND_Y + 0.03;
    var mid = p0.clone().lerp(p2, 0.5);
    var dir = p2.clone().sub(p0);
    var perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    var p1 = mid.add(perp.multiplyScalar(dir.length() * c));
    var curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    var pts = curve.getPoints(80);
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mainMat  = color === "red" ? matRouteRed : matRouteBlue;
    var softMat  = color === "red" ? matRouteRedSoft : matRouteBlueSoft;
    world.add(new THREE.Line(geo, mainMat));
    // Soft underlay (halo)
    var underGeo = new THREE.BufferGeometry().setFromPoints(pts);
    world.add(new THREE.Line(underGeo, softMat));
    routes.push({ curve: curve, color: color, len: dir.length() });
  }

  // Mix of blue and red routes (red = "flagged for audit" routes)
  makeRoute(BLDGS.hq, BLDGS.ne,  0.30, "blue");
  makeRoute(BLDGS.hq, BLDGS.nw, -0.30, "red");
  makeRoute(BLDGS.hq, BLDGS.se, -0.28, "blue");
  makeRoute(BLDGS.hq, BLDGS.sw,  0.28, "blue");
  makeRoute(BLDGS.ne, BLDGS.se,  0.45, "red");
  makeRoute(BLDGS.sw, BLDGS.nw,  0.45, "blue");
  makeRoute(BLDGS.nw, BLDGS.ne,  0.18, "blue");

  // ============================================================
  // Trucks following the routes — white with subtle accents
  // ============================================================
  function makeTruck(accent) {
    var truck = new THREE.Group();
    var cargoGeo = new THREE.BoxGeometry(0.30, 0.24, 0.42);
    var cargoMat = accent === "red" ? matCargoRed : (accent === "blue" ? matCargoBlue : matTruck);
    var cargo = new THREE.Mesh(cargoGeo, cargoMat);
    var cargoE = lineSeg(cargoGeo, matEdge);
    cargo.position.set(0, 0.13, -0.10);
    cargoE.position.set(0, 0.13, -0.10);
    truck.add(cargo); truck.add(cargoE);
    var cabGeo = new THREE.BoxGeometry(0.28, 0.18, 0.20);
    var cab = new THREE.Mesh(cabGeo, matTruckCab);
    var cabE = lineSeg(cabGeo, matEdge);
    cab.position.set(0, 0.10, 0.22);
    cabE.position.set(0, 0.10, 0.22);
    truck.add(cab); truck.add(cabE);
    return truck;
  }
  var trucks = [];
  var TRUCK_COUNT = 9;
  for (var i = 0; i < TRUCK_COUNT; i++) {
    var routeForTruck = routes[i % routes.length];
    var accent = routeForTruck.color === "red" ? "red" :
                 (i % 4 === 0 ? "blue" : null);
    var t = makeTruck(accent);
    world.add(t);
    trucks.push({
      mesh: t,
      routeIdx: i % routes.length,
      offset: Math.random(),
      direction: Math.random() > 0.5 ? 1 : -1,
      speedMult: 0.6 + Math.random() * 0.5
    });
  }

  // ============================================================
  // Central compliance core (floats above HQ, blue accent)
  // ============================================================
  var coreBaseY = hq.top + 1.0;
  var coreGeo = new THREE.IcosahedronGeometry(0.32, 0);
  var coreFaces = new THREE.Mesh(coreGeo, matCore);
  var coreEdges = lineSeg(coreGeo, matCoreEdge);
  coreFaces.position.y = coreBaseY;
  coreEdges.position.y = coreBaseY;
  world.add(coreFaces); world.add(coreEdges);
  world.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, hq.top, 0),
      new THREE.Vector3(0, coreBaseY - 0.28, 0)
    ]),
    new THREE.LineBasicMaterial({ color: BLUE, transparent: true, opacity: 0.5 })
  ));
  var seedGeo = new THREE.OctahedronGeometry(0.11, 0);
  var seedEdges = lineSeg(seedGeo, new THREE.LineBasicMaterial({
    color: RED, transparent: true, opacity: 1
  }));
  seedEdges.position.y = coreBaseY;
  world.add(seedEdges);

  // ============================================================
  // Scan beam — blue dots fanning from HQ entrance
  // ============================================================
  var beamCount = 220;
  var beamGeo = new THREE.BufferGeometry();
  var beamPos = new Float32Array(beamCount * 3);
  var beamMeta = []; // store original radial info for animation
  var beamOrigin = new THREE.Vector3(0.95, GROUND_Y + 0.02, 0); // east side of HQ
  var BEAM_LENGTH = 3.0;
  var BEAM_SPREAD = Math.PI / 3.5;
  for (var i = 0; i < beamCount; i++) {
    var rNorm = Math.pow(Math.random(), 0.55); // bias points toward farther distances
    var ang = (Math.random() - 0.5) * BEAM_SPREAD;
    var r = rNorm * BEAM_LENGTH;
    beamPos[i * 3]     = beamOrigin.x + Math.cos(ang) * r;
    beamPos[i * 3 + 1] = beamOrigin.y;
    beamPos[i * 3 + 2] = beamOrigin.z + Math.sin(ang) * r;
    beamMeta.push({ r: r, ang: ang, baseR: rNorm });
  }
  beamGeo.setAttribute("position", new THREE.BufferAttribute(beamPos, 3));
  var beamMat = new THREE.PointsMaterial({
    color: BLUE, size: 0.05, transparent: true, opacity: 0.85, sizeAttenuation: true
  });
  var beam = new THREE.Points(beamGeo, beamMat);
  world.add(beam);

  // ============================================================
  // Scenery cones (trees) on the outskirts — gray
  // ============================================================
  (function () {
    var count = 26;
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      var r = 5.8 + Math.random() * 0.8;
      var x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      var scale = 0.55 + Math.random() * 0.6;
      var coneGeo = new THREE.ConeGeometry(0.13 * scale, 0.38 * scale, 5);
      var cone = new THREE.Mesh(coneGeo, matTree);
      var coneE = lineSeg(coneGeo, matEdgeSoft);
      var cy = GROUND_Y + 0.19 * scale;
      cone.position.set(x, cy, z);
      coneE.position.set(x, cy, z);
      world.add(cone); world.add(coneE);
    }
  })();

  // ============================================================
  // Ambient blue particles
  // ============================================================
  var particleCount = 90;
  var particleGeo = new THREE.BufferGeometry();
  var particlePos = new Float32Array(particleCount * 3);
  for (var i = 0; i < particleCount; i++) {
    var rr = 4.5 + Math.random() * 3.0;
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    particlePos[i * 3]     = rr * Math.sin(phi) * Math.cos(theta);
    particlePos[i * 3 + 1] = rr * Math.cos(phi);
    particlePos[i * 3 + 2] = rr * Math.sin(phi) * Math.sin(theta);
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
  var particleMat = new THREE.PointsMaterial({
    color: BLUE, size: 0.045, transparent: true, opacity: 0.55, sizeAttenuation: true
  });
  var particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

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
  var pulse = 1;
  var hover = false;
  var idleFrames = 0;
  var IDLE_THRESHOLD = 120;
  var corePulse = 0;

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
    rotX = Math.max(-0.4, Math.min(0.4, rotX));
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
  var t = 0;
  var smoothedProgress = 0;
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
      if (idleFrames > IDLE_THRESHOLD && !reduceMotion) rotY += 0.001;
    }

    pulse += (1 - pulse) * 0.09;
    world.scale.setScalar(pulse);
    world.rotation.y = rotY;
    world.rotation.x = rotX;

    smoothedProgress += (scrollProgress - smoothedProgress) * 0.10;
    if (!reduceMotion) smoothedProgress += 0.00015;

    updateCameraFromScroll(scrollProgress);

    // Core spin
    var floatY = coreBaseY + Math.sin(t * 2.5) * 0.05;
    coreFaces.position.y = floatY;
    coreEdges.position.y = floatY;
    seedEdges.position.y = floatY;
    coreFaces.rotation.y = -t * 0.5;
    coreEdges.rotation.y = -t * 0.5;
    seedEdges.rotation.y =  t * 1.4;
    seedEdges.rotation.x =  t * 0.8;

    // Trucks
    var globalT = smoothedProgress * 4.5;
    for (var i = 0; i < trucks.length; i++) {
      var tk = trucks[i];
      var raw = (globalT * tk.speedMult * tk.direction + tk.offset);
      var u = raw - Math.floor(raw);
      if (tk.direction < 0) u = 1 - u;
      var route = routes[tk.routeIdx];
      route.curve.getPointAt(u, posTmp);
      route.curve.getTangentAt(u, tangentTmp).normalize();
      tk.mesh.position.set(posTmp.x, posTmp.y + 0.04, posTmp.z);
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

    // Scan beam pulse — dots breathe outward and fade with distance
    var beamPosAttr = beam.geometry.attributes.position;
    var beamPulse = (Math.sin(t * 1.5) + 1) * 0.5; // 0..1 breathing
    for (var i = 0; i < beamCount; i++) {
      var m = beamMeta[i];
      var driftR = m.baseR * (0.8 + beamPulse * 0.25);
      var rr = driftR * BEAM_LENGTH;
      beamPosAttr.array[i * 3]     = beamOrigin.x + Math.cos(m.ang) * rr;
      beamPosAttr.array[i * 3 + 2] = beamOrigin.z + Math.sin(m.ang) * rr;
    }
    beamPosAttr.needsUpdate = true;
    beamMat.opacity = 0.5 + beamPulse * 0.35;

    if (corePulse > 0.01) corePulse *= 0.93;
    seedEdges.scale.setScalar(1 + corePulse * 0.6);

    // Hover glow
    var tg = hover ? 1.0 : 0.95;
    var ts = hover ? 0.6 : 0.4;
    var tp = hover ? 0.8 : 0.55;
    matRouteBlue.opacity += (tg - matRouteBlue.opacity) * 0.08;
    matRouteRed.opacity  += (tg - matRouteRed.opacity)  * 0.08;
    matEdgeSoft.opacity  += (ts - matEdgeSoft.opacity)  * 0.08;
    particleMat.opacity  += (tp - particleMat.opacity)  * 0.08;

    particles.rotation.y = -t * 0.18;

    renderer.render(scene, camera);
  }
  animate();
})();
