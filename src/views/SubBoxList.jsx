import { useState } from 'react';
import {
  Layers, Search, Plus, Eye, AlertTriangle, CheckCircle, XCircle,
  Barcode, Printer, X, CheckSquare, Square, ChevronLeft, ChevronRight,
  FileText
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
function BarcodeSVG({ value, width = 260, height = 60 }) {
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
function barcodeBase64(value) {
  const W = 300, H = 72, fs = 9;
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
function openPrintWindow(sbList) {
  const labels = sbList.map(sb => {
    const src  = barcodeBase64(sb.barcode);
    const good = sb.output_type === 'Good/ QC Approved';
    return `
      <div class="label">
        <div class="label-title">Finished Good Sub-Box</div>
        <div class="box-name">${sb.sub_box_name || sb.box_name || sb.barcode}</div>
        <span class="badge ${good ? 'badge-good' : 'badge-bad'}">${sb.output_type}</span>
        <img class="bc" src="${src}" alt="${sb.barcode}" />
        <div class="meta">
          <span>Date: <b>${sb.production_date}</b></span>
          <span>Shift: <b>${sb.shift}</b></span>
          <span>Qty: <b>${(sb.quantity||0).toLocaleString()}</b></span>
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
  .box-name{font-size:14px;font-weight:700;color:#111827;text-align:center;}
  .badge{font-size:9px;font-weight:700;padding:2px 10px;border-radius:99px;}
  .badge-good{background:#dcfce7;color:#166534;}
  .badge-bad{background:#fee2e2;color:#991b1b;}
  .bc{width:100%;max-width:280px;height:auto;display:block;}
  .meta{width:100%;display:flex;justify-content:space-between;font-size:10px;
    color:#374151;border-top:1px solid #e5e7eb;padding-top:6px;}
  @media print{body{margin:0;}.page{padding:8px;gap:10px;}}
</style>
</head><body>
<div class="page">${labels}</div>
<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script>
</body></html>`;

  const w = window.open('', '_blank', 'width=960,height=700');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ── Print Modal ───────────────────────────────────────────────────────────────
const BarcodePrintModal = ({ subBoxes, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Print Barcode Labels</h2>
          <p className="text-sm text-gray-500 mt-0.5">{subBoxes.length} label{subBoxes.length !== 1 ? 's' : ''} — Code 128 scannable barcodes</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => openPrintWindow(subBoxes)}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
            <Printer className="w-4 h-4" /> Print Labels
          </button>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-6 bg-gray-100">
        <div className="grid grid-cols-2 gap-4">
          {subBoxes.map((sb, idx) => {
            const good = sb.output_type === 'Good/ QC Approved';
            return (
              <div key={idx} className={`bg-white border-2 rounded-lg p-4 flex flex-col items-center gap-2 ${good ? 'border-emerald-300' : 'border-red-300'}`}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finished Good Sub-Box</p>
                <p className="text-base font-bold text-gray-900 text-center">{sb.sub_box_name || sb.box_name || sb.barcode}</p>
                <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${good ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {sb.output_type}
                </span>
                <BarcodeSVG value={sb.barcode} width={240} height={56} />
                <div className="w-full flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                  <span><span className="font-semibold">Date:</span> {sb.production_date}</span>
                  <span><span className="font-semibold">Shift:</span> {sb.shift}</span>
                  <span><span className="font-semibold">Qty:</span> {(sb.quantity||0).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-xl flex-shrink-0">
        <p className="text-xs text-gray-400 text-center">Allow pop-ups for printing. Set paper to A4, disable headers/footers.</p>
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const SubBoxList = ({ subBoxes, boxes, onCreateSubBox, onViewSubBox, onRecordRejection, onCreateChallan }) => {
  const [searchTerm, setSearchTerm]             = useState('');
  const [outputTypeFilter, setOutputTypeFilter] = useState('all');
  const [shiftFilter, setShiftFilter]           = useState('all');
  const [currentPage, setCurrentPage]           = useState(1);
  const [selectedIds, setSelectedIds]           = useState([]);
  const [printModalSubs, setPrintModalSubs]     = useState(null);
  const itemsPerPage = 10;

  const filteredSubBoxes = subBoxes.filter(sb => {
    const q = searchTerm.toLowerCase();
    const ok = !searchTerm ||
      sb.barcode?.toLowerCase().includes(q) ||
      sb.shift?.toLowerCase().includes(q) ||
      sb.box_name?.toLowerCase().includes(q) ||
      sb.sub_box_name?.toLowerCase().includes(q) ||
      sb.production_date?.includes(q);
    const matchType  = outputTypeFilter === 'all' || sb.output_type === outputTypeFilter;
    const matchShift = shiftFilter === 'all' || sb.shift === shiftFilter;
    return ok && matchType && matchShift;
  });

  const totalPages    = Math.ceil(filteredSubBoxes.length / itemsPerPage);
  const startIndex    = (currentPage - 1) * itemsPerPage;
  const paginatedSubs = filteredSubBoxes.slice(startIndex, startIndex + itemsPerPage);
  const handleFC = (setter) => (v) => { setter(v); setCurrentPage(1); };

  // Selection
  const toggleId  = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const pageIds   = paginatedSubs.map(b => b.id);
  const allPgSel  = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const somePgSel = pageIds.some(id => selectedIds.includes(id));
  const toggleAll = () => {
    if (allPgSel) setSelectedIds(p => p.filter(id => !pageIds.includes(id)));
    else setSelectedIds(p => [...new Set([...p, ...pageIds])]);
  };

  const printOne  = (sb) => setPrintModalSubs([sb]);
  const printSel  = ()   => setPrintModalSubs(subBoxes.filter(b => selectedIds.includes(b.id)));

  // Challan handlers
  const handleCreateChallan = () => {
    // selectedIds may be empty (open mode) or populated (pre-fill mode)
    if (onCreateChallan) onCreateChallan(selectedIds);
  };

  // Stats
  const totalSubBoxes = subBoxes.length;
  const goodCount     = subBoxes.filter(sb => sb.output_type === 'Good/ QC Approved').length;
  const wastageCount  = subBoxes.filter(sb => sb.output_type === 'Wastage').length;
  const totalProduced = subBoxes.reduce((s, sb) => s + (sb.quantity || 0), 0);
  const totalWastage  = subBoxes.filter(sb => sb.output_type === 'Wastage').reduce((s, sb) => s + (sb.quantity || 0), 0);
  const totalRejected = subBoxes.reduce((s, sb) => s + (sb.client_rejected_count || 0), 0);
  const wastagePercentage = totalProduced > 0 ? ((totalWastage / totalProduced) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {printModalSubs && <BarcodePrintModal subBoxes={printModalSubs} onClose={() => setPrintModalSubs(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finished Goods Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track production output, quality, and client rejections</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Create Challan — always visible */}
          <button onClick={handleCreateChallan}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold">
            <FileText className="w-4 h-4" />
            {selectedIds.length > 0 ? `Create Challan (${selectedIds.length})` : 'Create Challan'}
          </button>

          {selectedIds.length > 0 && (
            <button onClick={printSel}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold">
              <Printer className="w-4 h-4" />
              Print Selected ({selectedIds.length})
            </button>
          )}
          <button onClick={onCreateSubBox}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold">
            <Plus className="w-4 h-4" />
            Record Output
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Sub-Boxes', value: totalSubBoxes, sub: null, icon: Layers, ibg: 'bg-purple-100', icl: 'text-purple-600', vcl: 'text-gray-900' },
          { label: 'Good Output', value: goodCount, sub: `${(totalProduced-totalWastage).toLocaleString()} units`, icon: CheckCircle, ibg: 'bg-green-100', icl: 'text-green-600', vcl: 'text-green-900' },
          { label: 'Wastage', value: wastageCount, sub: `${totalWastage.toLocaleString()} units`, icon: XCircle, ibg: 'bg-red-100', icl: 'text-red-600', vcl: 'text-red-900' },
          { label: 'Wastage Rate', value: `${wastagePercentage}%`, sub: null, icon: AlertTriangle, ibg: parseFloat(wastagePercentage)>5?'bg-red-100':'bg-green-100', icl: parseFloat(wastagePercentage)>5?'text-red-600':'text-green-600', vcl: 'text-gray-900' },
          { label: 'Client Rejected', value: totalRejected, sub: 'units', icon: AlertTriangle, ibg: 'bg-orange-100', icl: 'text-orange-600', vcl: 'text-orange-900' },
        ].map(({ label, value, sub, icon: Icon, ibg, icl, vcl }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className={`text-3xl font-bold mt-2 ${vcl}`}>{value}</p>
                {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
              </div>
              <div className={`w-12 h-12 ${ibg} rounded-lg flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${icl}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Search by name, barcode, shift, date..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm} onChange={e => handleFC(setSearchTerm)(e.target.value)} />
        </div>
        <select className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={outputTypeFilter} onChange={e => handleFC(setOutputTypeFilter)(e.target.value)}>
          <option value="all">All Output Types</option>
          <option value="Good/ QC Approved">Good / QC Approved</option>
          <option value="Wastage">Wastage</option>
        </select>
        <select className="w-full md:w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={shiftFilter} onChange={e => handleFC(setShiftFilter)(e.target.value)}>
          <option value="all">All Shifts</option>
          <option value="Day">Day Shift</option>
          <option value="Night">Night Shift</option>
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
                {['Sub Box Name','Barcode','Output Type','Quantity','Client Rejected','Shift','Production Date'].map(h => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedSubs.length > 0 ? paginatedSubs.map(sb => {
                const hasRej   = (sb.client_rejected_count || 0) > 0;
                const good     = sb.output_type === 'Good/ QC Approved';
                const isSelected = selectedIds.includes(sb.id);
                return (
                  <tr key={sb.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4">
                      <button onClick={() => toggleId(sb.id)} className="text-gray-400 hover:text-gray-700">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Sub Box Name — NEW COLUMN */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-800 font-mono">
                        {sb.sub_box_name || sb.box_name || '—'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
                        <Barcode className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-[120px]" title={sb.barcode}>{sb.barcode || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {good ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />Good / QC Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />Wastage
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sb.quantity.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {hasRej ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                          <AlertTriangle className="w-3 h-3" />{sb.client_rejected_count.toLocaleString()}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{sb.shift}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(sb.production_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => printOne(sb)} title="Print Barcode"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={() => onViewSubBox(sb)} title="View Details"
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        {good && (
                          <button onClick={() => onRecordRejection(sb)} title="Record Client Rejection"
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors">
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-sm text-gray-500">
                    {searchTerm || outputTypeFilter !== 'all' || shiftFilter !== 'all'
                      ? 'No sub-boxes found matching your filters.'
                      : <div>
                          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="mb-4">No production output recorded yet.</p>
                          <button onClick={onCreateSubBox} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Record First Output</button>
                        </div>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex+1}</span>–
              <span className="font-medium">{Math.min(startIndex+itemsPerPage,filteredSubBoxes.length)}</span> of{' '}
              <span className="font-medium">{filteredSubBoxes.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {wastagePercentage > 5 && totalSubBoxes > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-medium">High Wastage Alert</p>
              <p className="mt-1">Current wastage rate is {wastagePercentage}%, which exceeds the 5% threshold. Please review production processes and quality control measures.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubBoxList;