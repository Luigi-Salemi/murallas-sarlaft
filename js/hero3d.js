/* ============================================================
   Murallas · Hero 3D — Isometric stylized fortress (gold)
   Slowly rotating geometric "muralla" with floating particles
   ============================================================ */
(function () {
  "use strict";

  if (typeof THREE === "undefined") return;

  var canvas = document.getElementById("heroCanvas");
  if (!canvas) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var GOLD = 0xc9a14a;
  var GOLD_SOFT = 0xe6d49a;
  var INK = 0x0a0a0a;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power"
    });
  } catch (e) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();

  // ---------- Isometric orthographic camera ----------
  var aspect = canvas.clientWidth / canvas.clientHeight || 1;
  var frustum = 4.2;
  var camera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect,
    frustum, -frustum,
    0.1, 100
  );
  // Classic 30° isometric viewpoint
  camera.position.set(8, 7, 8);
  camera.lookAt(0, 0.4, 0);

  // ---------- Materials ----------
  var lineMat = new THREE.LineBasicMaterial({
    color: GOLD,
    transparent: true,
    opacity: 0.95
  });
  var lineMatSoft = new THREE.LineBasicMaterial({
    color: GOLD_SOFT,
    transparent: true,
    opacity: 0.55
  });
  var faceMat = new THREE.MeshBasicMaterial({
    color: INK,
    transparent: true,
    opacity: 0.08
  });

  function addBlock(group, w, h, d, x, y, z, soft) {
    var geo = new THREE.BoxGeometry(w, h, d);
    var mesh = new THREE.Mesh(geo, faceMat);
    mesh.position.set(x, y, z);
    var edges = new THREE.EdgesGeometry(geo);
    var lines = new THREE.LineSegments(edges, soft ? lineMatSoft : lineMat);
    lines.position.set(x, y, z);
    group.add(mesh);
    group.add(lines);
  }

  // ---------- Fortress geometry ----------
  var fortress = new THREE.Group();

  // Base platform
  addBlock(fortress, 5, 0.25, 5, 0, -0.125, 0, true);

  // Four corner towers
  var towerH = 2.1;
  var towerS = 0.9;
  var off = 2.0;
  var towers = [
    [ off, towerH / 2,  off],
    [-off, towerH / 2,  off],
    [ off, towerH / 2, -off],
    [-off, towerH / 2, -off]
  ];
  towers.forEach(function (p) {
    addBlock(fortress, towerS, towerH, towerS, p[0], p[1], p[2], false);
  });

  // Four walls between towers
  var wallH = 1.2;
  var wallT = 0.55;
  var wallL = 3.1;
  // North & South (along X)
  addBlock(fortress, wallL, wallH, wallT, 0, wallH / 2,  off, false);
  addBlock(fortress, wallL, wallH, wallT, 0, wallH / 2, -off, false);
  // East & West (along Z)
  addBlock(fortress, wallT, wallH, wallL,  off, wallH / 2, 0, false);
  addBlock(fortress, wallT, wallH, wallL, -off, wallH / 2, 0, false);

  // Crenellations on top of each wall (alternating merlons)
  function crenellate(axis, sign) {
    var count = 5;
    var step = wallL / count;
    for (var i = 0; i < count; i++) {
      if (i % 2 !== 0) continue;
      var pos = -wallL / 2 + step / 2 + i * step;
      var size = 0.32;
      var y = wallH + size / 2;
      if (axis === "x") {
        addBlock(fortress, size, size, size, pos, y, sign * off, false);
      } else {
        addBlock(fortress, size, size, size, sign * off, y, pos, false);
      }
    }
  }
  crenellate("x",  1);
  crenellate("x", -1);
  crenellate("z",  1);
  crenellate("z", -1);

  // Central inner pillar (subtle vertical accent)
  addBlock(fortress, 0.4, 1.6, 0.4, 0, 0.8, 0, true);

  // Lower slightly so it sits visually centered
  fortress.position.y = -0.4;
  scene.add(fortress);

  // ---------- Floating gold particles ----------
  var particles;
  var particleCount = 70;
  (function makeParticles() {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(particleCount * 3);
    for (var i = 0; i < particleCount; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = Math.random() * 7 - 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      color: GOLD,
      size: 0.07,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true
    });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  })();

  // ---------- Resize handling ----------
  function resize() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
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

  // ---------- Mouse parallax ----------
  var mouseX = 0, mouseY = 0;
  var targetX = 0, targetY = 0;
  window.addEventListener("mousemove", function (e) {
    mouseX = (e.clientX / window.innerWidth) - 0.5;
    mouseY = (e.clientY / window.innerHeight) - 0.5;
  }, { passive: true });

  // ---------- Animation loop ----------
  var baseRotY = Math.PI / 8;
  var t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += reduceMotion ? 0 : 0.004;

    targetX += (mouseX - targetX) * 0.04;
    targetY += (mouseY - targetY) * 0.04;

    fortress.rotation.y = baseRotY + t + targetX * 0.35;
    fortress.rotation.x = -targetY * 0.18;

    if (particles) {
      particles.rotation.y = -t * 0.4;
      var posAttr = particles.geometry.attributes.position;
      for (var i = 0; i < particleCount; i++) {
        var yIdx = i * 3 + 1;
        posAttr.array[yIdx] += 0.003;
        if (posAttr.array[yIdx] > 6) posAttr.array[yIdx] = -1.5;
      }
      posAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  animate();
})();
