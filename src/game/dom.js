// Small helpers for building the page.

/** Tiny DOM builder: h('p', { class: 'x' }, 'text', child). */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null) continue;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat().filter((c) => c != null && c !== false));
  return el;
}

/**
 * Turn text with fractions marked as "{3/4}" into nodes, with each
 * fraction typeset as a real stacked fraction (MathML), which screen
 * readers can also read aloud.
 */
export function rich(text) {
  const nodes = [];
  const marker = /\{(\d+)\/(\d+)\}/g;
  let last = 0;
  let match;
  while ((match = marker.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      h('span', {
        class: 'frac',
        'data-frac': `${match[1]}/${match[2]}`,
        html: `<math><mfrac><mn>${match[1]}</mn><mn>${match[2]}</mn></mfrac></math>`,
      }),
    );
    last = marker.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** "{3/4}" -> "3/4", for labels that must be plain text. */
export function plain(text) {
  return text.replace(/\{(\d+)\/(\d+)\}/g, '$1/$2');
}
