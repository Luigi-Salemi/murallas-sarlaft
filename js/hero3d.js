/* ============================================================
   Murallas · Hero 3D — Isometric logistics landscape
   ------------------------------------------------------------
   A wide isometric scene with multiple operational buildings,
   curving bezier routes connecting them, cargo trucks moving
   along those routes, and a central SARLAFT compliance core.
   Scroll through the hero panels to advance the trucks.
   Drag to rotate, click for a pulse, hover to brighten.
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

  // ---------- Wide isometric ortho camera ----------
  var frustum = 5.6;
  var camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
  camera.position.set(8, 6.5, 9);
  camera.lookAt(0, -0.2, 0);

  // ---------- Materials ----------
  var lineGold      = new THREE.LineBasicMaterial({ color: GOLD,      transparent: true, opacity: 0.95 });
  var lineGoldSoft  = new THREE.LineBasicMaterial({ color: GOLD_SOFT, transparent: true, opacity: 0.55 });
  var lineInk       = new THREE.LineBasicMaterial({ color: INK,       transparent: true, opacity: 0.75 });
  var faceGround    = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.04 });
  var faceBldg      = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.10 });
  var faceBldgDark  = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.18 });
  var faceCargo     = new THREE.MeshBasicMaterial({ color: GOLD });
  var faceCargoSoft = new THREE.MeshBasicMaterial({ color: GOLD_SOFT });
  var faceLoco      = new THREE.MeshBasicMaterial({ color: GOLD_DEEP });
  var faceTree      = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.12 });

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
  // Ground (large square plate, soft inset border)
  // ============================================================
  var GROUND_Y = -0.45;
  var GROUND_S = 12;
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_S, GROUND_S), faceGround);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_Y;
  world.add(ground);

  // Subtle gridlines on the ground
  (function () {
    var divisions = 12, half = GROUND_S / 2;
    var pts = [];
    for (var i = -divisions / 2; i <= divisions / 2; i++) {
      var x = (i / (divisions / 2)) * half;
      pts.push(new THREE.Vector3(x, GROUND_Y + 0.002, -half));
      pts.push(new THREE.Vector3(x, GROUND_Y + 0.002,  half));
      pts.push(new THREE.Vector3(-half, GROUND_Y + 0.002, x));
      pts.push(new THREE.Vector3( half, GROUND_Y + 0.002, x));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mat = new THREE.LineBasicMaterial({ color: GOLD_SOFT, transparent: true, opacity: 0.18 });
    world.add(new THREE.LineSegments(geo, mat));
  })();

  // ============================================================
  // Buildings (stepped isometric facilities)
  // ============================================================
  function makeBuilding(x, z, segments, withCap) {
    var grp = new THREE.Group();
    var y = GROUND_Y + 0.005;
    var lastW = 0, lastD = 0;
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      var face = i % 2 === 0 ? faceBldg : faceBldgDark;
      addBox(grp, s.w, s.h, s.d, x, y + s.h / 2, z, lineGold, face);
      y += s.h;
      lastW = s.w; lastD = s.d;
    }
    if (withCap) {
      addBox(grp, lastW * 0.45, 0.12, lastD * 0.45, x, y + 0.06, z, lineGold, faceBldgDark);
      y += 0.12;
    }
    world.add(grp);
    return { x: x, z: z, top: y };
  }

  // Central main facility (compliance HQ — tallest, stepped)
  var hqPos = new THREE.Vector3(0, GROUND_Y + 0.05, 0);
  var hq = makeBuilding(0, 0, [
    { w: 1.6, h: 0.55, d: 1.6 },
    { w: 1.25, h: 0.45, d: 1.25 },
    { w: 0.85, h: 0.40, d: 0.85 }
  ], true);

  // NE warehouse
  var neBuilding = makeBuilding( 3.4, -2.8, [
    { w: 1.6, h: 0.75, d: 2.0 }
  ], true);
  // NE roof rib detail
  for (var i = 0; i < 5; i++) {
    addBox(world, 1.7, 0.04, 0.16, 3.4, GROUND_Y + 0.78, -2.8 + (i - 2) * 0.36, lineGold, faceBldgDark);
  }

  // NW customs / checkpoint
  makeBuilding(-3.2, -2.4, [
    { w: 1.1, h: 0.55, d: 1.1 },
    { w: 0.8, h: 0.35, d: 0.8 }
  ], true);

  // SE distribution center (wider)
  makeBuilding(3.2, 2.6, [
    { w: 2.0, h: 0.45, d: 1.3 },
    { w: 1.4, h: 0.30, d: 0.9 }
  ], true);

  // SW depot (low + wide)
  makeBuilding(-3.0, 2.6, [
    { w: 1.8, h: 0.42, d: 1.4 }
  ], true);

  // Building reference positions (top center, for routing)
  var BLDGS = {
    hq: new THREE.Vector3( 0,    GROUND_Y + 0.05,  0   ),
    ne: new THREE.Vector3( 3.4,  GROUND_Y + 0.05, -2.8 ),
    nw: new THREE.Vector3(-3.2,  GROUND_Y + 0.05, -2.4 ),
    se: new THREE.Vector3( 3.2,  GROUND_Y + 0.05,  2.6 ),
    sw: new THREE.Vector3(-3.0,  GROUND_Y + 0.05,  2.6 )
  };

  // ============================================================
  // Container stacks (cargo yards)
  // ============================================================
  function makeContainerStack(cx, cz, rows, cols, layers) {
    var w = 0.36, h = 0.16, d = 0.18, gap = 0.03;
    for (var l = 0; l < layers; l++) {
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (Math.random() > 0.85) continue; // sparse top layer
          var x = cx + (c - (cols - 1) / 2) * (w + gap);
          var z = cz + (r - (rows - 1) / 2) * (d + gap);
          var y = GROUND_Y + 0.005 + h / 2 + l * (h + 0.005);
          var face = l % 2 === 0 ? faceCargoSoft : faceCargo;
          addBox(world, w, h, d, x, y, z, lineInk, face);
        }
      }
    }
  }
  makeContainerStack(-5.0, -0.2, 3, 4, 2);
  makeContainerStack( 5.2,  4.4, 2, 3, 2);
  makeContainerStack(-1.0, -5.0, 2, 5, 1);

  // ============================================================
  // Curving bezier routes between buildings
  // ============================================================
  var routes = [];
  function makeRoute(from, to, curvature) {
    var c = (typeof curvature === "number") ? curvature : 0.32;
    var p0 = from.clone(); p0.y = GROUND_Y + 0.03;
    var p2 = to.clone();   p2.y = GROUND_Y + 0.03;
    var mid = p0.clone().lerp(p2, 0.5);
    var dir = p2.clone().sub(p0);
    var perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    var p1 = mid.add(perp.multiplyScalar(dir.length() * c));
    var curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
    var pts = curve.getPoints(60);
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    world.add(new THREE.Line(geo, lineGold));
    // Subtle wider road shadow underneath (transparent gold band)
    var shadowGeo = new THREE.BufferGeometry().setFromPoints(pts);
    var shadowMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.25, linewidth: 3 });
    world.add(new THREE.Line(shadowGeo, shadowMat));
    routes.push({ curve: curve, len: dir.length() });
  }

  makeRoute(BLDGS.hq, BLDGS.ne,  0.30);
  makeRoute(BLDGS.hq, BLDGS.nw, -0.30);
  makeRoute(BLDGS.hq, BLDGS.se, -0.28);
  makeRoute(BLDGS.hq, BLDGS.sw,  0.28);
  makeRoute(BLDGS.ne, BLDGS.se,  0.45);
  makeRoute(BLDGS.sw, BLDGS.nw,  0.45);
  makeRoute(BLDGS.nw, BLDGS.ne,  0.18);

  // ============================================================
  // Trucks following the routes
  // ============================================================
  function makeTruck(isLead) {
    var truck = new THREE.Group();
    // Cargo box
    var cargoGeo = new THREE.BoxGeometry(0.28, 0.22, 0.40);
    var cargo = new THREE.Mesh(cargoGeo, isLead ? faceLoco : faceCargo);
    var cargoE = lineSeg(cargoGeo, lineInk);
    cargo.position.set(0, 0.12, -0.10);
    cargoE.position.set(0, 0.12, -0.10);
    truck.add(cargo); truck.add(cargoE);
    // Cab
    var cabGeo = new THREE.BoxGeometry(0.26, 0.18, 0.18);
    var cab = new THREE.Mesh(cabGeo, faceLoco);
    var cabE = lineSeg(cabGeo, lineInk);
    cab.position.set(0, 0.10, 0.22);
    cabE.position.set(0, 0.10, 0.22);
    truck.add(cab); truck.add(cabE);
    // Tiny gold headlight
    var hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.06, 0.04),
      new THREE.MeshBasicMaterial({ color: GOLD })
    );
    hl.position.set(0, 0.10, 0.32);
    truck.add(hl);
    return truck;
  }

  var trucks = [];
  var TRUCK_COUNT = 9;
  for (var i = 0; i < TRUCK_COUNT; i++) {
    var t = makeTruck(i % 4 === 0);
    world.add(t);
    trucks.push({
      mesh: t,
      routeIdx: i % routes.length,
      offset: Math.random(),
      direction: Math.random() > 0.5 ? 1 : -1,
      speedMult: 0.7 + Math.random() * 0.5
    });
  }

  // ============================================================
  // Central compliance oversight (floats above HQ)
  // ============================================================
  var coreBaseY = hq.top + 1.0;
  var coreGeo = new THREE.IcosahedronGeometry(0.30, 0);
  var coreFaces = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
    color: INK, transparent: true, opacity: 0.20
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
      new THREE.Vector3(0, hq.top, 0),
      new THREE.Vector3(0, coreBaseY - 0.26, 0)
    ]),
    lineGoldSoft
  ));
  // Inner seed
  var seedGeo = new THREE.OctahedronGeometry(0.10, 0);
  var seedEdges = lineSeg(seedGeo, new THREE.LineBasicMaterial({
    color: GOLD_DEEP, transparent: true, opacity: 1
  }));
  seedEdges.position.y = coreBaseY;
  world.add(seedEdges);

  // ============================================================
  // Low-poly scenery cones (trees / obstacles) at the edges
  // ============================================================
  (function () {
    var count = 24;
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      var r = 5.5 + Math.random() * 0.7;
      var x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      var scale = 0.5 + Math.random() * 0.6;
      var coneGeo = new THREE.ConeGeometry(0.13 * scale, 0.36 * scale, 5);
      var cone = new THREE.Mesh(coneGeo, faceTree);
      var coneE = lineSeg(coneGeo, lineGoldSoft);
      var cy = GROUND_Y + 0.18 * scale;
      cone.position.set(x, cy, z);
      coneE.position.set(x, cy, z);
      world.add(cone); world.add(coneE);
    }
  })();

  // ============================================================
  // Ambient gold particles
  // ============================================================
  var particleCount = 90;
  var particleGeo = new THREE.BufferGeometry();
  var particlePos = new Float32Array(particleCount * 3);
  for (var i = 0; i < particleCount; i++) {
    var r = 4.5 + Math.random() * 3.0;
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    particlePos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    particlePos[i * 3 + 1] = r * Math.cos(phi);
    particlePos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
  var particleMat = new THREE.PointsMaterial({
    color: GOLD, size: 0.05, transparent: true, opacity: 0.6, sizeAttenuation: true
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
  // Scroll-driven progress
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
  var rotY = -Math.PI / 14, rotX = 0;
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
    rotX = Math.max(-0.45, Math.min(0.45, rotX));
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
      if (idleFrames > IDLE_THRESHOLD && !reduceMotion) rotY += 0.0012;
    }

    pulse += (1 - pulse) * 0.09;
    world.scale.setScalar(pulse);
    world.rotation.y = rotY;
    world.rotation.x = rotX;

    // Smooth scroll progress
    smoothedProgress += (scrollProgress - smoothedProgress) * 0.10;
    // Tiny idle drift so trucks never look frozen
    if (!reduceMotion) smoothedProgress += 0.00015;

    // Compliance core float + spin
    var floatY = coreBaseY + Math.sin(t * 2.5) * 0.05;
    coreFaces.position.y = floatY;
    coreEdges.position.y = floatY;
    seedEdges.position.y = floatY;
    coreFaces.rotation.y = -t * 0.5;
    coreEdges.rotation.y = -t * 0.5;
    seedEdges.rotation.y =  t * 1.4;
    seedEdges.rotation.x =  t * 0.8;

    // Trucks along curves — driven by global smoothedProgress + per-truck offset
    var globalT = smoothedProgress * 4.5;
    for (var i = 0; i < trucks.length; i++) {
      var tk = trucks[i];
      var raw = (globalT * tk.speedMult * tk.direction + tk.offset);
      var u = raw - Math.floor(raw); // wrap [0,1)
      if (tk.direction < 0) u = 1 - u;
      var route = routes[tk.routeIdx];
      route.curve.getPointAt(u, posTmp);
      route.curve.getTangentAt(u, tangentTmp).normalize();
      tk.mesh.position.set(posTmp.x, posTmp.y + 0.04, posTmp.z);
      tk.mesh.rotation.y = Math.atan2(
        tangentTmp.x * tk.direction,
        tangentTmp.z * tk.direction
      );
      // When a truck finishes a loop, switch route + maybe trigger audit
      var prevU = tk._lastU;
      tk._lastU = u;
      if (typeof prevU === "number" && Math.abs(u - prevU) > 0.4) {
        tk.routeIdx = Math.floor(Math.random() * routes.length);
        if (i % 3 === 0) corePulse = Math.min(1, corePulse + 0.4);
      }
    }

    // Core pulse decay
    if (corePulse > 0.01) corePulse *= 0.93;
    seedEdges.scale.setScalar(1 + corePulse * 0.6);
    coreEdges.material.opacity = 0.95 + corePulse * 0.05;

    // Hover glow
    var tg = hover ? 1.0 : 0.95;
    var ts = hover ? 0.75 : 0.55;
    var tp = hover ? 0.9 : 0.6;
    lineGold.opacity     += (tg - lineGold.opacity)     * 0.08;
    lineGoldSoft.opacity += (ts - lineGoldSoft.opacity) * 0.08;
    particleMat.opacity  += (tp - particleMat.opacity)  * 0.08;

    particles.rotation.y = -t * 0.18;

    renderer.render(scene, camera);
  }
  animate();
})();
