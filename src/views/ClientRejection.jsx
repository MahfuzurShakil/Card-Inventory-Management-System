import { useState } from 'react';
import { ChevronRight, Save, AlertTriangle, Package, Hash, FileText, Calendar } from 'lucide-react';

const ClientRejection = ({ subBox, box, onSave, onBack }) => {
  // Form State
  const [formData, setFormData] = useState({
    rejected_quantity: 0,
    rejection_reason: '',
    rejection_date: new Date().toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState({});

  // Calculate available quantity (total - already rejected)
  const currentRejectedCount = subBox.client_rejected_count || 0;
  const availableQuantity = subBox.quantity - currentRejectedCount;

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.rejected_quantity || formData.rejected_quantity <= 0) {
      newErrors.rejected_quantity = 'Rejected quantity must be greater than 0';
    }

    if (formData.rejected_quantity > availableQuantity) {
      newErrors.rejected_quantity = `Cannot exceed available quantity (${availableQuantity})`;
    }

    if (!formData.rejection_reason.trim()) {
      newErrors.rejection_reason = 'Please provide a reason for rejection';
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
      const rejectionData = {
        sub_box_id: subBox.id,
        rejected_quantity: parseInt(formData.rejected_quantity),
        rejection_reason: formData.rejection_reason,
        rejection_date: formData.rejection_date,
        recorded_by: 'Warehouse Staff', // In real app, get from auth context
        created_at: new Date().toISOString()
      };

      onSave(rejectionData);
    }
  };

  // Calculate new totals
  const newRejectedTotal = currentRejectedCount + parseInt(formData.rejected_quantity || 0);
  const newRejectedPercentage = subBox.quantity > 0 ? ((newRejectedTotal / subBox.quantity) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Record Client Rejection</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update sub-box with client quality feedback
          </p>
        </div>
      </div>

      {/* Sub-Box Summary */}
      {/* <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-orange-900">Sub-Box Details</h3>
            <p className="text-sm text-orange-700">Barcode: {subBox.barcode || 'N/A'}</p>
          </div>
          <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/70 rounded-lg p-4">
            <p className="text-xs font-medium text-orange-700 uppercase mb-1">Mother Box</p>
            <p className="text-sm font-bold text-orange-900">{box?.box_name || 'Unknown'}</p>
            <p className="text-xs text-orange-600 mt-1">{box?.item_name || 'N/A'}</p>
          </div>

          <div className="bg-white/70 rounded-lg p-4">
            <p className="text-xs font-medium text-orange-700 uppercase mb-1">Total Quantity</p>
            <p className="text-2xl font-bold text-orange-900">{subBox.quantity.toLocaleString()}</p>
          </div>

          <div className="bg-white/70 rounded-lg p-4">
            <p className="text-xs font-medium text-orange-700 uppercase mb-1">Already Rejected</p>
            <p className="text-2xl font-bold text-orange-900">{currentRejectedCount.toLocaleString()}</p>
          </div>

          <div className="bg-white/70 rounded-lg p-4">
            <p className="text-xs font-medium text-orange-700 uppercase mb-1">Available</p>
            <p className="text-2xl font-bold text-orange-900">{availableQuantity.toLocaleString()}</p>
          </div>
        </div>
      </div> */}

      {/* Warning if no available quantity */}
      {availableQuantity <= 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-medium">Cannot Record Rejection</p>
              <p className="mt-1">
                All units in this sub-box have already been rejected. There is no available quantity left to reject.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Form */}
      {availableQuantity > 0 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rejection Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Rejection Details</h2>
            
            <div className="space-y-5">
              {/* Rejected Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Rejected Quantity <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableQuantity}
                  value={formData.rejected_quantity}
                  onChange={(e) => handleChange('rejected_quantity', e.target.value)}
                  placeholder="Enter rejected quantity"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.rejected_quantity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.rejected_quantity && (
                  <p className="mt-1 text-sm text-red-600">{errors.rejected_quantity}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Maximum available: {availableQuantity.toLocaleString()} units
                </p>
              </div>

              {/* Rejection Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Rejection Date <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="date"
                  value={formData.rejection_date}
                  onChange={(e) => handleChange('rejection_date', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Rejection Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Rejection Reason <span className="text-red-500">*</span>
                  </div>
                </label>
                <textarea
                  value={formData.rejection_reason}
                  onChange={(e) => handleChange('rejection_reason', e.target.value)}
                  rows={4}
                  placeholder="Provide detailed reason for client rejection (e.g., Print quality issues, Color mismatch, Damaged packaging, etc.)"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    errors.rejection_reason ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.rejection_reason && (
                  <p className="mt-1 text-sm text-red-600">{errors.rejection_reason}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Document specific quality issues identified by the client
                </p>
              </div>
            </div>
          </div>

          {/* Impact Summary */}
          {formData.rejected_quantity > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Impact Summary</h2>
              
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-orange-700 uppercase mb-1">Previous Rejected</p>
                    <p className="text-lg font-bold text-orange-900">{currentRejectedCount.toLocaleString()}</p>
                    <p className="text-xs text-orange-600 mt-1">
                      {subBox.quantity > 0 ? ((currentRejectedCount / subBox.quantity) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-orange-700 uppercase mb-1">New Rejection</p>
                    <p className="text-lg font-bold text-orange-900">
                      +{parseInt(formData.rejected_quantity || 0).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-orange-700 uppercase mb-1">New Total Rejected</p>
                    <p className="text-lg font-bold text-orange-900">{newRejectedTotal.toLocaleString()}</p>
                    <p className="text-xs text-orange-600 mt-1">
                      {newRejectedPercentage}% of total
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Record Rejection
            </button>
          </div>

          {/* Warning */}
          {/* <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-900">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-orange-800">
                  <li>This will update the existing sub-box record with client rejection data</li>
                  <li>Original production quantity remains unchanged</li>
                  <li>Rejected count is tracked separately for quality analysis</li>
                  <li>Multiple rejections can be recorded for the same sub-box</li>
                  <li>All rejection records are permanently stored for audit purposes</li>
                </ul>
              </div>
            </div>
          </div> */}
        </form>
      )
      }

      {/* Back Button if no available quantity */}
      {availableQuantity <= 0 && (
        <div className="flex justify-start">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Sub-Box List
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientRejection;
