export function isChipBox(box) {
  return (box.item_type || box.item_name || '').toLowerCase() === 'chip';
}

export function isDateInRange(value, dateFrom, dateTo) {
  if (!value || !dateFrom || !dateTo) return false;
  return value >= dateFrom && value <= dateTo;
}

export function rangesOverlap(startA, endA, startB, endB) {
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

function compareNewest(left, right) {
  const leftTime = right?.subBox?.updated_at || right?.subBox?.created_at || '';
  const rightTime = left?.subBox?.updated_at || left?.subBox?.created_at || '';
  return leftTime.localeCompare(rightTime);
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
    dateTo: today,
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
    dateTo: context.dateTo || defaults.dateTo,
  };
}

export function deriveRecordOutputState({
  formData,
  boxes = [],
  subBoxes = [],
  shiftSummaries = [],
  inboundMaterials = [],
  lcs = [],
}) {
  const isGood = formData.outputType === 'Good/ QC Approved';
  const apiOutputType = isGood ? 'QcApprovedGood' : 'wastage';
  const lcOptions = getRecordOutputLcOptions(lcs, inboundMaterials);
  const resolveLineage = createResolveLineage(inboundMaterials, lcs);
  const selectedLc = lcOptions.find((option) => String(option.id) === String(formData.lcId)) || null;
  const shiftSummary = shiftSummaries.find((summary) => summary.date === formData.productionDate && summary.shift === formData.shift) || null;

  const qcScopeEntries = boxes
    .filter((box) => isChipBox(box) && box.issue_date === formData.productionDate && box.issue_shift === formData.shift)
    .map((box) => ({ box, lineage: resolveLineage(box) }));

  const rangeScopeEntries = boxes
    .filter((box) => isChipBox(box) && isDateInRange(box.issue_date, formData.dateFrom, formData.dateTo))
    .map((box) => ({ box, lineage: resolveLineage(box) }));

  const qcLcEntries = dedupeLcEntries(qcScopeEntries.filter(({ lineage }) => getLcKey(lineage)));
  const rangeLcEntries = dedupeLcEntries(rangeScopeEntries.filter(({ lineage }) => getLcKey(lineage)));

  const currentShiftLc = qcLcEntries[0]?.lineage || null;
  const rangeResolvedLc = rangeLcEntries[0]?.lineage || null;
  const representativeQcLineage = pickRepresentativeLineage(qcScopeEntries, currentShiftLc);
  const representativeWastageLineage = pickRepresentativeLineage(
    rangeScopeEntries,
    selectedLc ? { lcId: selectedLc.id, lcNumber: selectedLc.lc_number, shipmentId: null, shipmentNumber: null } : rangeResolvedLc
  );

  const openCarryForwardEntry = subBoxes
    .filter((subBox) => subBox.sourceType === 'production' && subBox.output_type === 'Good/ QC Approved' && subBox.box_type === 'Partial' && !subBox.is_closed)
    .map((subBox) => ({ subBox, lineage: resolveLineage(subBox) }))
    .sort(compareNewest)[0] || null;

  const carryForwardLineage = openCarryForwardEntry?.lineage || null;
  const carryForwardReusable = !!(openCarryForwardEntry && currentShiftLc && sameLc(carryForwardLineage, currentShiftLc));
  const carryForwardBlockedReason = !openCarryForwardEntry
    ? ''
    : !currentShiftLc
      ? 'Current shift LC could not be resolved from the issued chip boxes.'
      : !carryForwardLineage
        ? 'The open carry-forward box is missing LC lineage.'
        : !carryForwardReusable
          ? `Carry forward box ${openCarryForwardEntry.subBox.sub_box_name} belongs to ${carryForwardLineage.lcNumber || 'another LC'}, so it must be closed before you start packaging ${currentShiftLc.lcNumber || 'this LC'}.`
          : '';

  const qcAlreadyPackaged = subBoxes.some((subBox) => {
    if (subBox.output_type !== 'Good/ QC Approved') return false;
    if (subBox.production_date !== formData.productionDate || subBox.shift !== formData.shift) return false;
    if (!currentShiftLc) return true;
    return sameLc(resolveLineage(subBox), currentShiftLc);
  });

  const rangeWastageTotal = shiftSummaries
    .filter((summary) => isDateInRange(summary.date, formData.dateFrom, formData.dateTo))
    .reduce((sum, summary) => sum + (summary.wastage || 0), 0);

  const wastageAlreadyPackaged = !selectedLc
    ? false
    : subBoxes.some((subBox) => {
        if (subBox.output_type !== 'Wastage') return false;
        if (!rangesOverlap(subBox.date_from, subBox.date_to, formData.dateFrom, formData.dateTo)) return false;
        return sameLc(resolveLineage(subBox), { lcId: selectedLc.id, lcNumber: selectedLc.lc_number });
      });

  const packagingContext = isGood
    ? {
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
      }
    : {
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

  return {
    isGood,
    apiOutputType,
    lcOptions,
    selectedLc,
    shiftSummary,
    currentShiftLc,
    rangeResolvedLc,
    openCarryForwardEntry,
    carryForwardLineage,
    carryForwardBlockedReason,
    packagingContext,
    resolveLineage,
  };
}

export function getRecordOutputScopeError({ formData, derived }) {
  const {
    isGood,
    selectedLc,
    shiftSummary,
    currentShiftLc,
    rangeResolvedLc,
    carryForwardBlockedReason,
    packagingContext,
  } = derived;

  if (isGood) {
    if (!shiftSummary) {
      return {
        title: 'No Shift Summary Found',
        message: 'No shift summary found.',
        details: ['Save the shift summary first, then create the sub box.'],
      };
    }
    if ((shiftSummary.qc_good || 0) <= 0) {
      return {
        title: 'No QC Approved Quantity',
        message: 'No QC approved quantity found for this shift.',
        details: ['Update the shift summary first if quantity should be available.'],
      };
    }
    if (!packagingContext.hasChipLineage) {
      return {
        title: 'Production Shift Not Found',
        message: 'Production shift not found.',
        details: ['No issued chip boxes were found for the selected production date and shift.'],
      };
    }
    if (packagingContext.lcMixedInScope) {
      return {
        title: 'Different LC Found',
        message: 'Different LC boxes cannot be packed together.',
        details: ['Keep only one LC in this shift before creating the sub box.'],
      };
    }
    if (!packagingContext.representativeLineage || !currentShiftLc) {
      return {
        title: 'Production Shift Not Found',
        message: 'Production shift not found.',
        details: ['The selected shift could not be resolved for packaging.'],
      };
    }
    if (packagingContext.alreadyPackaged) {
      return {
        title: 'Already Packaged',
        message: 'Sub box already created for this shift.',
        details: ['Packaging has already been completed for this scope.'],
      };
    }
    if (packagingContext.carryForwardCloseRequired) {
      return {
        title: 'Close Carry Forward First',
        message: 'Close the carry forward box first.',
        details: [carryForwardBlockedReason || 'This carry forward box is blocking the new packaging session.'],
        actionKey: packagingContext.canCloseCarryForward ? 'closeCarryForward' : null,
        actionLabel: packagingContext.canCloseCarryForward ? 'Close Carry Forward' : null,
      };
    }
    return null;
  }

  if (!selectedLc) {
    return {
      title: 'LC Required',
      message: 'Select an LC before packaging wastage.',
      details: [],
    };
  }
  if (!packagingContext.hasChipLineage) {
    return {
      title: 'Production Shift Not Found',
      message: 'Production shift not found for this date range.',
      details: ['No issued chip boxes were found in the selected date range.'],
    };
  }
  if (packagingContext.lcMixedInScope) {
    return {
      title: 'Different LC Found',
      message: 'Different LC wastage cannot be packed in the same box.',
      details: ['Choose a date range where all chip boxes belong to the same LC.'],
    };
  }
  if (rangeResolvedLc && !packagingContext.selectedLcMatchesScope) {
    return {
      title: 'LC Does Not Match',
      message: 'Selected LC does not match this date range.',
      details: ['Choose the correct LC or change the date range.'],
    };
  }
  if (packagingContext.wastageQuantity <= 0) {
    return {
      title: 'No Wastage Quantity',
      message: 'No wastage quantity found for this date range.',
      details: ['Update the shift summaries first if quantity should be available.'],
    };
  }
  if (!packagingContext.representativeLineage) {
    return {
      title: 'Production Shift Not Found',
      message: 'Production shift not found for this date range.',
      details: ['No valid production data was found for packaging.'],
    };
  }
  if (packagingContext.alreadyPackaged) {
    return {
      title: 'Already Packaged',
      message: 'Sub box already created for an overlapping wastage date range.',
      details: ['Packaging has already been completed for an overlapping date range.'],
    };
  }

  return null;
}
