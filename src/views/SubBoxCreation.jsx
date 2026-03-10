import { useState } from 'react';
import {
  ChevronRight, Save, Calendar, Clock, Hash, FileText,
  CheckCircle, XCircle, Package, Printer, AlertCircle, Layers, X
} from 'lucide-react';

// ── Code 128B engine ──────────────────────────────────────────────────────────
const C128 = [
  '11011001100','11001101100','11001100110','10010011000','10010001100',
  '10001001100','10011001000','10011000100','10001100100','11001001000',
  '11001000100','11000100100','10110011100','10011011100','10011001110',
  '10111001100','10011101100','10011100110','11001110010','11001011100',
  '11001001110','11011100100','11001110100','11101101110','11101001100',
  '11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000',
  '10001000110','10110001000','10001101000','10001100010','11010001000',
  '11000101000','11000100010','10110111000','10110001110','10001101110',
  '10111011000','10111000110','10001110110','11101110110','11010001110',
  '11000101110','11011101000','11011100010','11011101110','11101011000',
  '11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100',
  '10010110000','10010000110','10000101100','10000100110','10110010000',
  '10110000100','10011010000','10011000010','10000110100','10000110010',
  '11000010010','11001010000','11110111010','11000010100','10001111010',
  '10100111100','10010111100','10010011110','10111100100','10011110100',
  '10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110',
  '10111101000','10111100010','11110101000','11110100010','10111011110',
  '10111101110','11101011110','11110101110','11010000100','11010010000',
  '11010011100','1100011101011',
];
function encode128(text) {
  let cs = 104, parts = [C128[104]];
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    if (v < 0 || v > 94) continue;
    cs += v * (i + 1);
    parts.push(C128[v]);
  }
  parts.push(C128[cs % 103], C128[106], '11');
  return parts.join('');
}
function BarcodeSVG({ value, width = 220, height = 52, fontSize = 8 }) {
  const bits = encode128(value);
  const mw   = width / bits.length;
  const barH = height - fontSize - 4;
  const rects = [];
  let x = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') rects.push(<rect key={i} x={x} y={0} width={mw} height={barH} fill="#000" />);
    x += mw;
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="white" />
      {rects}
      <text x={width/2} y={height-1} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">{value}</text>
    </svg>
  );
}
function barcodeBase64(value) {
  const W = 320, H = 80, fs = 10;
  const bits = encode128(value);
  const mw   = W / bits.length;
  const barH = H - fs - 4;
  let rects = '', x = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') rects += `<rect x="${x.toFixed(3)}" y="0" width="${mw.toFixed(3)}" height="${barH}" fill="#000"/>`;
    x += mw;
  }
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="white"/>${rects}` +
    `<text x="${W/2}" y="${H-1}" text-anchor="middle" font-size="${fs}" font-family="monospace" fill="#000">${value}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// Auto sub-box name: SB-YYYYMMDD-D/N-001
function generateSubBoxName(index, date, shift) {
  const d = date || new Date().toISOString().split('T')[0];
  const dateStr = d.replace(/-/g, '');
  const shiftCode = shift === 'Day' ? 'D' : 'N';
  const seq = String(index + 1).padStart(3, '0');
  return `SB-${dateStr}-${shiftCode}-${seq}`;
}

function openPrintWindow(boxes) {
  const labels = boxes.map(box => {
    const src = barcodeBase64(box.barcode);
    const good = box.output_type === 'Good/ QC Approved';
    return `
      <div class="label">
        <div class="label-title">Finished Good Sub-Box</div>
        <div class="box-name">${box.sub_box_name}</div>
        <span class="badge ${good ? 'badge-good' : 'badge-bad'}">${box.output_type}</span>
        <img class="bc" src="${src}" alt="${box.barcode}" />
        <div class="meta">
          <span>Date: <b>${box.production_date}</b></span>
          <span>Shift: <b>${box.shift}</b></span>
          <span>Qty: <b>${(box.quantity || 0).toLocaleString()}</b></span>
        </div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Sub-Box Labels</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#fff;}
  .page{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px;}
  .label{border:2px solid #1f2937;border-radius:8px;padding:14px 12px;
    display:flex;flex-direction:column;align-items:center;gap:6px;
    background:#fff;page-break-inside:avoid;}
  .label-title{font-size:8px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;}
  .box-name{font-size:13px;font-weight:700;color:#111827;text-align:center;}
  .badge{font-size:9px;font-weight:700;padding:2px 10px;border-radius:99px;}
  .badge-good{background:#dcfce7;color:#166534;}
  .badge-bad{background:#fee2e2;color:#991b1b;}
  .bc{width:100%;max-width:280px;height:auto;display:block;}
  .meta{width:100%;display:flex;justify-content:space-between;font-size:9px;
    color:#374151;border-top:1px solid #e5e7eb;padding-top:5px;}
  @media print{body{margin:0;}.page{padding:8px;gap:10px;}}
</style>
</head><body>
<div class="page">${labels}</div>
<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script>
</body></html>`;
  const w = window.open('', '_blank', 'width=960,height=700');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ── Bulk Print Modal — styled like inbound box creation ───────────────────────
const BulkPrintModal = ({ boxes, onDone }) => {
  const isGood = boxes[0]?.output_type === 'Good/ QC Approved';
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {boxes.length} Sub-Box{boxes.length > 1 ? 'es' : ''} Created Successfully!
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {boxes[0]?.sub_box_name?.split('-').slice(0,3).join('-')} — Print labels now or skip to print later from Sub-Box List
              </p>
            </div>
          </div>
          <button onClick={onDone} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Label grid */}
        <div className="overflow-y-auto flex-1 p-5 bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            {boxes.map((box, idx) => {
              const good = box.output_type === 'Good/ QC Approved';
              return (
                <div key={idx} className={`bg-white border-2 rounded-xl p-4 flex flex-col items-center gap-2 ${good ? 'border-gray-200' : 'border-red-200'}`}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finished Good Sub-Box</p>
                  <p className="text-base font-bold text-gray-900 text-center">{box.sub_box_name}</p>
                  <BarcodeSVG value={box.barcode} width={220} height={52} />
                  <div className="w-full flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2 mt-1">
                    <span><span className="text-gray-400">Type:</span> <span className={`font-semibold ${good ? 'text-emerald-700' : 'text-red-600'}`}>{good ? 'Good' : 'Wastage'}</span></span>
                    <span><span className="text-gray-400">Qty:</span> <b>{(box.quantity || 0).toLocaleString()}</b></span>
                    <span><span className="text-gray-400">Shift:</span> <b>{box.shift}</b></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center mb-3">Allow pop-ups if browser blocks the print window. Set paper to A4, no headers/footers.</p>
          <div className="flex gap-3">
            <button onClick={onDone}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
              Skip, Go to Box List
            </button>
            <button onClick={() => { openPrintWindow(boxes); onDone(); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
              <Printer className="w-4 h-4" />
              Print {boxes.length} Labels
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const SubBoxCreation = ({ onSave, onBack }) => {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    production_date: today,
    shift: 'Day',
    output_type: 'Good/ QC Approved',
    total_quantity: '',
    per_box_quantity: '',
    remarks: ''
  });
  const [errors, setErrors] = useState({});
  const [printBoxes, setPrintBoxes] = useState(null);

  const isGood    = formData.output_type === 'Good/ QC Approved';
  const totalQty  = parseInt(formData.total_quantity)   || 0;
  const perBoxQty = parseInt(formData.per_box_quantity) || 0;
  const numBoxes  = (totalQty > 0 && perBoxQty > 0) ? Math.ceil(totalQty / perBoxQty) : 0;
  const lastBoxQty = numBoxes > 0 ? totalQty - (numBoxes - 1) * perBoxQty : 0;
  // All boxes equal when last box qty == perBoxQty (evenly divisible)
  const allBoxesEqual = lastBoxQty === perBoxQty;
  const isReady   = totalQty > 0 && perBoxQty > 0 && formData.production_date && numBoxes > 0;

  const validateForm = () => {
    const errs = {};
    if (!formData.total_quantity || totalQty <= 0)
      errs.total_quantity = 'Total quantity must be greater than 0';
    if (!formData.per_box_quantity || perBoxQty <= 0)
      errs.per_box_quantity = 'Per box quantity must be greater than 0';
    if (perBoxQty > totalQty && totalQty > 0)
      errs.per_box_quantity = 'Per box quantity cannot exceed total quantity';
    if (!formData.production_date)
      errs.production_date = 'Production date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const timestamp = Date.now();
    const createdBoxes = Array.from({ length: numBoxes }, (_, i) => {
      const barcode = `SB-${timestamp + i}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const sub_box_name = generateSubBoxName(i, formData.production_date, formData.shift);
      const isLast = i === numBoxes - 1;
      const quantity = isLast ? lastBoxQty : perBoxQty;
      return {
        production_date: formData.production_date,
        shift: formData.shift,
        output_type: formData.output_type,
        quantity,
        remarks: formData.remarks,
        barcode,
        sub_box_name,
        box_name: sub_box_name,
        created_by: 'Production Staff',
        created_at: new Date().toISOString(),
        client_rejected_count: 0,
        challan_document: null,
      };
    });

    setPrintBoxes(createdBoxes);
  };

  const handlePrintDone = () => {
    printBoxes.forEach(box => onSave(box));
  };

  const previewNames = numBoxes > 0
    ? Array.from({ length: Math.min(numBoxes, 5) }, (_, i) =>
        generateSubBoxName(i, formData.production_date, formData.shift))
    : [];

  // Build the box-count description string — FIX: show numBoxes not (numBoxes-1)
  const boxCountDesc = numBoxes > 0
    ? allBoxesEqual
      ? `${numBoxes} box${numBoxes > 1 ? 'es' : ''} × ${perBoxQty.toLocaleString()} units`
      : `${numBoxes - 1} box${numBoxes > 2 ? 'es' : ''} × ${perBoxQty.toLocaleString()} units + 1 box × ${lastBoxQty.toLocaleString()} units (last box)`
    : '';

  return (
    <div className="space-y-5">
      {printBoxes && <BulkPrintModal boxes={printBoxes} onDone={handlePrintDone} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Record Production Output</h1>
          <p className="text-sm text-gray-400 mt-0.5">Create multiple finished-good sub-boxes with auto-generated names &amp; barcodes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">

            {/* Production Date & Shift */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Production Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Production Date <span className="text-red-400">*</span>
                  </label>
                  <input type="date" value={formData.production_date}
                    onChange={e => handleChange('production_date', e.target.value)} max={today}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                      errors.production_date ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                  {errors.production_date && <p className="mt-1 text-xs text-red-500">{errors.production_date}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Shift <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 h-[38px]">
                    <button type="button" onClick={() => handleChange('shift', 'Day')}
                      className={`text-sm font-semibold rounded-lg transition-colors ${
                        formData.shift === 'Day' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      ☀ Day
                    </button>
                    <button type="button" onClick={() => handleChange('shift', 'Night')}
                      className={`text-sm font-semibold rounded-lg transition-colors ${
                        formData.shift === 'Night' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      ☽ Night
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Output Type */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Output Type <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => handleChange('output_type', 'Good/ QC Approved')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    isGood ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}>
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isGood ? 'text-emerald-600' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isGood ? 'text-emerald-900' : 'text-gray-700'}`}>Good / QC Approved</p>
                    <p className="text-xs text-gray-400 mt-0.5">Quality-approved finished goods</p>
                  </div>
                </button>
                <button type="button" onClick={() => handleChange('output_type', 'Wastage')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    !isGood ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}>
                  <XCircle className={`w-5 h-5 flex-shrink-0 ${!isGood ? 'text-red-500' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${!isGood ? 'text-red-900' : 'text-gray-700'}`}>Wastage</p>
                    <p className="text-xs text-gray-400 mt-0.5">Rejected or damaged material</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantity Configuration */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Quantity Configuration <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Total Quantity (units) <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="1" value={formData.total_quantity}
                    onChange={e => handleChange('total_quantity', e.target.value)} placeholder="e.g. 10000"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                      errors.total_quantity ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                  {errors.total_quantity && <p className="mt-1 text-xs text-red-500">{errors.total_quantity}</p>}
                  <p className="mt-1 text-xs text-gray-400">Total units produced in this batch</p>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Package className="w-3.5 h-3.5" />
                    Per Box Quantity (units) <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="1" value={formData.per_box_quantity}
                    onChange={e => handleChange('per_box_quantity', e.target.value)} placeholder="e.g. 1000"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                      errors.per_box_quantity ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                  {errors.per_box_quantity && <p className="mt-1 text-xs text-red-500">{errors.per_box_quantity}</p>}
                  <p className="mt-1 text-xs text-gray-400">Units packed per individual sub-box</p>
                </div>
              </div>

              {numBoxes > 0 && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">
                        {numBoxes} Sub-Box{numBoxes > 1 ? 'es' : ''} will be created
                      </p>
                      <p className="text-xs text-blue-700 mt-1">{boxCountDesc}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="p-5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
                <FileText className="w-3.5 h-3.5" />
                Remarks <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea value={formData.remarks} onChange={e => handleChange('remarks', e.target.value)}
                rows={3} placeholder="Production notes, quality observations..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all" />
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Preview</p>

              <div className="flex flex-col items-center text-center mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 border-2 transition-all duration-300 ${
                  !isReady ? 'bg-gray-50 border-gray-200'
                    : isGood ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}>
                  {!isReady ? <Package className="w-7 h-7 text-gray-300" />
                    : isGood ? <CheckCircle className="w-7 h-7 text-emerald-500" />
                    : <XCircle className="w-7 h-7 text-red-400" />}
                </div>
                <span className={`text-sm font-bold transition-colors duration-300 ${
                  !isReady ? 'text-gray-400' : isGood ? 'text-emerald-800' : 'text-red-700'
                }`}>
                  {isReady ? (isGood ? 'Good / QC Approved' : 'Wastage') : 'Output Type'}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">{formData.shift} Shift</span>
              </div>

              <div className="space-y-2 pt-3 border-t border-gray-100">
                {[
                  ['Date',      formData.production_date || '—'],
                  ['Total Qty', totalQty > 0 ? `${totalQty.toLocaleString()} units` : '—'],
                  ['Per Box',   perBoxQty > 0 ? `${perBoxQty.toLocaleString()} units` : '—'],
                  ['Boxes',     numBoxes > 0 ? `${numBoxes} sub-boxes` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{k}</span>
                    <span className={`text-xs font-semibold ${k === 'Boxes' && numBoxes > 0 ? 'text-blue-700' : 'text-gray-800'}`}>{v}</span>
                  </div>
                ))}
              </div>

              {previewNames.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Auto-generated names preview:</p>
                  <div className="space-y-1">
                    {previewNames.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        <span className="text-xs font-mono text-gray-700">{name}</span>
                      </div>
                    ))}
                    {numBoxes > 5 && (
                      <p className="text-xs text-gray-400 pl-3.5">+{numBoxes - 5} more...</p>
                    )}
                  </div>
                </div>
              )}

              {!isReady && (
                <p className="mt-3 text-xs text-gray-400 text-center">Fill required fields to see preview</p>
              )}
            </div>

            {/* Actions — note moved inside button section above submit */}
            <div className="flex flex-col gap-2">
              {/* Info note — directly above button */}
              {/* <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    Sub-box names are auto-generated. Each box gets a unique barcode. To create a challan, use the <strong>Create Challan</strong> button from the Sub-Box List page.
                  </p>
                </div>
              </div> */}

              <button type="submit" disabled={!isReady}
                className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl shadow-sm transition-colors duration-300 ${
                  !isReady ? 'bg-gray-400 cursor-not-allowed'
                    : isGood ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}>
                <Save className="w-4 h-4" />
                {numBoxes > 0
                  ? `Create ${numBoxes} Sub-Box${numBoxes > 1 ? 'es' : ''} & Generate Barcodes`
                  : 'Create Sub-Boxes & Generate Barcodes'}
              </button>
              <button type="button" onClick={onBack}
                className="w-full py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubBoxCreation;