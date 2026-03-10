import { useState } from 'react';
import {
  Package, Search, Eye, Barcode, CheckCircle, Activity, XCircle,
  Factory, ChevronLeft, ChevronRight, Printer, X, CheckSquare, Square
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// CODE 128B BARCODE ENGINE — pure JS, no library
// Produces real scannable 1D barcodes (works with NETUM and all 1D scanners)
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
  '11010011100','1100011101011', // index 106 = STOP (longer pattern)
];
const START_B = 104;
const STOP    = 106;

function encode128(text) {
  let checksum = START_B;
  const parts  = [C128[START_B]];
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    if (v < 0 || v > 94) continue;
    checksum += v * (i + 1);
    parts.push(C128[v]);
  }
  parts.push(C128[checksum % 103]);
  parts.push(C128[STOP]);
  parts.push('11'); // termination bar
  return parts.join('');
}

// SVG barcode React component — live preview in modal
function BarcodeSVG({ value, width = 280, height = 64, fontSize = 10 }) {
  const bits  = encode128(value);
  const mw    = width / bits.length;
  const barH  = height - fontSize - 4;
  const rects = [];
  let x = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') rects.push({ x, w: mw });
    x += mw;
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="white" />
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={0} width={r.w} height={barH} fill="#000" />
      ))}
      <text x={width / 2} y={height - 1} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">
        {value}
      </text>
    </svg>
  );
}

// Build a barcode SVG string (for embedding into print window as base64 img)
function barcodeBase64(value) {
  const W = 320, H = 80, fs = 10;
  const bits = encode128(value);
  const mw   = W / bits.length;
  const barH = H - fs - 4;
  let rects  = '';
  let x = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      rects += `<rect x="${x.toFixed(3)}" y="0" width="${mw.toFixed(3)}" height="${barH}" fill="#000"/>`;
    }
    x += mw;
  }
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="white"/>` +
    rects +
    `<text x="${W/2}" y="${H-1}" text-anchor="middle" font-size="${fs}" font-family="monospace" fill="#000">${value}</text>` +
    `</svg>`;
  // btoa with unicode-safe encoding
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRINT WINDOW — opens a dedicated pop-up with pure HTML+SVG labels
// Bypasses all @media print / modal visibility / background-color issues
// ═══════════════════════════════════════════════════════════════════════════════

function openPrintWindow(boxList) {
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
        ${box.shipment_number ? `<div class="ship">Shipment: ${box.shipment_number}</div>` : ''}
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Barcode Labels</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#fff;}
  .page{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:18px;}
  .label{border:2px solid #1f2937;border-radius:8px;padding:14px 12px;
    display:flex;flex-direction:column;align-items:center;gap:6px;
    background:#fff;page-break-inside:avoid;}
  .label-title{font-size:8px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;}
  .box-name{font-size:15px;font-weight:700;color:#111827;text-align:center;}
  .bc{width:100%;max-width:300px;height:auto;display:block;}
  .meta{width:100%;display:flex;justify-content:space-between;
    font-size:10px;color:#374151;border-top:1px solid #e5e7eb;padding-top:6px;}
  .ship{font-size:9px;color:#9ca3af;}
  @media print{
    body{margin:0;}
    .page{padding:8px;gap:10px;}
  }
</style>
</head><body>
<div class="page">${labels}</div>
<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script>
</body></html>`;

  const w = window.open('', '_blank', 'width=960,height=720');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRINT MODAL — preview labels with real barcodes before sending to printer
// ═══════════════════════════════════════════════════════════════════════════════

const BarcodePrintModal = ({ boxes, onClose }) => (
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
            onClick={() => openPrintWindow(boxes)}
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
          {boxes.map((box, idx) => (
            <div key={idx} className="bg-white border-2 border-gray-800 rounded-lg p-4 flex flex-col items-center gap-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Material Box Label</p>
              <p className="text-base font-bold text-gray-900 text-center">{box.box_name}</p>

              {/* Live SVG barcode preview */}
              <BarcodeSVG value={box.barcode} width={260} height={64} />

              <div className="w-full flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                <span><span className="font-semibold">Item:</span> {box.item_name}</span>
                <span><span className="font-semibold">Qty:</span> {box.quantity?.toLocaleString()}</span>
              </div>
              {box.shipment_number && (
                <p className="text-xs text-gray-400 w-full text-center">Shipment: {box.shipment_number}</p>
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const BoxList = ({ boxes, inboundMaterials, lcs, onViewBox, onIssueToProduction }) => {
  const [searchTerm, setSearchTerm]         = useState('');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [currentPage, setCurrentPage]       = useState(1);
  const [selectedBoxIds, setSelectedBoxIds] = useState([]);
  const [printModalBoxes, setPrintModalBoxes] = useState(null);
  const itemsPerPage = 10;

  // Shipment # lookup
  const getShipmentNumber = (box) => {
    if (box.shipment_number) return box.shipment_number;
    const im = inboundMaterials?.find(m => m.id === box.inbound_material_id);
    if (im?.shipment_number) return im.shipment_number;
    if (lcs && box.shipment_id) {
      for (const lc of lcs) {
        const sh = lc.shipments?.find(s => s.id === box.shipment_id);
        if (sh) return sh.shipment_number;
      }
    }
    return '—';
  };

  // Filter
  const filteredBoxes = boxes.filter(box => {
    const sn = getShipmentNumber(box);
    const q  = searchTerm.toLowerCase();
    const ok = !searchTerm ||
      box.box_name.toLowerCase().includes(q) ||
      box.barcode.toLowerCase().includes(q) ||
      box.item_name.toLowerCase().includes(q) ||
      sn.toLowerCase().includes(q);
    return ok && (statusFilter === 'all' || box.status === statusFilter);
  });

  // Pagination
  const totalPages     = Math.ceil(filteredBoxes.length / itemsPerPage);
  const startIndex     = (currentPage - 1) * itemsPerPage;
  const paginatedBoxes = filteredBoxes.slice(startIndex, startIndex + itemsPerPage);
  const handleFC = (setter) => (v) => { setter(v); setCurrentPage(1); };

  // Selection
  const toggleBox = (id) =>
    setSelectedBoxIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const pageIds        = paginatedBoxes.map(b => b.id);
  const allPgSel       = pageIds.length > 0 && pageIds.every(id => selectedBoxIds.includes(id));
  const somePgSel      = pageIds.some(id => selectedBoxIds.includes(id));
  const toggleAll      = () => {
    if (allPgSel) setSelectedBoxIds(p => p.filter(id => !pageIds.includes(id)));
    else setSelectedBoxIds(p => [...new Set([...p, ...pageIds])]);
  };

  // Print helpers
  const withShipment = (box) => ({ ...box, shipment_number: getShipmentNumber(box) });
  const printOne     = (box) => setPrintModalBoxes([withShipment(box)]);
  const printSel     = ()    => setPrintModalBoxes(boxes.filter(b => selectedBoxIds.includes(b.id)).map(withShipment));

  // Stats
  const total      = boxes.length;
  const inStock    = boxes.filter(b => b.status === 'Material In Stock').length;
  const inProd     = boxes.filter(b => b.status === 'Material In Production').length;
  const consumed   = boxes.filter(b => b.status === 'Consumed').length;
  const totalQty   = boxes.reduce((s, b) => s + (b.quantity || 0), 0);
  const totalCon   = boxes.reduce((s, b) => s + (b.consumed_quantity || 0), 0);
  const chipCt     = boxes.filter(b => b.item_name?.toLowerCase().includes('chip')).length;
  const tapeCt     = boxes.filter(b => b.item_name?.toLowerCase().includes('tape')).length;
  const sheetCt    = boxes.filter(b => b.item_name?.toLowerCase().includes('sheet')).length;

  const statusCfg = {
    'Material In Stock':      { icon: CheckCircle, bg: 'bg-green-100', tx: 'text-green-800' },
    'Material In Production': { icon: Activity,    bg: 'bg-blue-100',  tx: 'text-blue-800'  },
    'Consumed':               { icon: XCircle,     bg: 'bg-gray-100',  tx: 'text-gray-800'  },
  };

  return (
    <div className="space-y-6">
      {printModalBoxes && (
        <BarcodePrintModal boxes={printModalBoxes} onClose={() => setPrintModalBoxes(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Box Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track individual boxes throughout the production workflow</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedBoxIds.length > 0 && (
            <button onClick={printSel} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Printer className="w-4 h-4" />
              Print Selected ({selectedBoxIds.length})
            </button>
          )}
          <button onClick={onIssueToProduction} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <Factory className="w-4 h-4" />
            Issue to Production
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Boxes', value: total, sub: [chipCt && `Chip ${chipCt}`, tapeCt && `Tape ${tapeCt}`, sheetCt && `Sheet ${sheetCt}`].filter(Boolean).join(' · ') || '0 boxes', icon: Package, iconBg: 'bg-purple-100', iconCl: 'text-purple-600', valCl: 'text-gray-900' },
          { label: 'In Stock',    value: inStock,   sub: 'Ready to issue',  icon: CheckCircle, iconBg: 'bg-green-100', iconCl: 'text-green-600', valCl: 'text-green-900' },
          { label: 'In Production', value: inProd,  sub: 'Being processed', icon: Activity,    iconBg: 'bg-blue-100',  iconCl: 'text-blue-600',  valCl: 'text-blue-900'  },
          { label: 'Remaining',   value: total - consumed, sub: totalQty > 0 ? `${(totalQty - totalCon).toLocaleString()} units left` : '—', icon: Barcode, iconBg: 'bg-orange-100', iconCl: 'text-orange-600', valCl: 'text-gray-900' },
        ].map(({ label, value, sub, icon: Icon, iconBg, iconCl, valCl }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${valCl}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
              </div>
              <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${iconCl}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by box name, barcode, item or shipment #..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm} onChange={e => handleFC(setSearchTerm)(e.target.value)} />
        </div>
        <select className="w-full md:w-56 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={statusFilter} onChange={e => handleFC(setStatusFilter)(e.target.value)}>
          <option value="all">All Status</option>
          <option value="Material In Stock">In Stock</option>
          <option value="Material In Production">In Production</option>
          <option value="Consumed">Consumed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-700">
                    {allPgSel ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : somePgSel ? <CheckSquare className="w-4 h-4 text-blue-300" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {['Shipment #','Box Name','Barcode','Item','Quantity','Consumed','Remaining','Status'].map(h => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedBoxes.length > 0 ? paginatedBoxes.map(box => {
                const cfg      = statusCfg[box.status] || statusCfg['Material In Stock'];
                const Icon     = cfg.icon;
                const cQty     = box.consumed_quantity || 0;
                const rQty     = box.quantity - cQty;
                const sn       = getShipmentNumber(box);
                const selected = selectedBoxIds.includes(box.id);
                return (
                  <tr key={box.id} className={`hover:bg-gray-50 transition-colors ${selected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4">
                      <button onClick={() => toggleBox(box.id)} className="text-gray-400 hover:text-gray-700">
                        {selected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">{sn}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{box.box_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 font-mono text-xs text-gray-600">
                        <Barcode className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-[130px]" title={box.barcode}>{box.barcode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{box.item_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{box.quantity.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${cQty > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                        {cQty.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-medium ${rQty === 0 ? 'text-gray-400' : rQty < box.quantity * 0.3 ? 'text-red-600' : 'text-green-600'}`}>
                        {rQty.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${cfg.bg} ${cfg.tx}`}>
                        <Icon className="w-3 h-3" />
                        {box.status.replace('Material ', '')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => printOne(box)} title="Print Barcode"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={() => onViewBox(box)} title="View Details"
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' ? 'No boxes found matching your filters.' : (
                      <div>
                        <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="mb-2">No boxes available yet.</p>
                        <p className="text-xs text-gray-400">Boxes are auto-created when receiving inbound materials</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span>–
              <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredBoxes.length)}</span> of{' '}
              <span className="font-medium">{filteredBoxes.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoxList;