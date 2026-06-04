/* ============================================================
   Murallas · Hero 3D — Isometric stylized fortress (gold)
   Interactive: drag to rotate, click for pulse, momentum + settle
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
  addBlock(fortress, 5, 0.25, 5, 0, -0.125, 0, true);

  var towerH = 2.1, towerS = 0.9, off = 2.0;
  [[ off, towerH/2,  off], [-off, towerH/2,  off],
   [ off, towerH/2, -off], [-off, towerH/2, -off]].forEach(function (p) {
    addBlock(fortress, towerS, towerH, towerS, p[0], p[1], p[2], false);
  });

  var wallH = 1.2, wallT = 0.55, wallL = 3.1;
  addBlock(fortress, wallL, wallH, wallT, 0, wallH/2,  off, false);
  addBlock(fortress, wallL, wallH, wallT, 0, wallH/2, -off, false);
  addBlock(fortress, wallT, wallH, wallL,  off, wallH/2, 0, false);
  addBlock(fortress, wallT, wallH, wallL, -off, wallH/2, 0, false);

  function crenellate(axis, sign) {
    var count = 5, step = wallL / count, size = 0.32;
    for (var i = 0; i < count; i++) {
      if (i % 2 !== 0) continue;
      var pos = -wallL / 2 + step / 2 + i * step;
      var y = wallH + size / 2;
      if (axis === "x") addBlock(fortress, size, size, size, pos, y, sign * off, false);
      else              addBlock(fortress, size, size, size, sign * off, y, pos, false);
    }
  }
  crenellate("x",  1); crenellate("x", -1);
  crenellate("z",  1); crenellate("z", -1);

  addBlock(fortress, 0.4, 1.6, 0.4, 0, 0.8, 0, true);

  fortress.position.y = -0.4;
  scene.add(fortress);

  // ---------- Floating gold particles ----------
  var particleCount = 70;
  var particleGeo = new THREE.BufferGeometry();
  var particlePos = new Float32Array(particleCount * 3);
  for (var i = 0; i < particleCount; i++) {
    particlePos[i * 3]     = (Math.random() - 0.5) * 14;
    particlePos[i * 3 + 1] = Math.random() * 7 - 1;
    particlePos[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
  var particleMat = new THREE.PointsMaterial({
    color: GOLD,
    size: 0.07,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true
  });
  var particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ---------- Resize ----------
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

  // ---------- Interaction: drag, momentum, click, hover ----------
  var rotY = Math.PI / 6;
  var rotX = 0;
  var velY = 0;
  var velX = 0;
  var isDragging = false;
  var dragMoved = false;
  var lastX = 0, lastY = 0;
  var pulse = 1;
  var hover = false;
  var idleFrames = 0;
  var IDLE_THRESHOLD = 90; // ~1.5s @ 60fps until auto-rotation resumes

  function pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function onDown(e) {
    isDragging = true;
    dragMoved = false;
    idleFrames = 0;
    var p = pointerXY(e);
    lastX = p.x; lastY = p.y;
    velX = 0; velY = 0;
    if (visual) visual.classList.add("engaged");
    if (e.cancelable) e.preventDefault();
  }

  function onMove(e) {
    if (!isDragging) return;
    var p = pointerXY(e);
    var dx = p.x - lastX;
    var dy = p.y - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
    velY = dx * 0.006;
    velX = dy * 0.005;
    rotY += velY;
    rotX += velX;
    rotX = Math.max(-0.7, Math.min(0.7, rotX));
    lastX = p.x; lastY = p.y;
    idleFrames = 0;
  }

  function onUp() {
    if (!isDragging) return;
    isDragging = false;
    if (!dragMoved) {
      pulse = 1.14; // click pulse
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

  // ---------- Animation loop ----------
  var t = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!reduceMotion) t += 0.004;

    if (!isDragging) {
      // momentum decay
      rotY += velY;
      rotX += velX;
      velY *= 0.94;
      velX *= 0.94;
      // settle X tilt back toward neutral
      rotX *= 0.97;

      // resume gentle auto-rotation after idle
      idleFrames++;
      if (idleFrames > IDLE_THRESHOLD && !reduceMotion) {
        rotY += 0.0035;
      }
    }

    // pulse interpolation
    pulse += (1 - pulse) * 0.09;
    fortress.scale.setScalar(pulse);

    fortress.rotation.y = rotY;
    fortress.rotation.x = rotX;

    // hover glow
    var targetLine = hover ? 1.0 : 0.95;
    var targetSoft = hover ? 0.75 : 0.55;
    var targetParticle = hover ? 1.0 : 0.75;
    lineMat.opacity     += (targetLine     - lineMat.opacity)     * 0.08;
    lineMatSoft.opacity += (targetSoft     - lineMatSoft.opacity) * 0.08;
    particleMat.opacity += (targetParticle - particleMat.opacity) * 0.08;

    // drifting particles
    particles.rotation.y = -t * 0.4;
    var posAttr = particles.geometry.attributes.position;
    for (var i = 0; i < particleCount; i++) {
      var yIdx = i * 3 + 1;
      posAttr.array[yIdx] += 0.003;
      if (posAttr.array[yIdx] > 6) posAttr.array[yIdx] = -1.5;
    }
    posAttr.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();
})();
