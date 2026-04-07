import { useState, useRef, useEffect } from 'react';
import {
  ChevronRight, Scan, X, FileText, Printer,
  Package, AlertCircle, Hash, Calendar,
  User, AlertTriangle, MapPin, Building2,
  CheckCircle, SkipForward, Layers
} from 'lucide-react';
import { generateChallanNo, getChallanDocumentHtml, openChallanPrint } from '../utils/challanPrint';

const SubBoxRow = ({ sb, onRemove }) => {
  const good = sb.output_type === 'Good/ QC Approved';
  const isReadyMade = sb.sourceType === 'ready_made';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-100 rounded-lg hover:border-gray-300 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold font-mono text-gray-900 truncate">
            {sb.sub_box_name || sb.box_name || sb.barcode}
          </span>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
            good ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            {good ? 'QC' : 'Wastage'}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
            isReadyMade
              ? 'bg-cyan-100 text-cyan-800'
              : sb.shift === 'Day'
                ? 'bg-amber-100 text-amber-700'
                : sb.shift === 'Night'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-200 text-gray-700'
          }`}>
            {isReadyMade ? 'Ready Made' : (sb.shift || '-')}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{sb.barcode || '-'}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-800">{(sb.quantity || 0).toLocaleString()}</p>
        <p className="text-xs text-gray-400">{isReadyMade ? '-' : (sb.production_date || '-')}</p>
      </div>
      <button
        onClick={() => onRemove(sb.id)}
        className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const SummaryRow = ({ label, value, mono = false, multiline = false }) => {
  const displayValue =
    typeof value === 'string'
      ? (value.trim() || '-')
      : (value ?? '-');

  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold text-gray-900 text-right ${mono ? 'font-mono' : ''} ${multiline ? 'whitespace-pre-wrap' : ''}`}>
        {displayValue}
      </span>
    </div>
  );
};

const ChallanConfirmModal = ({ challan, boxes, onSkip, onPrint }) => {
  const previewHtml = getChallanDocumentHtml(challan, boxes, { autoPrint: false });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-gray-900">Challan confirmed successfully</h2>
            </div>
            <p className="text-sm text-gray-500">
              Review the actual challan preview before printing.
            </p>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 bg-gray-100">
          <div className="max-w-[860px] mx-auto border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
            <iframe
              title="Challan preview"
              srcDoc={previewHtml}
              className="w-full h-[56rem] bg-white"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0 gap-3">
          <p className="text-sm font-medium text-gray-700">Do you want to print the challan now?</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onSkip}
              className="flex items-center gap-1.5 px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white font-medium transition-colors text-sm"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
            <button
              onClick={onPrint}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
            >
              <Printer className="w-4 h-4" />
              Print Challan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateChallan = ({ subBoxes, preSelectedIds = [], onBack, onDispatch }) => {
  const scanInputRef = useRef(null);
  const [scanValue, setScanValue] = useState('');
  const [scanError, setScanError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [addedIds, setAddedIds] = useState(preSelectedIds);
  const [confirmedChallan, setConfirmedChallan] = useState(null);
  const [challanInfo, setChallanInfo] = useState({
    challan_no: generateChallanNo(),
    date: new Date().toISOString().split('T')[0],
    prepared_by: 'Production Staff',
    receiver_name: '',
    receiver_address: '',
    item_name: 'Smart Blank Card',
    item_description: '',
  });

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  const addedBoxes = subBoxes.filter((sb) => addedIds.includes(sb.id));
  const totalQty = addedBoxes.reduce((sum, sb) => sum + (sb.quantity || 0), 0);
  const challanPayload = {
    challan_no: challanInfo.challan_no,
    date: challanInfo.date,
    prepared_by: challanInfo.prepared_by || 'Production Staff',
    receiver_name: challanInfo.receiver_name.trim(),
    receiver_address: challanInfo.receiver_address.trim(),
    item_name: challanInfo.item_name || 'Smart Blank Card',
    item_description: challanInfo.item_description,
  };

  const goodCount = addedBoxes.filter((sb) => sb.output_type === 'Good/ QC Approved').length;
  const wastageCount = addedBoxes.filter((sb) => sb.output_type !== 'Good/ QC Approved').length;
  const dayCount = addedBoxes.filter((sb) => sb.shift === 'Day').length;
  const nightCount = addedBoxes.filter((sb) => sb.shift === 'Night').length;
  const partialBoxesRemaining = subBoxes.filter((sb) => sb.box_type === 'Partial' && !addedIds.includes(sb.id)).length > 0;
  const summaryFields = [
    { label: 'Challan No.', value: challanPayload.challan_no, mono: true },
    { label: 'Date', value: challanPayload.date },
    { label: 'Prepared By', value: challanPayload.prepared_by },
    { label: 'Item Name', value: challanPayload.item_name },
    { label: 'Item Description', value: challanPayload.item_description, multiline: true },
    { label: 'Receiver Name', value: challanPayload.receiver_name },
    { label: 'Receiver Address', value: challanPayload.receiver_address, multiline: true },
    { label: 'Boxes', value: String(addedBoxes.length) },
    { label: 'Quantity', value: totalQty.toLocaleString() },
  ];

  const handleInfoChange = (field, value) => {
    setChallanInfo((prev) => ({ ...prev, [field]: value }));
    setConfirmError('');
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleScan = (e) => {
    e?.preventDefault();

    const val = scanValue.trim();
    if (!val) return;

    const found = subBoxes.find((sb) =>
      sb.barcode === val || sb.sub_box_name === val || sb.box_name === val
    );

    if (!found) {
      setScanError(`No box found for: "${val}"`);
      setScanValue('');
      return;
    }

    if (!found.barcode) {
      setScanError('This is a partial box and cannot be added to a challan yet.');
      setScanValue('');
      return;
    }

    if ((found.delivery_status || 'delivery_pending') !== 'delivery_pending') {
      setScanError(`Unavailable for challan: ${found.sub_box_name || found.barcode}`);
      setScanValue('');
      return;
    }

    if (addedIds.includes(found.id)) {
      setScanError(`Already added: ${found.sub_box_name || found.barcode}`);
      setScanValue('');
      return;
    }

    setAddedIds((prev) => [...prev, found.id]);
    setScanValue('');
    setScanError('');
    setConfirmError('');
    scanInputRef.current?.focus();
  };

  const handleRemove = (id) => {
    setAddedIds((prev) => prev.filter((x) => x !== id));
  };

  const validateChallanInfo = () => {
    const nextErrors = {};

    if (!challanPayload.receiver_name) {
      nextErrors.receiver_name = 'Receiver name is required.';
    }

    if (!challanPayload.receiver_address) {
      nextErrors.receiver_address = 'Receiver address is required.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleConfirmChallan = () => {
    if (addedBoxes.length === 0) {
      setConfirmError('Add at least one sub-box before creating the challan.');
      return;
    }

    if (!validateChallanInfo()) {
      setConfirmError('Receiver name and address are required before creating the challan.');
      return;
    }

    if (typeof onDispatch !== 'function') {
      setConfirmError('Challan dispatch handler is not available.');
      return;
    }

    setConfirmError('');

    const savedChallan = { ...challanPayload };

    onDispatch(addedIds, {
      delivery_status: 'ready_for_delivery',
      challan_status: 'pending',
      challan_no: savedChallan.challan_no,
      challan_date: savedChallan.date,
      challan_prepared_by: savedChallan.prepared_by,
      challan_receiver_name: savedChallan.receiver_name,
      challan_receiver_address: savedChallan.receiver_address,
      challan_item_name: savedChallan.item_name,
      challan_item_description: savedChallan.item_description,
      challan_remarks: savedChallan.item_description,
    });

    setConfirmedChallan({
      challan: savedChallan,
      boxes: [...addedBoxes],
    });
  };

  const handleSkipAfterConfirm = () => {
    setConfirmedChallan(null);
    onBack();
  };

  const handlePrintAfterConfirm = () => {
    if (!confirmedChallan) return;
    openChallanPrint(confirmedChallan.challan, confirmedChallan.boxes);
    setConfirmedChallan(null);
    onBack();
  };

  return (
    <div className="space-y-5">
      {confirmedChallan && (
        <ChallanConfirmModal
          challan={confirmedChallan.challan}
          boxes={confirmedChallan.boxes}
          onSkip={handleSkipAfterConfirm}
          onPrint={handlePrintAfterConfirm}
        />
      )}

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Create Delivery Challan</h1>
          <p className="text-sm text-gray-400">Scan boxes, review the list, confirm the challan, then print if needed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Scan className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Scan Barcode</p>
                  <p className="text-xs text-gray-400">Use scanner or type manually, then press Enter</p>
                </div>
              </div>

              <form onSubmit={handleScan} className="flex gap-2">
                <input
                  ref={scanInputRef}
                  value={scanValue}
                  onChange={(e) => {
                    setScanValue(e.target.value);
                    setScanError('');
                  }}
                  placeholder="Scan or type barcode..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Add Box
                </button>
              </form>

              {scanError && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800">{scanError}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-gray-900">Scanned Boxes</p>
                <p className="text-xs text-gray-400 mt-1">Review boxes before confirming the challan</p>
              </div>
              {addedBoxes.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-600">
                    {addedBoxes.length} box{addedBoxes.length !== 1 ? 'es' : ''} | {totalQty.toLocaleString()} units
                  </span>
                  {goodCount > 0 && <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 font-semibold rounded">QC {goodCount}</span>}
                  {wastageCount > 0 && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 font-semibold rounded">Waste {wastageCount}</span>}
                  {dayCount > 0 && <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 font-semibold rounded">Day {dayCount}</span>}
                  {nightCount > 0 && <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 font-semibold rounded">Night {nightCount}</span>}
                </div>
              )}
            </div>

            <div className="h-[18rem] overflow-y-auto">
              {addedBoxes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">No boxes added yet</p>
                  <p className="text-xs text-gray-300 mt-1">Scan a barcode to add boxes to the challan</p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {addedBoxes.map((sb) => (
                    <SubBoxRow key={sb.id} sb={sb} onRemove={handleRemove} />
                  ))}
                </div>
              )}
            </div>

            {addedBoxes.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</span>
                <span className="text-sm font-bold text-gray-900">
                  {totalQty.toLocaleString()} units | {addedBoxes.length} boxes
                </span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Challan Details</p>
              <p className="text-xs text-gray-400 mt-1">Receiver information and challan metadata for print.</p>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    <Hash className="w-3 h-3 inline mr-1" />Challan No.
                  </label>
                  <input
                    value={challanInfo.challan_no}
                    onChange={(e) => handleInfoChange('challan_no', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white font-mono text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    <Calendar className="w-3 h-3 inline mr-1" />Date
                  </label>
                  <input
                    type="date"
                    value={challanInfo.date}
                    onChange={(e) => handleInfoChange('date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    <User className="w-3 h-3 inline mr-1" />Prepared By
                  </label>
                  <input
                    value={challanInfo.prepared_by}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-default"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    <Package className="w-3 h-3 inline mr-1" />Item Name
                  </label>
                  <input
                    value={challanInfo.item_name}
                    onChange={(e) => handleInfoChange('item_name', e.target.value)}
                    placeholder="Item name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    <Building2 className="w-3 h-3 inline mr-1" />Receiver Name
                  </label>
                  <input
                    value={challanInfo.receiver_name}
                    onChange={(e) => handleInfoChange('receiver_name', e.target.value)}
                    placeholder="Enter receiving company or person"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 transition-all ${
                      fieldErrors.receiver_name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {fieldErrors.receiver_name && (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.receiver_name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    <FileText className="w-3 h-3 inline mr-1" />Item Description
                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={challanInfo.item_description}
                    onChange={(e) => handleInfoChange('item_description', e.target.value)}
                    placeholder="Add item description if needed..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white resize-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    <MapPin className="w-3 h-3 inline mr-1" />Receiver Address
                  </label>
                  <textarea
                    rows={3}
                    value={challanInfo.receiver_address}
                    onChange={(e) => handleInfoChange('receiver_address', e.target.value)}
                    placeholder="Enter full delivery address"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-white resize-none focus:ring-2 focus:ring-blue-500 transition-all ${
                      fieldErrors.receiver_address ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {fieldErrors.receiver_address && (
                    <p className="mt-1.5 text-xs text-red-600">{fieldErrors.receiver_address}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Layers className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Challan Summary</p>
                <p className="text-xs text-gray-400">Final review before confirmation</p>
              </div>
            </div>

            <div className="space-y-3">
              {summaryFields.map((field) => (
                <SummaryRow
                  key={field.label}
                  label={field.label}
                  value={field.value}
                  mono={field.mono}
                  multiline={field.multiline}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleConfirmChallan}
                disabled={addedBoxes.length === 0}
                className={`w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold rounded-xl transition-all ${
                  addedBoxes.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                {addedBoxes.length > 0 ? 'Confirm Challan' : 'Add Boxes to Confirm Challan'}
              </button>
              <button
                onClick={onBack}
                className="w-full py-3 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {confirmError && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{confirmError}</p>
            </div>
          )}

          {partialBoxesRemaining && (
            <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Partial boxes</span> cannot be added to a challan until they are finalized.
                Close them first on the Sub-Box Creation page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateChallan;
