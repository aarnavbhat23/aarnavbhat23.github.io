const minaeStrategies = [
  {
    label: "hg38 global",
    values: { roc: 0.828, pr: 0.830, acc: 0.750, sens: 0.750, spec: 0.750 },
  },
  {
    label: "hg19 global",
    values: { roc: 0.838, pr: 0.836, acc: 0.725, sens: 0.700, spec: 0.750 },
  },
  {
    label: "dual fusion",
    values: { roc: 0.900, pr: 0.873, acc: 0.875, sens: 0.850, spec: 0.900 },
  },
  {
    label: "chromosome fusion",
    values: { roc: 0.890, pr: 0.856, acc: 0.875, sens: 0.850, spec: 0.900 },
  },
  {
    label: "combined",
    values: { roc: 0.869, pr: 0.855, acc: 0.725, sens: 0.600, spec: 0.850 },
  },
];

const minaeMetrics = [
  { key: "roc", label: "ROC-AUC" },
  { key: "pr", label: "PR-AUC" },
  { key: "acc", label: "Accuracy" },
  { key: "sens", label: "Sensitivity" },
  { key: "spec", label: "Specificity" },
];

const prismaComparators = [
  { label: "LRRC15", score: 78.1, color: 0xb9a8ff, position: [0, 1.72, 0] },
  { label: "ITGA11", score: 56.6, color: 0xffffff, position: [-3.0, 0.15, 1.6] },
  { label: "CTSK", score: 62.9, color: 0xffc46e, position: [3.1, 0.25, 1.4] },
  { label: "MXRA8", score: 50.9, color: 0x8fd7ff, position: [0.1, -0.25, -2.55] },
];

const minaeStages = document.querySelectorAll("[data-minae-surface]");
const proteinStages = document.querySelectorAll("[data-lrrc15-protein]");

if (minaeStages.length || proteinStages.length) {
  const three = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js").catch(() => null);

  minaeStages.forEach((stage) => {
    if (!three) {
      drawSurfaceFallback(stage);
      return;
    }
    initMinaeSurface(stage, three).catch(() => drawSurfaceFallback(stage));
  });

  proteinStages.forEach((stage) => {
    if (!three) {
      drawProteinFallback(stage);
      return;
    }
    initProteinEvidence(stage, three).catch(() => drawProteinFallback(stage));
  });
}

async function initMinaeSurface(stage, THREE) {
  const canvas = stage.querySelector("canvas");
  const tooltip = stage.querySelector("[data-scene-tooltip]");
  if (!canvas) return;
  stage.dataset.sceneEngine = "three.js r160";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(5.8, 4.4, 7.0);
  camera.lookAt(0, 0.9, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const root = new THREE.Group();
  root.rotation.x = -0.46;
  root.rotation.y = -0.55;
  scene.add(root);

  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const key = new THREE.PointLight(0xffffff, 2.4, 24);
  key.position.set(2.8, 5.8, 4.4);
  scene.add(key);
  const colorLight = new THREE.PointLight(0xf4b56a, 1.1, 22);
  colorLight.position.set(-4.2, 2.5, -3.8);
  scene.add(colorLight);

  const surface = createMinaeSurfaceMesh(THREE);
  root.add(surface.floor);
  root.add(surface.mesh);
  root.add(surface.wire);
  addSurfaceAxes(THREE, root);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  let targetX = root.rotation.x;
  let targetY = root.rotation.y;
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setTooltip = (text) => {
    if (tooltip) tooltip.textContent = text || "Hover the surface";
  };

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

    if (dragging) {
      targetY += (event.clientX - previousX) * 0.008;
      targetX += (event.clientY - previousY) * 0.006;
      targetX = Math.max(-0.95, Math.min(-0.18, targetX));
      previousX = event.clientX;
      previousY = event.clientY;
    } else {
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      targetY = -0.55 + nx * 0.46;
      targetX = -0.46 + ny * 0.16;
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointerleave", () => {
    dragging = false;
    pointer.set(-2, -2);
    setTooltip("");
  });

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (width < 620) {
      camera.fov = 52;
      camera.position.set(6.1, 5.2, 8.8);
      root.scale.setScalar(0.82);
      root.position.set(0, -0.15, 0);
    } else {
      camera.fov = 42;
      camera.position.set(5.8, 4.4, 7.0);
      root.scale.setScalar(1);
      root.position.set(0, 0, 0);
    }
    camera.lookAt(0, 0.86, 0);
    camera.updateProjectionMatrix();
  };

  new ResizeObserver(resize).observe(stage);
  resize();

  const animate = () => {
    root.rotation.x += (targetX - root.rotation.x) * 0.055;
    root.rotation.y += (targetY - root.rotation.y) * 0.055;
    if (!reduceMotion && !dragging) {
      targetY += Math.sin(Date.now() * 0.00016) * 0.0005;
    }

    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObject(surface.mesh, false);
    if (intersections.length) {
      const local = root.worldToLocal(intersections[0].point.clone());
      const info = nearestSurfaceValue(local.x, local.z);
      setTooltip(`${info.strategy} / ${info.metric}: ${info.value.toFixed(3)}`);
    } else {
      setTooltip("");
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();
}

function createMinaeSurfaceMesh(THREE) {
  const xSize = 6.8;
  const zSize = 4.6;
  const xSegments = 72;
  const zSegments = 56;
  const positions = [];
  const floorPositions = [];
  const colors = [];
  const floorColors = [];
  const indices = [];

  for (let iz = 0; iz <= zSegments; iz += 1) {
    for (let ix = 0; ix <= xSegments; ix += 1) {
      const xUnit = ix / xSegments;
      const zUnit = iz / zSegments;
      const x = (xUnit - 0.5) * xSize;
      const z = (zUnit - 0.5) * zSize;
      const score = interpolateMinaeScore(xUnit * (minaeStrategies.length - 1), zUnit * (minaeMetrics.length - 1));
      const y = Math.max(0.04, (score - 0.58) * 4.25);
      const color = scoreColor(THREE, score);
      positions.push(x, y, z);
      floorPositions.push(x, 0, z);
      colors.push(color.r, color.g, color.b);
      floorColors.push(color.r, color.g, color.b);
    }
  }

  const row = xSegments + 1;
  for (let iz = 0; iz < zSegments; iz += 1) {
    for (let ix = 0; ix < xSegments; ix += 1) {
      const a = iz * row + ix;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.12,
      roughness: 0.34,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94,
    })
  );
  mesh.userData.type = "surface";

  const floorGeometry = new THREE.BufferGeometry();
  floorGeometry.setIndex(indices);
  floorGeometry.setAttribute("position", new THREE.Float32BufferAttribute(floorPositions, 3));
  floorGeometry.setAttribute("color", new THREE.Float32BufferAttribute(floorColors, 3));
  const floor = new THREE.Mesh(
    floorGeometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.24,
    })
  );
  floor.position.y = -0.035;

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 })
  );

  return { mesh, floor, wire };
}

function interpolateMinaeScore(x, z) {
  const maxX = minaeStrategies.length - 1;
  const maxZ = minaeMetrics.length - 1;
  const x0 = Math.max(0, Math.min(maxX, Math.floor(x)));
  const z0 = Math.max(0, Math.min(maxZ, Math.floor(z)));
  const x1 = Math.max(0, Math.min(maxX, x0 + 1));
  const z1 = Math.max(0, Math.min(maxZ, z0 + 1));
  const tx = x - x0;
  const tz = z - z0;
  const v00 = minaeStrategies[x0].values[minaeMetrics[z0].key];
  const v10 = minaeStrategies[x1].values[minaeMetrics[z0].key];
  const v01 = minaeStrategies[x0].values[minaeMetrics[z1].key];
  const v11 = minaeStrategies[x1].values[minaeMetrics[z1].key];
  const a = v00 * (1 - tx) + v10 * tx;
  const b = v01 * (1 - tx) + v11 * tx;
  return a * (1 - tz) + b * tz;
}

function nearestSurfaceValue(x, z) {
  const xUnit = Math.max(0, Math.min(1, x / 6.8 + 0.5));
  const zUnit = Math.max(0, Math.min(1, z / 4.6 + 0.5));
  const strategyIndex = Math.round(xUnit * (minaeStrategies.length - 1));
  const metricIndex = Math.round(zUnit * (minaeMetrics.length - 1));
  const strategy = minaeStrategies[strategyIndex];
  const metric = minaeMetrics[metricIndex];
  return {
    strategy: strategy.label,
    metric: metric.label,
    value: strategy.values[metric.key],
  };
}

function scoreColor(THREE, score) {
  const stops = [
    { t: 0.60, color: new THREE.Color(0x526dff) },
    { t: 0.72, color: new THREE.Color(0x7fe6b1) },
    { t: 0.84, color: new THREE.Color(0xfff66a) },
    { t: 0.92, color: new THREE.Color(0xf49b45) },
  ];
  if (score <= stops[0].t) return stops[0].color.clone();
  for (let index = 1; index < stops.length; index += 1) {
    if (score <= stops[index].t) {
      const prev = stops[index - 1];
      const next = stops[index];
      const amount = (score - prev.t) / (next.t - prev.t);
      return prev.color.clone().lerp(next.color, amount);
    }
  }
  return stops[stops.length - 1].color.clone();
}

function addSurfaceAxes(THREE, root) {
  const gridMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.24 });
  const axisMaterial = new THREE.LineBasicMaterial({ color: 0xf4b56a, transparent: true, opacity: 0.76 });
  const line = (points, material = gridMaterial) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)));
    root.add(new THREE.Line(geometry, material));
  };

  for (let x = -3.4; x <= 3.41; x += 1.7) line([[x, 0, -2.3], [x, 0, 2.3]]);
  for (let z = -2.3; z <= 2.31; z += 1.15) line([[-3.4, 0, z], [3.4, 0, z]]);
  line([[-3.55, 0, -2.45], [3.55, 0, -2.45]], axisMaterial);
  line([[-3.55, 0, -2.45], [-3.55, 1.6, -2.45]], axisMaterial);

  minaeStrategies.forEach((strategy, index) => {
    const x = (index / (minaeStrategies.length - 1) - 0.5) * 6.8;
    const label = createTextSprite(THREE, strategy.label, { fontSize: 24, opacity: 0.66 });
    label.position.set(x, -0.16, 2.76);
    label.scale.set(0.72, 0.2, 1);
    root.add(label);
  });

  minaeMetrics.forEach((metric, index) => {
    const z = (index / (minaeMetrics.length - 1) - 0.5) * 4.6;
    const label = createTextSprite(THREE, metric.label, { fontSize: 24, opacity: 0.68 });
    label.position.set(-4.0, -0.08, z);
    label.scale.set(0.64, 0.18, 1);
    root.add(label);
  });

  [0.65, 0.75, 0.85, 0.90].forEach((score) => {
    const y = Math.max(0.04, (score - 0.58) * 4.25);
    line([[-3.5, y, -2.45], [3.5, y, -2.45]], gridMaterial);
    const label = createTextSprite(THREE, score.toFixed(2), { fontSize: 22, opacity: 0.5 });
    label.position.set(-3.95, y, -2.45);
    label.scale.set(0.38, 0.13, 1);
    root.add(label);
  });
}

async function initProteinEvidence(stage, THREE) {
  const canvas = stage.querySelector("canvas");
  const tooltip = stage.querySelector("[data-scene-tooltip]");
  if (!canvas) return;
  stage.dataset.sceneEngine = "three.js r160";

  const response = await fetch("assets/data/lrrc15_backbone.json");
  const data = await response.json();
  const rawPoints = data.points.map((point) => ({
    residue: point[0],
    vector: new THREE.Vector3(point[1], point[2], point[3]),
    confidence: point[4],
  }));
  const points = rawPoints.filter((point) => point.confidence >= 70 && point.residue >= 24 && point.residue <= 556);
  const center = new THREE.Vector3();
  points.forEach((point) => center.add(point.vector));
  center.divideScalar(points.length || 1);
  points.forEach((point) => point.vector.sub(center));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0.4, 1.8, 8.2);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const root = new THREE.Group();
  root.rotation.x = -0.08;
  root.rotation.y = 0.52;
  scene.add(root);

  scene.add(new THREE.AmbientLight(0xffffff, 0.68));
  const key = new THREE.PointLight(0xb9a8ff, 2.5, 22);
  key.position.set(3.2, 4.0, 4.5);
  scene.add(key);
  const rim = new THREE.PointLight(0x8fd7ff, 1.2, 20);
  rim.position.set(-4.0, 1.2, -4.0);
  scene.add(rim);

  const curve = new THREE.CatmullRomCurve3(points.map((point) => point.vector), false, "catmullrom", 0.2);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(220, points.length), 0.035, 8, false),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x3b315f,
      emissiveIntensity: 0.18,
      roughness: 0.34,
      metalness: 0.08,
      transparent: true,
      opacity: 0.92,
    })
  );
  root.add(tube);

  const pointGeometry = new THREE.BufferGeometry();
  const pointPositions = [];
  const pointColors = [];
  points.forEach((point, index) => {
    if (index % 4 !== 0) return;
    const color = confidenceColor(THREE, point.confidence);
    pointPositions.push(point.vector.x, point.vector.y, point.vector.z);
    pointColors.push(color.r, color.g, color.b);
  });
  pointGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pointPositions, 3));
  pointGeometry.setAttribute("color", new THREE.Float32BufferAttribute(pointColors, 3));
  root.add(new THREE.Points(pointGeometry, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.9 })));

  const hoverObjects = [];
  const evidenceNodes = [
    { residue: 95, color: 0xf4b56a, label: "CAF enrichment: 5.49 log2 fold-change" },
    { residue: 225, color: 0x8fd7ff, label: "Specificity gate: max normal-organ expression 0.176%" },
    { residue: 360, color: 0xffffff, label: "Structure readiness: AlphaFold mean pLDDT 84.41" },
    { residue: 505, color: 0xb9a8ff, label: "Binder triage remains exploratory, not therapeutic validation" },
  ];

  evidenceNodes.forEach((node, index) => {
    const point = nearestResidue(points, node.residue);
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 24, 24),
      new THREE.MeshStandardMaterial({ color: node.color, emissive: node.color, emissiveIntensity: 0.34, roughness: 0.2 })
    );
    marker.position.copy(point.vector);
    marker.userData.label = node.label;
    root.add(marker);
    hoverObjects.push(marker);

    const label = createTextSprite(THREE, `gate ${index + 1}`, { color: "#ffffff", fontSize: 22, opacity: 0.7 });
    label.position.copy(point.vector.clone().add(new THREE.Vector3(0.24, 0.25, 0)));
    label.scale.set(0.4, 0.12, 1);
    root.add(label);
  });

  prismaComparators.forEach((item) => {
    const size = 0.14 + item.score / 520;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(size, 28, 28),
      new THREE.MeshStandardMaterial({ color: item.color, emissive: item.color, emissiveIntensity: 0.24, roughness: 0.28 })
    );
    sphere.position.set(...item.position);
    sphere.userData.label = `${item.label}: integrated evidence ${item.score.toFixed(1)}`;
    root.add(sphere);
    hoverObjects.push(sphere);

    const label = createTextSprite(THREE, item.label, { color: "#ffffff", fontSize: 24, opacity: 0.66 });
    label.position.set(item.position[0], item.position[1] + size + 0.28, item.position[2]);
    label.scale.set(0.45, 0.13, 1);
    root.add(label);
  });

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.15, 0.008, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 })
  );
  ring.rotation.x = Math.PI / 2;
  root.add(ring);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  let targetX = root.rotation.x;
  let targetY = root.rotation.y;
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setTooltip = (text) => {
    if (tooltip) tooltip.textContent = text || "Hover the structure";
  };

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

    if (dragging) {
      targetY += (event.clientX - previousX) * 0.009;
      targetX += (event.clientY - previousY) * 0.006;
      targetX = Math.max(-0.82, Math.min(0.55, targetX));
      previousX = event.clientX;
      previousY = event.clientY;
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointerleave", () => {
    dragging = false;
    pointer.set(-2, -2);
    setTooltip("");
  });

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (width < 620) {
      camera.fov = 52;
      camera.position.set(0.25, 1.6, 9.5);
      root.scale.setScalar(0.82);
    } else {
      camera.fov = 42;
      camera.position.set(0.4, 1.8, 8.2);
      root.scale.setScalar(1);
    }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };

  new ResizeObserver(resize).observe(stage);
  resize();

  const animate = () => {
    if (!dragging && !reduceMotion) {
      targetY += 0.0014;
    }
    root.rotation.x += (targetX - root.rotation.x) * 0.055;
    root.rotation.y += (targetY - root.rotation.y) * 0.055;

    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(hoverObjects, false);
    setTooltip(intersections[0]?.object?.userData?.label || "");

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();
}

function nearestResidue(points, residue) {
  return points.reduce((best, point) => (Math.abs(point.residue - residue) < Math.abs(best.residue - residue) ? point : best), points[0]);
}

function confidenceColor(THREE, confidence) {
  if (confidence >= 85) return new THREE.Color(0xffffff);
  if (confidence >= 70) return new THREE.Color(0xb9a8ff);
  return new THREE.Color(0xf4b56a);
}

function createTextSprite(THREE, text, options = {}) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const fontSize = options.fontSize || 28;
  context.font = `${fontSize}px Inter, system-ui, sans-serif`;
  const measure = context.measureText(text);
  const width = Math.ceil(measure.width + 34);
  const height = Math.ceil(fontSize + 24);
  canvas.width = width * 2;
  canvas.height = height * 2;
  context.scale(2, 2);
  context.font = `${fontSize}px Inter, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = options.color || "#ffffff";
  context.globalAlpha = options.opacity ?? 0.82;
  context.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width / 82, height / 82, 1);
  return sprite;
}

function drawSurfaceFallback(stage) {
  const canvas = stage.querySelector("canvas");
  const tooltip = stage.querySelector("[data-scene-tooltip]");
  if (!canvas) return;
  stage.dataset.sceneEngine = "canvas fallback";
  const context = canvas.getContext("2d");

  const draw = () => {
    const rect = stage.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    const values = minaeStrategies.flatMap((strategy) => minaeMetrics.map((metric) => strategy.values[metric.key]));
    const cellW = rect.width / minaeMetrics.length;
    const cellH = rect.height / minaeStrategies.length;
    values.forEach((value, index) => {
      const x = (index % minaeMetrics.length) * cellW;
      const y = Math.floor(index / minaeMetrics.length) * cellH;
      const light = Math.floor(50 + value * 180);
      context.fillStyle = `rgb(${light}, ${Math.max(80, light - 28)}, ${Math.max(40, 220 - light / 2)})`;
      context.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
    });
    context.fillStyle = "#fff";
    context.font = "14px system-ui, sans-serif";
    context.fillText("3D module blocked; showing MiNAE metric heat surface fallback.", 18, 28);
    if (tooltip) tooltip.textContent = "Fallback heat surface";
  };

  draw();
  new ResizeObserver(draw).observe(stage);
}

function drawProteinFallback(stage) {
  const canvas = stage.querySelector("canvas");
  const tooltip = stage.querySelector("[data-scene-tooltip]");
  if (!canvas) return;
  stage.dataset.sceneEngine = "canvas fallback";
  const context = canvas.getContext("2d");

  const draw = () => {
    const rect = stage.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.strokeStyle = "#fff";
    context.lineWidth = 2;
    context.beginPath();
    for (let i = 0; i < 180; i += 1) {
      const t = i / 179;
      const x = 34 + t * (rect.width - 68);
      const y = rect.height / 2 + Math.sin(t * Math.PI * 8) * 52 + Math.sin(t * Math.PI * 3) * 24;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    context.fillStyle = "#b9a8ff";
    context.font = "14px system-ui, sans-serif";
    context.fillText("3D module blocked; showing LRRC15 evidence trace fallback.", 18, 28);
    if (tooltip) tooltip.textContent = "Fallback LRRC15 trace";
  };

  draw();
  new ResizeObserver(draw).observe(stage);
}
