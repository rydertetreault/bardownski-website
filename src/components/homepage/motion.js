// Progressive, bounded motion. Geometry is measured outside the scroll paint;
// only visible sections update leaf transforms, and offscreen tickers pause.
export function initMotion(runtime) {
  const { document, IntersectionObserver, ResizeObserver, requestAnimationFrame, matchMedia, addEventListener } = runtime;

  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const button = document.querySelector(".motion-toggle");
  const progress = document.querySelector(".film-progress");
  const sections = [...document.querySelectorAll("[data-scroll]")];
  const mono = document.querySelector(".demo-10");
  const sectionLinks = [...document.querySelectorAll("[data-section-link]")];
  const navProgress = document.querySelector(".mono-nav-progress");
  const destinations = sectionLinks.map((link) =>
    document.getElementById(link.dataset.sectionLink),
  );
  // Attach enhanced scrolling only to the new variation, before observers start.
  if (mono) {
    for (const el of mono.querySelectorAll(
      ".cut-desk,.cut-highlights:not([data-scrub]),.cut-news,.cut-history,.scrapbook",
    )) {
      if (!sections.includes(el)) sections.push(el);
    }
  }
  const visible = new Set();
  const geometry = new Map();
  const observed = new WeakSet();
  let paused = false;
  let enabled = false;
  let frame = 0;
  let measureFrame = 0;
  let activeSection = undefined;
  try {
    paused = localStorage.getItem("bd-home-motion") === "paused";
  } catch {}
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const reveals = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        target.classList.add("arrived");
        reveals.unobserve(target);
      }
    },
    { rootMargin: "0px 0px -5% 0px", threshold: 0.08 },
  );
  const stages = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        target.classList.add("revealed");
        stages.unobserve(target);
      }
    },
    { threshold: 0.25 },
  );
  const marquees = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries)
      target.classList.toggle("running", isIntersecting);
  });
  const scrollers = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) visible.add(target);
        else visible.delete(target);
      }
      schedule();
    },
    { rootMargin: "10% 0px 10% 0px" },
  );
  function watch() {
    for (const [selector, observer] of [
      ["[data-reveal]", reveals],
      ["[data-stage]", stages],
      [".marquee", marquees],
    ]) {
      for (const el of document.querySelectorAll(selector)) {
        if (observed.has(el)) continue;
        observed.add(el);
        observer.observe(el);
      }
    }
  }
  function measure() {
    measureFrame = 0;
    for (const el of sections) {
      const r = el.getBoundingClientRect();
      geometry.set(el, { top: r.top + scrollY, height: r.height });
    }
    for (const el of destinations) {
      const r = el.getBoundingClientRect();
      geometry.set(el, { top: r.top + scrollY, height: r.height });
    }
    updateSectionNavigation();
    schedule();
  }
  function updateSectionNavigation() {
    if (!sectionLinks.length) return;
    const readingLine = scrollY + innerHeight * 0.36;
    let active = null;
    destinations.forEach((el, index) => {
      if ((geometry.get(el)?.top ?? Infinity) <= readingLine) active = index;
    });
    if (active === activeSection) return;
    activeSection = active;
    sectionLinks.forEach((link, index) => {
      if (index === active) link.setAttribute("aria-current", "location");
      else if (link.hasAttribute("aria-current"))
        link.removeAttribute("aria-current");
    });
  }
  function refresh() {
    if (!runtime.active) return;
    watch();
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }
  function transform(el, value) {
    if (el.dataset.motionTransform === value) return;
    el.dataset.motionTransform = value;
    el.style.transform = value;
  }
  function paint() {
    frame = 0;
    updateSectionNavigation();
    if (!enabled) return;
    const vh = innerHeight;
    if (progress) {
      const max = document.documentElement.scrollHeight - vh;
      progress.style.transform = `scaleX(${clamp(scrollY / Math.max(1, max))})`;
    }
    if (navProgress) {
      const max = document.documentElement.scrollHeight - vh;
      navProgress.style.transform = `scaleX(${clamp(scrollY / Math.max(1, max))})`;
    }
    for (const el of visible) {
      const g = geometry.get(el);
      if (!g) continue;
      const rel = g.top - scrollY;
      const entry = Math.round(clamp((vh - rel) / (vh * 0.65)) * 100) / 100;
      const through =
        Math.round(clamp((vh - rel) / (vh + g.height)) * 100) / 100;
      if (
        el.dataset.entry === String(entry) &&
        el.dataset.through === String(through)
      )
        continue;
      el.dataset.entry = String(entry);
      el.dataset.through = String(through);
      // After Hours: opposing text passes and a drawn baseline.
      for (const child of el.querySelectorAll(
        ".demo:not(.demo-10) .interlude > p",
      ))
        transform(child, `translate3d(${(1 - entry) * -65}px,0,0)`);
      for (const child of el.querySelectorAll(
        ".demo:not(.demo-10) .interlude > em",
      ))
        transform(child, `translate3d(${(1 - entry) * 65}px,0,0)`);
      for (const child of el.querySelectorAll(".interlude-line"))
        transform(child, `scaleX(${entry})`);
      // Violet Hour: slow gallery-image drift, kept within clipped frames.
      for (const child of el.querySelectorAll(
        ".violet-portrait img,.stage-photo img",
      ))
        transform(
          child,
          `translate3d(0,${(through - 0.5) * 35}px,0) scale(1.08)`,
        );
      if (mono) {
        // Variation 4 animates SVG artwork, never photo scale or position.
        for (const line of el.querySelectorAll("[data-scroll-line]"))
          transform(line, `scaleX(${entry})`);
      } else {
        // Other variations keep their existing poster motion.
        for (const child of el.querySelectorAll(
          ".film-weekly .weekly-image > img",
        ))
          transform(child, `scale(${1.03 + through * 0.04})`);
      }
    }
  }
  function schedule() {
    if ((enabled || sectionLinks.length) && !frame)
      frame = requestAnimationFrame(paint);
  }
  function apply() {
    enabled = !paused && !media.matches;
    document.body.classList.toggle("motion-enabled", enabled);
    document.body.classList.toggle("motion-off", !enabled);
    if (button) {
      button.disabled = media.matches;
      button.setAttribute("aria-pressed", String(paused));
      button.textContent = media.matches
        ? "Reduced motion on"
        : paused
          ? "Resume animations"
          : "Pause animations";
    }
    if (enabled) {
      for (const el of sections) scrollers.observe(el);
    } else {
      for (const el of sections) {
        scrollers.unobserve(el);
        delete el.dataset.entry;
        delete el.dataset.through;
        for (const child of el.querySelectorAll("[data-motion-transform]")) {
          child.style.removeProperty("transform");
          delete child.dataset.motionTransform;
        }
      }
      visible.clear();
      if (progress) progress.style.transform = "scaleX(0)";
      if (navProgress) navProgress.style.transform = "scaleX(0)";
    }
    refresh();
  }
  runtime.listen(button, "click", () => {
    paused = !paused;
    try {
      localStorage.setItem("bd-home-motion", paused ? "paused" : "playing");
    } catch {}
    apply();
  });
  media.addEventListener("change", apply);
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", refresh);
  addEventListener("load", refresh);
  if (document.fonts) document.fonts.ready.then(refresh);
  new ResizeObserver(refresh).observe(document.body);
  for (const group of document.querySelectorAll("[data-load]")) {
    [
      ...group.querySelectorAll(
        ".hero-copy > *, .journal-masthead > *, .signal-heading > *, .chooser > header > *",
      ),
    ].forEach((el, i) => el.style.setProperty("--i", i));
    requestAnimationFrame(() => group.classList.add("loaded"));
  }
  apply();
  return { refresh };
}
