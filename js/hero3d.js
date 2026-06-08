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

  // Camera keyframes — narrative tour through the transport route
  // 0: HERO            — wide overview, see whole route
  // 1: TRUST           — push toward warehouse (origin)
  // 2: SERVICES        — close on the warehouse + container yard
  // 3: ABOUT           — pan along highway to the SARLAFT checkpoint
  // 4: APPROACH        — close on the checkpoint scan + trucks
  // 5: CTA             — wide aerial swing
  // 6: CONTACT         — close on downtown destination
  var camStops = [
    { pos: new THREE.Vector3( 6,    5,    9   ), look: new THREE.Vector3( 0,    0.3, 0   ), zoom: 1.20 },
    { pos: new THREE.Vector3(-1,    4,    7   ), look: new THREE.Vector3(-3,    0.3, 0   ), zoom: 1.50 },
    { pos: new THREE.Vector3(-6,    3.5,  5   ), look: new THREE.Vector3(-3.5,  0.5, 0.5 ), zoom: 1.75 },
    { pos: new THREE.Vector3(-2,    3,    5   ), look: new THREE.Vector3( 0.5,  0.5, 0   ), zoom: 1.55 },
    { pos: new THREE.Vector3( 1.5,  2.5,  4.5 ), look: new THREE.Vector3( 0.5,  0.6, 0   ), zoom: 2.00 },
    { pos: new THREE.Vector3( 2,    8,    9   ), look: new THREE.Vector3( 1,    0,   0   ), zoom: 1.25 },
    { pos: new THREE.Vector3( 8,    4,    5   ), look: new THREE.Vector3( 4,    0.8, 0   ), zoom: 1.60 }
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
  // BODEGA / WAREHOUSE — origin point (west side)
  // ============================================================
  var WAREHOUSE_X = -4.0, WAREHOUSE_Z = 0;
  var warehouse = new THREE.Group(); world.add(warehouse);
  // Main warehouse body — wide, long, low
  addBox(warehouse, 2.4, 0.75, 1.8, WAREHOUSE_X, GROUND_Y + 0.375, WAREHOUSE_Z, matWhite);
  // Flat roof cap
  addBox(warehouse, 2.5, 0.05, 1.9, WAREHOUSE_X, GROUND_Y + 0.775, WAREHOUSE_Z, matShadeLt);
  // 4 loading bay doors on the east face (facing the highway)
  for (var i = 0; i < 4; i++) {
    var doorZ = WAREHOUSE_Z + (i - 1.5) * 0.40;
    var bayDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.45, 0.30),
      new THREE.MeshLambertMaterial({ color: 0x4a5568 })
    );
    bayDoor.position.set(WAREHOUSE_X + 1.21, GROUND_Y + 0.225, doorZ);
    warehouse.add(bayDoor);
  }
  // 3 roof ridge ribs
  for (var i = 0; i < 3; i++) {
    var ridgeZ = WAREHOUSE_Z + (i - 1) * 0.55;
    addBox(warehouse, 2.45, 0.03, 0.08, WAREHOUSE_X, GROUND_Y + 0.81, ridgeZ, matShadeLt);
  }
  // Sign panel on the roof / front
  var sign = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.20, 0.06),
    matBlueDeep
  );
  sign.position.set(WAREHOUSE_X + 0.4, GROUND_Y + 0.95, WAREHOUSE_Z - 0.92);
  warehouse.add(sign);
  // Small office annex (south side of warehouse)
  addBox(warehouse, 0.80, 0.55, 0.80,
    WAREHOUSE_X - 1.5, GROUND_Y + 0.275, WAREHOUSE_Z + 0.5, matWhite);
  addBox(warehouse, 0.40, 0.10, 0.40,
    WAREHOUSE_X - 1.5, GROUND_Y + 0.60, WAREHOUSE_Z + 0.5, matShadeLt);
  // Container yard adjacent (south of warehouse)
  (function makeContainerYard() {
    var w = 0.40, h = 0.18, d = 0.20, gap = 0.025;
    var cx = WAREHOUSE_X - 0.4, cz = WAREHOUSE_Z + 1.45;
    var rows = 2, cols = 4, layers = 2;
    for (var l = 0; l < layers; l++) {
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (l > 0 && Math.random() > 0.6) continue;
          var x = cx + (c - (cols - 1) / 2) * (w + gap);
          var z = cz + (r - (rows - 1) / 2) * (d + gap);
          var y = GROUND_Y + 0.005 + h / 2 + l * (h + 0.005);
          var mat = l === 0 ? matWhite : matShadeLt;
          addBox(world, w, h, d, x, y, z, mat);
        }
      }
    }
  })();

  // ============================================================
  // DOWNTOWN CITY CENTER — destination (east side)
  // ============================================================
  function makeSkyscraper(x, z, h, w, glass, antennaChance) {
    var grp = new THREE.Group();
    addBox(grp, w, h, w, x, GROUND_Y + h / 2, z, matWhite);
    // Vertical glass strips for the "tall building" look
    if (glass) {
      var n = 4;
      for (var i = 0; i < n; i++) {
        var sx = x + (i - (n - 1) / 2) * (w / (n + 0.5));
        var s = new THREE.Mesh(
          new THREE.BoxGeometry(0.035, h * 0.78, w + 0.012),
          matShadeLt
        );
        s.position.set(sx, GROUND_Y + h / 2, z);
        grp.add(s);
      }
      // Side-face glass strips too
      for (var i = 0; i < n; i++) {
        var sz = z + (i - (n - 1) / 2) * (w / (n + 0.5));
        var s = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.012, h * 0.78, 0.035),
          matShadeLt
        );
        s.position.set(x, GROUND_Y + h / 2, sz);
        grp.add(s);
      }
    }
    // Stepped cap
    addBox(grp, w * 0.78, 0.08, w * 0.78, x, GROUND_Y + h + 0.04, z, matShadeLt);
    addBox(grp, w * 0.50, 0.14, w * 0.50, x, GROUND_Y + h + 0.15, z, matWhite);
    if (antennaChance) {
      var ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.022, 0.35, 6), matFigure
      );
      ant.position.set(x, GROUND_Y + h + 0.40, z);
      ant.castShadow = true;
      grp.add(ant);
      // Tip ball
      var tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), matBlueDeep);
      tip.position.set(x, GROUND_Y + h + 0.60, z);
      grp.add(tip);
    }
    world.add(grp);
  }

  // Downtown cluster — varied heights for skyline
  makeSkyscraper( 4.3, -1.0, 2.50, 0.95, true,  true );  // tallest
  makeSkyscraper( 3.4,  0.3, 1.70, 0.80, true,  false);
  makeSkyscraper( 4.7,  1.1, 2.00, 0.85, true,  true );
  makeSkyscraper( 3.7, -2.2, 1.40, 0.75, false, false);
  makeSkyscraper( 5.4,  0.0, 1.20, 0.70, true,  false);
  makeSkyscraper( 2.8, -1.0, 0.95, 0.65, false, false);
  makeSkyscraper( 5.0,  2.4, 1.55, 0.78, true,  true );
  makeSkyscraper( 3.0,  1.5, 1.05, 0.62, false, false);

  // ============================================================
  // AUDIT CHECKPOINT — SARLAFT scan gate over the highway
  // ============================================================
  var CHECK_X = 0.5, CHECK_Z = 0;
  var checkpoint = new THREE.Group(); world.add(checkpoint);
  // Two pillars (one on each side of road)
  var pillarL = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.80, 0.20), matWhite
  );
  pillarL.position.set(CHECK_X, GROUND_Y + 0.40, CHECK_Z - 0.55);
  pillarL.castShadow = true;
  var pillarR = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.80, 0.20), matWhite
  );
  pillarR.position.set(CHECK_X, GROUND_Y + 0.40, CHECK_Z + 0.55);
  pillarR.castShadow = true;
  // Top arch beam
  var archBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.14, 1.30), matBlueDeep
  );
  archBeam.position.set(CHECK_X, GROUND_Y + 0.87, CHECK_Z);
  archBeam.castShadow = true;
  // Scanner unit hanging from arch
  var scanner = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.30), matBlue
  );
  scanner.position.set(CHECK_X, GROUND_Y + 0.77, CHECK_Z);
  checkpoint.add(pillarL, pillarR, archBeam, scanner);
  // Small operator booth next to checkpoint
  addBox(checkpoint, 0.55, 0.35, 0.55, CHECK_X + 0.2, GROUND_Y + 0.175, CHECK_Z - 1.2, matWhite);
  addBox(checkpoint, 0.30, 0.06, 0.30, CHECK_X + 0.2, GROUND_Y + 0.38, CHECK_Z - 1.2, matShadeLt);

  // ============================================================
  // GAS / SERVICE STATION (mid-route, south of highway)
  // ============================================================
  (function () {
    var grp = new THREE.Group();
    var x = -1.3, z = 2.2;
    // Convenience store
    addBox(grp, 0.90, 0.45, 0.80, x, GROUND_Y + 0.225, z, matWhite);
    addBox(grp, 0.95, 0.05, 0.85, x, GROUND_Y + 0.475, z, matShadeLt);
    // Canopy over pumps
    addBox(grp, 1.10, 0.05, 0.70, x + 1.0, GROUND_Y + 0.65, z, matWhite);
    // Canopy supports
    for (var i = -1; i <= 1; i += 2) {
      var support = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.60, 6), matFigure
      );
      support.position.set(x + 1.0 + i * 0.4, GROUND_Y + 0.30, z + 0.20);
      support.castShadow = true;
      grp.add(support);
      var support2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.60, 6), matFigure
      );
      support2.position.set(x + 1.0 + i * 0.4, GROUND_Y + 0.30, z - 0.20);
      support2.castShadow = true;
      grp.add(support2);
    }
    // 2 fuel pumps
    for (var p = 0; p < 2; p++) {
      var pump = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.30, 0.08), matBlueDeep
      );
      pump.position.set(x + 1.0 + (p - 0.5) * 0.30, GROUND_Y + 0.15, z);
      pump.castShadow = true;
      grp.add(pump);
    }
    world.add(grp);
  })();

  var hqTop = GROUND_Y + 0.95; // for compatibility with compliance core code below

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
  // (the warehouse container yard is built separately above)

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
  // Workers at the warehouse + pedestrians downtown
  makeFigure(-3.2,  1.5);
  makeFigure(-2.8, -1.0);
  makeFigure(-4.5,  0.5);
  makeFigure( 0.5, -1.0);
  makeFigure( 3.6, -0.2);
  makeFigure( 4.2,  1.8);
  makeFigure( 3.0,  0.5);

  // ============================================================
  // HIGHWAY — multi-lane curving from warehouse to downtown
  // ============================================================
  var routes = [];
  function makeHighway(p0Raw, p2Raw, curvature, lanes, centerColor) {
    var p0 = p0Raw.clone(); p0.y = GROUND_Y + 0.025;
    var p2 = p2Raw.clone(); p2.y = GROUND_Y + 0.025;
    var mid = p0.clone().lerp(p2, 0.5);
    var dir = p2.clone().sub(p0);
    var perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    var p1Main = mid.clone().add(perp.clone().multiplyScalar(dir.length() * curvature));
    // Build each parallel lane
    for (var l = 0; l < lanes; l++) {
      var laneOffset = (l - (lanes - 1) / 2) * 0.16;
      var laneP0 = p0.clone().add(perp.clone().multiplyScalar(laneOffset));
      var laneP1 = p1Main.clone().add(perp.clone().multiplyScalar(laneOffset));
      var laneP2 = p2.clone().add(perp.clone().multiplyScalar(laneOffset));
      var curve = new THREE.QuadraticBezierCurve3(laneP0, laneP1, laneP2);
      var pts = curve.getPoints(80);
      var geo = new THREE.BufferGeometry().setFromPoints(pts);
      var isMid = (l === Math.floor(lanes / 2));
      var mat = isMid ? (centerColor === "red" ? matRouteRed : matRouteBlue) :
                        new THREE.LineBasicMaterial({ color: SHADE_MID, transparent: true, opacity: 0.55 });
      world.add(new THREE.Line(geo, mat));
      routes.push({ curve: curve, color: isMid ? centerColor : "lane" });
    }
  }

  // Main highway: warehouse east face → through checkpoint → downtown
  var WAREHOUSE_EXIT = new THREE.Vector3(WAREHOUSE_X + 1.5, 0, WAREHOUSE_Z);
  var DOWNTOWN_ENTRY = new THREE.Vector3(2.6, 0, 0);
  makeHighway(WAREHOUSE_EXIT, DOWNTOWN_ENTRY, -0.05, 4, "blue");

  // Secondary route — northern bypass (red, flagged audit branch)
  makeHighway(
    new THREE.Vector3(WAREHOUSE_X + 0.5, 0, WAREHOUSE_Z - 1.2),
    new THREE.Vector3(3.0, 0, -2.5),
    -0.30, 2, "red"
  );

  // Southern service road (toward gas station)
  makeHighway(
    new THREE.Vector3(WAREHOUSE_X + 0.8, 0, WAREHOUSE_Z + 1.3),
    new THREE.Vector3(2.5, 0, 1.5),
    0.25, 2, "blue"
  );

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

  // Elegant CURVING scan beam from the checkpoint scanner — bezier arc
  // emanating down along the highway (audit ray scanning the trucks)
  var beamCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(CHECK_X,        GROUND_Y + 0.72, CHECK_Z),
    new THREE.Vector3(CHECK_X + 1.2,  GROUND_Y + 0.35, CHECK_Z),
    new THREE.Vector3(CHECK_X + 2.6,  GROUND_Y + 0.06, CHECK_Z + 0.2)
  );
  // Soft trail line along the curve
  var trailPts = beamCurve.getPoints(80);
  var trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
  var trailMat = new THREE.LineBasicMaterial({
    color: BLUE, transparent: true, opacity: 0.50
  });
  world.add(new THREE.Line(trailGeo, trailMat));

  // Particles flowing along the curve
  var beamCount = 90;
  var beamGeo = new THREE.BufferGeometry();
  var beamPos = new Float32Array(beamCount * 3);
  var beamMeta = [];
  for (var i = 0; i < beamCount; i++) {
    beamMeta.push({ t: Math.random(), speed: 0.0035 + Math.random() * 0.0025 });
    var p = beamCurve.getPointAt(beamMeta[i].t);
    beamPos[i * 3]     = p.x;
    beamPos[i * 3 + 1] = p.y;
    beamPos[i * 3 + 2] = p.z;
  }
  beamGeo.setAttribute("position", new THREE.BufferAttribute(beamPos, 3));
  var beamMat = new THREE.PointsMaterial({
    color: BLUE, size: 0.065, transparent: true, opacity: 0.90, sizeAttenuation: true
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
  // Scroll progress — across the ENTIRE page now
  // ============================================================
  var scrollProgress = 0;
  function updateScrollProgress() {
    var doc = document.documentElement;
    var totalH = Math.max(1, (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight);
    var scrolled = window.scrollY || doc.scrollTop || 0;
    scrollProgress = Math.max(0, Math.min(1, scrolled / totalH));
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

    // Scan beam — particles flow along the bezier curve
    var beamPosAttr = beam.geometry.attributes.position;
    var beamTmp = new THREE.Vector3();
    for (var i = 0; i < beamCount; i++) {
      var m = beamMeta[i];
      m.t += m.speed;
      if (m.t > 1) m.t = 0;
      beamCurve.getPointAt(m.t, beamTmp);
      beamPosAttr.array[i * 3]     = beamTmp.x;
      beamPosAttr.array[i * 3 + 1] = beamTmp.y;
      beamPosAttr.array[i * 3 + 2] = beamTmp.z;
    }
    beamPosAttr.needsUpdate = true;
    beamMat.opacity = 0.75 + (Math.sin(t * 2.0)) * 0.15;

    // (no rotating elements; checkpoint scanner could pulse via emissive)

    if (corePulse > 0.01) corePulse *= 0.93;
    seedEdges.scale.setScalar(1 + corePulse * 0.6);

    var tg = hover ? 1.0 : 0.95;
    matRouteBlue.opacity += (tg - matRouteBlue.opacity) * 0.08;
    matRouteRed.opacity  += (tg - matRouteRed.opacity)  * 0.08;

    renderer.render(scene, camera);
  }
  animate();
})();
