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
  document.querySelectorAll(".project-feature, .link-card, .method-card, .evidence-card, .tool-card, .signal-strip article, .project-scoreboard article, .portrait-card").forEach((card) => {
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
  const molecules = [];
  const palette = ["#ffffff"];
  let width = 0;
  let height = 0;
  let animationFrame = 0;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    molecules.length = 0;

    const count = width < 700 ? 250 : 500;
    for (let index = 0; index < count; index += 1) {
      molecules.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.003,
        size: 0.55 + Math.random() * 0.56,
        phase: Math.random() * Math.PI * 2,
        color: palette[index % palette.length],
      });
    }
  };

  const drawMiniDna = (molecule, drawX, drawY, influence) => {
    const length = 24 * molecule.size * (1 + influence * 0.35);
    const amplitude = 4.5 * molecule.size;
    const steps = 8;

    context.save();
    context.translate(drawX, drawY);
    context.rotate(molecule.angle + influence * 0.45);
    context.strokeStyle = molecule.color;
    context.fillStyle = molecule.color;
    context.lineCap = "round";
    context.lineWidth = 0.85 + influence * 0.45;
    context.globalAlpha = 0.1 + influence * 0.36;

    context.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const x = (t - 0.5) * length;
      const y = Math.sin(t * Math.PI * 2 + molecule.phase) * amplitude;
      if (step === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();

    context.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const x = (t - 0.5) * length;
      const y = -Math.sin(t * Math.PI * 2 + molecule.phase) * amplitude;
      if (step === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.stroke();

    for (let step = 1; step < steps; step += 2) {
      const t = step / steps;
      const x = (t - 0.5) * length;
      const y = Math.sin(t * Math.PI * 2 + molecule.phase) * amplitude;
      context.globalAlpha = 0.05 + influence * 0.24;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, -y);
      context.stroke();
    }

    context.globalAlpha = 0.18 + influence * 0.42;
    context.fillRect(-length / 2 - 1.2, -1.2, 2.4, 2.4);
    context.fillRect(length / 2 - 1.2, -1.2, 2.4, 2.4);
    context.restore();
  };

  const draw = () => {
    context.globalAlpha = 1;
    context.clearRect(0, 0, width, height);

    molecules.forEach((molecule) => {
      if (!prefersReducedMotion) {
        molecule.x += molecule.vx;
        molecule.y += molecule.vy;
        molecule.angle += molecule.spin;
        molecule.phase += 0.006;
      }

      if (molecule.x < -40) molecule.x = width + 40;
      if (molecule.x > width + 40) molecule.x = -40;
      if (molecule.y < -40) molecule.y = height + 40;
      if (molecule.y > height + 40) molecule.y = -40;

      const dx = molecule.x - pointer.x;
      const dy = molecule.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - distance / 170);
      const force = influence * influence * 34;
      const angle = Math.atan2(dy, dx);
      const drawX = molecule.x + Math.cos(angle) * force;
      const drawY = molecule.y + Math.sin(angle) * force;

      if (influence > 0.04) {
        const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 130);
        glow.addColorStop(0, "rgba(255, 255, 255, 0.052)");
        glow.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.globalAlpha = influence * 0.12;
        context.fillStyle = glow;
        context.beginPath();
        context.arc(pointer.x, pointer.y, 130, 0, Math.PI * 2);
        context.fill();

        context.globalAlpha = influence * 0.075;
        context.strokeStyle = molecule.color;
        context.lineWidth = 0.7;
        context.beginPath();
        context.moveTo(drawX, drawY);
        context.lineTo(pointer.x, pointer.y);
        context.stroke();
      }

      drawMiniDna(molecule, drawX, drawY, influence);
      context.globalAlpha = 1;
    });

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
