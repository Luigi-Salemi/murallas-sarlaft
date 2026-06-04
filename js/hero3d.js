/* ============================================================
   Murallas · Hero 3D — Isometric transport network
   ------------------------------------------------------------
   Concept: top-down isometric road network with trucks moving
   along the roads. A central distribution hub with a small
   compliance oversight icon. Periodic "audit" pulses at the
   terminals. Drag to rotate, click for pulse, hover to brighten.
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
  var frustum = 3.2;
  var camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100);
  // Higher angle to emphasize the top-down map quality (more "above" the roads)
  camera.position.set(6, 8, 6);
  camera.lookAt(0, 0, 0);

  // ---------- Materials ----------
  var lineMatGold     = new THREE.LineBasicMaterial({ color: GOLD,      transparent: true, opacity: 0.95 });
  var lineMatSoft     = new THREE.LineBasicMaterial({ color: GOLD_SOFT, transparent: true, opacity: 0.6  });
  var lineMatInk      = new THREE.LineBasicMaterial({ color: INK,       transparent: true, opacity: 0.7  });
  var faceMatPlate    = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.06 });
  var faceMatRoad     = new THREE.MeshBasicMaterial({ color: GOLD,      transparent: true, opacity: 0.18 });
  var faceMatTerminal = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.14 });
  var faceMatHub      = new THREE.MeshBasicMaterial({ color: INK,       transparent: true, opacity: 0.20 });
  var faceMatTruck    = new THREE.MeshBasicMaterial({ color: GOLD });
  var faceMatCab      = new THREE.MeshBasicMaterial({ color: GOLD_DEEP });

  // World group (everything rotates with drag, except ambient particles)
  var world = new THREE.Group();
  scene.add(world);

  // ---------- Helpers ----------
  function addBox(parent, w, h, d, x, y, z, lineColor, faceMat) {
    var geo = new THREE.BoxGeometry(w, h, d);
    var mesh = new THREE.Mesh(geo, faceMat);
    mesh.position.set(x, y, z);
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineColor);
    edges.position.set(x, y, z);
    parent.add(mesh); parent.add(edges);
    return { mesh: mesh, edges: edges };
  }

  // ============================================================
  // Ground plate (the operational region — flat, viewed from above)
  // ============================================================
  var GROUND_Y = -0.4;
  addBox(world, 5.4, 0.16, 5.4, 0, GROUND_Y - 0.08, 0, lineMatSoft, faceMatPlate);

  // Subtle inset border on the plate
  (function () {
    var s = 2.2, y = GROUND_Y + 0.005;
    var pts = [
      new THREE.Vector3(-s, y, -s),
      new THREE.Vector3( s, y, -s),
      new THREE.Vector3( s, y,  s),
      new THREE.Vector3(-s, y,  s),
      new THREE.Vector3(-s, y, -s)
    ];
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMatSoft));
  })();

  // ============================================================
  // Road network: flat gold strips forming a "+" intersection
  // ============================================================
  var ROAD_Y = GROUND_Y + 0.02;
  var ROAD_W = 0.55;
  var ROAD_L = 4.4;
  addBox(world, ROAD_L, 0.04, ROAD_W, 0, ROAD_Y, 0, lineMatSoft, faceMatRoad); // east-west
  addBox(world, ROAD_W, 0.04, ROAD_L, 0, ROAD_Y, 0, lineMatSoft, faceMatRoad); // north-south

  // Center lane dashes (small gold rectangles for visual rhythm)
  function addLaneDash(x, z, w, d) {
    var geo = new THREE.BoxGeometry(w, 0.02, d);
    var mat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 });
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x, ROAD_Y + 0.03, z);
    world.add(m);
  }
  for (var i = -2; i <= 2; i++) {
    if (Math.abs(i) < 0.5) continue;
    addLaneDash(i * 0.55, 0, 0.22, 0.04); // east-west dashes
    addLaneDash(0, i * 0.55, 0.04, 0.22); // north-south dashes
  }

  // ============================================================
  // Terminals at the 4 road ends (low-profile buildings)
  // ============================================================
  var TERMINAL_Y = ROAD_Y + 0.18;
  var terminals = [];
  function addTerminal(x, z) {
    // Platform
    addBox(world, 0.9, 0.12, 0.9, x, ROAD_Y + 0.08, z, lineMatGold, faceMatTerminal);
    // Building (small block on top of platform)
    var b = addBox(world, 0.55, 0.32, 0.55, x, ROAD_Y + 0.30, z, lineMatGold, faceMatTerminal);
    terminals.push({
      pos: new THREE.Vector3(x, TERMINAL_Y, z),
      building: b,
      pulse: 0
    });
  }
  addTerminal( 2.4, 0   ); // east
  addTerminal(-2.4, 0   ); // west
  addTerminal( 0,    2.4); // south
  addTerminal( 0,   -2.4); // north

  // ============================================================
  // Central distribution hub + compliance oversight icon
  // ============================================================
  // Wide low platform
  addBox(world, 1.1, 0.10, 1.1, 0, ROAD_Y + 0.07, 0, lineMatGold, faceMatHub);
  // Smaller block on the platform (control building)
  addBox(world, 0.55, 0.28, 0.55, 0, ROAD_Y + 0.26, 0, lineMatGold, faceMatHub);

  // Floating compliance oversight: small icosahedron above center
  var coreY = ROAD_Y + 0.95;
  var coreGeo = new THREE.IcosahedronGeometry(0.26, 0);
  var coreFaces = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({
    color: INK, transparent: true, opacity: 0.18
  }));
  var coreEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(coreGeo),
    new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 1 })
  );
  coreFaces.position.y = coreY;
  coreEdges.position.y = coreY;
  world.add(coreFaces); world.add(coreEdges);

  // Tether line from hub to oversight icon (dotted-like via thin segment)
  (function () {
    var pts = [
      new THREE.Vector3(0, ROAD_Y + 0.40, 0),
      new THREE.Vector3(0, coreY - 0.22, 0)
    ];
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    world.add(new THREE.Line(geo, lineMatSoft));
  })();

  // Inner seed (the "value" being protected)
  var seedGeo = new THREE.OctahedronGeometry(0.08, 0);
  var seedEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(seedGeo),
    new THREE.LineBasicMaterial({ color: GOLD_DEEP, transparent: true, opacity: 1 })
  );
  seedEdges.position.y = coreY;
  world.add(seedEdges);

  // ============================================================
  // Trucks: cab + cargo on the roads
  // ============================================================
  // Routes: 8 segments (center→each terminal + each terminal→center)
  var center = new THREE.Vector3(0, ROAD_Y + 0.05, 0);
  var routes = [];
  terminals.forEach(function (t) {
    var dropoff = t.pos.clone(); dropoff.y = ROAD_Y + 0.05;
    routes.push({ from: center.clone(),  to: dropoff, terminalIdx: terminals.indexOf(t) });
    routes.push({ from: dropoff.clone(), to: center.clone(), terminalIdx: -1 });
  });

  function makeTruck() {
    var truck = new THREE.Group();

    // Cargo box (back)
    var cargoGeo = new THREE.BoxGeometry(0.30, 0.24, 0.42);
    var cargo = new THREE.Mesh(cargoGeo, faceMatTruck);
    var cargoEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cargoGeo), lineMatInk);
    cargo.position.set(0, 0.12, -0.10);
    cargoEdges.position.set(0, 0.12, -0.10);
    truck.add(cargo); truck.add(cargoEdges);

    // Cab (front) — slightly smaller, deeper gold, sits in front of cargo
    var cabGeo = new THREE.BoxGeometry(0.28, 0.20, 0.20);
    var cab = new THREE.Mesh(cabGeo, faceMatCab);
    var cabEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cabGeo), lineMatInk);
    cab.position.set(0, 0.10, 0.22);
    cabEdges.position.set(0, 0.10, 0.22);
    truck.add(cab); truck.add(cabEdges);

    return truck;
  }

  var trucks = [];
  var TRUCK_COUNT = 5;
  for (var i = 0; i < TRUCK_COUNT; i++) {
    var truck = makeTruck();
    world.add(truck);
    trucks.push({
      mesh: truck,
      routeIdx: Math.floor(Math.random() * routes.length),
      t: i / TRUCK_COUNT,
      speed: 0.0028 + Math.random() * 0.002
    });
  }

  // ============================================================
  // Ambient particles
  // ============================================================
  var particleCount = 70;
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
  // Interaction: drag, momentum, click, hover
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
    rotX = Math.max(-0.55, Math.min(0.55, rotX));
    lastX = p.x; lastY = p.y;
    idleFrames = 0;
  }
  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    if (!dragMoved) {
      pulse = 1.14;
      var idx = Math.floor(Math.random() * terminals.length);
      terminals[idx].pulse = 1;
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

  var nextAuditAt = performance.now() + 2200 + Math.random() * 2200;

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
      if (idleFrames > IDLE_THRESHOLD && !reduceMotion) rotY += 0.0028;
    }

    pulse += (1 - pulse) * 0.09;
    world.scale.setScalar(pulse);
    world.rotation.y = rotY;
    world.rotation.x = rotX;

    // Compliance core gently floats and rotates
    coreEdges.position.y = coreY + Math.sin(t * 3) * 0.04;
    coreFaces.position.y = coreEdges.position.y;
    seedEdges.position.y = coreEdges.position.y;
    coreFaces.rotation.y = -t * 0.5;
    coreEdges.rotation.y = -t * 0.5;
    seedEdges.rotation.y =  t * 1.4;
    seedEdges.rotation.x =  t * 0.8;

    // Drive trucks along routes
    for (var i = 0; i < trucks.length; i++) {
      var tk = trucks[i];
      tk.t += tk.speed;
      if (tk.t >= 1) {
        // Trigger audit when truck reaches a terminal
        var r = routes[tk.routeIdx];
        if (r.terminalIdx >= 0) terminals[r.terminalIdx].pulse = 1;
        tk.t = 0;
        tk.routeIdx = Math.floor(Math.random() * routes.length);
      }
      var route = routes[tk.routeIdx];
      tmpV.copy(route.from).lerp(route.to, tk.t);
      tk.mesh.position.set(tmpV.x, tmpV.y, tmpV.z);
      // Face direction of travel
      var dirX = route.to.x - route.from.x;
      var dirZ = route.to.z - route.from.z;
      tk.mesh.rotation.y = Math.atan2(dirX, dirZ);
    }

    // Terminal audit pulses (scale + glow)
    var now = performance.now();
    if (now >= nextAuditAt) {
      var idx = Math.floor(Math.random() * terminals.length);
      terminals[idx].pulse = 1;
      nextAuditAt = now + 2200 + Math.random() * 2200;
    }
    terminals.forEach(function (term) {
      if (term.pulse > 0.01) term.pulse *= 0.93;
      var s = 1 + term.pulse * 0.18;
      term.building.mesh.scale.set(s, 1 + term.pulse * 0.45, s);
      term.building.edges.scale.set(s, 1 + term.pulse * 0.45, s);
    });

    // Hover glow
    var targetGold     = hover ? 1.0  : 0.95;
    var targetSoft     = hover ? 0.8  : 0.6;
    var targetParticle = hover ? 1.0  : 0.7;
    lineMatGold.opacity += (targetGold     - lineMatGold.opacity) * 0.08;
    lineMatSoft.opacity += (targetSoft     - lineMatSoft.opacity) * 0.08;
    particleMat.opacity += (targetParticle - particleMat.opacity) * 0.08;

    particles.rotation.y = -t * 0.22;

    renderer.render(scene, camera);
  }
  animate();
})();
