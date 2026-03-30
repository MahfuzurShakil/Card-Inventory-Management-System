const HEADER_ALIASES = {
  boxnumber: 'boxNumber',
  smartcardserialnumber: 'smartCardSerialNumber',
  smartcarduid: 'smartCardUid',
};

const REQUIRED_HEADERS = ['boxNumber', 'smartCardSerialNumber', 'smartCardUid'];

const normalizeHeader = (value = '') =>
  value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export const normalizeChipUid = (value = '') => value.trim().toLowerCase();

export const parseChipUidCsv = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) {
    return {
      rows: [],
      headerError: 'File is empty.',
    };
  }

  const splitRow = (line) =>
    line.split(/[,;\t|]/).map(part => part.trim().replace(/^["']|["']$/g, ''));

  const headers = splitRow(lines[0]);
  const headerIndexes = {};

  headers.forEach((header, idx) => {
    const alias = HEADER_ALIASES[normalizeHeader(header)];
    if (alias && headerIndexes[alias] == null) {
      headerIndexes[alias] = idx;
    }
  });

  const missingHeaders = REQUIRED_HEADERS.filter((header) => headerIndexes[header] == null);
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      headerError: 'Required header row not found. Expected: Box number;Smart card serial number;Smart card UID',
    };
  }

  const rows = lines.slice(1).map((line, dataIdx) => {
    const parts = splitRow(line);
    return {
      rowNum: dataIdx + 2,
      boxNumber: parts[headerIndexes.boxNumber] || '',
      smartCardSerialNumber: parts[headerIndexes.smartCardSerialNumber] || '',
      smartCardUid: parts[headerIndexes.smartCardUid] || '',
    };
  }).filter(row =>
    row.boxNumber !== '' ||
    row.smartCardSerialNumber !== '' ||
    row.smartCardUid !== ''
  );

  return { rows, headerError: null };
};

export const buildChipUidFileSummary = (fileName, rawRows, allPreviousUids, usedUids = new Set()) => {
  const seenInFile = new Set();
  const rows = rawRows.map((row, idx) => {
    const smartCardUid = row.smartCardUid?.trim() || '';
    const normalizedUid = normalizeChipUid(smartCardUid);
    const uidPresent = smartCardUid !== '';
    const dupInFile = uidPresent && seenInFile.has(normalizedUid);
    const dupInSession = uidPresent && !dupInFile && allPreviousUids.has(normalizedUid);
    const dupInExisting = uidPresent && !dupInFile && !dupInSession && usedUids.has(normalizedUid);

    let status = 'valid';
    let reason = '';

    if (!uidPresent) {
      status = 'invalid';
      reason = 'Smart card UID is required';
    } else if (dupInFile) {
      status = 'duplicate';
      reason = 'Duplicate Smart card UID within this file';
    } else if (dupInSession) {
      status = 'duplicate';
      reason = 'Duplicate Smart card UID in another uploaded file';
    } else if (dupInExisting) {
      status = 'duplicate';
      reason = 'Smart card UID already exists in another LC';
    }

    if (uidPresent && !dupInFile) {
      seenInFile.add(normalizedUid);
    }

    return {
      rowNum: row.rowNum ?? idx + 1,
      boxNumber: row.boxNumber || '',
      smartCardSerialNumber: row.smartCardSerialNumber || '',
      smartCardUid,
      status,
      reason,
    };
  });

  const validRows = rows.filter(row => row.status === 'valid');
  const valid = validRows.length;
  const duplicates = rows.filter(row => row.status === 'duplicate').length;
  const invalid = rows.filter(row => row.status === 'invalid').length;

  return {
    fileName,
    totalRows: rows.length,
    valid,
    duplicates,
    invalid,
    rows,
    fileStatus: duplicates > 0 || invalid > 0 ? (valid === 0 ? 'error' : 'warning') : 'ok',
    validUids: validRows.map(row => row.smartCardUid),
  };
};

export const collectExistingChipUids = (lcs = [], excludeLcId = null) => {
  const used = new Set();

  lcs.forEach((lc) => {
    if (excludeLcId != null && lc.id === excludeLcId) return;
    (lc.chip_uuids || []).forEach((uid) => {
      const normalized = normalizeChipUid(uid);
      if (normalized) used.add(normalized);
    });
  });

  return used;
};

export const rehydrateChipUidSummary = (summary, allPreviousUids = new Set(), usedUids = new Set()) => {
  if (!summary) return null;

  const rawRows = (summary.rows || []).map((row, idx) => ({
    rowNum: row.rowNum ?? idx + 2,
    boxNumber: row.boxNumber || '',
    smartCardSerialNumber: row.smartCardSerialNumber || '',
    smartCardUid: row.smartCardUid || row.uuid || '',
  }));

  const rebuilt = buildChipUidFileSummary(summary.fileName, rawRows, allPreviousUids, usedUids);
  rebuilt.validUids.forEach((uid) => allPreviousUids.add(normalizeChipUid(uid)));
  return rebuilt;
};
