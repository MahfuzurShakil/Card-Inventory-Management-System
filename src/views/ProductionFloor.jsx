import { useState, useEffect } from 'react';
import { Factory, Save, Package, AlertTriangle, CheckCircle, Edit, X, Hash, FileText, Users, Calendar, Clock, ChevronRight } from 'lucide-react';

const ProductionFloor = ({
  boxes,
  productionAssignments,
  employees,
  onUpdateBoxConsumption,
  onUpdateShiftSummary,
  shiftContext,
  onNavigate,
  shiftSummaries = []
}) => {
  const [selectedDate, setSelectedDate] = useState(
    shiftContext?.date || new Date().toISOString().split('T')[0]
  );
  const [selectedShift, setSelectedShift] = useState(shiftContext?.shift || 'Day');
  const [editingBox, setEditingBox] = useState(null);
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  const getExistingSummary = (date, shift) => {
    const existing = shiftSummaries.find(s => s.date === date && s.shift === shift);
    return existing || { finished_product: 0, qc_good: 0, wastage: 0, remarks: '' };
  };

  const [shiftSummary, setShiftSummary] = useState(getExistingSummary(selectedDate, selectedShift));

  useEffect(() => {
    setShiftSummary(getExistingSummary(selectedDate, selectedShift));
    setIsEditingSummary(false);
  }, [selectedDate, selectedShift, shiftSummaries]);

  // Shift boxes
  const shiftBoxes = boxes.filter(box =>
    box.issue_date === selectedDate &&
    box.issue_shift === selectedShift &&
    (box.status === 'Material In Production' || box.status === 'Consumed')
  );

  // Employees
  const assignedEmployees = productionAssignments
    .filter(a => a.assignment_date === selectedDate && a.shift === selectedShift)
    .map(a => {
      const emp = employees.find(e => e.id === a.employee_id);
      return emp ? { ...a, employee_name: emp.name, employee_id_number: emp.employee_id, expertise: emp.expertise } : a;
    });

  const teamsBySegment = { Cutting: [], Lamination: [], Embedding: [], QC: [] };
  assignedEmployees.forEach(emp => {
    if (teamsBySegment[emp.work_segment]) teamsBySegment[emp.work_segment].push(emp);
  });

  // Totals
  const totalAvailableChips = shiftBoxes.filter(b => b.item_type === 'Chip').reduce((s, b) => s + (b.remaining_quantity || b.quantity || 0), 0);
  const totalConsumedChips  = shiftBoxes.filter(b => b.item_type === 'Chip').reduce((s, b) => s + (b.consumed_quantity || 0), 0);
  const pendingUpdates = shiftBoxes.filter(b => !b.shift_updated && b.status !== 'Consumed').length;

  // Handlers
  const handleUpdateBox = (boxId, updateData) => {
    const box = shiftBoxes.find(b => b.id === boxId);
    if (!box) return;
    const isChip = box.item_type === 'Chip';
    const currentConsumed = box.consumed_quantity || 0;
    let updates = { shift_updated: true, updated_at: new Date().toISOString() };
    if (isChip) {
      const newConsumed = parseInt(updateData.consumed_quantity || 0);
      const totalConsumed = currentConsumed + newConsumed;
      updates.consumed_quantity = totalConsumed;
      updates.remaining_quantity = box.quantity - totalConsumed;
      updates.status = updates.remaining_quantity === 0 ? 'Consumed' : 'Material In Production';
    } else {
      if (updateData.fully_consumed) {
        updates.status = 'Consumed';
        updates.consumed_quantity = box.quantity;
        updates.remaining_quantity = 0;
      }
    }
    if (updateData.remarks) updates.remarks = updateData.remarks;
    onUpdateBoxConsumption(boxId, updates);
    setEditingBox(null);
  };

  const handleSaveSummary = () => {
    if (onUpdateShiftSummary) onUpdateShiftSummary(selectedDate, selectedShift, shiftSummary);
    setIsEditingSummary(false);
  };

  const handleSummaryChange = (field, value) => {
    setShiftSummary(prev => ({ ...prev, [field]: field === 'remarks' ? value : parseInt(value) || 0 }));
  };

  const handleCancelEdit = () => {
    setShiftSummary(getExistingSummary(selectedDate, selectedShift));
    setIsEditingSummary(false);
  };

  const itemBadge = (type) => {
    if (type === 'Chip')  return 'bg-blue-100 text-blue-800';
    if (type === 'Tape')  return 'bg-purple-100 text-purple-800';
    if (type === 'Sheet') return 'bg-emerald-100 text-emerald-800';
    return 'bg-gray-100 text-gray-700';
  };

  const segmentColors = {
    Cutting:    { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200'       },
    Lamination: { dot: 'bg-purple-500',  badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    Embedding:  { dot: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 border-orange-200' },
    QC:         { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Production Floor</h1>
          <p className="text-sm text-gray-400 mt-0.5">Live shift tracking and material consumption</p>
        </div>
        {pendingUpdates > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-800">{pendingUpdates} box{pendingUpdates !== 1 ? 'es' : ''} pending update</span>
          </div>
        )}
      </div>

      {/* ── Two-column layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: Boxes + Summary ───────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Issued Boxes */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-900">Issued Boxes</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {shiftBoxes.length} box{shiftBoxes.length !== 1 ? 'es' : ''} on this shift
                  {totalAvailableChips > 0 && <span className="ml-2 text-blue-600">· {totalAvailableChips.toLocaleString()} chips remaining</span>}
                </p>
              </div>
              {shiftBoxes.length > 0 && (
                <div className="flex gap-1.5">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {shiftBoxes.filter(b => b.item_type === 'Chip').length} Chip
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    {shiftBoxes.filter(b => b.item_type === 'Tape').length} Tape
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    {shiftBoxes.filter(b => b.item_type === 'Sheet').length} Sheet
                  </span>
                </div>
              )}
            </div>

            {shiftBoxes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Box</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Available</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Consumed</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shiftBoxes.map(box => {
                      const remaining = box.remaining_quantity || box.quantity || 0;
                      const consumed  = box.consumed_quantity || 0;
                      const isConsumed = box.status === 'Consumed';

                      return (
                        <tr key={box.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              {!box.shift_updated && !isConsumed && (
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" title="Pending update" />
                              )}
                              <span className="font-medium text-gray-900 text-sm">{box.box_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${itemBadge(box.item_type)}`}>
                              {box.item_type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                            {remaining.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-orange-700">
                            {consumed > 0 ? consumed.toLocaleString() : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                              isConsumed ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {isConsumed ? 'Consumed' : 'In Production'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {!isConsumed && (
                              <button
                                onClick={() => setEditingBox(box)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                <Edit className="w-3 h-3" />
                                Update
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-gray-300">
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                  <Package className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">No boxes issued for this shift</p>
                <p className="text-xs text-gray-300 mt-1">Issue materials from the Production Issue page</p>
              </div>
            )}
          </div>

          {/* Shift Production Summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Shift Production Summary</p>
                <p className="text-xs text-gray-400 mt-0.5">Output figures for this shift</p>
              </div>
              {!isEditingSummary ? (
                <button
                  onClick={() => setIsEditingSummary(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  <button
                    onClick={handleSaveSummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
              )}
            </div>

            <div className="p-5">
              {!isEditingSummary ? (
                /* View mode */
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-medium text-blue-600 mb-1">Finished Product</p>
                    <p className="text-2xl font-bold text-blue-900">{shiftSummary.finished_product.toLocaleString()}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-medium text-emerald-600 mb-1">QC Good</p>
                    <p className="text-2xl font-bold text-emerald-900">{shiftSummary.qc_good.toLocaleString()}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-medium text-red-500 mb-1">Wastage</p>
                    <p className="text-2xl font-bold text-red-900">{shiftSummary.wastage.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                /* Edit mode */
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Finished Product</label>
                    <input
                      type="number" min="0"
                      value={shiftSummary.finished_product}
                      onChange={e => handleSummaryChange('finished_product', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">QC Good</label>
                    <input
                      type="number" min="0"
                      value={shiftSummary.qc_good}
                      onChange={e => handleSummaryChange('qc_good', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Wastage</label>
                    <input
                      type="number" min="0"
                      value={shiftSummary.wastage}
                      onChange={e => handleSummaryChange('wastage', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Remarks */}
              {!isEditingSummary && shiftSummary.remarks && (
                <div className="mt-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <p className="text-xs font-medium text-gray-500 mb-1">Remarks</p>
                  <p className="text-sm text-gray-800">{shiftSummary.remarks}</p>
                </div>
              )}
              {isEditingSummary && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Remarks</label>
                  <textarea
                    value={shiftSummary.remarks}
                    onChange={e => handleSummaryChange('remarks', e.target.value)}
                    rows={3}
                    placeholder="Add shift notes..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Shift context + Team ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Date & Shift */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Shift Context</p>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Clock className="w-3.5 h-3.5" /> Shift
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedShift('Day')}
                    className={`py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                      selectedShift === 'Day' ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ☀ Day
                  </button>
                  <button
                    onClick={() => setSelectedShift('Night')}
                    className={`py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                      selectedShift === 'Night' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ☽ Night
                  </button>
                </div>
              </div>

              {/* Quick stats for this shift */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-gray-900">{shiftBoxes.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Boxes issued</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-bold text-gray-900">{assignedEmployees.length}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Team members</p>
                </div>
              </div>

              {/* Assignment status */}
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                assignedEmployees.length > 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${assignedEmployees.length > 0 ? 'bg-emerald-500' : 'bg-red-400'}`} />
                {assignedEmployees.length > 0
                  ? `${assignedEmployees.length} employees on shift`
                  : 'No employees assigned'}
              </div>
            </div>
          </div>

          {/* Team by segment */}
          {assignedEmployees.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Team on Shift</p>
              </div>

              <div className="space-y-3">
                {Object.entries(teamsBySegment).map(([segment, members]) => {
                  const colors = segmentColors[segment];
                  if (members.length === 0) return null;
                  return (
                    <div key={segment}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                        <p className="text-xs font-semibold text-gray-700">{segment}</p>
                        <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded border ${colors.badge}`}>
                          {members.length}
                        </span>
                      </div>
                      <div className="space-y-1 pl-4">
                        {members.map((emp, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-800">{emp.employee_name}</p>
                              <p className="text-xs text-gray-400">{emp.expertise}</p>
                            </div>
                            <span className="text-xs font-mono text-gray-400">{emp.employee_id_number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Unassigned segments */}
                {Object.entries(teamsBySegment).some(([, m]) => m.length === 0) && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1.5">Not assigned:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(teamsBySegment)
                        .filter(([, m]) => m.length === 0)
                        .map(([seg]) => (
                          <span key={seg} className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{seg}</span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No team state */}
          {assignedEmployees.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No team assigned</p>
              <p className="text-xs text-gray-400 mt-1">Assign employees to this shift first</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Update Box Modal ────────────────────────────────────────────────── */}
      {editingBox && (
        <UpdateBoxModal box={editingBox} onSave={handleUpdateBox} onClose={() => setEditingBox(null)} />
      )}
    </div>
  );
};

// ─── Update Modal ─────────────────────────────────────────────────────────────
const UpdateBoxModal = ({ box, onSave, onClose }) => {
  const isChip  = box.item_type === 'Chip';
  const available = box.remaining_quantity || box.quantity || 0;
  const [data, setData] = useState({ consumed_quantity: 0, fully_consumed: false, remarks: '' });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Modal header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">{box.box_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                isChip ? 'bg-blue-100 text-blue-800' :
                box.item_type === 'Tape' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
              }`}>{box.item_type}</span>
              <span className="text-xs text-gray-400">{available.toLocaleString()} units available</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {isChip ? (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <Hash className="w-4 h-4" /> Units Consumed This Shift
              </label>
              <input
                type="number"
                value={data.consumed_quantity}
                onChange={e => setData({ ...data, consumed_quantity: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-center"
                max={available} min="0"
              />
              <p className="text-xs text-gray-400 text-center mt-1.5">Maximum: {available.toLocaleString()} units</p>
            </div>
          ) : (
            <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all">
              <input
                type="checkbox"
                checked={data.fully_consumed}
                onChange={e => setData({ ...data, fully_consumed: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <p className="font-semibold text-sm text-gray-900">Mark as Fully Consumed</p>
                <p className="text-xs text-gray-500 mt-0.5">All {available.toLocaleString()} units have been used</p>
              </div>
            </label>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" /> Remarks <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={data.remarks}
              onChange={e => setData({ ...data, remarks: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm h-20 resize-none bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
              placeholder="Notes about this consumption..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(box.id, data)}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" /> Save Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionFloor;