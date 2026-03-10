import { useState, useRef, useEffect } from 'react';
import {
  ChevronRight, Scan, X, FileText, Printer,
  Package, Plus, CheckCircle, AlertCircle, Building2,
  Mail, Globe, MapPin, Hash, Calendar, User
} from 'lucide-react';

// ── Company info ──────────────────────────────────────────────────────────────
const COMPANY = {
  name: 'Onestra Ltd.',
  group: 'Quintus Group',
  address: 'Dhaka, Bangladesh',
  phone: '+880 1XXXXXXXXX',
  email: 'info@quintusgroup.org',
  website: 'quintusgroup.org/onestra-ltd',
};

function generateChallanNo() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `CH-${y}${m}-${rand}`;
}

// ── PDF — clean layout, no output summary or shift breakdown ─────────────────
function openChallanPrint(challanData, items) {
  const totalQty = items.reduce((s, sb) => s + (sb.quantity || 0), 0);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Delivery Challan ${challanData.challan_no}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#fff;padding:32px;}
  .challan{max-width:780px;margin:0 auto;border:2px solid #1f2937;border-radius:10px;overflow:hidden;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;
    padding:26px 30px;background:#1f2937;color:#fff;}
  .co-name{font-size:24px;font-weight:800;letter-spacing:-0.5px;}
  .co-sub{font-size:11px;color:#9ca3af;margin-top:3px;font-weight:500;}
  .co-meta{font-size:10px;color:#d1d5db;margin-top:10px;line-height:1.9;}
  .ch-badge{text-align:right;}
  .ch-label{font-size:11px;font-weight:700;color:#f59e0b;letter-spacing:2.5px;text-transform:uppercase;}
  .ch-no{font-size:22px;font-weight:800;color:#fff;margin-top:3px;letter-spacing:-0.5px;}
  .ch-date{font-size:11px;color:#9ca3af;margin-top:5px;}
  .body{padding:28px 30px;}
  .meta-strip{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:28px;}
  .meta-box{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:13px 16px;}
  .meta-label{font-size:9px;font-weight:700;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;}
  .meta-value{font-size:15px;font-weight:700;color:#111827;}
  .meta-sub{font-size:10px;color:#6b7280;margin-top:2px;}
  .remarks-box{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:20px;}
  .remarks-label{font-size:9px;font-weight:700;color:#92400e;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;}
  .remarks-text{font-size:12px;color:#78350f;}
  .footer{padding:18px 30px;border-top:1.5px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end;}
  .footer-note{font-size:10px;color:#9ca3af;line-height:1.6;}
  .sig-area{text-align:center;}
  .sig-line{border-top:1.5px solid #374151;padding-top:5px;font-size:10px;color:#6b7280;width:160px;}
  @media print{body{padding:0;}@page{margin:12mm;size:A4;}}
</style>
</head><body>
<div class="challan">
  <div class="header">
    <div>
      <div class="co-name">${COMPANY.name}</div>
      <div class="co-sub">${COMPANY.group}</div>
      <div class="co-meta">
        📍 ${COMPANY.address}<br/>
        📞 ${COMPANY.phone} &nbsp;·&nbsp; ✉ ${COMPANY.email}<br/>
        🌐 ${COMPANY.website}
      </div>
    </div>
    <div class="ch-badge">
      <div class="ch-label">Delivery Challan</div>
      <div class="ch-no">${challanData.challan_no}</div>
      <div class="ch-date">Date: ${challanData.date}</div>
    </div>
  </div>
  <div class="body">
    <div class="meta-strip">
      <div class="meta-box">
        <div class="meta-label">Prepared By</div>
        <div class="meta-value">${challanData.prepared_by || 'Production Staff'}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Total Sub-Boxes</div>
        <div class="meta-value">${items.length}</div>
        <div class="meta-sub">boxes dispatched</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Total Quantity</div>
        <div class="meta-value">${totalQty.toLocaleString()}</div>
        <div class="meta-sub">units</div>
      </div>
    </div>
    ${challanData.remarks ? `
    <div class="remarks-box">
      <div class="remarks-label">Remarks</div>
      <div class="remarks-text">${challanData.remarks}</div>
    </div>` : ''}
  </div>
  <div class="footer">
    <div class="footer-note">
      This is a system-generated challan from Onestra ERP.<br/>
      Challan No: ${challanData.challan_no} · Generated: ${new Date().toLocaleString()}
    </div>
    <div class="sig-area">
      <div class="sig-line">Authorized Signature</div>
    </div>
  </div>
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
    <div className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/20 transition-all group">
      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
        <Package className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {sb.sub_box_name || sb.box_name || sb.barcode}
          </p>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
            good ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {good ? 'Good' : 'Wastage'}
          </span>
        </div>
        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{sb.barcode}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-800">{(sb.quantity || 0).toLocaleString()}</p>
        <p className="text-xs text-gray-400">units</p>
      </div>
      <button onClick={() => onRemove(sb.id)}
        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
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
  const [addedIds, setAddedIds]       = useState(preSelectedIds);
  const [challanInfo, setChallanInfo] = useState({
    challan_no:  generateChallanNo(),
    date:        new Date().toISOString().split('T')[0],
    prepared_by: 'Production Staff',
    remarks:     '',
  });

  useEffect(() => { scanInputRef.current?.focus(); }, []);

  const addedBoxes = subBoxes.filter(sb => addedIds.includes(sb.id));
  const totalQty   = addedBoxes.reduce((s, sb) => s + (sb.quantity || 0), 0);

  const handleScan = (e) => {
    e.preventDefault();
    const val = scanValue.trim();
    if (!val) return;
    const found = subBoxes.find(sb =>
      sb.barcode === val || sb.sub_box_name === val || sb.box_name === val
    );
    if (!found) {
      setScanError(`No sub-box found for barcode: "${val}"`);
      setScanValue('');
      return;
    }
    if (addedIds.includes(found.id)) {
      setScanError(`Already added: ${found.sub_box_name || found.barcode}`);
      setScanValue('');
      return;
    }
    setAddedIds(prev => [...prev, found.id]);
    setScanValue('');
    setScanError('');
    scanInputRef.current?.focus();
  };

  const handleRemove = (id) => setAddedIds(prev => prev.filter(x => x !== id));
  const handlePrint  = () => { if (addedBoxes.length > 0) openChallanPrint(challanInfo, addedBoxes); };

  // Shift chip counts
  const shiftCounts = {};
  addedBoxes.forEach(sb => { shiftCounts[sb.shift] = (shiftCounts[sb.shift] || 0) + 1; });

  return (
    <div className="flex flex-col gap-5">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Delivery Challan</h1>
          <p className="text-sm text-gray-400 mt-0.5">Scan sub-box barcodes and fill challan details</p>
        </div>
      </div>

      {/* Body — LEFT narrow scanner | RIGHT wider info */}
      <div className="flex gap-5 items-start">

        {/* ══ LEFT ── scanner + scanned list ══════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ width: '1000px', flexShrink: 0, minHeight: '600px' }}>

          {/* Scanner header block */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <Scan className="w-4.5 h-4.5 text-white w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Scan Box Barcode</p>
                <p className="text-xs text-gray-400">Use scanner or type manually, then press Enter</p>
              </div>
            </div>

            {/* Input */}
            <form onSubmit={handleScan} className="flex gap-2">
              <input
                ref={scanInputRef}
                value={scanValue}
                onChange={e => { setScanValue(e.target.value); setScanError(''); }}
                placeholder="Scan or type barcode here..."
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all font-mono"
              />
              <button type="submit"
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-sm font-bold whitespace-nowrap">
                Add Box
              </button>
            </form>

            {scanError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {scanError}
              </div>
            )}
          </div>

          {/* Queued count bar */}
          <div className={`px-5 py-2.5 flex items-center justify-between border-b border-gray-100 ${
            addedBoxes.length > 0 ? 'bg-gray-50' : 'bg-white'
          }`}>
            <span className="text-xs font-semibold text-gray-500">
              {addedBoxes.length} box{addedBoxes.length !== 1 ? 'es' : ''} queued
            </span>
            <div className="flex items-center gap-1.5">
              {Object.entries(shiftCounts).map(([sh, n]) => (
                <span key={sh} className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  sh === 'Day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                }`}>{sh} {n}</span>
              ))}
            </div>
          </div>

          {/* Scrollable scanned list */}
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: '440px' }}>
            {addedBoxes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Scan className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">No boxes scanned yet</p>
                <p className="text-xs text-gray-400 mt-1">Scan a barcode above to begin</p>
              </div>
            ) : (
              <div className="space-y-2">
                {addedBoxes.map(sb => (
                  <SubBoxRow key={sb.id} sb={sb} onRemove={handleRemove} />
                ))}
              </div>
            )}
          </div>

          {/* Total footer */}
          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Quantity</span>
              <span className="text-base font-bold text-gray-900">{totalQty.toLocaleString()} <span className="text-sm font-normal text-gray-500">units</span></span>
            </div>
          </div>
        </div>

        {/* ══ RIGHT ── challan info + buttons ════════════════════════ */}
        <div className="flex-1 flex flex-col gap-4">

          {/* Challan info card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Issue Context</p>
            </div>
            <div className="px-6 py-5 space-y-5">

              {/* Challan No + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    <Hash className="w-3.5 h-3.5" /> Challan No.
                  </label>
                  <input value={challanInfo.challan_no} readOnly
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono text-gray-600 cursor-default" />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    <Calendar className="w-3.5 h-3.5" /> Challan Date
                  </label>
                  <input type="date" value={challanInfo.date}
                    onChange={e => setChallanInfo(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>
              </div>

              {/* Prepared By */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  <User className="w-3.5 h-3.5" /> Prepared By
                </label>
                <input value={challanInfo.prepared_by}
                  onChange={e => setChallanInfo(p => ({ ...p, prepared_by: e.target.value }))}
                  placeholder="Staff name or department..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>

              {/* Remarks */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  <FileText className="w-3.5 h-3.5" /> Remarks
                  <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <textarea rows={3} value={challanInfo.remarks}
                  onChange={e => setChallanInfo(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="Any notes for this challan..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
              </div>
            </div>
          </div>

          {/* Summary strip when items are added */}
          {/* {addedBoxes.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-900">
                    {addedBoxes.length} Sub-Box{addedBoxes.length !== 1 ? 'es' : ''} Ready for Challan
                  </p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {totalQty.toLocaleString()} units · {challanInfo.challan_no}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                Ready
              </span>
            </div>
          )} */}

          {/* Company info */}
          {/* <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">
                  {COMPANY.name}
                  <span className="text-xs font-normal text-gray-400 ml-2">{COMPANY.group}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                  <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{COMPANY.address}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />{COMPANY.email}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Globe className="w-3 h-3" />{COMPANY.website}</span>
                </div>
              </div>
            </div>
          </div> */}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button onClick={handlePrint} disabled={addedBoxes.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl transition-all ${
                addedBoxes.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              }`}>
              <Printer className="w-4 h-4" />
              {addedBoxes.length > 0
                ? `Preview & Print Challan `
                : 'Preview & Print Challan'}
            </button>
            <button onClick={onBack}
              className="w-full py-3 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateChallan;