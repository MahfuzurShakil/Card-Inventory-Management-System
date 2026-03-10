import {
  ChevronRight, Hash, Calendar, FileText,
  CheckCircle, XCircle, AlertTriangle, Clock,
  Factory, Ship, FileCheck, Package, Paperclip, Download, Printer
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
function BarcodeSVG({ value, width = 320, height = 80, fontSize = 11 }) {
  const bits = encode128(value);
  const mw   = width / bits.length;
  const barH = height - fontSize - 6;
  const rects = [];
  let x = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') rects.push(<rect key={i} x={x} y={0} width={mw} height={barH} fill="#000" />);
    x += mw;
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width={width} height={height} fill="white" />
      {rects}
      <text x={width / 2} y={height - 2} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">{value}</text>
    </svg>
  );
}
function barcodeBase64(value) {
  const W = 360, H = 90, fs = 11;
  const bits = encode128(value);
  const mw   = W / bits.length;
  const barH = H - fs - 6;
  let rects = '', x = 0;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') rects += `<rect x="${x.toFixed(3)}" y="0" width="${mw.toFixed(3)}" height="${barH}" fill="#000"/>`;
    x += mw;
  }
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="white"/>${rects}` +
    `<text x="${W / 2}" y="${H - 2}" text-anchor="middle" font-size="${fs}" font-family="monospace" fill="#000">${value}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// Clean short date: "22 Feb 2026"
function fmtDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function openPrintWindow(subBox, lc, shipmentNumber) {
  const src  = barcodeBase64(subBox.barcode);
  const good = subBox.output_type === 'Good/ QC Approved';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Sub-Box Label</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#fff;display:flex;justify-content:center;padding:24px;}
  .label{border:2px solid #1f2937;border-radius:10px;padding:20px 16px;
    display:flex;flex-direction:column;align-items:center;gap:8px;background:#fff;width:380px;}
  .title{font-size:8px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;}
  .box-name{font-size:16px;font-weight:700;color:#111827;text-align:center;}
  .badge{font-size:9px;font-weight:700;padding:2px 10px;border-radius:99px;
    background:${good ? '#dcfce7' : '#fee2e2'};color:${good ? '#166534' : '#991b1b'};}
  .bc{width:100%;max-width:340px;height:auto;display:block;}
  .row{width:100%;display:flex;justify-content:space-between;font-size:10px;
    color:#374151;border-top:1px solid #e5e7eb;padding-top:6px;}
  @media print{body{padding:0;}}
</style></head><body>
<div class="label">
  <div class="title">Finished Good Sub-Box</div>
  <div class="box-name">${subBox.box_name || subBox.barcode}</div>
  <span class="badge">${subBox.output_type}</span>
  <img class="bc" src="${src}" alt="${subBox.barcode}" />
  <div class="row">
    <span>Date: <b>${fmtDate(subBox.production_date) || subBox.production_date}</b></span>
    <span>Shift: <b>${subBox.shift}</b></span>
    <span>Qty: <b>${(subBox.quantity || 0).toLocaleString()}</b></span>
  </div>
  ${shipmentNumber ? `<div class="row"><span>Shipment: <b>${shipmentNumber}</b></span>${lc ? `<span>LC: <b>${lc.lc_number}</b></span>` : ''}</div>` : ''}
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script>
</body></html>`;
  const w = window.open('', '_blank', 'width=540,height=560');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ── Single clean timeline node ────────────────────────────────────────────────
function Node({ icon: Icon, color, title, subtitle, isLast = false, isPending = false }) {
  const rings = {
    blue: 'bg-blue-600', indigo: 'bg-indigo-600', teal: 'bg-teal-600',
    orange: 'bg-orange-500', green: 'bg-green-600', red: 'bg-red-600', gray: 'bg-gray-300',
  };
  const ring = isPending ? 'bg-gray-200' : (rings[color] || 'bg-gray-400');
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-8 h-8 ${ring} rounded-full flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${isPending ? 'text-gray-400' : 'text-white'}`} />
        </div>
        {!isLast && <div className="w-px flex-1 min-h-[24px] bg-gray-200 mt-1" />}
      </div>
      <div className={`flex-1 min-w-0 ${!isLast ? 'pb-5' : ''}`}>
        <p className={`text-sm font-semibold leading-5 ${isPending ? 'text-gray-400' : 'text-gray-800'}`}>{title}</p>
        {subtitle && (
          <p className={`text-sm leading-5 ${isPending ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// Props: subBox, box (direct box_id link), boxes (all boxes), lcs, inboundMaterials, clientRejections, onBack
const SubBoxDetail = ({ subBox, box: directBox, boxes, lcs, inboundMaterials, clientRejections, onBack }) => {
  const isGood           = subBox.output_type === 'Good/ QC Approved';
  const totalRejected    = subBox.client_rejected_count || 0;
  const goodQuantity     = subBox.quantity - totalRejected;
  const rejectionPercent = subBox.quantity > 0 ? ((totalRejected / subBox.quantity) * 100).toFixed(1) : 0;
  const subBoxRejections = clientRejections.filter(r => r.sub_box_id === subBox.id);

  // ── SHIFT-BASED BACKTRACKING ─────────────────────────────────────────────
  // Strategy:
  //   1. If subBox has a direct box_id — use that box directly.
  //   2. Otherwise, find boxes that were issued on the same date+shift as this sub-box's
  //      production_date+shift. This is how production links sub-boxes to material boxes.
  //   3. From the linked box → inboundMaterial → LC + shipment.

  let trackedBox = directBox || null;

  if (!trackedBox && boxes && subBox.shift && subBox.production_date) {
    // Find any box issued on the same date and shift
    const prodDate = subBox.production_date; // "YYYY-MM-DD"
    trackedBox = boxes.find(b =>
      b.issue_shift === subBox.shift &&
      b.issue_date === prodDate &&
      (b.status === 'Material In Production' || b.status === 'Consumed')
    ) || null;

    // Fallback: match on production date only (date part of created_at if issue_date missing)
    if (!trackedBox) {
      trackedBox = boxes.find(b =>
        b.issue_shift === subBox.shift &&
        b.updated_at?.startsWith(prodDate)
      ) || null;
    }
  }

  // Resolve inboundMaterial from trackedBox
  const inboundMaterial = trackedBox
    ? inboundMaterials?.find(im => im.id === trackedBox.inbound_material_id)
    : null;

  // Resolve LC + shipment
  let lc = null, shipment = null;
  if (inboundMaterial && lcs) {
    for (const cur of lcs) {
      const found = cur.shipments?.find(s => s.id === inboundMaterial.shipment_id);
      if (found) { lc = cur; shipment = found; break; }
    }
  }

  const shipmentNumber = inboundMaterial?.shipment_number || shipment?.shipment_number || null;

  const challan = subBox.challan_document || null;
  const formatFileSize = (b) => {
    if (!b) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  // Build node subtitles
  const lcSubtitle  = lc ? lc.lc_number : null;
  const shipSubtitle = shipmentNumber || null;

  // Box node: show the linked box info if found
  const boxSubtitle = trackedBox
    ? `${trackedBox.box_name} — ${trackedBox.item_name} · ${trackedBox.quantity?.toLocaleString()} units`
    : null;

  // Production node
  const prodSubtitle = `${fmtDate(subBox.production_date)} — ${subBox.shift} Shift`;

  // Finished good node
  const fgSubtitle = isGood
    ? `${subBox.quantity.toLocaleString()} units · QC Approved`
    : `${subBox.quantity.toLocaleString()} units · Wastage`;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Sub-Box Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">Traceability from LC to finished product</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openPrintWindow(subBox, lc, shipmentNumber)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print Label
          </button>
          <span className={`px-3 py-1.5 text-sm font-semibold rounded-full inline-flex items-center gap-1 ${
            isGood ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isGood ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {subBox.output_type}
          </span>
        </div>
      </div>

      {/* Sub-Box Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Sub-Box Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Production Date</p>
            <p className="text-sm font-semibold text-gray-900">{fmtDate(subBox.production_date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Shift</p>
            <p className="text-sm font-semibold text-gray-900">{subBox.shift} Shift</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Quantity</p>
            <p className="text-sm font-semibold text-gray-900">{subBox.quantity.toLocaleString()} units</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Output Type</p>
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
              isGood ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isGood ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {isGood ? 'QC Approved' : 'Wastage'}
            </span>
          </div>
          {trackedBox && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Material Box</p>
              <p className="text-sm font-semibold text-gray-900">{trackedBox.box_name}</p>
            </div>
          )}
          {shipmentNumber && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Shipment</p>
              <p className="text-sm font-semibold text-gray-900">{shipmentNumber}</p>
            </div>
          )}
          {lc && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">LC</p>
              <p className="text-sm font-semibold text-gray-900">{lc.lc_number}</p>
            </div>
          )}
        </div>

        {/* Challan */}
        {challan && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 uppercase font-medium mb-2">Challan Document</p>
            <div className="inline-flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Paperclip className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-900 truncate">{challan.name}</p>
                <p className="text-xs text-blue-500 mt-0.5">
                  {formatFileSize(challan.size)}
                  {challan.uploaded_at && <span className="ml-2">· {fmtDate(challan.uploaded_at)}</span>}
                </p>
              </div>
              <a href="#" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
                <Download className="w-3.5 h-3.5" />Download
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Quality Summary — only for Good output */}
      {isGood && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Quality Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-xs font-medium text-green-700 uppercase mb-1">Good Units</p>
              <p className="text-2xl font-bold text-green-900">{goodQuantity.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-0.5">
                {subBox.quantity > 0 ? ((goodQuantity / subBox.quantity) * 100).toFixed(1) : 0}% of total
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-xs font-medium text-orange-700 uppercase mb-1">Client Rejected</p>
              <p className="text-2xl font-bold text-orange-900">{totalRejected.toLocaleString()}</p>
              <p className="text-xs text-orange-600 mt-0.5">{rejectionPercent}% of total</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-medium text-blue-700 uppercase mb-1">Rejection Incidents</p>
              <p className="text-2xl font-bold text-blue-900">{subBoxRejections.length}</p>
              <p className="text-xs text-blue-600 mt-0.5">{subBoxRejections.length === 0 ? 'No rejections' : 'recorded'}</p>
            </div>
          </div>
        </div>
      )}

      

      {/* Traceability Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Traceability</h3>
        <p className="text-sm text-gray-400 mb-1">
          Traced via <span className="font-medium text-gray-600">{subBox.shift} Shift · {fmtDate(subBox.production_date)}</span>
        </p>
        {!trackedBox && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            No material box was assigned to this shift yet. Issue boxes to production on this shift date to enable full traceability.
          </p>
        )}
        <div className="mt-4">
          <Node
            icon={FileCheck}
            color="blue"
            title="Letter of Credit"
            subtitle={lcSubtitle}
            isPending={!lc}
          />
          <Node
            icon={Ship}
            color="indigo"
            title="Shipment"
            subtitle={shipSubtitle}
            isPending={!shipmentNumber}
          />
          <Node
            icon={Package}
            color="teal"
            title="Material Box"
            subtitle={boxSubtitle}
            isPending={!trackedBox}
          />
          <Node
            icon={Factory}
            color="orange"
            title="Production"
            subtitle={prodSubtitle}
          />
          <Node
            icon={isGood ? CheckCircle : XCircle}
            color={isGood ? 'green' : 'red'}
            title="Finished Good Sub-Box"
            subtitle={fgSubtitle}
            isLast={subBoxRejections.length === 0}
          />
          {subBoxRejections.length > 0 && (
            <Node
              icon={AlertTriangle}
              color="red"
              title="Client Rejections"
              subtitle={`${subBoxRejections.length} incident${subBoxRejections.length > 1 ? 's' : ''} · ${totalRejected.toLocaleString()} units rejected (${rejectionPercent}%)`}
              isLast
            />
          )}
        </div>
      </div>

      {/* Remarks */}
      {subBox.remarks && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Production Remarks</h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{subBox.remarks}</p>
          </div>
        </div>
      )}

      {/* Client Rejection History */}
      {subBoxRejections.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Client Rejection History</h3>
          <div className="space-y-3">
            {subBoxRejections.map((rej, idx) => (
              <div key={rej.id || idx} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-orange-900">Rejection #{idx + 1}</p>
                      <p className="text-xs text-orange-600">{fmtDate(rej.rejection_date)}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full">
                    {rej.rejected_quantity.toLocaleString()} units
                  </span>
                </div>
                <div className="bg-white rounded p-3">
                  <p className="text-xs font-medium text-gray-400 uppercase mb-1">Reason</p>
                  <p className="text-sm text-gray-800">{rej.rejection_reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


{/* Barcode */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Sub-Box Barcode</h3>
          <button
            onClick={() => openPrintWindow(subBox, lc, shipmentNumber)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Label
          </button>
        </div>
        <div className="rounded-xl border-2 border-gray-200 p-6 flex flex-col items-center gap-2 bg-white">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Code 128 — 1D Scannable</p>
          <BarcodeSVG value={subBox.barcode} width={340} height={80} fontSize={11} />
          {/* <p className="text-xs text-gray-400">Scan with NETUM or any 1D scanner</p> */}
        </div>
      </div>
      {/* Back */}
      <div>
        <button onClick={onBack} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
          Back to Sub-Box List
        </button>
      </div>
    </div>
  );
};

export default SubBoxDetail;