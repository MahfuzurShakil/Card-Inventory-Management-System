import { useState } from 'react';
import {
  Package, ChevronRight, ChevronDown, CheckCircle, CheckSquare, Square,
  Printer, AlertTriangle, SkipForward
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// CODE 128 BARCODE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
const CODE128_B = [
  ' ','!','"','#','$','%','&',"'",'(',')','*','+',',','-','.','/','0','1','2','3',
  '4','5','6','7','8','9',':',';','<','=','>','?','@','A','B','C','D','E','F','G',
  'H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','[',
  '\\',']','^','_','`','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o',
  'p','q','r','s','t','u','v','w','x','y','z','{','|','}','~','\x7f'
];
const ENCODE_TABLE = [
  '11011001100','11001101100','11001100110','10010011000','10010001100','10001001100',
  '10011001000','10011000100','10001100100','11001001000','11001000100','11000100100',
  '10110011100','10011011100','10011001110','10111001100','10011101100','10011100110',
  '11001110010','11001011100','11001001110','11011100100','11001110100','11101101110',
  '11101001100','11100101100','11100100110','11101100100','11100110100','11100110010',
  '11011011000','11011000110','11000110110','10100011000','10001011000','10001000110',
  '10110001000','10001101000','10001100010','11010001000','11000101000','11000100010',
  '10110111000','10110001110','10001101110','10111011000','10111000110','10001110110',
  '11101110110','11010001110','11000101110','11011101000','11011100010','11011101110',
  '11101011000','11101000110','11100010110','11101101000','11101100010','11100011010',
  '11101111010','11001000010','11110001010','10100110000','10100001100','10010110000',
  '10010000110','10000101100','10000100110','10110010000','10110000100','10011010000',
  '10011000010','10000110100','10000110010','11000010010','11001010000','11110111010',
  '11000010100','10001111010','10100111100','10010111100','10010011110','10111100100',
  '10011110100','10011110010','11110100100','11110010100','11110010010','11011011110',
  '11011110110','11110110110','10101111000','10100011110','10001011110','10111101000',
  '10111100010','11110101000','11110100010','10111011110','10111101110','11101011110',
  '11110101110','11010000100','11010010000','11010011100','11000111010','11'
];
const START_B = '11010010000';
const STOP    = '11000111010';

function encode128(value) {
  const chars = value.split('');
  let checksum = 104, encoded = START_B;
  chars.forEach((ch, i) => {
    const idx = CODE128_B.indexOf(ch);
    if (idx < 0) return;
    checksum += (i + 1) * idx;
    encoded  += ENCODE_TABLE[idx] || '';
  });
  encoded += (ENCODE_TABLE[checksum % 103] || '') + STOP + '11';
  return encoded;
}

function BarcodeSVG({ value, width = 340, height = 52, fontSize = 10 }) {
  const bits  = encode128(value);
  const mw    = width / bits.length;
  const barH  = height - fontSize - 2;
  const merged = [];
  let cur = null;
  for (let i = 0; i <= bits.length; i++) {
    const on = i < bits.length && bits[i] === '1';
    if (on && !cur) cur = { x: i * mw, w: mw };
    else if (on && cur) cur.w += mw;
    else if (!on && cur) { merged.push(cur); cur = null; }
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="white" />
      {merged.map((r, i) => <rect key={i} x={r.x} y={0} width={r.w} height={barH} fill="#000" />)}
      <text x={width/2} y={height-1} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">{value}</text>
    </svg>
  );
}

function barcodeBase64(value, W = 520, H = 110, fs = 13) {
  const bits = encode128(value);
  const mw = W / bits.length, barH = H - fs - 4;
  let rects = '', x = 0, inBar = false, barX = 0;
  for (let i = 0; i <= bits.length; i++) {
    const on = i < bits.length && bits[i] === '1';
    if (on && !inBar) { barX = x; inBar = true; }
    if (!on && inBar) { rects += `<rect x="${barX.toFixed(3)}" y="0" width="${(x-barX).toFixed(3)}" height="${barH}" fill="#000"/>`; inBar = false; }
    x += mw;
  }
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="white"/>${rects}` +
    `<text x="${W/2}" y="${H-1}" text-anchor="middle" font-size="${fs}" font-family="monospace" fill="#000">${value}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

function openPrintWindow(boxList, shipmentNumber) {
  const labels = boxList.map(box => {
    const src = barcodeBase64(box.barcode);
    return `
    <div class="label">
      <div class="top-row">
        <span class="label-title">Material Box Label</span>
        <span class="shipment">${shipmentNumber}</span>
      </div>
      <div class="box-name">${box.box_name}</div>
      <img class="bc" src="${src}" alt="${box.barcode}" />
      <div class="meta">
        <span><b>Item:</b> ${box.item_name || ''}</span>
        <span><b>Qty:</b> ${(box.quantity || 0).toLocaleString()}</span>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Labels — ${shipmentNumber}</title>
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
  .shipment { font-size: 7pt; color: #9ca3af; }
  .box-name { font-size: 13pt; font-weight: 800; color: #111827; text-align: center; letter-spacing: 0.5px; }
  .bc { width: 100%; height: auto; display: block; max-height: 26mm; }
  .meta { display: flex; justify-content: space-between; font-size: 8pt; color: #374151; border-top: 0.5pt solid #e5e7eb; padding-top: 1.5mm; }
</style>
</head><body>
${labels}
<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
</body></html>`;

  const w = window.open('', '_blank', 'width=500,height=400');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BARCODE SUCCESS MODAL — shown AFTER boxes are already saved
// Header: "X boxes received successfully. Barcodes generated."
// Footer: "Do you want to print the barcodes now?" + Skip/Later + Print Now
// Clicking Skip/Later closes modal and stays on receiving page.
// ═══════════════════════════════════════════════════════════════════════════════
const BarcodeSuccessModal = ({ boxes, shipmentNumber, onSkip }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">
              {boxes.length} box{boxes.length !== 1 ? 'es' : ''} received successfully
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Barcodes generated · Shipment <span className="font-semibold">{shipmentNumber}</span>
          </p>
        </div>
      </div>

      {/* Label preview — vertical list matching ZD230 roll output */}
      <div className="overflow-y-auto flex-1 p-6 bg-gray-100 space-y-4">
        {boxes.map((box, i) => (
          <div
            key={i}
            /* Use full width of column at ~480px preview width */
            className="bg-white border border-gray-300 rounded-md shadow-sm mx-auto"
            style={{
              width: '100%',
              maxWidth: 420,
              aspectRatio: '100 / 60',
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            {/* Top row */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-bold uppercase tracking-widest" style={{ fontSize: 8 }}>
                Material Box Label
              </span>
              <span className="text-gray-300" style={{ fontSize: 8 }}>{shipmentNumber}</span>
            </div>

            {/* Box name */}
            <p className="text-center font-extrabold text-gray-900 tracking-wide" style={{ fontSize: 15 }}>
              {box.box_name}
            </p>

            {/* Barcode */}
            <div className="flex justify-center">
              <BarcodeSVG value={box.barcode} width={340} height={52} fontSize={10} />
            </div>

            {/* Meta row */}
            <div
              className="flex justify-between text-gray-600 border-t border-gray-100 pt-1"
              style={{ fontSize: 9 }}
            >
              <span><b>Item:</b> {box.item_name}</span>
              <span><b>Qty:</b> {(box.quantity || 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer — print prompt */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-between flex-shrink-0">
        <p className="text-sm font-medium text-gray-700">
          Do you want to print the barcodes now?
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium transition-colors text-sm"
          >
            <SkipForward className="w-4 h-4" />
            Skip / Later
          </button>
          <button
            onClick={() => { openPrintWindow(boxes, shipmentNumber); onSkip(); }}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
          >
            <Printer className="w-4 h-4" />
            Print Barcodes Now
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

  // Per-box state: missing_qty, prod_extra_qty, remarks
  const [boxStates, setBoxStates] = useState(() => {
    const state = {};
    shipmentItems.forEach((item, itemIdx) => {
      (item.boxes || []).forEach((_, boxIdx) => {
        state[`${itemIdx}-${boxIdx}`] = { missing_qty: 0, prod_extra_qty: 0, remarks: '' };
      });
    });
    return state;
  });

  const [receivedBoxKeys, setReceivedBoxKeys] = useState(() => {
    const existing = {};
    if (material?.received_box_keys) {
      Object.keys(material.received_box_keys).forEach(k => { existing[k] = true; });
    }
    return existing;
  });

  const [selectedKeys,  setSelectedKeys]  = useState({});
  const [expandedItems, setExpandedItems] = useState(() => {
    const init = {};
    shipmentItems.forEach((_, idx) => { if (idx === 0) init[idx] = true; });
    return init;
  });
  const [errors,            setErrors]            = useState({});
  // barcodeModalBoxes is set AFTER boxes are already saved — modal is print-only
  const [barcodeModalBoxes, setBarcodeModalBoxes] = useState(null);

  const toggleItem = (idx) =>
    setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));

  const updateBoxMissing = (itemIdx, boxIdx, value) => {
    const key = `${itemIdx}-${boxIdx}`;
    const box = shipmentItems[itemIdx]?.boxes?.[boxIdx];
    const val = Math.min(Math.max(parseInt(value || 0), 0), box?.quantity || 0);
    setBoxStates(prev => ({ ...prev, [key]: { ...prev[key], missing_qty: val } }));
    setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
  };

  const updateBoxProdExtra = (itemIdx, boxIdx, value) => {
    const key = `${itemIdx}-${boxIdx}`;
    const val = Math.max(parseInt(value || 0), 0);
    setBoxStates(prev => ({ ...prev, [key]: { ...prev[key], prod_extra_qty: val } }));
  };

  const updateBoxRemarks = (itemIdx, boxIdx, value) => {
    const key = `${itemIdx}-${boxIdx}`;
    setBoxStates(prev => ({ ...prev, [key]: { ...prev[key], remarks: value } }));
  };

  const toggleBoxSelect = (itemIdx, boxIdx) => {
    const key = `${itemIdx}-${boxIdx}`;
    if (receivedBoxKeys[key]) return;
    setSelectedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelectAllItem = (itemIdx, boxes) => {
    const unreceivedKeys = boxes
      .map((_, bi) => `${itemIdx}-${bi}`)
      .filter(k => !receivedBoxKeys[k]);
    const allSelected = unreceivedKeys.every(k => selectedKeys[k]);
    setSelectedKeys(prev => {
      const next = { ...prev };
      unreceivedKeys.forEach(k => { next[k] = !allSelected; });
      return next;
    });
  };

  const validateSelected = () => {
    const errs = {};
    Object.keys(selectedKeys).forEach(key => {
      if (!selectedKeys[key]) return;
      const [itemIdx, boxIdx] = key.split('-').map(Number);
      const box = shipmentItems[itemIdx]?.boxes?.[boxIdx];
      const s = boxStates[key] || {};
      if ((s.missing_qty || 0) > (box?.quantity || 0)) errs[key] = 'Exceeds box quantity';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildSelectedBoxData = () => {
    const result = [];
    Object.keys(selectedKeys).forEach(key => {
      if (!selectedKeys[key]) return;
      const [itemIdx, boxIdx] = key.split('-').map(Number);
      const item = shipmentItems[itemIdx];
      const box  = item?.boxes?.[boxIdx];
      if (!box) return;
      const s = boxStates[key] || {};
      const missing   = s.missing_qty    || 0;
      const prodExtra = s.prod_extra_qty || 0;
      result.push({
        key,
        box_name:       box.box_name,
        item_name:      item.item_type || item.item_name,
        item_type:      item.item_type || item.item_name,
        quantity:       (box.quantity || 0) - missing,
        missing_qty:    missing,
        prod_extra_qty: prodExtra,
        remarks:        s.remarks || '',
        barcode:        box.barcode || `BC-${Date.now()}-${itemIdx}-${boxIdx}`,
      });
    });
    return result;
  };

  // ── NEW CONFIRM FLOW ─────────────────────────────────────────────────────
  // 1. Validate → 2. Save boxes to App state immediately → 3. Show print modal
  const handleConfirmBatch = (e) => {
    e.preventDefault();
    if (!validateSelected()) return;
    const batchBoxes = buildSelectedBoxData();
    if (batchBoxes.length === 0) return;

    const newReceivedKeys = { ...receivedBoxKeys };
    batchBoxes.forEach(b => { newReceivedKeys[b.key] = true; });
    setReceivedBoxKeys(newReceivedKeys);
    setSelectedKeys({});

    const totalBoxCount      = shipmentItems.reduce((s, i) => s + (i.boxes?.length || 0), 0);
    const totalReceivedCount = Object.keys(newReceivedKeys).filter(k => newReceivedKeys[k]).length;
    const isFullyReceived    = totalReceivedCount >= totalBoxCount;

    const itemVerifications = shipmentItems.map((item, itemIdx) => {
      const boxes      = item.boxes || [];
      const itemMissing = boxes.reduce((s, _, bi) =>
        s + ((boxStates[`${itemIdx}-${bi}`]?.missing_qty) || 0), 0);
      const expectedQty = parseInt(item.quantity) || 0;
      return {
        serial:              item.serial || String(itemIdx + 1),
        item_type:           item.item_type || item.item_name,
        expected_quantity:   expectedQty,
        procurement_missing: parseInt(item.missing_quantity) || 0,
        warehouse_missing:   itemMissing,
        final_quantity:      expectedQty - itemMissing,
        no_of_boxes:         parseInt(item.no_of_boxes) || 0,
        quantity_per_box:    parseInt(item.quantity_per_box) || 0,
        remarks:             '',
      };
    });

    // Save immediately — boxes are created now
    onSave({
      material_id:        material.id,
      received_by:        'Warehouse Staff',
      received_at:        new Date().toISOString(),
      item_verifications: itemVerifications,
      auto_create_boxes:  true,
      received_box_keys:  newReceivedKeys,
      batch_boxes:        batchBoxes,
      status:             isFullyReceived ? 'Received' : 'Partially Received',
      is_partial:         !isFullyReceived,
    });

    // Show print modal — stays on page whether partial or full
    setBarcodeModalBoxes(batchBoxes);
  };

  // Skip / Later: close modal, stay on receiving page
  const handleModalClose = () => setBarcodeModalBoxes(null);

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalBoxCount      = shipmentItems.reduce((s, i) => s + (i.boxes?.length || parseInt(i.no_of_boxes) || 0), 0);
  const totalReceivedCount = Object.keys(receivedBoxKeys).filter(k => receivedBoxKeys[k]).length;
  const selectedCount      = Object.values(selectedKeys).filter(Boolean).length;
  const selectedBoxData    = buildSelectedBoxData();
  const selectedTotalQty   = selectedBoxData.reduce((s, b) => s + (b.quantity || 0), 0);
  const selectedByItem     = selectedBoxData.reduce((acc, b) => {
    acc[b.item_type] = (acc[b.item_type] || 0) + 1;
    return acc;
  }, {});

  const totalQty         = shipmentItems.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0);
  const totalMissing     = Object.values(boxStates).reduce((s, b) => s + (b.missing_qty || 0), 0);
  const totalProcMissing = shipmentItems.reduce((s, i) =>
    s + (i.boxes || []).reduce((bs, b) => bs + (b.missing_qty || 0), 0), 0);

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
            <p className="text-sm text-red-700 mb-4">
              This shipment does not have warehouse step data. Please complete Step 6 first.
            </p>
            <button onClick={onBack} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFullyReceived     = totalReceivedCount >= totalBoxCount && totalBoxCount > 0;
  const isPartiallyReceived = totalReceivedCount > 0 && !isFullyReceived;

  return (
    <div className="space-y-5">
      {barcodeModalBoxes && (
        <BarcodeSuccessModal
          boxes={barcodeModalBoxes}
          shipmentNumber={material.shipment_number}
          onSkip={handleModalClose}
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
            Select boxes to confirm and generate barcodes in batches
          </p>
        </div>
      </div>

      {/* Progress banner */}
      {isPartiallyReceived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-amber-800">Partially Received</span>
            <span className="text-sm text-amber-700">
              — {totalReceivedCount} of {totalBoxCount} boxes confirmed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.round((totalReceivedCount / totalBoxCount) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-amber-700">
              {Math.round((totalReceivedCount / totalBoxCount) * 100)}%
            </span>
          </div>
        </div>
      )}

      {isFullyReceived && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">
            All {totalBoxCount} boxes received and barcodes generated.
          </span>
        </div>
      )}

      <form onSubmit={handleConfirmBatch}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: Item accordions ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {shipmentItems.map((item, itemIdx) => {
              const boxes             = item.boxes || [];
              const isExpanded        = expandedItems[itemIdx];
              const itemQty           = parseInt(item.quantity) || 0;
              const noBoxes           = boxes.length || parseInt(item.no_of_boxes) || 0;
              const itemMissing       = boxes.reduce((s, _, bi) =>
                s + ((boxStates[`${itemIdx}-${bi}`]?.missing_qty) || 0), 0);
              const itemProcMissing   = boxes.reduce((s, b) => s + (b.missing_qty || 0), 0);
              const itemExtra         = boxes.reduce((s, b) => s + (b.extra_qty   || 0), 0);
              const itemReceivedCount = boxes.filter((_, bi) => receivedBoxKeys[`${itemIdx}-${bi}`]).length;
              const itemSelectedCount = boxes.filter((_, bi) => selectedKeys[`${itemIdx}-${bi}`]).length;
              const unreceivedKeys    = boxes.map((_, bi) => `${itemIdx}-${bi}`).filter(k => !receivedBoxKeys[k]);
              const allSelected       = unreceivedKeys.length > 0 && unreceivedKeys.every(k => selectedKeys[k]);
              const someSelected      = unreceivedKeys.some(k => selectedKeys[k]);

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
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {itemReceivedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle className="w-3 h-3" /> {itemReceivedCount}/{noBoxes}
                        </span>
                      )}
                      {itemSelectedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                          {itemSelectedCount} selected
                        </span>
                      )}
                      {itemMissing > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">
                          <AlertTriangle className="w-3 h-3" /> {itemMissing} missing
                        </span>
                      )}
                      {itemProcMissing > 0 && (
                        <span className="text-xs font-semibold text-red-600">{itemProcMissing.toLocaleString()} proc.</span>
                      )}
                      {itemExtra > 0 && (
                        <span className="text-xs font-semibold text-blue-600">{itemExtra.toLocaleString()} extra</span>
                      )}
                      <span className="text-xs text-gray-400">{isExpanded ? 'Collapse' : 'Expand'}</span>
                    </div>
                  </div>

                  {/* Box table */}
                  {isExpanded && (
                    boxes.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 z-10">
                              <tr className="border-b border-gray-100 bg-gray-50">
                                {/* Select-all for this item */}
                                <th className="px-2 py-2.5 text-center w-8" onClick={e => e.stopPropagation()}>
                                  {unreceivedKeys.length > 0 && (
                                    <button
                                      type="button"
                                      title={allSelected ? 'Deselect all' : 'Select all unreceived'}
                                      onClick={() => toggleSelectAllItem(itemIdx, boxes)}
                                      className={`flex items-center justify-center mx-auto transition-colors ${
                                        allSelected ? 'text-blue-600' : someSelected ? 'text-blue-400' : 'text-gray-300 hover:text-blue-400'
                                      }`}
                                    >
                                      {allSelected || someSelected
                                        ? <CheckSquare className="w-4 h-4" />
                                        : <Square className="w-4 h-4" />
                                      }
                                    </button>
                                  )}
                                </th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Box Name</th>
                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">Qty</th>
                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">
                                  <span className="block">Proc.</span>
                                  <span className="block text-gray-300 normal-case font-normal">Miss/Extra</span>
                                </th>
                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">
                                  <span className="block">Prod.</span>
                                  <span className="block text-gray-300 normal-case font-normal">Missing</span>
                                </th>
                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">
                                  <span className="block">Prod.</span>
                                  <span className="block text-gray-300 normal-case font-normal">Extra</span>
                                </th>
                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-400 uppercase">Final</th>
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {boxes.map((box, boxIdx) => {
                                const key          = `${itemIdx}-${boxIdx}`;
                                const isReceived   = !!receivedBoxKeys[key];
                                const isSelected   = !!selectedKeys[key];
                                const s            = boxStates[key] || { missing_qty: 0, prod_extra_qty: 0 };
                                const missing      = s.missing_qty    || 0;
                                const prodExtra    = s.prod_extra_qty || 0;
                                const procMissing  = box.missing_qty  || 0;
                                const procExtra    = box.extra_qty    || 0;
                                const totalMissingForBox = procMissing - procExtra + missing - prodExtra;
                                const isShort = missing > 0;

                                return (
                                  <tr
                                    key={boxIdx}
                                    className={`transition-colors ${
                                      isReceived
                                        ? 'bg-emerald-50/50'
                                        : isSelected
                                          ? 'bg-blue-50/60'
                                          : isShort
                                            ? 'bg-orange-50/40'
                                            : 'hover:bg-gray-50/40'
                                    }`}
                                  >
                                    {/* Checkbox / received tick */}
                                    <td className="px-2 py-2.5 text-center">
                                      {isReceived ? (
                                        <CheckCircle
                                          className="w-4 h-4 text-emerald-500 mx-auto"
                                          title="Received & barcode generated"
                                        />
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => toggleBoxSelect(itemIdx, boxIdx)}
                                          className={`flex items-center justify-center mx-auto transition-colors ${
                                            isSelected ? 'text-blue-600' : 'text-gray-300 hover:text-blue-400'
                                          }`}
                                        >
                                          {isSelected
                                            ? <CheckSquare className="w-4 h-4" />
                                            : <Square className="w-4 h-4" />
                                          }
                                        </button>
                                      )}
                                    </td>

                                    {/* Box Name — wraps to 2 lines; Received badge on second line */}
                                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700">
                                      <div>{box.box_name}</div>
                                      {isReceived && (
                                        <span className="mt-0.5 inline-block px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded font-semibold">
                                          Received
                                        </span>
                                      )}
                                    </td>

                                    {/* Box Qty locked */}
                                    <td className="px-3 py-2.5 text-center">
                                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold cursor-not-allowed select-none">
                                        {(box.quantity || 0).toLocaleString()}
                                      </span>
                                    </td>

                                    {/* Proc Missing / Extra locked */}
                                    <td className="px-3 py-2.5 text-center">
                                      {(procMissing > 0 || procExtra > 0) ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                          {procMissing > 0 && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-semibold cursor-not-allowed select-none">
                                              −{procMissing.toLocaleString()}
                                            </span>
                                          )}
                                          {procExtra > 0 && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold cursor-not-allowed select-none">
                                              +{procExtra.toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-gray-300 text-xs">—</span>
                                      )}
                                    </td>

                                    {/* Production Missing — editable */}
                                    <td className="px-3 py-2.5 text-center">
                                      {isReceived ? (
                                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs select-none">
                                          {missing > 0 ? missing : '—'}
                                        </span>
                                      ) : (
                                        <>
                                          <input
                                            type="number" min="0" max={box.quantity || 0}
                                            value={s.missing_qty}
                                            onChange={e => updateBoxMissing(itemIdx, boxIdx, e.target.value)}
                                            placeholder="0"
                                            className={`w-16 px-2 py-1.5 text-center text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                                              errors[key] ? 'border-red-300 bg-red-50'
                                              : isShort   ? 'border-orange-300 bg-orange-50'
                                              : 'border-gray-200 bg-gray-50 focus:bg-white'
                                            }`}
                                          />
                                          {errors[key] && <p className="mt-0.5 text-xs text-red-500">{errors[key]}</p>}
                                        </>
                                      )}
                                    </td>

                                    {/* Production Extra — NEW editable column */}
                                    <td className="px-3 py-2.5 text-center">
                                      {isReceived ? (
                                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs select-none">
                                          {prodExtra > 0 ? prodExtra : '—'}
                                        </span>
                                      ) : (
                                        <input
                                          type="number" min="0"
                                          value={s.prod_extra_qty}
                                          onChange={e => updateBoxProdExtra(itemIdx, boxIdx, e.target.value)}
                                          placeholder="0"
                                          className="w-16 px-2 py-1.5 text-center text-xs border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-teal-400 focus:border-transparent focus:bg-white transition-all"
                                        />
                                      )}
                                    </td>

                                    {/* Final Qty */}
                                    <td className="px-3 py-2.5 text-center">
                                      <span className={`text-sm font-bold ${totalMissingForBox > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                                        {Math.max(0, (box.quantity || 0) - totalMissingForBox).toLocaleString()}
                                      </span>
                                    </td>

                                    {/* Remarks — locked once received */}
                                    <td className="px-3 py-2.5">
                                      {isReceived ? (
                                        <span className="text-xs text-gray-400 italic">{s.remarks || '—'}</span>
                                      ) : (
                                        <input
                                          type="text" value={s.remarks || ''}
                                          onChange={e => updateBoxRemarks(itemIdx, boxIdx, e.target.value)}
                                          placeholder="Notes..."
                                          className="w-full min-w-[100px] px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                                        />
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                      </div>
                    ) : (
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

          {/* ── RIGHT: Summary + action (original design preserved) ────────── */}
          <div className="flex flex-col gap-4">

            {/* Overall receipt progress */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Receipt Progress</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-500">Shipment</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{material.shipment_number}</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      isFullyReceived
                        ? 'bg-emerald-100 text-emerald-700'
                        : isPartiallyReceived
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isFullyReceived ? 'Fully Received' : isPartiallyReceived ? 'In Progress' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Boxes</span>
                  <span className="font-semibold text-gray-900">{totalBoxCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Received</span>
                  <span className="font-semibold text-emerald-700">{totalReceivedCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Remaining</span>
                  <span className={`font-semibold ${(totalBoxCount - totalReceivedCount) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {totalBoxCount - totalReceivedCount}
                  </span>
                </div>
                {totalBoxCount > 0 && (
                  <div className="pt-1">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.round((totalReceivedCount / totalBoxCount) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {Math.round((totalReceivedCount / totalBoxCount) * 100)}% complete
                    </p>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Qty</span>
                    <span className="font-semibold text-gray-900">{totalQty.toLocaleString()}</span>
                  </div>
                  {totalProcMissing > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Proc. Missing</span>
                      <span className="font-semibold text-red-700">−{totalProcMissing.toLocaleString()}</span>
                    </div>
                  )}
                  {totalMissing > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-600">Prod. Missing</span>
                      <span className="font-semibold text-orange-700">−{totalMissing.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="font-semibold text-gray-700">Final Qty</span>
                    <span className={`text-lg font-bold ${(totalProcMissing + totalMissing) > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                      {Math.max(0, totalQty - totalProcMissing - totalMissing).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current batch selection */}
            <div className={`bg-white rounded-xl border overflow-hidden transition-all ${
              selectedCount > 0 ? 'border-blue-200' : 'border-gray-200'
            }`}>
              <div className={`px-5 py-3.5 border-b ${
                selectedCount > 0 ? 'border-blue-100 bg-blue-50/60' : 'border-gray-100 bg-gray-50/60'
              }`}>
                <p className={`text-xs font-semibold uppercase tracking-widest ${
                  selectedCount > 0 ? 'text-blue-500' : 'text-gray-400'
                }`}>
                  Current Batch
                </p>
              </div>
              <div className="px-5 py-4">
                {selectedCount === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-3 leading-relaxed">
                    No boxes selected.<br />
                    <span className="text-xs">Check boxes from the list to build your batch.</span>
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Selected Boxes</span>
                      <span className="font-bold text-blue-700">{selectedCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Quantity</span>
                      <span className="font-bold text-gray-900">{selectedTotalQty.toLocaleString()}</span>
                    </div>
                    {Object.keys(selectedByItem).length > 0 && (
                      <div className="border-t border-gray-100 pt-2 space-y-1.5">
                        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">By Item</p>
                        {Object.entries(selectedByItem).map(([type, count]) => (
                          <div key={type} className="flex justify-between items-center text-xs">
                            <span className={`px-2 py-0.5 rounded font-semibold ${itemBadgeCls(type)}`}>{type}</span>
                            <span className="text-gray-600 font-medium">{count} box{count !== 1 ? 'es' : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={selectedCount === 0}
                className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl shadow-sm transition-all ${
                  selectedCount > 0
                    ? 'text-white bg-emerald-600 hover:bg-emerald-700'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
              >
                <Package className="w-4 h-4" />
                {selectedCount > 0
                  ? `Confirm & Generate ${selectedCount} Barcode${selectedCount !== 1 ? 's' : ''}`
                  : 'Select Boxes to Continue'
                }
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                {totalReceivedCount > 0 ? 'Back to List' : 'Cancel'}
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
};

export default InboundReceiving;