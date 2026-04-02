import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  Info,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { buildChipUidOverallSummary, normalizeStoredChipUidFile } from '../utils/chipUidApi';

const ISSUE_LABELS = {
  duplicate_in_file: 'Duplicate in file',
  duplicate_in_session: 'Duplicate in session',
  duplicate_in_db: 'Duplicate in DB',
  missing_uid: 'Missing UID',
  bad_format: 'Bad format',
};

const StatusBadge = ({ status }) => (
  status === 'Valid' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" /> Valid
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
      <XCircle className="h-3.5 w-3.5" /> Invalid
    </span>
  )
);

const IssuePreviewModal = ({ file, onClose }) => {
  if (!file) return null;

  const issueRows = file.issuePreview || [];
  const issueSummary = file.issueSummary || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">{file.fileName}</h3>
            <p className="mt-1 text-xs text-gray-500">
              Showing issue rows only. {file.totalRows} rows, {file.validCount} valid, {file.duplicateCount} duplicate, {file.invalidCount} invalid.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-gray-100 px-6 py-4 md:grid-cols-5">
          {[
            { label: 'Duplicate in file', value: issueSummary.duplicateInFile || 0, tone: 'amber' },
            { label: 'Duplicate in session', value: issueSummary.duplicateInSession || 0, tone: 'amber' },
            { label: 'Duplicate in DB', value: issueSummary.duplicateInDb || 0, tone: 'amber' },
            { label: 'Missing UID', value: issueSummary.missingUid || 0, tone: 'red' },
            { label: 'Bad format', value: issueSummary.badFormat || 0, tone: 'red' },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-xl border px-4 py-3 text-center ${
                item.tone === 'amber'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <p className={`text-2xl font-bold ${item.tone === 'amber' ? 'text-amber-700' : 'text-red-700'}`}>
                {item.value}
              </p>
              <p className="mt-1 text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {issueRows.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-800">No issues found in this file.</p>
            </div>
          ) : (
            <table className="min-w-full text-left text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Row</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">UID</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Box No</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Serial</th>
                  <th className="py-2 pr-4 font-semibold uppercase tracking-wide">Issue Type</th>
                  <th className="py-2 font-semibold uppercase tracking-wide">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {issueRows.map((row, index) => (
                  <tr key={`${file.fileId}-${row.rowNumber}-${index}`} className="align-top">
                    <td className="py-2 pr-4 font-mono text-gray-500">{row.rowNumber}</td>
                    <td className="py-2 pr-4 font-mono text-gray-700">{row.smartCardUid || '—'}</td>
                    <td className="py-2 pr-4 font-mono text-gray-700">{row.boxNumber || '—'}</td>
                    <td className="py-2 pr-4 font-mono text-gray-700">{row.smartCardSerialNumber || '—'}</td>
                    <td className="py-2 pr-4 text-gray-600">{ISSUE_LABELS[row.issueType] || row.issueType}</td>
                    <td className="py-2 text-gray-600">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ChipUidFileSummary = ({
  files = [],
  onRemoveFile,
  allowRemove = false,
  emptyMessage = 'No files uploaded yet.',
  showIssueAction = true,
  disableIssueActionWhenEmpty = false,
  showSavedState = false,
}) => {
  const [viewingFile, setViewingFile] = useState(null);

  const normalizedFiles = useMemo(
    () => files.map((file, index) => normalizeStoredChipUidFile(file, index)).filter(Boolean),
    [files]
  );
  const totals = useMemo(() => buildChipUidOverallSummary(normalizedFiles), [normalizedFiles]);

  if (normalizedFiles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
        <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 md:block">
        <table className="min-w-full table-fixed">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-[30%] px-4 py-3 text-left font-semibold">Filename</th>
              <th className="w-[9%] px-4 py-3 text-right font-semibold">Rows</th>
              <th className="w-[9%] px-4 py-3 text-right font-semibold">Valid</th>
              <th className="w-[9%] px-4 py-3 text-right font-semibold">Duplicate</th>
              <th className="w-[9%] px-4 py-3 text-right font-semibold">Invalid</th>
              <th className="w-[14%] px-4 py-3 text-left font-semibold">Status</th>
              <th className="w-[20%] px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {normalizedFiles.map((file) => (
              <tr key={file.fileId} className="align-middle">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <span className="truncate text-sm font-medium text-gray-900" title={file.fileName}>
                      {file.fileName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm text-gray-700">{file.totalRows}</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-emerald-700">{file.validCount}</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-amber-700">{file.duplicateCount}</td>
                <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-red-700">{file.invalidCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={file.status} />
                    {showSavedState && !file.isPersisted && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        Pending save
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {showIssueAction && (
                      <button
                        type="button"
                        onClick={() => {
                          if (disableIssueActionWhenEmpty && file.totalIssueRows === 0) return;
                          setViewingFile(file);
                        }}
                        disabled={disableIssueActionWhenEmpty && file.totalIssueRows === 0}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <Eye className="h-3.5 w-3.5" /> View issues
                      </button>
                    )}
                    {allowRemove && onRemoveFile && !file.isPersisted && (
                      <button
                        type="button"
                        onClick={() => onRemoveFile(file.fileName)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {normalizedFiles.map((file) => (
          <div key={file.fileId} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{file.fileName}</p>
                <p className="mt-1 text-xs text-gray-500">{file.totalRows} rows</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={file.status} />
                {showSavedState && !file.isPersisted && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                    Pending save
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-emerald-700">{file.validCount}</p>
                <p className="text-[11px] text-gray-500">Valid</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-700">{file.duplicateCount}</p>
                <p className="text-[11px] text-gray-500">Duplicate</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-700">{file.invalidCount}</p>
                <p className="text-[11px] text-gray-500">Invalid</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {showIssueAction && (
                <button
                  type="button"
                  onClick={() => {
                    if (disableIssueActionWhenEmpty && file.totalIssueRows === 0) return;
                    setViewingFile(file);
                  }}
                  disabled={disableIssueActionWhenEmpty && file.totalIssueRows === 0}
                  className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  View issues
                </button>
              )}
              {allowRemove && onRemoveFile && !file.isPersisted && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(file.fileName)}
                  className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Total Files', value: totals.fileCount, tone: 'gray' },
          { label: 'Total Rows', value: totals.totalRows, tone: 'gray' },
          { label: 'Valid UID', value: totals.validCount, tone: 'emerald' },
          { label: 'Duplicate', value: totals.duplicateCount, tone: 'amber' },
          { label: 'Invalid', value: totals.invalidCount, tone: 'red' },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-xl border px-4 py-3 text-center ${
              item.tone === 'emerald'
                ? 'border-emerald-200 bg-emerald-50'
                : item.tone === 'amber'
                  ? 'border-amber-200 bg-amber-50'
                  : item.tone === 'red'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
            }`}
          >
            <p
              className={`text-2xl font-bold ${
                item.tone === 'emerald'
                  ? 'text-emerald-700'
                  : item.tone === 'amber'
                    ? 'text-amber-700'
                    : item.tone === 'red'
                      ? 'text-red-700'
                      : 'text-gray-900'
              }`}
            >
              {item.value}
            </p>
            <p className="mt-1 text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>

      {totals.invalidFileCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <p className="text-xs text-amber-800">
            {totals.invalidFileCount} invalid file{totals.invalidFileCount !== 1 ? 's' : ''} still need to be removed before saving.
          </p>
        </div>
      )}

      {totals.invalidFileCount === 0 && totals.fileCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
          <p className="text-xs text-blue-800">
            All uploaded files are valid. Save the LC to persist these Chip UID files.
          </p>
        </div>
      )}

      {viewingFile && <IssuePreviewModal file={viewingFile} onClose={() => setViewingFile(null)} />}
    </div>
  );
};

export default ChipUidFileSummary;
