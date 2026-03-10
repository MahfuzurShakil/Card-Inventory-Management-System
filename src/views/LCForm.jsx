import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, FileText, DollarSign, Shield, 
  Upload, Calendar, Building2
} from 'lucide-react';

const LCForm = ({ lc, onSave, onBack }) => {
  const isEditMode = !!(lc && lc.id);

  const [formData, setFormData] = useState({
    lc_number: '',
    lc_issue_date: '',
    bank_name: '',
    lc_value_foreign: '',
    lc_currency: 'USD',
    lc_value_bdt: '',
    exchange_rate: '',
    
    pi_number: '',
    pi_date: '',
    
    insurance_bill_amount: '',
    cover_note_number: '',
    insurance_issue_date: '',
    insurance_company_name: '',
    
    quantity: '',
    item_description: '',
    
    status: 'Active', 
    files: {
      lc_doc: null,
      pi_doc: null,
      insurance_doc: null
    }
  });

  useEffect(() => {
    if (isEditMode && lc) {
      setFormData(prev => ({
        ...prev,
        lc_number: lc.lc_number || '',
        lc_issue_date: lc.lc_issue_date || '',
        bank_name: lc.bank_name || '',
        lc_value_foreign: lc.lc_value_foreign || '',
        lc_currency: lc.lc_currency || 'USD',
        lc_value_bdt: lc.lc_value_bdt || '',
        exchange_rate: lc.exchange_rate || '',
        pi_number: lc.pi_number || '',
        pi_date: lc.pi_date || '',
        insurance_bill_amount: lc.insurance_bill_amount || '',
        cover_note_number: lc.cover_note_number || '',
        insurance_issue_date: lc.insurance_issue_date || '',
        insurance_company_name: lc.insurance_company_name || '',
        quantity: lc.quantity || '',
        item_description: lc.item_description || '',
        status: lc.status || 'Active',
        files: { lc_doc: null, pi_doc: null, insurance_doc: null } 
      }));
    }
  }, [lc, isEditMode]);

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

  // const handleSubmit = (e) => {
  //   e.preventDefault();
    
  //   // Prepare data for saving
  //   const lcData = {
  //     ...formData,
  //     // Convert string numbers to actual numbers
  //     lc_value_foreign: parseFloat(formData.lc_value_foreign) || 0,
  //     lc_value_bdt: parseFloat(formData.lc_value_bdt) || 0,
  //     exchange_rate: parseFloat(formData.exchange_rate) || 0,
  //     insurance_bill_amount: parseFloat(formData.insurance_bill_amount) || 0,
  //     quantity: parseInt(formData.quantity) || 0,
  //     // Keep file references
  //     lc_doc: formData.files.lc_doc?.name || null,
  //     pi_doc: formData.files.pi_doc?.name || null,
  //     insurance_doc: formData.files.insurance_doc?.name || null,
  //     // Add shipments array if creating new LC
  //     ...(!isEditMode && { shipments: [] })
  //   };
    
  //   // Remove the files object from the data (we've already extracted file names)
  //   delete lcData.files;
    
  //   onSave(lcData);
  // };
  const handleSubmit = (e) => {
  e.preventDefault();
  
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
  };
  
  onSave(lcData);  // THIS LINE IS CRITICAL
};

  return (
    <div className="space-y-6">
      {/* Header - Matches other pages */}
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
        
        {/* Status Badge */}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LC Number <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="lc_number" 
                  value={formData.lc_number} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="e.g. LC-2024-001" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LC Issue Date <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  name="lc_issue_date" 
                  value={formData.lc_issue_date} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="bank_name" 
                  value={formData.bank_name} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="e.g. HSBC Bangladesh" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LC Currency <span className="text-red-500">*</span>
                </label>
                <select 
                  name="lc_currency" 
                  value={formData.lc_currency} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CNY">CNY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LC Value (Foreign) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input 
                    type="number" 
                    name="lc_value_foreign" 
                    value={formData.lc_value_foreign} 
                    onChange={handleInputChange} 
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="0.00" 
                    step="0.01"
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exchange Rate
                </label>
                <input 
                  type="number" 
                  name="exchange_rate" 
                  value={formData.exchange_rate} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="0.00" 
                  step="0.01"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LC Value (BDT) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                  <input 
                    type="number" 
                    name="lc_value_bdt" 
                    value={formData.lc_value_bdt} 
                    onChange={handleInputChange} 
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50" 
                    placeholder="0.00" 
                    step="0.01"
                    required 
                  />
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
                <input 
                  type="text" 
                  name="pi_number" 
                  value={formData.pi_number} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="e.g. PI-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PI Date</label>
                <input 
                  type="date" 
                  name="pi_date" 
                  value={formData.pi_date} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
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
                <input 
                  type="text" 
                  name="insurance_company_name" 
                  value={formData.insurance_company_name} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="e.g. Sadharan Bima Corporation"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cover Note Number</label>
                <input 
                  type="text" 
                  name="cover_note_number" 
                  value={formData.cover_note_number} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="e.g. CN-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Bill Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">৳</span>
                  <input 
                    type="number" 
                    name="insurance_bill_amount" 
                    value={formData.insurance_bill_amount} 
                    onChange={handleInputChange} 
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Issue Date</label>
                <input 
                  type="date" 
                  name="insurance_issue_date" 
                  value={formData.insurance_issue_date} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  name="quantity" 
                  value={formData.quantity} 
                  onChange={handleInputChange} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="0"
                  required 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Description <span className="text-red-500">*</span>
                </label>
                <textarea 
                  name="item_description" 
                  value={formData.item_description} 
                  onChange={handleInputChange} 
                  rows="3" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" 
                  placeholder="Enter detailed description of goods..."
                  required
                ></textarea>
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
                <input 
                  type="file" 
                  id="lc_doc" 
                  className="hidden" 
                  onChange={(e) => handleFileChange('lc_doc', e.target.files[0])} 
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label htmlFor="lc_doc" className="cursor-pointer">
                  <FileText className="w-10 h-10 text-gray-400 mb-3 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 mb-1">LC Document</p>
                  <p className="text-xs text-gray-500">
                    {formData.files.lc_doc ? formData.files.lc_doc.name : 'Click to upload PDF/Image'}
                  </p>
                </label>
              </div>

              {/* PI Document */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 hover:bg-purple-50 transition-all cursor-pointer">
                <input 
                  type="file" 
                  id="pi_doc" 
                  className="hidden" 
                  onChange={(e) => handleFileChange('pi_doc', e.target.files[0])} 
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label htmlFor="pi_doc" className="cursor-pointer">
                  <DollarSign className="w-10 h-10 text-gray-400 mb-3 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 mb-1">PI Document</p>
                  <p className="text-xs text-gray-500">
                    {formData.files.pi_doc ? formData.files.pi_doc.name : 'Click to upload PDF/Image'}
                  </p>
                </label>
              </div>

              {/* Insurance Document */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer">
                <input 
                  type="file" 
                  id="insurance_doc" 
                  className="hidden" 
                  onChange={(e) => handleFileChange('insurance_doc', e.target.files[0])} 
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label htmlFor="insurance_doc" className="cursor-pointer">
                  <Shield className="w-10 h-10 text-gray-400 mb-3 mx-auto" />
                  <p className="text-sm font-medium text-gray-900 mb-1">Insurance & Bill</p>
                  <p className="text-xs text-gray-500">
                    {formData.files.insurance_doc ? formData.files.insurance_doc.name : 'Click to upload PDF/Image'}
                  </p>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <button 
            type="button" 
            onClick={onBack} 
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Save className="w-4 h-4" />
            {isEditMode ? 'Update LC' : 'Create LC'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LCForm;
