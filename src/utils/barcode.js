function pad(value) {
  return String(value).padStart(2, '0');
}

export function formatBarcodeTimestamp(date = new Date()) {
  return [
    pad(date.getFullYear() % 100),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

export function normalizeShipmentCode(shipmentNumber, shipmentId = null) {
  const raw = String(shipmentNumber || '').toUpperCase();
  const digits = (raw.match(/\d+/g) || []).join('');

  if (digits) {
    return `SHP${digits.slice(-3).padStart(3, '0')}`;
  }

  const cleaned = raw.replace(/[^A-Z0-9]/g, '');
  if (cleaned) {
    return cleaned.slice(0, 6);
  }

  if (shipmentId != null) {
    return `SHP${String(shipmentId).replace(/\D/g, '').slice(-3).padStart(3, '0')}`;
  }

  return 'SHP000';
}

export function createMaterialBarcode(sequence, date = new Date()) {
  return `MB-${formatBarcodeTimestamp(date)}-${sequence}`;
}

export function createProductionBarcode({
  outputType,
  shipmentNumber,
  shipmentId = null,
  sequence,
  date = new Date(),
}) {
  const prefix = outputType === 'Good/ QC Approved' ? 'QC' : 'WST';
  const shipmentCode = normalizeShipmentCode(shipmentNumber, shipmentId);
  return `${prefix}-${shipmentCode}-${formatBarcodeTimestamp(date)}-${sequence}`;
}
