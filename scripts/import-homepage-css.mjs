// Reproduce the approved demo CSS cascade, scoped to one production component.
// Keep reference demos unchanged. Run after deliberate updates to the approved UI.
import fs from "node:fs";
import postcss from "postcss";
const files = ["styles.css", "hybrids.css", "variation-4.css", "scroll-interactions.css", "refined-motion.css", "variation-4-integration.css", "content-motion.css"];
const prefix = ":where(.bd-home)";
let out = "/* Generated from the approved Variation 4. Every selector is scoped; FC and other routes cannot inherit it. */\n";
for (const file of files) {
  const ast = postcss.parse(fs.readFileSync(`demos/homepage/${file}`, "utf8"));
  ast.walkComments(c => c.remove());
  ast.walkAtRules(rule => {
    if (rule.name === "font-face" && !rule.toString().includes("Barlow")) rule.remove();
    if (rule.name === "keyframes") rule.params = `home-${rule.params}`;
  });
  const animationNames = new Set();
  ast.walkAtRules("keyframes", rule => animationNames.add(rule.params.replace(/^home-/, "")));
  // All names across files are prefixed even when declared in another sheet.
  const allCss = files.map(f => fs.readFileSync(`demos/homepage/${f}`, "utf8")).join("\n");
  for (const m of allCss.matchAll(/@keyframes\s+([\w-]+)/g)) animationNames.add(m[1]);
  ast.walkDecls(decl => {
    decl.value = decl.value.replaceAll('/assets/', '/images/homepage/').replaceAll('club-season','home-club-season').replaceAll('club-photos','home-club-photos');
    if (decl.prop === "font-family" || decl.prop === "font" || decl.prop === "--display") decl.value=decl.value.replace(/\bBarlow\b/g,"HomeBarlow");
    if (/^animation(?:-name)?$/.test(decl.prop)) for (const name of animationNames) decl.value=decl.value.replace(new RegExp(`(?<![\\w-])${name}(?![\\w-])`,"g"),`home-${name}`);
  });
  ast.walkRules(rule => {
    if (rule.parent.type === 'atrule' && rule.parent.name.includes('keyframes')) return;
    const selectors = postcss.list.comma(rule.selector).flatMap(selector => {
      // Drop unrelated concept-specific styles; preserve base + V4 cascade.
      if (/\.demo-(?:0[1-9])\b|\.preview-|\.chooser|\.lab-toolbar|\.lab-logo|\.concept-|\.lab-round-link/.test(selector)) {
        if (!selector.includes('.demo-10')) return [];
        selector=selector.replace(/\.demo-09\s*,\s*/g,'').replace(/,\s*\.demo-09/g,'');
      }
      if (selector.includes('::view-transition')) return selector.replace(/html:has\(\.demo-10\)/g,'html:has(.bd-home)').replaceAll('club-season','home-club-season').replaceAll('club-photos','home-club-photos');
      if (selector.startsWith('html:has(.demo-10) ')) {
        selector = selector.replace('html:has(.demo-10) ', '.demo-10 ');
      } else if (/^(?:html|body)(?:\b|:)/.test(selector)) {
        if (selector.startsWith('html')) return [];
        return selector.replace(/^body\b/,prefix);
      }
      if (selector === ':root') return prefix;
      selector=selector.replace(/(^|[\s>+~])main(?=[\s>+~.#[:]|$)/g,'$1[data-home-content]');
      // The demo places motion state on body above .demo-10.hybrid. In the
      // component all three classes share ONE root; preserve that relationship.
      selector=selector.replace(/^(\.motion-(?:enabled|off))\s+(\.(?:demo-10|hybrid))\b/, '$1$2');
      if (selector.startsWith('.motion-enabled') || selector.startsWith('.motion-off')) return `${prefix}${selector}`;
      if (selector.startsWith('.demo') || selector.startsWith('.hybrid')) return `${prefix}${selector}`;
      if (selector === '*') return `${prefix}, ${prefix} *`;
      return `${prefix} ${selector}`;
    });
    if (!selectors.length) rule.remove(); else rule.selector=selectors.join(',\n');
  });
  out += `\n/* ${file} */\n${ast.toString()}\n`;
}
fs.writeFileSync('src/components/homepage/homepage.css',out);
