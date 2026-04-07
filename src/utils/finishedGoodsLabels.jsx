const CODE128_PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100', '1100011101011',
];

function encode128(text) {
  let checksum = 104;
  const parts = [CODE128_PATTERNS[104]];

  for (let i = 0; i < text.length; i += 1) {
    const value = text.charCodeAt(i) - 32;
    if (value < 0 || value > 94) continue;
    checksum += value * (i + 1);
    parts.push(CODE128_PATTERNS[value]);
  }

  parts.push(CODE128_PATTERNS[checksum % 103], CODE128_PATTERNS[106], '11');
  return parts.join('');
}

function barcodeBase64(value, width = 520, height = 110, fontSize = 13) {
  const bits = encode128(value);
  const moduleWidth = width / bits.length;
  const barHeight = height - fontSize - 4;
  let rects = '';
  let x = 0;

  for (let i = 0; i < bits.length; i += 1) {
    if (bits[i] === '1') {
      rects += `<rect x="${x.toFixed(3)}" y="0" width="${moduleWidth.toFixed(3)}" height="${barHeight}" fill="#000"/>`;
    }
    x += moduleWidth;
  }

  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`
    + `<rect width="${width}" height="${height}" fill="white"/>${rects}`
    + `<text x="${width / 2}" y="${height - 1}" text-anchor="middle" font-size="${fontSize}" font-family="monospace" fill="#000">${value}</text></svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function getRangeLabel(dateFrom, dateTo) {
  if (dateFrom && dateTo && dateFrom !== dateTo) return `${dateFrom} to ${dateTo}`;
  return dateTo || dateFrom || 'Date pending';
}

export function getFinishedGoodsContextLine(subBox) {
  const isGood = subBox.output_type === 'Good/ QC Approved';

  if (isGood) {
    const parts = ['QC Approved'];
    if (subBox.production_date) parts.push(subBox.production_date);
    if (subBox.shift) parts.push(subBox.shift);
    return parts.join(' | ');
  }

  const parts = ['Wastage'];
  if (subBox.lc_number) parts.push(subBox.lc_number);
  parts.push(getRangeLabel(subBox.date_from, subBox.date_to || subBox.production_date));
  return parts.join(' | ');
}

export function getFinishedGoodsDisplayName(subBox) {
  return subBox.sub_box_name || subBox.box_name || subBox.barcode || 'Unnamed Sub-Box';
}

export function openFinishedGoodsPrintWindow(subBoxes) {
  const labels = subBoxes.map((subBox) => {
    const src = barcodeBase64(subBox.barcode);

    return `
    <div class="label">
      <div class="top-row">
        <span class="label-title">Finished Goods Label</span>
        <span class="label-code">${subBox.output_type === 'Good/ QC Approved' ? (subBox.shift || 'QC') : (subBox.lc_number || 'WST')}</span>
      </div>
      <div class="box-name">${getFinishedGoodsDisplayName(subBox)}</div>
      <img class="bc" src="${src}" alt="${subBox.barcode}" />
      <div class="meta">
        <span><b>Context:</b> ${getFinishedGoodsContextLine(subBox)}</span>
        <span><b>Qty:</b> ${(subBox.quantity || 0).toLocaleString()}</span>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Finished Goods Labels</title>
<style>
  @page { size: 100mm 60mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #fff; }
  .label {
    width: 100mm; height: 60mm; padding: 3mm 4mm;
    display: flex; flex-direction: column; justify-content: space-between;
    page-break-after: always; background: #fff; overflow: hidden;
  }
  .label:last-child { page-break-after: avoid; }
  .top-row { display: flex; justify-content: space-between; align-items: center; }
  .label-title { font-size: 7pt; font-weight: 700; color: #6b7280; letter-spacing: 1.5px; text-transform: uppercase; }
  .label-code { font-size: 7pt; color: #9ca3af; }
  .box-name { font-size: 13pt; font-weight: 800; color: #111827; text-align: center; letter-spacing: 0.5px; }
  .bc { width: 100%; height: auto; display: block; max-height: 26mm; }
  .meta {
    display: flex; justify-content: space-between; gap: 3mm;
    font-size: 8pt; color: #374151; border-top: 0.5pt solid #e5e7eb; padding-top: 1.5mm;
  }
  .meta span:first-child { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  @media print { body { margin: 0; } }
</style>
</head><body>
${labels}
<script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;

  const printWindow = window.open('', '_blank', 'width=500,height=400');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
