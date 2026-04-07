import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  applyRecordOutputContext,
  createDefaultRecordOutputFormData,
} from '../utils/recordOutput';
import FinishedGoodsLabelPreview from '../components/FinishedGoodsLabelPreview';

function isChipBox(box) {
  return (box.item_type || box.item_name || '').toLowerCase() === 'chip';
}

function isDateInRange(value, dateFrom, dateTo) {
  if (!value || !dateFrom || !dateTo) return false;
  return value >= dateFrom && value <= dateTo;
}

function rangesOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  return startA <= endB && startB <= endA;
}

function getLcKey(lineage) {
  if (!lineage) return null;
  if (lineage.lcId != null) return `id:${lineage.lcId}`;
  if (lineage.lcNumber) return `num:${String(lineage.lcNumber).toUpperCase()}`;
  return null;
}

function getShipmentKey(lineage) {
  if (!lineage) return null;
  if (lineage.shipmentId != null) return `id:${lineage.shipmentId}`;
  if (lineage.shipmentNumber) return `num:${String(lineage.shipmentNumber).toUpperCase()}`;
  return null;
}

function sameLc(left, right) {
  const leftKey = getLcKey(left);
  const rightKey = getLcKey(right);
  return !!leftKey && leftKey === rightKey;
}

function buildSubBoxPrefix({ outputType, productionDate, shift, dateTo, isRangeMode }) {
  const isGood = outputType === 'Good/ QC Approved';
  const anchorDate = (isGood ? productionDate : dateTo || productionDate || '').replace(/-/g, '');
  if (isGood) {
    const shiftCode = shift === 'Night' ? 'N' : 'D';
    return `SB-${anchorDate}-${shiftCode}G-`;
  }
  return `SB-${anchorDate}-${isRangeMode ? 'RW' : 'W'}-`;
}

function generateSubBoxName(seq, options) {
  return `${buildSubBoxPrefix(options)}${String(seq).padStart(3, '0')}`;
}

function getLatestTimestamp(item) {
  return item.updated_at || item.created_at || '';
}

function compareNewest(left, right) {
  return getLatestTimestamp(right).localeCompare(getLatestTimestamp(left));
}

function dedupeLcEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = getLcKey(entry.lineage);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pickRepresentativeLineage(entries, expectedLc = null) {
  const filtered = entries.filter(({ lineage }) => {
    if (!lineage) return false;
    return expectedLc ? sameLc(lineage, expectedLc) : true;
  });

  const unique = [];
  const seenShipments = new Set();
  filtered.forEach(({ lineage }) => {
    const key = getShipmentKey(lineage) || `${lineage.shipmentNumber || ''}:${lineage.shipmentId || ''}`;
    if (!key || seenShipments.has(key)) return;
    seenShipments.add(key);
    unique.push(lineage);
  });

  unique.sort((left, right) => {
    const leftCode = `${left.shipmentNumber || ''}${left.shipmentId || ''}`;
    const rightCode = `${right.shipmentNumber || ''}${right.shipmentId || ''}`;
    return leftCode.localeCompare(rightCode);
  });

  return unique[0] || null;
}

function createBusinessRuleModal({ title, message, details = [], actionKey = null, actionLabel = null }) {
  return { title, message, details, actionKey, actionLabel };
}

const BusinessRuleModal = ({ modal, onClose, onAction }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900">{modal.title}</h2>
          <p className="text-sm text-gray-600 mt-1">{modal.message}</p>
        </div>
      </div>

      {modal.details?.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="space-y-2">
            {modal.details.map((detail) => (
              <div key={detail} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-gray-300 mt-0.5">•</span>
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-colors"
        >
          Close
        </button>
        {modal.actionKey && modal.actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            {modal.actionLabel}
          </button>
        )}
      </div>
    </div>
  </div>
);

const CloseCarryForwardModal = ({ partialBox, targetLc, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Close Carry Forward Box?</h3>
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{partialBox.sub_box_name}</span> currently holds{' '}
            <span className="font-semibold">{(partialBox.quantity || 0).toLocaleString()} units</span>.
            Closing it will generate a barcode immediately and remove the carry-forward block.
          </p>
        </div>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5">
        {targetLc
          ? `Current packaging scope is using ${targetLc.lcNumber || 'the selected LC'}. Close this partial if you want to start a new packaging session for that LC.`
          : 'Close this partial if you want to clear the current carry-forward requirement before packaging again.'}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Keep Open
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-colors"
        >
          Close &amp; Generate Barcode
        </button>
      </div>
    </div>
  </div>
);

const PackagingResultModal = ({ result, onDone }) => {
  const allPrintable = result.printableBoxes || [];
  const totalRecorded = allPrintable.length + (result.newPartialBox ? 1 : 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-gray-900">
                {totalRecorded} box{totalRecorded !== 1 ? 'es' : ''} recorded successfully
              </h2>
            </div>
            <p className="text-sm text-gray-500">
              Barcode labels prepared{' '}
              <span className="font-semibold">{result.outputType === 'Good/ QC Approved' ? 'for QC Approved output' : 'for Wastage output'}</span>
              {result.newPartialBox && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                  1 partial box still open
                </span>
              )}
            </p>
          </div>
          <button onClick={onDone} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {result.filledCarryForward && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded-xl text-xs flex-shrink-0 ${
            result.filledCarryForward.nowFull
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}>
            {result.filledCarryForward.nowFull ? (
              <span>
                <span className="font-semibold">Carry forward completed:</span>{' '}
                {result.filledCarryForward.box.sub_box_name} was filled and barcoded before creating new boxes.
              </span>
            ) : (
              <span>
                <span className="font-semibold">Carry forward updated:</span>{' '}
                {result.filledCarryForward.box.sub_box_name} received more quantity and remains open.
              </span>
            )}
          </div>
        )}

        {result.newPartialBox && (
          <div className="mx-6 mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex-shrink-0">
            <span className="font-semibold">New carry forward created:</span>{' '}
            {result.newPartialBox.sub_box_name} holds {(result.newPartialBox.quantity || 0).toLocaleString()} units, already has a barcode, and remains open as a partial box.
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-6 bg-gray-100 space-y-4">
          {allPrintable.length > 0 ? (
            allPrintable.map((box) => (
              <FinishedGoodsLabelPreview key={box.barcode || box.sub_box_name} subBox={box} />
            ))
          ) : (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl py-10 text-center text-sm text-gray-500">
              No barcode labels were generated in this session.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <p className="text-sm font-medium text-gray-700">
            {allPrintable.length > 0
              ? 'Print labels now or go back to the finished goods list.'
              : 'Return to the finished goods list when you are ready.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onDone}
              className="flex items-center gap-1.5 px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium transition-colors text-sm"
            >
              Back to List
            </button>
            {allPrintable.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  openFinishedGoodsPrintWindow(allPrintable);
                  onDone();
                }}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
              >
                <Printer className="w-4 h-4" />
                Print Barcodes Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [businessModal, setBusinessModal] = useState(null);
  const [printResult, setPrintResult] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const isGood = formData.outputType === 'Good/ QC Approved';
  const apiOutputType = isGood ? 'QcApprovedGood' : 'wastage';
  const perBoxQty = parseInt(formData.perBoxQuantity, 10) || 0;

  const inboundMaterialById = useMemo(() => {
    const map = new Map();
    inboundMaterials.forEach((material) => {
      map.set(String(material.id), material);
    });
    return map;
  }, [inboundMaterials]);

  const shipmentLcMap = useMemo(() => {
    const map = new Map();

    inboundMaterials.forEach((material) => {
      const lineage = {
        lcId: material.lc_id ?? null,
        lcNumber: material.lc_number || null,
        shipmentId: material.shipment_id ?? null,
        shipmentNumber: material.shipment_number || null,
      };
      if (material.shipment_id != null) map.set(`id:${material.shipment_id}`, lineage);
      if (material.shipment_number) map.set(`num:${String(material.shipment_number).toUpperCase()}`, lineage);
    });

    lcs.forEach((lc) => {
      (lc.shipments || []).forEach((shipment) => {
        const lineage = {
          lcId: lc.id ?? null,
          lcNumber: lc.lc_number || null,
          shipmentId: shipment.id ?? null,
          shipmentNumber: shipment.shipment_number || null,
        };
        if (shipment.id != null) map.set(`id:${shipment.id}`, lineage);
        if (shipment.shipment_number) map.set(`num:${String(shipment.shipment_number).toUpperCase()}`, lineage);
      });
    });

    return map;
  }, [inboundMaterials, lcs]);

  const resolveLineage = useCallback((source) => {
    if (!source) return null;

    if (source.lc_id != null || source.lc_number) {
      return {
        lcId: source.lc_id ?? null,
        lcNumber: source.lc_number || null,
        shipmentId: source.shipment_id ?? null,
        shipmentNumber: source.shipment_number || null,
      };
    }

    if (source.inbound_material_id != null) {
      const material = inboundMaterialById.get(String(source.inbound_material_id));
      if (material) {
        return {
          lcId: material.lc_id ?? null,
          lcNumber: material.lc_number || null,
          shipmentId: source.shipment_id ?? material.shipment_id ?? null,
          shipmentNumber: source.shipment_number || material.shipment_number || null,
        };
      }
    }

    if (source.shipment_id != null) {
      const byId = shipmentLcMap.get(`id:${source.shipment_id}`);
      if (byId) return { ...byId };
    }

    if (source.shipment_number) {
      const byNumber = shipmentLcMap.get(`num:${String(source.shipment_number).toUpperCase()}`);
      if (byNumber) return { ...byNumber };
    }

    return null;
  }, [inboundMaterialById, shipmentLcMap]);

  const lcOptions = useMemo(() => {
    const map = new Map();
    lcs.forEach((lc) => {
      if (lc?.id == null) return;
      map.set(String(lc.id), { id: lc.id, lc_number: lc.lc_number });
    });
    inboundMaterials.forEach((material) => {
      if (material?.lc_id == null) return;
      map.set(String(material.lc_id), { id: material.lc_id, lc_number: material.lc_number });
    });
    return [...map.values()].sort((left, right) => String(left.lc_number).localeCompare(String(right.lc_number)));
  }, [inboundMaterials, lcs]);

  useEffect(() => {
    if (!isGood && !formData.lcId && lcOptions.length === 1) {
      setFormData((prev) => ({ ...prev, lcId: String(lcOptions[0].id) }));
    }
  }, [formData.lcId, isGood, lcOptions]);

  useEffect(() => {
    if (!recordOutputContext) return;

    const scopedFormData = applyRecordOutputContext(defaultFormData, recordOutputContext);
    setFormData((prev) => {
      const hasSameScope =
        prev.outputType === scopedFormData.outputType &&
        prev.productionDate === scopedFormData.productionDate &&
        prev.shift === scopedFormData.shift &&
        prev.lcId === scopedFormData.lcId &&
        prev.dateFrom === scopedFormData.dateFrom &&
        prev.dateTo === scopedFormData.dateTo;

      if (hasSameScope) return prev;

      return {
        ...scopedFormData,
        perBoxQuantity: prev.perBoxQuantity || scopedFormData.perBoxQuantity,
        remarks: prev.remarks || '',
      };
    });
  }, [defaultFormData, recordOutputContext]);

  useEffect(() => {
    setErrors({});
    setBusinessModal(null);
  }, [
    formData.productionDate,
    formData.shift,
    formData.outputType,
    formData.lcId,
    formData.dateFrom,
    formData.dateTo,
    formData.perBoxQuantity,
  ]);

  const selectedLc = useMemo(
    () => lcOptions.find((option) => String(option.id) === String(formData.lcId)) || null,
    [formData.lcId, lcOptions]
  );

  const shiftSummary = useMemo(
    () => shiftSummaries.find((summary) => summary.date === formData.productionDate && summary.shift === formData.shift) || null,
    [formData.productionDate, formData.shift, shiftSummaries]
  );

  const qcScopeEntries = useMemo(() => {
    return boxes
      .filter((box) => isChipBox(box) && box.issue_date === formData.productionDate && box.issue_shift === formData.shift)
      .map((box) => ({ box, lineage: resolveLineage(box) }));
  }, [boxes, formData.productionDate, formData.shift]);

  const rangeScopeEntries = useMemo(() => {
    return boxes
      .filter((box) => isChipBox(box) && isDateInRange(box.issue_date, formData.dateFrom, formData.dateTo))
      .map((box) => ({ box, lineage: resolveLineage(box) }));
  }, [boxes, formData.dateFrom, formData.dateTo]);

  const qcLcEntries = useMemo(
    () => dedupeLcEntries(qcScopeEntries.filter(({ lineage }) => getLcKey(lineage))),
    [qcScopeEntries]
  );
  const rangeLcEntries = useMemo(
    () => dedupeLcEntries(rangeScopeEntries.filter(({ lineage }) => getLcKey(lineage))),
    [rangeScopeEntries]
  );

  const currentShiftLc = qcLcEntries[0]?.lineage || null;
  const rangeResolvedLc = rangeLcEntries[0]?.lineage || null;
  const representativeQcLineage = useMemo(() => pickRepresentativeLineage(qcScopeEntries, currentShiftLc), [currentShiftLc, qcScopeEntries]);
  const representativeWastageLineage = useMemo(() => {
    const fallbackSelectedLc = selectedLc
      ? { lcId: selectedLc.id, lcNumber: selectedLc.lc_number, shipmentId: null, shipmentNumber: null }
      : null;
    return pickRepresentativeLineage(rangeScopeEntries, fallbackSelectedLc || rangeResolvedLc);
  }, [rangeResolvedLc, rangeScopeEntries, selectedLc]);

  const openCarryForwardEntry = useMemo(() => {
    return subBoxes
      .filter((subBox) => subBox.sourceType === 'production' && subBox.output_type === 'Good/ QC Approved' && subBox.box_type === 'Partial' && !subBox.is_closed)
      .map((subBox) => ({ subBox, lineage: resolveLineage(subBox) }))
      .sort((left, right) => compareNewest(left.subBox, right.subBox))[0] || null;
  }, [subBoxes]);

  const carryForwardLineage = openCarryForwardEntry?.lineage || null;
  const carryForwardReusable = !!(openCarryForwardEntry && currentShiftLc && sameLc(carryForwardLineage, currentShiftLc));

  const carryForwardBlockedReason = useMemo(() => {
    if (!openCarryForwardEntry) return '';
    if (!currentShiftLc) return 'Current shift LC could not be resolved from the issued chip boxes.';
    if (!carryForwardLineage) return 'The open carry-forward box is missing LC lineage.';
    if (!carryForwardReusable) {
      return `Carry forward box ${openCarryForwardEntry.subBox.sub_box_name} belongs to ${carryForwardLineage.lcNumber || 'another LC'}, so it must be closed before you start packaging ${currentShiftLc.lcNumber || 'this LC'}.`;
    }
    return '';
  }, [carryForwardLineage, carryForwardReusable, currentShiftLc, openCarryForwardEntry]);

  const qcAlreadyPackaged = useMemo(() => {
    return subBoxes.some((subBox) => {
      if (subBox.output_type !== 'Good/ QC Approved') return false;
      if (subBox.production_date !== formData.productionDate || subBox.shift !== formData.shift) return false;
      if (!currentShiftLc) return true;
      return sameLc(resolveLineage(subBox), currentShiftLc);
    });
  }, [currentShiftLc, formData.productionDate, formData.shift, subBoxes]);

  const rangeWastageTotal = useMemo(() => {
    return shiftSummaries
      .filter((summary) => isDateInRange(summary.date, formData.dateFrom, formData.dateTo))
      .reduce((sum, summary) => sum + (summary.wastage || 0), 0);
  }, [formData.dateFrom, formData.dateTo, shiftSummaries]);

  const wastageAlreadyPackaged = useMemo(() => {
    if (!selectedLc || !formData.dateFrom || !formData.dateTo) return false;

    return subBoxes.some((subBox) => {
      if (subBox.output_type !== 'Wastage') return false;
      if (!rangesOverlap(subBox.date_from, subBox.date_to, formData.dateFrom, formData.dateTo)) return false;
      return sameLc(resolveLineage(subBox), { lcId: selectedLc.id, lcNumber: selectedLc.lc_number });
    });
  }, [formData.dateFrom, formData.dateTo, selectedLc, subBoxes]);

  const packagingContext = useMemo(() => {
    if (isGood) {
      return {
        packagingScope: 'SHIFT',
        productionDate: formData.productionDate,
        shift: formData.shift,
        lcId: currentShiftLc?.lcId ?? null,
        lcNumber: currentShiftLc?.lcNumber || '',
        dateFrom: null,
        dateTo: null,
        outputType: apiOutputType,
        qcApprovedGood: shiftSummary?.qc_good || 0,
        wastageQuantity: 0,
        alreadyPackaged: qcAlreadyPackaged,
        openCarryForwardBox: openCarryForwardEntry?.subBox || null,
        currentShiftLcId: currentShiftLc?.lcId ?? null,
        currentShiftLcNumber: currentShiftLc?.lcNumber || '',
        carryForwardLcId: carryForwardLineage?.lcId ?? null,
        carryForwardLcNumber: carryForwardLineage?.lcNumber || '',
        carryForwardReusable,
        carryForwardBlockedReason,
        canCloseCarryForward: !!openCarryForwardEntry,
        carryForwardCloseRequired: !!openCarryForwardEntry && !carryForwardReusable,
        lcMixedInScope: qcLcEntries.length > 1,
        hasChipLineage: qcScopeEntries.length > 0 && qcScopeEntries.some(({ lineage }) => !!getLcKey(lineage)),
        representativeLineage: representativeQcLineage,
      };
    }

    return {
      packagingScope: 'RANGE',
      productionDate: null,
      shift: null,
      lcId: selectedLc?.id ?? null,
      lcNumber: selectedLc?.lc_number || '',
      dateFrom: formData.dateFrom,
      dateTo: formData.dateTo,
      outputType: apiOutputType,
      qcApprovedGood: 0,
      wastageQuantity: rangeWastageTotal,
      alreadyPackaged: wastageAlreadyPackaged,
      openCarryForwardBox: null,
      currentShiftLcId: rangeResolvedLc?.lcId ?? null,
      currentShiftLcNumber: rangeResolvedLc?.lcNumber || '',
      carryForwardLcId: null,
      carryForwardLcNumber: '',
      carryForwardReusable: false,
      carryForwardBlockedReason: '',
      canCloseCarryForward: false,
      carryForwardCloseRequired: false,
      lcMixedInScope: rangeLcEntries.length > 1,
      hasChipLineage: rangeScopeEntries.length > 0 && rangeScopeEntries.some(({ lineage }) => !!getLcKey(lineage)),
      representativeLineage: representativeWastageLineage,
      selectedLcMatchesScope: !!selectedLc && !!rangeResolvedLc && sameLc(rangeResolvedLc, { lcId: selectedLc.id, lcNumber: selectedLc.lc_number }),
    };
  }, [
    apiOutputType,
    carryForwardBlockedReason,
    carryForwardLineage?.lcId,
    carryForwardLineage?.lcNumber,
    carryForwardReusable,
    currentShiftLc?.lcId,
    currentShiftLc?.lcNumber,
    formData.dateFrom,
    formData.dateTo,
    formData.productionDate,
    formData.shift,
    isGood,
    openCarryForwardEntry,
    qcAlreadyPackaged,
    qcLcEntries.length,
    qcScopeEntries,
    rangeLcEntries.length,
    rangeResolvedLc?.lcId,
    rangeResolvedLc?.lcNumber,
    rangeScopeEntries,
    rangeWastageTotal,
    representativeQcLineage,
    representativeWastageLineage,
    selectedLc,
    shiftSummary,
    wastageAlreadyPackaged,
  ]);

  const totalQuantity = isGood ? packagingContext.qcApprovedGood : packagingContext.wastageQuantity;
  const barcodeLineage = packagingContext.representativeLineage;
  const usableCarryForwardBox = isGood && packagingContext.carryForwardReusable ? packagingContext.openCarryForwardBox : null;

  const nextBarcodeSequence = useMemo(() => {
    if (!barcodeLineage) return 1;
    return subBoxes.filter((subBox) => {
      if (!subBox.barcode || subBox.output_type !== formData.outputType) return false;
      return getShipmentKey(resolveLineage(subBox)) === getShipmentKey(barcodeLineage);
    }).length + 1;
  }, [barcodeLineage, formData.outputType, subBoxes]);

  const nextSeq = useMemo(() => {
    const prefix = buildSubBoxPrefix({
      outputType: formData.outputType,
      productionDate: formData.productionDate,
      shift: formData.shift,
      dateTo: formData.dateTo,
      isRangeMode: !isGood && formData.dateFrom !== formData.dateTo,
    });

    const numbers = subBoxes
      .map((subBox) => subBox.sub_box_name || subBox.box_name || '')
      .filter((name) => name.startsWith(prefix))
      .map((name) => parseInt(name.slice(-3), 10) || 0);

    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  }, [formData.dateFrom, formData.dateTo, formData.outputType, formData.productionDate, formData.shift, isGood, subBoxes]);

  const boxPlan = useMemo(() => {
    if (!totalQuantity || perBoxQty <= 0) return null;

    let remaining = totalQuantity;
    let sequence = nextSeq;
    const plan = { filledCarryForward: null, newFull: [], newPartial: null };

    if (usableCarryForwardBox) {
      const target = usableCarryForwardBox.target_per_box || perBoxQty;
      const needed = Math.max(0, target - (usableCarryForwardBox.quantity || 0));

      if (needed > 0) {
        const addQty = Math.min(remaining, needed);
        plan.filledCarryForward = {
          box: usableCarryForwardBox,
          addQty,
          nowFull: addQty === needed,
        };
        remaining -= addQty;
      }
    }

    if (remaining > 0) {
      const fullCount = Math.floor(remaining / perBoxQty);
      const leftover = remaining % perBoxQty;

      for (let index = 0; index < fullCount; index += 1) {
        plan.newFull.push({ seq: sequence + index, quantity: perBoxQty });
      }
      sequence += fullCount;

      if (leftover > 0) {
        if (isGood) plan.newPartial = { seq: sequence, quantity: leftover };
        else if (plan.newFull.length > 0) plan.newFull[plan.newFull.length - 1].quantity += leftover;
        else plan.newFull.push({ seq: sequence, quantity: leftover });
      }
    }

    return plan;
  }, [isGood, nextSeq, perBoxQty, totalQuantity, usableCarryForwardBox]);

  const previewBoxNames = useMemo(() => {
    if (!boxPlan) return [];
    return boxPlan.newFull.slice(0, 4).map(({ seq }) =>
      generateSubBoxName(seq, {
        outputType: formData.outputType,
        productionDate: formData.productionDate,
        shift: formData.shift,
        dateTo: formData.dateTo,
        isRangeMode: !isGood && formData.dateFrom !== formData.dateTo,
      })
    );
  }, [boxPlan, formData.dateFrom, formData.dateTo, formData.outputType, formData.productionDate, formData.shift, isGood]);

  const fieldReady = isGood
    ? !!formData.productionDate && !!formData.shift && perBoxQty > 0
    : !!formData.lcId && !!formData.dateFrom && !!formData.dateTo && formData.dateFrom <= formData.dateTo && perBoxQty > 0;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateFields = () => {
    const nextErrors = {};

    if (isGood) {
      if (!formData.productionDate) nextErrors.productionDate = 'Production date is required';
      if (!formData.shift) nextErrors.shift = 'Shift is required';
    } else {
      if (!formData.lcId) nextErrors.lcId = 'LC is required';
      if (!formData.dateFrom) nextErrors.dateFrom = 'Date from is required';
      if (!formData.dateTo) nextErrors.dateTo = 'Date to is required';
      if (formData.dateFrom && formData.dateTo && formData.dateFrom > formData.dateTo) {
        nextErrors.dateTo = 'Date to must be on or after Date from';
      }
    }

    if (perBoxQty <= 0) nextErrors.perBoxQuantity = 'Per box quantity must be greater than 0';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getBusinessRuleError = () => {
    if (isGood) {
      if (!shiftSummary) {
        return createBusinessRuleModal({
          title: 'No Shift Summary Found',
          message: 'No shift summary found.',
          details: ['Save the shift summary first, then create the sub box.'],
        });
      }
      if ((shiftSummary.qc_good || 0) <= 0) {
        return createBusinessRuleModal({
          title: 'No QC Approved Quantity',
          message: 'No QC approved quantity found for this shift.',
          details: ['Update the shift summary first if quantity should be available.'],
        });
      }
      if (!packagingContext.hasChipLineage) {
        return createBusinessRuleModal({
          title: 'Production Shift Not Found',
          message: 'Production shift not found.',
          details: ['No issued chip boxes were found for the selected production date and shift.'],
        });
      }
      if (packagingContext.lcMixedInScope) {
        return createBusinessRuleModal({
          title: 'Different LC Found',
          message: 'Different LC boxes cannot be packed together.',
          details: ['Keep only one LC in this shift before creating the sub box.'],
        });
      }
      if (!barcodeLineage || !currentShiftLc) {
        return createBusinessRuleModal({
          title: 'Production Shift Not Found',
          message: 'Production shift not found.',
          details: ['The selected shift could not be resolved for packaging.'],
        });
      }
      if (packagingContext.alreadyPackaged) {
        return createBusinessRuleModal({
          title: 'Already Packaged',
          message: 'Sub box already created for this shift.',
          details: ['Packaging has already been completed for this scope.'],
        });
      }
      if (packagingContext.carryForwardCloseRequired) {
        return createBusinessRuleModal({
          title: 'Close Carry Forward First',
          message: 'Close the carry forward box first.',
          details: [carryForwardBlockedReason || 'This carry forward box is blocking the new packaging session.'],
          actionKey: packagingContext.canCloseCarryForward ? 'closeCarryForward' : null,
          actionLabel: packagingContext.canCloseCarryForward ? 'Close Carry Forward' : null,
        });
      }
    } else {
      if (!selectedLc) {
        return createBusinessRuleModal({
          title: 'LC Required',
          message: 'Select an LC before packaging wastage.',
        });
      }
      if (!packagingContext.hasChipLineage) {
        return createBusinessRuleModal({
          title: 'Production Shift Not Found',
          message: 'Production shift not found for this date range.',
          details: ['No issued chip boxes were found in the selected date range.'],
        });
      }
      if (packagingContext.lcMixedInScope) {
        return createBusinessRuleModal({
          title: 'Different LC Found',
          message: 'Different LC wastage cannot be packed in the same box.',
          details: ['Choose a date range where all chip boxes belong to the same LC.'],
        });
      }
      if (rangeResolvedLc && !packagingContext.selectedLcMatchesScope) {
        return createBusinessRuleModal({
          title: 'LC Does Not Match',
          message: 'Selected LC does not match this date range.',
          details: ['Choose the correct LC or change the date range.'],
        });
      }
      if (packagingContext.wastageQuantity <= 0) {
        return createBusinessRuleModal({
          title: 'No Wastage Quantity',
          message: 'No wastage quantity found for this date range.',
          details: ['Update the shift summaries first if quantity should be available.'],
        });
      }
      if (!barcodeLineage) {
        return createBusinessRuleModal({
          title: 'Production Shift Not Found',
          message: 'Production shift not found for this date range.',
          details: ['No valid production data was found for packaging.'],
        });
      }
      if (packagingContext.alreadyPackaged) {
        return createBusinessRuleModal({
          title: 'Already Packaged',
          message: 'Sub box already created for an overlapping wastage date range.',
          details: ['Packaging has already been completed for an overlapping date range.'],
        });
      }
    }

    return null;
  };

  const handleCloseCarryForward = () => {
    if (!openCarryForwardEntry || !onUpdateSubBox) return;

    const lineage = barcodeLineage || carryForwardLineage;
    const patch = {
      box_type: 'Full',
      is_closed: true,
      lc_id: lineage?.lcId ?? openCarryForwardEntry.subBox.lc_id ?? null,
      lc_number: lineage?.lcNumber || openCarryForwardEntry.subBox.lc_number || null,
      barcode: openCarryForwardEntry.subBox.barcode || createProductionBarcode({
        outputType: openCarryForwardEntry.subBox.output_type,
        shipmentNumber: lineage?.shipmentNumber || openCarryForwardEntry.subBox.shipment_number,
        shipmentId: lineage?.shipmentId ?? openCarryForwardEntry.subBox.shipment_id ?? null,
        sequence: nextBarcodeSequence,
      }),
      updated_at: new Date().toISOString(),
    };

    onUpdateSubBox(openCarryForwardEntry.subBox.id, patch);
    setShowCloseModal(false);
    setBusinessModal(null);
  };

  const handleBusinessAction = () => {
    if (businessModal?.actionKey === 'closeCarryForward') {
      setBusinessModal(null);
      setShowCloseModal(true);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateFields()) return;

    const businessError = getBusinessRuleError();
    if (businessError) {
      setBusinessModal(businessError);
      return;
    }

    if (!boxPlan || !barcodeLineage) return;

    const result = {
      outputType: formData.outputType,
      printableBoxes: [],
      filledCarryForward: null,
      newPartialBox: null,
    };
    const barcodeDate = new Date();
    let barcodeSequence = nextBarcodeSequence;

    if (boxPlan.filledCarryForward && onUpdateSubBox) {
      const { box, addQty, nowFull } = boxPlan.filledCarryForward;
      const patch = {
        quantity: (box.quantity || 0) + addQty,
        lc_id: barcodeLineage.lcId ?? box.lc_id ?? null,
        lc_number: barcodeLineage.lcNumber || box.lc_number || null,
        updated_at: new Date().toISOString(),
        ...(nowFull && {
          box_type: 'Full',
          is_closed: true,
          barcode: box.barcode || createProductionBarcode({
            outputType: box.output_type,
            shipmentNumber: barcodeLineage.shipmentNumber,
            shipmentId: barcodeLineage.shipmentId,
            sequence: barcodeSequence++,
            date: barcodeDate,
          }),
        }),
      };

      onUpdateSubBox(box.id, patch);
      result.filledCarryForward = { box, patch, nowFull };
      if (nowFull) result.printableBoxes.push({ ...box, ...patch });
    }

    boxPlan.newFull.forEach(({ seq, quantity }) => {
      const subBoxName = generateSubBoxName(seq, {
        outputType: formData.outputType,
        productionDate: formData.productionDate,
        shift: formData.shift,
        dateTo: formData.dateTo,
        isRangeMode: !isGood && formData.dateFrom !== formData.dateTo,
      });

      const boxData = {
        production_date: isGood ? formData.productionDate : formData.dateTo,
        shift: isGood ? formData.shift : null,
        output_type: formData.outputType,
        sourceType: 'production',
        shipment_id: barcodeLineage.shipmentId ?? null,
        shipment_number: barcodeLineage.shipmentNumber || null,
        lc_id: isGood ? (currentShiftLc?.lcId ?? null) : (selectedLc?.id ?? null),
        lc_number: isGood ? (currentShiftLc?.lcNumber || null) : (selectedLc?.lc_number || null),
        date_from: isGood ? formData.productionDate : formData.dateFrom,
        date_to: isGood ? formData.productionDate : formData.dateTo,
        packaging_scope: packagingContext.packagingScope,
        quantity,
        box_type: 'Full',
        is_closed: true,
        barcode: createProductionBarcode({
          outputType: formData.outputType,
          shipmentNumber: barcodeLineage.shipmentNumber,
          shipmentId: barcodeLineage.shipmentId,
          sequence: barcodeSequence++,
          date: barcodeDate,
        }),
        sub_box_name: subBoxName,
        box_name: subBoxName,
        target_per_box: perBoxQty,
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
      result.printableBoxes.push(boxData);
    });

    if (boxPlan.newPartial) {
      const subBoxName = generateSubBoxName(boxPlan.newPartial.seq, {
        outputType: formData.outputType,
        productionDate: formData.productionDate,
        shift: formData.shift,
        dateTo: formData.dateTo,
        isRangeMode: !isGood && formData.dateFrom !== formData.dateTo,
      });

      const boxData = {
        production_date: formData.productionDate,
        shift: formData.shift,
        output_type: formData.outputType,
        sourceType: 'production',
        shipment_id: barcodeLineage.shipmentId ?? null,
        shipment_number: barcodeLineage.shipmentNumber || null,
        lc_id: currentShiftLc?.lcId ?? null,
        lc_number: currentShiftLc?.lcNumber || null,
        date_from: formData.productionDate,
        date_to: formData.productionDate,
        packaging_scope: packagingContext.packagingScope,
        quantity: boxPlan.newPartial.quantity,
        box_type: 'Partial',
        is_closed: false,
        barcode: createProductionBarcode({
          outputType: formData.outputType,
          shipmentNumber: barcodeLineage.shipmentNumber,
          shipmentId: barcodeLineage.shipmentId,
          sequence: barcodeSequence++,
          date: barcodeDate,
        }),
        sub_box_name: subBoxName,
        box_name: subBoxName,
        target_per_box: perBoxQty,
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
      result.newPartialBox = boxData;
      result.printableBoxes.push(boxData);
    }

    setPrintResult(result);
  };

  const summaryCards = isGood
    ? [
        ['Packaging Scope', `${formData.productionDate || '—'} | ${formData.shift}`],
        ['Resolved LC', packagingContext.currentShiftLcNumber || 'Not resolved yet'],
        ['QC Approved Qty', totalQuantity > 0 ? `${totalQuantity.toLocaleString()} units` : '0 units'],
        ['Carry Forward', packagingContext.openCarryForwardBox ? packagingContext.openCarryForwardBox.sub_box_name : 'None'],
      ]
    : [
        ['Packaging Scope', `${formData.dateFrom || '—'} to ${formData.dateTo || '—'}`],
        ['Selected LC', selectedLc?.lc_number || 'Select an LC'],
        ['Resolved Range LC', packagingContext.currentShiftLcNumber || 'Not resolved yet'],
        ['Wastage Qty', totalQuantity > 0 ? `${totalQuantity.toLocaleString()} units` : '0 units'],
      ];

  return (
    <div className="space-y-5">
      {printResult && (
        <PackagingResultModal result={printResult} onDone={() => { setPrintResult(null); onBack(); }} />
      )}
      {businessModal && (
        <BusinessRuleModal modal={businessModal} onClose={() => setBusinessModal(null)} onAction={handleBusinessAction} />
      )}
      {showCloseModal && packagingContext.openCarryForwardBox && (
        <CloseCarryForwardModal
          partialBox={packagingContext.openCarryForwardBox}
          targetLc={currentShiftLc}
          onConfirm={handleCloseCarryForward}
          onCancel={() => setShowCloseModal(false)}
        />
      )}

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Record Production Output</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Package finished goods using shift-based QC context or LC-based wastage range context
          </p>
        </div>
      </div>

      {packagingContext.openCarryForwardBox && (
        <div className={`flex items-start gap-3 px-5 py-4 rounded-xl border ${
          packagingContext.carryForwardReusable
            ? 'bg-amber-50 border-amber-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            packagingContext.carryForwardReusable ? 'text-amber-500' : 'text-red-500'
          }`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${
              packagingContext.carryForwardReusable ? 'text-amber-900' : 'text-red-900'
            }`}>
              Open carry forward box: <span className="font-mono">{packagingContext.openCarryForwardBox.sub_box_name}</span>
            </p>
            <p className={`text-xs mt-0.5 ${
              packagingContext.carryForwardReusable ? 'text-amber-700' : 'text-red-700'
            }`}>
              {packagingContext.carryForwardReusable
                ? `This box belongs to ${packagingContext.carryForwardLcNumber || 'the current LC'} and will be filled first before new QC boxes are created.`
                : packagingContext.carryForwardBlockedReason}
            </p>
          </div>
          {packagingContext.canCloseCarryForward && (
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg bg-white transition-colors hover:bg-gray-50 border-amber-300 text-amber-700"
            >
              <Lock className="w-3 h-3" /> Close Carry Forward
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Output Type <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('outputType', 'Good/ QC Approved')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    isGood ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'
                  }`}
                >
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isGood ? 'text-emerald-600' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isGood ? 'text-emerald-900' : 'text-gray-700'}`}>QC Approved Good</p>
                    <p className="text-xs text-gray-400 mt-0.5">Uses production date + shift packaging context</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('outputType', 'Wastage')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    !isGood ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-200'
                  }`}
                >
                  <XCircle className={`w-5 h-5 flex-shrink-0 ${!isGood ? 'text-red-500' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${!isGood ? 'text-red-900' : 'text-gray-700'}`}>Wastage</p>
                    <p className="text-xs text-gray-400 mt-0.5">Uses LC + date range packaging context</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                {isGood ? 'Production Details' : 'Wastage Scope'}
              </p>

              {isGood ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Production Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.productionDate}
                      max={today}
                      onChange={(event) => handleChange('productionDate', event.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                        errors.productionDate ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    {errors.productionDate && <p className="mt-1 text-xs text-red-500">{errors.productionDate}</p>}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Clock className="w-3.5 h-3.5" /> Shift <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 h-[38px]">
                      <button
                        type="button"
                        onClick={() => handleChange('shift', 'Day')}
                        className={`text-sm font-semibold rounded-lg transition-colors ${
                          formData.shift === 'Day' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Day
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('shift', 'Night')}
                        className={`text-sm font-semibold rounded-lg transition-colors ${
                          formData.shift === 'Night' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Night
                      </button>
                    </div>
                    {errors.shift && <p className="mt-1 text-xs text-red-500">{errors.shift}</p>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Layers className="w-3.5 h-3.5" /> LC <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.lcId}
                      onChange={(event) => handleChange('lcId', event.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                        errors.lcId ? 'border-red-300' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Select LC</option>
                      {lcOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.lc_number}
                        </option>
                      ))}
                    </select>
                    {errors.lcId && <p className="mt-1 text-xs text-red-500">{errors.lcId}</p>}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Date From <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateFrom}
                      max={today}
                      onChange={(event) => handleChange('dateFrom', event.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                        errors.dateFrom ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    {errors.dateFrom && <p className="mt-1 text-xs text-red-500">{errors.dateFrom}</p>}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Date To <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.dateTo}
                      max={today}
                      onChange={(event) => handleChange('dateTo', event.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                        errors.dateTo ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    {errors.dateTo && <p className="mt-1 text-xs text-red-500">{errors.dateTo}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Packaging Context
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaryCards.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Quantity Configuration
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    {isGood ? 'QC Approved Quantity' : 'Wastage Quantity'}
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-800 min-h-[40px] flex items-center">
                    {totalQuantity > 0 ? `${totalQuantity.toLocaleString()} units` : 'No quantity available'}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {isGood ? 'Read from the selected shift summary' : 'Summed from shift summaries in the selected date range'}
                  </p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Package className="w-3.5 h-3.5" />
                    Per Box Quantity <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.perBoxQuantity}
                    onChange={(event) => handleChange('perBoxQuantity', event.target.value)}
                    placeholder="e.g. 500"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                      errors.perBoxQuantity ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {errors.perBoxQuantity && <p className="mt-1 text-xs text-red-500">{errors.perBoxQuantity}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    {isGood ? 'Remainder creates a new partial carry-forward box' : 'Remainder is absorbed into the last full wastage box'}
                  </p>
                </div>
              </div>

              {boxPlan && totalQuantity > 0 && (
                <div className="mt-4 space-y-2">
                  {boxPlan.filledCarryForward && (
                    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-xs ${
                      boxPlan.filledCarryForward.nowFull ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      <span className="flex-shrink-0 mt-0.5">{boxPlan.filledCarryForward.nowFull ? '✓' : '→'}</span>
                      <div>
                        <span className="font-semibold">Carry forward update:</span>{' '}
                        {usableCarryForwardBox?.sub_box_name} gets +{boxPlan.filledCarryForward.addQty} units
                        {boxPlan.filledCarryForward.nowFull ? ' and becomes full with a barcode.' : ' and remains open.'}
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
                          <p>• {boxPlan.newFull.length} full box{boxPlan.newFull.length !== 1 ? 'es' : ''} with barcode labels</p>
                        )}
                        {boxPlan.newPartial && (
                          <p className="text-amber-700 font-medium">• 1 partial carry-forward box with {boxPlan.newPartial.quantity.toLocaleString()} units</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
                <FileText className="w-3.5 h-3.5" /> Remarks <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={formData.remarks}
                onChange={(event) => handleChange('remarks', event.target.value)}
                rows={2}
                placeholder="Notes about this packaging session..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Session Preview</p>

              <div className="flex flex-col items-center text-center mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border-2 ${
                  !fieldReady
                    ? 'bg-gray-50 border-gray-200'
                    : isGood
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                }`}>
                  {!fieldReady
                    ? <Package className="w-6 h-6 text-gray-300" />
                    : isGood
                      ? <CheckCircle className="w-6 h-6 text-emerald-500" />
                      : <XCircle className="w-6 h-6 text-red-400" />}
                </div>
                <span className={`text-sm font-bold ${
                  !fieldReady ? 'text-gray-400' : isGood ? 'text-emerald-800' : 'text-red-700'
                }`}>
                  {fieldReady ? (isGood ? 'QC Approved Packaging' : 'Wastage Packaging') : 'Fill form to preview'}
                </span>
              </div>

              <div className="space-y-2 text-xs border-t border-gray-100 pt-3">
                {[
                  ['API Output Type', apiOutputType],
                  ['LC', isGood ? (packagingContext.currentShiftLcNumber || '—') : (selectedLc?.lc_number || '—')],
                  ['Quantity', totalQuantity > 0 ? `${totalQuantity.toLocaleString()} units` : '—'],
                  ['Per Box', perBoxQty > 0 ? `${perBoxQty.toLocaleString()} units` : '—'],
                  ['New Full Boxes', boxPlan ? String(boxPlan.newFull.length) : '—'],
                  ['New Partial', isGood && boxPlan?.newPartial ? `${boxPlan.newPartial.quantity} units` : 'None'],
                  ['Carry Forward', packagingContext.openCarryForwardBox ? (packagingContext.carryForwardReusable ? 'Will fill first' : 'Blocking') : 'None'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-right text-gray-800">{value}</span>
                  </div>
                ))}
              </div>

              {(barcodeLineage || totalQuantity > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Label context</p>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {getFinishedGoodsContextLine({
                        output_type: formData.outputType,
                        production_date: formData.productionDate,
                        shift: formData.shift,
                        lc_number: selectedLc?.lc_number || packagingContext.currentShiftLcNumber,
                        date_from: formData.dateFrom,
                        date_to: formData.dateTo,
                      })}
                    </p>
                  </div>
                </div>
              )}

              {previewBoxNames.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Upcoming box names</p>
                  <div className="space-y-1">
                    {previewBoxNames.map((name) => (
                      <div key={name} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-xs font-mono text-gray-700">{name}</span>
                      </div>
                    ))}
                    {boxPlan && boxPlan.newFull.length > 4 && (
                      <p className="text-xs text-gray-400 pl-3.5">+{boxPlan.newFull.length - 4} more...</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!fieldReady}
                className={`w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl shadow-sm transition-colors ${
                  !fieldReady
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : isGood
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                {boxPlan
                  ? `Create ${boxPlan.newFull.length + (boxPlan.newPartial ? 1 : 0)} Box${(boxPlan.newFull.length + (boxPlan.newPartial ? 1 : 0)) !== 1 ? 'es' : ''}${boxPlan.filledCarryForward ? ' + Fill Carry Forward' : ''}`
                  : 'Create Boxes'}
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
