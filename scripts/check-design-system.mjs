// Checks of the design system that can be read from the files. The name of a check says what it
// proves. Exit code 1 if one fails.
import { readdir } from 'node:fs/promises';
import { buildTokens, read } from './tokens-build.mjs';

const declares = (css, name, value) =>
  css.includes(`--${name}: ${value};`) ? [] : [`--${name}: ${value}; is not declared`];

const spriteIds = async () =>
  [...(await read('public/icons.svg')).matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
// The rules of components.css as { selectors, body }; comments are dropped first.
const rulesOf = (css) =>
  [...stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selectors: m[1].split(',').map((s) => s.trim()),
    body: m[2],
  }));
const componentRules = async () => rulesOf(await read('src/styles/components.css'));
// The css without its at-rule blocks (@media, @keyframes): the rules a component has of its own.
const withoutAtRules = (source) => {
  const css = stripComments(source);
  let out = '';
  for (let i = 0; i < css.length; i++) {
    if (css[i] !== '@') {
      out += css[i];
      continue;
    }
    // A block at-rule runs to its closing brace; one without a block (@import, @layer x;) to its semicolon.
    const open = css.indexOf('{', i);
    const semicolon = css.indexOf(';', i);
    if (open === -1 || (semicolon !== -1 && semicolon < open)) {
      i = semicolon === -1 ? css.length : semicolon;
      continue;
    }
    for (let depth = 0; i < css.length; i++) {
      depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
      if (i >= open && depth === 0) break;
    }
  }
  return out;
};
// A component's own rules: a class that only a nested @media rule styles has no rule of its own.
const topLevelRules = async () => rulesOf(withoutAtRules(await read('src/styles/components.css')));
const lacksRule = (top, selector) => ruleFor(top, selector).length === 0;
const ruleFor = (rules, selector) => rules.filter((r) => r.selectors.includes(selector));
const declaration = (rule, prop) =>
  rule.body.match(new RegExp(`(?:^|;|\\s)${prop}:\\s*([^;]+);`))?.[1].trim();
// Every class name used by the selectors of the rules, whole names.
const classNames = (rules) =>
  new Set(rules.flatMap((r) => r.selectors.flatMap((sel) => [...sel.matchAll(/\.([a-z0-9_-]+)/g)].map((m) => m[1]))));
const sourceFiles = async (dir) => {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true }))
    files.push(...(e.isDirectory() ? await sourceFiles(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
  return files;
};
const hasDeclaration = (rules, selector, prop, value) =>
  ruleFor(rules, selector).some((r) => declaration(r, prop) === value)
    ? []
    : [`${selector} does not set ${prop}: ${value}`];
// The body of every block that opens with `head` (an at-rule), braces counted; '' when there is none.
const blocksOf = (source, head) => {
  const css = stripComments(source);
  const bodies = [];
  for (let from = css.indexOf(head); from !== -1; from = css.indexOf(head, from + 1)) {
    const open = css.indexOf('{', from);
    if (open === -1) break;
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
      if (depth === 0) {
        bodies.push(css.slice(open + 1, i));
        break;
      }
    }
  }
  return bodies.join('\n');
};
const galleryHtml = () => read('src/app/features/design-system/gallery.html');
const voidTags = new Set(['input', 'img', 'br', 'hr', 'meta', 'link']);
// What lies between the opening tag `open` (a match of the tag regex) and its closing tag, nested tags
// of the same name counted; '' for a void or self-closing element.
const contentOf = (html, open) => {
  const tag = open[1];
  if (open[0].endsWith('/>') || voidTags.has(tag)) return '';
  const from = open.index + open[0].length;
  const tags = new RegExp(`<(/?)${tag}(?![\\w-])[^>]*>`, 'g');
  tags.lastIndex = from;
  let depth = 1;
  for (let t = tags.exec(html); t; t = tags.exec(html)) {
    if (t[1]) depth--;
    else if (!t[0].endsWith('/>')) depth++;
    if (depth === 0) return html.slice(from, t.index);
  }
  return '';
};
// The elements of the gallery with their class tokens, so that a class is matched as a whole name,
// and their own content, so that a check can look inside one element only.
const galleryElements = (html) =>
  [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/g)].map((m) => ({
    tag: m[1],
    classes: new Set((m[2].match(/\sclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean)),
    raw: m[0],
    get content() {
      return contentOf(html, m);
    },
  }));
const usesClasses = (html, names, where = () => true) =>
  galleryElements(html).some((e) => names.every((n) => e.classes.has(n)) && where(e));
const usesClass = (html, name) => usesClasses(html, [name]);
// Custom properties used by var(--x) in some rules, and declared in the rules of a theme block.
const varsUsed = (rules) =>
  new Set(rules.flatMap((r) => [...r.body.matchAll(/var\(--([a-z0-9-]+)/g)].map((m) => m[1])));
const declaredIn = (css, theme) =>
  new Set(
    rulesOf(css)
      .filter((r) => r.selectors.includes(`[data-theme='${theme}']`))
      .flatMap((r) => [...r.body.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1])),
  );
const declaredAnywhere = (css) =>
  new Set(rulesOf(css).flatMap((r) => [...r.body.matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1])));
// Tokens that tokens.json defines per theme (an object value); the others have one value for all.
const perThemeTokens = (tokens) =>
  new Set(
    [...tokens.color.tokens, ...(tokens.shadow?.tokens ?? [])]
      .filter((t) => typeof t.value !== 'string')
      .map((t) => t.name),
  );
// The modifiers each component may have: its sizes and its colours. One table for every check that needs it.
const allowedModifiers = {
  btn: ['sm', 'lg', 'icon', 'primary', 'outline', 'warn', 'danger'],
  input: ['sm', 'lg'],
  search: ['sm', 'lg'],
  notice: ['info', 'success', 'warn', 'danger'],
  // 'purple' is one of the grammar's three named exceptions (UX-CONTEXT.md, Design system grammar), with stat and row below.
  pill: ['success', 'info', 'warn', 'danger', 'purple'],
  count: ['primary', 'warn'],
  tile: ['lg', 'primary', 'success', 'warn', 'danger'],
  toast: [],
  spinner: ['sm'],
  avatar: [],
  empty: [],
  paging: [],
  brand: [],
  topbar: [],
  // The exceptions of the grammar, taken from the reference mockups (UX-CONTEXT.md, Design system grammar).
  stat: ['highlight'],
  row: ['anomaly'],
};
// The modifiers of `text` (whole names) that the table does not give to those components.
const modifiersOutsideTable = (text, bases) =>
  bases.flatMap((base) =>
    [...text.matchAll(new RegExp(`pt-${base}--([a-z0-9_-]+)`, 'g'))]
      .map((m) => m[1])
      .filter((m) => !allowedModifiers[base].includes(m))
      .map((m) => `.pt-${base}--${m} is not a size or a colour of the grammar`),
  );

const checks = [
  {
    name: 'the control sizes are named tokens',
    async run() {
      const { tokens } = await buildTokens();
      const css = await read('src/styles/tokens.css');
      const expected = { 'control-sm': '30px', 'control-md': '36px', 'control-lg': '44px' };
      return Object.entries(expected).flatMap(([name, value]) => {
        const token = tokens.size?.tokens.find((t) => t.name === name);
        return token?.value === value
          ? declares(css, name, value)
          : [`tokens.json: ${name} is not ${value}`];
      });
    },
  },
  {
    name: 'every text style is emitted as a custom property',
    async run() {
      const { tokens } = await buildTokens();
      const css = await read('src/styles/tokens.css');
      return tokens.type.groups.flatMap((g) =>
        g.styles.flatMap((s) => [
          ...declares(css, `text-${s.name}-size`, s.fontSize),
          ...declares(css, `text-${s.name}-line`, s.lineHeight),
          ...declares(css, `text-${s.name}-weight`, s.fontWeight),
        ]),
      );
    },
  },
  {
    name: 'tokens.css and theme.css are up to date',
    async run() {
      const { tokensCss, themeCss } = await buildTokens();
      const problems = [];
      if ((await read('src/styles/tokens.css')) !== tokensCss)
        problems.push('src/styles/tokens.css differs from the generator output: run npm run tokens');
      if ((await read('src/styles/theme.css')) !== themeCss)
        problems.push('src/styles/theme.css differs from the generator output: run npm run tokens');
      return problems;
    },
  },
  {
    name: 'the icons of the first screens are in the sprite',
    async run() {
      const ids = await spriteIds();
      return ['truck', 'user', 'user-plus', 'user-x', 'sign-out', 'menu', 'close', 'search', 'chevron']
        .filter((id) => !ids.includes(id))
        .map((id) => `public/icons.svg has no symbol "${id}"`);
    },
  },
  {
    name: 'every icon of the sprite is shown in the gallery',
    async run() {
      const html = await galleryHtml();
      return (await spriteIds())
        .filter((id) => !html.includes(`name="${id}"`))
        .map((id) => `gallery.html does not show name="${id}"`);
    },
  },
  {
    name: 'the icon names of the component match the sprite',
    async run() {
      const ts = await read('src/app/shared/components/icon/icon.ts');
      const union = ts.match(/export type IconName =([^;]*);/)?.[1] ?? '';
      const names = [...union.matchAll(/'([^']+)'/g)].map((m) => m[1]);
      const ids = await spriteIds();
      return [
        ...names.filter((n) => !ids.includes(n)).map((n) => `icon.ts names "${n}", not in the sprite`),
        ...ids.filter((n) => !names.includes(n)).map((n) => `sprite symbol "${n}" is not in icon.ts`),
      ];
    },
  },
  {
    name: 'every sized control has sm and lg',
    async run() {
      const rules = await componentRules();
      const heights = [
        ['.pt-btn--sm', 'sm'],
        ['.pt-btn--lg', 'lg'],
        ['.pt-input--sm', 'sm'],
        ['.pt-input--lg', 'lg'],
        ['.pt-search--sm', 'sm'],
        ['.pt-search--lg', 'lg'],
      ];
      const squares = [
        ['.pt-btn--icon', 'md'],
        ['.pt-btn--icon.pt-btn--sm', 'sm'],
        ['.pt-btn--icon.pt-btn--lg', 'lg'],
      ];
      return [
        ...heights.flatMap(([s, size]) => hasDeclaration(rules, s, 'height', `var(--control-${size})`)),
        ...['.pt-btn', '.pt-input', '.pt-search'].flatMap((s) =>
          hasDeclaration(rules, s, 'height', 'var(--control-md)'),
        ),
        ...squares.flatMap(([s, size]) => hasDeclaration(rules, s, 'width', `var(--control-${size})`)),
      ];
    },
  },
  {
    name: 'the default control is 36px high with 14px text',
    async run() {
      const css = await read('src/styles/tokens.css');
      const rules = await componentRules();
      return [
        ...declares(css, 'control-md', '36px'),
        ...declares(css, 'text-body-size', '14px'),
        ...['.pt-btn', '.pt-input', '.pt-search'].flatMap((s) => [
          ...hasDeclaration(rules, s, 'font-size', 'var(--text-body-size)'),
          ...hasDeclaration(rules, s, 'line-height', 'var(--text-body-line)'),
        ]),
        ...['.pt-filter__button', '.pt-search--sm', '.pt-btn--sm'].flatMap((s) =>
          hasDeclaration(rules, s, 'height', 'var(--control-sm)'),
        ),
      ];
    },
  },
  {
    name: 'the filter chip is a small control',
    async run() {
      const rules = await componentRules();
      const mapped = [
        ['sm', 'small'],
        ['lg', 'card-title'],
      ];
      return [
        ...hasDeclaration(rules, '.pt-filter__button', 'height', 'var(--control-sm)'),
        ...hasDeclaration(rules, '.pt-filter__button', 'font-size', 'var(--text-small-size)'),
        ...mapped.flatMap(([size, text]) => [
          ...hasDeclaration(rules, `.pt-btn--${size}`, 'font-size', `var(--text-${text}-size)`),
          ...hasDeclaration(rules, `.pt-input--${size}`, 'line-height', `var(--text-${text}-line)`),
          ...hasDeclaration(rules, `.pt-search--${size}`, 'font-size', `var(--text-${text}-size)`),
          ...hasDeclaration(rules, `.pt-search--${size}`, 'line-height', `var(--text-${text}-line)`),
        ]),
      ];
    },
  },
  {
    name: 'the looks of a button',
    async run() {
      const rules = await componentRules();
      const top = await topLevelRules();
      const names = classNames(rules);
      // The rule that sets a colour comes later in the file, so equal specificity lets it win.
      const colourAt = (selector) =>
        rules.findLastIndex((r) => r.selectors.includes(selector) && declaration(r, 'color'));
      const icon = colourAt('.pt-btn--icon');
      return [
        ...['pt-btn--outline', 'pt-btn--primary', 'pt-btn--warn', 'pt-btn--danger']
          .filter((n) => lacksRule(top, `.${n}`))
          .map((n) => `.${n} does not exist`),
        ...['pt-btn--success', 'pt-btn--info'].filter((n) => names.has(n)).map((n) => `.${n} must not exist`),
        ...['primary', 'warn', 'danger']
          .filter((n) => icon !== -1 && colourAt(`.pt-btn--${n}`) < icon)
          .map((n) => `.pt-btn--${n} sets its colour before .pt-btn--icon, which overrides it on an icon button`),
        ...hasDeclaration(rules, '.pt-btn:disabled', 'opacity', '0.5'),
        ...hasDeclaration(rules, ".pt-btn[aria-disabled='true']", 'opacity', '0.5'),
      ];
    },
  },
  {
    name: 'a field has a rule line, an error line, a red invalid border and a disabled state',
    async run() {
      const rules = await componentRules();
      return [
        ...hasDeclaration(rules, '.pt-field__hint', 'color', 'var(--text-muted)'),
        ...hasDeclaration(rules, '.pt-field__error', 'color', 'var(--danger)'),
        ...hasDeclaration(rules, ".pt-input[aria-invalid='true']", 'border-color', 'var(--danger)'),
        ...hasDeclaration(rules, '.pt-input:disabled', 'opacity', '0.5'),
        ...hasDeclaration(rules, '.pt-input.pt-mono', 'font-family', 'var(--font-mono)'),
      ];
    },
  },
  {
    name: 'a table scrolls inside its wrap and keeps hidden labels in it, never widening the page',
    async run() {
      const rules = await componentRules();
      return [
        ...hasDeclaration(rules, '.pt-table-wrap', 'overflow-x', 'auto'),
        ...hasDeclaration(rules, '.pt-table-wrap', 'position', 'relative'),
      ];
    },
  },
  {
    name: 'the select has the box of an input in every size',
    async run() {
      const rules = await componentRules();
      return rules
        .filter((r) => r.selectors.includes('select.pt-input'))
        .flatMap((r) =>
          ['height', 'min-height', 'padding'].filter((p) => declaration(r, p)).map((p) => `select.pt-input sets its own ${p}`),
        );
    },
  },
  {
    name: 'the select opts into the customisable list',
    async run() {
      const rules = await componentRules();
      return [
        ...hasDeclaration(rules, 'select.pt-input', 'appearance', 'base-select'),
        ...hasDeclaration(rules, 'select.pt-input::picker(select)', 'appearance', 'base-select'),
        ...hasDeclaration(rules, 'select.pt-input::picker(select)', 'box-shadow', 'var(--shadow-popover)'),
        ...hasDeclaration(rules, 'select.pt-input option:checked', 'background', 'var(--primary-soft)'),
        ...hasDeclaration(rules, 'select.pt-input option::checkmark', 'display', 'none'),
      ];
    },
  },
  {
    name: 'the textarea is three lines high and resizes vertically',
    async run() {
      const rules = await componentRules();
      return [
        ...hasDeclaration(rules, 'textarea.pt-input', 'resize', 'vertical'),
        ...hasDeclaration(rules, 'textarea.pt-input', 'height', 'auto'),
        ...hasDeclaration(
          rules,
          'textarea.pt-input',
          'min-height',
          'calc(var(--text-body-line) * 3 + var(--space-2) * 2)',
        ),
      ];
    },
  },
  {
    name: 'the checkbox is native, icon-md square, in the primary colour',
    async run() {
      const css = await read('src/styles/tokens.css');
      const rules = await componentRules();
      return [
        ...declares(css, 'icon-md', '16px'),
        ...hasDeclaration(rules, '.pt-check input', 'width', 'var(--icon-md)'),
        ...hasDeclaration(rules, '.pt-check input', 'height', 'var(--icon-md)'),
        ...hasDeclaration(rules, '.pt-check input', 'accent-color', 'var(--primary)'),
      ];
    },
  },
  {
    name: 'one focus ring on fields',
    async run() {
      const rules = await componentRules();
      return [
        ...hasDeclaration(rules, '.pt-root .pt-input:focus-visible', 'outline-offset', '0'),
        ...hasDeclaration(rules, '.pt-search:focus-within', 'outline-offset', '0'),
        ...hasDeclaration(rules, '.pt-search:focus-within', 'border-color', 'var(--primary)'),
        ...hasDeclaration(rules, '.pt-root .pt-search input:focus-visible', 'outline', 'none'),
      ];
    },
  },
  {
    name: 'buttons, links and navigation keep the detached ring on :focus-visible only',
    async run() {
      const rules = await componentRules();
      const bare = rules
        .flatMap((r) => r.selectors)
        .filter((s) => /:focus(?![-\w])/.test(s));
      return [
        ...hasDeclaration(rules, '.pt-root :focus-visible', 'outline-offset', '2px'),
        ...bare.map((s) => `${s} styles :focus, which also matches a click`),
      ];
    },
  },
  {
    name: 'the controls follow the grammar: base, size, colour, states from attributes',
    async run() {
      const selectors = (await componentRules()).flatMap((r) => r.selectors);
      return [
        ...modifiersOutsideTable(selectors.join('\n'), ['btn', 'input', 'search']),
        ...selectors
          .filter((s) => /\.pt-(btn|input|search|check|field)[\w-]*--(disabled|invalid|checked|active|focus)/.test(s))
          .map((s) => `${s} is a state written as a class`),
      ];
    },
  },
  {
    name: 'no pixel literal in a height or text size',
    async run() {
      return (await componentRules()).flatMap((r) =>
        ['height', 'min-height', 'font-size', 'line-height', 'font']
          .map((p) => [p, declaration(r, p)])
          .filter(([, v]) => v && /\d\s*px/.test(v))
          .map(([p, v]) => `${r.selectors.join(', ')}: ${p}: ${v}`),
      );
    },
  },
  {
    name: 'the button colours use the shared names',
    async run() {
      const rules = await componentRules();
      return [
        ['primary', 'var(--primary)', 'var(--on-primary)'],
        ['warn', 'var(--warn)', 'var(--on-warn)'],
        ['danger', 'var(--danger-soft)', 'var(--danger)'],
      ].flatMap(([name, background, color]) => [
        ...hasDeclaration(rules, `.pt-btn--${name}`, 'background', background),
        ...hasDeclaration(rules, `.pt-btn--${name}`, 'color', color),
      ]);
    },
  },
  {
    name: 'the controls of the catalogue are shown in the gallery',
    async run() {
      const html = await galleryHtml();
      // The single classes are covered by 'the gallery shows every class'.
      return [
        { names: ['pt-btn', 'pt-btn--icon'] },
        { names: ['pt-input'], tag: 'input' },
        { names: ['pt-input'], tag: 'select' },
        { names: ['pt-input'], tag: 'textarea' },
      ]
        .filter(({ names, tag }) => !usesClasses(html, names, (e) => !tag || e.tag === tag))
        .map(({ names, tag }) => `gallery.html does not show ${tag ?? ''} ${names.join(' ')}`);
    },
  },
  {
    name: 'the select, the rule line and the compact search field with its icon exist',
    async run() {
      const html = await galleryHtml();
      const top = await topLevelRules();
      return [
        ...(lacksRule(top, 'select.pt-input') ? ['select.pt-input has no rule'] : []),
        ...(lacksRule(top, '.pt-field__hint') ? ['.pt-field__hint has no rule'] : []),
        ...(usesClasses(html, ['pt-search', 'pt-search--sm'], (e) => /^\s*<app-icon name="search"/.test(e.content))
          ? []
          : ['gallery.html: the compact search field has no icon']),
      ];
    },
  },
  {
    name: 'the gallery shows every size and look of the controls',
    async run() {
      const html = await galleryHtml();
      return [
        ...[
          ['pt-btn--icon', 'pt-btn--sm'],
          ['pt-btn--icon', 'pt-btn--lg'],
          ['pt-btn--icon', 'pt-btn--primary'],
          ['pt-btn--icon', 'pt-btn--danger'],
          ['pt-search', 'pt-search--lg'],
        ]
          .filter((names) => !usesClasses(html, names))
          .map((names) => `gallery.html does not show ${names.join(' ')}`),
        ...['disabled', 'aria-invalid="true"', '<textarea']
          .filter((s) => !html.includes(s))
          .map((s) => `gallery.html does not show ${s}`),
      ];
    },
  },
  {
    name: 'the notice has its four colours and a neutral default',
    async run() {
      const rules = await componentRules();
      return [
        ...hasDeclaration(rules, '.pt-notice', 'background', 'var(--surface-alt)'),
        ...hasDeclaration(rules, '.pt-notice', 'color', 'var(--text)'),
        ...hasDeclaration(rules, '.pt-notice', 'display', 'flex'),
        ...hasDeclaration(rules, '.pt-notice', 'justify-content', 'space-between'),
        ...hasDeclaration(rules, '.pt-notice', 'padding', 'var(--space-2) var(--space-3)'),
        ...hasDeclaration(
          rules,
          '.pt-notice',
          'min-height',
          'calc(var(--control-sm) + var(--space-2) * 2)',
        ),
        ...['info', 'success', 'warn', 'danger'].flatMap((n) => [
          ...hasDeclaration(rules, `.pt-notice--${n}`, 'background', `var(--${n}-soft)`),
          ...hasDeclaration(rules, `.pt-notice--${n}`, 'color', `var(--${n})`),
        ]),
      ];
    },
  },
  {
    name: 'one tile component',
    async run() {
      const rules = await componentRules();
      const old = ['pt-dialog__tile', 'pt-stat__tile'];
      const users = [];
      for (const file of await sourceFiles('src')) {
        const text = await read(file);
        for (const n of old) if (text.includes(n)) users.push(`${file} still mentions ${n}`);
      }
      return [
        ...hasDeclaration(rules, '.pt-tile', 'width', 'var(--tile-md)'),
        ...hasDeclaration(rules, '.pt-tile', 'height', 'var(--tile-md)'),
        ...hasDeclaration(rules, '.pt-tile--lg', 'width', 'var(--tile-lg)'),
        ...hasDeclaration(rules, '.pt-tile--lg', 'height', 'var(--tile-lg)'),
        ...['primary', 'success', 'warn', 'danger'].flatMap((n) => [
          ...hasDeclaration(rules, `.pt-tile--${n}`, 'background', `var(--${n}-soft)`),
          ...hasDeclaration(rules, `.pt-tile--${n}`, 'color', `var(--${n})`),
        ]),
        ...hasDeclaration(rules, '.pt-stat--highlight .pt-tile', 'background', 'var(--primary)'),
        ...users,
      ];
    },
  },
  {
    name: 'the toast and its region exist',
    async run() {
      const css = await read('src/styles/components.css');
      const html = await galleryHtml();
      const rules = await componentRules();
      return [
        ...hasDeclaration(rules, '.pt-toast', 'background', 'var(--surface)'),
        ...hasDeclaration(rules, '.pt-toast', 'border', '1px solid var(--border)'),
        ...hasDeclaration(rules, '.pt-toast', 'border-radius', 'var(--radius-lg)'),
        ...hasDeclaration(rules, '.pt-toast', 'box-shadow', 'var(--shadow-popover)'),
        ...hasDeclaration(rules, '.pt-toast', 'font-weight', '600'),
        ...hasDeclaration(rules, '.pt-toast .pt-icon', 'color', 'var(--success)'),
        ...hasDeclaration(rules, '.pt-toast-region', 'position', 'fixed'),
        ...hasDeclaration(rules, '.pt-toast-region', 'bottom', 'var(--space-8)'),
        ...hasDeclaration(rules, '.pt-toast-region', 'right', 'var(--space-8)'),
        ...(ruleFor(rulesOf(blocksOf(css, '@media (max-width: 639px)')), '.pt-toast-region').some((r) => declaration(r, 'left'))
          ? []
          : ['no max-width: 639px rule spans .pt-toast-region across the width']),
        ...(usesClass(html, 'pt-toast') ? [] : ['gallery.html does not show pt-toast']),
        ...(usesClasses(html, ['pt-toast'], (e) => /^\s*<app-icon name="check"/.test(e.content))
          ? []
          : ['gallery.html: the toast has no check icon']),
        ...(usesClasses(html, ['pt-toast'], (e) => galleryElements(e.content).some((c) => c.tag === 'button'))
          ? ['gallery.html: the toast has a close button']
          : []),
      ];
    },
  },
  {
    name: 'the spinner honours reduced motion',
    async run() {
      const css = await read('src/styles/components.css');
      const rules = await componentRules();
      const html = await galleryHtml();
      return [
        ...hasDeclaration(rules, '.pt-spinner', 'width', 'var(--icon-lg)'),
        ...hasDeclaration(rules, '.pt-spinner', 'height', 'var(--icon-lg)'),
        ...hasDeclaration(rules, '.pt-spinner', 'border', '2px solid var(--border-strong)'),
        ...hasDeclaration(rules, '.pt-spinner', 'border-top-color', 'var(--primary)'),
        ...hasDeclaration(rules, '.pt-spinner', 'animation', 'pt-spin 0.8s linear infinite'),
        ...hasDeclaration(rules, '.pt-spinner--sm', 'width', 'var(--icon-sm)'),
        ...hasDeclaration(rules, '.pt-spinner--sm', 'height', 'var(--icon-sm)'),
        ...hasDeclaration(
          rulesOf(blocksOf(css, '@media (prefers-reduced-motion: reduce)')),
          '.pt-spinner',
          'animation-duration',
          '2.4s',
        ).map(() => 'no prefers-reduced-motion rule slows .pt-spinner to 2.4s'),
        ...(galleryElements(html).some(
          (e) =>
            /\srole="status"/.test(e.raw) &&
            e.content.includes('Caricamento…') &&
            usesClass(e.content, 'pt-spinner'),
        )
          ? []
          : ['gallery.html: the spinner is not shown with "Caricamento…" in one status element']),
      ];
    },
  },
  {
    name: 'the avatar is a control-md circle with initials',
    async run() {
      const rules = await componentRules();
      return [
        ['width', 'var(--control-md)'],
        ['height', 'var(--control-md)'],
        ['border-radius', 'var(--radius-full)'],
        ['background', 'var(--surface-alt)'],
        ['font-size', 'var(--text-body-size)'],
        ['font-weight', '600'],
      ].flatMap(([prop, value]) => hasDeclaration(rules, '.pt-avatar', prop, value));
    },
  },
  {
    name: 'the empty block is a centred column',
    async run() {
      const rules = await componentRules();
      const html = await galleryHtml();
      return [
        ['display', 'flex'],
        ['flex-direction', 'column'],
        ['align-items', 'center'],
        ['text-align', 'center'],
      ]
        .flatMap(([prop, value]) => hasDeclaration(rules, '.pt-empty', prop, value))
        .concat(
          usesClasses(html, ['pt-empty'], (empty) => {
            const inside = galleryElements(empty.content);
            return (
              inside.some((e) => e.classes.has('pt-tile') && e.classes.has('pt-tile--lg')) &&
              inside.some((e) => e.classes.has('pt-title')) &&
              inside.some((e) => e.classes.has('pt-muted'))
            );
          })
            ? []
            : ['gallery.html: the empty block is not a large tile, a title and a muted line'],
        );
    },
  },
  {
    name: 'the paging control sits right in the table footer',
    async run() {
      const rules = await componentRules();
      const footers = galleryElements(await galleryHtml())
        .filter((e) => e.tag === 'tfoot')
        .map((e) => e.content);
      return [
        ...hasDeclaration(rules, '.pt-paging', 'display', 'inline-flex'),
        ...hasDeclaration(rules, '.pt-table tfoot td:has(.pt-paging)', 'text-align', 'right'),
        ...(footers.some((footer) => usesClasses(footer, ['pt-label'], (e) => /^\s*Utenti/.test(e.content)))
          ? []
          : ['gallery.html: the footer has no range label']),
        ...(footers.some((footer) =>
          usesClasses(footer, ['pt-paging'], (paging) => {
            const button = (text, disabled) =>
              galleryElements(paging.content).some(
                (e) =>
                  e.tag === 'button' &&
                  ['pt-btn', 'pt-btn--outline', 'pt-btn--sm'].every((n) => e.classes.has(n)) &&
                  /\sdisabled(\s|>)/.test(e.raw) === disabled &&
                  e.content.trim() === text,
              );
            return button('Precedente', false) && paging.content.includes('Pagina 2 di 2') && button('Successiva', true);
          }),
        )
          ? []
          : ['gallery.html: the paging control has no Precedente / Pagina 2 di 2 / Successiva (disabled)']),
      ];
    },
  },
  {
    name: 'colour modifiers use the shared names',
    async run() {
      const text = (await read('src/styles/components.css')) + (await galleryHtml());
      return modifiersOutsideTable(text, ['btn', 'notice', 'pill', 'count', 'tile']);
    },
  },
  {
    name: 'the notice, tile, toast, spinner, avatar, empty block and paging follow the grammar',
    async run() {
      const selectors = (await componentRules()).flatMap((r) => r.selectors);
      return modifiersOutsideTable(
        selectors.join('\n'),
        ['notice', 'tile', 'toast', 'spinner', 'avatar', 'empty', 'paging', 'brand', 'topbar', 'stat', 'row'],
      );
    },
  },
  {
    name: 'the danger notice, the paging control, the toast and the primary and danger tiles exist',
    async run() {
      const top = await topLevelRules();
      const html = await galleryHtml();
      return [
        ...['.pt-notice--danger', '.pt-paging', '.pt-toast', '.pt-tile--primary', '.pt-tile--danger']
          .filter((s) => lacksRule(top, s))
          .map((s) => `${s} has no rule`),
        ...[['pt-notice', 'pt-notice--danger'], ['pt-tile', 'pt-tile--primary'], ['pt-tile', 'pt-tile--danger']]
          .filter((names) => !usesClasses(html, names))
          .map((names) => `gallery.html does not show ${names.join(' ')}`),
      ];
    },
  },
  {
    name: 'the plain notice is neutral',
    async run() {
      const rules = await componentRules();
      const html = await galleryHtml();
      const base = ruleFor(rules, '.pt-notice').map((r) => r.body).join('');
      return [
        ...(/warn/.test(base) ? ['.pt-notice still carries the warning colour'] : []),
        ...hasDeclaration(rules, '.pt-notice--warn', 'background', 'var(--warn-soft)'),
        ...(usesClasses(html, ['pt-notice', 'pt-notice--warn']) ? [] : ['gallery.html does not use pt-notice pt-notice--warn']),
      ];
    },
  },
  {
    name: 'no state class',
    async run() {
      return [...classNames(await componentRules())]
        .filter((n) => /--(?:[a-z0-9]+-)*(disabled|invalid|selected|current|pressed|sorted|checked|focus|active|open)(?![a-z0-9])/.test(n) || n.startsWith('is-'))
        .map((n) => `.${n} is a state class: use an attribute or a pseudo-class`);
    },
  },
  {
    name: 'every class has the pt- prefix',
    async run() {
      return [...classNames(await componentRules())]
        .filter((n) => !n.startsWith('pt-'))
        .map((n) => `.${n} does not start with pt-`);
    },
  },
  {
    name: 'the pill and the count have the shared colours',
    async run() {
      const names = classNames(await componentRules());
      const modifiers = (base) =>
        [...names].filter((n) => n.startsWith(`${base}--`)).map((n) => n.slice(base.length + 2));
      const pill = modifiers('pt-pill');
      const count = modifiers('pt-count');
      return [
        ...allowedModifiers.pill.filter((c) => c !== 'purple' && !pill.includes(c)).map((c) => `pt-pill--${c} is missing`),
        ...allowedModifiers.count.filter((c) => !count.includes(c)).map((c) => `pt-count--${c} is missing`),
      ];
    },
  },
  {
    name: 'every colour is a token',
    async run() {
      const css = await read('src/styles/components.css');
      const { tokens } = await buildTokens();
      const tokensCss = await read('src/styles/tokens.css');
      const light = declaredIn(tokensCss, 'light');
      const dark = declaredIn(tokensCss, 'dark');
      const all = declaredAnywhere(tokensCss);
      const perTheme = perThemeTokens(tokens);
      const literals = [
        ...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/#[0-9a-fA-F]{3,8}\b|(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g),
      ].map((m) => `components.css writes the colour literal ${m[0]}`);
      return [
        ...literals,
        ...[...varsUsed(rulesOf(css))].flatMap((n) => [
          ...(all.has(n) ? [] : [`--${n} is used by components.css and declared nowhere in tokens.css`]),
          ...(light.has(n) && perTheme.has(n) && !dark.has(n)
            ? [`--${n} is per theme in tokens.json and has no value in the dark block`]
            : []),
        ]),
      ];
    },
  },
  {
    name: 'native controls follow the theme',
    async run() {
      const rules = await componentRules();
      return [
        ...hasDeclaration(rules, "[data-theme='light']", 'color-scheme', 'light'),
        ...hasDeclaration(rules, "[data-theme='dark']", 'color-scheme', 'dark'),
      ];
    },
  },
  {
    name: 'the gallery shows every class',
    async run() {
      const html = await galleryHtml();
      return [...classNames(await componentRules())]
        .filter((n) => n !== 'pt-root' && !usesClass(html, n))
        .map((n) => `gallery.html does not show ${n}`);
    },
  },
  {
    name: 'the catalogue is complete',
    async run() {
      const top = await topLevelRules();
      // One class per component of the catalogue.
      return [
        '.pt-btn', '.pt-btn--icon', '.pt-input', 'select.pt-input', 'textarea.pt-input', '.pt-check', '.pt-search',
        '.pt-field', '.pt-label', '.pt-field__error',
        '.pt-notice', '.pt-pill', '.pt-count', '.pt-toast', '.pt-toast-region', '.pt-spinner', '.pt-empty',
        '.pt-card', '.pt-stat', '.pt-table', '.pt-paging', '.pt-dialog', '.pt-drawer', '.pt-menu',
        '.pt-nav-item', '.pt-nav__group', '.pt-topbar', '.pt-topbar__title', '.pt-filter__button', '.pt-view',
        '.pt-icon', '.pt-brand', '.pt-tile', '.pt-avatar',
      ]
        .filter((sel) => lacksRule(top, sel))
        .map((sel) => `${sel} has no rule`);
    },
  },
  {
    name: 'no class of the old catalogue was lost',
    async run() {
      // The classes components.css had before sizes and colours got one grammar; the two tiles were renamed to pt-tile and
      // pt-nav was removed on purpose.
      const old = ['pt-amount', 'pt-btn', 'pt-btn--danger', 'pt-btn--icon', 'pt-btn--outline', 'pt-btn--primary', 'pt-btn--sm', 'pt-calc', 'pt-calc__row', 'pt-calc__rule', 'pt-card', 'pt-code', 'pt-count', 'pt-count--primary', 'pt-count--warn', 'pt-dialog', 'pt-dialog__actions', 'pt-dialog__head', 'pt-dialog__tile', 'pt-drawer', 'pt-drawer__body', 'pt-drawer__foot', 'pt-drawer__head', 'pt-eyebrow', 'pt-field', 'pt-field__error', 'pt-filter', 'pt-filter__button', 'pt-icon', 'pt-icon--lg', 'pt-icon--sm', 'pt-icon--xs', 'pt-input', 'pt-label', 'pt-menu', 'pt-menu__item', 'pt-mono', 'pt-muted', 'pt-nav', 'pt-nav-item', 'pt-notice', 'pt-num', 'pt-pill', 'pt-pill--danger', 'pt-pill--info', 'pt-pill--purple', 'pt-pill--success', 'pt-pill--warn', 'pt-root', 'pt-row--anomaly', 'pt-scrim', 'pt-stat', 'pt-stat--highlight', 'pt-stat__tile', 'pt-stat__value', 'pt-strip', 'pt-table', 'pt-table-wrap', 'pt-timeline', 'pt-timeline__dot', 'pt-timeline__dot--warn', 'pt-timeline__item', 'pt-timeline__meta', 'pt-title', 'pt-view', 'pt-view--warn'];
      const renamed = { 'pt-dialog__tile': 'pt-tile', 'pt-stat__tile': 'pt-tile' };
      const removed = { 'pt-nav': 'used by no template and no approved mockup' };
      const names = classNames(await componentRules());
      const users = [];
      for (const file of await sourceFiles('src')) {
        const text = await read(file);
        for (const n of Object.keys(removed))
          if (new RegExp(`(?<![\\w-])${n}(?![\\w-])`).test(text)) users.push(`${file} still uses .${n}, removed on purpose: ${removed[n]}`);
      }
      // That the renamed classes are no longer used anywhere is checked by 'one tile component'.
      return [
        ...old
          .filter((n) => !(n in removed) && !names.has(renamed[n] ?? n))
          .map((n) => `.${n} is neither defined nor renamed`),
        ...Object.keys(removed)
          .filter((n) => names.has(n))
          .map((n) => `.${n} is still defined, removed on purpose: ${removed[n]}`),
        ...users,
      ];
    },
  },
  {
    name: 'the reference is generated from the repository',
    async run() {
      let html;
      try {
        html = await read('dist/design-system-reference.html');
      } catch {
        return { skip: 'dist/design-system-reference.html does not exist: run npm run ds:reference' };
      }
      const { tokens } = await buildTokens();
      const names = [
        ...tokens.color.tokens,
        ...tokens.spacing.tokens,
        ...tokens.size.tokens,
        ...tokens.radius.tokens,
        ...(tokens.shadow?.tokens ?? []),
        ...tokens.type.groups.flatMap((g) => g.styles),
      ].map((t) => t.name);
      const classes = [...classNames(await componentRules())];
      const whole = (name, prefix) =>
        new RegExp(`${prefix ? '' : '(?<![a-z0-9_-])'}${prefix}${name}(?![a-z0-9_-])`).test(html);
      return [
        ...names.filter((n) => !whole(n, '')).map((n) => `the reference has no token "${n}"`),
        ...classes.filter((c) => !whole(c, '\\.')).map((c) => `the reference has no selector ".${c}"`),
        ...classes
          .filter((c) => c !== 'pt-root' && !usesClass(html, c))
          .map((c) => `no element of the reference page carries the class "${c}"`),
        ...(/<app-/.test(html) ? ['the reference still has an <app- element'] : []),
        ...(html.includes('(click)') ? ['the reference still has a (click) binding'] : []),
      ];
    },
  },
];

let failed = 0;
for (const check of checks) {
  const problems = await check.run();
  if (problems.skip) {
    console.log(`skip ${check.name}: ${problems.skip}`);
  } else if (problems.length === 0) {
    console.log(`ok   ${check.name}`);
  } else {
    failed++;
    console.log(`FAIL ${check.name}`);
    problems.forEach((p) => console.log(`       ${p}`));
  }
}
process.exit(failed === 0 ? 0 : 1);
