import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Hash, CheckCircle, XCircle } from 'lucide-react';

const ShiftUpdateModal = ({ box, shiftData, onSave, onClose }) => {
  const isChip = box.item_name.toLowerCase().includes('chip');
  const remainingQty = box.quantity - (box.consumed_quantity || 0);

  // Form State
  const [formData, setFormData] = useState({
    finished_product_count: shiftData?.finished_product_count || 0,
    qc_approved_count: shiftData?.qc_approved_count || 0,
    wastage_count: shiftData?.wastage_count || 0,
    consumed_count: shiftData?.consumed_count || 0,
    fully_consumed: shiftData?.fully_consumed || false,
    remarks: shiftData?.remarks || ''
  });

  const [errors, setErrors] = useState({});

  // Auto-calculate consumed count for chip boxes
  useEffect(() => {
    if (isChip && formData.finished_product_count > 0) {
      const totalConsumed = parseInt(formData.finished_product_count) + parseInt(formData.wastage_count || 0);
      setFormData(prev => ({ ...prev, consumed_count: totalConsumed }));
    }
  }, [formData.finished_product_count, formData.wastage_count, isChip]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (isChip) {
      // Chip box validation
      if (!formData.finished_product_count || formData.finished_product_count <= 0) {
        newErrors.finished_product_count = 'Finished product count must be greater than 0';
      }

      if (formData.consumed_count > remainingQty) {
        newErrors.consumed_count = `Cannot exceed remaining quantity (${remainingQty.toLocaleString()})`;
      }

      if (parseInt(formData.qc_approved_count || 0) > parseInt(formData.finished_product_count || 0)) {
        newErrors.qc_approved_count = 'QC approved cannot exceed finished product';
      }
    } else {
      // Non-chip box - just need to mark consumed or not
      // No validation needed
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const updateData = {
        box_id: box.id,
        ...formData,
        updated_by: 'Production Manager', // In real app, get from auth context
        updated_at: new Date().toISOString()
      };

      onSave(updateData);
    }
  };

  // Calculate new remaining quantity for chip boxes
  const newConsumedTotal = (box.consumed_quantity || 0) + parseInt(formData.consumed_count || 0);
  const newRemainingQty = box.quantity - newConsumedTotal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Update Shift Production Data</h2>
            <p className="text-sm text-gray-500 mt-1">
              {box.box_name} - {box.item_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Box Summary */}
        <div className={`mx-6 mt-6 rounded-lg border-2 p-4 ${
          isChip 
            ? 'bg-purple-50 border-purple-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className={`text-xs font-medium uppercase mb-1 ${
                isChip ? 'text-purple-700' : 'text-gray-700'
              }`}>
                Box Type
              </p>
              <p className={`text-sm font-bold ${
                isChip ? 'text-purple-900' : 'text-gray-900'
              }`}>
                {isChip ? 'Chip (Count)' : 'Other (Full/Not)'}
              </p>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase mb-1 ${
                isChip ? 'text-purple-700' : 'text-gray-700'
              }`}>
                Total Quantity
              </p>
              <p className={`text-sm font-bold ${
                isChip ? 'text-purple-900' : 'text-gray-900'
              }`}>
                {box.quantity.toLocaleString()}
              </p>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase mb-1 ${
                isChip ? 'text-purple-700' : 'text-gray-700'
              }`}>
                Already Consumed
              </p>
              <p className={`text-sm font-bold ${
                isChip ? 'text-purple-900' : 'text-gray-900'
              }`}>
                {(box.consumed_quantity || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className={`text-xs font-medium uppercase mb-1 ${
                isChip ? 'text-purple-700' : 'text-gray-700'
              }`}>
                Remaining
              </p>
              <p className={`text-sm font-bold ${
                isChip ? 'text-purple-900' : 'text-gray-900'
              }`}>
                {remainingQty.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {isChip ? (
            /* Chip Box Form - Count Tracking */
            <>
              <div className="space-y-5">
                {/* Finished Product Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Finished Product Count <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={remainingQty}
                    value={formData.finished_product_count}
                    onChange={(e) => handleChange('finished_product_count', e.target.value)}
                    placeholder="Enter finished product count"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.finished_product_count ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.finished_product_count && (
                    <p className="mt-1 text-sm text-red-600">{errors.finished_product_count}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Total cards produced in this shift
                  </p>
                </div>

                {/* QC Approved Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      QC Approved Count
                    </div>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={formData.finished_product_count || 0}
                    value={formData.qc_approved_count}
                    onChange={(e) => handleChange('qc_approved_count', e.target.value)}
                    placeholder="Enter QC approved count"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.qc_approved_count ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.qc_approved_count && (
                    <p className="mt-1 text-sm text-red-600">{errors.qc_approved_count}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Cards that passed quality control
                  </p>
                </div>

                {/* Wastage Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Wastage Count
                    </div>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.wastage_count}
                    onChange={(e) => handleChange('wastage_count', e.target.value)}
                    placeholder="Enter wastage count"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Chips damaged or rejected during production
                  </p>
                </div>

                {/* Consumed Count (Auto-calculated) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Chips Consumed This Shift
                  </label>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-900">Finished + Wastage</span>
                      <span className="text-2xl font-bold text-blue-900">
                        {formData.consumed_count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {errors.consumed_count && (
                    <p className="mt-1 text-sm text-red-600">{errors.consumed_count}</p>
                  )}
                </div>

                {/* New Remaining Quantity */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase mb-1">Previous Remaining</p>
                      <p className="text-lg font-bold text-green-900">{remainingQty.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-orange-700 uppercase mb-1">This Shift</p>
                      <p className="text-lg font-bold text-orange-900">-{formData.consumed_count.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-purple-700 uppercase mb-1">New Remaining</p>
                      <p className="text-lg font-bold text-purple-900">{newRemainingQty.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Non-Chip Box Form - Simple Consumed/Not */
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.fully_consumed}
                    onChange={(e) => handleChange('fully_consumed', e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Mark as Fully Consumed</p>
                    <p className="text-sm text-gray-600">
                      Check this box if all material has been used in production
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> For tape and sheet materials, we only track whether the box is fully consumed or not. 
                  No count tracking is required.
                </p>
              </div>
            </>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks (Optional)
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              rows={3}
              placeholder="Add any notes about this shift production..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Shift Data
            </button>
          </div>

          {/* Warning for partial consumption */}
          {isChip && newRemainingQty > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900">
                  <p className="font-medium mb-1">Partially Consumed Box:</p>
                  <p>
                    This box will have {newRemainingQty.toLocaleString()} chips remaining. 
                    It can be issued to the next shift and will be auto-suggested when scanning for production.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ShiftUpdateModal;