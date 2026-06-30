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
  const particles = [];
  const palette = canvas.closest(".prisma-hero") ? ["#6f4e7c", "#245a8d", "#b7791f"] : ["#0f766e", "#245a8d", "#a94f36"];
  let width = 0;
  let height = 0;
  let animationFrame = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles.length = 0;

    const count = width < 700 ? 34 : 58;
    for (let index = 0; index < count; index += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        size: 1.5 + Math.random() * 2.6,
        color: palette[index % palette.length],
      });
    }
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    context.globalAlpha = 0.22;
    context.strokeStyle = "#172026";
    context.lineWidth = 1;

    particles.forEach((particle, index) => {
      if (!prefersReducedMotion) {
        particle.x += particle.vx;
        particle.y += particle.vy;
      }

      if (particle.x < -20) particle.x = width + 20;
      if (particle.x > width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = height + 20;
      if (particle.y > height + 20) particle.y = -20;

      for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
        const next = particles[nextIndex];
        const distance = Math.hypot(particle.x - next.x, particle.y - next.y);
        if (distance < 105) {
          context.globalAlpha = (105 - distance) / 620;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(next.x, next.y);
          context.stroke();
        }
      }

      const rect = canvas.getBoundingClientRect();
      const localPointerX = pointer.x - rect.left;
      const localPointerY = pointer.y - rect.top;
      const pointerDistance = Math.hypot(particle.x - localPointerX, particle.y - localPointerY);

      if (pointerDistance < 150) {
        context.globalAlpha = (150 - pointerDistance) / 280;
        context.strokeStyle = particle.color;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(localPointerX, localPointerY);
        context.stroke();
        context.strokeStyle = "#172026";
      }

      context.globalAlpha = 0.48;
      context.fillStyle = particle.color;
      context.beginPath();
      if (typeof context.roundRect === "function") {
        context.roundRect(particle.x, particle.y, particle.size * 6, particle.size, particle.size / 2);
      } else {
        context.rect(particle.x, particle.y, particle.size * 6, particle.size);
      }
      context.fill();
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
