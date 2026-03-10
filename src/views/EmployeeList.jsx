import { useState } from 'react';
import { Users, Plus, Search, Edit2, Phone, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';

const ROWS_PER_PAGE = 10;

// ── Confirmation Modal ────────────────────────────────────────────────────────
const ConfirmModal = ({ employee, onConfirm, onCancel }) => {
  const toStatus = employee.status === 'Active' ? 'Inactive' : 'Active';
  const isDeactivating = toStatus === 'Inactive';
  const initials = employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        
        {/* Colored top bar */}
        <div className={`h-1.5 w-full ${isDeactivating ? 'bg-orange-400' : 'bg-emerald-500'}`} />

        <div className="px-6 pt-5 pb-2">
          {/* Header row: icon + title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDeactivating ? 'bg-orange-100' : 'bg-emerald-100'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${isDeactivating ? 'text-orange-500' : 'text-emerald-600'}`} />
            </div>
            <div className="flex-1 pt-0.5">
              <h3 className="text-base font-bold text-gray-900">
                {isDeactivating ? 'Deactivate Employee?' : 'Activate Employee?'}
              </h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {isDeactivating
                  ? <>This will mark <span className="font-semibold text-gray-800">{employee.name}</span> as inactive and remove them from shift assignments.</>
                  : <>This will mark <span className="font-semibold text-gray-800">{employee.name}</span> as active and make them available for shifts.</>
                }
              </p>
            </div>
          </div>

          {/* Employee info strip */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100 mb-5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              isDeactivating ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{employee.name}</p>
              <p className="text-xs text-gray-400 font-mono">{employee.employee_id} · {employee.expertise}</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
              employee.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {employee.status}
            </span>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-colors ${
              isDeactivating
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isDeactivating ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const EmployeeList = ({ employees, onAddEmployee, onEditEmployee, onUpdateStatus, onNavigate }) => {
  const [searchTerm, setSearchTerm]         = useState('');
  const [statusFilter, setStatusFilter]     = useState('all');
  const [expertiseFilter, setExpertiseFilter] = useState('all');
  const [currentPage, setCurrentPage]       = useState(1);
  const [confirmEmployee, setConfirmEmployee] = useState(null); // employee pending toggle

  const expertiseOptions = [...new Set(employees.map(e => e.expertise))];

  const activeCount   = employees.filter(e => e.status === 'Active').length;
  const inactiveCount = employees.filter(e => e.status === 'Inactive').length;

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      searchTerm === '' ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.contact.includes(searchTerm);
    const matchesStatus    = statusFilter    === 'all' || emp.status    === statusFilter;
    const matchesExpertise = expertiseFilter === 'all' || emp.expertise === expertiseFilter;
    return matchesSearch && matchesStatus && matchesExpertise;
  });

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(filteredEmployees.length / ROWS_PER_PAGE));
  const safePage    = Math.min(currentPage, totalPages);
  const pageStart   = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows    = filteredEmployees.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setExpertiseFilter('all');
    setCurrentPage(1);
  };

  // Toggle confirm flow
  const handleToggleClick = (employee) => {
    setConfirmEmployee(employee);
  };

  const handleConfirmToggle = () => {
    if (!confirmEmployee) return;
    onUpdateStatus(confirmEmployee.id, confirmEmployee.status === 'Active' ? 'Inactive' : 'Active');
    setConfirmEmployee(null);
  };

  const expertiseBadge = (exp) => {
    const map = {
      Cutting:          'bg-blue-100 text-blue-800',
      Lamination:       'bg-purple-100 text-purple-800',
      Embedding:        'bg-orange-100 text-orange-800',
      'Production QC':  'bg-emerald-100 text-emerald-800',
    };
    return map[exp] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Total Employees {employees.length} &nbsp;·&nbsp; Active {activeCount} &nbsp;·&nbsp; Inactive {inactiveCount}
          </p>
        </div>
        <button
          onClick={onAddEmployee}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or contact..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <select
            className="w-full md:w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={statusFilter}
            onChange={handleFilterChange(setStatusFilter)}
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select
            className="w-full md:w-44 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={expertiseFilter}
            onChange={handleFilterChange(setExpertiseFilter)}
          >
            <option value="all">All Expertise</option>
            {expertiseOptions.map(exp => (
              <option key={exp} value={exp}>{exp}</option>
            ))}
          </select>
          {(searchTerm || statusFilter !== 'all' || expertiseFilter !== 'all') && (
            <button
              onClick={handleClear}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredEmployees.length > 0 ? (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Employee</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Expertise</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Added</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map(employee => {
                  const initials = employee.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  return (
                    <tr key={employee.id} className="hover:bg-gray-50 transition-colors">

                      {/* Name + avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            employee.status === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {initials}
                          </div>
                          <span className={`font-semibold ${employee.status === 'Active' ? 'text-gray-900' : 'text-gray-400'}`}>
                            {employee.name}
                          </span>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{employee.employee_id}</span>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm">{employee.contact}</span>
                        </div>
                      </td>

                      {/* Expertise */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${expertiseBadge(employee.expertise)}`}>
                          {employee.expertise}
                        </span>
                      </td>

                      {/* Added */}
                      <td className="px-5 py-3.5 text-sm text-gray-400">
                        {new Date(employee.created_at).toLocaleDateString()}
                      </td>

                      {/* Status — click triggers confirmation */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleClick(employee)}
                          className="inline-flex items-center gap-1.5 group"
                          title={`Click to ${employee.status === 'Active' ? 'deactivate' : 'activate'}`}
                        >
                          {employee.status === 'Active' ? (
                            <ToggleRight className="w-9 h-9 text-emerald-500 group-hover:text-emerald-600 transition-colors" />
                          ) : (
                            <ToggleLeft className="w-9 h-9 text-gray-300 group-hover:text-gray-400 transition-colors" />
                          )}
                          <span className={`text-xs font-medium ${employee.status === 'Active' ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {employee.status}
                          </span>
                        </button>
                      </td>

                      {/* Edit */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => onEditEmployee(employee)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Pagination footer ──────────────────────────────────────── */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              {/* Count label */}
              <p className="text-xs text-gray-400">
                Showing <span className="font-semibold text-gray-600">{pageStart + 1}–{Math.min(pageStart + ROWS_PER_PAGE, filteredEmployees.length)}</span>{' '}
                of <span className="font-semibold text-gray-600">{filteredEmployees.length}</span> employees
              </p>

              {/* Page controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page number pills */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '…' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`min-w-[30px] h-[30px] px-2 rounded-lg text-xs font-semibold border transition-colors ${
                          safePage === item
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400 mb-1">
              {searchTerm || statusFilter !== 'all' || expertiseFilter !== 'all'
                ? 'No employees match your filters'
                : 'No employees registered yet'}
            </p>
            {!searchTerm && statusFilter === 'all' && expertiseFilter === 'all' && (
              <button
                onClick={onAddEmployee}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Employee
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Confirmation modal ─────────────────────────────────────────────── */}
      {confirmEmployee && (
        <ConfirmModal
          employee={confirmEmployee}
          onConfirm={handleConfirmToggle}
          onCancel={() => setConfirmEmployee(null)}
        />
      )}
    </div>
  );
};

export default EmployeeList;