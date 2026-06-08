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

  // Camera keyframes — one per page section (7 stops across the entire page)
  // 0: Hero (wide overview)
  // 1: Trust strip (slight push in)
  // 2: Services (close on HQ from above)
  // 3: About (pan to NE warehouse)
  // 4: Approach (swing to NW customs, opposite side)
  // 5: CTA (pull back, high angle)
  // 6: Contact (settle on the hub)
  var camStops = [
    { pos: new THREE.Vector3( 7,    5,    8   ), look: new THREE.Vector3( 0,    0.2, 0   ), zoom: 1.30 },
    { pos: new THREE.Vector3( 5.5,  4,    7   ), look: new THREE.Vector3( 0,    0.5, 0   ), zoom: 1.55 },
    { pos: new THREE.Vector3( 2.5,  3,    5   ), look: new THREE.Vector3( 0,    0.7, 0   ), zoom: 1.80 },
    { pos: new THREE.Vector3( 7,    4,    -3  ), look: new THREE.Vector3( 3,    0.3, -2.5), zoom: 1.45 },
    { pos: new THREE.Vector3(-7,    5,    -2  ), look: new THREE.Vector3(-1.5,  0.3, -2.0), zoom: 1.45 },
    { pos: new THREE.Vector3(-6,    7,    7   ), look: new THREE.Vector3( 0.5,  0,   1.2 ), zoom: 1.25 },
    { pos: new THREE.Vector3( 0,    8,    9   ), look: new THREE.Vector3( 0,    0,   0   ), zoom: 1.50 }
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
  // CENTRAL HQ — focal building with blue scan-beam door
  // ============================================================
  var hqGroup = new THREE.Group();
  world.add(hqGroup);
  addBox(hqGroup, 1.5, 0.45, 1.5, 0, GROUND_Y + 0.225, 0, matWhite);
  addBox(hqGroup, 1.15, 0.40, 1.15, 0, GROUND_Y + 0.65, 0, matPaper);
  addBox(hqGroup, 0.75, 0.35, 0.75, 0, GROUND_Y + 1.025, 0, matWhite);
  addBox(hqGroup, 0.55, 0.07, 0.55, 0, GROUND_Y + 1.235, 0, matShadeLt);
  addBox(hqGroup, 0.28, 0.16, 0.28, 0, GROUND_Y + 1.345, 0, matShadeLt);
  // Antenna
  var spire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.020, 0.45, 6), matFigure);
  spire.position.set(0, GROUND_Y + 1.65, 0);
  spire.castShadow = true;
  hqGroup.add(spire);
  var spireBall = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), matBlueDeep);
  spireBall.position.set(0, GROUND_Y + 1.90, 0);
  hqGroup.add(spireBall);
  // Blue entrance door (scan beam origin)
  var door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.28), matBlue);
  door.position.set(0.77, GROUND_Y + 0.17, 0);
  hqGroup.add(door);
  // Window stripes
  for (var i = 0; i < 2; i++) {
    var yWin = GROUND_Y + 0.15 + i * 0.18;
    var s1 = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.03, 1.52), matShadeLt);
    s1.position.set(0, yWin, 0); hqGroup.add(s1);
  }
  for (var i = 0; i < 2; i++) {
    var yWin = GROUND_Y + 0.50 + i * 0.14;
    var s2 = new THREE.Mesh(new THREE.BoxGeometry(1.17, 0.03, 1.17), matShadeLt);
    s2.position.set(0, yWin, 0); hqGroup.add(s2);
  }
  var hqTop = GROUND_Y + 1.345;

  // ============================================================
  // COOLING TOWERS (with steam puffs) — north area
  // ============================================================
  function makeCoolingTower(x, z, h) {
    var grp = new THREE.Group();
    var bodyGeo = new THREE.CylinderGeometry(0.32, 0.50, h, 16);
    var body = new THREE.Mesh(bodyGeo, matWhite);
    body.position.set(x, GROUND_Y + h / 2, z);
    body.castShadow = true; body.receiveShadow = true;
    var rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.32, 0.05, 16),
      matShadeLt
    );
    rim.position.set(x, GROUND_Y + h + 0.025, z);
    grp.add(body); grp.add(rim);
    // Steam cluster (5 puffs above)
    var steamMat = new THREE.MeshLambertMaterial({
      color: 0xffffff, transparent: true, opacity: 0.75
    });
    for (var i = 0; i < 6; i++) {
      var puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.16 + Math.random() * 0.10, 8, 8),
        steamMat
      );
      puff.position.set(
        x + (Math.random() - 0.5) * 0.25,
        GROUND_Y + h + 0.20 + i * 0.10,
        z + (Math.random() - 0.5) * 0.25
      );
      grp.add(puff);
    }
    world.add(grp);
  }
  makeCoolingTower(-1.4, -3.4, 1.10);
  makeCoolingTower(-2.4, -3.4, 0.90);

  // ============================================================
  // VAULTED WAREHOUSES (curved roof) — east side
  // ============================================================
  function makeVaultedWarehouse(cx, cz, w, h, d) {
    var grp = new THREE.Group();
    // Box body
    addBox(grp, w, h, d, cx, GROUND_Y + h / 2, cz, matWhite);
    // Half-cylinder roof
    var roofGeo = new THREE.CylinderGeometry(w / 2, w / 2, d, 16, 1, false, 0, Math.PI);
    var roof = new THREE.Mesh(roofGeo, matPaper);
    roof.rotation.z = Math.PI / 2;
    roof.position.set(cx, GROUND_Y + h, cz);
    roof.castShadow = true;
    roof.receiveShadow = true;
    grp.add(roof);
    // Roof ridge lines for detail (3 ribs along length)
    for (var i = 0; i < 4; i++) {
      var rib = new THREE.Mesh(
        new THREE.BoxGeometry(w * 1.01, 0.025, 0.04),
        matShadeLt
      );
      rib.position.set(cx, GROUND_Y + h + w / 2 - 0.01, cz - d / 2 + (i + 1) * (d / 5));
      grp.add(rib);
    }
    world.add(grp);
  }
  makeVaultedWarehouse(4.2, -2.2, 1.5, 0.55, 1.8);
  makeVaultedWarehouse(4.2,  0.4, 1.3, 0.50, 1.4);

  // ============================================================
  // SERVER RACK ARRAY (grid) — like data-center detail
  // ============================================================
  function makeServerArray(cx, cz, rows, cols) {
    var w = 0.20, h = 0.36, d = 0.32, gap = 0.045;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var x = cx + (c - (cols - 1) / 2) * (w + gap);
        var z = cz + (r - (rows - 1) / 2) * (d + gap);
        addBox(world, w, h, d, x, GROUND_Y + h / 2, z, matWhite);
        // Top accent + front vents
        addBox(world, w * 0.55, 0.025, d * 0.55, x, GROUND_Y + h + 0.015, z, matShadeLt);
        var ventGeo = new THREE.BoxGeometry(w * 0.7, 0.02, d + 0.005);
        for (var v = 0; v < 3; v++) {
          var vent = new THREE.Mesh(ventGeo, matShadeLt);
          vent.position.set(x, GROUND_Y + 0.08 + v * 0.10, z);
          world.add(vent);
        }
      }
    }
  }
  makeServerArray(2.5, -3.0, 3, 4);

  // ============================================================
  // SERVER RACK ROW (linear) — west of HQ
  // ============================================================
  (function () {
    var count = 5;
    var w = 0.22, h = 0.42, d = 0.42, gap = 0.06;
    var cx = -3.5, cz = 0.2;
    for (var i = 0; i < count; i++) {
      var x = cx + (i - (count - 1) / 2) * (w + gap);
      addBox(world, w, h, d, x, GROUND_Y + h / 2, cz, matWhite);
      // Front vent grilles
      for (var v = 0; v < 3; v++) {
        var vent = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.7, 0.025, d + 0.005),
          matShadeLt
        );
        vent.position.set(x, GROUND_Y + 0.08 + v * 0.12, cz);
        world.add(vent);
      }
      // Top accent
      addBox(world, w * 0.5, 0.02, d * 0.55, x, GROUND_Y + h + 0.012, cz, matShadeLt);
    }
  })();

  // ============================================================
  // STORAGE TANK (cylinder + dome) — south
  // ============================================================
  (function () {
    var grp = new THREE.Group();
    var x = 1.2, z = 3.6;
    var body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.55, 16), matWhite
    );
    body.position.set(x, GROUND_Y + 0.275, z);
    body.castShadow = true; body.receiveShadow = true;
    var dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      matWhite
    );
    dome.position.set(x, GROUND_Y + 0.55, z);
    dome.castShadow = true;
    grp.add(body); grp.add(dome);
    // Side ladder/stripe detail
    var ladder = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.50, 0.04), matShadeLt
    );
    ladder.position.set(x + 0.33, GROUND_Y + 0.275, z);
    grp.add(ladder);
    world.add(grp);
  })();

  // ============================================================
  // WIND TURBINES (animated blades) — far edge
  // ============================================================
  var windTurbines = [];
  function makeWindTurbine(x, z, h) {
    var grp = new THREE.Group();
    // Pole
    var pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.055, h, 8), matWhite
    );
    pole.position.set(x, GROUND_Y + h / 2, z);
    pole.castShadow = true;
    grp.add(pole);
    // Hub housing
    var hub = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.10, 0.18), matShadeLt
    );
    hub.position.set(x, GROUND_Y + h, z);
    hub.castShadow = true;
    grp.add(hub);
    // Rotor group (3 blades)
    var rotor = new THREE.Group();
    for (var i = 0; i < 3; i++) {
      var bladeWrap = new THREE.Group();
      var blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.50, 0.05, 0.025), matWhite
      );
      blade.position.set(0.27, 0, 0);
      blade.castShadow = true;
      bladeWrap.add(blade);
      bladeWrap.rotation.z = i * (Math.PI * 2 / 3);
      rotor.add(bladeWrap);
    }
    rotor.position.set(x, GROUND_Y + h, z + 0.10);
    grp.add(rotor);
    world.add(grp);
    windTurbines.push(rotor);
  }
  makeWindTurbine(-5.5, -3.0, 1.4);
  makeWindTurbine(-5.0, -4.4, 1.2);
  makeWindTurbine(-5.8, -1.5, 1.5);
  makeWindTurbine(-6.0, -3.8, 1.3);
  makeWindTurbine(-4.8, -2.0, 1.0);
  makeWindTurbine(-5.4,  0.2, 1.25);

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

  // Elegant single CURVING scan beam from HQ door — bezier arc
  var beamCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.82, GROUND_Y + 0.10, 0.0),
    new THREE.Vector3(2.4,  GROUND_Y + 0.55, 0.5),
    new THREE.Vector3(4.6,  GROUND_Y + 0.04, 1.8)
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

    // Wind turbines spin
    for (var i = 0; i < windTurbines.length; i++) {
      windTurbines[i].rotation.z += 0.012 + i * 0.002;
    }

    if (corePulse > 0.01) corePulse *= 0.93;
    seedEdges.scale.setScalar(1 + corePulse * 0.6);

    var tg = hover ? 1.0 : 0.95;
    matRouteBlue.opacity += (tg - matRouteBlue.opacity) * 0.08;
    matRouteRed.opacity  += (tg - matRouteRed.opacity)  * 0.08;

    renderer.render(scene, camera);
  }
  animate();
})();
