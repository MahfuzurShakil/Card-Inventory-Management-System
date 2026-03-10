import { useState } from 'react';
import { ChevronRight, Save, AlertTriangle, Printer, X, CheckCircle, Package, ChevronDown } from 'lucide-react';

// ── Code 128B barcode engine ──────────────────────────────────────────────────
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
function barcodeBase64(value) {
  const W = 320, H = 80, fs = 10;
  const bits = encode128(value);
  const mw = W / bits.length, barH = H - fs - 4;
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
function BarcodeSVG({ value, width = 280, height = 64, fontSize = 10 }) {
  const bits = encode128(value);
  const mw = width / bits.length, barH = height - fontSize - 4;
  const rects = [];
  let x = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') rects.push({ x, w: mw });
    x += mw;
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="white" />
      {rects.map((r, i) => <rect key={i} x={r.x} y={0} width={r.w} height={barH} fill="#000" />)}
      <text x={width/2} y={height-1} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">{value}</text>
    </svg>
  );
}
function openPrintWindow(boxList, shipmentNumber) {
  const labels = boxList.map(box => {
    const src = barcodeBase64(box.barcode);
    return `
      <div class="label">
        <div class="label-title">Material Box Label</div>
        <div class="box-name">${box.box_name}</div>
        <img class="bc" src="${src}" alt="${box.barcode}" />
        <div class="meta">
          <span>Item: <b>${box.item_name || ''}</b></span>
          <span>Qty: <b>${(box.quantity || 0).toLocaleString()}</b></span>
        </div>
        <div class="ship">Shipment: ${shipmentNumber}</div>
      </div>`;
  }).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Barcode Labels — ${shipmentNumber}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;background:#fff;}
.page{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px;}
.label{border:2px solid #1f2937;border-radius:8px;padding:14px 12px;display:flex;flex-direction:column;align-items:center;gap:6px;background:#fff;page-break-inside:avoid;}
.label-title{font-size:8px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;}
.box-name{font-size:15px;font-weight:700;color:#111827;text-align:center;}
.bc{width:100%;max-width:300px;height:auto;display:block;}
.meta{width:100%;display:flex;justify-content:space-between;font-size:10px;color:#374151;border-top:1px solid #e5e7eb;padding-top:6px;}
.ship{font-size:9px;color:#9ca3af;}
@media print{body{margin:0;}.page{padding:8px;gap:10px;}}
</style></head><body>
<div class="page">${labels}</div>
<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script>
</body></html>`;
  const w = window.open('', '_blank', 'width=960,height=720');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ── Print Modal ───────────────────────────────────────────────────────────────
const BarcodePrintModal = ({ boxes, shipmentNumber, onPrint, onDone }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">{boxes.length} Box Barcodes Ready!</h2>
          </div>
          <p className="text-sm text-gray-500">{shipmentNumber} — Print labels now or skip to view boxes in Material Boxes</p>
        </div>
        {/* X closes modal and navigates away */}
        <button onClick={onDone} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-6 bg-gray-100">
        <div className="grid grid-cols-2 gap-4">
          {boxes.map((box, idx) => (
            <div key={idx} className="bg-white border-2 border-gray-800 rounded-lg p-4 flex flex-col items-center gap-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Material Box Label</p>
              <p className="text-base font-bold text-gray-900 text-center">{box.box_name}</p>
              <BarcodeSVG value={box.barcode} width={260} height={64} />
              <div className="w-full flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                <span><span className="font-semibold">Item:</span> {box.item_name}</span>
                <span><span className="font-semibold">Qty:</span> {(box.quantity || 0).toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400 w-full text-center">Shipment: {shipmentNumber}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-between flex-shrink-0">
        <p className="text-xs text-gray-400">Allow pop-ups if browser blocks the print window. Set paper A4, no headers/footers.</p>
        <div className="flex items-center gap-3">
          {/* Both buttons call onDone to close + navigate */}
          <button
            onClick={onDone}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium transition-colors"
          >
            Skip — Go to Box List
          </button>
          <button
            onClick={() => { openPrintWindow(boxes, shipmentNumber); onDone(); }}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print {boxes.length} Labels
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const itemBadgeCls = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('chip'))  return 'bg-blue-100 text-blue-800';
  if (t.includes('tape'))  return 'bg-purple-100 text-purple-800';
  if (t.includes('sheet')) return 'bg-emerald-100 text-emerald-800';
  return 'bg-gray-100 text-gray-700';
};

// ── Main Component ────────────────────────────────────────────────────────────
const InboundReceiving = ({ material, lc, onSave, onBack }) => {
  const shipmentItems = material?.stepData?.warehouse?.items || [];

  // Build per-box production-missing state (separate from proc missing stored on box)
  const [boxStates, setBoxStates] = useState(() => {
    const state = {};
    shipmentItems.forEach((item, itemIdx) => {
      (item.boxes || []).forEach((box, boxIdx) => {
        // production_missing is what the store manager enters — starts at 0
        state[`${itemIdx}-${boxIdx}`] = { missing_qty: 0, remarks: '' };
      });
    });
    return state;
  });

  const [expandedItems, setExpandedItems] = useState({});
  const [errors, setErrors] = useState({});
  const [printPreviewBoxes, setPrintPreviewBoxes] = useState(null);

  const toggleItem = (idx) => setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));

  const updateBoxMissing = (itemIdx, boxIdx, value) => {
    const key = `${itemIdx}-${boxIdx}`;
    const box = shipmentItems[itemIdx]?.boxes?.[boxIdx];
    const maxMissing = box?.quantity || 0;
    const val = Math.min(Math.max(parseInt(value || 0), 0), maxMissing);
    setBoxStates(prev => ({ ...prev, [key]: { ...prev[key], missing_qty: val } }));
    setErrors(prev => { const e = {...prev}; delete e[key]; return e; });
  };

  const updateBoxRemarks = (itemIdx, boxIdx, value) => {
    const key = `${itemIdx}-${boxIdx}`;
    setBoxStates(prev => ({ ...prev, [key]: { ...prev[key], remarks: value } }));
  };

  const validateForm = () => {
    const errs = {};
    shipmentItems.forEach((item, itemIdx) => {
      (item.boxes || []).forEach((box, boxIdx) => {
        const key = `${itemIdx}-${boxIdx}`;
        const s = boxStates[key] || {};
        if ((s.missing_qty || 0) > (box.quantity || 0)) errs[key] = 'Exceeds box quantity';
      });
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Build the final box list with barcodes — this is what gets saved to App state
  // Shape matches what App.jsx handleSaveInboundMaterial expects via item_verifications
  const buildFinalData = () => {
    // Build boxes list for barcode print modal
    const finalBoxes = [];
    // Build item_verifications for App.jsx compatibility
    const itemVerifications = shipmentItems.map((item, itemIdx) => {
      const boxes = item.boxes || [];
      const itemMissing = boxes.reduce((s, _, bi) => s + ((boxStates[`${itemIdx}-${bi}`]?.missing_qty) || 0), 0);
      const expectedQty = parseInt(item.quantity) || 0;
      const finalQty = expectedQty - itemMissing;

      boxes.forEach((box, boxIdx) => {
        const key = `${itemIdx}-${boxIdx}`;
        const s = boxStates[key] || {};
        const missing = s.missing_qty || 0;
        finalBoxes.push({
          box_name:  box.box_name,
          item_name: item.item_type || item.item_name,
          item_type: item.item_type || item.item_name,
          quantity:  (box.quantity || 0) - missing,
          missing_qty: missing,
          remarks:   s.remarks || '',
          barcode:   box.barcode || `BC-${Date.now()}-${itemIdx}-${boxIdx}`,
        });
      });

      return {
        serial:              item.serial || String(itemIdx + 1),
        item_type:           item.item_type || item.item_name,
        expected_quantity:   expectedQty,
        procurement_missing: parseInt(item.missing_quantity) || 0,
        warehouse_missing:   itemMissing,
        final_quantity:      finalQty,
        no_of_boxes:         parseInt(item.no_of_boxes) || 0,
        quantity_per_box:    parseInt(item.quantity_per_box) || 0,
        remarks:             '',
      };
    });

    return { finalBoxes, itemVerifications };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const { finalBoxes } = buildFinalData();
    setPrintPreviewBoxes(finalBoxes);
  };

  // Called by both Skip and Print buttons inside the modal — saves data then navigates
  const handleDone = () => {
    const { finalBoxes, itemVerifications } = buildFinalData();
    // Close modal first
    setPrintPreviewBoxes(null);
    // Then save — App.jsx will navigate away to box-list
    onSave({
      material_id:        material.id,
      received_by:        'Warehouse Staff',
      received_at:        new Date().toISOString(),
      item_verifications: itemVerifications,   // App.jsx uses this to create boxes
      auto_create_boxes:  true,
    });
  };

  // ── Totals ──
  const totalBoxes      = shipmentItems.reduce((s, i) => s + (i.boxes?.length || parseInt(i.no_of_boxes) || 0), 0);
  const totalQty        = shipmentItems.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
  const totalMissing    = Object.values(boxStates).reduce((s, b) => s + (b.missing_qty || 0), 0);
  const totalProcMissing = shipmentItems.reduce((s, i) =>
    s + (i.boxes || []).reduce((bs, b) => bs + (b.missing_qty || 0), 0), 0);
  const totalFinal      = Math.max(0, totalQty - totalProcMissing - totalMissing);

  if (shipmentItems.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Receive Inbound Materials</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 mb-1">No Warehouse Data Found</p>
            <p className="text-sm text-red-700 mb-4">This shipment does not have warehouse step data. Please complete Step 6 first.</p>
            <button onClick={onBack} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Print modal — onDone saves data and navigates */}
      {printPreviewBoxes && (
        <BarcodePrintModal
          boxes={printPreviewBoxes}
          shipmentNumber={material.shipment_number}
          onDone={handleDone}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Receive Inbound Materials</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Review quantities and generate box barcodes
          </p>
        </div>
      </div>

      {/* Info banner */}
      {/* <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Store Manager:</span> Box quantities are locked. You can only update the{' '}
          <span className="font-semibold">missing quantity</span> per box before generating barcodes.
        </p>
      </div> */}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: Item accordions (2/3) ── */}
          <div className="lg:col-span-2 space-y-4">
            {shipmentItems.map((item, itemIdx) => {
              const boxes = item.boxes || [];
              const isExpanded = expandedItems[itemIdx];
              const itemQty = parseInt(item.quantity) || 0;
              const noBoxes = boxes.length || parseInt(item.no_of_boxes) || 0;
              // Production missing = what store manager enters in this page
              const itemMissing = boxes.reduce((s, _, bi) =>
                s + ((boxStates[`${itemIdx}-${bi}`]?.missing_qty) || 0), 0);
              // Proc missing/extra = from warehouse step, stored on each box
              const itemProcMissing = boxes.reduce((s, b) => s + (b.missing_qty || 0), 0);
              const itemExtra       = boxes.reduce((s, b) => s + (b.extra_qty || 0), 0);

              return (
                <div key={itemIdx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Item header */}
                  <div
                    className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'border-b border-gray-100' : ''}`}
                    onClick={() => toggleItem(itemIdx)}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${itemBadgeCls(item.item_type)}`}>
                        {item.item_type || item.item_name}
                      </span>
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{itemQty.toLocaleString()}</span> units ·{' '}
                        <span className="font-semibold text-blue-700">{noBoxes}</span> boxes
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {itemMissing > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                          <AlertTriangle className="w-3 h-3" /> {itemMissing} production missing
                        </span>
                      )}
                      {itemProcMissing > 0 && (
                        <span className="text-xs font-semibold text-red-600">{itemProcMissing.toLocaleString()} missing</span>
                      )}
                      {itemExtra > 0 && (
                        <span className="text-xs font-semibold text-blue-600">{itemExtra.toLocaleString()} extra</span>
                      )}
                      <span className="text-xs text-gray-400">{isExpanded ? 'Collapse' : 'Expand'}</span>
                    </div>
                  </div>

                  {/* Box table with scroll */}
                  {isExpanded && (
                    boxes.length > 0 ? (
                      <div className="overflow-x-auto">
                        <div className="max-h-72 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                              <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Box Name</th>
                                <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">Box Qty <span className="text-gray-300 normal-case font-normal">(locked)</span></th>
                                <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">Proc Missing / Extra <span className="text-gray-300 normal-case font-normal">(locked)</span></th>
                                <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">Production Missing</th>
                                <th className="px-5 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">Final Qty</th>
                                <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {boxes.map((box, boxIdx) => {
                                const key = `${itemIdx}-${boxIdx}`;
                                const s = boxStates[key] || { missing_qty: 0 };
                                const missing = s.missing_qty || 0;
                                const finalQty = (box.quantity || 0) - missing;
                                const isShort = missing > 0;

                                const procMissing = box.missing_qty || 0;
                                const procExtra   = box.extra_qty   || 0;
                                // For final qty: extra adds back, missing subtracts
                                const totalMissingForBox = procMissing - procExtra + missing;
                                return (
                                  <tr key={boxIdx} className={`transition-colors ${isShort ? 'bg-orange-50/40' : 'hover:bg-gray-50/40'}`}>
                                    <td className="px-5 py-3 font-mono text-sm text-gray-700">{box.box_name}</td>
                                    {/* Box Qty — locked */}
                                    <td className="px-5 py-3 text-center">
                                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm font-semibold cursor-not-allowed select-none">
                                        {(box.quantity || 0).toLocaleString()}
                                      </span>
                                    </td>
                                    {/* Proc Missing / Extra — locked, from warehouse step */}
                                    <td className="px-5 py-3 text-center">
                                      {(procMissing > 0 || procExtra > 0) ? (
                                        <div className="flex items-center justify-center gap-1 flex-wrap">
                                          {procMissing > 0 && (
                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-semibold cursor-not-allowed select-none">
                                              −{procMissing.toLocaleString()}
                                            </span>
                                          )}
                                          {procExtra > 0 && (
                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold cursor-not-allowed select-none">
                                              +{procExtra.toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed select-none">—</span>
                                      )}
                                    </td>
                                    {/* Production Missing — editable by store manager */}
                                    <td className="px-5 py-3 text-center">
                                      <input
                                        type="number" min="0" max={box.quantity || 0}
                                        value={s.missing_qty}
                                        onChange={e => updateBoxMissing(itemIdx, boxIdx, e.target.value)}
                                        placeholder="0"
                                        className={`w-24 px-3 py-1.5 text-center text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                          errors[key] ? 'border-red-300 bg-red-50'
                                          : isShort   ? 'border-orange-300 bg-orange-50'
                                          : 'border-gray-200 bg-gray-50 focus:bg-white'
                                        }`}
                                      />
                                      {errors[key] && <p className="mt-1 text-xs text-red-500">{errors[key]}</p>}
                                    </td>
                                    {/* Final Qty = box qty - proc missing - production missing */}
                                    <td className="px-5 py-3 text-center">
                                      <span className={`text-base font-bold ${totalMissingForBox > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                                        {Math.max(0, (box.quantity || 0) - totalMissingForBox).toLocaleString()}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3">
                                      <input
                                        type="text" value={s.remarks || ''}
                                        onChange={e => updateBoxRemarks(itemIdx, boxIdx, e.target.value)}
                                        placeholder="Optional notes..."
                                        className="w-full min-w-[140px] px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      /* Fallback when warehouse step didn't generate boxes — show item-level input */
                      <div className="px-5 py-4">
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          No individual boxes found for this item. Boxes will be auto-created on confirm.
                        </p>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* ── RIGHT: Summary + action (1/3) ── */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Receipt Summary</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">Shipment</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{material.shipment_number}</span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">Dispatched</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Items</span>
                  <span className="font-semibold text-gray-900">{shipmentItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Boxes</span>
                  <span className="font-bold text-blue-700">{totalBoxes}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                  <span className="text-gray-500">Expected Qty</span>
                  <span className="font-semibold text-gray-800">{totalQty.toLocaleString()}</span>
                </div>
                {totalProcMissing > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">Proc. Missing</span>
                    <span className="font-semibold text-red-700">−{totalProcMissing.toLocaleString()}</span>
                  </div>
                )}
                {totalMissing > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">Production Missing</span>
                    <span className="font-semibold text-orange-700">−{totalMissing.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-gray-100 pt-3">
                  <span className="font-semibold text-gray-700">Final Qty</span>
                  <span className={`text-lg font-bold ${(totalProcMissing + totalMissing) > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                    {Math.max(0, totalQty - totalProcMissing - totalMissing).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-800 leading-relaxed">
                <span className="font-semibold">Note:</span> Boxes were created at the warehouse transfer step.
                Enter missing quantity per box if items were short on arrival.
                Barcodes will be generated and boxes added to Material Boxes on confirmation.
              </p>
            </div> */}

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
              >
                <Package className="w-4 h-4" />
                Confirm &amp; Generate Barcodes
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default InboundReceiving;