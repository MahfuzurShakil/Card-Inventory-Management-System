import { useState } from 'react';
import {
  ChevronRight, Plus, Ship, FileText, Building, CreditCard,
  Percent, Warehouse, ChevronDown, ChevronUp, Calendar, DollarSign,
  Shield, Building2, Download, Eye, Hash, CheckCircle2,
  AlertTriangle, XCircle, FileSpreadsheet, X, Trash2, Info,
  Loader2
} from 'lucide-react';
import {
  buildChipUidFileSummary,
  normalizeChipUid,
  parseChipUidCsv,
  rehydrateChipUidSummary,
} from '../utils/chipUidCsv';

// ── Row Detail Modal ──────────────────────────────────────────────────────────
const RowDetailModal = ({ summary, onClose }) => {
  if (!summary) return null;
  const statusIcon = (s) => {
    if (s === 'valid') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
    if (s === 'duplicate') return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
    return <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900 truncate max-w-sm">{summary.fileName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {summary.totalRows} rows · {summary.valid} valid · {summary.duplicates} duplicates · {summary.invalid} invalid
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-3 text-gray-400 font-semibold uppercase tracking-wide w-12">Row</th>
                <th className="text-left py-2 pr-3 text-gray-400 font-semibold uppercase tracking-wide">Box No.</th>
                <th className="text-left py-2 pr-3 text-gray-400 font-semibold uppercase tracking-wide">Card Serial</th>
                <th className="text-left py-2 pr-3 text-gray-400 font-semibold uppercase tracking-wide">Smart Card UID</th>
                <th className="text-left py-2 pr-3 text-gray-400 font-semibold uppercase tracking-wide w-24">Status</th>
                <th className="text-left py-2 text-gray-400 font-semibold uppercase tracking-wide">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary.rows.map((row) => (
                <tr key={row.rowNum} className={row.status !== 'valid' ? (row.status === 'duplicate' ? 'bg-amber-50/40' : 'bg-red-50/40') : ''}>
                  <td className="py-2 pr-3 text-gray-400 font-mono">{row.rowNum}</td>
                  <td className="py-2 pr-3 font-mono text-gray-700">{row.boxNumber || '—'}</td>
                  <td className="py-2 pr-3 font-mono text-gray-700 break-all">{row.smartCardSerialNumber || '—'}</td>
                  <td className="py-2 pr-3 font-mono text-gray-700 break-all">{row.smartCardUid || '—'}</td>
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-1">
                      {statusIcon(row.status)}
                      <span className={`capitalize font-medium ${
                        row.status === 'valid' ? 'text-emerald-700' :
                        row.status === 'duplicate' ? 'text-amber-700' : 'text-red-700'
                      }`}>{row.status}</span>
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">{row.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Chip UID CSV Viewer/Editor for LCDetail ───────────────────────────────────
const UUIDCSVSection = ({ uuidFiles = [], onUpdate }) => {
  const [localFiles, setLocalFiles] = useState(() => {
    if (uuidFiles.length === 0) return [];
    const allPrev = new Set();
    return uuidFiles
      .map(s => rehydrateChipUidSummary(s, allPrev))
      .filter(Boolean);
  });
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(new Set());
  const [viewingFile, setViewingFile] = useState(null);
  const [saveValidation, setSaveValidation] = useState(null);
  const inputRef = { current: null };

  const recomputeAll = (summaries) => {
    const allPrev = new Set();
    return summaries.map(s => {
      if (s.headerError) return s;
      const built = buildChipUidFileSummary(s.fileName, s.rows, allPrev);
      built.validUids.forEach(uid => allPrev.add(normalizeChipUid(uid)));
      return built;
    });
  };

  const processFiles = async (files) => {
    const validFiles = Array.from(files).filter(f =>
      f.name.endsWith('.csv') || f.type === 'text/csv' || f.name.endsWith('.txt')
    );
    if (validFiles.length === 0) return;

    setProcessingFiles(new Set(validFiles.map(f => f.name)));

    const newRaw = await Promise.all(validFiles.map(async (file) => {
      const text = await file.text();
      const { rows, headerError } = parseChipUidCsv(text);
      if (headerError) {
        return {
          fileName: file.name,
          totalRows: 0,
          valid: 0,
          duplicates: 0,
          invalid: 1,
          rows: [],
          fileStatus: 'error',
          validUids: [],
          headerError,
        };
      }
      return { fileName: file.name, rows };
    }));

    setLocalFiles(prev => {
      const filtered = prev.filter(p => !validFiles.some(f => f.name === p.fileName));
      const combined = [...filtered, ...newRaw];
      const recomputed = recomputeAll(combined);
      onUpdate && onUpdate(recomputed);
      return recomputed;
    });
    setProcessingFiles(new Set());
    setSaveValidation(null);
  };

  const handleRemoveFile = (fileName) => {
    setLocalFiles(prev => {
      const updated = recomputeAll(prev.filter(s => s.fileName !== fileName));
      onUpdate && onUpdate(updated);
      return updated;
    });
    setSaveValidation(null);
  };

  const handleValidateSave = () => {
    const errors = [];
    const warnings = [];
    localFiles.forEach(s => {
      if (s.headerError) errors.push(`"${s.fileName}": ${s.headerError}`);
      if (s.invalid > 0 && !s.headerError) errors.push(`"${s.fileName}": ${s.invalid} row(s) are missing Smart card UID`);
      if (s.duplicates > 0) warnings.push(`"${s.fileName}": ${s.duplicates} duplicate Smart card UID(s) will be excluded`);
    });
    setSaveValidation({ errors, warnings, hasErrors: errors.length > 0, hasWarnings: warnings.length > 0 });
    return { errors, warnings, hasErrors: errors.length > 0 };
  };

  const totals = localFiles.reduce((acc, s) => ({
    files: acc.files + 1,
    rows: acc.rows + (s.totalRows || 0),
    valid: acc.valid + (s.valid || 0),
    duplicates: acc.duplicates + (s.duplicates || 0),
    invalid: acc.invalid + (s.invalid || 0),
  }), { files: 0, rows: 0, valid: 0, duplicates: 0, invalid: 0 });

  const statusBorder = (fs) =>
    fs === 'ok' ? 'border-emerald-200 bg-emerald-50/30' :
    fs === 'warning' ? 'border-amber-200 bg-amber-50/30' :
    'border-red-200 bg-red-50/30';

  const statusBadge = (s) => {
    if (s.fileStatus === 'ok') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> All Valid
      </span>
    );
    if (s.fileStatus === 'warning') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
        <AlertTriangle className="w-3 h-3" /> {s.duplicates} Dup{s.duplicates !== 1 ? 's' : ''}
        {s.invalid > 0 ? ` · ${s.invalid} Invalid` : ''}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
        <XCircle className="w-3 h-3" /> {s.invalid > 0 ? `${s.invalid} Invalid` : `${s.duplicates} Dup`}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {/* <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer
          ${isDragging ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50/50'}`}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv,.txt" multiple className="hidden"
          onChange={(e) => processFiles(e.target.files)} />
        {processingFiles.size > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
            <p className="text-sm font-medium text-violet-700">Processing files…</p>
          </div>
        ) : (
          <>
            <FileSpreadsheet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-600">Drop CSV files here or click to add</p>
            <p className="text-xs text-gray-400 mt-1">Required header: Box number;Smart card serial number;Smart card UID</p>
          </>
        )}
      </div> */}

      {/* File summaries */}
      {localFiles.length > 0 && (
        <>
          {/* Header row */}
          <div className="grid grid-cols-12 gap-2 px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div className="col-span-4">File Name</div>
            <div className="col-span-1 text-right">Rows</div>
            <div className="col-span-1 text-right">Valid</div>
            <div className="col-span-1 text-right">Dup</div>
            <div className="col-span-1 text-right">Invalid</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="space-y-1.5">
            {localFiles.map(s => (
              <div key={s.fileName}
                className={`grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl border ${statusBorder(s.fileStatus)}`}>
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate" title={s.fileName}>{s.fileName}</span>
                </div>
                <div className="col-span-1 text-right text-sm font-mono text-gray-600">{s.totalRows}</div>
                <div className="col-span-1 text-right text-sm font-mono font-semibold text-emerald-700">{s.valid}</div>
                <div className={`col-span-1 text-right text-sm font-mono font-semibold ${s.duplicates > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                  {s.duplicates}
                </div>
                <div className={`col-span-1 text-right text-sm font-mono font-semibold ${(s.invalid || 0) > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                  {s.invalid || 0}
                </div>
                <div className="col-span-2">{statusBadge(s)}</div>
                <div className="col-span-2 flex items-center gap-1.5 justify-end">
                  <button type="button"
                    onClick={() => setViewingFile(s)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <Eye className="w-3 h-3" /> View
                  </button>
                  <button type="button"
                    onClick={() => handleRemoveFile(s.fileName)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Overall summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Files', value: totals.files, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-200' },
              { label: 'Total Rows', value: totals.rows, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-200' },
              { label: 'Valid UID', value: totals.valid, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
              {
                label: 'Dup / Invalid',
                value: totals.duplicates + totals.invalid,
                color: totals.duplicates + totals.invalid > 0 ? 'text-amber-700' : 'text-gray-400',
                bg: totals.duplicates + totals.invalid > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
              },
            ].map(item => (
              <div key={item.label} className={`${item.bg} border rounded-xl px-4 py-3 text-center`}>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Validate button */}
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={handleValidateSave}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-violet-700 border border-violet-200 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors">
              <CheckCircle2 className="w-4 h-4" /> Validate UIDs
            </button>
            <span className="text-xs text-gray-400">Run validation to check header, missing UID, and duplicate UID issues</span>
          </div>

          {/* Save-time validation messages */}
          {saveValidation && (
            <div className="space-y-2">
              {saveValidation.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{err}</p>
                </div>
              ))}
              {saveValidation.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">{w}</p>
                </div>
              ))}
              {!saveValidation.hasErrors && saveValidation.hasWarnings && (
                <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    Only <strong>{totals.valid} valid Smart card UIDs</strong> will be saved. Duplicates are excluded.
                  </p>
                </div>
              )}
              {!saveValidation.hasErrors && !saveValidation.hasWarnings && (
                <div className="flex items-start gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-800">
                    All <strong>{totals.valid} Smart card UIDs</strong> passed validation — ready to save.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {viewingFile && <RowDetailModal summary={viewingFile} onClose={() => setViewingFile(null)} />}
    </div>
  );
};

// ── Main LCDetail Component ───────────────────────────────────────────────────

const LCDetail = ({ lc, onBack, onSelectShipment, onAddShipment }) => {
  const [expandedShipment, setExpandedShipment] = useState(null);
  const [uuidSectionOpen, setUuidSectionOpen] = useState(true);
  const [uuidFiles, setUuidFiles] = useState(() => {
    const allPrev = new Set();
    return (lc?.uuid_files || [])
      .map(summary => rehydrateChipUidSummary(summary, allPrev))
      .filter(Boolean);
  });

  const steps = [
    { id: 1, name: 'Freight Forwarder', key: 'freight_forwarder', icon: Ship, color: 'blue' },
    { id: 2, name: 'Customs Duty', key: 'customs_duty', icon: FileText, color: 'purple' },
    { id: 3, name: 'C&F Agent', key: 'cnf_agent', icon: Building, color: 'green' },
    { id: 4, name: 'LC Commission', key: 'lc_commission', icon: CreditCard, color: 'orange' },
    { id: 5, name: 'Bank Interest', key: 'bank_interest', icon: Percent, color: 'pink' },
    { id: 6, name: 'Warehouse', key: 'warehouse', icon: Warehouse, color: 'indigo' },
  ];

  const toggleShipment = (shipmentId) => {
    setExpandedShipment(expandedShipment === shipmentId ? null : shipmentId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // Chip UID totals
  const uuidTotals = uuidFiles.reduce((acc, s) => ({
    files: acc.files + 1,
    valid: acc.valid + (s.valid || 0),
    total: acc.total + (s.totalRows || 0),
  }), { files: 0, valid: 0, total: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lc.lc_number}</h1>
            <p className="text-sm text-gray-500 mt-1">Issued on {formatDate(lc.lc_issue_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
            lc.status === 'Active' ? 'bg-green-100 text-green-800' :
            lc.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {lc.status}
          </span>
          <button onClick={onAddShipment}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Shipment
          </button>
        </div>
      </div>

      {/* Complete LC Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Letter of Credit Details</h2>
        </div>
        <div className="p-6">
          {/* LC Info */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">LC Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">LC Number</p>
                <p className="text-base font-semibold text-gray-900">{lc.lc_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">LC Issue Date</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(lc.lc_issue_date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Bank Name</p>
                <p className="text-base font-semibold text-gray-900">{lc.bank_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">LC Currency</p>
                <p className="text-base font-semibold text-gray-900">{lc.lc_currency || 'USD'}</p>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">LC Value (Foreign)</p>
                <p className="text-xl font-bold text-blue-900">
                  {lc.lc_currency} {lc.lc_value_foreign?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          {/* PI Details */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Proforma Invoice (PI) Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">PI Number</p>
                <p className="text-base font-semibold text-gray-900">{lc.pi_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">PI Date</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(lc.pi_date)}</p>
              </div>
            </div>
          </div>

          {/* Insurance Details */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Insurance Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Insurance Company</p>
                <p className="text-base font-semibold text-gray-900">{lc.insurance_company_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Cover Note Number</p>
                <p className="text-base font-semibold text-gray-900">{lc.cover_note_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Insurance Bill Amount</p>
                <p className="text-base font-semibold text-gray-900">
                  {lc.insurance_bill_amount ? `৳${lc.insurance_bill_amount.toLocaleString()}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Insurance Issue Date</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(lc.insurance_issue_date)}</p>
              </div>
            </div>
          </div>

          {/* Item Information */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Item Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Quantity</p>
                <p className="text-xl font-bold text-gray-900">{lc.quantity?.toLocaleString() || '0'}</p>
                <p className="text-xs text-gray-500 mt-1">Units</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Item Description</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {lc.item_description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Uploaded Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LC Document */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold text-sm text-gray-900">LC Document</p>
                  </div>
                  {lc.lc_doc && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Uploaded</span>
                  )}
                </div>
                {lc.lc_doc ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-3 truncate" title={lc.lc_doc}>{lc.lc_doc}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No document uploaded</p>
                )}
              </div>
              {/* PI Document */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <p className="font-semibold text-sm text-gray-900">PI Document</p>
                  </div>
                  {lc.pi_doc && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Uploaded</span>
                  )}
                </div>
                {lc.pi_doc ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-3 truncate" title={lc.pi_doc}>{lc.pi_doc}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors">
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No document uploaded</p>
                )}
              </div>
              {/* Insurance Document */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <p className="font-semibold text-sm text-gray-900">Insurance Document</p>
                  </div>
                  {lc.insurance_doc && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">Uploaded</span>
                  )}
                </div>
                {lc.insurance_doc ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-3 truncate" title={lc.insurance_doc}>{lc.insurance_doc}</p>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors">
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors">
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No document uploaded</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Chip UID CSV Section ── */}
          <div>
            <button
              type="button"
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 group"
              onClick={() => setUuidSectionOpen(v => !v)}
            >
              <span className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-violet-600" />
                Chip UID CSV Files
                {uuidTotals.files > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-full">
                    {uuidTotals.files} file{uuidTotals.files !== 1 ? 's' : ''} · {uuidTotals.valid} valid UID{uuidTotals.valid !== 1 ? 's' : ''}
                  </span>
                )}
                {uuidTotals.files === 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-400 normal-case">No files uploaded yet</span>
                )}
              </span>
              {uuidSectionOpen
                ? <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />}
            </button>

            {uuidSectionOpen && (
              <UUIDCSVSection
                uuidFiles={uuidFiles}
                onUpdate={(updated) => setUuidFiles(updated)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Shipments Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Shipments</h2>
            <span className="text-sm text-gray-500">
              {lc.shipments?.length || 0} shipment{lc.shipments?.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {!lc.shipments || lc.shipments.length === 0 ? (
            <div className="p-12 text-center">
              <Ship className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No shipments added yet</p>
              <button onClick={onAddShipment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Add First Shipment
              </button>
            </div>
          ) : (
            lc.shipments.map((shipment) => {
              const isExpanded = expandedShipment === shipment.id;
              const sd = shipment.stepData || {};

              const stepSummary = [
                { id: 1, key: 'freight_forwarder', name: 'Freight Forwarder', icon: Ship,      cost: sd.freight_forwarder?.ff_bill_amount, sub: sd.freight_forwarder?.ff_name, isCost: true },
                { id: 2, key: 'customs_duty',      name: 'Customs Duty',      icon: FileText,  cost: sd.customs_duty?.total_customs_amount, isCost: true },
                { id: 3, key: 'cnf_agent',         name: 'C&F Agent',         icon: Building,  cost: sd.cnf_agent?.cnf_bill_value,          sub: sd.cnf_agent?.cnf_agent_name, isCost: true },
                { id: 4, key: 'lc_commission',     name: 'LC Commission',     icon: CreditCard,cost: sd.lc_commission?.total_cost,          isCost: true },
                { id: 5, key: 'bank_interest',     name: 'Bank Interest',     icon: Percent,   cost: sd.bank_interest?.interest_amount,     isCost: true },
                { id: 6, key: 'warehouse',         name: 'Cleared Goods',     icon: Warehouse, cost: null, qty: sd.warehouse?.total_quantity, items: sd.warehouse?.items || [], isCost: false },
              ];

              const totalCost = stepSummary.filter(s => s.isCost && sd[s.key]).reduce((sum, s) => sum + (s.cost || 0), 0);

              return (
                <div key={shipment.id} className="p-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{shipment.shipment_number}</h3>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          shipment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          shipment.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {shipment.status}
                        </span>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                          <span>Progress: {shipment.completedSteps || 0}/6 steps</span>
                          <span className="font-semibold">{shipment.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              shipment.progress === 100 ? 'bg-green-600' :
                              shipment.progress > 0 ? 'bg-blue-600' : 'bg-gray-400'
                            }`}
                            style={{ width: `${shipment.progress || 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {steps.map((step, idx) => {
                          const StepIcon = step.icon;
                          const isCompleted = idx < (shipment.completedSteps || 0);
                          return (
                            <div key={step.id}
                              className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                                isCompleted ? 'bg-green-100' : 'bg-gray-100'
                              }`}
                              title={step.name}>
                              <StepIcon className={`w-4 h-4 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-center">
                      <button onClick={() => onSelectShipment(shipment)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Manage
                      </button>
                      <button onClick={() => toggleShipment(shipment.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && shipment.stepData && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {sd.freight_forwarder && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Ship className="w-4 h-4 text-blue-500" />
                              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Freight Forwarder</p>
                            </div>
                            <p className="text-lg font-bold text-blue-900 mb-1">
                              ৳{(sd.freight_forwarder.ff_bill_amount || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.cnf_agent && (
                          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Building className="w-4 h-4 text-green-500" />
                              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">C&amp;F Agent</p>
                            </div>
                            <p className="text-lg font-bold text-green-900 mb-1">
                              ৳{(sd.cnf_agent.cnf_bill_value || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.lc_commission && (
                          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="w-4 h-4 text-orange-500" />
                              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">LC Commission</p>
                            </div>
                            <p className="text-lg font-bold text-orange-900 mb-1">
                              ৳{(sd.lc_commission.total_cost || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.bank_interest && (
                          <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Percent className="w-4 h-4 text-pink-500" />
                              <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide">Bank Interest</p>
                            </div>
                            <p className="text-lg font-bold text-pink-900 mb-1">
                              ৳{(sd.bank_interest.interest_amount || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.customs_duty && (
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-purple-500" />
                              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Customs Duty</p>
                            </div>
                            <p className="text-lg font-bold text-purple-900 mb-1">
                              ৳{(sd.customs_duty.total_customs_amount || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.warehouse && (
                          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="flex items-center gap-2 mb-3">
                              <Warehouse className="w-4 h-4 text-indigo-500" />
                              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Cleared Goods</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-gray-400">Total Items</p>
                                <p className="text-sm font-bold text-indigo-900">{(sd.warehouse.items || []).length}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Total Quantity</p>
                                <p className="text-sm font-bold text-indigo-900">{(sd.warehouse.total_quantity || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {totalCost > 0 && (
                        <div className="mt-3 flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cost (this shipment)</span>
                          <span className="text-base font-bold text-gray-900">৳{totalCost.toLocaleString()}</span>
                        </div>
                      )}

                      {!sd.freight_forwarder && !sd.customs_duty && !sd.cnf_agent &&
                       !sd.lc_commission && !sd.bank_interest && !sd.warehouse && (
                        <p className="text-center py-8 text-sm text-gray-400">
                          No step data available yet. Click "Manage" to add details.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LCDetail;
