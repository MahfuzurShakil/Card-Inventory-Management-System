import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  X,
  XCircle,
} from 'lucide-react';
import {
  createDefaultRecordOutputFormData,
  deriveRecordOutputState,
  getRecordOutputScopeError,
} from '../utils/recordOutput';

const RecordOutputEntryModal = ({
  boxes = [],
  subBoxes = [],
  shiftSummaries = [],
  inboundMaterials = [],
  lcs = [],
  onClose,
  onContinue,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const defaultFormData = useMemo(() => createDefaultRecordOutputFormData(today), [today]);
  const [formData, setFormData] = useState(defaultFormData);
  const [showFieldErrors, setShowFieldErrors] = useState(false);

  const derived = useMemo(
    () =>
      deriveRecordOutputState({
        formData,
        boxes,
        subBoxes,
        shiftSummaries,
        inboundMaterials,
        lcs,
      }),
    [boxes, formData, inboundMaterials, lcs, shiftSummaries, subBoxes]
  );

  const isGood = derived.isGood;

  useEffect(() => {
    if (!isGood && !formData.lcId && derived.lcOptions.length === 1) {
      setFormData((prev) => ({ ...prev, lcId: String(derived.lcOptions[0].id) }));
    }
  }, [derived.lcOptions, formData.lcId, isGood]);

  const fieldErrors = useMemo(() => {
    const nextErrors = {};

    if (!formData.outputType) nextErrors.outputType = 'Output type is required.';

    if (isGood) {
      if (!formData.productionDate) nextErrors.productionDate = 'Production date is required.';
      if (!formData.shift) nextErrors.shift = 'Shift is required.';
    } else {
      if (!formData.lcId) nextErrors.lcId = 'LC is required.';
      if (!formData.dateFrom) nextErrors.dateFrom = 'Date from is required.';
      if (!formData.dateTo) nextErrors.dateTo = 'Date to is required.';
      if (formData.dateFrom && formData.dateTo && formData.dateFrom > formData.dateTo) {
        nextErrors.dateTo = 'Date to must be on or after Date from.';
      }
    }

    return nextErrors;
  }, [formData, isGood]);

  const requiredFieldsReady = isGood
    ? !!formData.productionDate && !!formData.shift
    : !!formData.lcId && !!formData.dateFrom && !!formData.dateTo && formData.dateFrom <= formData.dateTo;

  const scopeError = useMemo(() => {
    if (!requiredFieldsReady) return null;
    return getRecordOutputScopeError({ formData, derived });
  }, [derived, formData, requiredFieldsReady]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (showFieldErrors) {
      setShowFieldErrors(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (Object.keys(fieldErrors).length > 0) {
      setShowFieldErrors(true);
      return;
    }

    if (scopeError) {
      return;
    }

    onContinue({
      outputType: formData.outputType,
      productionDate: isGood ? formData.productionDate : undefined,
      shift: isGood ? formData.shift : undefined,
      lcId: !isGood && formData.lcId ? Number(formData.lcId) : undefined,
      dateFrom: !isGood ? formData.dateFrom : undefined,
      dateTo: !isGood ? formData.dateTo : undefined,
      packagingContext: derived.packagingContext,
    });
  };

  const contextCards = isGood
    ? [
        ['Packaging Scope', `${formData.productionDate || '—'} | ${formData.shift || '—'}`],
        ['Resolved LC', derived.packagingContext.currentShiftLcNumber || 'Not resolved yet'],
        ['QC Approved Qty', `${(derived.packagingContext.qcApprovedGood || 0).toLocaleString()} units`],
        ['Carry Forward', derived.packagingContext.openCarryForwardBox?.sub_box_name || 'None'],
      ]
    : [
        [
          'Packaging Scope',
          formData.dateFrom && formData.dateTo
            ? formData.dateFrom === formData.dateTo
              ? formData.dateFrom
              : `${formData.dateFrom} to ${formData.dateTo}`
            : 'Select date range',
        ],
        ['Resolved LC', derived.packagingContext.currentShiftLcNumber || 'Not resolved yet'],
        ['Selected LC', derived.selectedLc?.lc_number || 'Select LC'],
        ['Wastage Qty', `${(derived.packagingContext.wastageQuantity || 0).toLocaleString()} units`],
      ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Record Output</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select the packaging scope first. We will validate it before opening the record output page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Output Type
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('outputType', 'Good/ QC Approved')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    isGood ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${isGood ? 'text-emerald-600' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${isGood ? 'text-emerald-900' : 'text-gray-700'}`}>QC Approved Good</p>
                    <p className="text-xs text-gray-400 mt-0.5">Production date and shift based packaging</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('outputType', 'Wastage')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    !isGood ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-200'
                  }`}
                >
                  <XCircle className={`w-5 h-5 flex-shrink-0 ${!isGood ? 'text-red-500' : 'text-gray-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${!isGood ? 'text-red-900' : 'text-gray-700'}`}>Wastage</p>
                    <p className="text-xs text-gray-400 mt-0.5">LC and date range based packaging</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                {isGood ? 'Production Shift' : 'Date Range'}
              </p>

              {isGood ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Production Date
                    </label>
                    <input
                      type="date"
                      value={formData.productionDate}
                      max={today}
                      onChange={(event) => handleChange('productionDate', event.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        showFieldErrors && fieldErrors.productionDate ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    {showFieldErrors && fieldErrors.productionDate && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.productionDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Clock className="w-3.5 h-3.5" /> Shift
                    </label>
                    <div className="grid grid-cols-2 gap-2 h-[40px]">
                      <button
                        type="button"
                        onClick={() => handleChange('shift', 'Day')}
                        className={`text-sm font-semibold rounded-lg transition-colors ${
                          formData.shift === 'Day' ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Day
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('shift', 'Night')}
                        className={`text-sm font-semibold rounded-lg transition-colors ${
                          formData.shift === 'Night' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Night
                      </button>
                    </div>
                    {showFieldErrors && fieldErrors.shift && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.shift}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Layers className="w-3.5 h-3.5" /> LC
                    </label>
                    <select
                      value={formData.lcId}
                      onChange={(event) => handleChange('lcId', event.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        showFieldErrors && fieldErrors.lcId ? 'border-red-300' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Select LC</option>
                      {derived.lcOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.lc_number}
                        </option>
                      ))}
                    </select>
                    {showFieldErrors && fieldErrors.lcId && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.lcId}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Date From
                    </label>
                    <input
                      type="date"
                      value={formData.dateFrom}
                      max={today}
                      onChange={(event) => handleChange('dateFrom', event.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        showFieldErrors && fieldErrors.dateFrom ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    {showFieldErrors && fieldErrors.dateFrom && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.dateFrom}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Date To
                    </label>
                    <input
                      type="date"
                      value={formData.dateTo}
                      max={today}
                      onChange={(event) => handleChange('dateTo', event.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        showFieldErrors && fieldErrors.dateTo ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    {showFieldErrors && fieldErrors.dateTo && (
                      <p className="mt-1 text-xs text-red-500">{fieldErrors.dateTo}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {requiredFieldsReady && scopeError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-red-900">{scopeError.title}</p>
                    <p className="text-sm text-red-700 mt-0.5">{scopeError.message}</p>
                    {scopeError.details?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {scopeError.details.map((detail) => (
                          <p key={detail} className="text-xs text-red-700">
                            {detail}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {requiredFieldsReady && !scopeError && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Scope is ready</p>
                    <p className="text-sm text-emerald-700 mt-0.5">
                      All validations passed. Continue to the record output page to configure quantity and create boxes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Packaging Context
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contextCards.map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!requiredFieldsReady}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                !requiredFieldsReady
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordOutputEntryModal;
