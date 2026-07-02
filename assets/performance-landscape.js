const metrics = [
  { key: "roc", label: "ROC-AUC" },
  { key: "pr", label: "PR-AUC" },
  { key: "accuracy", label: "Accuracy" },
  { key: "sensitivity", label: "Sensitivity" },
  { key: "specificity", label: "Specificity" },
];

const layers = [
  {
    label: "Locked dual-reference",
    z: -1.25,
    color: 0xf4b56a,
    values: {
      roc: 0.900,
      pr: 0.873,
      accuracy: 0.875,
      sensitivity: 0.850,
      specificity: 0.900,
    },
  },
  {
    label: "Repeated hg38 mean",
    z: 1.25,
    color: 0xffffff,
    values: {
      roc: 0.889,
      pr: 0.912,
    },
  },
];

const scoreToHeight = (score) => Math.max(0.08, (score - 0.78) * 12);

const stages = document.querySelectorAll("[data-performance-landscape]");

if (stages.length) {
  const three = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js").catch(() => null);

  stages.forEach((stage) => {
    if (!three) {
      drawFallback(stage);
      return;
    }

    initLandscape(stage, three).catch(() => drawFallback(stage));
  });
}

async function initLandscape(stage, THREE) {
  const canvas = stage.querySelector("canvas");
  const tooltip = stage.querySelector("[data-landscape-tooltip]");
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(4.8, 4.15, 6.5);
  camera.lookAt(0, 0.65, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const root = new THREE.Group();
  root.rotation.x = -0.12;
  root.rotation.y = -0.42;
  scene.add(root);

  scene.add(new THREE.AmbientLight(0xffffff, 0.54));
  const key = new THREE.PointLight(0xffffff, 2.2, 18);
  key.position.set(2.8, 4.8, 4.5);
  scene.add(key);

  const fill = new THREE.PointLight(0xf4b56a, 0.85, 16);
  fill.position.set(-4, 2, -3);
  scene.add(fill);

  addGrid(THREE, root);

  const bars = [];
  layers.forEach((layer, layerIndex) => {
    const rowLabel = createTextSprite(THREE, layer.label, {
      color: layerIndex === 0 ? "#f4b56a" : "#ffffff",
      fontSize: 34,
      opacity: 0.9,
    });
    rowLabel.position.set(-3.45, 0.14, layer.z);
    rowLabel.scale.set(1.85, 0.36, 1);
    root.add(rowLabel);

    metrics.forEach((metric, metricIndex) => {
      const value = layer.values[metric.key];
      const x = (metricIndex - (metrics.length - 1) / 2) * 0.96;

      if (value == null) {
        const missing = createTextSprite(THREE, "not reported", {
          color: "#ffffff",
          fontSize: 24,
          opacity: 0.38,
        });
        missing.position.set(x, 0.08, layer.z);
        missing.scale.set(0.68, 0.18, 1);
        root.add(missing);
        return;
      }

      const height = scoreToHeight(value);
      const geometry = new THREE.BoxGeometry(0.48, height, 0.48);
      const material = new THREE.MeshStandardMaterial({
        color: layer.color,
        emissive: layer.color,
        emissiveIntensity: layerIndex === 0 ? 0.1 : 0.045,
        metalness: 0.15,
        roughness: 0.38,
        transparent: true,
        opacity: 0.9,
      });
      const bar = new THREE.Mesh(geometry, material);
      bar.position.set(x, height / 2, layer.z);
      bar.userData = {
        label: `${layer.label}: ${metric.label} ${value.toFixed(3)}`,
      };
      root.add(bar);
      bars.push(bar);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42 })
      );
      edges.position.copy(bar.position);
      root.add(edges);

      const top = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 18, 18),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffffff,
          emissiveIntensity: 0.12,
          roughness: 0.2,
        })
      );
      top.position.set(x, height + 0.14, layer.z);
      top.userData = bar.userData;
      root.add(top);
      bars.push(top);

      const scoreLabel = createTextSprite(THREE, value.toFixed(3), {
        color: "#ffffff",
        fontSize: 27,
        opacity: 0.8,
      });
      scoreLabel.position.set(x, height + 0.36, layer.z);
      scoreLabel.scale.set(0.54, 0.16, 1);
      root.add(scoreLabel);
    });
  });

  metrics.forEach((metric, metricIndex) => {
    const x = (metricIndex - (metrics.length - 1) / 2) * 0.96;
    const label = createTextSprite(THREE, metric.label, {
      color: "#ffffff",
      fontSize: 26,
      opacity: 0.64,
    });
    label.position.set(x, -0.18, 2.05);
    label.scale.set(0.74, 0.18, 1);
    root.add(label);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  let hovered = null;
  let targetY = -0.42;
  let targetX = -0.12;
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setTooltip = (text) => {
    if (tooltip) tooltip.textContent = text || "Hover a bar";
  };

  const updatePointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    updatePointer(event);

    const rect = canvas.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;

    if (dragging) {
      targetY += (event.clientX - previousX) * 0.008;
      targetX += (event.clientY - previousY) * 0.005;
      targetX = Math.max(-0.62, Math.min(0.34, targetX));
      previousX = event.clientX;
      previousY = event.clientY;
    } else {
      targetY = -0.42 + nx * 0.5;
      targetX = -0.12 + ny * 0.18;
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
      camera.fov = 56;
      camera.position.set(5.3, 4.45, 7.8);
      root.scale.setScalar(0.84);
      root.position.set(0.02, -0.1, 0);
    } else {
      camera.fov = 42;
      camera.position.set(4.8, 4.15, 6.5);
      root.scale.setScalar(1);
      root.position.set(0, 0, 0);
    }
    camera.lookAt(0, 0.65, 0);
    camera.updateProjectionMatrix();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();

  const animate = () => {
    root.rotation.y += (targetY - root.rotation.y) * 0.045;
    root.rotation.x += (targetX - root.rotation.x) * 0.045;

    if (!reduceMotion && !dragging) {
      root.rotation.y += 0.0012;
      targetY += Math.sin(Date.now() * 0.00018) * 0.0008;
    }

    raycaster.setFromCamera(pointer, camera);
    const intersections = raycaster.intersectObjects(bars, false);
    const nextHover = intersections.length ? intersections[0].object : null;

    if (hovered !== nextHover) {
      if (hovered?.material) hovered.material.emissiveIntensity = hovered.geometry.type === "SphereGeometry" ? 0.12 : 0.08;
      hovered = nextHover;
      if (hovered?.material) hovered.material.emissiveIntensity = 0.42;
      setTooltip(hovered?.userData?.label || "");
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();
}

function addGrid(THREE, root) {
  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.16,
  });
  const axisMaterial = new THREE.LineBasicMaterial({
    color: 0xf4b56a,
    transparent: true,
    opacity: 0.68,
  });

  const line = (points, material = gridMaterial) => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)));
    const segment = new THREE.Line(geometry, material);
    root.add(segment);
  };

  for (let x = -2.4; x <= 2.41; x += 0.96) {
    line([[x, 0, -1.75], [x, 0, 1.85]]);
  }
  for (let z = -1.25; z <= 1.26; z += 2.5) {
    line([[-2.75, 0, z], [2.75, 0, z]]);
  }

  line([[-2.8, 0, 1.95], [2.8, 0, 1.95]], axisMaterial);
  line([[-2.8, 0, -1.75], [-2.8, 1.75, -1.75]], axisMaterial);

  [0.8, 0.85, 0.9].forEach((score) => {
    const y = scoreToHeight(score);
    line([[-2.65, y, -1.75], [2.65, y, -1.75]], gridMaterial);
    const label = createTextSprite(THREE, score.toFixed(2), {
      color: "#ffffff",
      fontSize: 24,
      opacity: 0.46,
    });
    label.position.set(-3.05, y, -1.75);
    label.scale.set(0.42, 0.13, 1);
    root.add(label);
  });
}

function createTextSprite(THREE, text, options = {}) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const fontSize = options.fontSize || 28;
  context.font = `${fontSize}px Inter, system-ui, sans-serif`;
  const metrics = context.measureText(text);
  const width = Math.ceil(metrics.width + 32);
  const height = Math.ceil(fontSize + 22);
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
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(width / 80, height / 80, 1);
  return sprite;
}

function drawFallback(stage) {
  const canvas = stage.querySelector("canvas");
  const tooltip = stage.querySelector("[data-landscape-tooltip]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const width = rect.width;
    const height = rect.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(255,255,255,0.08)";
    context.fillRect(0, height - 64, width, 1);
    const values = [0.900, 0.873, 0.875, 0.850, 0.900, 0.889, 0.912];
    values.forEach((value, index) => {
      const barWidth = width / (values.length * 1.8);
      const x = 30 + index * barWidth * 1.45;
      const barHeight = (value - 0.78) * height * 0.78;
      context.fillStyle = index < 5 ? "#f4b56a" : "#ffffff";
      context.fillRect(x, height - 66 - barHeight, barWidth, barHeight);
      context.fillStyle = "#ffffff";
      context.globalAlpha = 0.74;
      context.font = "13px system-ui, sans-serif";
      context.fillText(value.toFixed(3), x - 2, height - 76 - barHeight);
      context.globalAlpha = 1;
    });
    if (tooltip) tooltip.textContent = "3D module blocked; showing fallback MiNAE metric bars.";
  };

  resize();
  new ResizeObserver(resize).observe(stage);
}
