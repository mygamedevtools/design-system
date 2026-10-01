const html = document.documentElement;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

// Theme switch ------------------------------------------------------------
const effectiveTheme = () => html.dataset.theme ?? (darkQuery.matches ? 'dark' : 'light');

function syncLogos() {
  const theme = effectiveTheme();
  for (const img of document.querySelectorAll('img.logo-swap')) {
    img.src = `../assets/logo/svg/${img.dataset.logo}-${theme}.svg`;
  }
}

function setTheme(choice) {
  if (choice === 'system') delete html.dataset.theme;
  else html.dataset.theme = choice;
  try {
    localStorage.setItem('mgt-theme', choice);
  } catch {}
  for (const button of document.querySelectorAll('[data-theme-choice]')) {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === choice));
  }
  syncLogos();
}

for (const button of document.querySelectorAll('[data-theme-choice]')) {
  button.addEventListener('click', () => setTheme(button.dataset.themeChoice));
}
darkQuery.addEventListener('change', syncLogos);
setTheme(html.dataset.theme ?? 'system');

// Static demos --------------------------------------------------------------
const componentDemo = document.getElementById('component-demo');
for (const panel of document.querySelectorAll('[data-component-demo]')) {
  panel.append(componentDemo.content.cloneNode(true));
}

// Status demos: give each clone unique ids so labels and descriptions stay linked.
const statusDemo = document.getElementById('status-demo');
document.querySelectorAll('[data-status-demo]').forEach((panel, index) => {
  panel.append(statusDemo.content.cloneNode(true));
  for (const el of panel.querySelectorAll('[data-id]')) el.id = `${el.dataset.id}-${index}`;
  for (const el of panel.querySelectorAll('[data-for]')) el.htmlFor = `${el.dataset.for}-${index}`;
  for (const el of panel.querySelectorAll('[data-describedby]')) {
    el.setAttribute('aria-describedby', `${el.dataset.describedby}-${index}`);
  }
});

const packages = [
  { name: 'My Scene Manager' },
  { name: 'Script Template' },
  { name: 'FPS Counter' },
  { name: 'Save System' },
];
const storeRow = document.querySelector('[data-render="store"]');
for (const pkg of packages) {
  const query = new URLSearchParams({ name: pkg.name });
  storeRow.insertAdjacentHTML(
    'beforeend',
    `<iframe class="store-card" title="${pkg.name} Asset Store card" src="../templates/asset-store/card.html?${query}" width="420" height="280" loading="lazy"></iframe>`,
  );
}
storeRow.insertAdjacentHTML(
  'beforeend',
  '<iframe class="store-icon" title="Asset Store icon" src="../templates/asset-store/icon.html" width="160" height="160" loading="lazy"></iframe>',
);

// Token-driven sections -----------------------------------------------------
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function readableOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.3 ? 'var(--mgt-palette-ink)' : 'var(--mgt-palette-cream)';
}

const swatch = (hex) =>
  `<span class="chip" style="background:${hex};color:${readableOn(hex)}">${escape(hex)}</span>`;

const response = await fetch('../build/tokens.json');
if (!response.ok) {
  document.querySelector('#color').insertAdjacentHTML(
    'beforeend',
    '<p class="note">Run <code>npm run build</code> to generate tokens.json.</p>',
  );
} else {
  const { tokens } = await response.json();

  document.querySelector('[data-render="palette"]').innerHTML = tokens
    .filter((t) => t.path[0] === 'palette')
    .map(
      (t) => `<figure class="swatch">
        <div class="swatch__color" style="background:${t.value}"></div>
        <figcaption><strong>${escape(t.path.at(-1))}</strong><code>${escape(t.value)}</code><span>${escape(t.description)}</span></figcaption>
      </figure>`,
    )
    .join('');

  document.querySelector('[data-render="roles"] tbody').innerHTML = tokens
    .filter((t) => t.theme === 'semantic')
    .map(
      (t) => `<tr><td><code>${escape(t.name)}</code></td><td>${swatch(t.light)}</td><td>${swatch(t.dark)}</td><td>${escape(t.description)}</td></tr>`,
    )
    .join('');

  document.querySelector('[data-render="scale"]').innerHTML = tokens
    .filter((t) => t.path[0] === 'font' && t.path[1] === 'size')
    .reverse()
    .map((t) => {
      const big = parseInt(t.value, 10) >= 24;
      return `<div class="scale__row"><code>${escape(t.path.at(-1))} · ${escape(t.value)}</code>
        <span class="${big ? 'display' : ''}" style="font-size:var(${t.name})">${big ? 'Scene Loader' : 'Load, unload and transition Unity scenes in one line.'}</span></div>`;
    })
    .join('');

  const tokenBody = document.querySelector('[data-render="tokens"] tbody');
  tokenBody.innerHTML = tokens
    .map((t) => {
      const value = t.theme === 'semantic' ? `${t.light} / ${t.dark}` : t.value;
      return `<tr data-search="${escape(`${t.name} ${value} ${t.description}`.toLowerCase())}">
        <td><code>${escape(t.name)}</code></td><td><code>${escape(value)}</code></td><td>${escape(t.description)}</td></tr>`;
    })
    .join('');

  document.querySelector('[data-token-filter]').addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    for (const row of tokenBody.rows) row.hidden = query !== '' && !row.dataset.search.includes(query);
  });
}
