const SHIFT_ORDER = {
  Day: 0,
  Night: 1,
};

const OUTPUT_TYPE_API_MAP = {
  'Good/ QC Approved': 'QcApprovedGood',
  Wastage: 'Wastage',
};

function normalizeShift(shift) {
  return shift === 'Night' ? 'Night' : 'Day';
}

function getShiftOrder(shift) {
  return SHIFT_ORDER[normalizeShift(shift)] ?? 0;
}

export function isChipBox(box) {
  return (box?.item_type || box?.item_name || '').toLowerCase() === 'chip';
}

export function isDateInRange(value, dateFrom, dateTo) {
  if (!value || !dateFrom || !dateTo) return false;
  return value >= dateFrom && value <= dateTo;
}

export function rangesOverlap(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return false;
  return startA <= endB && startB <= endA;
}

export function compareShiftWindows(leftDate, leftShift, rightDate, rightShift) {
  const leftValue = `${leftDate || ''}:${getShiftOrder(leftShift)}`;
  const rightValue = `${rightDate || ''}:${getShiftOrder(rightShift)}`;
  return leftValue.localeCompare(rightValue);
}

export function isShiftWindowInRange(productionDate, shift, dateFrom, fromShift, dateTo, toShift) {
  if (!productionDate || !dateFrom || !dateTo) return false;
  return (
    compareShiftWindows(productionDate, shift, dateFrom, fromShift) >= 0
    && compareShiftWindows(productionDate, shift, dateTo, toShift) <= 0
  );
}

export function createSyntheticProductionShiftId(date, shift) {
  if (!date) return null;
  return Number(`${date.replace(/-/g, '')}${getShiftOrder(shift) + 1}`);
}

function getLcKey(lineage) {
  if (!lineage) return null;
  if (lineage.lcId != null) return `id:${lineage.lcId}`;
  if (lineage.lcNumber) return `num:${String(lineage.lcNumber).toUpperCase()}`;
  return null;
}

export function getShipmentKey(lineage) {
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

function getLatestTimestamp(item) {
  return item?.updated_at || item?.created_at || item?.updatedAt || item?.createdAt || '';
}

function compareNewest(left, right) {
  return getLatestTimestamp(right?.subBox || right).localeCompare(getLatestTimestamp(left?.subBox || left));
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

function dedupeShiftWindows(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.productionDate}|${normalizeShift(entry.shift)}`;
    if (seen.has(key)) return false;
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

function createApiError(error, message, status) {
  return {
    error,
    message,
    status,
    timestamp: new Date().toISOString(),
  };
}

export function getRecordOutputLcOptions(lcs = [], inboundMaterials = []) {
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
}

export function createResolveLineage(inboundMaterials = [], lcs = []) {
  const inboundMaterialById = new Map();
  inboundMaterials.forEach((material) => {
    inboundMaterialById.set(String(material.id), material);
  });

  const shipmentLcMap = new Map();
  inboundMaterials.forEach((material) => {
    const lineage = {
      lcId: material.lc_id ?? null,
      lcNumber: material.lc_number || null,
      shipmentId: material.shipment_id ?? null,
      shipmentNumber: material.shipment_number || null,
    };
    if (material.shipment_id != null) shipmentLcMap.set(`id:${material.shipment_id}`, lineage);
    if (material.shipment_number) shipmentLcMap.set(`num:${String(material.shipment_number).toUpperCase()}`, lineage);
  });

  lcs.forEach((lc) => {
    (lc.shipments || []).forEach((shipment) => {
      const lineage = {
        lcId: lc.id ?? null,
        lcNumber: lc.lc_number || null,
        shipmentId: shipment.id ?? null,
        shipmentNumber: shipment.shipment_number || null,
      };
      if (shipment.id != null) shipmentLcMap.set(`id:${shipment.id}`, lineage);
      if (shipment.shipment_number) shipmentLcMap.set(`num:${String(shipment.shipment_number).toUpperCase()}`, lineage);
    });
  });

  return (source) => {
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
  };
}

export function createDefaultRecordOutputFormData(today) {
  return {
    productionDate: today,
    shift: 'Day',
    outputType: 'Good/ QC Approved',
    lcId: '',
    dateFrom: today,
    fromShift: 'Day',
    dateTo: today,
    toShift: 'Day',
    perBoxQuantity: '500',
    remarks: '',
  };
}

export function applyRecordOutputContext(defaults, context = null) {
  if (!context) return defaults;

  return {
    ...defaults,
    outputType: context.outputType || defaults.outputType,
    productionDate: context.productionDate || defaults.productionDate,
    shift: context.shift || defaults.shift,
    lcId: context.lcId != null ? String(context.lcId) : defaults.lcId,
    dateFrom: context.dateFrom || defaults.dateFrom,
    fromShift: context.fromShift || defaults.fromShift,
    dateTo: context.dateTo || defaults.dateTo,
    toShift: context.toShift || defaults.toShift,
  };
}

export function isFinishedGoodPrintable(subBox) {
  if (!subBox?.barcode) return false;
  const boxType = subBox.box_type || subBox.boxType || 'Full';
  if (boxType === 'Partial') return false;
  if (subBox.is_closed === false) return false;
  return true;
}

function normalizeCarryForwardBox(subBox, resolveLineage) {
  if (!subBox) return null;
  const lineage = resolveLineage(subBox);

  return {
    id: subBox.id,
    sourceType: subBox.sourceType === 'ready_made' ? 'ReadyMade' : 'Production',
    shipmentId: lineage?.shipmentId ?? subBox.shipment_id ?? null,
    shipmentNumber: lineage?.shipmentNumber || subBox.shipment_number || null,
    lcId: lineage?.lcId ?? subBox.lc_id ?? null,
    lcNumber: lineage?.lcNumber || subBox.lc_number || null,
    productionShiftId: createSyntheticProductionShiftId(subBox.production_date, subBox.shift),
    productionDate: subBox.production_date || null,
    shift: subBox.shift || null,
    outputType: subBox.output_type === 'Good/ QC Approved' ? 'QcApprovedGood' : 'Wastage',
    subBoxName: subBox.sub_box_name || subBox.box_name || null,
    barcode: subBox.barcode || null,
    quantity: subBox.quantity || 0,
    perBoxQuantity: subBox.target_per_box || subBox.per_box_quantity || subBox.perBoxQuantity || 0,
    status: subBox.is_closed ? 'CLOSED' : 'OPEN_CARRY_FORWARD',
    deliveryStatus: subBox.delivery_status || 'delivery_pending',
    createdAt: subBox.created_at || null,
    updatedAt: subBox.updated_at || subBox.created_at || null,
  };
}

function createShiftWindowSummary(window, quantity, packagingRunId = null) {
  return {
    productionShiftId: window.productionShiftId,
    productionDate: window.productionDate,
    shift: normalizeShift(window.shift),
    wastageQuantity: quantity,
    packagingRunId,
  };
}

function getMatchingWastageSubBox(subBoxes, window, selectedLc, resolveLineage) {
  return subBoxes.find((subBox) => {
    if (subBox.output_type !== 'Wastage') return false;
    if (!sameLc(resolveLineage(subBox), { lcId: selectedLc.id, lcNumber: selectedLc.lc_number })) return false;

    const rangeFromShift = subBox.from_shift || 'Day';
    const rangeToShift = subBox.to_shift || 'Night';
    return isShiftWindowInRange(
      window.productionDate,
      window.shift,
      subBox.date_from,
      rangeFromShift,
      subBox.date_to,
      rangeToShift
    );
  }) || null;
}

function buildQcApprovedPreviewResponse({
  formData,
  boxes,
  subBoxes,
  shiftSummaries,
  resolveLineage,
}) {
  const issueEntries = boxes
    .filter((box) => isChipBox(box) && box.issue_date === formData.productionDate && normalizeShift(box.issue_shift) === normalizeShift(formData.shift))
    .map((box) => ({ box, lineage: resolveLineage(box) }));

  if (issueEntries.length === 0) {
    return {
      backendResponse: null,
      backendError: createApiError(
        'CONFLICT',
        `No chip box issuances found for ${normalizeShift(formData.shift)} shift on ${formData.productionDate}.`,
        409
      ),
      representativeLineage: null,
      currentShiftLc: null,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  const qcLcEntries = dedupeLcEntries(issueEntries.filter(({ lineage }) => getLcKey(lineage)));
  if (qcLcEntries.length > 1) {
    return {
      backendResponse: null,
      backendError: createApiError(
        'BAD_REQUEST',
        'Different LC chip box issuances were found for the selected production shift.',
        400
      ),
      representativeLineage: null,
      currentShiftLc: null,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  const currentShiftLc = qcLcEntries[0]?.lineage || null;
  const representativeLineage = pickRepresentativeLineage(issueEntries, currentShiftLc);
  if (!representativeLineage || !currentShiftLc) {
    return {
      backendResponse: null,
      backendError: createApiError('CONFLICT', 'Production shift not found.', 409),
      representativeLineage: null,
      currentShiftLc: null,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  const productionShiftId = createSyntheticProductionShiftId(formData.productionDate, formData.shift);
  const shiftSummary = shiftSummaries.find(
    (summary) => summary.date === formData.productionDate && normalizeShift(summary.shift) === normalizeShift(formData.shift)
  ) || null;

  if (!shiftSummary) {
    return {
      backendResponse: null,
      backendError: createApiError(
        'BAD_REQUEST',
        `Chip summary is required for production shift ${productionShiftId} before packaging finished goods.`,
        400
      ),
      representativeLineage,
      currentShiftLc,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  const openCarryForwardEntry = subBoxes
    .filter((subBox) => subBox.sourceType === 'production' && subBox.output_type === 'Good/ QC Approved' && subBox.box_type === 'Partial' && !subBox.is_closed)
    .map((subBox) => ({ subBox, lineage: resolveLineage(subBox) }))
    .sort(compareNewest)[0] || null;

  const carryForwardLineage = openCarryForwardEntry?.lineage || null;
  const carryForwardReusable = !!(openCarryForwardEntry && sameLc(carryForwardLineage, currentShiftLc));
  const carryForwardBlockedReason = !openCarryForwardEntry
    ? null
    : !carryForwardLineage
      ? 'The open carry-forward box is missing LC lineage.'
      : !carryForwardReusable
        ? `Carry-forward box ${openCarryForwardEntry.subBox.sub_box_name || openCarryForwardEntry.subBox.box_name} belongs to ${carryForwardLineage.lcNumber || 'another LC'}, so it must be closed before packaging ${currentShiftLc.lcNumber || 'this LC'}.`
        : null;

  const alreadyPackaged = subBoxes.some((subBox) => {
    if (subBox.output_type !== 'Good/ QC Approved') return false;
    if (subBox.production_date !== formData.productionDate) return false;
    if (normalizeShift(subBox.shift) !== normalizeShift(formData.shift)) return false;
    return sameLc(resolveLineage(subBox), currentShiftLc);
  });

  return {
    backendResponse: {
      packagingScope: 'SHIFT',
      productionShiftId,
      productionDate: formData.productionDate,
      shift: normalizeShift(formData.shift),
      lcId: null,
      lcNumber: null,
      dateFrom: null,
      dateTo: null,
      outputType: OUTPUT_TYPE_API_MAP['Good/ QC Approved'],
      qcApprovedGood: shiftSummary.qc_good || 0,
      wastageQuantity: null,
      alreadyPackaged,
      openCarryForwardBox: normalizeCarryForwardBox(openCarryForwardEntry?.subBox || null, resolveLineage),
      currentShiftLcId: currentShiftLc.lcId ?? null,
      currentShiftLcNumber: currentShiftLc.lcNumber || null,
      carryForwardLcId: carryForwardLineage?.lcId ?? null,
      carryForwardLcNumber: carryForwardLineage?.lcNumber || null,
      carryForwardReusable,
      carryForwardBlockedReason,
      canCloseCarryForward: !!openCarryForwardEntry,
      carryForwardCloseRequired: !!openCarryForwardEntry && !carryForwardReusable,
      fromShift: null,
      toShift: null,
      blockedReason: carryForwardBlockedReason,
      selectedWindowSummary: null,
      lcOverallSummary: null,
    },
    backendError: null,
    representativeLineage,
    currentShiftLc,
    openCarryForwardSource: openCarryForwardEntry?.subBox || null,
    carryForwardLineage,
  };
}

function buildWastagePreviewResponse({
  formData,
  boxes,
  subBoxes,
  shiftSummaries,
  selectedLc,
  resolveLineage,
}) {
  if (!selectedLc) {
    return {
      backendResponse: null,
      backendError: null,
      representativeLineage: null,
      currentShiftLc: null,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  if (compareShiftWindows(formData.dateFrom, formData.fromShift, formData.dateTo, formData.toShift) > 0) {
    return {
      backendResponse: null,
      backendError: createApiError(
        'BAD_REQUEST',
        'dateFrom/fromShift cannot be after dateTo/toShift.',
        400
      ),
      representativeLineage: null,
      currentShiftLc: null,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  const lcWindows = dedupeShiftWindows(
    boxes
      .filter((box) => isChipBox(box) && box.issue_date && box.issue_shift)
      .map((box) => {
        const lineage = resolveLineage(box);
        return {
          productionShiftId: createSyntheticProductionShiftId(box.issue_date, box.issue_shift),
          productionDate: box.issue_date,
          shift: normalizeShift(box.issue_shift),
          lineage,
          summary: shiftSummaries.find(
            (summary) => summary.date === box.issue_date && normalizeShift(summary.shift) === normalizeShift(box.issue_shift)
          ) || null,
        };
      })
      .filter((entry) => sameLc(entry.lineage, { lcId: selectedLc.id, lcNumber: selectedLc.lc_number }))
  ).sort((left, right) => compareShiftWindows(left.productionDate, left.shift, right.productionDate, right.shift));

  const fromWindow = lcWindows.find(
    (window) => window.productionDate === formData.dateFrom && normalizeShift(window.shift) === normalizeShift(formData.fromShift)
  ) || null;
  if (!fromWindow) {
    return {
      backendResponse: null,
      backendError: createApiError('NOT_FOUND', 'From production shift not found.', 404),
      representativeLineage: null,
      currentShiftLc: null,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  const toWindow = lcWindows.find(
    (window) => window.productionDate === formData.dateTo && normalizeShift(window.shift) === normalizeShift(formData.toShift)
  ) || null;
  if (!toWindow) {
    return {
      backendResponse: null,
      backendError: createApiError('NOT_FOUND', 'To production shift not found.', 404),
      representativeLineage: null,
      currentShiftLc: null,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  const selectedWindows = lcWindows.filter((window) => (
    isShiftWindowInRange(
      window.productionDate,
      window.shift,
      formData.dateFrom,
      formData.fromShift,
      formData.dateTo,
      formData.toShift
    )
  ));

  const missingSummaryWindow = selectedWindows.find((window) => !window.summary);
  if (missingSummaryWindow) {
    return {
      backendResponse: null,
      backendError: createApiError(
        'BAD_REQUEST',
        `Chip summary is required for production shift ${missingSummaryWindow.productionShiftId} before wastage packaging.`,
        400
      ),
      representativeLineage: null,
      currentShiftLc: null,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  const windowRows = selectedWindows.map((window) => {
    const wastageQuantity = window.summary?.wastage || 0;
    const packagedSubBox = getMatchingWastageSubBox(subBoxes, window, selectedLc, resolveLineage);

    return {
      ...window,
      wastageQuantity,
      packagedSubBox,
    };
  });

  const representativeLineage = pickRepresentativeLineage(
    selectedWindows.map((window) => ({ box: null, lineage: window.lineage })),
    { lcId: selectedLc.id, lcNumber: selectedLc.lc_number }
  );

  const packagedShifts = windowRows
    .filter((row) => row.packagedSubBox)
    .map((row) => createShiftWindowSummary(row, row.wastageQuantity, row.packagedSubBox.id));

  const unpackagedShifts = windowRows
    .filter((row) => !row.packagedSubBox && row.wastageQuantity > 0)
    .map((row) => createShiftWindowSummary(row, row.wastageQuantity, null));

  const includedShifts = windowRows
    .filter((row) => row.wastageQuantity > 0)
    .map((row) => createShiftWindowSummary(row, row.wastageQuantity, row.packagedSubBox?.id || null));

  const allLcRows = lcWindows.map((window) => {
    const wastageQuantity = window.summary?.wastage || 0;
    const packagedSubBox = getMatchingWastageSubBox(subBoxes, window, selectedLc, resolveLineage);
    return { ...window, wastageQuantity, packagedSubBox };
  });

  const lcUnpackagedShifts = allLcRows
    .filter((row) => !row.packagedSubBox && row.wastageQuantity > 0)
    .map((row) => createShiftWindowSummary(row, row.wastageQuantity, null));

  const alreadyPackagedQuantity = packagedShifts.reduce((sum, shift) => sum + (shift.wastageQuantity || 0), 0);
  const totalWastageQuantity = includedShifts.reduce((sum, shift) => sum + (shift.wastageQuantity || 0), 0);
  const remainingWastageQuantity = unpackagedShifts.reduce((sum, shift) => sum + (shift.wastageQuantity || 0), 0);

  return {
    backendResponse: {
      packagingScope: 'LC_SHIFT_WINDOW',
      productionShiftId: null,
      productionDate: null,
      shift: null,
      lcId: selectedLc.id,
      lcNumber: selectedLc.lc_number,
      dateFrom: formData.dateFrom,
      dateTo: formData.dateTo,
      outputType: OUTPUT_TYPE_API_MAP.Wastage,
      qcApprovedGood: null,
      wastageQuantity: totalWastageQuantity,
      alreadyPackaged: packagedShifts.length > 0,
      openCarryForwardBox: null,
      currentShiftLcId: null,
      currentShiftLcNumber: null,
      carryForwardLcId: null,
      carryForwardLcNumber: null,
      carryForwardReusable: null,
      carryForwardBlockedReason: null,
      canCloseCarryForward: null,
      carryForwardCloseRequired: null,
      fromShift: normalizeShift(formData.fromShift),
      toShift: normalizeShift(formData.toShift),
      blockedReason: packagedShifts.length > 0 ? 'Packaging has already been completed for part of this selected scope.' : null,
      selectedWindowSummary: {
        totalWastageQuantity,
        alreadyPackagedQuantity,
        remainingWastageQuantity,
        includedShifts,
        packagedShifts,
        unpackagedShifts,
      },
      lcOverallSummary: {
        lcTotalRemainingWastageQuantity: lcUnpackagedShifts.reduce((sum, shift) => sum + (shift.wastageQuantity || 0), 0),
        lcUnpackagedShifts,
      },
    },
    backendError: null,
    representativeLineage,
    currentShiftLc: null,
    openCarryForwardSource: null,
    carryForwardLineage: null,
  };
}

export function getRecordOutputPreview({
  formData,
  boxes = [],
  subBoxes = [],
  shiftSummaries = [],
  inboundMaterials = [],
  lcs = [],
}) {
  const isGood = formData.outputType === 'Good/ QC Approved';
  const apiOutputType = OUTPUT_TYPE_API_MAP[formData.outputType] || OUTPUT_TYPE_API_MAP['Good/ QC Approved'];
  const lcOptions = getRecordOutputLcOptions(lcs, inboundMaterials);
  const resolveLineage = createResolveLineage(inboundMaterials, lcs);
  const selectedLc = lcOptions.find((option) => String(option.id) === String(formData.lcId)) || null;

  const scopeReady = isGood
    ? !!formData.productionDate && !!formData.shift
    : !!selectedLc && !!formData.dateFrom && !!formData.fromShift && !!formData.dateTo && !!formData.toShift;

  if (!scopeReady) {
    return {
      isGood,
      apiOutputType,
      lcOptions,
      selectedLc,
      resolveLineage,
      backendResponse: null,
      backendError: null,
      representativeLineage: null,
      currentShiftLc: null,
      openCarryForwardSource: null,
      carryForwardLineage: null,
    };
  }

  const preview = isGood
    ? buildQcApprovedPreviewResponse({
        formData,
        boxes,
        subBoxes,
        shiftSummaries,
        resolveLineage,
      })
    : buildWastagePreviewResponse({
        formData,
        boxes,
        subBoxes,
        shiftSummaries,
        selectedLc,
        resolveLineage,
      });

  return {
    isGood,
    apiOutputType,
    lcOptions,
    selectedLc,
    resolveLineage,
    ...preview,
  };
}

export function buildSubBoxPrefix({ outputType, productionDate, shift, dateTo, isRangeMode }) {
  const isGood = outputType === 'Good/ QC Approved';
  const anchorDate = (isGood ? productionDate : dateTo || productionDate || '').replace(/-/g, '');
  if (isGood) {
    const shiftCode = normalizeShift(shift) === 'Night' ? 'N' : 'D';
    return `SB-${anchorDate}-${shiftCode}G-`;
  }
  return `SB-${anchorDate}-${isRangeMode ? 'RW' : 'W'}-`;
}

export function generateSubBoxName(seq, options) {
  return `${buildSubBoxPrefix(options)}${String(seq).padStart(3, '0')}`;
}

export function createRecordOutputBoxPlan({ preview, perBoxQuantity }) {
  const response = preview?.backendResponse;
  if (!response || perBoxQuantity <= 0) return null;

  const totalQuantity = preview.isGood
    ? response.qcApprovedGood || 0
    : response.wastageQuantity || 0;
  if (totalQuantity <= 0) return null;

  const plan = {
    totalQuantity,
    filledCarryForward: null,
    newFull: [],
    newPartial: null,
    carryForwardFillQuantity: 0,
    remainingAfterCarryForward: totalQuantity,
    estimatedFullBoxes: 0,
    newPartialQuantity: 0,
  };

  let remaining = totalQuantity;
  const carryForwardBox = preview.isGood && response.openCarryForwardBox && response.carryForwardReusable
    ? response.openCarryForwardBox
    : null;

  if (carryForwardBox) {
    const target = carryForwardBox.perBoxQuantity || perBoxQuantity;
    const current = carryForwardBox.quantity || 0;
    const needed = Math.max(0, target - current);

    if (needed > 0) {
      const addQty = Math.min(remaining, needed);
      plan.filledCarryForward = {
        box: carryForwardBox,
        addQty,
        nowFull: addQty === needed,
      };
      plan.carryForwardFillQuantity = addQty;
      remaining -= addQty;
    }
  }

  plan.remainingAfterCarryForward = remaining;

  if (remaining > 0) {
    const fullCount = Math.floor(remaining / perBoxQuantity);
    const leftover = remaining % perBoxQuantity;

    for (let index = 0; index < fullCount; index += 1) {
      plan.newFull.push({ quantity: perBoxQuantity });
    }

    if (preview.isGood) {
      if (leftover > 0) {
        plan.newPartial = { quantity: leftover };
      }
    } else if (leftover > 0 && plan.newFull.length > 0) {
      plan.newFull[plan.newFull.length - 1].quantity += leftover;
    } else if (leftover > 0) {
      plan.newFull.push({ quantity: leftover });
    }
  }

  plan.estimatedFullBoxes = plan.newFull.length;
  plan.newPartialQuantity = plan.newPartial?.quantity || 0;
  return plan;
}

function mapBlockingIssue(preview, totalQuantity) {
  if (preview.backendError) {
    return {
      tone: 'error',
      title: preview.backendError.error || 'Validation Error',
      message: preview.backendError.message,
    };
  }

  const response = preview.backendResponse;
  if (!response) return null;

  if (response.carryForwardCloseRequired) {
    return {
      tone: 'warning',
      title: 'Close Carry-Forward First',
      message: response.carryForwardBlockedReason || 'Close the existing carry-forward box before creating new output.',
    };
  }

  if (response.alreadyPackaged) {
    return {
      tone: 'warning',
      title: 'Packaging Already Completed',
      message: preview.isGood
        ? 'Packaging has already been completed for this QC approved scope.'
        : 'This selected wastage range already includes packaged shifts. Adjust the scope before creating new boxes.',
    };
  }

  if (totalQuantity <= 0) {
    return {
      tone: 'warning',
      title: preview.isGood ? 'No QC Approved Quantity' : 'No Wastage Quantity',
      message: preview.isGood
        ? 'No QC approved quantity is available for this production shift.'
        : 'No wastage quantity is available for this selected shift window.',
    };
  }

  return null;
}

export function buildRecordOutputViewModel({ formData, preview, perBoxQuantity }) {
  const response = preview.backendResponse;
  const totalQuantity = response
    ? (preview.isGood ? response.qcApprovedGood || 0 : response.wastageQuantity || 0)
    : 0;

  const boxPlan = createRecordOutputBoxPlan({ preview, perBoxQuantity });
  const blockingIssue = mapBlockingIssue(preview, totalQuantity);
  const canCreate = !!(response && boxPlan && !blockingIssue);

  const summaryRows = preview.isGood
    ? [
        ['Production Date', response?.productionDate || formData.productionDate || 'N/A'],
        ['Shift', response?.shift || formData.shift || 'N/A'],
        ['Current LC', response?.currentShiftLcNumber || 'N/A'],
        ['Quantity', totalQuantity > 0 ? `${totalQuantity.toLocaleString()} units` : 'N/A'],
        ['Carry-Forward Fill', boxPlan?.carryForwardFillQuantity ? `${boxPlan.carryForwardFillQuantity.toLocaleString()} units` : '-'],
        ['Remaining Quantity', boxPlan ? `${boxPlan.remainingAfterCarryForward.toLocaleString()} units` : '-'],
        ['Per Box', perBoxQuantity > 0 ? `${perBoxQuantity.toLocaleString()} units` : 'N/A'],
        ['Est. Full Boxes', boxPlan ? String(boxPlan.estimatedFullBoxes) : '0'],
        ['New Partial', boxPlan?.newPartialQuantity ? `${boxPlan.newPartialQuantity.toLocaleString()} units` : '0 units'],
      ]
    : [
        ['LC Number', response?.lcNumber || preview.selectedLc?.lc_number || 'N/A'],
        ['From Date', response?.dateFrom || formData.dateFrom || 'N/A'],
        ['From Shift', response?.fromShift || formData.fromShift || 'N/A'],
        ['To Date', response?.dateTo || formData.dateTo || 'N/A'],
        ['To Shift', response?.toShift || formData.toShift || 'N/A'],
        ['Quantity', totalQuantity > 0 ? `${totalQuantity.toLocaleString()} units` : 'N/A'],
        ['Already Packaged', response?.selectedWindowSummary ? `${(response.selectedWindowSummary.alreadyPackagedQuantity || 0).toLocaleString()} units` : '-'],
        ['Remaining Window', response?.selectedWindowSummary ? `${(response.selectedWindowSummary.remainingWastageQuantity || 0).toLocaleString()} units` : '-'],
        ['Per Box', perBoxQuantity > 0 ? `${perBoxQuantity.toLocaleString()} units` : 'N/A'],
        ['Est. Full Boxes', boxPlan ? String(boxPlan.estimatedFullBoxes) : '0'],
      ];

  const callouts = [];
  if (!blockingIssue && boxPlan?.filledCarryForward) {
    callouts.push({
      tone: boxPlan.filledCarryForward.nowFull ? 'success' : 'info',
      title: boxPlan.filledCarryForward.nowFull ? 'Carry-Forward Updated' : 'Carry-Forward Fill In Progress',
      message: `${boxPlan.filledCarryForward.box.subBoxName} receives ${boxPlan.filledCarryForward.addQty.toLocaleString()} units${boxPlan.filledCarryForward.nowFull ? ' and becomes full.' : ' and remains open.'}`,
    });
  }

  if (!blockingIssue && boxPlan && (boxPlan.newFull.length > 0 || boxPlan.newPartial)) {
    const parts = [];
    if (boxPlan.newFull.length > 0) {
      parts.push(`${boxPlan.newFull.length} full box${boxPlan.newFull.length !== 1 ? 'es' : ''}`);
    }
    if (boxPlan.newPartial) {
      parts.push(`1 partial box with ${boxPlan.newPartial.quantity.toLocaleString()} units`);
    }
    callouts.push({
      tone: 'info',
      title: 'Sub-Box Breakdown',
      message: `${parts.join(' and ')} will be created.`,
    });
  }

  if (blockingIssue) {
    callouts.unshift(blockingIssue);
  }

  return {
    response,
    totalQuantity,
    boxPlan,
    blockingIssue,
    canCreate,
    summaryRows,
    callouts,
    statusTone: canCreate ? 'success' : blockingIssue ? blockingIssue.tone : 'neutral',
    selectedWindowSummary: response?.selectedWindowSummary || null,
    lcOverallSummary: response?.lcOverallSummary || null,
    carryForwardBox: response?.openCarryForwardBox || null,
  };
}
