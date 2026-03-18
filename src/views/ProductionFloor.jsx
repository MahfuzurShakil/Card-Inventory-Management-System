import { useState, useEffect, useMemo } from 'react';
import {
  Factory, Save, Package, AlertTriangle, CheckCircle, Edit, X,
  Hash, FileText, Users, Calendar, Clock, ChevronRight, Info,
  TrendingUp, AlertCircle, Lock
} from 'lucide-react';

// ─── Helper ───────────────────────────────────────────────────────────────────
const isChipBox = (box) =>
  (box.item_type || '').toLowerCase() === 'chip' ||
  (box.item_name || '').toLowerCase() === 'chip';

// ─── Main Component ───────────────────────────────────────────────────────────
const ProductionFloor = ({
  boxes,
  productionAssignments,
  employees,
  onUpdateBoxConsumption,
  onUpdateShiftSummary,
  shiftContext,
  onNavigate,
  shiftSummaries = [],
}) => {
  const [selectedDate,     setSelectedDate]     = useState(shiftContext?.date  || new Date().toISOString().split('T')[0]);
  const [selectedShift,    setSelectedShift]    = useState(shiftContext?.shift || 'Day');
  const [editingBox,       setEditingBox]       = useState(null);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryErrors,    setSummaryErrors]    = useState({});

  // ── Existing summary for this date+shift ─────────────────────────────────
  const getExistingSummary = (date, shift) => {
    const s = shiftSummaries.find(s => s.date === date && s.shift === shift);
    return s || { chips_used: 0, qc_good: 0, wastage: 0, remarks: '' };
  };

  const [shiftSummary, setShiftSummary] = useState(getExistingSummary(selectedDate, selectedShift));

  useEffect(() => {
    setShiftSummary(getExistingSummary(selectedDate, selectedShift));
    setIsEditingSummary(false);
    setSummaryErrors({});
  }, [selectedDate, selectedShift, shiftSummaries]);

  // ── Boxes for this shift ──────────────────────────────────────────────────
  // Shows:
  //   1. Boxes natively issued to this date+shift (all statuses including Consumed)
  //   2. Carry-over boxes from another shift that target this date+shift via
  //      carry_over_date / carry_over_shift fields — shown as read-only here
  //
  // Carry-over boxes remain visible on their ORIGINAL shift too (locked there).

  const shiftBoxes = useMemo(() => {
    // Native: issued to this shift
    const native = boxes.filter(b =>
      b.issue_date  === selectedDate &&
      b.issue_shift === selectedShift &&
      (b.status === 'Material In Production' ||
       b.status === 'Consumed' ||
       b.status === 'Partially Consumed')
    );

    // Carry-overs from other shifts pointed at this shift
    const carryOvers = boxes.filter(b => {
      const isNative = b.issue_date === selectedDate && b.issue_shift === selectedShift;
      if (isNative) return false;
      if (!b.carry_over) return false;
      return b.carry_over_date === selectedDate && b.carry_over_shift === selectedShift;
    });

    return [...native, ...carryOvers];
  }, [boxes, selectedDate, selectedShift]);

  // ── Chip totals — native chip boxes only for cross-validation ────────────
  const chipBoxes         = shiftBoxes.filter(isChipBox);
  const nativeChipBoxes   = chipBoxes.filter(b =>
    b.issue_date === selectedDate && b.issue_shift === selectedShift
  );
  const totalChipQty       = chipBoxes.reduce((s, b) => s + (b.quantity || 0), 0);
  const totalConsumedChip  = nativeChipBoxes.reduce((s, b) => s + (b.consumed_quantity || 0), 0);
  const totalRemainingChip = chipBoxes.reduce((s, b) => {
    const rem = b.remaining_quantity ?? ((b.quantity || 0) - (b.consumed_quantity || 0));
    return s + Math.max(0, rem);
  }, 0);

  // ── Pending updates — native non-consumed boxes ───────────────────────────
  const nativeBoxes     = shiftBoxes.filter(b =>
    b.issue_date === selectedDate && b.issue_shift === selectedShift
  );
  const pendingBoxes    = nativeBoxes.filter(b => !b.shift_updated && b.status !== 'Consumed');
  const pendingCount    = pendingBoxes.length;
  const allBoxesUpdated = pendingCount === 0 && nativeBoxes.length > 0;

  // ── Cross-validation ──────────────────────────────────────────────────────
  const summaryChipsUsed = parseInt(shiftSummary.chips_used) ||
    parseInt(shiftSummary.finished_product) || 0;
  const chipDiff    = totalConsumedChip - summaryChipsUsed;
  const chipValidOk = nativeChipBoxes.length === 0 || totalConsumedChip === summaryChipsUsed;

  // ── Employees ─────────────────────────────────────────────────────────────
  const assignedEmployees = productionAssignments
    .filter(a => a.assignment_date === selectedDate && a.shift === selectedShift)
    .map(a => {
      const emp = employees.find(e => e.id === a.employee_id);
      return emp
        ? { ...a, employee_name: emp.name, employee_id_number: emp.employee_id, expertise: emp.expertise }
        : a;
    });

  const teamsBySegment = { Cutting: [], Lamination: [], Embedding: [], QC: [] };
  assignedEmployees.forEach(emp => {
    if (teamsBySegment[emp.work_segment]) teamsBySegment[emp.work_segment].push(emp);
  });

  // ── UI helpers ────────────────────────────────────────────────────────────
  const itemBadge = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'chip')  return 'bg-blue-100 text-blue-800';
    if (t === 'tape')  return 'bg-purple-100 text-purple-800';
    if (t === 'sheet') return 'bg-emerald-100 text-emerald-800';
    return 'bg-gray-100 text-gray-700';
  };
  const segmentColors = {
    Cutting:    { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200'          },
    Lamination: { dot: 'bg-purple-500',  badge: 'bg-purple-50 text-purple-700 border-purple-200'    },
    Embedding:  { dot: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 border-orange-200'    },
    QC:         { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  // ── Box update handler ────────────────────────────────────────────────────
  const handleUpdateBox = (boxId, updateData) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    const chip = isChipBox(box);
    const updates = { shift_updated: true, updated_at: new Date().toISOString() };

    if (chip) {
      // consumed_this_update is the DELTA typed by user this session
      const prevConsumed    = box.consumed_quantity || 0;
      const prevRemaining   = box.remaining_quantity != null
        ? box.remaining_quantity
        : Math.max(0, (box.quantity || 0) - prevConsumed);
      const delta           = parseInt(updateData.consumed_this_update || 0);
      const newTotalConsumed = prevConsumed + delta;
      const newRemaining     = Math.max(0, prevRemaining - delta);

      updates.consumed_quantity  = newTotalConsumed;
      updates.remaining_quantity = newRemaining;
      updates.status             = newRemaining <= 0 ? 'Consumed' : 'Partially Consumed';
      updates.carry_over         = newRemaining > 0;
    } else {
      // Tape / Sheet
      if (updateData.consumption_type === 'fully') {
        updates.status             = 'Consumed';
        updates.consumed_quantity  = box.quantity;
        updates.remaining_quantity = 0;
        updates.consumption_type   = 'fully';
        updates.carry_over         = false;
      } else {
        updates.status           = 'Partially Consumed';
        updates.consumption_type = 'partially';
        updates.carry_over       = true;  // auto carry-over
      }
    }
    if (updateData.remarks !== undefined) updates.remarks = updateData.remarks;
    onUpdateBoxConsumption(boxId, updates);
    setEditingBox(null);
  };

  // ── Summary save ──────────────────────────────────────────────────────────
  const handleSaveSummary = () => {
    const errs     = {};
    const qcGood   = parseInt(shiftSummary.qc_good)    || 0;
    const wastage  = parseInt(shiftSummary.wastage)     || 0;
    const chipsUsed = parseInt(shiftSummary.chips_used) ||
      parseInt(shiftSummary.finished_product) || 0;

    if (qcGood  < 0) errs.qc_good  = 'Cannot be negative';
    if (wastage < 0) errs.wastage  = 'Cannot be negative';

    if (nativeChipBoxes.length > 0 && totalConsumedChip !== chipsUsed) {
      errs.chip_mismatch = `Box-level chips consumed (${totalConsumedChip.toLocaleString()}) ≠ Chips Used (${chipsUsed.toLocaleString()}). Difference: ${Math.abs(chipDiff).toLocaleString()}.`;
    }

    setSummaryErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (onUpdateShiftSummary) {
      onUpdateShiftSummary(selectedDate, selectedShift, {
        ...shiftSummary,
        chips_used:       chipsUsed,
        finished_product: chipsUsed,  // keep backward-compat
        qc_good:          qcGood,
        wastage,
      });
    }
    setIsEditingSummary(false);
  };

  const handleSummaryChange = (field, value) => {
    setShiftSummary(prev => ({ ...prev, [field]: field === 'remarks' ? value : parseInt(value) || 0 }));
    setSummaryErrors(prev => ({ ...prev, [field]: undefined, chip_mismatch: undefined }));
  };

  const handleCancelEdit = () => {
    setShiftSummary(getExistingSummary(selectedDate, selectedShift));
    setIsEditingSummary(false);
    setSummaryErrors({});
  };

  const displayChipsUsed = shiftSummary.chips_used ?? shiftSummary.finished_product ?? 0;
  const editChipsUsedVal = shiftSummary.chips_used != null
    ? shiftSummary.chips_used
    : shiftSummary.finished_product ?? '';

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Production Floor</h1>
          <p className="text-sm text-gray-400 mt-0.5">Live shift tracking and material consumption</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <span className="text-sm font-medium text-orange-800">
              {pendingCount} box{pendingCount !== 1 ? 'es' : ''} pending update
            </span>
          </div>
        )}
      </div>

      {/* ── Two-column layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT ──────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Issued Boxes Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Issued Boxes</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {nativeBoxes.length} native · {shiftBoxes.length - nativeBoxes.length} carry-over
                  {chipBoxes.length > 0 && (
                    <span className="ml-2 text-blue-600">· {totalRemainingChip.toLocaleString()} chips remaining</span>
                  )}
                </p>
              </div>
              {shiftBoxes.length > 0 && (
                <div className="flex gap-1.5">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {chipBoxes.length} Chip
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    {shiftBoxes.filter(b => (b.item_type || '').toLowerCase() === 'tape').length} Tape
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    {shiftBoxes.filter(b => (b.item_type || '').toLowerCase() === 'sheet').length} Sheet
                  </span>
                </div>
              )}
            </div>

            {shiftBoxes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-left   text-xs font-semibold text-gray-400 uppercase tracking-wide">Box</th>
                      <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Qty</th>
                      <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-400 uppercase tracking-wide">Consumed</th>
                      <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-400 uppercase tracking-wide">Remaining</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shiftBoxes.map(box => {
                      const chip            = isChipBox(box);
                      const totalQty        = box.quantity || 0;
                      const consumed        = box.consumed_quantity || 0;
                      const remaining       = box.remaining_quantity != null
                        ? box.remaining_quantity
                        : Math.max(0, totalQty - consumed);
                      const isFullyConsumed = box.status === 'Consumed';
                      const isPartial       = box.status === 'Partially Consumed';

                      // Is this box native to the currently-viewed shift?
                      const isNative        = box.issue_date === selectedDate && box.issue_shift === selectedShift;
                      // Carry-over boxes shown HERE are locked — updates belong to the next shift
                      const isCarryOverHere = !isNative && !!box.carry_over;
                      const needsUpdate     = isNative && !box.shift_updated && !isFullyConsumed;

                      return (
                        <tr key={box.id} className={`hover:bg-gray-50 transition-colors ${
                          isCarryOverHere ? 'bg-amber-50/40' :
                          needsUpdate     ? 'bg-orange-50/20' : ''
                        }`}>

                          {/* Box name */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {needsUpdate && (
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" title="Pending update" />
                              )}
                              <span className={`font-medium text-sm ${isCarryOverHere ? 'text-amber-800' : 'text-gray-900'}`}>
                                {box.box_name}
                              </span>
                              {box.carry_over && (
                                <span className="px-1.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded">
                                  carry-over
                                </span>
                              )}
                              {isCarryOverHere && (
                                <span className="text-xs text-amber-500 italic">prev shift</span>
                              )}
                            </div>
                          </td>

                          {/* Type badge */}
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${itemBadge(box.item_type || box.item_name)}`}>
                              {box.item_type || box.item_name}
                            </span>
                          </td>

                          {/* Total Qty — all types show quantity */}
                          <td className="px-4 py-3.5 text-right">
                            <span className="font-semibold text-gray-700">{totalQty.toLocaleString()}</span>
                          </td>

                          {/* Consumed */}
                          <td className="px-4 py-3.5 text-right">
                            {chip ? (
                              <span className={`font-semibold ${consumed > 0 ? 'text-orange-700' : 'text-gray-300'}`}>
                                {consumed > 0 ? consumed.toLocaleString() : '—'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {isFullyConsumed ? 'Full' : isPartial ? 'Partial' : '—'}
                              </span>
                            )}
                          </td>

                          {/* Remaining — chip only */}
                          <td className="px-4 py-3.5 text-right">
                            {chip ? (
                              <span className={`font-semibold ${
                                remaining === 0            ? 'text-gray-400'   :
                                remaining < totalQty * 0.2 ? 'text-red-600'   : 'text-emerald-700'
                              }`}>
                                {remaining.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                              isFullyConsumed  ? 'bg-gray-100 text-gray-500'    :
                              isPartial        ? 'bg-amber-100 text-amber-700'  :
                              isCarryOverHere  ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                              needsUpdate      ? 'bg-orange-100 text-orange-700':
                                                 'bg-blue-100 text-blue-700'
                            }`}>
                              {isFullyConsumed ? 'Consumed'           :
                               isPartial       ? 'Partially Consumed' :
                               isCarryOverHere ? 'Carry-over'         :
                               needsUpdate     ? 'Needs Update'       : 'In Production'}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="px-5 py-3.5 text-center">
                            {isCarryOverHere ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-400 text-xs font-medium border border-gray-200 rounded-lg bg-gray-50 select-none">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            ) : isFullyConsumed ? (
                              <span className="text-xs text-gray-300">—</span>
                            ) : (
                              <button
                                onClick={() => setEditingBox(box)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors ${
                                  needsUpdate
                                    ? 'bg-orange-500 hover:bg-orange-600'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                              >
                                <Edit className="w-3 h-3" />
                                {needsUpdate ? 'Update*' : 'Update'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Chip totals footer */}
                {chipBoxes.length > 0 && (
                  <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700">
                      Chip totals — {chipBoxes.length} box{chipBoxes.length !== 1 ? 'es' : ''}
                    </span>
                    <div className="flex items-center gap-6 text-xs font-semibold">
                      <span className="text-gray-600">Total: <span className="text-gray-900">{totalChipQty.toLocaleString()}</span></span>
                      <span className="text-orange-600">Consumed: {totalConsumedChip.toLocaleString()}</span>
                      <span className={totalRemainingChip > 0 ? 'text-emerald-700' : 'text-gray-400'}>
                        Remaining: {totalRemainingChip.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                  <Package className="w-7 h-7 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">No boxes issued for this shift</p>
                <p className="text-xs text-gray-300 mt-1">Issue materials from the Production Issue page</p>
              </div>
            )}
          </div>

          {/* ── Shift Production Summary ──────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Shift Production Summary</p>
                <p className="text-xs text-gray-400 mt-0.5">{selectedDate} — {selectedShift} Shift</p>
              </div>
              {!isEditingSummary ? (
                <button
                  onClick={() => setIsEditingSummary(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-3 h-3" /> Edit
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

            <div className="p-5 space-y-4">
              {!isEditingSummary ? (
                /* ── View mode ── */
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-medium text-blue-600 mb-1">Chips Used This Shift</p>
                      <p className="text-2xl font-bold text-blue-900">{(displayChipsUsed || 0).toLocaleString()}</p>
                      <p className="text-xs text-blue-400 mt-0.5">Total chips consumed in production</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-medium text-emerald-600 mb-1">QC Approved Goods</p>
                      <p className="text-2xl font-bold text-emerald-900">{(shiftSummary.qc_good || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-medium text-red-500 mb-1">Wastage</p>
                      <p className="text-2xl font-bold text-red-900">{(shiftSummary.wastage || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Chip validation badge — only when summary saved */}
                  {nativeChipBoxes.length > 0 && displayChipsUsed > 0 && (
                    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-medium ${
                      chipValidOk
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}>
                      {chipValidOk
                        ? <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                      <span>
                        {chipValidOk
                          ? `Chips balanced — ${totalConsumedChip.toLocaleString()} chips accounted for`
                          : `Box-level consumed (${totalConsumedChip.toLocaleString()}) ≠ Chips Used (${displayChipsUsed.toLocaleString()}) — review box updates`}
                      </span>
                    </div>
                  )}

                  {shiftSummary.remarks && (
                    <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <p className="text-xs font-medium text-gray-500 mb-1">Remarks</p>
                      <p className="text-sm text-gray-800">{shiftSummary.remarks}</p>
                    </div>
                  )}

                  {displayChipsUsed === 0 && (shiftSummary.qc_good || 0) === 0 && (shiftSummary.wastage || 0) === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">No summary saved yet — click Edit to record production figures.</p>
                  )}
                </>
              ) : (
                /* ── Edit mode ── */
                <>
                  {pendingCount > 0 && (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-800">
                        <span className="font-semibold">{pendingCount} box{pendingCount !== 1 ? 'es' : ''} still pending update.</span>{' '}
                        Update all boxes first for accurate chip cross-validation.
                      </p>
                    </div>
                  )}

                  {/* Chips Used — full-width */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                      <Hash className="w-3.5 h-3.5 text-blue-500" />
                      Chips Used This Shift <span className="text-red-400">*</span>
                      {nativeChipBoxes.length > 0 && (
                        <span className="ml-auto text-xs text-blue-500 font-normal">
                          Auto from boxes: {totalConsumedChip.toLocaleString()}
                        </span>
                      )}
                    </label>
                    <input
                      type="number" min="0"
                      value={editChipsUsedVal}
                      onChange={e => handleSummaryChange('chips_used', e.target.value)}
                      placeholder="0"
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white ${
                        summaryErrors.chip_mismatch ? 'border-red-300' : 'border-gray-200'}`}
                    />
                    <p className="mt-1 text-xs text-gray-400">Total chips consumed in this shift's production (must match box-level consumed)</p>
                    {summaryErrors.chip_mismatch && (
                      <p className="mt-1.5 text-xs text-red-600 font-medium">{summaryErrors.chip_mismatch}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* QC Approved Goods */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        QC Approved Goods <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number" min="0"
                        value={shiftSummary.qc_good || ''}
                        onChange={e => handleSummaryChange('qc_good', e.target.value)}
                        placeholder="0"
                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white ${
                          summaryErrors.qc_good ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {summaryErrors.qc_good && <p className="mt-1 text-xs text-red-500">{summaryErrors.qc_good}</p>}
                      <p className="mt-1 text-xs text-gray-400">Cards that passed all QC checks</p>
                    </div>

                    {/* Wastage */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                        <X className="w-3.5 h-3.5 text-red-400" />
                        Wastage <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number" min="0"
                        value={shiftSummary.wastage || ''}
                        onChange={e => handleSummaryChange('wastage', e.target.value)}
                        placeholder="0"
                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white ${
                          summaryErrors.wastage ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {summaryErrors.wastage && <p className="mt-1 text-xs text-red-500">{summaryErrors.wastage}</p>}
                      <p className="mt-1 text-xs text-gray-400">QC rejected + in-process waste</p>
                    </div>
                  </div>

                  {/* Chip cross-check — compact inline panel */}
                  {nativeChipBoxes.length > 0 && (
                    <div className={`px-4 py-3 rounded-xl border text-xs ${
                      (parseInt(shiftSummary.chips_used) || 0) === 0
                        ? 'bg-gray-50 border-gray-200'
                        : totalConsumedChip === (parseInt(shiftSummary.chips_used) || 0)
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700">Chip Cross-Check</span>
                        {(parseInt(shiftSummary.chips_used) || 0) === 0 ? (
                          <span className="text-gray-400">Enter chips used above</span>
                        ) : totalConsumedChip === (parseInt(shiftSummary.chips_used) || 0) ? (
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" /> Balanced
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Off by {Math.abs(chipDiff).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-gray-500">
                        <span>Boxes: <strong className="text-gray-800">{totalConsumedChip.toLocaleString()}</strong></span>
                        <span>|</span>
                        <span>Entry: <strong className="text-gray-800">{(parseInt(shiftSummary.chips_used) || 0).toLocaleString()}</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Remarks <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={shiftSummary.remarks || ''}
                      onChange={e => handleSummaryChange('remarks', e.target.value)}
                      rows={2}
                      placeholder="Add shift notes..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Shift context + Team ───────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Date & Shift selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Shift Context</p>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date
                </label>
                <input
                  type="date" value={selectedDate}
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
                  >☀ Day</button>
                  <button
                    onClick={() => setSelectedShift('Night')}
                    className={`py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                      selectedShift === 'Night' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >☽ Night</button>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2 pt-4 mt-4 border-t border-gray-100">
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-gray-900">{nativeBoxes.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Boxes issued</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-gray-900">{assignedEmployees.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Team members</p>
              </div>
            </div>

            {/* Box update status */}
            {nativeBoxes.length > 0 && (
              <div className={`mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                allBoxesUpdated
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-orange-50 text-orange-800 border border-orange-200'
              }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${allBoxesUpdated ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                {allBoxesUpdated
                  ? 'All boxes updated'
                  : `${pendingCount} box${pendingCount !== 1 ? 'es' : ''} need update`}
              </div>
            )}

            {/* Employee assignment */}
            <div className={`mt-2 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
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
              </div>
            </div>
          )}

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

      {/* Update Box Modal */}
      {editingBox && (
        <UpdateBoxModal box={editingBox} onSave={handleUpdateBox} onClose={() => setEditingBox(null)} />
      )}
    </div>
  );
};

// ─── Update Box Modal ─────────────────────────────────────────────────────────
const UpdateBoxModal = ({ box, onSave, onClose }) => {
  const chip = isChipBox(box);
  const totalQty        = box.quantity || 0;
  const alreadyConsumed = box.consumed_quantity || 0;
  // Derive remaining from stored field; if not set, compute from total minus consumed
  const remaining = box.remaining_quantity != null
    ? Math.max(0, box.remaining_quantity)
    : Math.max(0, totalQty - alreadyConsumed);

  const [consumedInput,   setConsumedInput]   = useState('');
  const [consumptionType, setConsumptionType] = useState('');
  const [remarks,         setRemarks]         = useState(box.remarks || '');
  const [error,           setError]           = useState('');

  const delta        = chip ? (parseInt(consumedInput) || 0) : 0;
  const newRemaining = Math.max(0, remaining - delta);

  const handleSave = () => {
    setError('');
    if (chip) {
      if (!consumedInput || delta <= 0) { setError('Enter consumed quantity'); return; }
      if (delta > remaining)            { setError(`Cannot exceed remaining (${remaining.toLocaleString()})`); return; }
      onSave(box.id, { consumed_this_update: delta, remarks });
    } else {
      if (!consumptionType) { setError('Please select Fully or Partially Consumed'); return; }
      onSave(box.id, { consumption_type: consumptionType, remarks });
    }
  };

  const typeName  = box.item_type || box.item_name || '';
  const typeBadge =
    typeName.toLowerCase() === 'chip'  ? 'bg-blue-100 text-blue-800'     :
    typeName.toLowerCase() === 'tape'  ? 'bg-purple-100 text-purple-800'  :
    typeName.toLowerCase() === 'sheet' ? 'bg-emerald-100 text-emerald-800' :
    'bg-gray-100 text-gray-700';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">{box.box_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${typeBadge}`}>{typeName}</span>
              {chip && (
                <span className="text-xs text-gray-400">{remaining.toLocaleString()} chips available</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {chip ? (
            /* ── Chip box ─────────────────────────────────────────────────── */
            <>
              {/* Compact 3-col summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-gray-500 mb-0.5">Total</p>
                  <p className="text-base font-bold text-gray-900">{totalQty.toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-orange-600 mb-0.5">Used so far</p>
                  <p className="text-base font-bold text-orange-800">{alreadyConsumed.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-emerald-600 mb-0.5">Remaining</p>
                  <p className="text-base font-bold text-emerald-800">{remaining.toLocaleString()}</p>
                </div>
              </div>

              {/* Input — label includes max inline, no redundant text below */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-4 h-4" /> Consumed this update
                  </span>
                  <span className="text-xs text-gray-400 font-normal">Max {remaining.toLocaleString()}</span>
                </label>
                <input
                  type="number" min="0" max={remaining}
                  value={consumedInput}
                  onChange={e => { setConsumedInput(e.target.value); setError(''); }}
                  placeholder="Enter quantity"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-center"
                  autoFocus
                />
              </div>

              {/* Running total — only shows when input is valid */}
              {delta > 0 && delta <= remaining && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-blue-600 mb-0.5">Used so far</p>
                      <p className="font-bold text-blue-900">{alreadyConsumed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-orange-600 mb-0.5">+ This update</p>
                      <p className="font-bold text-orange-800">+{delta.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-emerald-600 mb-0.5">New remaining</p>
                      <p className="font-bold text-emerald-800">{newRemaining.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {delta > 0 && newRemaining > 0 && delta <= remaining && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">{newRemaining.toLocaleString()} chips will remain</span> — box will carry over to next shift.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* ── Non-chip box ─────────────────────────────────────────────── */
            <>
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Box quantity</span>
                <span className="text-lg font-bold text-gray-900">{totalQty.toLocaleString()} units</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Consumption Status <span className="text-red-400">*</span>
                </p>
                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  consumptionType === 'fully'
                    ? 'border-gray-700 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}>
                  <input
                    type="radio" name="consumption_modal" value="fully"
                    checked={consumptionType === 'fully'}
                    onChange={() => { setConsumptionType('fully'); setError(''); }}
                    className="w-4 h-4 text-gray-800"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Fully Consumed</p>
                    <p className="text-xs text-gray-500 mt-0.5">All material used — status changes to Consumed</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  consumptionType === 'partially'
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-gray-200 hover:border-amber-300'
                }`}>
                  <input
                    type="radio" name="consumption_modal" value="partially"
                    checked={consumptionType === 'partially'}
                    onChange={() => { setConsumptionType('partially'); setError(''); }}
                    className="w-4 h-4 text-amber-600"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Partially Consumed</p>
                    <p className="text-xs text-gray-500 mt-0.5">Some material remains — box carries to next shift automatically</p>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Remarks */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" /> Remarks
              <span className="text-xs text-gray-400 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm h-16 resize-none bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
              placeholder="Notes about this consumption..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
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