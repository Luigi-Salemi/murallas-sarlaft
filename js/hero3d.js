/* ============================================================
   Murallas · Hero 3D — Isometric SARLAFT transport network
   ------------------------------------------------------------
   Concept: a transportation operations network (corner hubs +
   gold routes) overseen by a central compliance core
   (icosahedron). Small gold cargo cubes travel along the
   routes; nodes pulse when "audited."  Drag to rotate, click
   for a pulse, hover to brighten.  Isometric orthographic.
   ============================================================ */
(function () {
  "use strict";

  if (typeof THREE === "undefined") return;

  var canvas = document.getElementById("heroCanvas");
  var visual = document.getElementById("heroVisual");
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
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power"
    });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();

  // ---------- Isometric orthographic camera ----------
  var frustum = 3.6;
  var camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
  camera.position.set(7, 6, 7);
  camera.lookAt(0, 0.2, 0);

  // ---------- Materials ----------
  var lineMat     = new THREE.LineBasicMaterial({ color: GOLD,      transparent: true, opacity: 0.95 });
  var lineMatSoft = new THREE.LineBasicMaterial({ color: GOLD_SOFT, transparent: true, opacity: 0.6  });
  var routeMat    = new THREE.LineBasicMaterial({ color: GOLD_SOFT, transparent: true, opacity: 0.55 });
  var faceMat     = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.08 });
  var hubFaceMat  = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.18 });

  // World group (everything rotates with drag, except ambient particles)
  var world = new THREE.Group();
  scene.add(world);

  // ---------- Helpers ----------
  function addBox(parent, w, h, d, x, y, z, soft, faceOverride) {
    var geo = new THREE.BoxGeometry(w, h, d);
    var mesh = new THREE.Mesh(geo, faceOverride || faceMat);
    mesh.position.set(x, y, z);
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), soft ? lineMatSoft : lineMat);
    edges.position.set(x, y, z);
    parent.add(mesh); parent.add(edges);
    return { mesh: mesh, edges: edges };
  }
  function lineBetween(parent, a, b, mat) {
    var geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    var line = new THREE.Line(geo, mat);
    parent.add(line);
    return line;
  }

  // ============================================================
  // Base operational plate (the territory of operations)
  // ============================================================
  addBox(world, 5.2, 0.18, 5.2, 0, -0.55, 0, true);

  // Subtle inset border on the plate (decorative iso detail)
  (function () {
    var s = 2.0;
    var y = -0.46;
    var pts = [
      new THREE.Vector3(-s, y, -s),
      new THREE.Vector3( s, y, -s),
      new THREE.Vector3( s, y,  s),
      new THREE.Vector3(-s, y,  s),
      new THREE.Vector3(-s, y, -s)
    ];
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    world.add(new THREE.Line(geo, lineMatSoft));
  })();

  // ============================================================
  // 4 corner hubs (operational locations / clients)
  // ============================================================
  var hubs = [];
  var hubPositions = [
    [-1.8, 0, -1.8],
    [ 1.8, 0, -1.8],
    [ 1.8, 0,  1.8],
    [-1.8, 0,  1.8]
  ];
  hubPositions.forEach(function (p) {
    // Pillar
    addBox(world, 0.38, 0.7, 0.38, p[0], -0.1, p[2], false);
    // Cap (slightly wider, shorter)
    var capY = 0.34;
    addBox(world, 0.55, 0.16, 0.55, p[0], capY, p[2], false, hubFaceMat);
    hubs.push({
      pos: new THREE.Vector3(p[0], capY + 0.08, p[2]),
      pulse: 0
    });
  });

  // ============================================================
  // Central compliance core (the SARLAFT oversight)
  // ============================================================
  // Tall pillar
  addBox(world, 0.28, 1.5, 0.28, 0, 0.25, 0, false);

  // Icosahedron core on top (compliance hub)
  var coreY = 1.45;
  var coreGeo = new THREE.IcosahedronGeometry(0.42, 0);
  var coreFaces = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
    color: INK, transparent: true, opacity: 0.22
  }));
  var coreEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeo),
    new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 1 })
  );
  coreFaces.position.y = coreY;
  coreEdges.position.y = coreY;
  world.add(coreFaces); world.add(coreEdges);

  // Small inner seed (the "value" being protected)
  var seedGeo = new THREE.OctahedronGeometry(0.14, 0);
  var seedEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(seedGeo),
    new THREE.LineBasicMaterial({ color: GOLD_DEEP, transparent: true, opacity: 1 })
  );
  seedEdges.position.y = coreY;
  world.add(seedEdges);

  var centerPos = new THREE.Vector3(0, coreY, 0);

  // ============================================================
  // Routes (gold lines): each hub -> center, plus perimeter
  // ============================================================
  var routes = [];
  hubs.forEach(function (h) {
    lineBetween(world, h.pos, centerPos, routeMat);
    routes.push({ from: h.pos.clone(), to: centerPos.clone() });
    routes.push({ from: centerPos.clone(), to: h.pos.clone() });
  });
  // Perimeter routes (between adjacent hubs)
  var hp = hubs.map(function (h) { return h.pos.clone(); });
  [[0,1],[1,2],[2,3],[3,0]].forEach(function (pair) {
    lineBetween(world, hp[pair[0]], hp[pair[1]], routeMat);
    routes.push({ from: hp[pair[0]].clone(), to: hp[pair[1]].clone() });
  });

  // ============================================================
  // Cargo cubes — small gold boxes that travel along routes
  // ============================================================
  var cargos = [];
  var CARGO_SIZE = 0.13;
  var cargoGeo = new THREE.BoxGeometry(CARGO_SIZE, CARGO_SIZE, CARGO_SIZE);
  var cargoEdgeGeo = new THREE.EdgesGeometry(cargoGeo);

  function spawnCargo(initialT) {
    var mat = new THREE.MeshBasicMaterial({ color: GOLD });
    var box = new THREE.Mesh(cargoGeo, mat);
    var edges = new THREE.LineSegments(cargoEdgeGeo, new THREE.LineBasicMaterial({
      color: INK, transparent: true, opacity: 0.85
    }));
    box.add(edges);
    world.add(box);
    var routeIdx = Math.floor(Math.random() * routes.length);
    cargos.push({
      mesh: box,
      routeIdx: routeIdx,
      t: typeof initialT === "number" ? initialT : Math.random(),
      speed: 0.0028 + Math.random() * 0.0025
    });
  }
  for (var i = 0; i < 8; i++) spawnCargo(i / 8);

  // ============================================================
  // Ambient particles (data / monitoring stream) — kept in world
  // space so they don't drag with the assembly
  // ============================================================
  var particleCount = 80;
  var particleGeo = new THREE.BufferGeometry();
  var particlePos = new Float32Array(particleCount * 3);
  for (var i = 0; i < particleCount; i++) {
    var r = 3.2 + Math.random() * 2.4;
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
  // Resize handling
  // ============================================================
  function resize() {
    var w = canvas.clientWidth || (canvas.parentElement ? canvas.parentElement.clientWidth : 0);
    var h = canvas.clientHeight || (canvas.parentElement ? canvas.parentElement.clientHeight : 0);
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    var a = w / h;
    camera.left   = -frustum * a;
    camera.right  =  frustum * a;
    camera.top    =  frustum;
    camera.bottom = -frustum;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("load", resize);
  requestAnimationFrame(resize);
  if (window.ResizeObserver && visual) {
    var ro = new ResizeObserver(resize);
    ro.observe(visual);
  }

  // ============================================================
  // Interaction: drag, momentum, click pulse, hover
  // ============================================================
  var rotY = Math.PI / 6;
  var rotX = 0;
  var velY = 0, velX = 0;
  var isDragging = false, dragMoved = false;
  var lastX = 0, lastY = 0;
  var pulse = 1;
  var hover = false;
  var idleFrames = 0;
  var IDLE_THRESHOLD = 90;

  function pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }
  function onDown(e) {
    isDragging = true; dragMoved = false; idleFrames = 0;
    var p = pointerXY(e); lastX = p.x; lastY = p.y;
    velX = 0; velY = 0;
    if (visual) visual.classList.add("engaged");
    if (e.cancelable) e.preventDefault();
  }
  function onMove(e) {
    if (!isDragging) return;
    var p = pointerXY(e);
    var dx = p.x - lastX, dy = p.y - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
    velY = dx * 0.006;
    velX = dy * 0.005;
    rotY += velY;
    rotX += velX;
    rotX = Math.max(-0.65, Math.min(0.65, rotX));
    lastX = p.x; lastY = p.y;
    idleFrames = 0;
  }
  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    if (!dragMoved) {
      pulse = 1.14;
      // Trigger an audit pulse on a random hub
      var idx = Math.floor(Math.random() * hubs.length);
      hubs[idx].pulse = 1;
    }
  }
  function onEnter() { hover = true; idleFrames = 0; }
  function onLeave() { hover = false; }

  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  canvas.addEventListener("pointerenter", onEnter);
  canvas.addEventListener("pointerleave", onLeave);

  // Auto random hub-pulse every ~3-5 seconds (audit signal)
  var nextAuditAt = performance.now() + 2500 + Math.random() * 2500;

  // ============================================================
  // Animation loop
  // ============================================================
  var t = 0;
  var tmpV = new THREE.Vector3();

  function animate() {
    requestAnimationFrame(animate);
    if (!reduceMotion) t += 0.004;

    if (!isDragging) {
      rotY += velY; rotX += velX;
      velY *= 0.94; velX *= 0.94;
      rotX *= 0.97;
      idleFrames++;
      if (idleFrames > IDLE_THRESHOLD && !reduceMotion) rotY += 0.003;
    }

    pulse += (1 - pulse) * 0.09;
    world.scale.setScalar(pulse);

    world.rotation.y = rotY;
    world.rotation.x = rotX;

    // Inner core spins gently
    coreFaces.rotation.y = -t * 0.5;
    coreEdges.rotation.y = -t * 0.5;
    seedEdges.rotation.y =  t * 1.2;
    seedEdges.rotation.x =  t * 0.7;

    // Update cargo positions along their routes
    for (var i = 0; i < cargos.length; i++) {
      var c = cargos[i];
      c.t += c.speed;
      if (c.t >= 1) {
        c.t = 0;
        c.routeIdx = Math.floor(Math.random() * routes.length);
      }
      var r = routes[c.routeIdx];
      tmpV.copy(r.from).lerp(r.to, c.t);
      // Small vertical arc so cargo looks like it travels above the route
      var arc = Math.sin(c.t * Math.PI) * 0.06;
      c.mesh.position.set(tmpV.x, tmpV.y + arc, tmpV.z);
      c.mesh.rotation.x += 0.02;
      c.mesh.rotation.y += 0.025;
    }

    // Hub audit pulses (scale + opacity ripple) — uses scale on cap
    var now = performance.now();
    if (now >= nextAuditAt) {
      var idx = Math.floor(Math.random() * hubs.length);
      hubs[idx].pulse = 1;
      nextAuditAt = now + 2500 + Math.random() * 2500;
    }
    hubs.forEach(function (h) {
      if (h.pulse > 0.01) h.pulse *= 0.93;
      // We visualize the pulse via core hub seed glow (subtle global signal)
    });
    var anyPulse = hubs.reduce(function (a, h) { return a + h.pulse; }, 0);
    coreEdges.material.opacity = 0.95 + anyPulse * 0.05;
    seedEdges.material.opacity = 1.0;
    seedEdges.scale.setScalar(1 + anyPulse * 0.5);

    // Hover glow
    var targetLine     = hover ? 1.0 : 0.95;
    var targetSoft     = hover ? 0.8 : 0.6;
    var targetRoute    = hover ? 0.85 : 0.55;
    var targetParticle = hover ? 1.0 : 0.7;
    lineMat.opacity     += (targetLine     - lineMat.opacity)     * 0.08;
    lineMatSoft.opacity += (targetSoft     - lineMatSoft.opacity) * 0.08;
    routeMat.opacity    += (targetRoute    - routeMat.opacity)    * 0.08;
    particleMat.opacity += (targetParticle - particleMat.opacity) * 0.08;

    // Particles ambient
    particles.rotation.y = -t * 0.25;

    renderer.render(scene, camera);
  }
  animate();
})();
