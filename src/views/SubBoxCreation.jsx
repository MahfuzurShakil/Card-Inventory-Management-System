import { useState, useMemo } from 'react';
import {
  ChevronRight, Save, Calendar, Clock, Hash, FileText,
  CheckCircle, XCircle, Package, Printer, AlertCircle,
  Layers, X, AlertTriangle, Info, ArrowRight
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

// React SVG barcode — used in the on-screen preview modal
function BarcodeSVG({ value, width = 340, height = 80, fontSize = 11 }) {
  const bits = encode128(value);
  const mw   = width / bits.length;
  const barH = height - fontSize - 4;
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
      <text x={width/2} y={height-1} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">{value}</text>
    </svg>
  );
}

// Base64 barcode for print HTML — 100×60 mm label size matching InboundReceiving
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

// Sub-box name: SB-YYYYMMDD-D/N-SEQ
function generateSubBoxName(seq, date, shift) {
  const dateStr   = (date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
  const shiftCode = shift === 'Day' ? 'D' : 'N';
  return `SB-${dateStr}-${shiftCode}-${String(seq).padStart(3, '0')}`;
}

// ── Print window — 100×60 mm per label, one per page (ZD230 compatible) ──────
function openPrintWindow(boxes) {
  const labels = boxes.map(box => {
    const src  = barcodeBase64(box.barcode);
    const good = box.output_type === 'Good/ QC Approved';
    return `
    <div class="label">
      <div class="top-row">
        <span class="label-title">Finished Good Sub-Box</span>
        <span class="shift-badge ${box.shift === 'Day' ? 'shift-day' : 'shift-night'}">${box.shift} Shift</span>
      </div>
      <div class="box-name">${box.sub_box_name || box.box_name}</div>
      <span class="badge ${good ? 'badge-good' : 'badge-bad'}">${good ? 'QC Approved' : 'Wastage'}</span>
      <img class="bc" src="${src}" alt="${box.barcode}" />
      <div class="meta">
        <span><b>Date:</b> ${box.production_date}</span>
        <span><b>Qty:</b> ${(box.quantity || 0).toLocaleString()}</span>
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

// ── Bulk Print Modal (shown after creation) ───────────────────────────────────
const BulkPrintModal = ({ fullBoxes, partialBox, onDone }) => {
  const allPrintable = fullBoxes; // partial has no barcode yet
  const good = allPrintable[0]?.output_type === 'Good/ QC Approved';
  const totalCreated = fullBoxes.length + (partialBox ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {totalCreated} Sub-Box{totalCreated !== 1 ? 'es' : ''} Created
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {fullBoxes.length} full box{fullBoxes.length !== 1 ? 'es' : ''} with barcodes
                {partialBox ? ` · 1 partial box (no barcode yet — ${partialBox.quantity} units)` : ''}
              </p>
            </div>
          </div>
          <button onClick={onDone} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Partial box note */}
        {partialBox && (
          <div className="mx-6 mt-4 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <span className="font-semibold">{partialBox.sub_box_name}</span> is a partial box ({partialBox.quantity} units).
              No barcode is generated until it is filled in a subsequent shift. It will appear at the top of the next sub-box creation session.
            </p>
          </div>
        )}

        {/* Label preview grid */}
        {allPrintable.length > 0 ? (
          <div className="overflow-y-auto flex-1 p-5 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              {allPrintable.map((box, idx) => (
                <div key={idx} className={`bg-white border-2 rounded-xl overflow-hidden ${good ? 'border-gray-200' : 'border-red-200'}`}>
                  {/* Label top */}
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finished Good Sub-Box</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      box.shift === 'Day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>{box.shift}</span>
                  </div>
                  <div className="px-4 py-2 flex flex-col items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{box.sub_box_name}</p>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${good ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {good ? 'QC Approved' : 'Wastage'}
                    </span>
                    <BarcodeSVG value={box.barcode} width={260} height={65} fontSize={10} />
                    <div className="w-full flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                      <span><span className="text-gray-400">Date:</span> <b>{box.production_date}</b></span>
                      <span><span className="text-gray-400">Qty:</span> <b>{(box.quantity || 0).toLocaleString()}</b></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No printable labels — only a partial box was created this session.</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center mb-3">
            Labels print at 100×60 mm (one per page). Allow pop-ups if blocked.
          </p>
          <div className="flex gap-3">
            <button onClick={onDone}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Skip — Go to Box List
            </button>
            {allPrintable.length > 0 && (
              <button onClick={() => { openPrintWindow(allPrintable); onDone(); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
                <Printer className="w-4 h-4" />
                Print {allPrintable.length} Label{allPrintable.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
// Props:
//   onSave(boxObject)         — called once per sub-box created
//   onUpdateSubBox(id, patch) — called to update the partial box when it gets filled
//   onBack()
//   subBoxes                  — all existing sub-boxes (to detect open partial + next seq#)
//   shiftSummaries            — to auto-populate total_quantity from QC Good / Wastage
const SubBoxCreation = ({ onSave, onUpdateSubBox, onBack, subBoxes = [], shiftSummaries = [] }) => {
  const today = new Date().toISOString().split('T')[0];
  const DEFAULT_PER_BOX = 500;

  const [formData, setFormData] = useState({
    production_date: today,
    shift:           'Day',
    output_type:     'Good/ QC Approved',
    per_box_quantity: String(DEFAULT_PER_BOX),
    remarks:          '',
  });
  const [errors, setErrors]       = useState({});
  const [printData, setPrintData] = useState(null); // { fullBoxes, partialBox }

  const isGood    = formData.output_type === 'Good/ QC Approved';
  const perBoxQty = parseInt(formData.per_box_quantity) || 0;

  // ── Look up shift summary for selected date+shift ─────────────────────────
  const shiftSummary = useMemo(() =>
    shiftSummaries.find(
      s => s.date === formData.production_date && s.shift === formData.shift
    ) || null,
    [shiftSummaries, formData.production_date, formData.shift]
  );

  // Auto-populate total_quantity from shift summary based on output type.
  // shiftSummary.qc_good = QC Approved Goods count (set in Production Floor summary)
  // Falls back to 0 if no summary found — user can type manually.
  const autoTotalQtyFromSummary = useMemo(() => {
    if (!shiftSummary) return 0;
    return isGood
      ? (shiftSummary.qc_good || 0)
      : (shiftSummary.wastage || 0);
  }, [shiftSummary, isGood]);

  // Allow manual override: if summary has value use it; user can still edit
  const [manualQtyOverride, setManualQtyOverride] = useState('');
  const autoTotalQty = manualQtyOverride !== ''
    ? (parseInt(manualQtyOverride) || 0)
    : autoTotalQtyFromSummary;

  // ── Open partial box detection ─────────────────────────────────────────────
  // A partial box for this output_type — only 1 can exist at a time
  const openPartialBox = useMemo(() =>
    subBoxes.find(sb =>
      sb.box_type    === 'Partial' &&
      sb.output_type === formData.output_type &&
      !sb.filled_in_shift            // not yet completed
    ) || null,
    [subBoxes, formData.output_type]
  );

  // ── Next sequence number for this date+shift ───────────────────────────────
  const nextSeq = useMemo(() => {
    const prefix = `SB-${(formData.production_date || today).replace(/-/g, '')}-${formData.shift === 'Day' ? 'D' : 'N'}-`;
    const existing = subBoxes
      .filter(sb => (sb.sub_box_name || sb.box_name || '').startsWith(prefix))
      .map(sb => parseInt((sb.sub_box_name || sb.box_name || '').slice(-3)) || 0);
    return existing.length > 0 ? Math.max(...existing) + 1 : 1;
  }, [subBoxes, formData.production_date, formData.shift, today]);

  // ── Box calculation ────────────────────────────────────────────────────────
  const boxCalc = useMemo(() => {
    const total   = autoTotalQty;
    const perBox  = perBoxQty;
    if (total <= 0 || perBox <= 0) return null;

    let remaining = total;
    let seqStart  = nextSeq;
    const result  = { fillPartial: null, newFull: [], newPartial: null };

    // Step 1: fill the open partial box first
    if (openPartialBox) {
      const needed = perBox - (openPartialBox.quantity || 0);
      if (remaining >= needed) {
        result.fillPartial = { box: openPartialBox, addQty: needed };
        remaining -= needed;
      } else {
        // Even the open partial can't be filled this shift — just add remaining to it
        result.fillPartial = { box: openPartialBox, addQty: remaining };
        remaining = 0;
      }
    }

    // Step 2: full new boxes from the remaining quantity
    if (remaining > 0) {
      const fullCount = Math.floor(remaining / perBox);
      const leftover  = remaining % perBox;
      for (let i = 0; i < fullCount; i++) {
        result.newFull.push({ seq: seqStart + i, quantity: perBox });
      }
      seqStart += fullCount;
      if (leftover > 0) {
        result.newPartial = { seq: seqStart, quantity: leftover };
      }
    }

    return result;
  }, [autoTotalQty, perBoxQty, nextSeq, openPartialBox]);

  const totalNewBoxes = boxCalc
    ? boxCalc.newFull.length + (boxCalc.newPartial ? 1 : 0)
    : 0;

  const isReady = autoTotalQty > 0 && perBoxQty > 0 && formData.production_date;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    // Reset manual override when date/shift/type changes
    if (field === 'production_date' || field === 'shift' || field === 'output_type') {
      setManualQtyOverride('');
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.production_date) errs.production_date = 'Production date is required';
    if (autoTotalQty <= 0)         errs.total_quantity  = 'Enter total quantity to box';
    if (perBoxQty <= 0)            errs.per_box_quantity = 'Per box quantity must be greater than 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!boxCalc) return;

    const timestamp   = Date.now();
    const fullBoxes   = [];
    let   partialBox  = null;

    // Handle partial box fill-up (existing box becomes full → update it)
    if (boxCalc.fillPartial) {
      const { box, addQty } = boxCalc.fillPartial;
      const newQty           = (box.quantity || 0) + addQty;
      const nowFull          = newQty >= perBoxQty;

      // Generate barcode only when it becomes full
      const barcode = nowFull
        ? `SB-${timestamp}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
        : null;

      const patch = {
        quantity:        newQty,
        box_type:        nowFull ? 'Full' : 'Partial',
        barcode:         nowFull ? barcode : null,
        filled_in_shift: nowFull ? `${formData.production_date}_${formData.shift}` : undefined,
        updated_at:      new Date().toISOString(),
      };
      if (onUpdateSubBox) onUpdateSubBox(box.id, patch);

      if (nowFull) {
        // Include in printable list
        fullBoxes.push({ ...box, ...patch, sub_box_name: box.sub_box_name || box.box_name });
      }
    }

    // New full boxes
    boxCalc.newFull.forEach(({ seq, quantity }, i) => {
      const sub_box_name = generateSubBoxName(seq, formData.production_date, formData.shift);
      const barcode      = `SB-${timestamp + i + 1}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const box = {
        production_date:       formData.production_date,
        shift:                 formData.shift,
        output_type:           formData.output_type,
        quantity,
        box_type:              'Full',
        barcode,
        sub_box_name,
        box_name:              sub_box_name,
        remarks:               formData.remarks,
        delivery_status:       'Pending',
        filled_in_shift:       null,
        client_rejected_count: 0,
        challan_document:      null,
        created_by:            'Production Staff',
        created_at:            new Date().toISOString(),
      };
      fullBoxes.push(box);
      onSave(box);
    });

    // New partial box (no barcode)
    if (boxCalc.newPartial) {
      const { seq, quantity } = boxCalc.newPartial;
      const sub_box_name = generateSubBoxName(seq, formData.production_date, formData.shift);
      const box = {
        production_date:       formData.production_date,
        shift:                 formData.shift,
        output_type:           formData.output_type,
        quantity,
        box_type:              'Partial',
        barcode:               null,          // no barcode until full
        sub_box_name,
        box_name:              sub_box_name,
        remarks:               formData.remarks,
        delivery_status:       'Pending',
        filled_in_shift:       null,
        client_rejected_count: 0,
        challan_document:      null,
        created_by:            'Production Staff',
        created_at:            new Date().toISOString(),
      };
      partialBox = box;
      onSave(box);
    }

    setPrintData({ fullBoxes, partialBox });
  };

  const handlePrintDone = () => {
    setPrintData(null);
  };

  // Preview name list (first 5 new full boxes)
  const previewNames = boxCalc
    ? boxCalc.newFull.slice(0, 5).map(({ seq }) =>
        generateSubBoxName(seq, formData.production_date, formData.shift))
    : [];

  return (
    <div className="space-y-5">
      {printData && (
        <BulkPrintModal
          fullBoxes={printData.fullBoxes}
          partialBox={printData.partialBox}
          onDone={handlePrintDone}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Record Production Output</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Create finished-good sub-boxes with auto-generated names &amp; barcodes
          </p>
        </div>
      </div>

      {/* Open partial box banner */}
      {openPartialBox && (
        <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Open partial box detected — <span className="font-mono">{openPartialBox.sub_box_name || openPartialBox.box_name}</span>
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Currently {openPartialBox.quantity} units. This box will be filled first before new boxes are created.
              Needs {perBoxQty > 0 ? (perBoxQty - openPartialBox.quantity) : '?'} more units to become full.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: form ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">

            {/* Production Date & Shift */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Production Details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Production Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date" value={formData.production_date} max={today}
                    onChange={e => handleChange('production_date', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                      errors.production_date ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  {errors.production_date && <p className="mt-1 text-xs text-red-500">{errors.production_date}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Clock className="w-3.5 h-3.5" /> Shift <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 h-[38px]">
                    <button type="button" onClick={() => handleChange('shift', 'Day')}
                      className={`text-sm font-semibold rounded-lg transition-colors ${
                        formData.shift === 'Day' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      ☀ Day
                    </button>
                    <button type="button" onClick={() => handleChange('shift', 'Night')}
                      className={`text-sm font-semibold rounded-lg transition-colors ${
                        formData.shift === 'Night' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      ☽ Night
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Output Type */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Output Type <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => handleChange('output_type', 'Good/ QC Approved')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    isGood ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}>
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isGood ? 'text-emerald-600' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isGood ? 'text-emerald-900' : 'text-gray-700'}`}>Good / QC Approved</p>
                    <p className="text-xs text-gray-400 mt-0.5">Quality-approved finished goods</p>
                  </div>
                </button>
                <button type="button" onClick={() => handleChange('output_type', 'Wastage')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    !isGood ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}>
                  <XCircle className={`w-5 h-5 flex-shrink-0 ${!isGood ? 'text-red-500' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${!isGood ? 'text-red-900' : 'text-gray-700'}`}>Wastage</p>
                    <p className="text-xs text-gray-400 mt-0.5">Rejected or damaged material</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantity Configuration */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Quantity Configuration <span className="text-red-400">*</span>
              </p>

              {errors.total_quantity && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{errors.total_quantity}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Quantity — auto from summary, manually editable */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Total Quantity (units) <span className="text-red-400">*</span>
                    {shiftSummary && autoTotalQtyFromSummary > 0 && manualQtyOverride === '' && (
                      <span className="ml-auto flex items-center gap-1 text-xs font-normal text-blue-600">
                        <Info className="w-3 h-3" /> From summary
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualQtyOverride !== '' ? manualQtyOverride : (autoTotalQtyFromSummary || '')}
                    onChange={e => {
                      setManualQtyOverride(e.target.value);
                      if (errors.summary) setErrors(prev => ({ ...prev, summary: undefined }));
                    }}
                    placeholder={shiftSummary ? '0' : 'Enter manually'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {shiftSummary && autoTotalQtyFromSummary > 0
                      ? `Auto-filled: ${isGood ? `QC Approved = ${shiftSummary.qc_good || 0}` : `Wastage = ${shiftSummary.wastage || 0}`}. Edit to override.`
                      : shiftSummary
                      ? 'Shift summary found but count is 0 — enter manually.'
                      : 'No shift summary for this date + shift — enter manually.'}
                  </p>
                </div>

                {/* Per Box Quantity — editable */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Package className="w-3.5 h-3.5" />
                    Per Box Quantity (units) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number" min="1"
                    value={formData.per_box_quantity}
                    onChange={e => handleChange('per_box_quantity', e.target.value)}
                    placeholder="e.g. 500"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                      errors.per_box_quantity ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  {errors.per_box_quantity && <p className="mt-1 text-xs text-red-500">{errors.per_box_quantity}</p>}
                  <p className="mt-1 text-xs text-gray-400">Units packed per sub-box (default 500)</p>
                </div>
              </div>

              {/* Box breakdown preview */}
              {boxCalc && (
                <div className="mt-4 space-y-2">
                  {/* Partial fill step */}
                  {boxCalc.fillPartial && (
                    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <span className="font-semibold">Step 1 — Fill partial box: </span>
                        {openPartialBox?.sub_box_name || openPartialBox?.box_name} ({openPartialBox?.quantity} → {(openPartialBox?.quantity || 0) + boxCalc.fillPartial.addQty} units)
                        {(openPartialBox?.quantity || 0) + boxCalc.fillPartial.addQty >= perBoxQty
                          ? ' → becomes Full, barcode generated'
                          : ' → still partial (insufficient quantity this shift)'}
                      </div>
                    </div>
                  )}

                  {/* New boxes */}
                  {(boxCalc.newFull.length > 0 || boxCalc.newPartial) && (
                    <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Layers className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-800">
                          <span className="font-bold text-sm text-blue-900">
                            {boxCalc.newFull.length + (boxCalc.newPartial ? 1 : 0)} new sub-box{(boxCalc.newFull.length + (boxCalc.newPartial ? 1 : 0)) !== 1 ? 'es' : ''} will be created
                          </span>
                          <div className="mt-1 space-y-0.5">
                            {boxCalc.newFull.length > 0 && (
                              <p>{boxCalc.newFull.length} full box{boxCalc.newFull.length !== 1 ? 'es' : ''} × {perBoxQty.toLocaleString()} units — barcodes generated</p>
                            )}
                            {boxCalc.newPartial && (
                              <p className="text-amber-700 font-medium">
                                1 partial box × {boxCalc.newPartial.quantity.toLocaleString()} units — no barcode until filled
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="p-5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
                <FileText className="w-3.5 h-3.5" />
                Remarks <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.remarks}
                onChange={e => handleChange('remarks', e.target.value)}
                rows={3}
                placeholder="Production notes, quality observations..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* ── RIGHT: Preview ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Preview</p>

              {/* Output type icon */}
              <div className="flex flex-col items-center text-center mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 border-2 transition-all duration-300 ${
                  !isReady ? 'bg-gray-50 border-gray-200'
                    : isGood ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}>
                  {!isReady ? <Package className="w-7 h-7 text-gray-300" />
                    : isGood ? <CheckCircle className="w-7 h-7 text-emerald-500" />
                    : <XCircle className="w-7 h-7 text-red-400" />}
                </div>
                <span className={`text-sm font-bold ${!isReady ? 'text-gray-400' : isGood ? 'text-emerald-800' : 'text-red-700'}`}>
                  {isReady ? (isGood ? 'Good / QC Approved' : 'Wastage') : 'Output Type'}
                </span>
                <span className="text-xs text-gray-400 mt-0.5">{formData.shift} Shift</span>
              </div>

              {/* Summary rows */}
              <div className="space-y-2 pt-3 border-t border-gray-100">
                {[
                  ['Date',       formData.production_date || '—'],
                  ['Total Qty',  autoTotalQty > 0 ? `${autoTotalQty.toLocaleString()} units` : '—'],
                  ['Per Box',    perBoxQty > 0 ? `${perBoxQty.toLocaleString()} units` : '—'],
                  ['New Boxes',  boxCalc ? `${boxCalc.newFull.length + (boxCalc.newPartial ? 1 : 0)}` : '—'],
                  ['Full',       boxCalc ? `${boxCalc.newFull.length} (with barcodes)` : '—'],
                  ['Partial',    boxCalc?.newPartial ? `1 × ${boxCalc.newPartial.quantity} units` : 'None'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{k}</span>
                    <span className={`text-xs font-semibold ${
                      k === 'Partial' && v !== 'None' ? 'text-amber-600'  :
                      k === 'Full'    && boxCalc?.newFull.length > 0 ? 'text-emerald-700' :
                      k === 'New Boxes' && boxCalc ? 'text-blue-700' : 'text-gray-800'
                    }`}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Name preview */}
              {previewNames.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Name preview (new full boxes):</p>
                  <div className="space-y-1">
                    {previewNames.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        <span className="text-xs font-mono text-gray-700">{name}</span>
                      </div>
                    ))}
                    {boxCalc && boxCalc.newFull.length > 5 && (
                      <p className="text-xs text-gray-400 pl-3.5">+{boxCalc.newFull.length - 5} more...</p>
                    )}
                  </div>
                </div>
              )}

              {!isReady && (
                <p className="mt-3 text-xs text-gray-400 text-center">
                  {!shiftSummary && formData.production_date
                    ? 'No shift summary for this date + shift'
                    : 'Fill required fields to see preview'}
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!isReady}
                className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl shadow-sm transition-colors duration-300 ${
                  !isReady ? 'bg-gray-400 cursor-not-allowed'
                    : isGood ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Save className="w-4 h-4" />
                {boxCalc && totalNewBoxes > 0
                  ? `Create ${totalNewBoxes} Sub-Box${totalNewBoxes !== 1 ? 'es' : ''} & Generate Barcodes`
                  : 'Create Sub-Boxes & Generate Barcodes'}
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubBoxCreation;