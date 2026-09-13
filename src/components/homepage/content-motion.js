// Variation 4 content choreography. IO triggers finite entrances; no scroll
// hijacking, image transforms, layout movement or perpetual animation loop.
export function initContentMotion(runtime) {
  const { document, IntersectionObserver, MutationObserver, matchMedia } = runtime;

  const root = document.querySelector(".demo-10");
  if (!root) return;
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const groups = new Map();
  const triggers = new WeakMap();
  const animations = new Map();
  const handoffs = [];
  let enabled = false;
  function settle(group) {
    group.played = true;
    group.el.classList.remove("content-queued");
    group.el.classList.add("content-entered");
    for (const target of group.targets) {
      animations.get(target)?.cancel();
      animations.delete(target);
    }
    observer.unobserve(group.trigger);
  }
  function play(group) {
    if (!enabled || group.played) return;
    group.played = true;
    group.el.classList.remove("content-queued");
    group.el.classList.add("content-entered");
    observer.unobserve(group.trigger);
    for (const [index, target] of group.targets.entries()) {
      if (!target.isConnected) continue;
      const x = group.direction * (innerWidth < 700 ? 22 : 40);
      const animation = target.animate(
        [
          { opacity: 0, transform: `translate3d(${x}px,18px,0)` },
          { opacity: 1, transform: "translate3d(0,0,0)" },
        ],
        {
          duration: 640,
          delay: Math.min(index * 75, 300),
          easing: "cubic-bezier(.16,1,.3,1)",
          fill: "backwards",
        },
      );
      animations.set(target, animation);
      animation.finished
        .then(() => {
          if (animations.get(target) === animation) {
            animations.delete(target);
            animation.cancel();
          }
        })
        .catch(() => {});
    }
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const group = triggers.get(entry.target);
        if (group && entry.isIntersecting) play(group);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
  );
  function add(el, selector, direction, triggerSelector) {
    if (!el || groups.has(el)) return;
    const targets = [...el.querySelectorAll(selector)];
    if (!targets.length) return;
    const trigger = triggerSelector ? el.querySelector(triggerSelector) : el;
    const group = { el, targets, trigger, direction, played: !enabled };
    triggers.set(trigger, group);
    groups.set(el, group);
    el.classList.add("content-sequence");
    targets.forEach((target) => target.classList.add("content-slide"));
    if (enabled) {
      el.classList.add("content-queued");
      observer.observe(group.trigger);
    }
  }
  function discover() {
    for (const [el, group] of groups) {
      if (!el.isConnected) {
        observer.unobserve(group.trigger);
        group.targets.forEach((target) => {
          animations.get(target)?.cancel();
          animations.delete(target);
        });
        groups.delete(el);
      }
    }
    root
      .querySelectorAll(".result-row")
      .forEach((el, i) =>
        add(el, ".result-letter,.result-team,strong", i % 2 ? 1 : -1),
      );
    add(
      root.querySelector(".weekly-copy"),
      ":scope > p:not(.eyebrow),:scope > .mini-stats > div,:scope > .fine",
      1,
    );
    root
      .querySelectorAll(".rank-entry")
      .forEach((el, i) =>
        add(
          el.querySelector("summary"),
          ".rank-number,b,strong",
          i % 2 ? 1 : -1,
        ),
      );
    root
      .querySelectorAll(".news-item")
      .forEach((el, i) =>
        add(el, ".news-meta,h3,p,.text-link", i % 2 ? 1 : -1, ".news-meta"),
      );
    root
      .querySelectorAll(".season-selector button")
      .forEach((el, i) => add(el, "b,small", i % 2 ? 1 : -1));
    add(
      root.querySelector(".season-detail article"),
      ":scope > .season-year,:scope > .captain-line,:scope > p,:scope > .text-link",
      1,
    );
    root
      .querySelectorAll(".award-tile")
      .forEach((el, i) =>
        add(el, ".award-symbol,.eyebrow,h3,small,.text-link", i % 2 ? 1 : -1),
      );
    add(
      root.querySelector(".scrapbook-copy"),
      ":scope > p:not(.eyebrow),:scope > .fine",
      -1,
    );
  }
  // Flat color boundaries receive a short source-color wipe in the section's
  // top padding. Diagonal boundaries use their existing SVG polygons instead.
  const main = root.querySelector("[data-home-content]");
  for (const [selector, from] of [
    [".cut-results", "var(--club-black)"],
    [".cut-interlude", "var(--club-teal)"],
    ["#history", "var(--club-white)"],
    [".awards-shelf", "var(--club-dark-surface)"],
  ]) {
    const section = main.querySelector(selector);
    const cap = document.createElement("div");
    cap.className = "color-handoff";
    cap.setAttribute("aria-hidden", "true");
    cap.style.setProperty("--handoff-from", from);
    const band = document.createElement("i");
    band.className = "handoff-band";
    cap.append(band);
    section.classList.add("handoff-section");
    section.prepend(cap);
    handoffs.push(cap);
  }
  const handoffObserver = new IntersectionObserver(
    (entries) => {
      for (const { target, isIntersecting } of entries) {
        if (enabled && isIntersecting) target.classList.add("handoff-entered");
        else if (!isIntersecting) target.classList.remove("handoff-entered");
      }
    },
    { threshold: 0.15 },
  );
  function apply() {
    const next =
      document.body.classList.contains("motion-enabled") && !media.matches;
    if (next === enabled) return;
    enabled = next;
    root.classList.toggle("content-motion-enabled", enabled);
    discover();
    for (const group of groups.values()) {
      if (!enabled) {
        settle(group);
        continue;
      }
      // Do not conceal already-read content when resuming animations.
      const rect = group.el.getBoundingClientRect();
      group.played = rect.bottom < 0;
      group.el.classList.toggle("content-queued", !group.played);
      group.el.classList.remove("content-entered");
      if (!group.played) observer.observe(group.trigger);
    }
    for (const cap of handoffs) {
      if (enabled) handoffObserver.observe(cap);
      else {
        handoffObserver.unobserve(cap);
        cap.classList.remove("handoff-entered");
      }
    }
  }
  // Focus and pointer entry expose queued/animating text immediately. The
  // button or summary hit targets never move, so input is never intercepted.
  function expose(event) {
    for (const group of groups.values())
      if (group.el.contains(event.target)) settle(group);
  }
  runtime.listen(root, "focusin", expose);
  runtime.listen(root, "pointerover", expose);
  new MutationObserver(() => {
    discover();
  }).observe(root.querySelector("[data-season-panel]"), { childList: true });
  new MutationObserver(apply).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
  media.addEventListener("change", apply);
  discover();
  apply();
}
