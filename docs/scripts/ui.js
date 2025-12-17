// ui.js - helper functions for DOM rendering across pages

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'text') e.textContent = attrs[k];
    else if (k.startsWith('data-')) e.setAttribute(k, attrs[k]);
    else e[k] = attrs[k];
  }
  children.forEach(c => {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  });
  return e;
}

function formatDateISO(date) {
  return (new Date(date)).toISOString().split('T')[0];
}
