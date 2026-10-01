// Fills a template from its URL parameters, e.g. card.html?name=Scene%20Loader&theme=dark.
// Elements with data-param="x" get the text of ?x=. Passing an empty ?x= hides the element, and so
// does a missing parameter on a data-hide-empty element that has no default text.
const params = new URLSearchParams(location.search);

if (params.has('theme')) document.documentElement.dataset.theme = params.get('theme');

for (const el of document.querySelectorAll('[data-param]')) {
  const value = params.get(el.dataset.param);
  if (value) el.textContent = value;
  else if (value === '' || (el.hasAttribute('data-hide-empty') && !el.textContent.trim())) el.hidden = true;
}

// <img data-param-src="x"> gets its src from ?x= (a URL, e.g. /site/img/shot.png). Without it the
// image is removed and <body> gets "no-<x>", so layouts can fall back.
for (const img of document.querySelectorAll('img[data-param-src]')) {
  const value = params.get(img.dataset.paramSrc);
  if (value) img.src = value;
  else {
    document.body.classList.add(`no-${img.dataset.paramSrc}`);
    img.remove();
  }
}

// <img data-fit> scales up or down to fill its parent while keeping its aspect ratio, so a
// screenshot always uses the whole frame (CSS max-width/max-height can only shrink it).
function fit(img) {
  const box = img.parentElement;
  const scale = Math.min(box.clientWidth / img.naturalWidth, box.clientHeight / img.naturalHeight);
  img.style.width = `${img.naturalWidth * scale}px`;
  img.style.height = `${img.naturalHeight * scale}px`;
}
for (const img of document.querySelectorAll('img[data-fit]')) {
  if (img.complete && img.naturalWidth) fit(img);
  else img.addEventListener('load', () => fit(img));
}

// Logo images follow the active theme.
const dark =
  document.documentElement.dataset.theme === 'dark' ||
  (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
for (const img of document.querySelectorAll('img[data-logo]')) {
  img.src = new URL(`../assets/logo/svg/${img.dataset.logo}-${dark ? 'dark' : 'light'}.svg`, import.meta.url).href;
}

const STRIPES = `<svg class="stripes" viewBox="0 0 300 200" aria-hidden="true">
  <line x1="152" y1="-20" x2="320" y2="148" style="stroke: var(--mgt-color-stripe-1)" stroke-width="16"/>
  <line x1="176" y1="-20" x2="320" y2="124" style="stroke: var(--mgt-color-stripe-2)" stroke-width="16"/>
  <line x1="200" y1="-20" x2="320" y2="100" style="stroke: var(--mgt-color-stripe-3)" stroke-width="16"/>
</svg>`;
for (const el of document.querySelectorAll('[data-stripes]')) el.insertAdjacentHTML('afterbegin', STRIPES);
