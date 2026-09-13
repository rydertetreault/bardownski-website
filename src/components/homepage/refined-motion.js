// Variation 4: section titles and logo assembly, driven by native scroll.
// No photo effects, giant pinned scenes, cartoon art, or perpetual RAF loop.
export function initRefinedMotion(runtime, refreshBase = () => {}) {
  const { document, IntersectionObserver, ResizeObserver, MutationObserver, requestAnimationFrame, matchMedia, addEventListener } = runtime;
  const root = document.querySelector(".demo-10");
  if (!root) return;
  const main = root.querySelector("[data-home-content]"),
    thread = root.querySelector(".page-thread"),
    threadGroup = thread.querySelector(".thread-segments");
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const NS = "http://www.w3.org/2000/svg";
  const sections = [...main.children].filter((el) =>
    el.matches(
      ".cut-results,.cut-interlude,.cut-weekly,.cut-desk,.cut-highlights,.cut-news,.cut-history,.awards-shelf,.scrapbook",
    ),
  );
  // Short directional line sweeps at the new section cuts, observed only while
  // in view. Motion-off preserves the static diagonal boundaries immediately.
  const cuts = [...root.querySelectorAll(".section-cut")];
  const cutObserver = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting && enabled) target.classList.add("cut-entered");
        else if (!isIntersecting) target.classList.remove("cut-entered");
      }
    },
    { threshold: 0.25 },
  );
  const titles = new Map();
  const seen = new WeakSet();
  // Live homepage reference: opposing text slides + staggered rule drawing.
  // Animate only copy/actions, never the preview image or its hit target.
  const highlightRows = [...root.querySelectorAll(".highlight-item")].map(
    (el) => ({
      el,
      copy: el.querySelector(".highlight-item-copy"),
      action: el.querySelector(".highlight-watch"),
      rule: el.querySelector(".highlight-item-rule"),
      top: 0,
      last: null,
    }),
  );
  const logo = root.querySelector(".signature-logo");
  const slices = [...logo.querySelectorAll(".signature-slice")];
  let segments = [],
    enabled = false,
    frame = 0,
    measureFrame = 0,
    mainTop = 0,
    logoGeometry = null,
    logoLast = -1,
    initial = true;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const round = (x) => Math.round(x * 1000) / 1000;
  const ease = (x) => {
    x = clamp(x);
    return 1 - (1 - x) ** 3;
  };
  function set(el, key, value) {
    value = String(value);
    if (el.getAttribute(key) !== value) el.setAttribute(key, value);
  }
  const styleCache = new WeakMap();
  function style(el, key, value) {
    value = String(value);
    let cache = styleCache.get(el);
    if (!cache) {
      cache = {};
      styleCache.set(el, cache);
    }
    if (cache[key] === value) return;
    cache[key] = value;
    el.style[key] = value;
  }
  function wrapHeading(el) {
    if (seen.has(el)) return;
    seen.add(el);
    el.classList.add("title-motion");
    // Wrap only text nodes. Preserve <em>, <br>, punctuation and native heading
    // semantics; no duplicate screen-reader label or split-by-character content.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const text = [];
    while (walker.nextNode()) text.push(walker.currentNode);
    for (const node of text) {
      const fragment = document.createDocumentFragment();
      for (const token of node.textContent.split(/(\s+)/)) {
        if (!token) continue;
        if (/^\s+$/.test(token)) {
          fragment.append(document.createTextNode(token));
          continue;
        }
        const mask = document.createElement("span"),
          word = document.createElement("span");
        mask.className = "title-word-mask";
        word.className = "title-word";
        word.textContent = token;
        mask.append(word);
        fragment.append(mask);
      }
      node.replaceWith(fragment);
    }
    titles.set(el, {
      el,
      words: [...el.querySelectorAll(".title-word")],
      top: 0,
      height: 0,
      last: null,
      hero: !!el.closest(".hero-copy"),
    });
  }
  function watch() {
    for (const [el] of titles) if (!el.isConnected) titles.delete(el);
    root
      .querySelectorAll(
        ".hero-copy h1,.section-head h2,.weekly-copy h2,.rank-intro h2,.scrapbook-copy h2,.season-detail h3,.cut-interlude>p,.cut-interlude>em",
      )
      .forEach(wrapHeading);
  }
  function restore() {
    for (const title of titles.values()) {
      title.words.forEach((word) => {
        word.style.transform = "";
        word.style.opacity = "";
      });
      title.words.forEach((word) => styleCache.delete(word));
      title.last = null;
    }
    slices.forEach((slice) => {
      slice.style.transform = "";
      slice.style.opacity = "";
      styleCache.delete(slice);
    });
    logoLast = -1;
    for (const row of highlightRows) {
      for (const el of [row.copy, row.action, row.rule]) {
        el.style.transform = "";
        el.style.opacity = "";
        styleCache.delete(el);
      }
      row.last = null;
    }
    for (const segment of segments) set(segment.path, "stroke-dashoffset", 0);
  }
  function paint() {
    frame = 0;
    if (!enabled) return;
    const vh = innerHeight,
      readingY = scrollY + vh * 0.65 - mainTop;
    for (const segment of segments) {
      const p = round(clamp((readingY - segment.top) / segment.span));
      if (segment.last !== p) {
        segment.last = p;
        set(segment.path, "stroke-dashoffset", round(segment.length * (1 - p)));
      }
    }
    for (const title of titles.values()) {
      if (title.hero) continue; // hero has a finite masked entrance, not scroll pinning
      const p = round(clamp((scrollY + vh * 0.94 - title.top) / (vh * 0.27)));
      if (title.last === p) continue;
      title.last = p;
      title.el.dataset.titleProgress = String(p);
      title.words.forEach((word, i) => {
        const q = ease(clamp((p - i * 0.065) / 0.76));
        style(
          word,
          "transform",
          `translate3d(0,${round((1 - q) * 108)}%,0) rotate(${round((1 - q) * 2.5)}deg)`,
        );
        style(word, "opacity", round(0.08 + 0.92 * q));
      });
    }
    for (const row of highlightRows) {
      const p = round(clamp((scrollY + vh * 0.92 - row.top) / (vh * 0.34)));
      const focused = row.el.contains(document.activeElement);
      const state = focused ? 1 : p;
      if (row.last === state) continue;
      row.last = state;
      const q = ease(state);
      style(
        row.copy,
        "transform",
        `translate3d(${round((1 - q) * -22)}px,0,0)`,
      );
      style(
        row.action,
        "transform",
        `translate3d(${round((1 - q) * 14)}px,0,0)`,
      );
      style(row.copy, "opacity", round(0.45 + q * 0.55));
      style(row.action, "opacity", round(0.45 + q * 0.55));
      style(row.rule, "transform", `scaleX(${q})`);
    }
    if (logoGeometry) {
      const p = round(
        clamp((scrollY + vh * 0.91 - logoGeometry.top) / (vh * 0.43)),
      );
      if (p !== logoLast) {
        logoLast = p;
        logo.dataset.logoProgress = String(p);
        slices.forEach((slice, i) => {
          const q = ease(clamp((p - i * 0.085) / 0.75));
          style(
            slice,
            "transform",
            `translate3d(${round((1 - q) * [42, -34, 28][i])}%,0,0)`,
          );
          style(slice, "opacity", round(q));
        });
      }
    }
  }
  function schedule() {
    if (enabled && !frame) frame = requestAnimationFrame(paint);
  }
  function measure() {
    measureFrame = 0;
    watch();
    const r = main.getBoundingClientRect();
    mainTop = r.top + scrollY;
    const width = r.width,
      height = main.scrollHeight;
    set(thread, "viewBox", `0 0 ${width} ${height}`);
    thread.style.height = height + "px";
    const gutter = Math.max(11, width * 0.028),
      far = width - gutter;
    sections.forEach((el, i) => {
      const b = el.getBoundingClientRect(),
        top = b.top - r.top,
        height = b.height;
      // One understated side rule. Only three sections have a short horizontal
      // turn: no repeating rounded boxes, dots or moving "puck" on the page.
      const right = el.matches(".cut-interlude,.cut-highlights,.awards-shelf"),
        x = right ? far : gutter,
        turn = el.matches(".awards-shelf");
      const lengthX = width < 700 ? width * 0.09 : width * 0.17;
      const end = top + height - 18,
        start = top + 18;
      const d = turn
        ? `M${x} ${start}V${end}H${x + (right ? -lengthX : lengthX)}`
        : `M${x} ${start}V${end}`;
      let segment = segments[i];
      if (!segment) {
        const guide = document.createElementNS(NS, "path"),
          path = document.createElementNS(NS, "path");
        guide.classList.add("thread-guide");
        path.classList.add("thread-progress");
        threadGroup.append(guide, path);
        segment = { guide, path };
        segments[i] = segment;
      }
      if (segment.d !== d) {
        segment.d = d;
        set(segment.guide, "d", d);
        set(segment.path, "d", d);
        segment.length = segment.path.getTotalLength();
      }
      const sectionStyle = getComputedStyle(el);
      set(
        segment.path,
        "stroke",
        sectionStyle.getPropertyValue("--accent").trim(),
      );
      set(
        segment.guide,
        "stroke",
        sectionStyle.getPropertyValue("--text").trim(),
      );
      // Match the reference history without an extra decorative side rule.
      const showRule = el.id === "history" ? "0" : "1";
      set(segment.guide, "opacity", showRule);
      set(segment.path, "opacity", showRule);
      set(segment.path, "stroke-dasharray", segment.length);
      segment.top = top;
      segment.span = height;
      segment.last = null;
    });
    for (const title of titles.values()) {
      // Measure the untransformed masks' heading, not moving word spans.
      const b = title.el.getBoundingClientRect();
      title.top = b.top + scrollY;
      title.height = b.height;
      title.last = null;
    }
    for (const row of highlightRows) {
      row.top = row.el.getBoundingClientRect().top + scrollY;
      row.last = null;
    }
    const l = logo.getBoundingClientRect();
    logoGeometry = { top: l.top + scrollY };
    logoLast = -1;
    if (!enabled) restore();
    else schedule();
    if (initial) {
      initial = false;
      for (const title of titles.values())
        if (title.hero && enabled) {
          title.words.forEach((word, i) =>
            word.animate(
              [
                { transform: "translateY(108%)", opacity: 0 },
                { transform: "translateY(0)", opacity: 1 },
              ],
              {
                duration: 950,
                delay: 100 + i * 110,
                easing: "cubic-bezier(.22,1,.36,1)",
                fill: "backwards",
              },
            ),
          );
        }
    }
  }
  function refresh() {
    if (!runtime.active) return;
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  }
  function apply() {
    const next =
      document.body.classList.contains("motion-enabled") && !media.matches;
    if (next === enabled) {
      refresh();
      return;
    }
    enabled = next;
    root.classList.toggle("title-motion-ready", enabled);
    for (const cut of cuts) {
      cut.classList.toggle("cut-ready", enabled);
      if (enabled) cutObserver.observe(cut);
      else {
        cutObserver.unobserve(cut);
        cut.classList.remove("cut-entered");
      }
    }
    if (!enabled) {
      root
        .querySelectorAll(".title-word,.signature-slice")
        .forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
      restore();
    }
    refresh();
    refreshBase();
  }
  // Watch dynamic history replacements without observing our own word wrappers.
  const history = root.querySelector("[data-season-panel]");
  new MutationObserver(refresh).observe(history, { childList: true });
  new MutationObserver(apply).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
  new ResizeObserver(refresh).observe(main);
  if (root.querySelector(".highlight-list")) runtime.listen(root.querySelector(".highlight-list"), "focusin", schedule);
  if (root.querySelector(".highlight-list")) runtime.listen(root.querySelector(".highlight-list"), "focusout", schedule);
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", refresh);
  addEventListener("load", refresh);
  media.addEventListener("change", apply);
  document.fonts?.ready.then(refresh);
  apply();
}
