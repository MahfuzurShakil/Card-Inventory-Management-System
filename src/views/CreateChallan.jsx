import { useState, useRef, useEffect } from 'react';
import {
  ChevronRight, Scan, X, FileText, Printer,
  Package, Plus, CheckCircle, AlertCircle,
  Hash, Calendar, User, AlertTriangle, Search
} from 'lucide-react';

// ── Company info ──────────────────────────────────────────────────────────────
const COMPANY = {
  name: 'Onestra Ltd.',
  group: 'Quintus Group',
  address: 'Dhaka, Bangladesh',
  phone: '+880 1XXXXXXXXX',
  email: 'info@quintusgroup.org',
};

function generateChallanNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `CH-${y}${m}-${rand}`;
}

// ── Print window — proper packing list challan ────────────────────────────────
function openChallanPrint(challanData, items) {
  const totalQty      = items.reduce((s, sb) => s + (sb.quantity || 0), 0);
  const totalBoxCount = items.length;

  // Group items by shift for summary section
  const shiftGroups = items.reduce((acc, sb) => {
    const key = `${sb.production_date || ''} ${sb.shift || ''}`;
    if (!acc[key]) acc[key] = { date: sb.production_date, shift: sb.shift, count: 0, qty: 0 };
    acc[key].count += 1;
    acc[key].qty   += sb.quantity || 0;
    return acc;
  }, {});

  const shiftSummaryRows = Object.values(shiftGroups).map((g, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${g.date || '—'}</td>
      <td>${g.shift || '—'} Shift</td>
      <td class="num">${g.count}</td>
      <td class="num">${(g.qty || 0).toLocaleString()}</td>
    </tr>`).join('');

  const boxRows = items.map((sb, i) => {
    const good = sb.output_type === 'Good/ QC Approved';
    return `
    <tr>
      <td class="num">${i + 1}</td>
      <td class="mono">${sb.sub_box_name || sb.box_name || '—'}</td>
      <td class="mono small">${sb.barcode || '—'}</td>
      <td>${sb.production_date || '—'}</td>
      <td>${(sb.shift || '') + ' Shift'}</td>
      <td>${good ? 'QC Approved' : 'Wastage'}</td>
      <td class="num">${(sb.quantity || 0).toLocaleString()}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Delivery Challan ${challanData.challan_no}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; padding: 20px 24px; }

  /* ── Page header ── */
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px; }
  .company-name { font-size: 18px; font-weight: 900; letter-spacing: -0.5px; }
  .company-sub  { font-size: 10px; color: #555; margin-top: 2px; }
  .company-meta { font-size: 9px; color: #555; margin-top: 6px; line-height: 1.7; }
  .challan-title { text-align: right; }
  .challan-title h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
  .challan-no { font-size: 14px; font-weight: 700; margin-top: 3px; }
  .challan-date { font-size: 10px; color: #555; margin-top: 2px; }

  /* ── Meta strip ── */
  .meta-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; border: 1px solid #000; padding: 8px 10px; margin-bottom: 12px; }
  .meta-item label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; display: block; margin-bottom: 2px; }
  .meta-item span  { font-size: 11px; font-weight: 600; }

  /* ── Section title ── */
  .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin: 12px 0 5px 0; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #000; color: #fff; padding: 5px 7px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 4px 7px; border-bottom: 1px solid #ddd; vertical-align: middle; }
  tr:nth-child(even) td { background: #f9f9f9; }
  .num   { text-align: right; }
  .mono  { font-family: 'Courier New', monospace; font-size: 9px; }
  .small { font-size: 8.5px; }

  /* ── Totals bar ── */
  .totals-bar { display: flex; justify-content: flex-end; gap: 20px; border-top: 2px solid #000; padding-top: 6px; margin-top: 2px; font-size: 11px; }
  .totals-bar .item { display: flex; gap: 6px; }
  .totals-bar .lbl  { color: #555; }
  .totals-bar .val  { font-weight: 900; }

  /* ── Remarks ── */
  .remarks-box { border: 1px solid #000; padding: 6px 10px; margin-top: 12px; min-height: 36px; }
  .remarks-box .lbl { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 3px; }

  /* ── Signature section ── */
  .sig-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 28px; }
  .sig-block { border-top: 1px solid #000; padding-top: 4px; }
  .sig-block .title  { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .sig-block .detail { font-size: 8px; color: #555; margin-top: 2px; }

  /* ── Footer ── */
  .page-footer { margin-top: 16px; border-top: 1px solid #ccc; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8px; color: #888; }

  @media print {
    body { padding: 10mm 12mm; }
    @page { margin: 10mm; size: A4; }
  }
</style>
</head><body>

<!-- Page Header -->
<div class="page-header">
  <div>
    <div class="company-name">${COMPANY.name}</div>
    <div class="company-sub">${COMPANY.group}</div>
    <div class="company-meta">
      ${COMPANY.address}<br>
      Tel: ${COMPANY.phone} &nbsp;|&nbsp; Email: ${COMPANY.email}
    </div>
  </div>
  <div class="challan-title">
    <h1>Delivery Challan</h1>
    <div class="challan-no">No: ${challanData.challan_no}</div>
    <div class="challan-date">Date: ${challanData.date}</div>
  </div>
</div>

<!-- Meta Strip -->
<div class="meta-strip">
  <div class="meta-item">
    <label>Prepared By</label>
    <span>${challanData.prepared_by || '—'}</span>
  </div>
  <div class="meta-item">
    <label>Total Boxes Dispatched</label>
    <span>${totalBoxCount}</span>
  </div>
  <div class="meta-item">
    <label>Total Quantity (units)</label>
    <span>${totalQty.toLocaleString()}</span>
  </div>
</div>

<!-- Shift Summary -->
<div class="section-title">Shift Breakdown</div>
<table>
  <thead>
    <tr>
      <th style="width:30px">#</th>
      <th>Production Date</th>
      <th>Shift</th>
      <th class="num">Boxes</th>
      <th class="num">Units</th>
    </tr>
  </thead>
  <tbody>
    ${shiftSummaryRows}
  </tbody>
</table>

<!-- Box Detail -->
<div class="section-title" style="margin-top:14px">Box Details</div>
<table>
  <thead>
    <tr>
      <th style="width:28px">#</th>
      <th style="width:130px">Box Name</th>
      <th style="width:140px">Barcode</th>
      <th style="width:90px">Prod. Date</th>
      <th style="width:80px">Shift</th>
      <th style="width:80px">Type</th>
      <th class="num" style="width:60px">Qty</th>
    </tr>
  </thead>
  <tbody>
    ${boxRows}
  </tbody>
</table>

<!-- Totals -->
<div class="totals-bar">
  <div class="item"><span class="lbl">Total Boxes:</span><span class="val">${totalBoxCount}</span></div>
  <div class="item"><span class="lbl">Total Units:</span><span class="val">${totalQty.toLocaleString()}</span></div>
</div>

<!-- Remarks -->
${challanData.remarks ? `
<div class="remarks-box">
  <div class="lbl">Remarks</div>
  <div>${challanData.remarks}</div>
</div>` : ''}

<!-- Signatures -->
<div class="sig-section">
  <div class="sig-block">
    <div class="title">Prepared By</div>
    <div class="detail">${challanData.prepared_by || 'Production Staff'}</div>
    <div class="detail" style="margin-top:22px">Date: ________________</div>
  </div>
  <div class="sig-block">
    <div class="title">Checked By</div>
    <div class="detail">&nbsp;</div>
    <div class="detail" style="margin-top:22px">Date: ________________</div>
  </div>
  <div class="sig-block">
    <div class="title">Received By</div>
    <div class="detail">Name: ________________________</div>
    <div class="detail" style="margin-top:6px">Date: ________________</div>
  </div>
</div>

<!-- Footer -->
<div class="page-footer">
  <span>System-generated document · ${COMPANY.name} ERP</span>
  <span>Challan No: ${challanData.challan_no} · Printed: ${new Date().toLocaleString()}</span>
</div>

<script>window.onload=function(){setTimeout(function(){window.print();},600);};<\/script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=800');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ── Scanned sub-box row ───────────────────────────────────────────────────────
const SubBoxRow = ({ sb, onRemove }) => {
  const good = sb.output_type === 'Good/ QC Approved';
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-100 rounded-lg hover:border-gray-300 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold font-mono text-gray-900 truncate">
            {sb.sub_box_name || sb.box_name || sb.barcode}
          </span>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
            good ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            {good ? 'QC' : 'Wastage'}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
            sb.shift === 'Day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {sb.shift}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{sb.barcode || '—'}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-800">{(sb.quantity || 0).toLocaleString()}</p>
        <p className="text-xs text-gray-400">{sb.production_date}</p>
      </div>
      <button onClick={() => onRemove(sb.id)}
        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const CreateChallan = ({ subBoxes, preSelectedIds = [], onBack }) => {
  const scanInputRef = useRef(null);
  const [scanValue, setScanValue]     = useState('');
  const [scanError, setScanError]     = useState('');
  const [searchTerm, setSearchTerm]   = useState('');
  const [addedIds, setAddedIds]       = useState(preSelectedIds);
  const [showBrowse, setShowBrowse]   = useState(false);
  const [challanInfo, setChallanInfo] = useState({
    challan_no:  generateChallanNo(),
    date:        new Date().toISOString().split('T')[0],
    prepared_by: 'Production Staff',
    remarks:     '',
  });

  useEffect(() => { if (!showBrowse) scanInputRef.current?.focus(); }, [showBrowse]);

  const addedBoxes = subBoxes.filter(sb => addedIds.includes(sb.id));
  const totalQty   = addedBoxes.reduce((s, sb) => s + (sb.quantity || 0), 0);

  // Dispatchable boxes = full boxes with barcode, not yet dispatched
  const dispatchableBoxes = subBoxes.filter(sb =>
    sb.barcode &&
    sb.box_type !== 'Partial' &&
    sb.delivery_status !== 'Dispatched' &&
    !addedIds.includes(sb.id)
  );

  const filteredBrowse = dispatchableBoxes.filter(sb => {
    const q = searchTerm.toLowerCase();
    return !q ||
      (sb.sub_box_name || sb.box_name || '').toLowerCase().includes(q) ||
      (sb.barcode || '').toLowerCase().includes(q) ||
      (sb.production_date || '').includes(q) ||
      (sb.shift || '').toLowerCase().includes(q);
  });

  const handleScan = (e) => {
    e?.preventDefault();
    const val = scanValue.trim();
    if (!val) return;
    const found = subBoxes.find(sb =>
      sb.barcode === val || sb.sub_box_name === val || sb.box_name === val
    );
    if (!found) { setScanError(`No box found for: "${val}"`); setScanValue(''); return; }
    if (!found.barcode) { setScanError('This is a partial box — no barcode yet'); setScanValue(''); return; }
    if (addedIds.includes(found.id)) { setScanError(`Already added: ${found.sub_box_name || found.barcode}`); setScanValue(''); return; }
    setAddedIds(prev => [...prev, found.id]);
    setScanValue('');
    setScanError('');
    scanInputRef.current?.focus();
  };

  const handleAddFromBrowse = (sb) => {
    if (!addedIds.includes(sb.id)) {
      setAddedIds(prev => [...prev, sb.id]);
    }
  };

  const handleAddAllFiltered = () => {
    const newIds = filteredBrowse.map(sb => sb.id).filter(id => !addedIds.includes(id));
    setAddedIds(prev => [...prev, ...newIds]);
  };

  const handleRemove = (id) => setAddedIds(prev => prev.filter(x => x !== id));

  const handlePrint = () => {
    if (addedBoxes.length > 0) openChallanPrint(challanInfo, addedBoxes);
  };

  // Summary stats
  const goodCount    = addedBoxes.filter(sb => sb.output_type === 'Good/ QC Approved').length;
  const wastageCount = addedBoxes.filter(sb => sb.output_type !== 'Good/ QC Approved').length;
  const dayCount     = addedBoxes.filter(sb => sb.shift === 'Day').length;
  const nightCount   = addedBoxes.filter(sb => sb.shift === 'Night').length;

  return (
    <div className="flex flex-col gap-5">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Delivery Challan</h1>
          <p className="text-sm text-gray-400 mt-0.5">Scan or browse boxes, then print a formal packing challan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

        {/* ══ LEFT (col-span-3): scan + box list ════════════════════════════ */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Scan input */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Scan className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Scan Barcode</p>
                  <p className="text-xs text-gray-400">Use scanner or type, then press Enter</p>
                </div>
              </div>
              <form onSubmit={handleScan} className="flex gap-2">
                <input
                  ref={scanInputRef}
                  value={scanValue}
                  onChange={e => { setScanValue(e.target.value); setScanError(''); }}
                  placeholder="Scan or type barcode..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button type="submit"
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors">
                  Add
                </button>
                <button type="button"
                  onClick={() => setShowBrowse(!showBrowse)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                    showBrowse ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  Browse
                </button>
              </form>
              {scanError && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {scanError}
                </div>
              )}
            </div>

            {/* Browse panel */}
            {showBrowse && (
              <div className="border-b border-gray-100">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search by box name, barcode, date, shift..."
                    className="flex-1 text-sm bg-transparent border-none outline-none"
                    autoFocus
                  />
                  {filteredBrowse.length > 0 && (
                    <button
                      onClick={handleAddAllFiltered}
                      className="flex-shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      Add all ({filteredBrowse.length})
                    </button>
                  )}
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {filteredBrowse.length > 0 ? filteredBrowse.map(sb => {
                    const good = sb.output_type === 'Good/ QC Approved';
                    return (
                      <div key={sb.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold font-mono text-gray-800">{sb.sub_box_name || sb.box_name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${good ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {good ? 'QC' : 'Waste'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{sb.production_date} · {sb.shift} · {(sb.quantity || 0).toLocaleString()} units</p>
                        </div>
                        <button
                          onClick={() => handleAddFromBrowse(sb)}
                          className="flex-shrink-0 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-gray-400 text-center py-6">
                      {searchTerm ? 'No boxes match your search' : 'All dispatchable boxes already added'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Stats bar */}
            {addedBoxes.length > 0 && (
              <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-gray-600">
                  {addedBoxes.length} box{addedBoxes.length !== 1 ? 'es' : ''} · {totalQty.toLocaleString()} units
                </span>
                <div className="flex items-center gap-2">
                  {goodCount > 0 && <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 font-semibold rounded">QC {goodCount}</span>}
                  {wastageCount > 0 && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 font-semibold rounded">Waste {wastageCount}</span>}
                  {dayCount > 0 && <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 font-semibold rounded">Day {dayCount}</span>}
                  {nightCount > 0 && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 font-semibold rounded">Night {nightCount}</span>}
                </div>
              </div>
            )}

            {/* Box list */}
            <div className="max-h-96 overflow-y-auto">
              {addedBoxes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">No boxes added yet</p>
                  <p className="text-xs text-gray-300 mt-1">Scan a barcode or use Browse to add boxes</p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {addedBoxes.map(sb => (
                    <SubBoxRow key={sb.id} sb={sb} onRemove={handleRemove} />
                  ))}
                </div>
              )}
            </div>

            {/* Total footer */}
            {addedBoxes.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</span>
                <span className="text-sm font-bold text-gray-900">
                  {totalQty.toLocaleString()} units · {addedBoxes.length} boxes
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT (col-span-2): challan info + preview + print ════════════ */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Challan info */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Challan Details</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    <Hash className="w-3 h-3 inline mr-1" />Challan No.
                  </label>
                  <input value={challanInfo.challan_no} readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50 font-mono text-gray-600 cursor-default" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    <Calendar className="w-3 h-3 inline mr-1" />Date
                  </label>
                  <input type="date" value={challanInfo.date}
                    onChange={e => setChallanInfo(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  <User className="w-3 h-3 inline mr-1" />Prepared By
                </label>
                <input value={challanInfo.prepared_by}
                  onChange={e => setChallanInfo(p => ({ ...p, prepared_by: e.target.value }))}
                  placeholder="Name / Department"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  <FileText className="w-3 h-3 inline mr-1" />Remarks
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <textarea rows={2} value={challanInfo.remarks}
                  onChange={e => setChallanInfo(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="Any notes..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white resize-none focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
            </div>
          </div>

          {/* Challan preview card (simplified) */}
          {addedBoxes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Preview</p>
                <span className="text-xs text-gray-400">Print is black & white A4</span>
              </div>
              <div className="p-4 font-mono text-xs text-gray-700 bg-white border-2 border-dashed border-gray-200 rounded-lg m-3 space-y-2">
                <div className="font-bold text-sm text-gray-900">{COMPANY.name}</div>
                <div className="text-gray-500">{COMPANY.group}</div>
                <div className="border-t border-gray-300 pt-2 flex justify-between">
                  <span><span className="font-bold">DELIVERY CHALLAN</span></span>
                  <span>{challanInfo.challan_no}</span>
                </div>
                <div className="text-gray-500">Date: {challanInfo.date}</div>
                <div className="border-t border-gray-300 pt-2 text-gray-600">
                  <div>Prepared by: {challanInfo.prepared_by}</div>
                  <div>Boxes: {addedBoxes.length} &nbsp;|&nbsp; Units: {totalQty.toLocaleString()}</div>
                </div>
                <div className="border-t border-gray-300 pt-2 text-gray-500 text-xs">
                  [Shift Breakdown Table]<br />
                  [Box Details Table — {addedBoxes.length} rows]<br />
                  [Signature Block — Prepared / Checked / Received]
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button onClick={handlePrint} disabled={addedBoxes.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl transition-all ${
                addedBoxes.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-gray-900 hover:bg-gray-700 text-white shadow-sm'
              }`}>
              <Printer className="w-4 h-4" />
              {addedBoxes.length > 0 ? `Print Challan (${addedBoxes.length} boxes)` : 'Add Boxes to Print'}
            </button>
            <button onClick={onBack}
              className="w-full py-3 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>

          {/* No partial box warning */}
          {subBoxes.filter(sb => sb.box_type === 'Partial' && !addedIds.includes(sb.id)).length > 0 && (
            <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Partial boxes</span> cannot be added to a challan — they have no barcode yet.
                Close them first on the Sub-Box Creation page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateChallan;