import { useState, useEffect, useRef } from 'react';
import {
  ChevronRight, Calendar, Clock, Save, X, Users, Scissors,
  Layers as LayersIcon, Package, CheckCircle, Table,
  Search, UserPlus, LayoutGrid, Trash2
} from 'lucide-react';

// ── Multi-select Employee Picker Modal ────────────────────────────────────────
const EmployeePicker = ({ segmentName, segmentColor, availableEmployees, onConfirm, onClose }) => {
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState([]);
  const inputRef                = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const filtered    = availableEmployees.filter(emp =>
    emp.name.toLowerCase().includes(query.toLowerCase()) ||
    (emp.employee_id || '').toLowerCase().includes(query.toLowerCase())
  );
  const toggle      = (emp) => setSelected(prev => prev.find(e => e.id === emp.id) ? prev.filter(e => e.id !== emp.id) : [...prev, emp]);
  const selectAll   = () => setSelected([...filtered]);
  const clearAll    = () => setSelected([]);
  const allSelected = filtered.length > 0 && filtered.every(e => selected.find(s => s.id === e.id));

  const headerBg  = { blue: 'bg-blue-50 border-b border-blue-100', purple: 'bg-purple-50 border-b border-purple-100', orange: 'bg-orange-50 border-b border-orange-100', green: 'bg-emerald-50 border-b border-emerald-100' }[segmentColor] || 'bg-blue-50 border-b border-blue-100';
  const headerText = { blue: 'text-blue-800', purple: 'text-purple-800', orange: 'text-orange-700', green: 'text-emerald-800' }[segmentColor] || 'text-blue-800';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className={`${headerBg} px-5 py-4 flex items-center justify-between`}>
          <div>
            <h3 className={`text-base font-bold ${headerText}`}>Add Employees</h3>
            <p className={`text-xs mt-0.5 ${headerText} opacity-60`}>Assigning to {segmentName}</p>
          </div>
          <button onClick={onClose} className={`p-1.5 ${headerText} opacity-50 hover:opacity-100 hover:bg-black/5 rounded-lg transition-colors`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + select-all */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or ID…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={allSelected} onChange={() => allSelected ? clearAll() : selectAll()} className="w-3.5 h-3.5 rounded" />
              {allSelected ? 'Deselect all' : `Select all (${filtered.length})`}
            </label>
            {selected.length > 0 && <span className="text-xs font-semibold text-blue-600">{selected.length} selected</span>}
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto">
          {availableEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Users className="w-10 h-10 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400 font-medium">All active employees are already assigned</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No employees match "{query}"</p>
          ) : (
            filtered.map(emp => {
              const isSelected = !!selected.find(e => e.id === emp.id);
              const initials   = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              return (
                <label
                  key={emp.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <input type="checkbox" checked={isSelected} onChange={() => toggle(emp)} className="w-4 h-4 rounded flex-shrink-0" />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.employee_id} · {emp.expertise}</p>
                  </div>
                  {isSelected && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (selected.length > 0) { onConfirm(selected); onClose(); } }}
            disabled={selected.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add {selected.length > 0 ? `${selected.length} ` : ''}Employee{selected.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ShiftAssignment = ({ employees, productionAssignments, onSaveAssignments, onBack, initialDate, initialShift }) => {
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate]           = useState(initialDate || today);
  const [selectedShift, setSelectedShift]         = useState(initialShift || 'Day');
  const [assignments, setAssignments]             = useState({ Cutting: [], Lamination: [], Embedding: [], 'Production QC': [] });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewMode, setViewMode]                   = useState('assign');
  const [pickerSegment, setPickerSegment]         = useState(null);

  const workSegments = [
    { id: 'Cutting',       name: 'Cutting',       icon: Scissors,    color: 'blue'   },
    { id: 'Lamination',    name: 'Lamination',    icon: LayersIcon,  color: 'purple' },
    { id: 'Embedding',     name: 'Embedding',     icon: Package,     color: 'orange' },
    { id: 'Production QC', name: 'Production QC', icon: CheckCircle, color: 'green'  },
  ];

  // Segment header colors — light pastel backgrounds with colored text
  const headerBg = { blue: 'bg-blue-50 border-b border-blue-100', purple: 'bg-purple-50 border-b border-purple-100', orange: 'bg-orange-50 border-b border-orange-100', green: 'bg-emerald-50 border-b border-emerald-100' };
  const headerText = { blue: 'text-blue-800', purple: 'text-purple-800', orange: 'text-orange-700', green: 'text-emerald-800' };
  const headerIcon = { blue: 'bg-blue-100 text-blue-600', purple: 'bg-purple-100 text-purple-600', orange: 'bg-orange-100 text-orange-600', green: 'bg-emerald-100 text-emerald-600' };
  const emptyState = {
    blue:   { border: 'border-blue-200',   icon: 'text-blue-400'   },
    purple: { border: 'border-purple-200', icon: 'text-purple-400' },
    orange: { border: 'border-orange-200', icon: 'text-orange-400' },
    green:  { border: 'border-emerald-200',icon: 'text-emerald-400'},
  };

  // Overview segment pills
  const segPill = {
    blue:   'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
    green:  'bg-emerald-100 text-emerald-800',
  };

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadExistingAssignments = () => {
    if (!Array.isArray(productionAssignments)) {
      setAssignments({ Cutting: [], Lamination: [], Embedding: [], 'Production QC': [] });
      return;
    }
    const existing = productionAssignments.filter(a => a.assignment_date === selectedDate && a.shift === selectedShift);
    const grouped  = { Cutting: [], Lamination: [], Embedding: [], 'Production QC': [] };
    existing.forEach(a => {
      const emp = employees.find(e => e.id === a.employee_id);
      if (emp && emp.status === 'Active') {
        if (!grouped[a.work_segment]) grouped[a.work_segment] = [];
        grouped[a.work_segment].push(emp);
      }
    });
    setAssignments(grouped);
    setHasUnsavedChanges(false);
  };

  useEffect(() => { loadExistingAssignments(); }, [selectedDate, selectedShift, productionAssignments]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDateShiftChange = (date, shift) => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Discard them?')) return;
    if (date  !== null) setSelectedDate(date);
    if (shift !== null) setSelectedShift(shift);
  };

  const getAvailableEmployees = () => {
    const assigned = new Set(Object.values(assignments).flat().map(e => e.id));
    return employees.filter(emp => emp.status === 'Active' && !assigned.has(emp.id));
  };

  const handleAddEmployees = (segmentId, newEmps) => {
    setAssignments(prev => ({ ...prev, [segmentId]: [...prev[segmentId], ...newEmps] }));
    setHasUnsavedChanges(true);
  };

  const handleRemoveEmployee = (segmentId, employeeId) => {
    setAssignments(prev => ({ ...prev, [segmentId]: prev[segmentId].filter(e => e.id !== employeeId) }));
    setHasUnsavedChanges(true);
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all assignments for this shift?')) {
      setAssignments({ Cutting: [], Lamination: [], Embedding: [], 'Production QC': [] });
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveAll = () => {
    const toSave = [];
    Object.entries(assignments).forEach(([segment, list]) => {
      list.forEach(emp => toSave.push({
        id: Date.now() + Math.random(),
        employee_id: emp.id,
        assignment_date: selectedDate,
        shift: selectedShift,
        work_segment: segment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
    });
    const existing = Array.isArray(productionAssignments) ? productionAssignments : [];
    const filtered = existing.filter(a => !(a.assignment_date === selectedDate && a.shift === selectedShift));
    onSaveAssignments([...filtered, ...toSave]);
    setHasUnsavedChanges(false);
  };

  const totalAssigned        = Object.values(assignments).reduce((sum, arr) => sum + arr.length, 0);
  const activePickerSegment  = pickerSegment ? workSegments.find(s => s.id === pickerSegment) : null;

  return (
    <div className="space-y-5">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Shift Assignment</h1>
          <p className="text-sm text-gray-400 mt-0.5">Assign employees to production shifts and work segments</p>
        </div>
        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setViewMode('assign')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'assign' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Assign
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <Table className="w-3.5 h-3.5" /> Overview
          </button>
        </div>
      </div>

      {/* ── Date & Shift selector ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
              <Calendar className="w-3.5 h-3.5" /> Assignment Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => handleDateShiftChange(e.target.value, null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
              <Clock className="w-3.5 h-3.5" /> Shift
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDateShiftChange(null, 'Day')}
                className={`py-2 text-sm font-semibold rounded-lg transition-colors ${selectedShift === 'Day' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                ☀ Day Shift
              </button>
              <button
                onClick={() => handleDateShiftChange(null, 'Night')}
                className={`py-2 text-sm font-semibold rounded-lg transition-colors ${selectedShift === 'Night' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                ☽ Night Shift
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Unsaved changes banner ───────────────────────────────────────── */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
          <span>Unsaved changes — click <strong>Confirm Shift Roster</strong> to save.</span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ASSIGN MODE
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'assign' && (
        <>
          {/* 2×2 segment card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {workSegments.map(segment => {
              const Icon     = segment.icon;
              const hdr      = headerBg[segment.color];
              const empty    = emptyState[segment.color];
              const assigned = assignments[segment.id] || [];

              return (
                <div key={segment.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">

                  {/* ── Light coloured header ──────────────── */}
                  <div className={`${hdr} px-4 py-3 flex items-center justify-between flex-shrink-0`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 ${headerIcon[segment.color]} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className={`text-sm font-bold ${headerText[segment.color]}`}>{segment.name}</h3>
                        <p className={`text-xs ${headerText[segment.color]} opacity-60`}>
                          {assigned.length} {assigned.length === 1 ? 'employee' : 'employees'} assigned
                        </p>
                      </div>
                    </div>
                    {/* Add button */}
                    <button
                      onClick={() => setPickerSegment(segment.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white border border-current rounded-lg transition-colors ${headerText[segment.color]} hover:bg-white`}
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  {/* ── Card body — all neutral, no segment colour here ────── */}
                  <div className="p-4 flex-1">
                    {assigned.length > 0 ? (
                      <div className="space-y-1.5">
                        {assigned.map(emp => {
                          const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                          return (
                            <div
                              key={emp.id}
                              className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 group"
                            >
                              {/* Neutral avatar */}
                              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600">
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 truncate">{emp.name}</p>
                                <p className="text-xs text-gray-400">{emp.employee_id}</p>
                              </div>
                              {/* Remove — only visible on row hover */}
                              <button
                                onClick={() => handleRemoveEmployee(segment.id, emp.id)}
                                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                title="Remove"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty state — dashed border uses segment accent, text neutral */
                      <div
                        className={`flex flex-col items-center justify-center py-5 border-2 border-dashed ${empty.border} rounded-xl cursor-pointer hover:bg-gray-50 transition-colors`}
                        onClick={() => setPickerSegment(segment.id)}
                      >
                        <UserPlus className={`w-5 h-5 ${empty.icon} opacity-50 mb-1`} />
                        <p className="text-xs text-gray-400">Click to add employees</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/*
            ── Action buttons ────────────────────────────────────────────────
            Aligned to the right, sitting flush below the grid.
            The right edge of the buttons aligns with the right edge of the
            Production QC card (second card, bottom row of the 2×2 grid).
            No full-width bar, no info text — just the two buttons.
          */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={handleClearAll}
              disabled={totalAssigned === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Roster
            </button>
            <button
              onClick={handleSaveAll}
              disabled={!hasUnsavedChanges}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Confirm Shift Roster
            </button>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          OVERVIEW / TABLE MODE  — no action buttons shown here at all
      ════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Table toolbar */}
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Total Assigned:{' '}
                <span className="text-blue-600 font-bold">{totalAssigned}</span>
                <span className="text-gray-500 font-normal"> {totalAssigned === 1 ? 'employee' : 'employees'}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedShift} Shift ·{' '}
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            {/* Per-segment mini counts */}
            <div className="flex items-center gap-2">
              {workSegments.map(seg => (
                <span key={seg.id} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${segPill[seg.color]}`}>
                  {seg.name.split(' ')[0]} {(assignments[seg.id] || []).length}
                </span>
              ))}
            </div>
          </div>

          {totalAssigned > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Employee</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Expertise</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Segment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(assignments).flatMap(([segment, list]) => {
                  const seg  = workSegments.find(s => s.id === segment);
                  const pill = segPill[seg?.color || 'blue'];
                  return list.map(emp => {
                    const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    return (
                      <tr key={`${segment}-${emp.id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600">
                              {initials}
                            </div>
                            <span className="font-semibold text-gray-900">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{emp.employee_id}</span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{emp.contact}</td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">{emp.expertise}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${pill}`}>
                            {segment}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400 font-medium">No employees assigned to this shift yet</p>
              <button
                onClick={() => setViewMode('assign')}
                className="mt-3 text-xs text-blue-600 font-semibold hover:text-blue-800"
              >
                Switch to Assign mode →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Employee picker modal ────────────────────────────────────────── */}
      {pickerSegment && activePickerSegment && (
        <EmployeePicker
          segmentName={activePickerSegment.name}
          segmentColor={activePickerSegment.color}
          availableEmployees={getAvailableEmployees()}
          onConfirm={(sel) => handleAddEmployees(pickerSegment, sel)}
          onClose={() => setPickerSegment(null)}
        />
      )}
    </div>
  );
};

export default ShiftAssignment;