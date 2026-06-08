/* ============================================================
   Murallas · Hero 3D — Isometric transport loop
   ------------------------------------------------------------
   A cargo train (locomotive + 4 wagons) circles a ring highway
   around a hexagonal distribution hub. Lamp posts line the road,
   low-poly scenery dots the outskirts, and a small SARLAFT
   compliance icon floats above the hub.  Drag to rotate,
   click for a pulse, hover to brighten.
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

  var GOLD = 0xc9a14a;
  var GOLD_SOFT = 0xe6d49a;
  var GOLD_DEEP = 0xa8842f;
  var INK = 0x0a0a0a;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, alpha: true, antialias: true, powerPreference: "low-power"
    });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();

  // ---------- Camera (isometric ortho) ----------
  var frustum = 3.0;
  var camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
  camera.position.set(6, 7.5, 6);
  camera.lookAt(0, 0, 0);

  // ---------- Materials ----------
  var lineGold     = new THREE.LineBasicMaterial({ color: GOLD,      transparent: true, opacity: 0.95 });
  var lineGoldSoft = new THREE.LineBasicMaterial({ color: GOLD_SOFT, transparent: true, opacity: 0.55 });
  var lineInk      = new THREE.LineBasicMaterial({ color: INK,       transparent: true, opacity: 0.75 });
  var faceGround   = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.05 });
  var faceRoad     = new THREE.MeshBasicMaterial({ color: GOLD,      transparent: true, opacity: 0.16, side: THREE.DoubleSide });
  var faceHub      = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.22 });
  var faceCargo    = new THREE.MeshBasicMaterial({ color: GOLD });
  var faceLoco     = new THREE.MeshBasicMaterial({ color: GOLD_DEEP });
  var faceTree     = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.12 });

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
  function addCircleLine(r, y, mat, segments) {
    var pts = [], n = segments || 96;
    for (var i = 0; i <= n; i++) {
      var a = (i / n) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }

  // ============================================================
  // Ground disc
  // ============================================================
  var GROUND_Y = -0.42;
  var ground = new THREE.Mesh(new THREE.CircleGeometry(3.0, 56), faceGround);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  world.add(ground);
  addCircleLine(3.0, GROUND_Y + 0.001, lineGoldSoft);

  // ============================================================
  // Circular highway road
  // ============================================================
  var ROAD_R = 2.05;
  var ROAD_W = 0.55;
  var ROAD_Y = GROUND_Y + 0.02;

  var road = new THREE.Mesh(
    new THREE.RingGeometry(ROAD_R - ROAD_W / 2, ROAD_R + ROAD_W / 2, 96),
    faceRoad
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = ROAD_Y;
  world.add(road);
  addCircleLine(ROAD_R - ROAD_W / 2, ROAD_Y + 0.002, lineGold);
  addCircleLine(ROAD_R + ROAD_W / 2, ROAD_Y + 0.002, lineGold);

  // Centre lane dashes
  (function () {
    var dashCount = 28;
    for (var i = 0; i < dashCount; i++) {
      if (i % 2 !== 0) continue;
      var a = (i / dashCount) * Math.PI * 2;
      var dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.015, 0.04),
        new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 })
      );
      dash.position.set(Math.cos(a) * ROAD_R, ROAD_Y + 0.025, Math.sin(a) * ROAD_R);
      dash.rotation.y = -a;
      world.add(dash);
    }
  })();

  // ============================================================
  // Lamp posts around the road
  // ============================================================
  var lampLights = [];
  (function () {
    var n = 8;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + Math.PI / 16;
      var r = ROAD_R + ROAD_W / 2 + 0.18;
      var x = Math.cos(a) * r, z = Math.sin(a) * r;

      // Thin vertical post
      var postGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.45, 4);
      var post = new THREE.Mesh(postGeo, new THREE.MeshBasicMaterial({ color: GOLD_DEEP }));
      post.position.set(x, ROAD_Y + 0.23, z);
      world.add(post);

      // Lamp head (bright gold sphere)
      var lampGeo = new THREE.SphereGeometry(0.045, 8, 8);
      var lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: GOLD }));
      lamp.position.set(x, ROAD_Y + 0.47, z);
      world.add(lamp);
      lampLights.push(lamp.material);
    }
  })();

  // ============================================================
  // Central distribution hub (hexagonal)
  // ============================================================
  var HUB_Y = GROUND_Y + 0.04;
  var hubPlatGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.10, 6);
  var hubPlat = new THREE.Mesh(hubPlatGeo, faceHub);
  hubPlat.position.y = HUB_Y + 0.05;
  var hubPlatEdges = lineSeg(hubPlatGeo, lineGold);
  hubPlatEdges.position.y = HUB_Y + 0.05;
  world.add(hubPlat); world.add(hubPlatEdges);

  var hubBldgGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.42, 6);
  var hubBldg = new THREE.Mesh(hubBldgGeo, faceHub);
  hubBldg.position.y = HUB_Y + 0.31;
  var hubBldgEdges = lineSeg(hubBldgGeo, lineGold);
  hubBldgEdges.position.y = HUB_Y + 0.31;
  world.add(hubBldg); world.add(hubBldgEdges);

  // Hub roof accent: small cone on top
  var roofGeo = new THREE.ConeGeometry(0.36, 0.20, 6);
  var roof = new THREE.Mesh(roofGeo, faceHub);
  roof.position.y = HUB_Y + 0.62;
  var roofEdges = lineSeg(roofGeo, lineGold);
  roofEdges.position.y = HUB_Y + 0.62;
  world.add(roof); world.add(roofEdges);

  // ============================================================
  // Floating SARLAFT compliance icon
  // ============================================================
  var coreBaseY = HUB_Y + 1.25;
  var coreGeo = new THREE.IcosahedronGeometry(0.26, 0);
  var coreFaces = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
    color: INK, transparent: true, opacity: 0.18
  }));
  var coreEdges = lineSeg(coreGeo, new THREE.LineBasicMaterial({
    color: GOLD, transparent: true, opacity: 1
  }));
  coreFaces.position.y = coreBaseY;
  coreEdges.position.y = coreBaseY;
  world.add(coreFaces); world.add(coreEdges);

  // Tether
  world.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, HUB_Y + 0.74, 0),
      new THREE.Vector3(0, coreBaseY - 0.22, 0)
    ]),
    lineGoldSoft
  ));

  // Inner seed crystal
  var seedGeo = new THREE.OctahedronGeometry(0.09, 0);
  var seedEdges = lineSeg(seedGeo, new THREE.LineBasicMaterial({
    color: GOLD_DEEP, transparent: true, opacity: 1
  }));
  seedEdges.position.y = coreBaseY;
  world.add(seedEdges);

  // ============================================================
  // Cargo train: locomotive + 4 wagons
  // ============================================================
  function makeLocomotive() {
    var g = new THREE.Group();
    // Main body
    var body = addBox(g, 0.32, 0.30, 0.50, 0, 0.18, 0, lineInk, faceLoco);
    // Cab (raised back section)
    var cab = addBox(g, 0.32, 0.18, 0.22, 0, 0.42, -0.10, lineInk, faceLoco);
    // Chimney
    var chimGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.18, 8);
    var chim = new THREE.Mesh(chimGeo, faceLoco);
    chim.position.set(0, 0.42, 0.16);
    var chimE = lineSeg(chimGeo, lineInk);
    chimE.position.set(0, 0.42, 0.16);
    g.add(chim); g.add(chimE);
    // Headlight (small bright box at the front)
    var headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.08, 0.04),
      new THREE.MeshBasicMaterial({ color: GOLD })
    );
    headlight.position.set(0, 0.18, 0.27);
    g.add(headlight);
    return g;
  }

  function makeWagon() {
    var g = new THREE.Group();
    addBox(g, 0.30, 0.28, 0.46, 0, 0.18, 0, lineInk, faceCargo);
    // Top hatch detail
    addBox(g, 0.20, 0.04, 0.36, 0, 0.34, 0, lineInk, faceLoco);
    return g;
  }

  var locomotive = makeLocomotive();
  world.add(locomotive);
  var wagons = [];
  for (var i = 0; i < 4; i++) {
    var w = makeWagon();
    world.add(w);
    wagons.push(w);
  }
  var trainAngle = 0;
  var CAR_OFFSET = 0.22; // radians between cars on the loop

  // ============================================================
  // Low-poly scenery cones (trees) on the outskirts
  // ============================================================
  (function () {
    var ringInner = 3.05, ringOuter = 3.55;
    for (var i = 0; i < 18; i++) {
      var a = (i / 18) * Math.PI * 2 + Math.random() * 0.4;
      var r = ringInner + Math.random() * (ringOuter - ringInner);
      var x = Math.cos(a) * r, z = Math.sin(a) * r;
      var scale = 0.6 + Math.random() * 0.5;
      var coneGeo = new THREE.ConeGeometry(0.13 * scale, 0.34 * scale, 5);
      var cone = new THREE.Mesh(coneGeo, faceTree);
      var coneE = lineSeg(coneGeo, lineGoldSoft);
      var cy = GROUND_Y + 0.17 * scale;
      cone.position.set(x, cy, z);
      coneE.position.set(x, cy, z);
      world.add(cone); world.add(coneE);
    }
  })();

  // ============================================================
  // Ambient gold particles
  // ============================================================
  var particleCount = 80;
  var particleGeo = new THREE.BufferGeometry();
  var particlePos = new Float32Array(particleCount * 3);
  for (var i = 0; i < particleCount; i++) {
    var r = 3.2 + Math.random() * 2.2;
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    particlePos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    particlePos[i * 3 + 1] = r * Math.cos(phi);
    particlePos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
  var particleMat = new THREE.PointsMaterial({
    color: GOLD, size: 0.05, transparent: true, opacity: 0.7, sizeAttenuation: true
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
  // Interaction
  // ============================================================
  var rotY = Math.PI / 7, rotX = 0;
  var velY = 0, velX = 0;
  var isDragging = false, dragMoved = false;
  var lastX = 0, lastY = 0;
  var pulse = 1;
  var hover = false;
  var idleFrames = 0;
  var IDLE_THRESHOLD = 90;
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
    velY = dx * 0.006; velX = dy * 0.005;
    rotY += velY; rotX += velX;
    rotX = Math.max(-0.55, Math.min(0.55, rotX));
    lastX = p.x; lastY = p.y;
    idleFrames = 0;
  }
  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    if (!dragMoved) { pulse = 1.12; corePulse = 1; }
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
  // Scroll-driven train: progress through #heroSection drives train angle
  // ============================================================
  var scrollProgress = 0;
  var TRAIN_LOOPS_PER_SECTION = 2.5; // how many laps the train completes scrolling the hero
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
  // Animation loop
  // ============================================================
  var t = 0;
  function placeOnRing(obj, angle, yOffset) {
    var c = Math.cos(angle), s = Math.sin(angle);
    obj.position.set(c * ROAD_R, ROAD_Y + (yOffset || 0.02), s * ROAD_R);
    obj.rotation.y = -angle;
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!reduceMotion) t += 0.004;

    if (!isDragging) {
      rotY += velY; rotX += velX;
      velY *= 0.94; velX *= 0.94;
      rotX *= 0.97;
      idleFrames++;
      if (idleFrames > IDLE_THRESHOLD && !reduceMotion) rotY += 0.0028;
    }

    pulse += (1 - pulse) * 0.09;
    world.scale.setScalar(pulse);
    world.rotation.y = rotY;
    world.rotation.x = rotX;

    // Core gently floats and spins
    var floatY = coreBaseY + Math.sin(t * 2.5) * 0.05;
    coreFaces.position.y = floatY;
    coreEdges.position.y = floatY;
    seedEdges.position.y = floatY;
    coreFaces.rotation.y = -t * 0.5;
    coreEdges.rotation.y = -t * 0.5;
    seedEdges.rotation.y =  t * 1.4;
    seedEdges.rotation.x =  t * 0.8;

    // Cargo train movement — driven by scroll progress + gentle idle drift
    var prevAngle = trainAngle;
    var targetAngle = scrollProgress * Math.PI * 2 * TRAIN_LOOPS_PER_SECTION;
    // Smooth lerp toward scroll-driven target
    trainAngle += (targetAngle - trainAngle) * 0.10;
    // Subtle idle drift so the train still breathes when scroll is stationary
    if (!reduceMotion) trainAngle += 0.0008;
    placeOnRing(locomotive, trainAngle);
    for (var i = 0; i < wagons.length; i++) {
      placeOnRing(wagons[i], trainAngle - (i + 1) * CAR_OFFSET);
    }
    // Audit pulse when train passes angle 0 (the "checkpoint")
    if ((prevAngle % (Math.PI * 2)) > (trainAngle % (Math.PI * 2)) && trainAngle > prevAngle) {
      corePulse = Math.min(1, corePulse + 0.7);
    }

    // Core pulse decay
    if (corePulse > 0.01) corePulse *= 0.93;
    seedEdges.scale.setScalar(1 + corePulse * 0.6);
    coreEdges.material.opacity = 0.95 + corePulse * 0.05;

    // Lamp flicker (subtle breathing)
    var lampGlow = 0.85 + 0.15 * Math.sin(t * 3);
    lampLights.forEach(function (m) { m.opacity = lampGlow; m.transparent = true; });

    // Hover glow on lines/particles
    var tg = hover ? 1.0 : 0.95;
    var ts = hover ? 0.75 : 0.55;
    var tp = hover ? 1.0 : 0.7;
    lineGold.opacity     += (tg - lineGold.opacity)     * 0.08;
    lineGoldSoft.opacity += (ts - lineGoldSoft.opacity) * 0.08;
    particleMat.opacity  += (tp - particleMat.opacity)  * 0.08;

    particles.rotation.y = -t * 0.22;

    renderer.render(scene, camera);
  }
  animate();
})();
