import { useMemo, useState } from 'react';
import {
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit,
  FileText,
  Filter,
  Package,
  Plus,
  Receipt,
  Save,
  Search,
  Trash2,
  Truck,
  Users,
  Wifi,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { id: 'Rent', label: 'Rent', icon: Building, colorClasses: 'bg-blue-100 text-blue-600' },
  { id: 'Electricity', label: 'Electricity', icon: Zap, colorClasses: 'bg-yellow-100 text-yellow-600' },
  { id: 'Transport', label: 'Transport', icon: Truck, colorClasses: 'bg-green-100 text-green-600' },
  { id: 'WiFi/Internet', label: 'WiFi/Internet', icon: Wifi, colorClasses: 'bg-purple-100 text-purple-600' },
  { id: 'Salaries', label: 'Salaries', icon: Users, colorClasses: 'bg-red-100 text-red-600' },
  { id: 'Maintenance', label: 'Maintenance', icon: Wrench, colorClasses: 'bg-orange-100 text-orange-600' },
  { id: 'Raw Materials', label: 'Raw Materials', icon: Package, colorClasses: 'bg-indigo-100 text-indigo-600' },
  { id: 'Other', label: 'Other', icon: FileText, colorClasses: 'bg-gray-100 text-gray-600' },
];

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Credit Card', 'Cheque', 'Mobile Banking'];
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const createInitialFormData = () => ({
  category: 'Rent',
  description: '',
  date: new Date().toISOString().split('T')[0],
  total_amount: '',
  quantity: '',
  unit_price: '',
  payment_method: 'Cash',
  invoice_number: '',
  remarks: '',
});

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatAmount = (value) => `৳${(Number(value) || 0).toLocaleString()}`;

const generateLocalCostId = () => `local-cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getCategoryConfig = (categoryId) =>
  CATEGORY_OPTIONS.find((category) => category.id === categoryId) ||
  CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];

const ExpenseModal = ({ mode, formData, errors, onChange, onClose, onSubmit }) => {
  const modalTitle = mode === 'edit' ? 'Edit Expense' : 'Add New Expense';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{modalTitle}</h2>
            <p className="mt-1 text-sm text-gray-500">Track and save local operating expenses without leaving the page.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(event) => onChange('category', event.target.value)}
                className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 ${
                  errors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(event) => onChange('date', event.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 ${
                  errors.date ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(event) => onChange('description', event.target.value)}
              placeholder="e.g., Office rent for April 2026"
              className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg bg-white p-2 text-blue-600 shadow-sm">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Amount Entry</p>
                <p className="text-xs text-gray-500">Enter the total directly. Quantity and unit price are optional support details.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Total Amount (৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(event) => onChange('total_amount', event.target.value)}
                  placeholder="0.00"
                  className={`w-full rounded-lg border bg-white px-4 py-2 font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 ${
                    errors.total_amount ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.total_amount && <p className="mt-1 text-sm text-red-600">{errors.total_amount}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(event) => onChange('quantity', event.target.value)}
                  placeholder="Optional"
                  className={`w-full rounded-lg border bg-white px-4 py-2 focus:ring-2 focus:ring-blue-500 ${
                    errors.quantity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Unit Price (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(event) => onChange('unit_price', event.target.value)}
                  placeholder="Optional"
                  className={`w-full rounded-lg border bg-white px-4 py-2 focus:ring-2 focus:ring-blue-500 ${
                    errors.unit_price ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.unit_price && <p className="mt-1 text-sm text-red-600">{errors.unit_price}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(event) => onChange('payment_method', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Invoice Number</label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(event) => onChange('invoice_number', event.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(event) => onChange('remarks', event.target.value)}
              rows={3}
              placeholder="Additional notes..."
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <Save className="h-4 w-4" />
              {mode === 'edit' ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LocalCosts = ({ localCosts, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalMode, setModalMode] = useState(null);
  const [editingCost, setEditingCost] = useState(null);
  const [formData, setFormData] = useState(createInitialFormData);
  const [errors, setErrors] = useState({});

  const filteredCosts = useMemo(
    () =>
      localCosts.filter((cost) => {
        const matchesSearch =
          searchTerm === '' ||
          cost.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cost.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = categoryFilter === 'all' || cost.category === categoryFilter;
        const matchesDate = dateFilter === '' || cost.date === dateFilter;

        return matchesSearch && matchesCategory && matchesDate;
      }),
    [categoryFilter, dateFilter, localCosts, searchTerm]
  );

  const totalByCategory = useMemo(
    () =>
      CATEGORY_OPTIONS.map((category) => ({
        ...category,
        total: localCosts
          .filter((cost) => cost.category === category.id)
          .reduce((sum, cost) => sum + (cost.total_amount || 0), 0),
      })),
    [localCosts]
  );

  const grandTotal = useMemo(
    () => localCosts.reduce((sum, cost) => sum + (cost.total_amount || 0), 0),
    [localCosts]
  );

  const totalRecords = filteredCosts.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const paginatedCosts = filteredCosts.slice(startIndex, startIndex + pageSize);
  const showingFrom = totalRecords === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + pageSize, totalRecords);

  const openAddModal = () => {
    setModalMode('create');
    setEditingCost(null);
    setFormData(createInitialFormData());
    setErrors({});
  };

  const openEditModal = (cost) => {
    setModalMode('edit');
    setEditingCost(cost);
    setFormData({
      category: cost.category || 'Other',
      description: cost.description || '',
      date: cost.date || createInitialFormData().date,
      total_amount: cost.total_amount ?? '',
      quantity: cost.quantity ?? '',
      unit_price: cost.unit_price ?? '',
      payment_method: cost.payment_method || 'Cash',
      invoice_number: cost.invoice_number || '',
      remarks: cost.remarks || '',
    });
    setErrors({});
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingCost(null);
    setFormData(createInitialFormData());
    setErrors({});
  };

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      const nextQuantity = field === 'quantity' ? value : prev.quantity;
      const nextUnitPrice = field === 'unit_price' ? value : prev.unit_price;
      const quantity = toNumber(nextQuantity);
      const unitPrice = toNumber(nextUnitPrice);

      if (quantity !== null && unitPrice !== null) {
        next.total_amount = (quantity * unitPrice).toFixed(2);
      }

      return next;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    const quantity = toNumber(formData.quantity);
    const unitPrice = toNumber(formData.unit_price);
    const totalAmount = toNumber(formData.total_amount);

    if (!formData.category) nextErrors.category = 'Category is required';
    if (!formData.description.trim()) nextErrors.description = 'Description is required';
    if (!formData.date) nextErrors.date = 'Date is required';
    if (totalAmount === null || totalAmount <= 0) nextErrors.total_amount = 'Total amount must be greater than 0';
    if (quantity !== null && quantity <= 0) nextErrors.quantity = 'Quantity must be greater than 0';
    if (unitPrice !== null && unitPrice < 0) nextErrors.unit_price = 'Unit price cannot be negative';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    const now = new Date().toISOString();
    const quantity = toNumber(formData.quantity);
    const unitPrice = toNumber(formData.unit_price);
    const totalAmount = Number(formData.total_amount) || 0;

    const costData = {
      ...formData,
      id: editingCost?.id || generateLocalCostId(),
      quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      created_at: editingCost?.created_at || now,
      updated_at: now,
    };

    onSave(costData, modalMode === 'edit');
    closeModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Local Costs</h1>
          <p className="mt-1 text-sm text-gray-500">Track operational expenses and overhead costs</p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {totalByCategory.map((category) => {
          const Icon = category.icon;
          const percentage = grandTotal > 0 ? ((category.total / grandTotal) * 100).toFixed(1) : 0;

          return (
            <div key={category.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.colorClasses}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs text-gray-500">{percentage}%</span>
              </div>
              <p className="mb-0.5 text-xs text-gray-600">{category.label}</p>
              <p className="text-lg font-bold text-gray-900">৳{(category.total / 1000).toFixed(1)}K</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description or invoice..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {CATEGORY_OPTIONS.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(event) => {
              setDateFilter(event.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <p className="text-sm text-gray-500">
            Showing {showingFrom} to {showingTo} of {totalRecords}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
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
              {paginatedCosts.length > 0 ? (
                paginatedCosts.map((cost) => {
                  const category = getCategoryConfig(cost.category);
                  const Icon = category.icon;

                  return (
                    <tr key={cost.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-600">{new Date(cost.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-8 w-8 items-center justify-center rounded ${category.colorClasses}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-gray-900">{cost.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{cost.description}</p>
                        {cost.invoice_number && <p className="mt-0.5 text-xs text-gray-500">Invoice: {cost.invoice_number}</p>}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        {cost.quantity !== null && cost.quantity !== undefined && cost.quantity !== '' ? cost.quantity : '—'}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        {cost.unit_price !== null && cost.unit_price !== undefined && cost.unit_price !== ''
                          ? formatAmount(cost.unit_price)
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{formatAmount(cost.total_amount)}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">{cost.payment_method}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(cost)}
                            className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDelete?.(cost.id)}
                            className="rounded p-1 text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Receipt className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      {searchTerm || categoryFilter !== 'all' || dateFilter
                        ? 'No expenses found matching your filters'
                        : 'No expenses recorded yet'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalRecords > 0 && (
          <div className="flex flex-col gap-4 border-t border-gray-200 bg-white px-6 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              Page {safeCurrentPage} of {totalPages}
            </p>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">Records per page</label>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, index) => index + 1)
                    .slice(Math.max(0, safeCurrentPage - 3), Math.max(0, safeCurrentPage - 3) + 5)
                    .map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 w-9 rounded-lg border text-sm font-medium transition-colors ${
                          page === safeCurrentPage
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {modalMode && (
        <ExpenseModal
          mode={modalMode}
          formData={formData}
          errors={errors}
          onChange={handleChange}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default LocalCosts;
