import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Save,
  FileText,
  DollarSign,
  Shield,
  Upload,
  Building2,
  Hash,
  XCircle,
  FileSpreadsheet,
  Info,
  Loader2,
} from 'lucide-react';
import ChipUidFileSummary from '../components/ChipUidFileSummary';
import {
  buildChipUidOverallSummary,
  collectAllExistingChipUids,
  normalizeStoredChipUidFile,
  saveChipUidValidationSession,
  validateChipUidFiles,
} from '../utils/chipUidApi';

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
  files: { lc_doc: null, pi_doc: null, insurance_doc: null },
});

const isCsvFile = (file) =>
  file && (file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv' || file.name.toLowerCase().endsWith('.txt'));

const LCForm = ({ lc, onSave, onBack, existingLcs = [] }) => {
  const isEditMode = Boolean(lc?.id);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState(() => buildInitialFormData(lc));
  const [savedUuidFiles, setSavedUuidFiles] = useState(() =>
    (lc?.uuid_files || []).map((file, index) => ({
      ...normalizeStoredChipUidFile(file, index),
      isPersisted: true,
    })).filter(Boolean)
  );
  const [pendingUploads, setPendingUploads] = useState([]);
  const [pendingUuidFiles, setPendingUuidFiles] = useState([]);
  const [validationSessionId, setValidationSessionId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCheckingFiles, setIsCheckingFiles] = useState(false);
  const [isSavingChipUids, setIsSavingChipUids] = useState(false);
  const [uuidSaveError, setUuidSaveError] = useState(null);
  const [uuidUploadInfo, setUuidUploadInfo] = useState(null);

  const allExistingUsedUids = useMemo(() => collectAllExistingChipUids(existingLcs), [existingLcs]);
  const allUuidFiles = useMemo(() => [...savedUuidFiles, ...pendingUuidFiles], [savedUuidFiles, pendingUuidFiles]);
  const uuidTotals = useMemo(() => buildChipUidOverallSummary(allUuidFiles), [allUuidFiles]);
  const hasInvalidPendingFiles = pendingUuidFiles.some((file) => file.status !== 'Valid');

  const buildLcPayload = (uuidFilesToSave = savedUuidFiles) => ({
    ...(lc?.id ? { id: lc.id, shipments: lc.shipments || [] } : {}),
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
    quantity: parseInt(formData.quantity, 10) || 0,
    item_description: formData.item_description,
    status: formData.status || 'Active',
    lc_doc: formData.files.lc_doc?.name || lc?.lc_doc || null,
    pi_doc: formData.files.pi_doc?.name || lc?.pi_doc || null,
    insurance_doc: formData.files.insurance_doc?.name || lc?.insurance_doc || null,
    uuid_files: uuidFilesToSave.map((file) => {
      const { isPersisted: _isPersisted, ...storedFile } = file;
      return storedFile;
    }),
    chip_uuids: uuidFilesToSave.flatMap((file) => file.validUids || []),
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (docType, file) => {
    setFormData((prev) => ({
      ...prev,
      files: { ...prev.files, [docType]: file },
    }));
  };

  const runValidation = async (uploads) => {
    if (uploads.length === 0) {
      setPendingUploads([]);
      setPendingUuidFiles([]);
      setValidationSessionId(null);
      setUuidUploadInfo(null);
      return;
    }

    setIsCheckingFiles(true);
    setUuidSaveError(null);

    try {
      const response = await validateChipUidFiles(
        uploads.map((entry) => entry.file),
        { usedUids: allExistingUsedUids }
      );

      setPendingUploads(uploads);
      setPendingUuidFiles((response.files || []).map((file) => ({ ...file, isPersisted: false })));
      setValidationSessionId(response.validationSessionId);
      setUuidUploadInfo(`Validated ${response.overall.fileCount} file(s). Remove any invalid file before saving.`);
    } catch (error) {
      setUuidSaveError(error.message || 'Chip UID validation failed.');
    } finally {
      setIsCheckingFiles(false);
    }
  };

  const handleProcessFiles = async (fileList) => {
    const validFiles = Array.from(fileList || []).filter(isCsvFile);
    if (validFiles.length === 0) {
      setUuidSaveError('Please upload CSV or TXT files only.');
      return;
    }

    const nextUploads = [
      ...pendingUploads.filter((entry) => !validFiles.some((file) => file.name === entry.file.name)),
      ...validFiles.map((file) => ({ fileName: file.name, file })),
    ];

    await runValidation(nextUploads);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    await handleProcessFiles(event.dataTransfer.files);
  };

  const handleRemovePendingFile = async (fileName) => {
    const nextUploads = pendingUploads.filter((entry) => entry.fileName !== fileName);
    await runValidation(nextUploads);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setUuidSaveError(null);

    if (!isEditMode) {
      onSave(buildLcPayload([]), { afterSaveView: 'lc-form' });
      window.alert('LC created successfully. You can now upload Chip UID CSV files.');
      return;
    }

    onSave(buildLcPayload(savedUuidFiles));
  };

  const handleSaveChipUidFiles = async () => {
    setUuidSaveError(null);

    if (!isEditMode || pendingUuidFiles.length === 0) return;
    if (hasInvalidPendingFiles) {
      setUuidSaveError('Remove invalid files before saving Chip UID data.');
      return;
    }
    if (!validationSessionId) {
      setUuidSaveError('Please validate the uploaded Chip UID files again before saving.');
      return;
    }

    setIsSavingChipUids(true);
    try {
      const saveResult = await saveChipUidValidationSession(validationSessionId, pendingUuidFiles, lc.id);
      const persistedPendingFiles = (saveResult.files || []).map((file, index) => ({
        ...normalizeStoredChipUidFile(file, savedUuidFiles.length + index),
        isPersisted: true,
      }));
      const mergedUuidFiles = [...savedUuidFiles, ...persistedPendingFiles];
      setSavedUuidFiles(mergedUuidFiles);
      setPendingUploads([]);
      setPendingUuidFiles([]);
      setValidationSessionId(null);
      setUuidUploadInfo('Chip UID files uploaded successfully.');
      onSave(buildLcPayload(mergedUuidFiles), { afterSaveView: false });
    } catch (error) {
      setUuidSaveError(error.message || 'Chip UID save failed.');
    } finally {
      setIsSavingChipUids(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Letter of Credit' : 'Create New Letter of Credit'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEditMode ? `LC Ref: ${formData.lc_number}` : 'Enter LC details below'}
            </p>
          </div>
        </div>
        <select
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          className={`cursor-pointer rounded-lg border-2 px-4 py-2 text-sm font-medium focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
            formData.status === 'Active'
              ? 'border-green-200 bg-green-50 text-green-800'
              : formData.status === 'Draft'
                ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                : 'border-gray-200 bg-gray-50 text-gray-800'
          }`}
        >
          <option value="Active">Active</option>
          <option value="Draft">Draft</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">LC Details</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">LC Number <span className="text-red-500">*</span></label>
                <input type="text" name="lc_number" value={formData.lc_number} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="e.g. LC-2024-001" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">LC Issue Date <span className="text-red-500">*</span></label>
                <input type="date" name="lc_issue_date" value={formData.lc_issue_date} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Bank Name <span className="text-red-500">*</span></label>
                <input type="text" name="bank_name" value={formData.bank_name} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="e.g. HSBC Bangladesh" required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">LC Currency <span className="text-red-500">*</span></label>
                <select name="lc_currency" value={formData.lc_currency} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CNY">CNY</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">LC Value (Foreign) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input type="number" name="lc_value_foreign" value={formData.lc_value_foreign} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="0.00" step="0.01" required />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Exchange Rate</label>
                <input type="number" name="exchange_rate" value={formData.exchange_rate} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="0.00" step="0.01" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">LC Value (BDT) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                  <input type="number" name="lc_value_bdt" value={formData.lc_value_bdt} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-8 pr-3 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="0.00" step="0.01" required />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Proforma Invoice (PI) Details</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">PI Number</label>
                <input type="text" name="pi_number" value={formData.pi_number} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="e.g. PI-2024-001" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">PI Date</label>
                <input type="date" name="pi_date" value={formData.pi_date} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Insurance Details</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Insurance Company Name</label>
                <input type="text" name="insurance_company_name" value={formData.insurance_company_name} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="e.g. Sadharan Bima Corporation" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Cover Note Number</label>
                <input type="text" name="cover_note_number" value={formData.cover_note_number} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="e.g. CN-2024-001" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Insurance Bill Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                  <input type="number" name="insurance_bill_amount" value={formData.insurance_bill_amount} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Insurance Issue Date</label>
                <input type="date" name="insurance_issue_date" value={formData.insurance_issue_date} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Item Information</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Quantity <span className="text-red-500">*</span></label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="0" required />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Item Description <span className="text-red-500">*</span></label>
                <textarea name="item_description" value={formData.item_description} onChange={handleInputChange} rows="3" className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="Enter detailed description of goods..." required />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Document Upload</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-all hover:border-blue-400 hover:bg-blue-50">
                <input type="file" id="lc_doc" className="hidden" onChange={(e) => handleFileChange('lc_doc', e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                <label htmlFor="lc_doc" className="cursor-pointer">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="mb-1 text-sm font-medium text-gray-900">LC Document</p>
                  <p className="text-xs text-gray-500">{formData.files.lc_doc ? formData.files.lc_doc.name : (lc?.lc_doc || 'Click to upload PDF/Image')}</p>
                </label>
              </div>
              <div className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-all hover:border-purple-400 hover:bg-purple-50">
                <input type="file" id="pi_doc" className="hidden" onChange={(e) => handleFileChange('pi_doc', e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                <label htmlFor="pi_doc" className="cursor-pointer">
                  <DollarSign className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="mb-1 text-sm font-medium text-gray-900">PI Document</p>
                  <p className="text-xs text-gray-500">{formData.files.pi_doc ? formData.files.pi_doc.name : (lc?.pi_doc || 'Click to upload PDF/Image')}</p>
                </label>
              </div>
              <div className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-all hover:border-green-400 hover:bg-green-50">
                <input type="file" id="insurance_doc" className="hidden" onChange={(e) => handleFileChange('insurance_doc', e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                <label htmlFor="insurance_doc" className="cursor-pointer">
                  <Shield className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="mb-1 text-sm font-medium text-gray-900">Insurance & Bill</p>
                  <p className="text-xs text-gray-500">{formData.files.insurance_doc ? formData.files.insurance_doc.name : (lc?.insurance_doc || 'Click to upload PDF/Image')}</p>
                </label>
              </div>
            </div>
          </div>
        </div>

        {isEditMode ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-gray-900">Chip UID CSV Upload</h2>
              </div>
              <p className="ml-7 mt-1 text-sm text-gray-500">
                Upload one or more CSV files with the header <span className="font-mono">Box number;Smart card serial number;Smart card UID</span>.
                Uniqueness is checked only on the <span className="font-medium">Smart card UID</span> column.
              </p>
            </div>
            <div className="space-y-4 p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  multiple
                  className="hidden"
                  onChange={(e) => handleProcessFiles(e.target.files)}
                />
                {isCheckingFiles ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm font-medium text-blue-700">Checking uploaded files against duplicate and invalid UID rules...</p>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-700">Drop CSV files here or click to browse</p>
                    <p className="mt-1 text-xs text-gray-400">Validation starts immediately after upload. Invalid files must be removed before saving.</p>
                  </>
                )}
              </div>

              {uuidUploadInfo && (
                <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <p className="text-xs text-blue-800">{uuidUploadInfo}</p>
                </div>
              )}

              {uuidSaveError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-sm font-medium text-red-800">{uuidSaveError}</p>
                </div>
              )}

              <ChipUidFileSummary
                files={allUuidFiles}
                allowRemove
                onRemoveFile={handleRemovePendingFile}
                emptyMessage="Upload Chip UID CSV files to validate them before saving."
                disableIssueActionWhenEmpty
                showSavedState
              />

              {allUuidFiles.length > 0 && (
                <div className={`rounded-xl border px-4 py-3 ${hasInvalidPendingFiles ? 'border-amber-200 bg-amber-50' : 'border-violet-200 bg-violet-50'}`}>
                  <p className={`text-xs ${hasInvalidPendingFiles ? 'text-amber-800' : 'text-violet-800'}`}>
                    {hasInvalidPendingFiles ? (
                      <>Remove invalid files before saving Chip UID data. The upload action is blocked while any pending file remains invalid.</>
                    ) : pendingUuidFiles.length > 0 ? (
                      <>New files are validated and marked as <strong>Pending save</strong>. Click <strong>Save Chip UID Files</strong> to upload them for this LC.</>
                    ) : (
                      <><strong>{uuidTotals.validCount} valid Smart card UIDs</strong> are already saved for this LC.</>
                    )}
                  </p>
                </div>
              )}

              {pendingUuidFiles.length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveChipUidFiles}
                    disabled={isCheckingFiles || isSavingChipUids || hasInvalidPendingFiles}
                    className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
                  >
                    {isSavingChipUids ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Save Chip UID Files
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Chip UID upload is available after LC creation.</p>
                <p className="mt-1 text-sm text-blue-800">
                  Create this LC first, then the form will reopen in edit mode so you can validate and upload Chip UID CSV files separately.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <button type="button" onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCheckingFiles || isSavingChipUids}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {(isSavingChipUids || isCheckingFiles) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditMode ? 'Update LC' : 'Create LC'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LCForm;
