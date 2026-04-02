import { useState } from 'react';
import {
  Layers, Search, Plus, Eye, AlertTriangle, CheckCircle, XCircle,
  Barcode, Printer, X, CheckSquare, Square, ChevronLeft, ChevronRight,
  FileText, Package, Truck
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

// React SVG barcode — used in print-preview modal
function BarcodeSVG({ value, width = 260, height = 65 }) {
  const bits = encode128(value);
  const mw   = width / bits.length;
  const fs   = 9;
  const barH = height - fs - 4;
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
      <text x={width/2} y={height-1} textAnchor="middle" fontSize={fs} fontFamily="monospace" fill="#000">{value}</text>
    </svg>
  );
}

// Base64 barcode for print HTML — 100×60 mm label (matches InboundReceiving)
function barcodeBase64(value) {
  const W = 520, H = 110, fs = 13;
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

// ── Print window — 100×60 mm per label, one per page ─────────────────────────
function openPrintWindow(sbList) {
  const labels = sbList.map(sb => {
    const src  = barcodeBase64(sb.barcode);
    const good = sb.output_type === 'Good/ QC Approved';
    const shiftLabel = sb.shift ? `${sb.shift} Shift` : 'Ready Made';
    const dateLabel = sb.production_date || '—';
    return `
    <div class="label">
      <div class="top-row">
        <span class="label-title">Finished Good Sub-Box</span>
        <span class="shift-badge ${sb.shift === 'Day' ? 'shift-day' : sb.shift === 'Night' ? 'shift-night' : 'shift-neutral'}">${shiftLabel}</span>
      </div>
      <div class="box-name">${sb.sub_box_name || sb.box_name || sb.barcode}</div>
      <span class="badge ${good ? 'badge-good' : 'badge-bad'}">${good ? 'QC Approved' : 'Wastage'}</span>
      <img class="bc" src="${src}" alt="${sb.barcode}" />
      <div class="meta">
        <span><b>Date:</b> ${dateLabel}</span>
        <span><b>Qty:</b> ${(sb.quantity || 0).toLocaleString()}</span>
        <span><b>Type:</b> ${good ? 'Good' : 'Wastage'}</span>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Sub-Box Labels</title>
<style>
  @page { size: 100mm 60mm; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background: #fff; }
  .label {
    width: 100mm; height: 60mm;
    padding: 3mm 4mm;
    display: flex; flex-direction: column; justify-content: space-between;
    page-break-after: always; background: #fff; overflow: hidden;
  }
  .label:last-child { page-break-after: avoid; }
  .top-row { display:flex; justify-content:space-between; align-items:center; }
  .label-title { font-size:7px; font-weight:700; color:#6b7280; letter-spacing:1.5px; text-transform:uppercase; }
  .shift-badge { font-size:7px; font-weight:700; padding:1px 5px; border-radius:99px; }
  .shift-day   { background:#fef3c7; color:#92400e; }
  .shift-night { background:#e0e7ff; color:#3730a3; }
  .shift-neutral { background:#e5e7eb; color:#374151; }
  .box-name { font-size:13px; font-weight:700; color:#111827; letter-spacing:0.3px; }
  .badge { font-size:8px; font-weight:700; padding:1.5px 8px; border-radius:99px; align-self:flex-start; }
  .badge-good { background:#dcfce7; color:#166534; }
  .badge-bad  { background:#fee2e2; color:#991b1b; }
  .bc { width:100%; height:auto; display:block; }
  .meta { display:flex; justify-content:space-between; font-size:8px; color:#374151;
          border-top:1px solid #e5e7eb; padding-top:2mm; }
  @media print { body { margin:0; } }
</style>
</head><body>
${labels}
<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=650');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ── Print Preview Modal ───────────────────────────────────────────────────────
const BarcodePrintModal = ({ subBoxes, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

      {/* Modal header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Print Barcode Labels</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {subBoxes.length} label{subBoxes.length !== 1 ? 's' : ''} · 100×60 mm · Code 128
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openPrintWindow(subBoxes)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Labels
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Label preview grid */}
      <div className="overflow-y-auto flex-1 p-6 bg-gray-100">
        <div className="grid grid-cols-2 gap-4">
          {subBoxes.map((sb, idx) => {
            const good = sb.output_type === 'Good/ QC Approved';
            return (
              <div key={idx} className={`bg-white border-2 rounded-xl overflow-hidden ${good ? 'border-emerald-200' : 'border-red-200'}`}>
                {/* Label top bar */}
                <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finished Good Sub-Box</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    sb.shift === 'Day' ? 'bg-amber-100 text-amber-700' : sb.shift === 'Night' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-700'
                  }`}>{sb.shift || 'Ready Made'}</span>
                </div>
                <div className="px-4 py-3 flex flex-col items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">{sb.sub_box_name || sb.box_name || sb.barcode}</p>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${good ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {good ? 'QC Approved' : 'Wastage'}
                  </span>
                  <BarcodeSVG value={sb.barcode} width={260} height={65} />
                  <div className="w-full flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                    <span><span className="text-gray-400">Date:</span> <b>{sb.production_date || '—'}</b></span>
                    <span><span className="text-gray-400">Qty:</span> <b>{(sb.quantity || 0).toLocaleString()}</b></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
        <p className="text-xs text-gray-400 text-center">Labels print at 100×60 mm, one per page. Allow pop-ups, disable headers/footers.</p>
      </div>
    </div>
  </div>
);

// ── Helper badges ─────────────────────────────────────────────────────────────
const BoxTypeBadge = ({ type }) => {
  if (type === 'Partial') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
      <Package className="w-3 h-3" /> Partial
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
      <Package className="w-3 h-3" /> Full
    </span>
  );
};

const DeliveryStatusBadge = ({ status }) => {
  if (status === 'delivered') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
      <Truck className="w-3 h-3" /> Delivered
    </span>
  );
  if (status === 'ready_for_delivery') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
      <Truck className="w-3 h-3" /> Ready
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
      <FileText className="w-3 h-3" /> Pending
    </span>
  );
};

const SourceTypeBadge = ({ sourceType }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
    sourceType === 'ready_made' ? 'bg-cyan-100 text-cyan-800' : 'bg-violet-100 text-violet-800'
  }`}>
    {sourceType === 'ready_made' ? 'Ready Made' : 'Production'}
  </span>
);

// ── Main Component ────────────────────────────────────────────────────────────
const SubBoxList = ({ subBoxes, boxes, onCreateSubBox, onViewSubBox, onRecordRejection, onCreateChallan }) => {
  const [searchTerm, setSearchTerm]             = useState('');
  const [outputTypeFilter, setOutputTypeFilter] = useState('all');
  const [shiftFilter, setShiftFilter]           = useState('all');
  const [boxTypeFilter, setBoxTypeFilter]       = useState('all');   // NEW
  const [deliveryFilter, setDeliveryFilter]     = useState('all');   // NEW
  const [currentPage, setCurrentPage]           = useState(1);
  const [selectedIds, setSelectedIds]           = useState([]);
  const [printModalSubs, setPrintModalSubs]     = useState(null);
  const itemsPerPage = 10;

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredSubBoxes = subBoxes.filter(sb => {
    const q          = searchTerm.toLowerCase();
    const matchText  = !searchTerm ||
      sb.barcode?.toLowerCase().includes(q) ||
      sb.shift?.toLowerCase().includes(q) ||
      sb.box_name?.toLowerCase().includes(q) ||
      sb.sub_box_name?.toLowerCase().includes(q) ||
      sb.production_date?.includes(q) ||
      sb.lc_number?.toLowerCase().includes(q) ||
      sb.sourceType?.replace('_', ' ')?.toLowerCase().includes(q);
    const matchType     = outputTypeFilter === 'all' || sb.output_type === outputTypeFilter;
    const matchShift    = shiftFilter === 'all' || sb.shift === shiftFilter;
    const matchBoxType  = boxTypeFilter === 'all' || (sb.box_type || 'Full') === boxTypeFilter;
    const matchDelivery = deliveryFilter === 'all' || (sb.delivery_status || 'delivery_pending') === deliveryFilter;
    return matchText && matchType && matchShift && matchBoxType && matchDelivery;
  });

  const totalPages    = Math.ceil(filteredSubBoxes.length / itemsPerPage);
  const startIndex    = (currentPage - 1) * itemsPerPage;
  const paginatedSubs = filteredSubBoxes.slice(startIndex, startIndex + itemsPerPage);
  const handleFC      = (setter) => (v) => { setter(v); setCurrentPage(1); };

  // ── Selection — partial boxes are excluded from select ────────────────────
  const isSelectable  = (sb) =>
    (sb.box_type || 'Full') !== 'Partial' &&
    (sb.delivery_status || 'delivery_pending') === 'delivery_pending';
  const toggleId      = (id) => {
    const sb = subBoxes.find(b => b.id === id);
    if (!sb || !isSelectable(sb)) return;
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };
  const selectablePageIds = paginatedSubs.filter(isSelectable).map(b => b.id);
  const allPgSel  = selectablePageIds.length > 0 && selectablePageIds.every(id => selectedIds.includes(id));
  const somePgSel = selectablePageIds.some(id => selectedIds.includes(id));
  const toggleAll = () => {
    if (allPgSel) setSelectedIds(p => p.filter(id => !selectablePageIds.includes(id)));
    else          setSelectedIds(p => [...new Set([...p, ...selectablePageIds])]);
  };

  // Print — only full boxes have barcodes
  const printOne = (sb) => { if (sb.barcode) setPrintModalSubs([sb]); };
  const printSel = ()   => {
    const printable = subBoxes.filter(b => selectedIds.includes(b.id) && b.barcode);
    if (printable.length) setPrintModalSubs(printable);
  };

  const handleCreateChallan = () => {
    if (onCreateChallan) onCreateChallan(selectedIds);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSubBoxes   = subBoxes.length;
  const fullCount       = subBoxes.filter(sb => (sb.box_type || 'Full') === 'Full').length;
  const partialCount    = subBoxes.filter(sb => sb.box_type === 'Partial').length;
  const goodCount       = subBoxes.filter(sb => sb.output_type === 'Good/ QC Approved').length;
  const wastageCount    = subBoxes.filter(sb => sb.output_type === 'Wastage').length;
  const totalProduced   = subBoxes.reduce((s, sb) => s + (sb.quantity || 0), 0);
  const totalWastage    = subBoxes.filter(sb => sb.output_type === 'Wastage').reduce((s, sb) => s + (sb.quantity || 0), 0);
  const totalRejected   = subBoxes.reduce((s, sb) => s + (sb.client_rejected_count || 0), 0);
  const readyCount      = subBoxes.filter(sb => sb.delivery_status === 'ready_for_delivery').length;
  const deliveredCount  = subBoxes.filter(sb => sb.delivery_status === 'delivered').length;
  const wastagePercentage = totalProduced > 0 ? ((totalWastage / totalProduced) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {printModalSubs && <BarcodePrintModal subBoxes={printModalSubs} onClose={() => setPrintModalSubs(null)} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finished Goods Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track finished goods from production and ready-made inbound receipts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCreateChallan}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
          >
            <FileText className="w-4 h-4" />
            {selectedIds.length > 0 ? `Create Challan (${selectedIds.length})` : 'Create Challan'}
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={printSel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
            >
              <Printer className="w-4 h-4" />
              Print Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={onCreateSubBox}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Record Output
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Sub-Boxes', value: totalSubBoxes,      icon: Layers,        ibg: 'bg-purple-100', icl: 'text-purple-600', vcl: 'text-gray-900',   sub: `${fullCount} full · ${partialCount} partial` },
          { label: 'Good Output',     value: goodCount,          icon: CheckCircle,   ibg: 'bg-emerald-100',icl: 'text-emerald-600',vcl: 'text-emerald-900', sub: `${(totalProduced-totalWastage).toLocaleString()} units` },
          { label: 'Wastage',         value: wastageCount,       icon: XCircle,       ibg: 'bg-red-100',    icl: 'text-red-600',   vcl: 'text-red-900',    sub: `${totalWastage.toLocaleString()} units` },
          { label: 'Wastage Rate',    value: `${wastagePercentage}%`, icon: AlertTriangle, ibg: parseFloat(wastagePercentage)>5?'bg-red-100':'bg-emerald-100', icl: parseFloat(wastagePercentage)>5?'text-red-600':'text-emerald-600', vcl: 'text-gray-900', sub: null },
          { label: 'Client Rejected', value: totalRejected,      icon: AlertTriangle, ibg: 'bg-orange-100', icl: 'text-orange-600', vcl: 'text-orange-900', sub: 'units' },
          { label: 'Ready to Deliver', value: readyCount,        icon: Truck,         ibg: 'bg-blue-100',   icl: 'text-blue-600',  vcl: 'text-blue-900',   sub: `${deliveredCount} delivered` },
        ].map(({ label, value, sub, icon: Icon, ibg, icl, vcl }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
                <p className={`text-2xl font-bold mt-1.5 ${vcl}`}>{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
              </div>
              <div className={`w-9 h-9 flex-shrink-0 ${ibg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-4.5 h-4.5 ${icl}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Partial box info banner */}
      {partialCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            <span className="font-semibold">{partialCount} partial box{partialCount !== 1 ? 'es' : ''}</span> in progress — no barcode until filled.
            Partial boxes and already prepared boxes cannot be selected for new challans.
          </p>
        </div>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, barcode, shift, LC, date..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={e => handleFC(setSearchTerm)(e.target.value)}
          />
        </div>
        {/* Output type */}
        <select
          className="w-full md:w-44 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          value={outputTypeFilter}
          onChange={e => handleFC(setOutputTypeFilter)(e.target.value)}
        >
          <option value="all">All Output Types</option>
          <option value="Good/ QC Approved">Good / QC Approved</option>
          <option value="Wastage">Wastage</option>
        </select>
        {/* Shift */}
        <select
          className="w-full md:w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          value={shiftFilter}
          onChange={e => handleFC(setShiftFilter)(e.target.value)}
        >
          <option value="all">All Shifts</option>
          <option value="Day">Day Shift</option>
          <option value="Night">Night Shift</option>
        </select>
        {/* Box Type — NEW */}
        <select
          className="w-full md:w-36 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          value={boxTypeFilter}
          onChange={e => handleFC(setBoxTypeFilter)(e.target.value)}
        >
          <option value="all">All Box Types</option>
          <option value="Full">Full Only</option>
          <option value="Partial">Partial Only</option>
        </select>
        {/* Delivery Status — NEW */}
        <select
          className="w-full md:w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          value={deliveryFilter}
          onChange={e => handleFC(setDeliveryFilter)(e.target.value)}
        >
          <option value="all">All Delivery</option>
          <option value="delivery_pending">Pending</option>
          <option value="ready_for_delivery">Ready for Delivery</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* Checkbox */}
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-700">
                    {allPgSel
                      ? <CheckSquare className="w-4 h-4 text-blue-600" />
                      : somePgSel
                      ? <CheckSquare className="w-4 h-4 text-blue-300" />
                      : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {[
                  'Sub-Box Name',
                  'Barcode',
                  'Output Type',
                  'Source Type',
                  'LC Number',
                  'Box Type',
                  'Delivery Status',
                  'Quantity',
                  'Client Rejected',
                  'Shift',
                  'Production Date',
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedSubs.length > 0 ? paginatedSubs.map(sb => {
                const hasRej      = (sb.client_rejected_count || 0) > 0;
                const good        = sb.output_type === 'Good/ QC Approved';
                const isPartial   = (sb.box_type || 'Full') === 'Partial';
                const selectable  = isSelectable(sb);
                const isSelected  = selectedIds.includes(sb.id);
                const rowBg       = isSelected ? 'bg-blue-50' : isPartial ? 'bg-amber-50/40' : '';

                return (
                  <tr key={sb.id} className={`hover:bg-gray-50 transition-colors ${rowBg}`}>

                    {/* Checkbox — disabled for partials */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleId(sb.id)}
                        disabled={!selectable}
                        className={`${!selectable ? 'opacity-25 cursor-not-allowed' : 'text-gray-400 hover:text-gray-700'}`}
                      >
                        {isSelected
                          ? <CheckSquare className="w-4 h-4 text-blue-600" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Sub-Box Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold font-mono ${isPartial ? 'text-amber-700' : 'text-gray-800'}`}>
                          {sb.sub_box_name || sb.box_name || '—'}
                        </span>
                        {isPartial && (
                          <span className="text-xs text-amber-500" title="No barcode until filled">⚠</span>
                        )}
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="px-4 py-3.5">
                      {sb.barcode ? (
                        <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
                          <Barcode className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[110px]" title={sb.barcode}>{sb.barcode}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 italic">Pending (partial)</span>
                      )}
                    </td>

                    {/* Output Type */}
                    <td className="px-4 py-3.5">
                      {good ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Good / QC
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" /> Wastage
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <SourceTypeBadge sourceType={sb.sourceType || 'production'} />
                    </td>

                    <td className="px-4 py-3.5 text-sm text-gray-700 whitespace-nowrap">
                      {sb.lc_number || '—'}
                    </td>

                    {/* Box Type — NEW */}
                    <td className="px-4 py-3.5">
                      <BoxTypeBadge type={sb.box_type || 'Full'} />
                    </td>

                    {/* Delivery Status — NEW */}
                    <td className="px-4 py-3.5">
                      {isPartial ? (
                        <span className="text-xs text-gray-400 italic">—</span>
                      ) : (
                        <DeliveryStatusBadge status={sb.delivery_status || 'delivery_pending'} />
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-900">
                      {(sb.quantity || 0).toLocaleString()}
                    </td>

                    {/* Client Rejected */}
                    <td className="px-4 py-3.5">
                      {hasRej ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          <AlertTriangle className="w-3 h-3" />
                          {sb.client_rejected_count.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Shift */}
                    <td className="px-4 py-3.5">
                      {sb.shift ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          sb.shift === 'Day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {sb.shift}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Production Date */}
                    <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                      {sb.production_date
                        ? new Date(sb.production_date).toLocaleDateString()
                        : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        {/* Print — only for full boxes */}
                        <button
                          onClick={() => printOne(sb)}
                          disabled={!sb.barcode}
                          title={sb.barcode ? 'Print Label' : 'No barcode — partial box'}
                          className={`p-1.5 rounded transition-colors ${
                            sb.barcode
                              ? 'text-blue-600 hover:bg-blue-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {/* View */}
                        <button
                          onClick={() => onViewSubBox(sb)}
                          title="View Details"
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Record Rejection — only Good + Full */}
                        {good && !isPartial && (
                          <button
                            onClick={() => onRecordRejection(sb)}
                            title="Record Client Rejection"
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="13" className="px-6 py-12 text-center text-sm text-gray-500">
                    {searchTerm || outputTypeFilter !== 'all' || shiftFilter !== 'all' || boxTypeFilter !== 'all' || deliveryFilter !== 'all'
                      ? 'No sub-boxes found matching your filters.'
                      : (
                        <div>
                          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="mb-4">No production output recorded yet.</p>
                          <button
                            onClick={onCreateSubBox}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Record First Output
                          </button>
                        </div>
                      )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span>–
              <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredSubBoxes.length)}</span> of{' '}
              <span className="font-medium">{filteredSubBoxes.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* High wastage alert */}
      {wastagePercentage > 5 && totalSubBoxes > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-medium">High Wastage Alert</p>
              <p className="mt-1">
                Current wastage rate is {wastagePercentage}%, which exceeds the 5% threshold.
                Please review production processes and quality control measures.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubBoxList;
