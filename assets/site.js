document.body.classList.add("loading");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.textContent = isOpen ? "Close" : "Menu";
  });
}

const finishLoading = () => {
  document.body.classList.add("loaded");
  document.body.classList.remove("loading");
};

window.addEventListener("load", () => {
  window.setTimeout(finishLoading, prefersReducedMotion ? 80 : 520);
});

window.setTimeout(finishLoading, 1400);

const setScrollProgress = () => {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
  document.documentElement.style.setProperty("--scroll-progress", `${progress}%`);
};

setScrollProgress();
window.addEventListener("scroll", setScrollProgress, { passive: true });
window.addEventListener("resize", setScrollProgress);

if (!prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", (event) => {
    document.body.classList.add("pointer-active");
    document.documentElement.style.setProperty("--cursor-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--cursor-y", `${event.clientY}px`);
  });

  window.addEventListener("pointerdown", () => document.body.classList.add("pointer-pressed"));
  window.addEventListener("pointerup", () => document.body.classList.remove("pointer-pressed"));

  document.querySelectorAll(".project-feature, .link-card, .method-card, .evidence-card, .signal-strip article, .project-scoreboard article, .portrait-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--tilt-x", `${(-y * 4).toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${(x * 5).toFixed(2)}deg`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  });
}

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

document.querySelectorAll("[data-tabs]").forEach((tabs) => {
  const buttons = tabs.querySelectorAll("[data-tab]");
  const panels = tabs.querySelectorAll("[data-panel]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-tab");

      buttons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      panels.forEach((panel) => {
        panel.classList.toggle("active", panel.getAttribute("data-panel") === target);
      });
    });
  });
});

const pointer = { x: -9999, y: -9999 };

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

document.querySelectorAll("[data-fragment-canvas]").forEach((canvas) => {
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let phase = 0;
  let targetTilt = 0;
  let targetLift = 0;
  let currentTilt = 0;
  let currentLift = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const transformPoint = (x, y, angle, lift) => {
    const centerX = width * 0.58;
    const centerY = height * 0.5 + lift;
    const dx = x - centerX;
    const dy = y - centerY;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos,
    };
  };

  const drawPath = (points, alpha, lineWidth) => {
    context.globalAlpha = alpha;
    context.lineWidth = lineWidth;
    context.strokeStyle = "#fff";
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.stroke();
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    const rect = canvas.getBoundingClientRect();
    const localPointerX = pointer.x - rect.left;
    const localPointerY = pointer.y - rect.top;
    const pointerInside = localPointerX >= 0 && localPointerX <= width && localPointerY >= 0 && localPointerY <= height;

    targetTilt = pointerInside ? ((localPointerX / width) - 0.5) * 0.26 : -0.08;
    targetLift = pointerInside ? ((localPointerY / height) - 0.5) * 52 : 0;
    currentTilt += (targetTilt - currentTilt) * 0.055;
    currentLift += (targetLift - currentLift) * 0.055;

    if (!prefersReducedMotion) {
      phase += 0.012;
    }

    const baseY = height * 0.58 + currentLift;
    const amplitude = Math.min(86, Math.max(42, width * 0.06));
    const startX = -width * 0.06;
    const endX = width * 1.08;
    const step = width < 700 ? 22 : 28;
    const turns = width < 700 ? 2.3 : 3.1;
    const topStrand = [];
    const bottomStrand = [];

    for (let x = startX; x <= endX; x += 7) {
      const progress = (x - startX) / (endX - startX);
      const wave = Math.sin(progress * Math.PI * 2 * turns + phase);
      const taper = 0.72 + 0.28 * Math.sin(progress * Math.PI);
      topStrand.push(transformPoint(x, baseY + wave * amplitude * taper, currentTilt, 0));
      bottomStrand.push(transformPoint(x, baseY - wave * amplitude * taper, currentTilt, 0));
    }

    drawPath(topStrand, 0.62, 1.4);
    drawPath(bottomStrand, 0.62, 1.4);

    for (let x = startX; x <= endX; x += step) {
      const progress = (x - startX) / (endX - startX);
      const wave = Math.sin(progress * Math.PI * 2 * turns + phase);
      const taper = 0.72 + 0.28 * Math.sin(progress * Math.PI);
      const top = transformPoint(x, baseY + wave * amplitude * taper, currentTilt, 0);
      const bottom = transformPoint(x, baseY - wave * amplitude * taper, currentTilt, 0);
      const depth = 0.25 + 0.75 * Math.abs(Math.cos(progress * Math.PI * 2 * turns + phase));

      context.globalAlpha = 0.18 + depth * 0.34;
      context.lineWidth = 1;
      context.strokeStyle = "#fff";
      context.beginPath();
      context.moveTo(top.x, top.y);
      context.lineTo(bottom.x, bottom.y);
      context.stroke();

      context.globalAlpha = 0.72;
      context.fillStyle = "#fff";
      context.fillRect(top.x - 2, top.y - 2, 4, 4);
      context.fillRect(bottom.x - 2, bottom.y - 2, 4, 4);
    }

    context.globalAlpha = 0.12;
    context.lineWidth = 1;
    context.strokeStyle = "#fff";
    const axisStart = transformPoint(startX, baseY, currentTilt, 0);
    const axisEnd = transformPoint(endX, baseY, currentTilt, 0);
    context.beginPath();
    context.moveTo(axisStart.x, axisStart.y);
    context.lineTo(axisEnd.x, axisEnd.y);
    context.stroke();

    if (!prefersReducedMotion) {
      animationFrame = window.requestAnimationFrame(draw);
    }
  };

  resize();
  draw();
  window.addEventListener("resize", resize);

  if (prefersReducedMotion) {
    window.cancelAnimationFrame(animationFrame);
  }
});
