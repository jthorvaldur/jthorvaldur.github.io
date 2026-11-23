(() => {
  // heroConfig.ts
  var DEFS = {
    "b-cabbage": { cx: 0.04, cy: 0.02, r: 0.2, crop: [6, -0.044, -3.436] },
    "b-tomato": { cx: 0.015, cy: 0.55, r: 0.12, crop: [7.333, -1.333, -5] },
    "b-crate": { cx: 0.17, cy: 1, r: 0.26, crop: [3.333, -0.867, -1.1] },
    "b-fruit": { cx: 0.985, cy: 0.44, r: 0.15, crop: [6.842, -4.2, -4.532] },
    "b-romaine": { cx: 0.88, cy: 1.02, r: 0.24, crop: [5.714, -1.95, -3.714] }
  };
  var BEATS = [
    { bubble: "b-cabbage", panel: "p1", focalX: 0.3 },
    { bubble: "b-fruit", panel: "p2", focalX: 0.7 },
    { bubble: "b-crate", panel: "p3", focalX: 0.3 }
  ];
  var T = { heroEnd: 0.08, z1: 0.26, h1: 0.36, z2: 0.54, h2: 0.64, z3: 0.82 };

  // scrollHeroMath.ts
  var smooth = (t) => t * t * (3 - 2 * t);
  var gravity = (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - 16 * (1 - t) * (1 - t) * (1 - t) * (1 - t) * (1 - t);
  var lerp = (a, b, t) => t === 0 ? a : t === 1 ? b : a + (b - a) * t;
  var lerpCam = (A, B, t) => ({
    tx: lerp(A.tx, B.tx, t),
    ty: lerp(A.ty, B.ty, t),
    s: lerp(A.s, B.s, t)
  });
  var window_ = (P, a, b, c, d) => P < a ? 0 : P < b ? smooth((P - a) / (b - a)) : P <= c ? 1 : P < d ? 1 - smooth((P - c) / (d - c)) : 0;
  function computeBubbles(vp) {
    const base = vp.isMobile ? Math.min(vp.W, vp.H) : vp.H;
    const out = {};
    for (const [id, d] of Object.entries(DEFS)) {
      const size = 2 * d.r * base;
      out[id] = { cx: d.cx * vp.W, cy: d.cy * vp.H, r: size / 2 };
    }
    return out;
  }
  function computeCams(vp) {
    const bubbles = computeBubbles(vp);
    const R = vp.isMobile ? Math.min(0.21 * vp.H, 0.4 * vp.W) : 0.31 * vp.H;
    const fy = vp.isMobile ? 0.3 * vp.H : 0.52 * vp.H;
    const cams = [{ tx: 0, ty: 0, s: 1 }];
    for (const beat of BEATS) {
      const b = bubbles[beat.bubble];
      const s = R / b.r;
      const fx = (vp.isMobile ? 0.5 : beat.focalX) * vp.W;
      cams.push({ tx: fx - s * b.cx, ty: fy - s * b.cy, s });
    }
    return cams;
  }
  function camAt(P, cams) {
    const K = [
      [0, 0],
      [T.heroEnd, 0],
      [T.z1, 1],
      [T.h1, 1],
      [T.z2, 2],
      [T.h2, 2],
      [T.z3, 3],
      [1, 3]
    ];
    for (let i = 0; i < K.length - 1; i++) {
      const [t0, c0] = K[i];
      const [t1, c1] = K[i + 1];
      if (P <= t1) {
        const t = t1 === t0 ? 0 : gravity((P - t0) / (t1 - t0));
        return lerpCam(cams[c0], cams[c1], t);
      }
    }
    return cams[3];
  }

  // scrollHeroEngine.ts
  function createScrollHero(refs) {
    const q = (sel) => refs.root.querySelector(sel);
    let vp = { W: 0, H: 0, isMobile: false };
    let cams = computeCams(vp);
    function layout() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const isMobile = W < 700;
      vp = { W, H, isMobile };
      const base = isMobile ? Math.min(W, H) : H;
      for (const [id, d] of Object.entries(DEFS)) {
        const el = q(`#${id}`);
        if (!el) continue;
        const size = 2 * d.r * base;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.left = `${d.cx * W - size / 2}px`;
        el.style.top = `${d.cy * H - size / 2}px`;
        const img = el.querySelector("img.crop");
        if (img) {
          img.style.width = `${d.crop[0] * size}px`;
          img.style.left = `${d.crop[1] * size}px`;
          img.style.top = `${d.crop[2] * size}px`;
        }
      }
      cams = computeCams(vp);
      update();
    }
    function targetP() {
      const scrollable = refs.stage.offsetHeight - window.innerHeight;
      return Math.min(1, Math.max(0, window.scrollY / scrollable));
    }
    function update(P = targetP()) {
      const cam = camAt(P, cams);
      refs.field.style.transform = `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})`;
      const heroOpacity = 1 - smooth(Math.min(1, Math.max(0, (P - 0.03) / 0.09)));
      refs.heroUI.style.opacity = String(heroOpacity);
      const ctas = refs.heroUI.querySelector(".ctas");
      if (ctas) ctas.style.pointerEvents = heroOpacity > 0.05 ? "auto" : "none";
      const holds = [
        [T.z1, T.h1],
        [T.z2, T.h2],
        [T.z3, 1.01]
      ];
      BEATS.forEach((beat, i) => {
        const [h0, h1] = holds[i];
        const o = window_(P, h0 - 0.06, h0, h1, h1 + 0.06);
        const panel = q(`#${beat.panel}`);
        if (panel) {
          panel.style.opacity = String(o);
          panel.style.pointerEvents = o > 0.05 ? "auto" : "none";
          panel.style.transform = vp.isMobile ? `translateY(${(1 - o) * 14}px)` : `translateY(${-40 + (1 - o) * 6}%)`;
        }
        const story = q(`#${beat.bubble} img.story`);
        if (story) {
          story.style.opacity = String(
            window_(P, h0 - 0.12, h0 - 0.02, h1 + 0.02, h1 + 0.1)
          );
        }
      });
    }
    let smoothed = 0;
    let rafActive = false;
    let lastT = 0;
    let rafId = 0;
    function tick(now) {
      const dt = Math.min(0.05, (now - lastT) / 1e3 || 0.016);
      lastT = now;
      const t = targetP();
      smoothed += (t - smoothed) * (1 - Math.exp(-10 * dt));
      if (Math.abs(t - smoothed) < 4e-4) {
        smoothed = t;
        rafActive = false;
      }
      update(smoothed);
      if (rafActive) rafId = requestAnimationFrame(tick);
    }
    function kick() {
      if (!rafActive) {
        rafActive = true;
        lastT = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    }
    const onResize = () => {
      layout();
      kick();
    };
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", onResize);
    layout();
    kick();
    return {
      teardown() {
        window.removeEventListener("scroll", kick);
        window.removeEventListener("resize", onResize);
        if (rafId) cancelAnimationFrame(rafId);
      }
    };
  }

  // landing-entry.js
  var hero = document.getElementById("landing-hero");
  var reducedTemplate = document.getElementById("reduced-hero");
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var animatedTemplate = document.createElement("template");
  animatedTemplate.content.append(hero.cloneNode(true));
  var current = hero;
  var teardown;
  function mountHero() {
    teardown?.();
    const template = motion.matches ? reducedTemplate : animatedTemplate;
    const replacement = template.content.firstElementChild.cloneNode(true);
    replacement.id = "landing-hero";
    current.replaceWith(replacement);
    current = replacement;
    if (motion.matches) return;
    const engine = createScrollHero({
      root: current,
      stage: current.querySelector("#stage"),
      field: current.querySelector("#field"),
      heroUI: current.querySelector("#heroUI")
    });
    teardown = engine.teardown;
  }
  mountHero();
  motion.addEventListener("change", mountHero);
  document.addEventListener("click", (event) => {
    const control = event.target.closest("[data-scroll-to]");
    if (control) document.getElementById(control.dataset.scrollTo)?.scrollIntoView({
      behavior: motion.matches ? "auto" : "smooth"
    });
  });
})();
