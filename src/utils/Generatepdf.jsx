import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import megabuildLogo from '../assets/megabuild1.svg';

/* ═══════════════════════════════════════════════════════════════
   loadLogoBase64
   Converts the SVG logo to a base64 data-URL so it can be
   embedded inside an <iframe> document (which has no access
   to webpack-bundled assets by src path alone).
═══════════════════════════════════════════════════════════════ */
const loadLogoBase64 = async () => {
  try {
    const resp = await fetch(megabuildLogo);
    const blob = await resp.blob();
    return await new Promise(res => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

const getPublicUrl = (path) => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
    ? import.meta.env.BASE_URL
    : '/';
  const safeBase = base.endsWith('/') ? base : `${base}/`;
  const safePath = path.startsWith('/') ? path.slice(1) : path;
  return `${safeBase}${safePath}`;
};

/* ══════════════════════════════════════
   loadFontBase64
   Loads a font from /public and returns a data-URL so it can
   be embedded inside the iframe via @font-face.
══════════════════════════════════════ */
const loadFontBase64 = async (url) => {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise(res => {
      const r = new FileReader();
      r.onloadend = () => res(r.result);
      r.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

const buildFontsCss = ({ rubikNormal, rubikItalic }) => {
  if (!rubikNormal && !rubikItalic) return '';
  return `
    ${rubikNormal ? `
    @font-face {
      font-family: 'Rubik';
      src: url("${rubikNormal}") format('truetype');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }` : ''}
    ${rubikItalic ? `
    @font-face {
      font-family: 'Rubik';
      src: url("${rubikItalic}") format('truetype');
      font-weight: 100 900;
      font-style: italic;
      font-display: swap;
    }` : ''}
  `;
};

/* ═══════════════════════════════════════════════════════════════
   renderIframeToPDF
   Core engine: injects a full HTML document into a hidden
   <iframe> so the browser creates a proper RTL bidi layout
   context — fixing Arabic text rendering in html2canvas.

   @param {string} fullHtmlDoc   Complete <!DOCTYPE html> string
   @param {string} fileName      Output filename (without .pdf)
═══════════════════════════════════════════════════════════════ */
const renderIframeToPDF = async (fullHtmlDoc, fileName) => {
  let iframe;
  try {
    iframe = document.createElement('iframe');
    iframe.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:820px;height:1px;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    await new Promise(resolve => {
      iframe.onload = resolve;
      iframe.srcdoc = fullHtmlDoc;
    });

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Let fonts & layout finish painting
    if (iframeDoc.fonts && iframeDoc.fonts.load) {
      try {
        await Promise.all([
          iframeDoc.fonts.load('400 16px "Rubik"'),
          iframeDoc.fonts.load('700 16px "Rubik"'),
        ]);
      } catch {}
    }
    if (iframeDoc.fonts && iframeDoc.fonts.ready) {
      try {
        await iframeDoc.fonts.ready;
      } catch {}
    }
    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
      windowWidth: 820,
      scrollX: 0,
      scrollY: 0,
    });

    document.body.removeChild(iframe);
    iframe = null;

    const imgData  = canvas.toDataURL('image/png');
    const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pgW      = pdf.internal.pageSize.getWidth();
    const pgH      = pdf.internal.pageSize.getHeight();
    const imgW     = pgW - 20;
    const imgH     = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH;
    let position   = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgW, imgH);
    heightLeft -= pgH - 20;
    while (heightLeft >= 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgW, imgH);
      heightLeft -= pgH;
    }

    pdf.save(`${fileName}-${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  } catch (err) {
    if (iframe && document.body.contains(iframe)) document.body.removeChild(iframe);
    throw err;
  }
};

/* ═══════════════════════════════════════════════════════════════
   buildBrandedDoc
   Wraps any inner HTML content with the Mega Build branded
   header + footer, inside a full <!DOCTYPE html> document.

   @param {object} opts
     lang        'ar' | 'en'
     logoBase64  base64 data-URL of the logo image
     reportTitle string shown in the blue badge (top right)
     preparedBy  { name, email }  — shown in the info bar
     badgeRight  optional extra info shown right of prep bar
     bodyHtml    the main content HTML (table, totals, etc.)
═══════════════════════════════════════════════════════════════ */
const buildBrandedDoc = ({ lang, logoBase64, reportTitle, preparedBy, badgeRight, bodyHtml, fontsCss }) => {
  const isAr = lang === 'ar';
  const bodyDir = isAr ? 'rtl' : 'ltr';

  const logoTag = logoBase64
    ? `<img src="${logoBase64}" style="width:70px;height:70px;object-fit:contain;" />`
    : `<div style="width:70px;height:70px;background:#003764;border-radius:8px;"></div>`;

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const badgeRightHtml = badgeRight
    ? `<div style="text-align:right;unicode-bidi:plaintext;">
         <p style="font-size:10px;font-weight:700;color:#003764;text-transform:uppercase;letter-spacing:1px;margin:0 0 3px;">${badgeRight.label}</p>
         <p style="font-size:22px;font-weight:900;color:#003764;margin:0;">${badgeRight.value}</p>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8"/>
  <style>
    ${fontsCss || ''}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: ltr;
      background: #fff;
      width: 800px;
    }
    .report-body {
      direction: ${bodyDir};
      font-family: ${isAr ? "'Rubik', 'Tahoma', Arial, sans-serif" : "'Segoe UI', Tahoma, Arial, sans-serif"};
    }
    .report-body * {
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1, "curs" 1;
      text-rendering: optimizeLegibility;
      unicode-bidi: plaintext;
    }
    p { margin: 0; }
  </style>
</head>
<body>

<!-- ── HEADER ── -->
<div style="padding:24px 36px 18px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:flex-start;direction:ltr;">
  <div style="display:flex;flex-direction:column;align-items:flex-start;">
    ${logoTag}
    <p style="font-size:8px;color:#aaa;margin:3px 0 0;letter-spacing:0.8px;">We Build Value</p>
  </div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right;">
    <div style="display:flex;align-items:baseline;gap:7px;">
      <span style="font-size:26px;font-weight:900;color:#C41E3A;letter-spacing:2px;line-height:1;">MEGA</span>
      <span style="font-size:26px;font-weight:900;color:#003764;letter-spacing:2px;line-height:1;">BUILD</span>
    </div>
    <p style="font-size:10px;color:#999;font-style:italic;">We Build Value</p>
    <div style="display:flex;flex-direction:column;gap:2px;align-items:flex-end;margin-top:6px;">
      <p style="font-size:10.5px;color:#444;">23 RD Of July St, Suez – Suez P.O. Box: 43511</p>
      <p style="font-size:10.5px;color:#444;">C.R: 59034 &nbsp; T.C: 454-990-006</p>
      <p style="font-size:10.5px;color:#444;">Tel: 062 3456452 &nbsp; Mob: 01111696211</p>
      <p style="font-size:10.5px;color:#444;">Meegabuild@gmail.com</p>
      <p style="font-size:10.5px;color:#444;">www.Megbuild.com</p>
    </div>
    <div style="margin-top:8px;background:#003764;color:#fff;padding:5px 16px;border-radius:5px;display:inline-block;">
      <span style="font-size:13px;font-weight:800;letter-spacing:1px;unicode-bidi:plaintext;">${reportTitle}</span>
    </div>
    <p style="font-size:11px;color:#555;unicode-bidi:plaintext;">
      <strong style="color:#003764;">Date:</strong> ${dateStr}
    </p>
  </div>
</div>

<!-- ── RED DIVIDER ── -->
<div style="height:3px;background:#C41E3A;"></div>
<div style="height:1px;background:#eee;"></div>

<!-- ── INFO BAR ── -->
<div style="padding:14px 36px;background:#F0F4FA;border-bottom:1px solid #dde4f0;display:flex;justify-content:space-between;align-items:center;direction:ltr;">
  <div>
    <p style="font-size:10px;font-weight:700;color:#003764;text-transform:uppercase;letter-spacing:1px;margin:0 0 3px;">Prepared By</p>
    <p style="font-size:14px;font-weight:800;color:#1a1a2e;unicode-bidi:plaintext;">${preparedBy?.name || 'N/A'}</p>
    <p style="font-size:11px;color:#666;margin-top:2px;">${preparedBy?.email || ''}</p>
  </div>
  ${badgeRightHtml}
</div>

<!-- ── BODY CONTENT ── -->
<div class="report-body" style="padding:20px 36px;">
  ${bodyHtml}
</div>

<!-- ── FOOTER TEXT ── -->
<div style="padding:12px 36px;border-top:1px solid #eee;text-align:center;background:#fafafa;">
  <p style="font-size:11px;color:#888;">
    This is a computer-generated report — ${new Date().toLocaleString('en-US')}
  </p>
</div>

<!-- ── FOOTER BAR ── -->
<div style="display:flex;height:24px;">
  <div style="width:38%;background:#003764;"></div>
  <div style="width:2%;background:#fff;"></div>
  <div style="flex:1;background:#C41E3A;"></div>
</div>

</body>
</html>`;
};

/* ═══════════════════════════════════════════════════════════════
   buildTableHtml
   Generic helper to turn a rows/columns definition into a
   styled HTML table that fits the Mega Build branding.

   @param {object} opts
     lang        'ar' | 'en'
     columns     [{ key, label, align? }]  — table columns
     rows        array of data objects
     cellColor   optional fn(row, col) => CSS color string
     totalsHtml  optional HTML string appended after the table
═══════════════════════════════════════════════════════════════ */
export const buildTableHtml = ({ lang, columns, rows, cellColor, totalsHtml = '' }) => {
  const isAr = lang === 'ar';
  const defaultAlign = isAr ? 'right' : 'left';
  const cols = isAr ? [...columns].reverse() : columns;

  const headCells = cols.map(c =>
    `<th style="padding:10px 12px;font-size:11px;font-weight:700;color:#fff;text-align:${c.align || defaultAlign};letter-spacing:0.8px;">${c.label}</th>`
  ).join('');

  const bodyRows = rows.map((row, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    const cells = cols.map(c => {
      const val = row[c.key] ?? '-';
      const color = cellColor ? cellColor(row, c.key) : '#222';
      const align = c.align || defaultAlign;
      return `<td style="padding:10px 12px;font-size:12px;color:${color};text-align:${align};unicode-bidi:plaintext;">${val}</td>`;
    }).join('');
    return `<tr style="background:${bg};border-bottom:1px solid #e8e8e8;">${cells}</tr>`;
  }).join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead><tr style="background:#003764;">${headCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    ${totalsHtml}
  `;
};

/* ═══════════════════════════════════════════════════════════════
   buildTotalsHtml
   Renders the blue/bordered total badge used across reports.
═══════════════════════════════════════════════════════════════ */
export const buildTotalsHtml = ({ lang, label, value, valueColor }) => {
  const isAr = lang === 'ar';
  const color = valueColor || '#003764';
  return `
    <div style="display:flex;justify-content:${isAr ? 'flex-start' : 'flex-end'};margin-bottom:24px;">
      <div style="background:#003764;color:#fff;padding:9px 22px;font-weight:800;font-size:13px;border-radius:4px 0 0 4px;letter-spacing:1px;">${label}</div>
      <div style="border:2px solid #003764;padding:7px 22px;font-weight:900;font-size:18px;min-width:80px;text-align:center;color:${color};border-radius:0 4px 4px 0;">${value}</div>
    </div>
  `;
};

/* ═══════════════════════════════════════════════════════════════
   exportBrandedPDF  ← THE SINGLE FUNCTION ALL PAGES CALL
   
   @param {object} opts
     lang          'ar' | 'en'
     reportTitle   string  (e.g. 'تقرير تسوية المخزون')
     fileName      string  (e.g. 'stock-adjustment')
     preparedBy    { name, email }
     badgeRight    { label, value }  optional right-side badge
     columns       [{ key, label, align? }]
     rows          array of plain objects
     cellColor     optional fn(row, colKey) => CSS color
     totals        optional [{ label, value, valueColor }]
     toastMsg      optional { success, error }  for toast messages
═══════════════════════════════════════════════════════════════ */
export const exportBrandedPDF = async ({
  lang = 'en',
  reportTitle,
  fileName,
  preparedBy,
  badgeRight,
  columns,
  rows,
  cellColor,
  totals = [],
  toastMsg,
}) => {
  const isAr = lang === 'ar';
  try {
    const logoBase64 = await loadLogoBase64();
    const [rubikNormal, rubikItalic] = await Promise.all([
      loadFontBase64(getPublicUrl('assets/Rubik-VariableFont_wght.ttf')),
      loadFontBase64(getPublicUrl('assets/Rubik-Italic-VariableFont_wght.ttf')),
    ]);
    const fontsCss = buildFontsCss({ rubikNormal, rubikItalic });

    const totalsHtml = totals.map(t => buildTotalsHtml({ lang, ...t })).join('');
    const bodyHtml   = buildTableHtml({ lang, columns, rows, cellColor, totalsHtml });

    const fullDoc = buildBrandedDoc({
      lang,
      logoBase64,
      reportTitle,
      preparedBy,
      badgeRight,
      bodyHtml,
      fontsCss,
    });

    await renderIframeToPDF(fullDoc, fileName);
    toast.success(toastMsg?.success || (isAr ? 'تم تحميل الـ PDF' : 'PDF downloaded'));
  } catch (err) {
    console.error('exportBrandedPDF error:', err);
    toast.error(toastMsg?.error || (isAr ? 'خطأ في إنشاء الـ PDF' : 'Error generating PDF'));
  }
};

/* ═══════════════════════════════════════════════════════════════
   exportBrandedPDFCustomBody
   Same as exportBrandedPDF but accepts raw bodyHtml string
   instead of columns/rows — for complex custom layouts.
═══════════════════════════════════════════════════════════════ */
export const exportBrandedPDFCustomBody = async ({
  lang = 'en',
  reportTitle,
  fileName,
  preparedBy,
  badgeRight,
  bodyHtml,
  toastMsg,
}) => {
  const isAr = lang === 'ar';
  try {
    const logoBase64 = await loadLogoBase64();
    const [rubikNormal, rubikItalic] = await Promise.all([
      loadFontBase64(getPublicUrl('assets/Rubik-VariableFont_wght.ttf')),
      loadFontBase64(getPublicUrl('assets/Rubik-Italic-VariableFont_wght.ttf')),
    ]);
    const fontsCss = buildFontsCss({ rubikNormal, rubikItalic });
    const fullDoc = buildBrandedDoc({ lang, logoBase64, reportTitle, preparedBy, badgeRight, bodyHtml, fontsCss });
    await renderIframeToPDF(fullDoc, fileName);
    toast.success(toastMsg?.success || (isAr ? 'تم تحميل الـ PDF' : 'PDF downloaded'));
  } catch (err) {
    console.error('exportBrandedPDFCustomBody error:', err);
    toast.error(toastMsg?.error || (isAr ? 'خطأ في إنشاء الـ PDF' : 'Error generating PDF'));
  }
};
