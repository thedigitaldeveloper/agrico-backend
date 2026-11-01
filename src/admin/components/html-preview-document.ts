const tags = new Set(('address article aside footer header h1 h2 h3 h4 h5 h6 hgroup main nav section blockquote dd div dl dt figcaption figure hr li menu ol p pre ul a abbr b bdi bdo br cite code data dfn em i kbd mark q rb rp rt rtc ruby s samp small span strong sub sup time u var wbr caption col colgroup table tbody td tfoot th thead tr picture source img button details summary form label input select option optgroup textarea fieldset legend progress meter').split(' '));
const removedWithContent = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template']);
const commonAttributes = new Set(['class', 'id', 'title', 'role', 'style', 'lang', 'dir']);
const tagAttributes: Record<string, string[]> = {
  a: ['href', 'target', 'rel'], img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'],
  source: ['src', 'srcset', 'sizes', 'type', 'media'], time: ['datetime'], label: ['for'],
  input: ['type', 'value', 'placeholder', 'checked', 'disabled', 'readonly', 'min', 'max', 'step', 'size'],
  button: ['type', 'disabled'], select: ['multiple', 'size', 'disabled'], option: ['value', 'selected', 'disabled', 'label'],
  optgroup: ['label', 'disabled'], textarea: ['rows', 'cols', 'placeholder', 'disabled', 'readonly'], fieldset: ['disabled'],
  th: ['colspan', 'rowspan', 'scope', 'headers', 'abbr'], td: ['colspan', 'rowspan', 'headers'], col: ['span'], colgroup: ['span'],
  ol: ['start', 'reversed', 'type'], li: ['value'], details: ['open', 'name'], progress: ['value', 'max'],
  meter: ['value', 'min', 'max', 'low', 'high', 'optimum'],
};

function safeUrl(value: string) {
  const normalized = value.replace(/[\u0000-\u0020]/g, '');
  if (normalized.startsWith('//')) return false;
  const scheme = normalized.match(/^([a-z][a-z\d+.-]*):/i)?.[1]?.toLowerCase();
  return !scheme || ['http', 'https', 'mailto', 'tel'].includes(scheme);
}

/** This preview is a static layout, using the same safe controls as the site. */
export function previewDocument(html: string, css: string) {
  if (typeof DOMParser === 'undefined') return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  function clean(element: Element, documentElement = false) {
    const tag = element.tagName.toLowerCase();
    if (removedWithContent.has(tag)) { element.remove(); return; }
    Array.from(element.children).forEach((child) => clean(child));
    if (!documentElement && !tags.has(tag)) { element.replaceWith(...Array.from(element.childNodes)); return; }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const allowed = commonAttributes.has(name) || name.startsWith('aria-') || name.startsWith('data-') || tagAttributes[tag]?.includes(name);
      const unsafeUrl = ['href', 'src'].includes(name) && !safeUrl(attribute.value);
      const unsafeSrcset = name === 'srcset' && attribute.value.split(',').some((candidate) => !safeUrl(candidate.trim().split(/\s+/)[0] || ''));
      if (!allowed || unsafeUrl || unsafeSrcset) element.removeAttribute(name);
    }
    if (tag === 'a' && element.getAttribute('target') === '_blank') element.setAttribute('rel', 'noopener noreferrer');
    if (['input', 'select', 'textarea', 'button'].includes(tag)) element.setAttribute('disabled', '');
    if (tag === 'button') element.setAttribute('type', 'button');
    if (tag === 'form') {
      const replacement = document.createElement('div');
      Array.from(element.attributes).forEach((attribute) => replacement.setAttribute(attribute.name, attribute.value));
      replacement.setAttribute('role', 'group');
      replacement.setAttribute('data-rs-static-form', 'true');
      replacement.append(...Array.from(element.childNodes));
      element.replaceWith(replacement);
    }
  }
  clean(document.body, true);
  for (const element of [document.documentElement, document.body]) {
    for (const attribute of Array.from(element.attributes)) {
      if (!['class', 'id', 'title', 'style', 'lang', 'dir'].includes(attribute.name)) element.removeAttribute(attribute.name);
    }
  }
  const origin = window.location.origin;
  const safeCss = css.replace(/<\/style/gi, '');
  const csp = `default-src 'none'; script-src 'none'; img-src ${origin} https://i.ytimg.com https://maps.googleapis.com https://maps.gstatic.com data: blob:; style-src 'unsafe-inline'; font-src ${origin}; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; connect-src 'none'`;
  document.head.innerHTML = `<meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>*,*::before,*::after{box-sizing:border-box}body{margin:0;min-width:0;font-family:"DM Sans",sans-serif;color:#6b6260}input,button,select,textarea{font:inherit}${safeCss}</style>`;
  return '<!doctype html>' + document.documentElement.outerHTML;
}
