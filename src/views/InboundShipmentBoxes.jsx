import { useState } from 'react';
import {
  ArrowLeft, Package, Barcode, CheckCircle, Activity, XCircle,
  ChevronLeft, ChevronRight, Printer, X, CheckSquare, Square,
  TruckIcon, Hash, Layers, MessageSquare, AlertTriangle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// CODE 128B BARCODE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
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
const START_B = 104, STOP = 106;

function encode128(text) {
  let cs = START_B;
  const parts = [C128[START_B]];
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    if (v < 0 || v > 94) continue;
    cs += v * (i + 1);
    parts.push(C128[v]);
  }
  parts.push(C128[cs % 103], C128[STOP], '11');
  return parts.join('');
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
      <text x={width / 2} y={height - 1} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">{value}</text>
    </svg>
  );
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
    `<text x="${W / 2}" y="${H - 1}" text-anchor="middle" font-size="${fs}" font-family="monospace" fill="#000">${value}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
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
          <span>Item: <b>${box.item_name || box.item_type || ''}</b></span>
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

// ═══════════════════════════════════════════════════════════════════════════════
// REMARKS MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const RemarksModal = ({ box, shipmentNumber, onClose, onPrint }) => {
  if (!box) return null;
  const procMissing = box.missing_qty || 0;
  const procExtra   = box.extra_qty   || 0;
  const prodMissing = box.production_missing_qty || 0;
  const notes       = box.reconciliation_notes || [];
  const prodRemarks = box.remarks || '';
  const hasAnyData  = procMissing > 0 || procExtra > 0 || prodMissing > 0 || notes.length > 0 || prodRemarks;

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
              {(procMissing > 0 || procExtra > 0 || notes.length > 0) && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Procurement (Receiving)
                  </p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {procMissing > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                          Missing Qty
                        </span>
                        <span className="font-bold text-red-600">−{procMissing.toLocaleString()}</span>
                      </div>
                    )}
                    {procExtra > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                          Extra Qty
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

              {(prodMissing > 0 || prodRemarks) && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Production</p>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {prodMissing > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                          Production Missing
                        </span>
                        <span className="font-bold text-orange-600">−{prodMissing.toLocaleString()}</span>
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
// PRINT MODAL — consistent with BoxList BarcodePrintModal
// ═══════════════════════════════════════════════════════════════════════════════
const PrintPreviewModal = ({ boxes, shipmentNumber, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Print Barcode Labels</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {boxes.length} label{boxes.length !== 1 ? 's' : ''} — real Code 128 barcodes, scannable by NETUM
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { openPrintWindow(boxes, shipmentNumber); onClose(); }}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Labels
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Preview grid */}
      <div className="overflow-y-auto flex-1 p-6 bg-gray-100">
        <div className="grid grid-cols-2 gap-4">
          {boxes.map((box, i) => (
            <div key={i} className="bg-white border-2 border-gray-800 rounded-lg p-4 flex flex-col items-center gap-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Material Box Label</p>
              <p className="text-base font-bold text-gray-900 text-center">{box.box_name}</p>
              <BarcodeSVG value={box.barcode} width={260} height={64} />
              <div className="w-full flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                <span><span className="font-semibold">Item:</span> {box.item_name || box.item_type}</span>
                <span><span className="font-semibold">Qty:</span> {(box.quantity || 0).toLocaleString()}</span>
              </div>
              {shipmentNumber && (
                <p className="text-xs text-gray-400 w-full text-center">Shipment: {shipmentNumber}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-xl flex-shrink-0">
        <p className="text-xs text-gray-400 text-center">
          A new tab opens for printing. If blocked, allow pop-ups for this site. Set paper to A4, disable headers/footers.
        </p>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const statusCfg = {
  'Material In Stock':      { icon: CheckCircle, bg: 'bg-green-100', tx: 'text-green-700', label: 'In Stock'      },
  'Material In Production': { icon: Activity,    bg: 'bg-blue-100',  tx: 'text-blue-700',  label: 'In Production' },
  'Consumed':               { icon: XCircle,     bg: 'bg-gray-100',  tx: 'text-gray-500',  label: 'Consumed'      },
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

  // Build box list — prefer real boxes, fall back to warehouse step data
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
  const pageIds     = paginated.map(b => b.barcode || b.box_name);
  const allPageSel  = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const somePageSel = pageIds.some(id => selectedIds.includes(id));

  const toggleAll = () => {
    const select = !allPageSel;
    setSelectedIds(prev =>
      select ? [...new Set([...prev, ...pageIds])] : prev.filter(id => !pageIds.includes(id))
    );
  };
  const toggleOne = (id) => setSelectedIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const selectedBoxes = derivedBoxes.filter(b => selectedIds.includes(b.barcode || b.box_name));
  const printOne      = (box) => setPrintPreview([box]);
  const printSelected = () => selectedIds.length > 0 && setPrintPreview(selectedBoxes);

  const hasRemarks = (box) =>
    (box.missing_qty || 0) > 0 ||
    (box.extra_qty   || 0) > 0 ||
    (box.production_missing_qty || 0) > 0 ||
    (box.reconciliation_notes || []).length > 0 ||
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label:  'Shipment',
            value:  shipmentNumber,
            sub:    lcNumber,
            icon:   TruckIcon,
            iconBg: 'bg-indigo-100',
            iconCl: 'text-indigo-600',
            valCl:  'text-base font-bold text-indigo-900',
          },
          {
            label:  'No. of Boxes',
            value:  totalBoxes.toLocaleString(),
            sub:    'Total boxes received',
            icon:   Package,
            iconBg: 'bg-green-100',
            iconCl: 'text-green-600',
            valCl:  'text-2xl font-bold text-green-900',
          },
          {
            label:  'Total Quantity',
            value:  totalQty.toLocaleString(),
            sub:    'Units across all boxes',
            icon:   Hash,
            iconBg: 'bg-blue-100',
            iconCl: 'text-blue-600',
            valCl:  'text-2xl font-bold text-blue-900',
          },
          {
            label:  'Item Types',
            value:  totalItemTypes.toString(),
            sub:    itemTypes.join(', ') || '—',
            icon:   Layers,
            iconBg: 'bg-purple-100',
            iconCl: 'text-purple-600',
            valCl:  'text-2xl font-bold text-purple-900',
          },
        ].map(({ label, value, sub, icon: Icon, iconBg, iconCl, valCl }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                <p className={`font-semibold truncate ${valCl}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate" title={sub}>{sub}</p>
              </div>
              <div className={`${iconBg} p-2.5 rounded-lg flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${iconCl}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-700">
                    {allPageSel
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : somePageSel
                      ? <CheckSquare className="w-4 h-4 text-blue-300" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {['Box Name','Barcode','Item','Quantity','Proc Miss','Proc Extra','Prod Miss','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginated.length > 0 ? paginated.map((box, idx) => {
                const id        = box.barcode || box.box_name;
                const selected  = selectedIds.includes(id);
                const cfg       = statusCfg[box.status] || statusCfg['Material In Stock'];
                const SIcon     = cfg.icon;
                const procMiss  = box.missing_qty || 0;
                const procExtra = box.extra_qty   || 0;
                const prodMiss  = box.production_missing_qty || 0;
                const flagged   = hasRemarks(box);

                return (
                  <tr key={idx} className={`hover:bg-gray-50 transition-colors ${selected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleOne(id)} className="text-gray-400 hover:text-gray-700">
                        {selected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Box Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-gray-900 whitespace-nowrap">{box.box_name}</span>
                        {flagged && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" title="Has discrepancies" />}
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 font-mono text-xs text-gray-500">
                        <Barcode className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-[100px]" title={box.barcode}>{box.barcode}</span>
                      </div>
                    </td>

                    {/* Item */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        (box.item_name || box.item_type || '').toLowerCase().includes('chip')  ? 'bg-blue-100 text-blue-800'   :
                        (box.item_name || box.item_type || '').toLowerCase().includes('tape')  ? 'bg-purple-100 text-purple-800':
                        (box.item_name || box.item_type || '').toLowerCase().includes('sheet') ? 'bg-green-100 text-green-800'  :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {box.item_name || box.item_type || '—'}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {(box.quantity || 0).toLocaleString()}
                    </td>

                    {/* Proc Missing */}
                    <td className="px-4 py-3">
                      {procMiss > 0
                        ? <span className="text-sm font-semibold text-red-600">−{procMiss.toLocaleString()}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>

                    {/* Proc Extra */}
                    <td className="px-4 py-3">
                      {procExtra > 0
                        ? <span className="text-sm font-semibold text-blue-600">+{procExtra.toLocaleString()}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>

                    {/* Production Missing */}
                    <td className="px-4 py-3">
                      {prodMiss > 0
                        ? <span className="text-sm font-semibold text-orange-600">−{prodMiss.toLocaleString()}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.tx}`}>
                        <SIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => printOne(box)}
                          title="Print barcode label"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRemarksBox(box)}
                          title={flagged ? 'View remarks & discrepancies' : 'View remarks'}
                          className={`p-1.5 rounded transition-colors ${
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
                  <td colSpan="10" className="px-6 py-12 text-center text-sm text-gray-500">
                    <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p className="mb-1 font-medium">No boxes found for this shipment.</p>
                    <p className="text-xs text-gray-400">Boxes are created when receiving inbound materials.</p>
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
              Showing{' '}
              <span className="font-medium">{startIndex + 1}</span>–
              <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalBoxes)}</span>
              {' '}of{' '}
              <span className="font-medium">{totalBoxes}</span> boxes
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