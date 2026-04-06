import { useState, useMemo, useEffect } from 'react';
import {
  ChevronRight, Save, Calendar, Clock, Hash, FileText,
  CheckCircle, XCircle, Package, Printer, AlertCircle,
  Layers, X, AlertTriangle, Info, Lock
} from 'lucide-react';
import { createProductionBarcode, normalizeShipmentCode } from '../utils/barcode';

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

function barcodeBase64(value) {
  const W = 520, H = 110, fs = 13;
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
    `<text x="${W/2}" y="${H-2}" text-anchor="middle" font-size="${fs}" font-family="monospace" fill="#000">${value}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// Sub-box name: SB-YYYYMMDD-D/N-G/W-SEQ
function generateSubBoxName(seq, date, shift, outputType) {
  const dateStr   = (date || '').replace(/-/g, '');
  const shiftCode = shift === 'Day' ? 'D' : 'N';
  const typeCode  = outputType === 'Good/ QC Approved' ? 'G' : 'W';
  return `SB-${dateStr}-${shiftCode}${typeCode}-${String(seq).padStart(3, '0')}`;
}


// ── Print window ──────────────────────────────────────────────────────────────
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
      <div class="box-name">${box.sub_box_name}</div>
      <span class="badge ${good ? 'badge-good' : 'badge-bad'}">${good ? 'QC Approved' : 'Wastage'}</span>
      <img class="bc" src="${src}" alt="${box.barcode}" />
      <div class="meta">
        <span><b>Date:</b> ${box.production_date}</span>
        <span><b>Qty:</b> ${(box.quantity || 0).toLocaleString()}</span>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Sub-Box Labels</title>
<style>
  @page { size: 100mm 60mm; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; background: #fff; }
  .label { width:100mm; height:60mm; padding:3mm 4mm; display:flex; flex-direction:column;
    justify-content:space-between; page-break-after:always; overflow:hidden; }
  .label:last-child { page-break-after:avoid; }
  .top-row { display:flex; justify-content:space-between; }
  .label-title { font-size:7px; font-weight:700; color:#6b7280; letter-spacing:1.5px; text-transform:uppercase; }
  .shift-badge { font-size:7px; font-weight:700; padding:1px 5px; border-radius:99px; }
  .shift-day { background:#fef3c7; color:#92400e; }
  .shift-night { background:#e0e7ff; color:#3730a3; }
  .box-name { font-size:13px; font-weight:700; color:#111827; }
  .badge { font-size:8px; font-weight:700; padding:1.5px 8px; border-radius:99px; align-self:flex-start; }
  .badge-good { background:#dcfce7; color:#166534; }
  .badge-bad { background:#fee2e2; color:#991b1b; }
  .bc { width:100%; height:auto; display:block; }
  .meta { display:flex; justify-content:space-between; font-size:8px; color:#374151; border-top:1px solid #e5e7eb; padding-top:2mm; }
  @media print { body { margin:0; } }
</style></head><body>${labels}
<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
</body></html>`;
  const w = window.open('', '_blank', 'width=900,height=650');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); }
}

// ── Print Modal (shown after creation) ───────────────────────────────────────
const PrintResultModal = ({ result, onDone }) => {
  const { filledPartial, newFullBoxes, newPartialBox } = result;
  const allPrintable = [
    ...(filledPartial?.nowFull ? [{ ...filledPartial.box, ...filledPartial.patch }] : []),
    ...newFullBoxes,
  ];
  const totalCreated = allPrintable.length + (newPartialBox ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{totalCreated} action{totalCreated !== 1 ? 's' : ''} completed</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {allPrintable.length} box{allPrintable.length !== 1 ? 'es' : ''} with barcodes
                {newPartialBox ? ` · 1 partial box (${newPartialBox.quantity} units, no barcode yet)` : ''}
              </p>
            </div>
          </div>
          <button onClick={onDone} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Filled partial note */}
        {filledPartial?.nowFull && (
          <div className="mx-6 mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex-shrink-0">
            <span className="font-semibold">✓ Partial box filled:</span>{' '}
            {filledPartial.box.sub_box_name} now has {filledPartial.patch.quantity} units — barcode generated.
          </div>
        )}
        {filledPartial && !filledPartial.nowFull && (
          <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex-shrink-0">
            <span className="font-semibold">Partial box partially filled:</span>{' '}
            {filledPartial.box.sub_box_name} now has {filledPartial.patch.quantity} units (target: {filledPartial.box.target_per_box}). Still open.
          </div>
        )}
        {newPartialBox && (
          <div className="mx-6 mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex-shrink-0">
            <span className="font-semibold">New partial box created:</span>{' '}
            {newPartialBox.sub_box_name} ({newPartialBox.quantity} units). No barcode until filled or closed.
          </div>
        )}

        {allPrintable.length > 0 ? (
          <div className="overflow-y-auto flex-1 p-5 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              {allPrintable.map((box, idx) => {
                const good = box.output_type === 'Good/ QC Approved';
                return (
                  <div key={idx} className={`bg-white border-2 rounded-xl overflow-hidden ${good ? 'border-gray-200' : 'border-red-200'}`}>
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sub-Box Label</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${box.shift === 'Day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{box.shift}</span>
                    </div>
                    <div className="px-4 py-2 flex flex-col items-center gap-1">
                      <p className="text-sm font-bold text-gray-900">{box.sub_box_name}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${good ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {good ? 'QC Approved' : 'Wastage'}
                      </span>
                      <BarcodeSVG value={box.barcode} width={240} height={60} />
                      <div className="w-full flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-1">
                        <span>{box.production_date}</span>
                        <span><b>{(box.quantity || 0).toLocaleString()}</b> units</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center py-12 text-gray-400">
            <p className="text-sm">No printable labels this session (partial box only).</p>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
          <button onClick={onDone} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Done
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
  );
};

// ── Close Partial Confirmation ────────────────────────────────────────────────
const ClosePartialModal = ({ partialBox, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Close Partial Box as Final?</h3>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{partialBox.sub_box_name}</span> has{' '}
            <span className="font-semibold">{partialBox.quantity} units</span>{' '}
            (target was {partialBox.target_per_box} units/box).
            Closing it will generate a barcode immediately at the current count.
          </p>
        </div>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
        Use this when production has paused or ended and you need to dispatch this box without waiting for it to be fully filled.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Keep Open</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold">Close &amp; Generate Barcode</button>
      </div>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const SubBoxCreation = ({
  onSave,           // (boxData) => void  — called for each NEW box created
  onUpdateSubBox,   // (id, patch) => void — called when updating existing partial box
  onBack,
  boxes = [],
  subBoxes = [],    // all existing sub-boxes
  shiftSummaries = [], // [{date, shift, qc_good, wastage, ...}]
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    production_date:  today,
    shift:            'Day',
    output_type:      'Good/ QC Approved',
    per_box_quantity: '500',
    remarks:          '',
  });
  // manualQtyOverride: empty string = use summary value, otherwise user-typed value
  const [manualQtyOverride, setManualQtyOverride] = useState('');
  const [errors, setErrors]               = useState({});
  const [printResult, setPrintResult]     = useState(null); // result object shown in modal
  const [showCloseModal, setShowCloseModal] = useState(false);

  const isGood    = formData.output_type === 'Good/ QC Approved';
  const perBoxQty = parseInt(formData.per_box_quantity) || 0;

  // ── Reset manual override when context changes ────────────────────────────
  useEffect(() => {
    setManualQtyOverride('');
    setErrors({});
  }, [formData.production_date, formData.shift, formData.output_type]);

  // ── Shift summary lookup ──────────────────────────────────────────────────
  const shiftSummary = useMemo(
    () => shiftSummaries.find(s => s.date === formData.production_date && s.shift === formData.shift) || null,
    [shiftSummaries, formData.production_date, formData.shift]
  );

  // Quantity coming from the shift summary based on output type
  const summaryQty = useMemo(() => {
    if (!shiftSummary) return 0;
    return isGood ? (shiftSummary.qc_good || 0) : (shiftSummary.wastage || 0);
  }, [shiftSummary, isGood]);

  // Final total quantity to work with (summary or manual override)
  const totalQty = manualQtyOverride !== '' ? (parseInt(manualQtyOverride) || 0) : summaryQty;

  const shiftChipBoxes = useMemo(
    () => boxes.filter((box) => {
      const itemType = (box.item_type || box.item_name || '').toLowerCase();
      return itemType === 'chip' &&
        box.issue_date === formData.production_date &&
        box.issue_shift === formData.shift;
    }),
    [boxes, formData.production_date, formData.shift]
  );

  const shipmentContext = useMemo(() => {
    const shipments = shiftChipBoxes.reduce((acc, box) => {
      const key = box.shipment_id ?? box.shipment_number;
      if (key == null) return acc;

      if (!acc.some((entry) => entry.key === key)) {
        acc.push({
          key,
          shipment_id: box.shipment_id ?? null,
          shipment_number: box.shipment_number || null,
        });
      }

      return acc;
    }, []);

    return {
      chipBoxCount: shiftChipBoxes.length,
      hasAnyChipBoxes: shiftChipBoxes.length > 0,
      shipments,
      isMixed: shipments.length > 1,
      selected: shipments.length === 1 ? shipments[0] : null,
    };
  }, [shiftChipBoxes]);

  // ── Open partial box (Good type only — wastage never has partials) ─────────
  // There should be at most ONE open partial for Good output. We enforce this.
  const openPartialBox = useMemo(
    () => subBoxes.find(sb =>
      sb.box_type === 'Partial' &&
      sb.output_type === 'Good/ QC Approved' &&
      !sb.is_closed &&
      shipmentContext.selected &&
      (
        (sb.shipment_id != null && sb.shipment_id === shipmentContext.selected.shipment_id) ||
        (!!sb.shipment_number && sb.shipment_number === shipmentContext.selected.shipment_number)
      )
    ) || null,
    [subBoxes, shipmentContext.selected]
  );

  // ── How many Good units already boxed for this date+shift ─────────────────
  // Used to detect double-boxing; not used to subtract for wastage
  const alreadyBoxedQty = useMemo(() => {
    if (!isGood) return 0;
    return subBoxes
      .filter(sb =>
        sb.production_date === formData.production_date &&
        sb.shift           === formData.shift &&
        sb.output_type     === 'Good/ QC Approved' &&
        shipmentContext.selected &&
        (
          (sb.shipment_id != null && sb.shipment_id === shipmentContext.selected.shipment_id) ||
          (!!sb.shipment_number && sb.shipment_number === shipmentContext.selected.shipment_number)
        )
      )
      .reduce((sum, sb) => sum + (sb.quantity || 0), 0);
  }, [subBoxes, formData.production_date, formData.shift, isGood, shipmentContext.selected]);

  // Units still needing to be boxed this session
  const qtyToBox = Math.max(0, totalQty - alreadyBoxedQty);

  const nextBarcodeSequence = useMemo(() => {
    if (!shipmentContext.selected) return 1;

    return subBoxes.filter(sb =>
      sb.sourceType === 'production' &&
      sb.output_type === formData.output_type &&
      !!sb.barcode &&
      (
        (sb.shipment_id != null && sb.shipment_id === shipmentContext.selected.shipment_id) ||
        (!!sb.shipment_number && sb.shipment_number === shipmentContext.selected.shipment_number)
      )
    ).length + 1;
  }, [subBoxes, shipmentContext.selected, formData.output_type]);

  // ── Next available sequence number for this date+shift+type ──────────────
  const nextSeq = useMemo(() => {
    const prefix = `SB-${(formData.production_date || today).replace(/-/g, '')}-${formData.shift === 'Day' ? 'D' : 'N'}${isGood ? 'G' : 'W'}-`;
    const nums = subBoxes
      .map(sb => sb.sub_box_name || sb.box_name || '')
      .filter(n => n.startsWith(prefix))
      .map(n => parseInt(n.slice(-3)) || 0);
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  }, [subBoxes, formData.production_date, formData.shift, isGood, today]);

  // ── Box plan calculation ──────────────────────────────────────────────────
  // Returns what WILL happen when user submits.
  // filledPartial: { box, addQty, nowFull }
  // newFull: [{ seq, quantity }]
  // newPartial: { seq, quantity } | null   (Good only)
  const boxPlan = useMemo(() => {
    if (qtyToBox <= 0 || perBoxQty <= 0) return null;

    let remaining = qtyToBox;
    let seqStart  = nextSeq;
    const plan    = { filledPartial: null, newFull: [], newPartial: null };

    // Step 1: Fill open partial (Good only)
    if (openPartialBox && isGood) {
      const target = openPartialBox.target_per_box || perBoxQty;
      const need   = target - (openPartialBox.quantity || 0);
      if (remaining >= need) {
        plan.filledPartial = { box: openPartialBox, addQty: need, nowFull: true };
        remaining -= need;
      } else {
        plan.filledPartial = { box: openPartialBox, addQty: remaining, nowFull: false };
        remaining = 0;
      }
    }

    // Step 2: New full boxes
    if (remaining > 0) {
      const fullCount = Math.floor(remaining / perBoxQty);
      const leftover  = remaining % perBoxQty;
      for (let i = 0; i < fullCount; i++) {
        plan.newFull.push({ seq: seqStart + i, quantity: perBoxQty });
      }
      seqStart += fullCount;

      if (leftover > 0) {
        if (isGood) {
          // Good: create a partial box for the leftover
          plan.newPartial = { seq: seqStart, quantity: leftover };
        } else {
          // Wastage: no partial boxes — absorb leftover into last full box
          if (plan.newFull.length > 0) {
            plan.newFull[plan.newFull.length - 1].quantity += leftover;
          } else {
            // All units are less than perBoxQty — still make one full box
            plan.newFull.push({ seq: seqStart, quantity: leftover });
          }
        }
      }
    }

    return plan;
  }, [qtyToBox, perBoxQty, nextSeq, openPartialBox, isGood]);

  const isReady = qtyToBox > 0 &&
    perBoxQty > 0 &&
    formData.production_date &&
    shipmentContext.hasAnyChipBoxes &&
    !shipmentContext.isMixed;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.production_date) errs.production_date = 'Date is required';
    if (!shipmentContext.hasAnyChipBoxes) {
      errs.shipment = 'No chip boxes were issued to this production date and shift. Issue chip boxes first to resolve the shipment.';
    } else if (shipmentContext.isMixed) {
      errs.shipment = 'Chip boxes from multiple shipments are assigned to this shift. Separate them by shipment before generating QC or WST sub-box barcodes.';
    }
    if (totalQty <= 0) {
      errs.qty = !shiftSummary
        ? 'No shift summary found. Go to Production Floor and save a summary first, or enter quantity manually.'
        : summaryQty === 0
        ? `${isGood ? 'QC Approved' : 'Wastage'} count is 0 in the shift summary. Enter quantity manually if needed.`
        : 'Enter quantity to box';
    }
    if (perBoxQty <= 0) errs.per_box = 'Per box quantity must be > 0';
    if (qtyToBox <= 0 && totalQty > 0) errs.qty = `All ${totalQty} units from this shift are already boxed.`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Close partial as final (generate barcode now at current unit count)
  const handleClosePartial = () => {
    if (!openPartialBox || !onUpdateSubBox || !shipmentContext.selected) return;
    const patch = {
      box_type:  'Full',
      is_closed: true,
      barcode:   createProductionBarcode({
        outputType: openPartialBox.output_type,
        shipmentNumber: shipmentContext.selected.shipment_number,
        shipmentId: shipmentContext.selected.shipment_id,
        sequence: nextBarcodeSequence,
      }),
      updated_at: new Date().toISOString(),
    };
    onUpdateSubBox(openPartialBox.id, patch);
    setShowCloseModal(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!boxPlan) return;
    if (!shipmentContext.selected) return;

    const result = { filledPartial: null, newFullBoxes: [], newPartialBox: null };
    const barcodeDate = new Date();
    let barcodeSequence = nextBarcodeSequence;

    // --- Handle partial fill ---
    if (boxPlan.filledPartial && onUpdateSubBox) {
      const { box, addQty, nowFull } = boxPlan.filledPartial;
      const patch = {
        quantity:   (box.quantity || 0) + addQty,
        updated_at: new Date().toISOString(),
        ...(nowFull && {
          box_type:  'Full',
          is_closed: true,
          barcode:   createProductionBarcode({
            outputType: box.output_type,
            shipmentNumber: shipmentContext.selected.shipment_number,
            shipmentId: shipmentContext.selected.shipment_id,
            sequence: barcodeSequence++,
            date: barcodeDate,
          }),
        }),
      };
      onUpdateSubBox(box.id, patch);
      result.filledPartial = { box, patch, nowFull };
    }

    // --- New full boxes ---
    boxPlan.newFull.forEach(({ seq, quantity }) => {
      const sub_box_name = generateSubBoxName(seq, formData.production_date, formData.shift, formData.output_type);
      const boxData = {
        production_date:       formData.production_date,
        shift:                 formData.shift,
        output_type:           formData.output_type,
        sourceType:            'production',
        shipment_id:           shipmentContext.selected.shipment_id,
        shipment_number:       shipmentContext.selected.shipment_number,
        quantity,
        box_type:              'Full',
        is_closed:             true,
        barcode:               createProductionBarcode({
          outputType: formData.output_type,
          shipmentNumber: shipmentContext.selected.shipment_number,
          shipmentId: shipmentContext.selected.shipment_id,
          sequence: barcodeSequence++,
          date: barcodeDate,
        }),
        sub_box_name,
        box_name:              sub_box_name,
        target_per_box:        perBoxQty,
        remarks:               formData.remarks,
        delivery_status:       'delivery_pending',
        challan_status:        null,
        challan_receiver_name: null,
        challan_receiver_address: null,
        client_rejected_count: 0,
        created_by:            'Production Staff',
        created_at:            new Date().toISOString(),
      };
      onSave(boxData);
      result.newFullBoxes.push(boxData);
    });

    // --- New partial box (Good only) ---
    if (boxPlan.newPartial) {
      const { seq, quantity } = boxPlan.newPartial;
      const sub_box_name = generateSubBoxName(seq, formData.production_date, formData.shift, formData.output_type);
      const boxData = {
        production_date:       formData.production_date,
        shift:                 formData.shift,
        output_type:           formData.output_type,
        sourceType:            'production',
        shipment_id:           shipmentContext.selected.shipment_id,
        shipment_number:       shipmentContext.selected.shipment_number,
        quantity,
        box_type:              'Partial',
        is_closed:             false,
        barcode:               null,
        sub_box_name,
        box_name:              sub_box_name,
        target_per_box:        perBoxQty,
        remarks:               formData.remarks,
        delivery_status:       'delivery_pending',
        challan_status:        null,
        challan_receiver_name: null,
        challan_receiver_address: null,
        client_rejected_count: 0,
        created_by:            'Production Staff',
        created_at:            new Date().toISOString(),
      };
      onSave(boxData);
      result.newPartialBox = boxData;
    }

    setPrintResult(result);
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const summaryLabel = isGood ? 'QC Approved' : 'Wastage';

  const previewBoxNames = boxPlan
    ? boxPlan.newFull.slice(0, 4).map(({ seq }) =>
        generateSubBoxName(seq, formData.production_date, formData.shift, formData.output_type))
    : [];

  const shipmentLabel = shipmentContext.selected?.shipment_number || '—';
  const shipmentCode = shipmentContext.selected
    ? normalizeShipmentCode(shipmentContext.selected.shipment_number, shipmentContext.selected.shipment_id)
    : '—';

  return (
    <div className="space-y-5">
      {printResult && (
        <PrintResultModal result={printResult} onDone={() => { setPrintResult(null); onBack(); }} />
      )}
      {showCloseModal && openPartialBox && (
        <ClosePartialModal
          partialBox={openPartialBox}
          onConfirm={handleClosePartial}
          onCancel={() => setShowCloseModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Record Production Output</h1>
          <p className="text-sm text-gray-400 mt-0.5">Create finished-good sub-boxes from shift production data</p>
        </div>
      </div>

      {/* Open partial box banner */}
      {openPartialBox && (
        <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Open partial box: <span className="font-mono">{openPartialBox.sub_box_name}</span>
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Currently <span className="font-semibold">{openPartialBox.quantity} units</span>.
              Target: <span className="font-semibold">{openPartialBox.target_per_box} units/box</span>.
              Needs <span className="font-semibold">{openPartialBox.target_per_box - openPartialBox.quantity} more</span> to be full.
              This box will be filled first when you create Good output boxes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-300 bg-white rounded-lg hover:bg-amber-50 transition-colors"
          >
            <Lock className="w-3 h-3" /> Close as Final
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: form ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">

            {/* Date & Shift */}
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
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${errors.production_date ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {errors.production_date && <p className="mt-1 text-xs text-red-500">{errors.production_date}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Clock className="w-3.5 h-3.5" /> Shift <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 h-[38px]">
                    <button type="button" onClick={() => handleChange('shift', 'Day')}
                      className={`text-sm font-semibold rounded-lg transition-colors ${formData.shift === 'Day' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      ☀ Day
                    </button>
                    <button type="button" onClick={() => handleChange('shift', 'Night')}
                      className={`text-sm font-semibold rounded-lg transition-colors ${formData.shift === 'Night' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${isGood ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'}`}>
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isGood ? 'text-emerald-600' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isGood ? 'text-emerald-900' : 'text-gray-700'}`}>Good / QC Approved</p>
                    <p className="text-xs text-gray-400 mt-0.5">May have a partial box for the remainder</p>
                  </div>
                </button>
                <button type="button" onClick={() => handleChange('output_type', 'Wastage')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${!isGood ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}>
                  <XCircle className={`w-5 h-5 flex-shrink-0 ${!isGood ? 'text-red-500' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${!isGood ? 'text-red-900' : 'text-gray-700'}`}>Wastage</p>
                    <p className="text-xs text-gray-400 mt-0.5">Always full boxes — all barcoded immediately</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantity Configuration */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Quantity Configuration <span className="text-red-400">*</span>
              </p>

              {/* Shift summary source panel */}
              <div className={`mb-4 px-4 py-3 rounded-xl border text-xs ${
                shiftSummary && summaryQty > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : shiftSummary && summaryQty === 0 ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <div className="flex items-start gap-2">
                  <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${shiftSummary && summaryQty > 0 ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <div>
                    {shiftSummary ? (
                      summaryQty > 0 ? (
                        <>
                          <span className="font-semibold">Shift summary found — </span>
                          {summaryLabel}: <span className="font-bold">{summaryQty.toLocaleString()} units</span> auto-populated below.
                          {isGood && alreadyBoxedQty > 0 && (
                            <span className="block mt-1">
                              Already boxed: <span className="font-semibold">{alreadyBoxedQty.toLocaleString()}</span> ·
                              Remaining to box: <span className="font-semibold text-emerald-900">{qtyToBox.toLocaleString()}</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <><span className="font-semibold">Shift summary found but {summaryLabel} = 0.</span> Enter quantity manually if needed.</>
                      )
                    ) : (
                      <><span className="font-semibold">No shift summary for this date + shift.</span> Save a shift summary in Production Floor first, or enter quantity manually below.</>
                    )}
                  </div>
                </div>
              </div>

              <div className={`mb-4 px-4 py-3 rounded-xl border text-xs ${
                shipmentContext.selected ? 'bg-blue-50 border-blue-200 text-blue-800'
                : shipmentContext.isMixed ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <div className="flex items-start gap-2">
                  <Layers className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    shipmentContext.selected ? 'text-blue-600'
                    : shipmentContext.isMixed ? 'text-red-500'
                    : 'text-gray-400'
                  }`} />
                  <div>
                    {shipmentContext.selected ? (
                      <>
                        <span className="font-semibold">Shipment resolved â€” </span>
                        {shipmentLabel} · barcode code <span className="font-mono font-bold">{shipmentCode}</span> · {shipmentContext.chipBoxCount} chip box{shipmentContext.chipBoxCount !== 1 ? 'es' : ''} issued to this shift.
                      </>
                    ) : shipmentContext.isMixed ? (
                      <>
                        <span className="font-semibold">Mixed shipment issue detected.</span> This shift contains chip boxes from multiple shipments, so QC/WST barcode generation is blocked until the boxes are separated by shipment.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">Shipment not resolved yet.</span> Issue chip boxes to this shift first so the QC/WST barcode can inherit the correct shipment code.
                      </>
                    )}
                  </div>
                </div>
              </div>

              {errors.shipment && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{errors.shipment}</p>
                </div>
              )}

              {errors.qty && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{errors.qty}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Quantity */}
                <div>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      {summaryLabel} Count <span className="text-red-400">*</span>
                    </span>
                    {shiftSummary && summaryQty > 0 && manualQtyOverride === '' && (
                      <span className="text-xs text-emerald-600 font-normal flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> From summary
                      </span>
                    )}
                  </label>
                  <input
                    type="number" min="1"
                    value={manualQtyOverride !== '' ? manualQtyOverride : (summaryQty > 0 ? String(summaryQty) : '')}
                    onChange={e => setManualQtyOverride(e.target.value)}
                    placeholder="Enter count..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                  />
                  {manualQtyOverride !== '' && summaryQty > 0 && (
                    <button type="button" onClick={() => setManualQtyOverride('')}
                      className="mt-1 text-xs text-blue-600 hover:underline">
                      ↩ Restore from summary ({summaryQty.toLocaleString()})
                    </button>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {isGood
                      ? 'QC approved count from shift summary'
                      : 'Wastage count — will be split into full boxes'}
                  </p>
                </div>

                {/* Per Box Quantity */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Package className="w-3.5 h-3.5" />
                    Per Box Quantity <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number" min="1"
                    value={formData.per_box_quantity}
                    onChange={e => handleChange('per_box_quantity', e.target.value)}
                    placeholder="e.g. 500"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${errors.per_box ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {errors.per_box && <p className="mt-1 text-xs text-red-500">{errors.per_box}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    {isGood ? 'Remainder becomes a partial box' : 'Last box absorbs the remainder — no partials'}
                  </p>
                </div>
              </div>

              {/* Box plan preview */}
              {boxPlan && qtyToBox > 0 && (
                <div className="mt-4 space-y-2">
                  {boxPlan.filledPartial && (
                    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-xs ${boxPlan.filledPartial.nowFull ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                      <span className="flex-shrink-0 mt-0.5">{boxPlan.filledPartial.nowFull ? '✓' : '→'}</span>
                      <div>
                        <span className="font-semibold">Partial box update: </span>
                        {openPartialBox?.sub_box_name} gets +{boxPlan.filledPartial.addQty} units
                        ({openPartialBox?.quantity} → {(openPartialBox?.quantity || 0) + boxPlan.filledPartial.addQty})
                        {boxPlan.filledPartial.nowFull
                          ? ' → becomes FULL, barcode generated ✓'
                          : ` → still partial (needs ${(openPartialBox?.target_per_box || perBoxQty) - ((openPartialBox?.quantity || 0) + boxPlan.filledPartial.addQty)} more)`}
                      </div>
                    </div>
                  )}
                  {(boxPlan.newFull.length > 0 || boxPlan.newPartial) && (
                    <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                      <span className="font-bold text-sm text-blue-900">
                        {boxPlan.newFull.length + (boxPlan.newPartial ? 1 : 0)} new sub-box{(boxPlan.newFull.length + (boxPlan.newPartial ? 1 : 0)) !== 1 ? 'es' : ''} will be created:
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {boxPlan.newFull.length > 0 && (
                          <p>· {boxPlan.newFull.length} full box{boxPlan.newFull.length !== 1 ? 'es' : ''} × {perBoxQty.toLocaleString()} units each — barcodes generated</p>
                        )}
                        {boxPlan.newPartial && (
                          <p className="text-amber-700 font-medium">· 1 partial box × {boxPlan.newPartial.quantity} units — NO barcode until filled or closed</p>
                        )}
                        {!isGood && boxPlan.newFull.some(b => b.quantity !== perBoxQty) && (
                          <p>· Last box has {boxPlan.newFull[boxPlan.newFull.length-1].quantity} units (remainder absorbed)</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="p-5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
                <FileText className="w-3.5 h-3.5" /> Remarks <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.remarks}
                onChange={e => handleChange('remarks', e.target.value)}
                rows={2}
                placeholder="Notes about this production output..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* ── RIGHT: Preview + Submit ──────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Session Preview</p>

              <div className="flex flex-col items-center text-center mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2 ${
                  !isReady ? 'bg-gray-50 border-gray-200'
                  : isGood ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
                }`}>
                  {!isReady
                    ? <Package className="w-6 h-6 text-gray-300" />
                    : isGood ? <CheckCircle className="w-6 h-6 text-emerald-500" />
                    : <XCircle className="w-6 h-6 text-red-400" />}
                </div>
                <span className={`text-sm font-bold ${!isReady ? 'text-gray-400' : isGood ? 'text-emerald-800' : 'text-red-700'}`}>
                  {isReady ? (isGood ? 'QC Approved Output' : 'Wastage Output') : 'Fill form to preview'}
                </span>
              </div>

              <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
                {[
                  ['Date',          formData.production_date || '—'],
                  ['Shift',         formData.shift],
                  ['Shipment',      shipmentLabel],
                  ['Ship code',     shipmentCode],
                  [summaryLabel,    totalQty > 0 ? `${totalQty.toLocaleString()} units` : '—'],
                  ['Already boxed', isGood && alreadyBoxedQty > 0 ? `${alreadyBoxedQty.toLocaleString()} units` : '—'],
                  ['To box now',    qtyToBox > 0 ? `${qtyToBox.toLocaleString()} units` : '—'],
                  ['Per box',       perBoxQty > 0 ? `${perBoxQty.toLocaleString()} units` : '—'],
                  ['New full boxes', boxPlan ? String(boxPlan.newFull.length) : '—'],
                  ['New partial',    isGood && boxPlan?.newPartial ? `${boxPlan.newPartial.quantity} units` : 'None'],
                  ['Partial fill',   boxPlan?.filledPartial
                    ? boxPlan.filledPartial.nowFull ? 'Will become FULL ✓' : `+${boxPlan.filledPartial.addQty} units`
                    : 'N/A'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-gray-400">{k}</span>
                    <span className={`font-semibold ${
                      k === 'New partial' && v !== 'None' ? 'text-amber-600'
                      : k === 'New full boxes' && boxPlan?.newFull.length > 0 ? 'text-emerald-700'
                      : k === 'Partial fill' && v?.includes('FULL') ? 'text-emerald-600'
                      : 'text-gray-800'
                    }`}>{v}</span>
                  </div>
                ))}
              </div>

              {previewBoxNames.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Box names (new full):</p>
                  {previewBoxNames.map((n, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="text-xs font-mono text-gray-700">{n}</span>
                    </div>
                  ))}
                  {boxPlan && boxPlan.newFull.length > 4 && (
                    <p className="text-xs text-gray-400 pl-3.5">+{boxPlan.newFull.length - 4} more...</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button type="submit" disabled={!isReady}
                className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl shadow-sm transition-colors ${
                  !isReady ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : isGood ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
                }`}>
                <Save className="w-4 h-4" />
                {boxPlan
                  ? `Create ${boxPlan.newFull.length + (boxPlan.newPartial ? 1 : 0)} Box${(boxPlan.newFull.length + (boxPlan.newPartial ? 1 : 0)) !== 1 ? 'es' : ''}${boxPlan.filledPartial ? ' + Fill Partial' : ''}`
                  : 'Create Boxes'}
              </button>
              <button type="button" onClick={onBack}
                className="w-full py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
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
