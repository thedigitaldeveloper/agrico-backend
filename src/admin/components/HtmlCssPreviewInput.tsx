import { forwardRef, useState } from 'react';
import { previewDocument } from './html-preview-document';

interface CodeValue { html?: string; css?: string }
interface InputProps {
  name: string;
  value?: CodeValue | null;
  disabled?: boolean;
  required?: boolean;
  intlLabel?: { defaultMessage?: string };
  onChange: (event: { target: { name: string; type: string; value: CodeValue } }) => void;
}

export const HtmlCssPreviewInput = forwardRef<HTMLTextAreaElement, InputProps>(function HtmlCssPreviewInput(
  { name, value, disabled, required, intlLabel, onChange }, ref
) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const html = typeof value?.html === 'string' ? value.html : '';
  const css = typeof value?.css === 'string' ? value.css : '';
  const update = (field: 'html' | 'css', next: string) => {
    onChange({ target: { name, type: 'json', value: { html, css, [field]: next } } });
  };

  return <div style={{ display: 'grid', gap: 14, width: '100%' }}>
    <strong style={{ fontSize: 14 }}>{intlLabel?.defaultMessage || 'HTML & CSS with live preview'}{required ? ' *' : ''}</strong>
    <p style={{ margin: 0, color: '#6b6260', fontSize: 13 }}>HTML and CSS update this static layout preview as you type. Tables and document/body styles are supported. Form fields are layout examples; use a platform form for submissions. Scripts do not run. Site typography and surrounding page styles may differ.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 14 }}>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
        HTML
        <textarea ref={ref} aria-label="Section HTML" spellCheck={false} disabled={disabled} value={html}
          onChange={(event) => update('html', event.target.value)} placeholder="<section>...</section>"
          style={{ width: '100%', minHeight: 220, resize: 'vertical', padding: 12, border: '1px solid #d8cec6', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }} />
      </label>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
        CSS
        <textarea aria-label="Section CSS" spellCheck={false} disabled={disabled} value={css}
          onChange={(event) => update('css', event.target.value)} placeholder="section { ... }"
          style={{ width: '100%', minHeight: 220, resize: 'vertical', padding: 12, border: '1px solid #d8cec6', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 }} />
      </label>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <strong style={{ fontSize: 14 }}>Live preview</strong>
      <div aria-label="Preview width" style={{ display: 'flex', gap: 6 }}>
        {(['desktop', 'mobile'] as const).map((item) => <button key={item} type="button" onClick={() => setDevice(item)}
          aria-pressed={device === item} style={{ padding: '7px 13px', borderRadius: 5, border: '1px solid #d8cec6', background: device === item ? '#a22334' : '#fff', color: device === item ? '#fff' : '#615552', cursor: 'pointer' }}>
          {item === 'desktop' ? 'Desktop' : 'Mobile'}
        </button>)}
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto', padding: 12, border: '1px solid #e6ded5', borderRadius: 8, background: '#f2eee8' }}>
      <iframe title="HTML and CSS section live preview" srcDoc={previewDocument(html, css)}
        sandbox=""
        style={{ display: 'block', width: device === 'mobile' ? 390 : '100%', maxWidth: '100%', height: 420, border: '1px solid #e6ded5', background: '#fff' }} />
    </div>
  </div>;
});
