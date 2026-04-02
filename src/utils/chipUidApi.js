import {
  buildChipUidFileSummary,
  collectExistingChipUids,
  normalizeChipUid,
  parseChipUidCsv,
} from './chipUidCsv';

const CHECK_ENDPOINT = import.meta.env.VITE_CHIP_UID_CHECK_URL;
const SAVE_ENDPOINT = import.meta.env.VITE_CHIP_UID_SAVE_URL;

const buildLocalFileId = (fileName, index) => `local-${index}-${fileName}`;

const createEmptyIssueSummary = () => ({
  duplicateInFile: 0,
  duplicateInSession: 0,
  duplicateInDb: 0,
  missingUid: 0,
  badFormat: 0,
});

const getIssueType = (row) => {
  if (row.reason === 'Duplicate Smart card UID within this file') return 'duplicate_in_file';
  if (row.reason === 'Duplicate Smart card UID in another uploaded file') return 'duplicate_in_session';
  if (row.reason === 'Smart card UID already exists in another LC') return 'duplicate_in_db';
  if (row.reason === 'Smart card UID is required') return 'missing_uid';
  return 'bad_format';
};

const getIssueMessage = (issueType, fallback = '') => {
  switch (issueType) {
    case 'duplicate_in_file':
      return 'Duplicate UID found in this file';
    case 'duplicate_in_session':
      return 'UID already exists in another uploaded file';
    case 'duplicate_in_db':
      return 'UID already exists in database';
    case 'missing_uid':
      return 'Smart card UID is missing';
    default:
      return fallback || 'File validation failed';
  }
};

const mapSummaryToApiFile = (summary, fileId) => {
  const issueSummary = createEmptyIssueSummary();

  const issuePreview = (summary.rows || [])
    .filter((row) => row.status !== 'valid')
    .map((row) => {
      const issueType = getIssueType(row);
      issueSummary[
        issueType === 'duplicate_in_file' ? 'duplicateInFile'
          : issueType === 'duplicate_in_session' ? 'duplicateInSession'
            : issueType === 'duplicate_in_db' ? 'duplicateInDb'
              : issueType === 'missing_uid' ? 'missingUid'
                : 'badFormat'
      ] += 1;

      return {
        rowNumber: row.rowNum,
        boxNumber: row.boxNumber || '',
        smartCardSerialNumber: row.smartCardSerialNumber || '',
        smartCardUid: row.smartCardUid || '',
        issueType,
        message: getIssueMessage(issueType, row.reason),
      };
    });

  return {
    fileId,
    fileName: summary.fileName,
    totalRows: summary.totalRows || 0,
    validCount: summary.valid || 0,
    duplicateCount: summary.duplicates || 0,
    invalidCount: summary.invalid || 0,
    status: (summary.duplicates || 0) > 0 || (summary.invalid || 0) > 0 ? 'Invalid' : 'Valid',
    canSave: (summary.duplicates || 0) === 0 && (summary.invalid || 0) === 0,
    issueSummary,
    issuePreview,
    totalIssueRows: issuePreview.length,
    validUids: summary.validUids || [],
  };
};

const mapHeaderErrorToApiFile = (fileName, fileId, headerError) => ({
  fileId,
  fileName,
  totalRows: 0,
  validCount: 0,
  duplicateCount: 0,
  invalidCount: 1,
  status: 'Invalid',
  canSave: false,
  issueSummary: {
    ...createEmptyIssueSummary(),
    badFormat: 1,
  },
  issuePreview: [
    {
      rowNumber: 1,
      boxNumber: '',
      smartCardSerialNumber: '',
      smartCardUid: '',
      issueType: 'bad_format',
      message: headerError,
    },
  ],
  totalIssueRows: 1,
  validUids: [],
});

const buildOverall = (files) => ({
  fileCount: files.length,
  totalRows: files.reduce((sum, file) => sum + (file.totalRows || 0), 0),
  validCount: files.reduce((sum, file) => sum + (file.validCount || 0), 0),
  duplicateCount: files.reduce((sum, file) => sum + (file.duplicateCount || 0), 0),
  invalidCount: files.reduce((sum, file) => sum + (file.invalidCount || 0), 0),
  invalidFileCount: files.filter((file) => file.status === 'Invalid').length,
  canSave: files.length > 0 && files.every((file) => file.canSave),
});

const runLocalValidation = async (files, usedUids = new Set()) => {
  const allPreviousUids = new Set();
  const validatedFiles = [];

  for (const [index, file] of files.entries()) {
    const text = await file.text();
    const { rows, headerError } = parseChipUidCsv(text);
    const fileId = buildLocalFileId(file.name, index);

    if (headerError) {
      validatedFiles.push(mapHeaderErrorToApiFile(file.name, fileId, headerError));
      continue;
    }

    const summary = buildChipUidFileSummary(file.name, rows, allPreviousUids, usedUids);
    summary.validUids.forEach((uid) => allPreviousUids.add(normalizeChipUid(uid)));
    validatedFiles.push(mapSummaryToApiFile(summary, fileId));
  }

  return {
    validationSessionId: `local-session-${Date.now()}`,
    files: validatedFiles,
    overall: buildOverall(validatedFiles),
  };
};

const normalizeRemoteResponse = (response) => {
  const files = (response?.files || []).map((file, index) => ({
    fileId: file.fileId || buildLocalFileId(file.fileName || `file-${index + 1}`, index),
    fileName: file.fileName || `file-${index + 1}.csv`,
    totalRows: file.totalRows || 0,
    validCount: file.validCount || 0,
    duplicateCount: file.duplicateCount || 0,
    invalidCount: file.invalidCount || 0,
    status: file.status === 'Valid' ? 'Valid' : 'Invalid',
    canSave: Boolean(file.canSave),
    issueSummary: {
      ...createEmptyIssueSummary(),
      ...(file.issueSummary || {}),
    },
    issuePreview: file.issuePreview || [],
    totalIssueRows: file.totalIssueRows ?? (file.issuePreview || []).length,
    validUids: file.validUids || [],
  }));

  return {
    validationSessionId: response?.validationSessionId || `remote-session-${Date.now()}`,
    files,
    overall: response?.overall || buildOverall(files),
  };
};

export const normalizeStoredChipUidFile = (file, index = 0) => {
  if (!file) return null;

  if ('validCount' in file || 'issuePreview' in file) {
    return {
      fileId: file.fileId || buildLocalFileId(file.fileName || `file-${index + 1}`, index),
      fileName: file.fileName || `file-${index + 1}.csv`,
      totalRows: file.totalRows || 0,
      validCount: file.validCount || 0,
      duplicateCount: file.duplicateCount || 0,
      invalidCount: file.invalidCount || 0,
      status: file.status === 'Valid' ? 'Valid' : 'Invalid',
      canSave: file.canSave ?? file.status === 'Valid',
      issueSummary: {
        ...createEmptyIssueSummary(),
        ...(file.issueSummary || {}),
      },
      issuePreview: file.issuePreview || [],
      totalIssueRows: file.totalIssueRows ?? (file.issuePreview || []).length,
      validUids: file.validUids || [],
      isPersisted: file.isPersisted ?? true,
      savedAt: file.savedAt || null,
    };
  }

  if (file.headerError) {
    return {
      ...mapHeaderErrorToApiFile(file.fileName || `file-${index + 1}.csv`, buildLocalFileId(file.fileName || `file-${index + 1}`, index), file.headerError),
      isPersisted: true,
      savedAt: null,
    };
  }

  const summary = buildChipUidFileSummary(
    file.fileName || `file-${index + 1}.csv`,
    (file.rows || []).map((row, rowIndex) => ({
      rowNum: row.rowNum ?? row.rowNumber ?? rowIndex + 2,
      boxNumber: row.boxNumber || '',
      smartCardSerialNumber: row.smartCardSerialNumber || '',
      smartCardUid: row.smartCardUid || row.uuid || '',
    })),
    new Set(),
    new Set()
  );

  return {
    ...mapSummaryToApiFile(summary, buildLocalFileId(summary.fileName, index)),
    isPersisted: true,
    savedAt: null,
  };
};

export const buildChipUidOverallSummary = (files = []) => {
  const normalizedFiles = files.map((file, index) => normalizeStoredChipUidFile(file, index)).filter(Boolean);
  return buildOverall(normalizedFiles);
};

export const collectAllExistingChipUids = (lcs = []) => collectExistingChipUids(lcs);

export const validateChipUidFiles = async (files, { usedUids = new Set() } = {}) => {
  if (!files || files.length === 0) {
    return {
      validationSessionId: null,
      files: [],
      overall: buildOverall([]),
    };
  }

  if (!CHECK_ENDPOINT) {
    return runLocalValidation(files, usedUids);
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await fetch(CHECK_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Chip UID validation request failed.');
  }

  return normalizeRemoteResponse(await response.json());
};

export const saveChipUidValidationSession = async (validationSessionId, files = [], lcId = null) => {
  if (!validationSessionId) {
    throw new Error('Validation session not found.');
  }

  if (files.some((file) => file.status !== 'Valid')) {
    throw new Error('Remove invalid files before saving Chip UID data.');
  }

  if (!SAVE_ENDPOINT) {
    return {
      validationSessionId,
      files: files.map((file) => ({
        ...file,
        isPersisted: true,
        savedAt: new Date().toISOString(),
      })),
    };
  }

  const response = await fetch(SAVE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ validationSessionId, lcId }),
  });

  if (!response.ok) {
    throw new Error('Chip UID save request failed.');
  }

  const payload = await response.json();
  return {
    validationSessionId,
    files: (payload?.files || files).map((file, index) => ({
      ...normalizeStoredChipUidFile({
        ...file,
        validUids: file.validUids || files[index]?.validUids || [],
      }, index),
      isPersisted: true,
      savedAt: file.savedAt || new Date().toISOString(),
    })),
  };
};
