import { useState } from 'react';
import { ChevronRight, Save, Package, Hash, Barcode, Plus, X, AlertCircle } from 'lucide-react';
import { createMaterialBarcode } from '../utils/barcode';

const BoxCreation = ({ inboundMaterials, onSave, onBack }) => {
  const [selectedInbound, setSelectedInbound] = useState('');
  const [boxes, setBoxes] = useState([]);
  const [errors, setErrors] = useState({});

  // Get selected inbound material details
  const inboundRecord = inboundMaterials.find(im => im.id === parseInt(selectedInbound));

  // Calculate total boxes quantity
  const totalBoxesQuantity = boxes.reduce((sum, box) => sum + (box.quantity || 0), 0);
  const receivedQuantity = inboundRecord ? 
    (inboundRecord.total_quantity || 0) - (inboundRecord.missing_quantity || 0) : 0;
  const remainingQuantity = receivedQuantity - totalBoxesQuantity;

  // Add a new box row
  const handleAddBox = () => {
    setBoxes([...boxes, {
      id: Date.now(),
      box_name: '',
      item_name: '',
      quantity: 0
    }]);
  };

  // Remove a box row
  const handleRemoveBox = (boxId) => {
    setBoxes(boxes.filter(box => box.id !== boxId));
  };

  // Update box data
  const handleBoxChange = (boxId, field, value) => {
    setBoxes(boxes.map(box => 
      box.id === boxId ? { ...box, [field]: value } : box
    ));
    // Clear errors for this box
    if (errors[`box_${boxId}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`box_${boxId}_${field}`];
        return newErrors;
      });
    }
  };

  // Auto-populate boxes based on inbound quantity
  const handleAutoPopulate = () => {
    if (!inboundRecord) return;

    const suggestedBoxCount = Math.ceil(receivedQuantity / 1000); // Assume 1000 units per box
    const quantityPerBox = Math.floor(receivedQuantity / suggestedBoxCount);
    const remainder = receivedQuantity % suggestedBoxCount;

    const autoBoxes = [];
    for (let i = 0; i < suggestedBoxCount; i++) {
      autoBoxes.push({
        id: Date.now() + i,
        box_name: `BOX-${String(i + 1).padStart(3, '0')}`,
        item_name: inboundRecord.item_description || 'Playing Cards',
        quantity: i === suggestedBoxCount - 1 ? quantityPerBox + remainder : quantityPerBox
      });
    }

    setBoxes(autoBoxes);
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!selectedInbound) {
      newErrors.selectedInbound = 'Please select an inbound material record';
    }

    if (boxes.length === 0) {
      newErrors.boxes = 'Please add at least one box';
    }

    boxes.forEach(box => {
      if (!box.box_name.trim()) {
        newErrors[`box_${box.id}_box_name`] = 'Required';
      }
      if (!box.item_name.trim()) {
        newErrors[`box_${box.id}_item_name`] = 'Required';
      }
      if (!box.quantity || box.quantity <= 0) {
        newErrors[`box_${box.id}_quantity`] = 'Must be > 0';
      }
    });

    if (totalBoxesQuantity !== receivedQuantity) {
      newErrors.totalMismatch = `Total boxes quantity (${totalBoxesQuantity}) must equal received quantity (${receivedQuantity})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const batchDate = new Date();
      const boxesData = boxes.map((box, index) => ({
        inbound_material_id: parseInt(selectedInbound),
        shipment_id: inboundRecord.shipment_id,
        shipment_number: inboundRecord.shipment_number,
        box_name: box.box_name,
        item_name: box.item_name,
        quantity: box.quantity,
        barcode: createMaterialBarcode(index + 1, batchDate),
        csv_file_name: inboundRecord.csv_file_name,
        status: 'Material In Stock',
        created_by: 'Store Keeper', // In real app, get from auth context
        created_at: new Date().toISOString()
      }));

      onSave(boxesData);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Create Boxes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Break down inbound materials into individual trackable boxes
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Select Inbound Material */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Inbound Material</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inbound Material Record <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedInbound}
              onChange={(e) => {
                setSelectedInbound(e.target.value);
                setBoxes([]); // Reset boxes when changing inbound material
                setErrors({});
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.selectedInbound ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select an inbound material...</option>
              {inboundMaterials.map(im => (
                <option key={im.id} value={im.id}>
                  {im.shipment_number} - {im.item_description} - {((im.total_quantity || 0) - (im.missing_quantity || 0)).toLocaleString()} units
                </option>
              ))}
            </select>
            {errors.selectedInbound && (
              <p className="mt-1 text-sm text-red-600">{errors.selectedInbound}</p>
            )}
          </div>

          {/* Inbound Material Summary */}
          {inboundRecord && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-medium text-blue-700 uppercase">Shipment</p>
                  <p className="text-sm font-semibold text-blue-900">{inboundRecord.shipment_number}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700 uppercase">CSV File</p>
                  <p className="text-sm font-semibold text-blue-900 truncate" title={inboundRecord.csv_file_name}>
                    {inboundRecord.csv_file_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700 uppercase">Total Received</p>
                  <p className="text-sm font-semibold text-blue-900">{receivedQuantity.toLocaleString()} units</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-700 uppercase">Item</p>
                  <p className="text-sm font-semibold text-blue-900 truncate">{inboundRecord.item_description}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Box Creation Section */}
        {selectedInbound && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Define Boxes</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAutoPopulate}
                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Auto-Populate
                </button>
                <button
                  type="button"
                  onClick={handleAddBox}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Box
                </button>
              </div>
            </div>

            {errors.boxes && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {errors.boxes}
              </div>
            )}

            {/* Boxes Table */}
            {boxes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Box Name <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Item Name <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                        Quantity <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {boxes.map((box, index) => (
                      <tr key={box.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 font-medium">{index + 1}</td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={box.box_name}
                            onChange={(e) => handleBoxChange(box.id, 'box_name', e.target.value)}
                            placeholder="e.g., BOX-001"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors[`box_${box.id}_box_name`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                          {errors[`box_${box.id}_box_name`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`box_${box.id}_box_name`]}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={box.item_name}
                            onChange={(e) => handleBoxChange(box.id, 'item_name', e.target.value)}
                            placeholder="e.g., Playing Cards"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors[`box_${box.id}_item_name`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                          {errors[`box_${box.id}_item_name`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`box_${box.id}_item_name`]}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            value={box.quantity}
                            onChange={(e) => handleBoxChange(box.id, 'quantity', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors[`box_${box.id}_quantity`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                          {errors[`box_${box.id}_quantity`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`box_${box.id}_quantity`]}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveBox(box.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove Box"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan="3" className="px-4 py-3 text-right font-semibold text-gray-900">
                        Total Boxes Quantity:
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-lg ${
                          totalBoxesQuantity === receivedQuantity 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {totalBoxesQuantity.toLocaleString()}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No boxes added yet. Click "Add Box" or "Auto-Populate" to start.</p>
              </div>
            )}

            {/* Quantity Summary */}
            {boxes.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-blue-700 uppercase">Received Quantity</p>
                  <p className="text-2xl font-bold text-blue-900">{receivedQuantity.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-purple-700 uppercase">Total Boxes</p>
                  <p className="text-2xl font-bold text-purple-900">{boxes.length}</p>
                </div>
                <div className={`rounded-lg p-4 ${
                  remainingQuantity === 0 ? 'bg-green-50' : 'bg-orange-50'
                }`}>
                  <p className={`text-xs font-medium uppercase ${
                    remainingQuantity === 0 ? 'text-green-700' : 'text-orange-700'
                  }`}>
                    Remaining
                  </p>
                  <p className={`text-2xl font-bold ${
                    remainingQuantity === 0 ? 'text-green-900' : 'text-orange-900'
                  }`}>
                    {remainingQuantity.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {errors.totalMismatch && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{errors.totalMismatch}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {selectedInbound && (
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
              disabled={boxes.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Create {boxes.length} Box{boxes.length !== 1 ? 'es' : ''}
            </button>
          </div>
        )}

        {/* Info Box */}
        {selectedInbound && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Barcode className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">After Creating Boxes:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Each box will receive a unique barcode for tracking</li>
                  <li>Boxes will be created with status "Material In Stock"</li>
                  <li>Barcodes will be linked to the CSV file for full traceability</li>
                  <li>Next step: Print barcode labels and attach to physical boxes</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default BoxCreation;
