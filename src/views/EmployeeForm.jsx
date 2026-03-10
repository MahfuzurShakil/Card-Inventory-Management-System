import { useState } from 'react';
import { ChevronRight, Save, User, Phone, Award, CheckCircle, Hash } from 'lucide-react';

const EmployeeForm = ({ employee, onSave, onBack }) => {
  const isEditMode = !!employee;

  const [formData, setFormData] = useState({
    employee_id: employee?.employee_id || '',
    name:        employee?.name        || '',
    contact:     employee?.contact     || '',
    expertise:   employee?.expertise   || '',
    status:      employee?.status      || 'Active'
  });

  const [errors, setErrors] = useState({});

  // Factory's 4 employee types
  const expertiseOptions = [
    {
      value: 'Cutting',
      label: 'Cutting',
      desc: 'Card cutting and sizing',
      color: 'bg-blue-100 text-blue-800',
      dot: 'bg-blue-500',
      selectedBorder: 'border-blue-500 bg-blue-50',
      check: 'text-blue-500',
    },
    {
      value: 'Lamination',
      label: 'Lamination',
      desc: 'Surface lamination process',
      color: 'bg-purple-100 text-purple-800',
      dot: 'bg-purple-500',
      selectedBorder: 'border-purple-500 bg-purple-50',
      check: 'text-purple-500',
    },
    {
      value: 'Embedding',
      label: 'Embedding',
      desc: 'Chip embedding and bonding',
      color: 'bg-orange-100 text-orange-800',
      dot: 'bg-orange-500',
      selectedBorder: 'border-orange-500 bg-orange-50',
      check: 'text-orange-500',
    },
    {
      value: 'Production QC',
      label: 'Production QC',
      desc: 'Quality control & inspection',
      color: 'bg-emerald-100 text-emerald-800',
      dot: 'bg-emerald-500',
      selectedBorder: 'border-emerald-500 bg-emerald-50',
      check: 'text-emerald-500',
    },
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!isEditMode && !formData.employee_id.trim())
      newErrors.employee_id = 'Employee ID is required';

    if (!formData.name.trim())
      newErrors.name = 'Employee name is required';

    if (!formData.contact.trim())
      newErrors.contact = 'Contact number is required';
    else if (!/^01[3-9]\d{8}$/.test(formData.contact.replace(/\s/g, '')))
      newErrors.contact = 'Enter a valid BD mobile number (e.g. 01712345678)';

    if (!formData.expertise)
      newErrors.expertise = 'Please select a role';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) onSave(formData);
  };

  const selectedExpertise = expertiseOptions.find(o => o.value === formData.expertise);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEditMode ? 'Edit Employee' : 'Add New Employee'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isEditMode
              ? `Updating details for ${employee.employee_id}`
              : 'Register a new employee in the system'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: form fields ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">

            {/* Personal Information */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Personal Information
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Employee ID — only in add mode (editable), locked in edit mode */}
                {!isEditMode ? (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Employee ID <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.employee_id}
                      onChange={e => handleChange('employee_id', e.target.value)}
                      placeholder="e.g. EMP-001"
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-mono bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                        errors.employee_id ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {errors.employee_id
                      ? <p className="mt-1 text-xs text-red-500">{errors.employee_id}</p>
                      : <p className="mt-1 text-xs text-gray-400">Must be unique across all employees</p>
                    }
                  </div>
                ) : (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Employee ID
                    </label>
                    <div className="px-3 py-2 border border-gray-100 rounded-lg bg-gray-50 font-mono text-sm text-gray-500 select-none">
                      {employee.employee_id}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">Employee ID cannot be changed</p>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <User className="w-3.5 h-3.5" />
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="e.g. Mohammad Rahman"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Contact */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    Contact Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.contact}
                    onChange={e => handleChange('contact', e.target.value)}
                    placeholder="01712345678"
                    className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all ${
                      errors.contact ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {errors.contact
                    ? <p className="mt-1 text-xs text-red-500">{errors.contact}</p>
                    : <p className="mt-1 text-xs text-gray-400">Bangladesh mobile number — 11 digits starting with 01</p>
                  }
                </div>
              </div>
            </div>

            {/* Role / Expertise */}
            <div className="p-5">
              <div className="flex items-center gap-1.5 mb-3">
                <Award className="w-3.5 h-3.5 text-gray-400" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Factory Role <span className="text-red-400">*</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {expertiseOptions.map(opt => {
                  const selected = formData.expertise === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange('expertise', opt.value)}
                      className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        selected ? opt.selectedBorder : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${selected ? opt.dot : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${selected ? 'text-gray-900' : 'text-gray-700'}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                      </div>
                      {selected && <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${opt.check}`} />}
                    </button>
                  );
                })}
              </div>
              {errors.expertise && <p className="mt-2 text-xs text-red-500">{errors.expertise}</p>}
            </div>

            {/* Status — edit mode only */}
            {isEditMode && (
              <div className="p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Employment Status</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { s: 'Active',   border: 'border-emerald-500 bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-900', check: 'text-emerald-500' },
                    { s: 'Inactive', border: 'border-gray-400 bg-gray-50',       dot: 'bg-gray-400',    text: 'text-gray-700',    check: 'text-gray-400'   },
                  ].map(({ s, border, dot, text, check }) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleChange('status', s)}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        formData.status === s ? border : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${formData.status === s ? dot : 'bg-gray-200'}`} />
                      <span className={`text-sm font-semibold flex-1 ${formData.status === s ? text : 'text-gray-500'}`}>{s}</span>
                      {formData.status === s && <CheckCircle className={`w-4 h-4 flex-shrink-0 ${check}`} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: preview + actions ──────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Live preview card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Preview</p>

              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-2 border-2 border-blue-200">
                  <span className="text-xl font-bold text-blue-700">
                    {formData.name
                      ? formData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      : '?'}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {formData.name || <span className="text-gray-300 font-normal">Name not set</span>}
                </p>
                <p className="text-xs font-mono text-gray-400 mt-0.5">
                  {formData.employee_id || (isEditMode ? employee.employee_id : <span className="italic">ID not set</span>)}
                </p>
              </div>

              {/* Detail rows */}
              <div className="space-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Contact</span>
                  <span className="text-xs font-semibold text-gray-800">{formData.contact || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Role</span>
                  {selectedExpertise ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selectedExpertise.color}`}>
                      {selectedExpertise.label}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">Not selected</span>
                  )}
                </div>
                {isEditMode && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Status</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      formData.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {formData.status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Hint */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">Note:</span> Fields marked <span className="text-red-500 font-bold">*</span> are required.
                {!isEditMode && ' Employee ID must be unique and cannot be changed later.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                {isEditMode ? 'Update Employee' : 'Create Employee'}
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;