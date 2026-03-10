import { useState } from 'react';
import { 
  Plus, Search, Filter, Edit, Trash2, Calendar, DollarSign,
  Building, Zap, Truck, Wifi, Users, Wrench, Package, FileText,
  Save, X, Receipt
} from 'lucide-react';

const LocalCosts = ({ localCosts, onSave, onDelete, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [editingCost, setEditingCost] = useState(null);

  // Categories with icons
  const categories = [
    { id: 'Rent', label: 'Rent', icon: Building, color: 'blue' },
    { id: 'Electricity', label: 'Electricity', icon: Zap, color: 'yellow' },
    { id: 'Transport', label: 'Transport', icon: Truck, color: 'green' },
    { id: 'WiFi/Internet', label: 'WiFi/Internet', icon: Wifi, color: 'purple' },
    { id: 'Salaries', label: 'Salaries', icon: Users, color: 'red' },
    { id: 'Maintenance', label: 'Maintenance', icon: Wrench, color: 'orange' },
    { id: 'Raw Materials', label: 'Raw Materials', icon: Package, color: 'indigo' },
    { id: 'Other', label: 'Other', icon: FileText, color: 'gray' }
  ];

  // Initial form data
  const initialFormData = {
    category: 'Rent',
    description: '',
    date: new Date().toISOString().split('T')[0],
    quantity: 1,
    unit_price: 0,
    total_amount: 0,
    payment_method: 'Cash',
    invoice_number: '',
    remarks: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  // Filter costs
  const filteredCosts = localCosts.filter(cost => {
    const matchesSearch = searchTerm === '' || 
      cost.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cost.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || cost.category === categoryFilter;
    const matchesDate = dateFilter === '' || cost.date === dateFilter;

    return matchesSearch && matchesCategory && matchesDate;
  });

  // Calculate totals
  const totalByCategory = categories.map(cat => ({
    ...cat,
    total: localCosts
      .filter(c => c.category === cat.id)
      .reduce((sum, c) => sum + (c.total_amount || 0), 0)
  }));

  const grandTotal = localCosts.reduce((sum, c) => sum + (c.total_amount || 0), 0);

  // Handle form change
  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    
    // Auto-calculate total_amount
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : formData.quantity;
      const price = field === 'unit_price' ? parseFloat(value) || 0 : formData.unit_price;
      updated.total_amount = qty * price;
    }
    
    setFormData(updated);
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (formData.unit_price < 0) {
      newErrors.unit_price = 'Unit price cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      const costData = {
        ...formData,
        id: editingCost?.id || Date.now(),
        created_at: editingCost?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onSave(costData, editingCost !== null);
      handleCancel();
    }
  };

  // Handle edit
  const handleEdit = (cost) => {
    setFormData(cost);
    setEditingCost(cost);
    setIsAddingCost(true);
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData(initialFormData);
    setEditingCost(null);
    setIsAddingCost(false);
    setErrors({});
  };

  // Get category config
  const getCategoryConfig = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category || categories[categories.length - 1]; // Default to 'Other'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Local Costs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track operational expenses and overhead costs
          </p>
        </div>
        
        {!isAddingCost && (
          <button
            onClick={() => setIsAddingCost(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        )}
      </div>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {totalByCategory.map(cat => {
          const Icon = cat.icon;
          const percentage = grandTotal > 0 ? ((cat.total / grandTotal) * 100).toFixed(1) : 0;
          
          return (
            <div key={cat.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 bg-${cat.color}-100 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${cat.color}-600`} />
                </div>
                <span className="text-xs text-gray-500">{percentage}%</span>
              </div>
              <p className="text-xs text-gray-600 mb-0.5">{cat.label}</p>
              <p className="text-lg font-bold text-gray-900">
                ৳{(cat.total / 1000).toFixed(1)}K
              </p>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Form */}
      {isAddingCost && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingCost ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="e.g., Office rent for February 2026"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.quantity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
              </div>

              {/* Unit Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Price (৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => handleChange('unit_price', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.unit_price ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.unit_price && <p className="mt-1 text-sm text-red-600">{errors.unit_price}</p>}
              </div>

              {/* Total Amount (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount (৳)
                </label>
                <input
                  type="text"
                  value={formData.total_amount.toLocaleString()}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 bg-gray-50 rounded-lg font-bold text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => handleChange('payment_method', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Mobile Banking">Mobile Banking</option>
                </select>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => handleChange('invoice_number', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={3}
                placeholder="Additional notes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                {editingCost ? 'Update Expense' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description or invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Costs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Description</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Unit Price</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Payment</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCosts.length > 0 ? (
                filteredCosts.map(cost => {
                  const catConfig = getCategoryConfig(cost.category);
                  const Icon = catConfig.icon;
                  
                  return (
                    <tr key={cost.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(cost.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 bg-${catConfig.color}-100 rounded flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 text-${catConfig.color}-600`} />
                          </div>
                          <span className="font-medium text-gray-900">{cost.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{cost.description}</p>
                        {cost.invoice_number && (
                          <p className="text-xs text-gray-500 mt-0.5">Invoice: {cost.invoice_number}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        {cost.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        ৳{cost.unit_price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        ৳{cost.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {cost.payment_method}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(cost)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete && onDelete(cost.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      {searchTerm || categoryFilter !== 'all' || dateFilter
                        ? 'No expenses found matching your filters'
                        : 'No expenses recorded yet'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredCosts.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-right font-bold text-gray-900">
                    TOTAL:
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-green-900 text-lg">
                    ৳{filteredCosts.reduce((sum, c) => sum + c.total_amount, 0).toLocaleString()}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default LocalCosts;