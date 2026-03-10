import { ChevronRight, Package, Activity, Printer, FileCheck, Ship, Factory } from 'lucide-react';

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

function openPrintWindow(box, lc, shipmentNumber) {
  const src = barcodeBase64(box.barcode);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Box Label</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;background:#fff;display:flex;justify-content:center;padding:24px;}
  .label{border:2px solid #1f2937;border-radius:10px;padding:20px 16px;
    display:flex;flex-direction:column;align-items:center;gap:8px;background:#fff;width:380px;}
  .title{font-size:8px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;}
  .box-name{font-size:17px;font-weight:700;color:#111827;}
  .bc{width:100%;max-width:340px;height:auto;display:block;}
  .row{width:100%;display:flex;justify-content:space-between;font-size:10px;color:#374151;
    border-top:1px solid #e5e7eb;padding-top:7px;}
  @media print{body{padding:0;}}
</style></head><body>
<div class="label">
  <div class="title">Material Box Label</div>
  <div class="box-name">${box.box_name}</div>
  <img class="bc" src="${src}" alt="${box.barcode}" />
  <div class="row">
    <span>Item: <b>${box.item_name || ''}</b></span>
    <span>Qty: <b>${(box.quantity || 0).toLocaleString()}</b></span>
  </div>
  ${shipmentNumber ? `<div class="row"><span>Shipment: <b>${shipmentNumber}</b></span>${lc ? `<span>LC: <b>${lc.lc_number}</b></span>` : ''}</div>` : ''}
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},500);};<\/script>
</body></html>`;
  const w = window.open('', '_blank', 'width=540,height=500');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ── Single clean timeline node — just title + one subtitle line ───────────────
function Node({ icon: Icon, color, title, subtitle, isLast = false, isPending = false }) {
  const colorRing = {
    blue:   'bg-blue-600',
    indigo: 'bg-indigo-600',
    teal:   'bg-teal-600',
    orange: 'bg-orange-500',
    green:  'bg-green-600',
    gray:   'bg-gray-300',
  };
  const ring = isPending ? 'bg-gray-200' : (colorRing[color] || 'bg-gray-400');

  return (
    <div className="flex gap-3">
      {/* Icon column */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-8 h-8 ${ring} rounded-full flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${isPending ? 'text-gray-400' : 'text-white'}`} />
        </div>
        {!isLast && <div className="w-px flex-1 min-h-[24px] bg-gray-200 mt-1" />}
      </div>
      {/* Text column */}
      <div className={`flex-1 min-w-0 ${!isLast ? 'pb-5' : ''}`}>
        <p className={`text-sm font-semibold leading-5 ${isPending ? 'text-gray-400' : 'text-gray-800'}`}>
          {title}
        </p>
        {subtitle && (
          <p className={`text-sm leading-5 ${isPending ? 'text-gray-400' : 'text-gray-500'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const BoxDetail = ({ box, inboundMaterial, lcs, onBack }) => {
  // Resolve LC + shipment
  let lc = null, shipment = null;
  if (inboundMaterial && lcs) {
    for (const cur of lcs) {
      const found = cur.shipments?.find(s => s.id === inboundMaterial.shipment_id);
      if (found) { lc = cur; shipment = found; break; }
    }
  }
  const shipmentNumber = inboundMaterial?.shipment_number || shipment?.shipment_number || null;

  const statusCfg = {
    'Material In Stock':      { bg: 'bg-green-100',  tx: 'text-green-800'  },
    'Material In Production': { bg: 'bg-blue-100',   tx: 'text-blue-800'   },
    'Consumed':               { bg: 'bg-gray-100',   tx: 'text-gray-700'   },
  };
  const cfg        = statusCfg[box.status] || statusCfg['Material In Stock'];
  const consumedQty  = box.consumed_quantity || 0;
  const remainingQty = box.quantity - consumedQty;
  const isInStock  = box.status === 'Material In Stock';
  const isInProd   = box.status === 'Material In Production';
  const isConsumed = box.status === 'Consumed';

  // Build clean subtitle strings
  const issueDate  = fmtDate(box.issue_date || box.updated_at);
  const issueShift = box.issue_shift ? `${box.issue_shift} Shift` : null;

  const prodSubtitle = isInStock
    ? 'Waiting to be issued to production floor'
    : `Issued on ${issueDate}${issueShift ? ` — ${issueShift}` : ''}`;

  let consumeSubtitle = 'Not yet started';
  if (isConsumed) {
    consumeSubtitle = `All ${box.quantity.toLocaleString()} units used in production — ${fmtDate(box.updated_at || box.created_at)}`;
  } else if (isInProd && consumedQty > 0) {
    consumeSubtitle = `${consumedQty.toLocaleString()} of ${box.quantity.toLocaleString()} units consumed`;
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{box.box_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Box details and traceability</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openPrintWindow(box, lc, shipmentNumber)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print Label
          </button>
          <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${cfg.bg} ${cfg.tx}`}>
            {box.status}
          </span>
        </div>
      </div>

      {/* Box Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Box Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Item</p>
            <p className="text-sm font-semibold text-gray-900">{box.item_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Quantity</p>
            <p className="text-sm font-semibold text-gray-900">{box.quantity.toLocaleString()} units</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Consumed</p>
            <p className={`text-sm font-semibold ${consumedQty > 0 ? 'text-orange-700' : 'text-gray-400'}`}>
              {consumedQty.toLocaleString()} units
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Remaining</p>
            <p className={`text-sm font-semibold ${
              remainingQty === 0 ? 'text-gray-400'
              : remainingQty < box.quantity * 0.3 ? 'text-red-700'
              : 'text-green-700'
            }`}>
              {remainingQty.toLocaleString()} units
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Shipment</p>
            <p className="text-sm font-semibold text-gray-900">{shipmentNumber || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">LC</p>
            <p className="text-sm font-semibold text-gray-900">{lc?.lc_number || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Status</p>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.tx}`}>
              {box.status}
            </span>
          </div>
        </div>
      </div>

     

      {/* Traceability Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Traceability</h3>
        <p className="text-sm text-gray-400 mb-6">Supply chain trace from LC to current status</p>

        <div>
          <Node
            icon={FileCheck}
            color="blue"
            title="Letter of Credit"
            subtitle={lc ? lc.lc_number : null}
            isPending={!lc}
          />
          <Node
            icon={Ship}
            color="indigo"
            title="Shipment"
            subtitle={shipmentNumber}
            isPending={!shipmentNumber}
          />
          <Node
            icon={Package}
            color="teal"
            title="Box Created & Received"
            subtitle={`${box.box_name} created at inbound receiving — ${fmtDate(box.created_at)}`}
          />
          <Node
            icon={Factory}
            color={isInStock ? 'gray' : 'orange'}
            title={isInStock ? 'Issue to Production' : 'Issued to Production'}
            subtitle={prodSubtitle}
            isPending={isInStock}
          />
          <Node
            icon={Activity}
            color={isConsumed ? 'green' : 'gray'}
            title={isConsumed ? 'Fully Consumed' : isInProd ? 'Consumption In Progress' : 'Consumption'}
            subtitle={consumeSubtitle}
            isPending={!isConsumed && consumedQty === 0}
            isLast
          />
        </div>
      </div>

       {/* Barcode */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Barcode</h3>
          <button
            onClick={() => openPrintWindow(box, lc, shipmentNumber)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Label
          </button>
        </div>
        <div className="rounded-xl border-2 border-gray-200 p-6 flex flex-col items-center gap-2 bg-white">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Code 128 — 1D Scannable</p>
          <BarcodeSVG value={box.barcode} width={340} height={80} fontSize={11} />
          {/* <p className="text-xs text-gray-400">Scan with NETUM or any 1D scanner</p> */}
        </div>
      </div>

      {/* Back */}
      <div>
        <button onClick={onBack} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
          Back to Box List
        </button>
      </div>
    </div>
  );
};

export default BoxDetail;