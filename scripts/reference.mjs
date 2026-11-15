// Generates dist/design-system-reference.html, the design-system reference, from the repository:
// tokens.json, the built stylesheet, the icon sprite and the gallery template. Run by npm run ds:reference.
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { buildTokens, read as text, valueIn } from './tokens-build.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const browserDir = 'dist/priamus-trips-frontend/browser';
const cssFile = (await readdir(browserDir).catch(() => [])).find((f) => /^styles-.*\.css$/.test(f));
if (!cssFile) {
  console.error(`No built stylesheet in ${browserDir}: run npm run build first.`);
  process.exit(1);
}

const { tokens } = await buildTokens();
const css = await text(`${browserDir}/${cssFile}`);
const index = await text('src/index.html');
const fontLinks = [...index.matchAll(/<link\b[^>]*fonts\.g[^>]*>/g)].map((m) => m[0].replace(/\s+/g, ' ')).join('\n');
const sprite = (await text('public/icons.svg')).replace(
  '<svg ',
  '<svg aria-hidden="true" style="position:absolute;width:0;height:0" ',
);

const themes = tokens.color.themes;
const row = (cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;
const table = (head, rows) =>
  `<table class="ref-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
const plain = (group, extra = () => []) =>
  table(['Token', 'Value', 'Usage'], tokens[group].tokens.map((t) => row([`<code>${esc(t.name)}</code>`, `<code>${esc(t.value)}</code>`, esc(t.usage), ...extra(t)])));

const colours = table(
  ['Token', ...themes.map((t) => esc(t.name)), 'Usage'],
  tokens.color.tokens.map((t) =>
    row([
      `<code>${esc(t.name)}</code>`,
      ...themes.map(
        (th) =>
          `<span class="ref-swatch" style="background:${esc(valueIn(t, th.id, themes[0].id))}"></span><code>${esc(valueIn(t, th.id, themes[0].id))}</code>`,
      ),
      esc(t.usage),
    ]),
  ),
);
const typeStyles = tokens.type.groups
  .map((g) =>
    `<h3>${esc(g.name)}</h3>` +
    table(
      ['Style', 'Sample', 'Size / line / weight', 'Usage'],
      g.styles.map((s) =>
        row([
          `<code>${esc(s.name)}</code>`,
          `<span style="font-family:var(--font-${g.family});font-size:${s.fontSize};line-height:${s.lineHeight};font-weight:${s.fontWeight}">${esc(s.sample ?? '')}</span>`,
          `<code>${esc(s.fontSize)} / ${esc(s.lineHeight)} / ${esc(s.fontWeight)}</code>`,
          esc(s.usage),
        ]),
      ),
    ),
  )
  .join('\n');

// The gallery is an Angular template: drop the theme button (the page has its own switch) and expand
// every <app-icon> into the svg the component renders.
const galleryTemplate = await text('src/app/features/design-system/gallery.html');
if ((galleryTemplate.match(/<h1\b/g) ?? []).length !== 1)
  throw new Error('gallery.html must have exactly one <h1>: the reference page keeps its own as the only one');
const gallery = galleryTemplate
  .replace(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/, '<h2$1>$2</h2>')
  .replace(/<button\b[^>]*\(click\)[^>]*>[\s\S]*?<\/button>/g, '')
  .replace(/<app-icon\s+([^>]*?)\s*\/>/g, (_, attrs) => {
    const name = attrs.match(/(?:^|\s)name="([^"]+)"/)?.[1];
    const size = attrs.match(/(?:^|\s)size="([^"]+)"/)?.[1];
    const rest = attrs.replace(/(?:^|\s)(?:name|size)="[^"]*"/g, '').trim();
    if (!name || rest || (attrs.includes('size') && !['xs', 'sm', 'md', 'lg'].includes(size)))
      throw new Error(`unsupported <app-icon> attributes: ${attrs}`);
    const cls = !size || size === 'md' ? 'pt-icon' : `pt-icon pt-icon--${size}`;
    return `<svg class="${cls}" aria-hidden="true"><use href="#${name}"/></svg>`;
  })
  .replace(/href="icons\.svg#/g, 'href="#');

const refStyle = `
.ref { max-width: 72rem; margin: 0 auto; padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-8, 32px); }
.ref h2 { font-size: var(--text-section-title-size); line-height: var(--text-section-title-line); font-weight: var(--text-section-title-weight); margin: 0 0 var(--space-3); }
.ref h3 { font-size: var(--text-card-title-size); line-height: var(--text-card-title-line); margin: var(--space-4) 0 var(--space-2); }
.ref-table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); }
.ref-table th, .ref-table td { text-align: left; vertical-align: middle; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border); }
.ref-swatch { display: inline-block; width: 20px; height: 20px; margin-right: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-sm); vertical-align: middle; }
.ref-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
`;

const html = `<!doctype html>
<html lang="it" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Priamus Trips design system</title>
${fontLinks}
<style>
${css}
${refStyle}
</style>
</head>
<body class="pt-root">
${sprite}
<div class="ref">
<div class="ref-bar">
<h1>${esc(tokens.name)} design system</h1>
<button type="button" class="pt-btn pt-btn--outline" id="ref-theme">Dark theme</button>
</div>
<section><h2>Colours</h2>${colours}</section>
<section><h2>Type</h2>${typeStyles}</section>
<section><h2>Spacing</h2>${plain('spacing')}</section>
<section><h2>Radius</h2>${plain('radius')}</section>
<section><h2>Size</h2>${plain('size')}</section>
<section><h2>Shadow</h2>${plain('shadow')}</section>
</div>
${gallery}
<script>
var root = document.documentElement, button = document.getElementById('ref-theme');
button.addEventListener('click', function () {
  var dark = root.getAttribute('data-theme') !== 'dark';
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  button.textContent = dark ? 'Light theme' : 'Dark theme';
});
</script>
</body>
</html>
`;

await mkdir('dist', { recursive: true });
await writeFile('dist/design-system-reference.html', html);
console.log('wrote dist/design-system-reference.html');
