import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, Save, FileText, DollarSign, Shield, 
  Upload, Calendar, Building2, Hash, CheckCircle2,
  AlertTriangle, XCircle, Eye, Trash2, FileSpreadsheet,
  ChevronDown, ChevronUp, Info, X, Loader2
} from 'lucide-react';
import {
  buildChipUidFileSummary,
  collectExistingChipUids,
  normalizeChipUid,
  parseChipUidCsv,
} from '../utils/chipUidCsv';

// ── Chip UID CSV Upload Component ─────────────────────────────────────────────

// Row Detail Modal
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
                <th className="text-left py-2 pr-3 text-gray-400 font-semibold uppercase tracking-wide w-20">Status</th>
                <th className="text-left py-2 text-gray-400 font-semibold uppercase tracking-wide">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary.rows.map((row) => (
                <tr key={row.rowNum} className={`
                  ${row.status === 'valid' ? '' : row.status === 'duplicate' ? 'bg-amber-50/40' : 'bg-red-50/40'}
                `}>
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

const UUIDCSVUpload = ({ value = [], onChange, onRegisterValidator, usedUids }) => {
  const [fileSummaries, setFileSummaries] = useState(value || []);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState(new Set());
  const [viewingFile, setViewingFile] = useState(null);
  const [saveValidation, setSaveValidation] = useState(null); // null | { errors, warnings }
  const fileInputRef = useRef(null);

  // Keep parent in sync
  useEffect(() => {
    onChange(fileSummaries);
  }, [fileSummaries, onChange]);

  // Recompute duplicates across all files whenever summaries change
  const recomputeAll = useCallback((summaries) => {
    const allPrev = new Set();
    const recomputed = summaries.map((s) => {
      if (s.headerError) return s;
      const rawRows = (s.rows || []).map((row) => ({
        rowNum: row.rowNum,
        boxNumber: row.boxNumber || '',
        smartCardSerialNumber: row.smartCardSerialNumber || '',
        smartCardUid: row.smartCardUid || row.uuid || '',
      }));
      const newSummary = buildChipUidFileSummary(s.fileName, rawRows, allPrev, usedUids);
      newSummary.validUids.forEach(uid => allPrev.add(normalizeChipUid(uid)));
      return newSummary;
    });
    return recomputed;
  }, [usedUids]);

  const processFiles = async (files) => {
    const validFiles = Array.from(files).filter(f =>
      f.name.endsWith('.csv') || f.type === 'text/csv' || f.name.endsWith('.txt')
    );
    if (validFiles.length === 0) return;

    const processingNames = new Set(validFiles.map(f => f.name));
    setProcessingFiles(processingNames);

    const newSummaries = await Promise.all(validFiles.map(async (file) => {
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

    setFileSummaries(prev => {
      const filtered = prev.filter(p => !validFiles.some(f => f.name === p.fileName));
      const combined = [...filtered, ...newSummaries];
      const allPrev = new Set();
      return combined.map(s => {
        if (s.headerError) return s;
        const summary = buildChipUidFileSummary(s.fileName, s.rows, allPrev, usedUids);
        summary.validUids.forEach(uid => allPrev.add(normalizeChipUid(uid)));
        return summary;
      });
    });

    setProcessingFiles(new Set());
    setSaveValidation(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleRemoveFile = (fileName) => {
    setFileSummaries(prev => {
      const updated = prev.filter(s => s.fileName !== fileName);
      return recomputeAll(updated);
    });
    setSaveValidation(null);
  };

  // Validate before save — called externally by the form
  const validateForSave = useCallback(() => {
    const errors = [];
    const warnings = [];
    fileSummaries.forEach(s => {
      if (s.headerError) errors.push(`"${s.fileName}": ${s.headerError}`);
      if (s.duplicates > 0) warnings.push(`"${s.fileName}": ${s.duplicates} duplicate Smart card UID(s) will be skipped`);
      if (s.invalid > 0 && !s.headerError) errors.push(`"${s.fileName}": ${s.invalid} row(s) are missing Smart card UID`);
    });
    const result = { errors, warnings, hasErrors: errors.length > 0, hasWarnings: warnings.length > 0 };
    setSaveValidation(result);
    return result;
  }, [fileSummaries]);

  useEffect(() => {
    if (onRegisterValidator) onRegisterValidator(validateForSave);
  }, [onRegisterValidator, validateForSave]);

  // Totals
  const totals = fileSummaries.reduce((acc, s) => ({
    files: acc.files + 1,
    rows: acc.rows + s.totalRows,
    valid: acc.valid + s.valid,
    duplicates: acc.duplicates + s.duplicates,
    invalid: acc.invalid + (s.invalid || 0),
  }), { files: 0, rows: 0, valid: 0, duplicates: 0, invalid: 0 });

  const statusColor = (fileStatus) => {
    if (fileStatus === 'ok') return 'border-emerald-200 bg-emerald-50/30';
    if (fileStatus === 'warning') return 'border-amber-200 bg-amber-50/30';
    return 'border-red-200 bg-red-50/30';
  };

  const statusBadge = (fileStatus, valid, total, dup, inv) => {
    if (fileStatus === 'ok') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> All Valid
      </span>
    );
    if (fileStatus === 'warning') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
        <AlertTriangle className="w-3 h-3" /> {dup} Duplicate{dup !== 1 ? 's' : ''}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
        <XCircle className="w-3 h-3" /> {inv > 0 ? `${inv} Invalid` : `${dup} Dup`}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50/50'}`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          multiple
          className="hidden"
          onChange={(e) => processFiles(e.target.files)}
        />
        {processingFiles.size > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-blue-700">Processing {processingFiles.size} file(s)…</p>
          </div>
        ) : (
          <>
            <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Drop CSV files here or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">
              Required header: Box number;Smart card serial number;Smart card UID · Multiple files allowed
            </p>
          </>
        )}
      </div>

      {/* Per-file summaries */}
      {fileSummaries.length > 0 && (
        <div className="space-y-2">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            <div className="col-span-4">File Name</div>
            <div className="col-span-1 text-right">Rows</div>
            <div className="col-span-1 text-right">Valid</div>
            <div className="col-span-1 text-right">Dup</div>
            <div className="col-span-1 text-right">Invalid</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {fileSummaries.map((s) => (
            <div key={s.fileName}
              className={`grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl border transition-all ${statusColor(s.fileStatus)}`}>
              <div className="col-span-4 flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 truncate" title={s.fileName}>{s.fileName}</span>
              </div>
              <div className="col-span-1 text-right text-sm font-mono text-gray-700">{s.totalRows}</div>
              <div className="col-span-1 text-right text-sm font-mono text-emerald-700 font-semibold">{s.valid}</div>
              <div className={`col-span-1 text-right text-sm font-mono font-semibold ${s.duplicates > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                {s.duplicates}
              </div>
              <div className={`col-span-1 text-right text-sm font-mono font-semibold ${(s.invalid || 0) > 0 ? 'text-red-600' : 'text-gray-300'}`}>
                {s.invalid || 0}
              </div>
              <div className="col-span-2">
                {statusBadge(s.fileStatus, s.valid, s.totalRows, s.duplicates, s.invalid || 0)}
              </div>
              <div className="col-span-2 flex items-center gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setViewingFile(s); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="w-3 h-3" /> View
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemoveFile(s.fileName); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          ))}

          {/* Overall summary strip */}
          <div className="grid grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Total Files', value: totals.files, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-200' },
              { label: 'Total Rows', value: totals.rows, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-200' },
              { label: 'Valid UUID', value: totals.valid, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
              { label: 'Duplicate', value: totals.duplicates + (totals.invalid || 0), color: totals.duplicates + (totals.invalid || 0) > 0 ? 'text-amber-700' : 'text-gray-400', bg: totals.duplicates + (totals.invalid || 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200' },
            ].map(item => (
              <div key={item.label} className={`${item.bg} border rounded-xl px-4 py-3 text-center`}>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save-time validation messages */}
      {saveValidation && (saveValidation.hasErrors || saveValidation.hasWarnings) && (
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
                Only <strong>valid, non-duplicate Smart card UIDs</strong> ({totals.valid}) will be saved. Duplicate rows will be ignored.
              </p>
            </div>
          )}
        </div>
      )}

      {/* View modal */}
      {viewingFile && <RowDetailModal summary={viewingFile} onClose={() => setViewingFile(null)} />}
    </div>
  );
};

// ── Main LCForm Component ─────────────────────────────────────────────────────

const buildInitialFormData = (lc) => ({
  lc_number: lc?.lc_number || '',
  lc_issue_date: lc?.lc_issue_date || '',
  bank_name: lc?.bank_name || '',
  lc_value_foreign: lc?.lc_value_foreign || '',
  lc_currency: lc?.lc_currency || 'USD',
  lc_value_bdt: lc?.lc_value_bdt || '',
  exchange_rate: lc?.exchange_rate || '',
  pi_number: lc?.pi_number || '',
  pi_date: lc?.pi_date || '',
  insurance_bill_amount: lc?.insurance_bill_amount || '',
  cover_note_number: lc?.cover_note_number || '',
  insurance_issue_date: lc?.insurance_issue_date || '',
  insurance_company_name: lc?.insurance_company_name || '',
  quantity: lc?.quantity || '',
  item_description: lc?.item_description || '',
  status: lc?.status || 'Active',
  files: { lc_doc: null, pi_doc: null, insurance_doc: null }
});

const LCForm = ({ lc, onSave, onBack, existingLcs = [] }) => {
  const isEditMode = !!(lc && lc.id);
  const uuidValidatorRef = useRef(null);
  const existingUsedUids = collectExistingChipUids(existingLcs, lc?.id);

  const [formData, setFormData] = useState(() => buildInitialFormData(lc));

  const [uuidFiles, setUuidFiles] = useState(lc?.uuid_files || []);
  const [uuidSaveError, setUuidSaveError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (docType, file) => {
    setFormData(prev => ({
      ...prev,
      files: { ...prev.files, [docType]: file }
    }));
  };

  // UUID files change handler with validator injection
  const handleUuidFilesChange = (summaries) => {
    setUuidFiles(summaries);
    setUuidSaveError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Run Smart card UID save-time validation
    if (uuidValidatorRef.current) {
      const result = uuidValidatorRef.current();
      if (result.hasErrors) {
        setUuidSaveError('Please fix Smart card UID validation errors before saving.');
        return;
      }
    }

    // Collect only valid Smart card UIDs across all files
    const allValidUids = uuidFiles.flatMap(s => s.validUids || []);

    const lcData = {
      lc_number: formData.lc_number,
      lc_issue_date: formData.lc_issue_date,
      bank_name: formData.bank_name,
      lc_value_foreign: parseFloat(formData.lc_value_foreign) || 0,
      lc_currency: formData.lc_currency,
      lc_value_bdt: parseFloat(formData.lc_value_bdt) || 0,
      exchange_rate: parseFloat(formData.exchange_rate) || 0,
      pi_number: formData.pi_number,
      pi_date: formData.pi_date,
      insurance_company_name: formData.insurance_company_name,
      cover_note_number: formData.cover_note_number,
      insurance_bill_amount: parseFloat(formData.insurance_bill_amount) || 0,
      insurance_issue_date: formData.insurance_issue_date,
      quantity: parseInt(formData.quantity) || 0,
      item_description: formData.item_description,
      status: formData.status || 'Active',
      lc_doc: formData.files.lc_doc?.name || null,
      pi_doc: formData.files.pi_doc?.name || null,
      insurance_doc: formData.files.insurance_doc?.name || null,
      uuid_files: uuidFiles,         // full file summaries
      chip_uuids: allValidUids,      // flat list of valid Smart card UIDs
    };

    onSave(lcData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Letter of Credit' : 'Create New Letter of Credit'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode ? `LC Ref: ${formData.lc_number}` : 'Enter LC details below'}
            </p>
          </div>
        </div>
        <select
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          className={`px-4 py-2 text-sm font-medium rounded-lg border-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer ${
            formData.status === 'Active' ? 'bg-green-50 text-green-800 border-green-200' :
            formData.status === 'Draft' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
            'bg-gray-50 text-gray-800 border-gray-200'
          }`}
        >
          <option value="Active">Active</option>
          <option value="Draft">Draft</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* LC Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">LC Details</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LC Number <span className="text-red-500">*</span></label>
                <input type="text" name="lc_number" value={formData.lc_number} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. LC-2024-001" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LC Issue Date <span className="text-red-500">*</span></label>
                <input type="date" name="lc_issue_date" value={formData.lc_issue_date} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name <span className="text-red-500">*</span></label>
                <input type="text" name="bank_name" value={formData.bank_name} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. HSBC Bangladesh" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LC Currency <span className="text-red-500">*</span></label>
                <select name="lc_currency" value={formData.lc_currency} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CNY">CNY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LC Value (Foreign) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input type="number" name="lc_value_foreign" value={formData.lc_value_foreign} onChange={handleInputChange}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00" step="0.01" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exchange Rate</label>
                <input type="number" name="exchange_rate" value={formData.exchange_rate} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00" step="0.01" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">LC Value (BDT) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                  <input type="number" name="lc_value_bdt" value={formData.lc_value_bdt} onChange={handleInputChange}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    placeholder="0.00" step="0.01" required />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PI Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Proforma Invoice (PI) Details</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PI Number</label>
                <input type="text" name="pi_number" value={formData.pi_number} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. PI-2024-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PI Date</label>
                <input type="date" name="pi_date" value={formData.pi_date} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* Insurance Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Insurance Details</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Company Name</label>
                <input type="text" name="insurance_company_name" value={formData.insurance_company_name} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Sadharan Bima Corporation" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Note Number</label>
                <input type="text" name="cover_note_number" value={formData.cover_note_number} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. CN-2024-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Bill Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                  <input type="number" name="insurance_bill_amount" value={formData.insurance_bill_amount} onChange={handleInputChange}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Issue Date</label>
                <input type="date" name="insurance_issue_date" value={formData.insurance_issue_date} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* Items Description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Item Information</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity <span className="text-red-500">*</span></label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Description <span className="text-red-500">*</span></label>
                <textarea name="item_description" value={formData.item_description} onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Enter detailed description of goods..." required></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Document Upload</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* LC Document */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                <input type="file" id="lc_doc" className="hidden"
                  onChange={(e) => handleFileChange('lc_doc', e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                <label htmlFor="lc_doc" className="cursor-pointer">
                  <FileText className="w-10 h-10 text-gray-400 mb-3 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 mb-1">LC Document</p>
                  <p className="text-xs text-gray-500">{formData.files.lc_doc ? formData.files.lc_doc.name : 'Click to upload PDF/Image'}</p>
                </label>
              </div>
              {/* PI Document */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
                <input type="file" id="pi_doc" className="hidden"
                  onChange={(e) => handleFileChange('pi_doc', e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                <label htmlFor="pi_doc" className="cursor-pointer">
                  <DollarSign className="w-10 h-10 text-gray-400 mb-3 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 mb-1">PI Document</p>
                  <p className="text-xs text-gray-500">{formData.files.pi_doc ? formData.files.pi_doc.name : 'Click to upload PDF/Image'}</p>
                </label>
              </div>
              {/* Insurance Document */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer">
                <input type="file" id="insurance_doc" className="hidden"
                  onChange={(e) => handleFileChange('insurance_doc', e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                <label htmlFor="insurance_doc" className="cursor-pointer">
                  <Shield className="w-10 h-10 text-gray-400 mb-3 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 mb-1">Insurance & Bill</p>
                  <p className="text-xs text-gray-500">{formData.files.insurance_doc ? formData.files.insurance_doc.name : 'Click to upload PDF/Image'}</p>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── Chip UID CSV Upload ── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-semibold text-gray-900">Chip UID CSV Upload</h2>
              {/* <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-full">Optional</span> */}
            </div>
            <p className="text-sm text-gray-500 mt-1 ml-7">
              Upload one or more CSV files with the header <span className="font-mono">Box number;Smart card serial number;Smart card UID</span>.
              Uniqueness is checked on the <span className="font-medium">Smart card UID</span> column.
            </p>
          </div>
          <div className="p-6">
            <UUIDCSVUpload
              value={uuidFiles}
              onChange={handleUuidFilesChange}
              onRegisterValidator={(fn) => { uuidValidatorRef.current = fn; }}
              usedUids={existingUsedUids}
            />

            {uuidSaveError && (
              <div className="mt-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 font-medium">{uuidSaveError}</p>
              </div>
            )}

            {uuidFiles.length > 0 && (
              <div className="mt-4 flex items-start gap-2 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
                <Info className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-violet-800">
                  <strong>{uuidFiles.reduce((s, f) => s + (f.valid || 0), 0)} valid Smart card UIDs</strong> from{' '}
                  {uuidFiles.length} file(s) will be saved with this LC.
                  Duplicate or missing-UID rows are excluded automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <button type="button" onClick={onBack}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Cancel
          </button>
          <button type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
            <Save className="w-4 h-4" />
            {isEditMode ? 'Update LC' : 'Create LC'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LCForm;

