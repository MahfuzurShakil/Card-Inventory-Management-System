import { useState } from 'react';
import {
  Package, Printer, ArrowLeft, CheckCircle, XCircle, Activity,
  TruckIcon, MessageSquare, X, SkipForward, ChevronLeft, ChevronRight
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// CODE 128 BARCODE ENGINE (same as InboundReceiving)
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
const START_B = '11010010000', STOP = '11000111010';

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

function BarcodeSVG({ value, width = 260, height = 56, fontSize = 10 }) {
  const bits = encode128(value);
  const mw   = width / bits.length, barH = height - fontSize - 2;
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
      <text x={width / 2} y={height - 1} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">{value}</text>
    </svg>
  );
}

function barcodeBase64(value) {
  const W = 520, H = 110, fs = 13;
  const bits = encode128(value);
  const mw = W / bits.length, barH = H - fs - 4;
  let rects = '', x = 0, inBar = false, barX = 0;
  for (let i = 0; i <= bits.length; i++) {
    const on = i < bits.length && bits[i] === '1';
    if (on && !inBar) { barX = x; inBar = true; }
    if (!on && inBar) { rects += `<rect x="${barX.toFixed(3)}" y="0" width="${(x - barX).toFixed(3)}" height="${barH}" fill="#000"/>`; inBar = false; }
    x += mw;
  }
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="white"/>${rects}` +
    `<text x="${W/2}" y="${H-1}" text-anchor="middle" font-size="${fs}" font-family="monospace" fill="#000">${value}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// ── Print window — 100×60 mm Zebra labels (matches InboundReceiving exactly) ──
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
        <span><b>Item:</b> ${box.item_name || box.item_type || ''}</span>
        <span><b>Qty:</b> ${(box.quantity || 0).toLocaleString()}</span>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Labels — ${shipmentNumber}</title>
<style>
  @page { size: 100mm 60mm; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background:#fff; }
  .label {
    width:100mm; height:60mm; padding:3mm 4mm;
    display:flex; flex-direction:column; justify-content:space-between;
    page-break-after:always; background:#fff; overflow:hidden;
  }
  .label:last-child { page-break-after:avoid; }
  .top-row { display:flex; justify-content:space-between; align-items:center; }
  .label-title { font-size:7pt; font-weight:700; color:#6b7280; letter-spacing:1.5px; text-transform:uppercase; }
  .shipment { font-size:7pt; color:#9ca3af; }
  .box-name { font-size:13pt; font-weight:800; color:#111827; text-align:center; letter-spacing:0.5px; }
  .bc { width:100%; height:auto; display:block; max-height:26mm; }
  .meta { display:flex; justify-content:space-between; font-size:8pt; color:#374151; border-top:0.5pt solid #e5e7eb; padding-top:1.5mm; }
</style>
</head><body>
${labels}
<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
</body></html>`;

  const w = window.open('', '_blank', 'width=500,height=400');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRINT MODAL — matches InboundReceiving style: vertical scroll, 100×60 preview
// ═══════════════════════════════════════════════════════════════════════════════
const PrintPreviewModal = ({ boxes, shipmentNumber, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Print Barcode Labels</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {boxes.length} label{boxes.length !== 1 ? 's' : ''} · Shipment{' '}
            <span className="font-semibold text-gray-700">{shipmentNumber}</span>
          </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Label preview — single vertical list, same as InboundReceiving */}
      <div className="overflow-y-auto flex-1 px-6 py-4 bg-gray-50 space-y-4">
        {boxes.map((box, i) => (
          <div
            key={i}
            className="bg-white border border-gray-300 rounded-lg shadow-sm mx-auto"
            style={{
              width: '100%', maxWidth: 420,
              aspectRatio: '100 / 60',
              padding: '10px 14px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-bold uppercase tracking-widest" style={{ fontSize: 8 }}>
                Material Box Label
              </span>
              <span className="text-gray-300" style={{ fontSize: 8 }}>{shipmentNumber}</span>
            </div>
            <p className="text-center font-extrabold text-gray-900 tracking-wide" style={{ fontSize: 15 }}>
              {box.box_name}
            </p>
            <div className="flex justify-center">
              <BarcodeSVG value={box.barcode} width={340} height={52} fontSize={10} />
            </div>
            <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-1" style={{ fontSize: 9 }}>
              <span><b>Item:</b> {box.item_name || box.item_type || '—'}</span>
              <span><b>Qty:</b> {(box.quantity || 0).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer — print prompt (same pattern as InboundReceiving) */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-2xl flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">Do you want to print the barcodes now?</p>
            <p className="text-xs text-gray-400 mt-0.5">Zebra printer · 100 × 60 mm labels · One label per sticker</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Skip / Later
            </button>
            <button
              onClick={() => { openPrintWindow(boxes, shipmentNumber); onClose(); }}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print Barcodes Now
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// REMARKS MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const RemarksModal = ({ box, shipmentNumber, onClose, onPrint }) => {
  if (!box) return null;
  const procMissing = box.missing_qty            || 0;
  const procExtra   = box.extra_qty              || 0;
  const prodMissing = box.production_missing_qty || 0;
  const prodExtra   = box.production_extra_qty   || 0;
  const notes       = box.reconciliation_notes   || [];
  const prodRemarks = box.remarks                || '';
  const hasAnyData  = procMissing > 0 || procExtra > 0 || prodMissing > 0 || prodExtra > 0 || notes.length > 0 || prodRemarks;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-bold text-gray-900">{box.box_name}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {box.item_name || box.item_type} · {(box.quantity || 0).toLocaleString()} units
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrint([box])}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex justify-center bg-gray-50 rounded-lg p-3 border border-gray-100">
            <BarcodeSVG value={box.barcode} width={240} height={56} />
          </div>

          {!hasAnyData ? (
            <div className="text-center py-4">
              <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No remarks or discrepancies recorded for this box.</p>
            </div>
          ) : (
            <>
              {/* Procurement section */}
              {(procMissing > 0 || procExtra > 0 || notes.length > 0) && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Procurement / Receiving Discrepancy
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {procMissing > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                          Proc. Missing Qty
                        </span>
                        <span className="font-bold text-red-600">−{procMissing.toLocaleString()}</span>
                      </div>
                    )}
                    {procExtra > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                          Proc. Extra Qty
                        </span>
                        <span className="font-bold text-blue-600">+{procExtra.toLocaleString()}</span>
                      </div>
                    )}
                    {notes.length > 0 && (
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <p className="text-xs text-gray-400 mb-1.5">Reconciliation Notes</p>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {notes.map((n, i) => (
                            <div key={i} className={`text-xs px-2 py-1 rounded flex items-start gap-1.5 ${
                              n.type === 'missing' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              <span className="font-semibold capitalize flex-shrink-0">{n.type}:</span>
                              <span>{n.qty} unit{n.qty !== 1 ? 's' : ''}{n.note ? ` — ${n.note}` : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Production section */}
              {(prodMissing > 0 || prodExtra > 0 || prodRemarks) && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Production Adjustment</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {prodMissing > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                          Prod. Missing Qty
                        </span>
                        <span className="font-bold text-orange-600">−{prodMissing.toLocaleString()}</span>
                      </div>
                    )}
                    {prodExtra > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" />
                          Prod. Extra Qty
                        </span>
                        <span className="font-bold text-teal-600">+{prodExtra.toLocaleString()}</span>
                      </div>
                    )}
                    {prodRemarks && (
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <p className="text-xs text-gray-400 mb-1">Remarks</p>
                        <p className="text-sm text-gray-700 italic">"{prodRemarks}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="w-full py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const statusCfg = {
  'Material In Stock':      { icon: CheckCircle, bg: 'bg-green-100',  tx: 'text-green-700',  label: 'In Stock'      },
  'Material In Production': { icon: Activity,    bg: 'bg-blue-100',   tx: 'text-blue-700',   label: 'In Production' },
  'Consumed':               { icon: XCircle,     bg: 'bg-gray-100',   tx: 'text-gray-500',   label: 'Consumed'      },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const InboundShipmentBoxes = ({ material, lcs, boxes: allBoxes, onBack }) => {
  const [currentPage,  setCurrentPage]  = useState(1);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [remarksBox,   setRemarksBox]   = useState(null);
  const [printPreview, setPrintPreview] = useState(null);
  const itemsPerPage = 10;

  // ── Resolve data ───────────────────────────────────────────────────────────
  const lc             = lcs?.find(l => l.id === material?.lc_id);
  const shipment       = lc?.shipments?.find(s => s.id === material?.shipment_id);
  const shipmentNumber = material?.shipment_number || '—';
  const lcNumber       = lc?.lc_number || '—';

  // Prefer real boxes; fall back to warehouse step data
  const realBoxes = (allBoxes || []).filter(
    b => b.inbound_material_id === material?.id || b.shipment_id === material?.shipment_id
  );
  const warehouseItems = shipment?.stepData?.warehouse?.items || [];
  const derivedBoxes = realBoxes.length > 0
    ? realBoxes
    : warehouseItems.flatMap(item =>
        (item.boxes || []).map(box => ({
          ...box,
          item_name:              item.item_type || item.item_name,
          item_type:              item.item_type,
          status:                 'Material In Stock',
          consumed_quantity:      0,
          production_missing_qty: 0,
          production_extra_qty:   0,
        }))
      );

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalBoxes     = derivedBoxes.length;
  const totalQty       = derivedBoxes.reduce((s, b) => s + (parseInt(b.quantity) || 0), 0);
  const itemTypes      = [...new Set(derivedBoxes.map(b => b.item_name || b.item_type).filter(Boolean))];
  const totalItemTypes = itemTypes.length;

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalBoxes / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated  = derivedBoxes.slice(startIndex, startIndex + itemsPerPage);

  // ── Selection ──────────────────────────────────────────────────────────────
  const pageIds    = paginated.map(b => b.barcode || b.box_name);
  const allPageSel = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));

  const toggleAll = () => {
    setSelectedIds(prev =>
      allPageSel ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]
    );
  };
  const toggleOne = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const selectedBoxes = derivedBoxes.filter(b => selectedIds.includes(b.barcode || b.box_name));
  const printOne      = (box) => setPrintPreview([box]);
  const printSelected = () => selectedIds.length > 0 && setPrintPreview(selectedBoxes);

  const hasRemarks = (box) =>
    (box.missing_qty            || 0) > 0 ||
    (box.extra_qty              || 0) > 0 ||
    (box.production_missing_qty || 0) > 0 ||
    (box.production_extra_qty   || 0) > 0 ||
    (box.reconciliation_notes   || []).length > 0 ||
    !!box.remarks;

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Received Boxes</h1>
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              <TruckIcon className="w-3.5 h-3.5" />
              {shipmentNumber}
              {lc && <span className="text-gray-400">· {lcNumber}</span>}
            </p>
          </div>
        </div>
        {selectedIds.length > 0 && (
          <button
            onClick={printSelected}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Shipment',    value: shipmentNumber, sub: lcNumber,             icon: TruckIcon,  iconBg: 'bg-indigo-100', iconCl: 'text-indigo-600', valCl: 'text-base font-bold text-indigo-900' },
          { label: 'Total Boxes', value: totalBoxes,     sub: `${totalItemTypes} item type${totalItemTypes !== 1 ? 's' : ''}`, icon: Package, iconBg: 'bg-blue-100', iconCl: 'text-blue-600', valCl: 'text-2xl font-bold text-blue-900' },
          { label: 'Total Qty',   value: totalQty.toLocaleString(), sub: 'units received', icon: CheckCircle, iconBg: 'bg-green-100', iconCl: 'text-green-600', valCl: 'text-2xl font-bold text-green-900' },
          { label: 'Item Types',  value: itemTypes.join(', ') || '—', sub: `${totalItemTypes} type${totalItemTypes !== 1 ? 's' : ''}`, icon: Activity, iconBg: 'bg-purple-100', iconCl: 'text-purple-600', valCl: 'text-base font-bold text-purple-900' },
        ].map((c, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{c.label}</p>
                <p className={`mt-1 truncate ${c.valCl}`}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
              </div>
              <div className={`w-9 h-9 ${c.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 ml-3`}>
                <c.icon className={`w-4 h-4 ${c.iconCl}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* Select-all */}
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSel && pageIds.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Box Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Quantity</th>

                {/* Merged: Proc. Missing / Extra */}
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                  <span className="block">Proc. Missing / Extra</span>
                  <span className="text-gray-400 normal-case font-normal text-xs">Receiving discrepancy</span>
                </th>

                {/* Merged: Prod. Missing / Extra */}
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
                  <span className="block">Prod. Missing / Extra</span>
                  <span className="text-gray-400 normal-case font-normal text-xs">Production adjustment</span>
                </th>

                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length > 0 ? paginated.map((box, idx) => {
                const id        = box.barcode || box.box_name;
                const isChecked = selectedIds.includes(id);
                const procMiss  = box.missing_qty            || 0;
                const procExtra = box.extra_qty              || 0;
                const prodMiss  = box.production_missing_qty || 0;
                const prodExtra = box.production_extra_qty   || 0;
                const flagged   = hasRemarks(box);
                const cfg       = statusCfg[box.status] || statusCfg['Material In Stock'];
                const SIcon     = cfg.icon;

                return (
                  <tr key={idx} className={`transition-colors ${isChecked ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>

                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>

                    {/* Box Name */}
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-800">
                      {box.box_name}
                    </td>

                    {/* Item */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${
                        (box.item_name || box.item_type || '').toLowerCase().includes('chip')  ? 'bg-blue-100 text-blue-800'   :
                        (box.item_name || box.item_type || '').toLowerCase().includes('tape')  ? 'bg-purple-100 text-purple-800':
                        (box.item_name || box.item_type || '').toLowerCase().includes('sheet') ? 'bg-green-100 text-green-800'  :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {box.item_name || box.item_type || '—'}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {(box.quantity || 0).toLocaleString()}
                    </td>

                    {/* Proc. Missing / Extra — merged cell */}
                    <td className="px-4 py-3 text-center">
                      {(procMiss > 0 || procExtra > 0) ? (
                        <div className="flex items-center justify-center gap-2">
                          {procMiss > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs font-semibold">
                              −{procMiss.toLocaleString()}
                            </span>
                          )}
                          {procExtra > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold">
                              +{procExtra.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Prod. Missing / Extra — merged cell */}
                    <td className="px-4 py-3 text-center">
                      {(prodMiss > 0 || prodExtra > 0) ? (
                        <div className="flex items-center justify-center gap-2">
                          {prodMiss > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded text-xs font-semibold">
                              −{prodMiss.toLocaleString()}
                            </span>
                          )}
                          {prodExtra > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-xs font-semibold">
                              +{prodExtra.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.tx}`}>
                        <SIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => printOne(box)}
                          title="Print barcode label"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRemarksBox(box)}
                          title={flagged ? 'View remarks & discrepancies' : 'View remarks'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            flagged ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                    <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p className="font-medium">No boxes found for this shipment.</p>
                    <p className="text-xs text-gray-400 mt-1">Boxes are created when receiving inbound materials.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing <span className="font-semibold">{startIndex + 1}</span>–
              <span className="font-semibold">{Math.min(startIndex + itemsPerPage, totalBoxes)}</span> of{' '}
              <span className="font-semibold">{totalBoxes}</span> boxes
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {remarksBox && (
        <RemarksModal
          box={remarksBox}
          shipmentNumber={shipmentNumber}
          onClose={() => setRemarksBox(null)}
          onPrint={(boxes) => { setRemarksBox(null); setPrintPreview(boxes); }}
        />
      )}
      {printPreview && (
        <PrintPreviewModal
          boxes={printPreview}
          shipmentNumber={shipmentNumber}
          onClose={() => setPrintPreview(null)}
        />
      )}
    </div>
  );
};

export default InboundShipmentBoxes;