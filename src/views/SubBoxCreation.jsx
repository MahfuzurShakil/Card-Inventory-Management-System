import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Hash,
  Layers,
  Lock,
  Package,
  Printer,
  Save,
  X,
  XCircle,
} from 'lucide-react';
import { createProductionBarcode } from '../utils/barcode';
import {
  getFinishedGoodsContextLine,
  openFinishedGoodsPrintWindow,
} from '../utils/finishedGoodsLabels';
import FinishedGoodsLabelPreview from '../components/FinishedGoodsLabelPreview';
import {
  applyRecordOutputContext,
  buildRecordOutputViewModel,
  buildSubBoxPrefix,
  compareShiftWindows,
  createDefaultRecordOutputFormData,
  generateSubBoxName,
  getRecordOutputPreview,
  getShipmentKey,
} from '../utils/recordOutput';

const toneClassMap = {
  error: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  neutral: 'border-gray-200 bg-gray-50 text-gray-700',
};

const statusClassMap = {
  error: {
    iconWrap: 'border-red-200 bg-red-50',
    icon: 'text-red-500',
    text: 'text-red-700',
  },
  warning: {
    iconWrap: 'border-amber-200 bg-amber-50',
    icon: 'text-amber-500',
    text: 'text-amber-700',
  },
  success: {
    iconWrap: 'border-emerald-200 bg-emerald-50',
    icon: 'text-emerald-500',
    text: 'text-emerald-700',
  },
  neutral: {
    iconWrap: 'border-gray-200 bg-gray-50',
    icon: 'text-gray-300',
    text: 'text-gray-400',
  },
};

function getFieldErrorBorder(hasError) {
  return hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50';
}

function ShiftToggle({ value, onChange, compact = false }) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${compact ? 'h-[42px]' : 'h-[46px]'}`}>
      {['Day', 'Night'].map((shift) => (
        <button
          key={shift}
          type="button"
          onClick={() => onChange(shift)}
          className={`rounded-xl text-sm font-semibold transition-colors ${
            value === shift
              ? shift === 'Day'
                ? 'bg-amber-500 text-white'
                : 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {shift}
        </button>
      ))}
    </div>
  );
}

function InlineCallout({ tone = 'neutral', title, message }) {
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${toneClassMap[tone] || toneClassMap.neutral}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5">{message}</p>
    </div>
  );
}

function SummaryValue({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-right font-semibold text-gray-800">{value}</span>
    </div>
  );
}

function ShiftWindowList({ title, subtitle, rows, emptyText, tone = 'blue' }) {
  const toneStyles = tone === 'amber'
    ? 'border-amber-200 bg-amber-50'
    : tone === 'red'
      ? 'border-red-200 bg-red-50'
      : 'border-blue-200 bg-blue-50';

  return (
    <div className={`rounded-2xl border ${toneStyles}`}>
      <div className="border-b border-white/70 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-gray-600">{subtitle}</p>}
      </div>
      <div className="px-4 py-3">
        {rows?.length > 0 ? (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={`${row.productionShiftId}-${row.packagingRunId || 'open'}`} className="rounded-xl border border-white/80 bg-white/80 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {row.productionDate} · {row.shift}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Production Shift ID {row.productionShiftId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {(row.wastageQuantity || 0).toLocaleString()} units
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {row.packagingRunId ? `Packaged (#${row.packagingRunId})` : 'Not packaged'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function CloseCarryForwardModal({ partialBox, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Close Carry-Forward Box?</h3>
            <p className="mt-1 text-sm text-gray-600">
              {partialBox.sub_box_name || partialBox.box_name} currently holds {(partialBox.quantity || 0).toLocaleString()} units.
              Closing it will mark the box as full and allow printing/challan actions.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Keep Open
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
          >
            Close Carry-Forward
          </button>
        </div>
      </div>
    </div>
  );
}

function PackagingResultModal({ result, onDone }) {
  const printableBoxes = result.printableBoxes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-gray-900">
                {result.totalAffectedBoxes} box{result.totalAffectedBoxes !== 1 ? 'es' : ''} updated successfully
              </h2>
            </div>
            <p className="text-sm text-gray-500">
              Only full and closed boxes are shown for barcode printing.
            </p>
          </div>
          <button type="button" onClick={onDone} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {result.filledCarryForward && (
          <div className={`mx-6 mt-4 rounded-xl border px-4 py-3 text-xs ${
            result.filledCarryForward.nowFull
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            <span className="font-semibold">
              {result.filledCarryForward.nowFull ? 'Carry-forward finalized:' : 'Carry-forward updated:'}
            </span>{' '}
            {result.filledCarryForward.box.sub_box_name || result.filledCarryForward.box.box_name} now holds {(result.filledCarryForward.patch.quantity || 0).toLocaleString()} units.
          </div>
        )}

        {result.newPartialBox && (
          <div className="mx-6 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <span className="font-semibold">Partial box kept open:</span>{' '}
            {result.newPartialBox.sub_box_name} holds {(result.newPartialBox.quantity || 0).toLocaleString()} units.
            It has a barcode for tracking but is excluded from print and challan until finalized.
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-gray-100 p-6">
          {printableBoxes.length > 0 ? (
            <div className="space-y-4">
              {printableBoxes.map((box) => (
                <FinishedGoodsLabelPreview key={box.barcode || box.sub_box_name} subBox={box} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center text-sm text-gray-500">
              No printable barcode labels were generated in this session.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <p className="text-sm text-gray-600">
            Review the printable boxes now or return to the finished goods list.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onDone}
              className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-white"
            >
              Back to List
            </button>
            {printableBoxes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  openFinishedGoodsPrintWindow(printableBoxes);
                  onDone();
                }}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Printer className="h-4 w-4" />
                Print Barcodes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusSummary({ tone, title, rows }) {
  const statusStyle = statusClassMap[tone] || statusClassMap.neutral;
  const StatusIcon = tone === 'success' ? CheckCircle : tone === 'error' ? XCircle : tone === 'warning' ? AlertTriangle : Package;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Summary</p>
      <div className="mb-5 mt-5 flex flex-col items-center text-center">
        <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 ${statusStyle.iconWrap}`}>
          <StatusIcon className={`h-7 w-7 ${statusStyle.icon}`} />
        </div>
        <p className={`text-xl font-bold ${statusStyle.text}`}>{title}</p>
      </div>
      <div className="space-y-3 border-t border-gray-100 pt-4">
        {rows.map(([label, value]) => (
          <SummaryValue key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

const SubBoxCreation = ({
  onSave,
  onUpdateSubBox,
  onBack,
  boxes = [],
  subBoxes = [],
  shiftSummaries = [],
  inboundMaterials = [],
  lcs = [],
  recordOutputContext = null,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const defaultFormData = useMemo(() => createDefaultRecordOutputFormData(today), [today]);
  const [formData, setFormData] = useState(() => applyRecordOutputContext(defaultFormData, recordOutputContext));
  const [errors, setErrors] = useState({});
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [printResult, setPrintResult] = useState(null);

  useEffect(() => {
    if (!recordOutputContext) return;
    setFormData((prev) => ({
      ...applyRecordOutputContext(defaultFormData, recordOutputContext),
      perBoxQuantity: prev.perBoxQuantity || defaultFormData.perBoxQuantity,
      remarks: prev.remarks || '',
    }));
  }, [defaultFormData, recordOutputContext]);

  const isGood = formData.outputType === 'Good/ QC Approved';
  const perBoxQuantity = parseInt(formData.perBoxQuantity, 10) || 0;

  const preview = useMemo(() => getRecordOutputPreview({
    formData,
    boxes,
    subBoxes,
    shiftSummaries,
    inboundMaterials,
    lcs,
  }), [boxes, formData, inboundMaterials, lcs, shiftSummaries, subBoxes]);

  const viewModel = useMemo(
    () => buildRecordOutputViewModel({ formData, preview, perBoxQuantity }),
    [formData, perBoxQuantity, preview]
  );

  const plannedBoxes = useMemo(() => {
    if (!viewModel.boxPlan) return null;

    let sequence = (() => {
      const prefix = buildSubBoxPrefix({
        outputType: formData.outputType,
        productionDate: formData.productionDate,
        shift: formData.shift,
        dateTo: formData.dateTo,
        isRangeMode: !isGood && compareShiftWindows(formData.dateFrom, formData.fromShift, formData.dateTo, formData.toShift) !== 0,
      });

      const numbers = subBoxes
        .map((subBox) => subBox.sub_box_name || subBox.box_name || '')
        .filter((name) => name.startsWith(prefix))
        .map((name) => parseInt(name.slice(-3), 10) || 0);

      return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    })();

    const newFull = viewModel.boxPlan.newFull.map((box) => ({ ...box, seq: sequence++ }));
    const newPartial = viewModel.boxPlan.newPartial ? { ...viewModel.boxPlan.newPartial, seq: sequence } : null;

    return {
      ...viewModel.boxPlan,
      newFull,
      newPartial,
    };
  }, [formData.dateFrom, formData.dateTo, formData.fromShift, formData.outputType, formData.productionDate, formData.shift, formData.toShift, isGood, subBoxes, viewModel.boxPlan]);

  const nextBarcodeSequence = useMemo(() => {
    const lineage = preview.representativeLineage;
    if (!lineage) return 1;

    return subBoxes.filter((subBox) => {
      if (!subBox.barcode || subBox.output_type !== formData.outputType) return false;
      return getShipmentKey(preview.resolveLineage(subBox)) === getShipmentKey(lineage);
    }).length + 1;
  }, [formData.outputType, preview, subBoxes]);

  const previewNames = useMemo(() => {
    if (!plannedBoxes) return [];
    return plannedBoxes.newFull.slice(0, 4).map((box) => generateSubBoxName(box.seq, {
      outputType: formData.outputType,
      productionDate: formData.productionDate,
      shift: formData.shift,
      dateTo: formData.dateTo,
      isRangeMode: !isGood && compareShiftWindows(formData.dateFrom, formData.fromShift, formData.dateTo, formData.toShift) !== 0,
    }));
  }, [formData.dateFrom, formData.dateTo, formData.fromShift, formData.outputType, formData.productionDate, formData.shift, formData.toShift, isGood, plannedBoxes]);

  const fieldReady = isGood
    ? !!formData.productionDate && !!formData.shift && perBoxQuantity > 0
    : !!formData.lcId && !!formData.dateFrom && !!formData.fromShift && !!formData.dateTo && !!formData.toShift && perBoxQuantity > 0;

  const createCount = (plannedBoxes?.newFull.length || 0) + (plannedBoxes?.newPartial ? 1 : 0);
  const summaryTitle = isGood ? 'QC Approved Output' : 'Wastage Output';
  const labelContext = getFinishedGoodsContextLine({
    output_type: formData.outputType,
    production_date: formData.productionDate,
    shift: formData.shift,
    lc_number: preview.selectedLc?.lc_number || viewModel.response?.currentShiftLcNumber,
    date_from: formData.dateFrom,
    date_to: formData.dateTo,
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateFields = () => {
    const nextErrors = {};

    if (isGood) {
      if (!formData.productionDate) nextErrors.productionDate = 'Production date is required.';
      if (!formData.shift) nextErrors.shift = 'Shift is required.';
    } else {
      if (!formData.lcId) nextErrors.lcId = 'LC is required.';
      if (!formData.dateFrom) nextErrors.dateFrom = 'From date is required.';
      if (!formData.fromShift) nextErrors.fromShift = 'From shift is required.';
      if (!formData.dateTo) nextErrors.dateTo = 'To date is required.';
      if (!formData.toShift) nextErrors.toShift = 'To shift is required.';
      if (
        formData.dateFrom
        && formData.dateTo
        && compareShiftWindows(formData.dateFrom, formData.fromShift, formData.dateTo, formData.toShift) > 0
      ) {
        nextErrors.dateTo = 'To date/shift must be after the from date/shift.';
      }
    }

    if (perBoxQuantity <= 0) nextErrors.perBoxQuantity = 'Per box quantity must be greater than 0.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCloseCarryForward = () => {
    if (!preview.openCarryForwardSource || !onUpdateSubBox) return;

    const sourceBox = preview.openCarryForwardSource;
    const lineage = preview.representativeLineage || preview.carryForwardLineage;
    const patch = {
      box_type: 'Full',
      is_closed: true,
      lc_id: lineage?.lcId ?? sourceBox.lc_id ?? null,
      lc_number: lineage?.lcNumber || sourceBox.lc_number || null,
      barcode: sourceBox.barcode || createProductionBarcode({
        outputType: sourceBox.output_type,
        shipmentNumber: lineage?.shipmentNumber || sourceBox.shipment_number,
        shipmentId: lineage?.shipmentId ?? sourceBox.shipment_id ?? null,
        sequence: nextBarcodeSequence,
      }),
      updated_at: new Date().toISOString(),
    };

    onUpdateSubBox(sourceBox.id, patch);
    setShowCloseModal(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateFields()) return;
    if (!viewModel.canCreate || !plannedBoxes || !preview.representativeLineage) return;

    const barcodeDate = new Date();
    let barcodeSequence = nextBarcodeSequence;
    const result = {
      outputType: formData.outputType,
      printableBoxes: [],
      filledCarryForward: null,
      newPartialBox: null,
      totalAffectedBoxes: 0,
    };

    if (plannedBoxes.filledCarryForward && preview.openCarryForwardSource && onUpdateSubBox) {
      const sourceBox = preview.openCarryForwardSource;
      const patch = {
        quantity: (sourceBox.quantity || 0) + plannedBoxes.filledCarryForward.addQty,
        lc_id: preview.representativeLineage.lcId ?? sourceBox.lc_id ?? null,
        lc_number: preview.representativeLineage.lcNumber || sourceBox.lc_number || null,
        updated_at: new Date().toISOString(),
        ...(plannedBoxes.filledCarryForward.nowFull && {
          box_type: 'Full',
          is_closed: true,
          barcode: sourceBox.barcode || createProductionBarcode({
            outputType: sourceBox.output_type,
            shipmentNumber: preview.representativeLineage.shipmentNumber,
            shipmentId: preview.representativeLineage.shipmentId,
            sequence: barcodeSequence++,
            date: barcodeDate,
          }),
        }),
      };

      onUpdateSubBox(sourceBox.id, patch);
      result.totalAffectedBoxes += 1;
      result.filledCarryForward = { box: sourceBox, patch, nowFull: plannedBoxes.filledCarryForward.nowFull };
      if (plannedBoxes.filledCarryForward.nowFull) {
        result.printableBoxes.push({ ...sourceBox, ...patch });
      }
    }

    plannedBoxes.newFull.forEach((box) => {
      const subBoxName = generateSubBoxName(box.seq, {
        outputType: formData.outputType,
        productionDate: formData.productionDate,
        shift: formData.shift,
        dateTo: formData.dateTo,
        isRangeMode: !isGood && compareShiftWindows(formData.dateFrom, formData.fromShift, formData.dateTo, formData.toShift) !== 0,
      });

      const boxData = {
        production_shift_id: viewModel.response?.productionShiftId ?? null,
        production_date: isGood ? formData.productionDate : formData.dateTo,
        shift: isGood ? formData.shift : null,
        output_type: formData.outputType,
        sourceType: 'production',
        shipment_id: preview.representativeLineage.shipmentId ?? null,
        shipment_number: preview.representativeLineage.shipmentNumber || null,
        lc_id: isGood ? (viewModel.response?.currentShiftLcId ?? null) : (preview.selectedLc?.id ?? null),
        lc_number: isGood ? (viewModel.response?.currentShiftLcNumber || null) : (preview.selectedLc?.lc_number || null),
        date_from: isGood ? formData.productionDate : formData.dateFrom,
        date_to: isGood ? formData.productionDate : formData.dateTo,
        from_shift: isGood ? formData.shift : formData.fromShift,
        to_shift: isGood ? formData.shift : formData.toShift,
        packaging_scope: viewModel.response?.packagingScope || (isGood ? 'SHIFT' : 'LC_SHIFT_WINDOW'),
        quantity: box.quantity,
        box_type: 'Full',
        is_closed: true,
        barcode: createProductionBarcode({
          outputType: formData.outputType,
          shipmentNumber: preview.representativeLineage.shipmentNumber,
          shipmentId: preview.representativeLineage.shipmentId,
          sequence: barcodeSequence++,
          date: barcodeDate,
        }),
        sub_box_name: subBoxName,
        box_name: subBoxName,
        target_per_box: perBoxQuantity,
        remarks: formData.remarks,
        delivery_status: 'delivery_pending',
        challan_status: null,
        challan_receiver_name: null,
        challan_receiver_address: null,
        client_rejected_count: 0,
        created_by: 'Production Staff',
        created_at: new Date().toISOString(),
      };

      onSave(boxData);
      result.totalAffectedBoxes += 1;
      result.printableBoxes.push(boxData);
    });

    if (plannedBoxes.newPartial) {
      const subBoxName = generateSubBoxName(plannedBoxes.newPartial.seq, {
        outputType: formData.outputType,
        productionDate: formData.productionDate,
        shift: formData.shift,
        dateTo: formData.dateTo,
        isRangeMode: !isGood && compareShiftWindows(formData.dateFrom, formData.fromShift, formData.dateTo, formData.toShift) !== 0,
      });

      const partialBox = {
        production_shift_id: viewModel.response?.productionShiftId ?? null,
        production_date: formData.productionDate,
        shift: formData.shift,
        output_type: formData.outputType,
        sourceType: 'production',
        shipment_id: preview.representativeLineage.shipmentId ?? null,
        shipment_number: preview.representativeLineage.shipmentNumber || null,
        lc_id: viewModel.response?.currentShiftLcId ?? preview.selectedLc?.id ?? null,
        lc_number: viewModel.response?.currentShiftLcNumber || preview.selectedLc?.lc_number || null,
        date_from: formData.productionDate,
        date_to: formData.productionDate,
        from_shift: formData.shift,
        to_shift: formData.shift,
        packaging_scope: viewModel.response?.packagingScope || 'SHIFT',
        quantity: plannedBoxes.newPartial.quantity,
        box_type: 'Partial',
        is_closed: false,
        barcode: createProductionBarcode({
          outputType: formData.outputType,
          shipmentNumber: preview.representativeLineage.shipmentNumber,
          shipmentId: preview.representativeLineage.shipmentId,
          sequence: barcodeSequence++,
          date: barcodeDate,
        }),
        sub_box_name: subBoxName,
        box_name: subBoxName,
        target_per_box: perBoxQuantity,
        remarks: formData.remarks,
        delivery_status: 'delivery_pending',
        challan_status: null,
        challan_receiver_name: null,
        challan_receiver_address: null,
        client_rejected_count: 0,
        created_by: 'Production Staff',
        created_at: new Date().toISOString(),
      };

      onSave(partialBox);
      result.totalAffectedBoxes += 1;
      result.newPartialBox = partialBox;
    }

    setPrintResult(result);
  };

  return (
    <div className="space-y-5">
      {printResult && <PackagingResultModal result={printResult} onDone={() => { setPrintResult(null); onBack(); }} />}
      {showCloseModal && preview.openCarryForwardSource && (
        <CloseCarryForwardModal
          partialBox={preview.openCarryForwardSource}
          onConfirm={handleCloseCarryForward}
          onCancel={() => setShowCloseModal(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Production Output</h1>
          <p className="mt-1 text-sm text-gray-400">
            Load packaging context from the backend, validate the scope, and create finished sub-boxes.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2.1fr)_420px]">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Output Type <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleChange('outputType', 'Good/ QC Approved')}
                  className={`rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                    isGood ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isGood ? 'text-emerald-600' : 'text-gray-300'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${isGood ? 'text-emerald-900' : 'text-gray-700'}`}>Good / QC Approved</p>
                      <p className="mt-1 text-xs text-gray-400">Auto-loads quantity by production date and shift.</p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('outputType', 'Wastage')}
                  className={`rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                    !isGood ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <XCircle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${!isGood ? 'text-red-500' : 'text-gray-300'}`} />
                    <div>
                      <p className={`text-sm font-semibold ${!isGood ? 'text-red-900' : 'text-gray-700'}`}>Wastage</p>
                      <p className="mt-1 text-xs text-gray-400">Requires LC, date-from, from shift, date-to, and to shift.</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="border-b border-gray-100 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                {isGood ? 'QC Scope' : 'Wastage Scope'}
              </p>

              {isGood ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <Calendar className="h-3.5 w-3.5" /> Production Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.productionDate}
                      max={today}
                      onChange={(event) => handleChange('productionDate', event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 ${getFieldErrorBorder(errors.productionDate)}`}
                    />
                    {errors.productionDate && <p className="mt-1.5 text-xs text-red-500">{errors.productionDate}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <Clock className="h-3.5 w-3.5" /> Shift <span className="text-red-400">*</span>
                    </label>
                    <ShiftToggle value={formData.shift} onChange={(value) => handleChange('shift', value)} />
                    {errors.shift && <p className="mt-1.5 text-xs text-red-500">{errors.shift}</p>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <Layers className="h-3.5 w-3.5" /> LC Number <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.lcId}
                      onChange={(event) => handleChange('lcId', event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 ${getFieldErrorBorder(errors.lcId)}`}
                    >
                      <option value="">Select LC</option>
                      {preview.lcOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.lc_number}
                        </option>
                      ))}
                    </select>
                    {errors.lcId && <p className="mt-1.5 text-xs text-red-500">{errors.lcId}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <Calendar className="h-3.5 w-3.5" /> From Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateFrom}
                      max={today}
                      onChange={(event) => handleChange('dateFrom', event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 ${getFieldErrorBorder(errors.dateFrom)}`}
                    />
                    {errors.dateFrom && <p className="mt-1.5 text-xs text-red-500">{errors.dateFrom}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <Clock className="h-3.5 w-3.5" /> From Shift <span className="text-red-400">*</span>
                    </label>
                    <ShiftToggle value={formData.fromShift} onChange={(value) => handleChange('fromShift', value)} compact />
                    {errors.fromShift && <p className="mt-1.5 text-xs text-red-500">{errors.fromShift}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <Calendar className="h-3.5 w-3.5" /> To Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateTo}
                      max={today}
                      onChange={(event) => handleChange('dateTo', event.target.value)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 ${getFieldErrorBorder(errors.dateTo)}`}
                    />
                    {errors.dateTo && <p className="mt-1.5 text-xs text-red-500">{errors.dateTo}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                      <Clock className="h-3.5 w-3.5" /> To Shift <span className="text-red-400">*</span>
                    </label>
                    <ShiftToggle value={formData.toShift} onChange={(value) => handleChange('toShift', value)} compact />
                    {errors.toShift && <p className="mt-1.5 text-xs text-red-500">{errors.toShift}</p>}
                  </div>
                </div>
              )}
            </div>

            {isGood && viewModel.carryForwardBox && (
              <div className="border-b border-gray-100 p-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Open Carry-Forward Box</p>
                      <p className="mt-1 font-mono text-xs text-gray-500">{viewModel.carryForwardBox.subBoxName}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      viewModel.response?.carryForwardReusable ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {viewModel.response?.carryForwardReusable ? 'Reusable' : 'Close First'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Current Quantity</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{(viewModel.carryForwardBox.quantity || 0).toLocaleString()} units</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Per Box Quantity</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{(viewModel.carryForwardBox.perBoxQuantity || 0).toLocaleString()} units</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Carry-Forward LC</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">{viewModel.response?.carryForwardLcNumber || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCloseModal(true)}
                      className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-700"
                    >
                      Close Carry-Forward
                    </button>
                    <p className="text-xs text-gray-500">
                      {viewModel.response?.carryForwardReusable
                        ? 'This box will be filled first from the selected QC approved quantity.'
                        : (viewModel.response?.carryForwardBlockedReason || 'This carry-forward box is blocking new packaging.')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="border-b border-gray-100 p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Quantity &amp; Sub-Box Configuration
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <Hash className="h-3.5 w-3.5" />
                    {isGood ? 'QC Approved Quantity' : 'Quantity of the Scope'}
                  </label>
                  <div className="flex min-h-[46px] items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-800">
                    {viewModel.totalQuantity > 0 ? `${viewModel.totalQuantity.toLocaleString()} units` : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <Package className="h-3.5 w-3.5" /> Per Box Quantity <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perBoxQuantity}
                    onChange={(event) => handleChange('perBoxQuantity', event.target.value)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 ${getFieldErrorBorder(errors.perBoxQuantity)}`}
                  />
                  {errors.perBoxQuantity && <p className="mt-1.5 text-xs text-red-500">{errors.perBoxQuantity}</p>}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {viewModel.callouts.map((callout, index) => (
                  <InlineCallout
                    key={`${callout.title}-${index}`}
                    tone={callout.tone}
                    title={callout.title}
                    message={callout.message}
                  />
                ))}
              </div>

              {plannedBoxes && previewNames.length > 0 && (
                <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Preview Labels</p>
                  <div className="mt-2 space-y-1">
                    {previewNames.map((name) => (
                      <p key={name} className="font-mono text-xs text-blue-900">{name}</p>
                    ))}
                    {plannedBoxes.newFull.length > 4 && (
                      <p className="text-xs text-blue-700">+{plannedBoxes.newFull.length - 4} more full boxes</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isGood && (viewModel.selectedWindowSummary || viewModel.lcOverallSummary) && (
              <div className="border-b border-gray-100 p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Wastage Scope Insights
                </p>
                <div className="space-y-4">
                  {viewModel.selectedWindowSummary && (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Selected Window Total</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {(viewModel.selectedWindowSummary.totalWastageQuantity || 0).toLocaleString()} units
                          </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Already Packaged</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {(viewModel.selectedWindowSummary.alreadyPackagedQuantity || 0).toLocaleString()} units
                          </p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Remaining to Package</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {(viewModel.selectedWindowSummary.remainingWastageQuantity || 0).toLocaleString()} units
                          </p>
                        </div>
                      </div>
                      <ShiftWindowList
                        title="Included Shifts"
                        subtitle="These shifts are inside the selected date and shift window."
                        rows={viewModel.selectedWindowSummary.includedShifts}
                        emptyText="No wastage shifts are included in this selected scope."
                      />
                      <ShiftWindowList
                        title="Already Packaged Shifts"
                        subtitle="These shifts overlap with wastage packaging that has already been recorded."
                        rows={viewModel.selectedWindowSummary.packagedShifts}
                        emptyText="No overlap with already packaged wastage shifts."
                        tone="amber"
                      />
                      <ShiftWindowList
                        title="Still Unpackaged in Selected Scope"
                        subtitle="These are the shifts that can still contribute to new wastage boxes."
                        rows={viewModel.selectedWindowSummary.unpackagedShifts}
                        emptyText="No unpackaged wastage remains in the selected window."
                      />
                    </>
                  )}

                  {viewModel.lcOverallSummary && (
                    <ShiftWindowList
                      title="LC Overall Pending Wastage"
                      subtitle={`This LC still has ${(viewModel.lcOverallSummary.lcTotalRemainingWastageQuantity || 0).toLocaleString()} units unpackaged across all recorded shifts.`}
                      rows={viewModel.lcOverallSummary.lcUnpackagedShifts}
                      emptyText="No remaining unpackaged wastage is pending for this LC."
                      tone="red"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="p-5">
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <FileText className="h-3.5 w-3.5" /> Remarks <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={formData.remarks}
                onChange={(event) => handleChange('remarks', event.target.value)}
                placeholder="Optional notes about this packaging run..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm transition-all focus:border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <StatusSummary tone={viewModel.statusTone} title={summaryTitle} rows={viewModel.summaryRows} />

            {fieldReady && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Label Context</p>
                <p className="text-sm font-semibold text-gray-900">{labelContext}</p>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={!fieldReady || !viewModel.canCreate}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors ${
                  !fieldReady || !viewModel.canCreate
                    ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                    : isGood
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <Save className="h-4 w-4" />
                {createCount > 0 ? `Create ${createCount} Sub-Box${createCount !== 1 ? 'es' : ''}` : 'Create Sub-Boxes'}
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>

            {plannedBoxes && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Creation Plan</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><span className="font-semibold text-gray-900">{plannedBoxes.newFull.length}</span> new full box{plannedBoxes.newFull.length !== 1 ? 'es' : ''}</p>
                  <p><span className="font-semibold text-gray-900">{plannedBoxes.carryForwardFillQuantity.toLocaleString()}</span> units fill carry-forward first</p>
                  <p><span className="font-semibold text-gray-900">{plannedBoxes.remainingAfterCarryForward.toLocaleString()}</span> units remain after carry-forward fill</p>
                  <p><span className="font-semibold text-gray-900">{plannedBoxes.newPartialQuantity.toLocaleString()}</span> units stay partial</p>
                </div>
              </div>
            )}

            {!fieldReady && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-sm font-semibold text-gray-900">Fill the required scope first</p>
                <p className="mt-1 text-xs text-gray-500">
                  Once the scope is complete, this panel will show the resolved packaging summary and the create button will become available when the selected scope is valid.
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubBoxCreation;
