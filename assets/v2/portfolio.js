const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const canvas = document.querySelector("[data-helix]");
const context = canvas?.getContext("2d");
const art = canvas?.parentElement;

if (context && art) {
  let width = 0;
  let height = 0;
  let pointer = 0;
  let visible = true;
  let frame = null;
  let phase = 0;
  let lastTime = 0;

  function draw() {
    context.clearRect(0, 0, width, height);
    const radius = width * .35;
    const rows = 36;
    for (let i = 0; i < rows; i += 1) {
      const t = i / (rows - 1);
      const angle = phase + t * Math.PI * 4.6;
      const center = width * (.5 + (t - .5) * .24);
      const span = Math.cos(angle) * radius;
      const y = height * (.09 + t * .83);
      const drift = pointer * 16 * (t - .5);
      context.beginPath();
      context.moveTo(center + span + drift, y);
      context.lineTo(center - span + drift, y + 7);
      context.strokeStyle = "rgba(166, 218, 167, .22)";
      context.stroke();
      for (const side of [-1, 1]) {
        const depth = (1 + side * Math.sin(angle)) / 2;
        context.beginPath();
        context.arc(center + side * span + drift, y + (side < 0 ? 7 : 0), 1.2 + depth * 2, 0, Math.PI * 2);
        context.fillStyle = `rgba(187, 232, 169, ${.26 + depth * .56})`;
        context.fill();
      }
    }
  }

  function animate(time) {
    frame = null;
    if (lastTime) phase += Math.min(40, time - lastTime) * .00046;
    lastTime = time;
    draw();
    sync();
  }

  function sync() {
    const playing = visible && !document.hidden && !reducedMotion.matches;
    if (playing && frame === null) frame = requestAnimationFrame(animate);
    if (!playing && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      lastTime = 0;
    }
  }

  function resize() {
    ({width, height} = art.getBoundingClientRect());
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    draw();
  }

  new ResizeObserver(resize).observe(art);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(art);
  art.addEventListener("pointermove", (event) => {
    if (!reducedMotion.matches) pointer = (event.clientX - art.getBoundingClientRect().left) / width - .5;
  });
  art.addEventListener("pointerleave", () => { pointer = 0; });
  reducedMotion.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  resize();
  sync();
}

if (!reducedMotion.matches && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove("reveal-pending");
      observer.unobserve(entry.target);
    }
  }, { threshold: .12 });
  for (const element of document.querySelectorAll("[data-reveal]")) {
    if (element.getBoundingClientRect().top < innerHeight) continue;
    element.classList.add("reveal-pending");
    observer.observe(element);
  }
}
