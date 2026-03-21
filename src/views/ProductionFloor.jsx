import { useState, useEffect, useMemo } from 'react';
import {
  Save, Package, AlertTriangle, CheckCircle, Edit, X,
  Hash, FileText, Users, Calendar, Clock, Info, AlertCircle,
  Lock, Unlock
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isChipBox = (box) =>
  (box.item_type || '').toLowerCase() === 'chip' ||
  (box.item_name || '').toLowerCase() === 'chip';

// How many chips are left on a box right now (works before and after first update)
const boxRemaining = (box) => {
  if (box.remaining_quantity != null) return Math.max(0, box.remaining_quantity);
  return Math.max(0, (box.quantity || 0) - (box.consumed_quantity || 0));
};

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
  // Tracks whether user manually unlocked a completed shift for editing
  const [manualEditUnlocked, setManualEditUnlocked] = useState(false);

  // ── Summary helpers ───────────────────────────────────────────────────────
  const getExistingSummary = (date, shift) => {
    const s = shiftSummaries.find(s => s.date === date && s.shift === shift);
    return s || { qc_good: 0, wastage: 0, remarks: '' };
  };

  const [shiftSummary, setShiftSummary] = useState(getExistingSummary(selectedDate, selectedShift));

  useEffect(() => {
    setShiftSummary(getExistingSummary(selectedDate, selectedShift));
    setIsEditingSummary(false);
    setSummaryErrors({});
    setManualEditUnlocked(false);
  }, [selectedDate, selectedShift, shiftSummaries]);

  // ── Which boxes are visible for this shift? ───────────────────────────────
  //
  // A box appears in the current shift if ANY of these is true:
  //   1. Natively issued to this date+shift (issue_date + issue_shift match)
  //   2. Has a shiftConsumptionLog entry for this exact shift
  //      (was a carry-over that was already updated here)
  //   3. carry_over === true AND status !== 'Consumed'
  //      (partially-used tape/sheet or chip from a previous shift that needs
  //       to continue — auto-appear without user scanning again)
  //
  const shiftBoxes = useMemo(() => {
    const seen = new Set();
    const result = [];

    boxes.forEach(b => {
      const isNative = b.issue_date === selectedDate && b.issue_shift === selectedShift;

      const hasLogHere = (b.shiftConsumptionLog || []).some(
        l => l.date === selectedDate && l.shift === selectedShift
      );

      // carry_over means the box was partially used in a previous shift
      // and still has material remaining — auto-show it here
      const isCarryOver = b.carry_over === true && b.status === 'Material In Production';

      if ((isNative || hasLogHere || isCarryOver) && !seen.has(b.id)) {
        seen.add(b.id);
        result.push(b);
      }
    });

    // Native boxes first, then carry-overs
    return result.sort((a, b) => {
      const aN = a.issue_date === selectedDate && a.issue_shift === selectedShift;
      const bN = b.issue_date === selectedDate && b.issue_shift === selectedShift;
      if (aN && !bN) return -1;
      if (!aN && bN) return 1;
      return 0;
    });
  }, [boxes, selectedDate, selectedShift]);

  // ── How many chips were logged for THIS shift on a box ────────────────────
  const getShiftConsumed = (box) => {
    const entry = (box.shiftConsumptionLog || []).find(
      l => l.date === selectedDate && l.shift === selectedShift
    );
    return entry ? (entry.consumed || 0) : 0;
  };

  // ── Auto chips-used total for this shift (from log, not manual entry) ─────
  const autoChipsUsed = useMemo(() => {
    return shiftBoxes
      .filter(isChipBox)
      .reduce((sum, b) => sum + getShiftConsumed(b), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftBoxes, selectedDate, selectedShift]);

  // ── Native boxes (issued to this exact shift) ─────────────────────────────
  const nativeBoxes = shiftBoxes.filter(
    b => b.issue_date === selectedDate && b.issue_shift === selectedShift
  );

  // ── Pending = native boxes with no log entry yet (not already fully consumed)
  const pendingCount = nativeBoxes.filter(b => {
    const hasLog = (b.shiftConsumptionLog || []).some(
      l => l.date === selectedDate && l.shift === selectedShift
    );
    return !hasLog && b.status !== 'Consumed';
  }).length;

  const allBoxesUpdated = pendingCount === 0 && nativeBoxes.length > 0;

  // ── Shift is "complete" when all pending boxes are done + summary saved ────
  // pendingCount===0 is true even when no boxes were issued (nothing pending),
  // so we require summaryExists to confirm the shift was actively closed out.
  const summaryExists   = shiftSummaries.some(s => s.date === selectedDate && s.shift === selectedShift);
  const isShiftComplete = pendingCount === 0 && summaryExists;

  // Page is read-only when shift is complete AND user hasn't manually unlocked it
  const isReadOnly = isShiftComplete && !manualEditUnlocked;

  // ── Chip summary stats ────────────────────────────────────────────────────
  const chipBoxes       = shiftBoxes.filter(isChipBox);
  const totalConsumed   = chipBoxes.reduce((s, b) => s + (b.consumed_quantity || 0), 0);
  const totalRemaining  = chipBoxes.reduce((s, b) => s + boxRemaining(b), 0);

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
    Cutting:    { dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 border-blue-200'       },
    Lamination: { dot: 'bg-purple-500',  badge: 'bg-purple-50 text-purple-700 border-purple-200' },
    Embedding:  { dot: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700 border-orange-200' },
    QC:         { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  // ── Box update handler ────────────────────────────────────────────────────
  //
  // For CHIPS, the modal sends:
  //   consumed_this_shift  — absolute chips consumed this shift (stored in log, e.g. 800)
  //   consumed_this_update — signed delta vs previous log for same shift
  //                          First update: same as consumed_this_shift
  //                          Re-update 800→850: consumed_this_update = +50
  //                          App.jsx adds consumed_this_update to consumed_quantity
  //                          and subtracts from remaining_quantity
  //
  // For TAPE/SHEET, the modal sends:
  //   consumption_type — 'fully' | 'partially'
  //
  const handleUpdateBox = (boxId, updateData) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;

    const chip = isChipBox(box);

    // Build updated shiftConsumptionLog
    const existingLog   = box.shiftConsumptionLog || [];
    const existingEntry = existingLog.find(
      l => l.date === selectedDate && l.shift === selectedShift
    );

    const newLogEntry = chip
      ? {
          date:     selectedDate,
          shift:    selectedShift,
          consumed: updateData.consumed_this_shift,
          status:   updateData.remaining_after <= 0 ? 'Consumed' : 'Partially Consumed',
        }
      : {
          date:             selectedDate,
          shift:            selectedShift,
          consumed:         0,
          status:           updateData.consumption_type === 'fully' ? 'Consumed' : 'Partially Consumed',
          consumption_type: updateData.consumption_type,
        };

    const newLog = existingEntry
      ? existingLog.map(l =>
          l.date === selectedDate && l.shift === selectedShift ? newLogEntry : l
        )
      : [...existingLog, newLogEntry];

    // Build the update payload for App.jsx
    const updates = {
      shiftConsumptionLog: newLog,
      updated_at:          new Date().toISOString(),
    };

    if (chip) {
      // App.jsx reads consumed_this_update to adjust consumed_quantity / remaining_quantity
      updates.consumed_this_update = updateData.consumed_this_update;
      updates.carry_over           = updateData.remaining_after > 0;
    } else {
      updates.carry_over = updateData.consumption_type === 'partially';
      if (updateData.consumption_type === 'fully') {
        updates.status             = 'Consumed';
        updates.consumed_quantity  = box.quantity || 0;
        updates.remaining_quantity = 0;
      } else {
        // Partially consumed — keep status as in-production, carry forward
        updates.status = 'Material In Production';
      }
    }

    if (updateData.remarks !== undefined) updates.remarks = updateData.remarks;

    onUpdateBoxConsumption(boxId, updates);
    setEditingBox(null);
  };

  // ── Summary save ──────────────────────────────────────────────────────────
  const handleSaveSummary = () => {
    const errs    = {};
    const qcGood  = parseInt(shiftSummary.qc_good)  || 0;
    const wastage = parseInt(shiftSummary.wastage)   || 0;
    if (qcGood  < 0) errs.qc_good  = 'Cannot be negative';
    if (wastage < 0) errs.wastage  = 'Cannot be negative';
    setSummaryErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (onUpdateShiftSummary) {
      onUpdateShiftSummary(selectedDate, selectedShift, {
        ...shiftSummary,
        chips_used: autoChipsUsed,
        qc_good:    qcGood,
        wastage,
      });
    }
    setIsEditingSummary(false);
    setManualEditUnlocked(false); // auto re-lock once summary is saved
  };

  const handleSummaryChange = (field, value) => {
    setShiftSummary(prev => ({ ...prev, [field]: field === 'remarks' ? value : parseInt(value) || 0 }));
    setSummaryErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleCancelEdit = () => {
    setShiftSummary(getExistingSummary(selectedDate, selectedShift));
    setIsEditingSummary(false);
    setSummaryErrors({});
  };

  // ── Row status for display ────────────────────────────────────────────────
  const getBoxShiftStatus = (box) => {
    const isNative = box.issue_date === selectedDate && box.issue_shift === selectedShift;
    const logEntry = (box.shiftConsumptionLog || []).find(
      l => l.date === selectedDate && l.shift === selectedShift
    );
    if (logEntry) {
      if (logEntry.status === 'Consumed')           return 'Consumed This Shift';
      if (logEntry.status === 'Partially Consumed') return 'Partially Consumed';
      return 'Updated';
    }
    if (!isNative) return 'Carry-Over (Pending)';
    if (box.status === 'Consumed') return 'Consumed';
    return 'Needs Update';
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Production Floor</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isReadOnly
              ? 'Shift completed — viewing in read-only mode'
              : 'Live shift tracking and material consumption'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Pending warning — only in edit mode */}
          {!isReadOnly && pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="text-sm font-medium text-orange-800">
                {pendingCount} box{pendingCount !== 1 ? 'es' : ''} pending update
              </span>
            </div>
          )}

          {/* Read-only badge + Edit Shift button */}
          {isReadOnly && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200">
                <Lock className="w-3 h-3" /> Shift Complete
              </span>
              <button
                onClick={() => setManualEditUnlocked(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Unlock className="w-3 h-3" /> Edit Shift
              </button>
            </div>
          )}

          {/* Re-lock button — shown when user has manually unlocked a completed shift */}
          {isShiftComplete && manualEditUnlocked && (
            <button
              onClick={() => { setManualEditUnlocked(false); setIsEditingSummary(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Lock className="w-3 h-3" /> Lock Shift
            </button>
          )}
        </div>
      </div>

      {/* Read-only info banner */}
      {isReadOnly && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">Shift closed.</span>{' '}
            All boxes updated and summary saved. Click{' '}
            <span className="font-semibold">Edit Shift</span> in the top-right to make corrections.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT ─────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Issued Boxes Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Issued Boxes</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {nativeBoxes.length} issued to this shift
                  {shiftBoxes.length - nativeBoxes.length > 0 && (
                    <span className="text-amber-600 ml-2">
                      · {shiftBoxes.length - nativeBoxes.length} carry-over
                    </span>
                  )}
                  {chipBoxes.length > 0 && (
                    <span className="ml-2 text-blue-600">
                      · {totalRemaining.toLocaleString()} chips remaining
                    </span>
                  )}
                </p>
              </div>
              {shiftBoxes.length > 0 && (
                <div className="flex gap-1.5">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {chipBoxes.length} Chip
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    {shiftBoxes.filter(b => (b.item_type || b.item_name || '').toLowerCase() === 'tape').length} Tape
                  </span>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    {shiftBoxes.filter(b => (b.item_type || b.item_name || '').toLowerCase() === 'sheet').length} Sheet
                  </span>
                </div>
              )}
            </div>

            {shiftBoxes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-5 py-3 text-left  text-xs font-semibold text-gray-400 uppercase tracking-wide">Box</th>
                      <th className="px-4 py-3 text-left  text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Consumed</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Remaining</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">This Shift</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                      {!isReadOnly && (
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shiftBoxes.map(box => {
                      const chip          = isChipBox(box);
                      const totalQty      = box.quantity || 0;
                      const consumed      = box.consumed_quantity || 0;
                      const remaining     = boxRemaining(box);
                      const shiftConsumed = getShiftConsumed(box);
                      const isNative      = box.issue_date === selectedDate && box.issue_shift === selectedShift;
                      const shiftStatus   = getBoxShiftStatus(box);
                      const hasLog        = (box.shiftConsumptionLog || []).some(
                        l => l.date === selectedDate && l.shift === selectedShift
                      );
                      const needsUpdate   = !hasLog && box.status !== 'Consumed';

                      const rowBg =
                        shiftStatus === 'Consumed This Shift'  ? 'bg-gray-50/40'  :
                        shiftStatus === 'Partially Consumed'   ? 'bg-amber-50/30' :
                        !isNative                              ? 'bg-amber-50/20' :
                        needsUpdate                            ? 'bg-orange-50/20': '';

                      return (
                        <tr key={box.id} className={`hover:bg-gray-50 transition-colors ${rowBg}`}>

                          {/* Box name */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              {needsUpdate && isNative && (
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                              )}
                              <span className="font-medium text-sm text-gray-900">{box.box_name}</span>
                              {!isNative && (
                                <span className="px-1.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded">
                                  carry-over
                                </span>
                              )}
                            </div>
                            {!isNative && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Issued: {box.issue_date} {box.issue_shift}
                              </p>
                            )}
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${itemBadge(box.item_type || box.item_name)}`}>
                              {box.item_type || box.item_name}
                            </span>
                          </td>

                          {/* Total — always box.quantity */}
                          <td className="px-4 py-3.5 text-right font-semibold text-gray-700">
                            {totalQty.toLocaleString()}
                          </td>

                          {/* Consumed — running total across all shifts */}
                          <td className="px-4 py-3.5 text-right">
                            {chip ? (
                              <span className={`font-semibold ${consumed > 0 ? 'text-orange-700' : 'text-gray-300'}`}>
                                {consumed > 0 ? consumed.toLocaleString() : '—'}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Remaining — chips left overall */}
                          <td className="px-4 py-3.5 text-right">
                            {chip ? (
                              <span className={`font-semibold ${
                                remaining === 0            ? 'text-gray-400' :
                                remaining < totalQty * 0.2 ? 'text-red-600'  : 'text-emerald-700'
                              }`}>
                                {remaining.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* This Shift — what was logged for this specific shift */}
                          <td className="px-4 py-3.5 text-right">
                            {chip ? (
                              <span className={`font-semibold ${shiftConsumed > 0 ? 'text-blue-700' : 'text-gray-300'}`}>
                                {shiftConsumed > 0 ? shiftConsumed.toLocaleString() : '—'}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">
                                {shiftStatus === 'Consumed This Shift' ? 'Full'
                                  : shiftStatus === 'Partially Consumed' ? 'Partial'
                                  : '—'}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 text-center">
                            <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                              shiftStatus === 'Consumed This Shift'  ? 'bg-gray-100 text-gray-500'       :
                              shiftStatus === 'Partially Consumed'   ? 'bg-amber-100 text-amber-700'     :
                              shiftStatus === 'Updated'              ? 'bg-emerald-100 text-emerald-700' :
                              shiftStatus === 'Carry-Over (Pending)' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                              needsUpdate                            ? 'bg-orange-100 text-orange-700'   :
                                                                       'bg-blue-100 text-blue-700'
                            }`}>
                              {shiftStatus}
                            </span>
                          </td>

                          {/* Action — hidden in read-only mode */}
                          {!isReadOnly && (
                          <td className="px-5 py-3.5 text-center">
                            {box.status === 'Consumed' && shiftStatus === 'Consumed This Shift' ? (
                              <span className="text-xs text-gray-300">—</span>
                            ) : (
                              <button
                                onClick={() => setEditingBox(box)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors ${
                                  needsUpdate ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                              >
                                <Edit className="w-3 h-3" />
                                {needsUpdate ? 'Update*' : 'Update'}
                              </button>
                            )}
                          </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Chip footer totals */}
                {chipBoxes.length > 0 && (
                  <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700">Chip summary — this shift</span>
                    <div className="flex items-center gap-6 text-xs font-semibold">
                      <span className="text-blue-700">
                        Used this shift: {autoChipsUsed.toLocaleString()}
                      </span>
                      <span className="text-orange-700">
                        Consumed (total): {totalConsumed.toLocaleString()}
                      </span>
                      <span className={totalRemaining > 0 ? 'text-emerald-700' : 'text-gray-400'}>
                        Remaining: {totalRemaining.toLocaleString()}
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

          {/* Shift Summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Shift Production Summary</p>
                <p className="text-xs text-gray-400 mt-0.5">{selectedDate} — {selectedShift} Shift</p>
              </div>
              {!isReadOnly && (!isEditingSummary ? (
                <button
                  onClick={() => setIsEditingSummary(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-3 h-3" /> {summaryExists ? 'Edit' : 'Add Summary'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleCancelEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  <button onClick={handleSaveSummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
              ))}
            </div>

            <div className="p-5 space-y-4">

              {/* Chips Used — auto-calculated, read-only */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">
                    Chips Used This Shift
                    <span className="ml-2 text-xs font-normal text-blue-500 normal-case">
                      (auto from box updates)
                    </span>
                  </p>
                  <p className="text-2xl font-bold text-blue-900">{autoChipsUsed.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-500">{chipBoxes.length} chip box{chipBoxes.length !== 1 ? 'es' : ''}</p>
                  <p className="text-xs text-blue-400 mt-0.5">Sum of this-shift log entries</p>
                </div>
              </div>

              {!isEditingSummary ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-medium text-emerald-600 mb-1">QC Approved</p>
                      <p className="text-2xl font-bold text-emerald-900">{(shiftSummary.qc_good || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-medium text-red-500 mb-1">Wastage</p>
                      <p className="text-2xl font-bold text-red-900">{(shiftSummary.wastage || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  {shiftSummary.remarks && (
                    <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <p className="text-xs font-medium text-gray-500 mb-1">Remarks</p>
                      <p className="text-sm text-gray-800">{shiftSummary.remarks}</p>
                    </div>
                  )}
                  {(shiftSummary.qc_good || 0) === 0 && (shiftSummary.wastage || 0) === 0 && (
                    <p className="text-xs text-gray-400 text-center py-1">
                      No summary saved yet — click Edit to record QC and wastage counts.
                    </p>
                  )}
                </>
              ) : (
                <>
                  {pendingCount > 0 && (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-orange-800">
                        <span className="font-semibold">{pendingCount} box{pendingCount !== 1 ? 'es' : ''} still pending.</span>{' '}
                        Update all boxes first for accurate chip count.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        QC Approved <span className="text-red-400">*</span>
                      </label>
                      <input type="number" min="0"
                        value={shiftSummary.qc_good || ''}
                        onChange={e => handleSummaryChange('qc_good', e.target.value)}
                        placeholder="0"
                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white ${summaryErrors.qc_good ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {summaryErrors.qc_good && <p className="mt-1 text-xs text-red-500">{summaryErrors.qc_good}</p>}
                      <p className="mt-1 text-xs text-gray-400">Cards that passed QC</p>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                        <X className="w-3.5 h-3.5 text-red-400" />
                        Wastage <span className="text-red-400">*</span>
                      </label>
                      <input type="number" min="0"
                        value={shiftSummary.wastage || ''}
                        onChange={e => handleSummaryChange('wastage', e.target.value)}
                        placeholder="0"
                        className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white ${summaryErrors.wastage ? 'border-red-300' : 'border-gray-200'}`}
                      />
                      {summaryErrors.wastage && <p className="mt-1 text-xs text-red-500">{summaryErrors.wastage}</p>}
                      <p className="mt-1 text-xs text-gray-400">QC rejected + in-process waste</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500">
                      QC Approved and Wastage don't need to match Chips Used — chips may be embedded but not yet QC checked at end of shift.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Remarks <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea value={shiftSummary.remarks || ''}
                      onChange={e => handleSummaryChange('remarks', e.target.value)}
                      rows={2} placeholder="Add shift notes..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Date & Shift selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Shift Context</p>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date
                </label>
                <input type="date" value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Clock className="w-3.5 h-3.5" /> Shift
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setSelectedShift('Day')}
                    className={`py-2.5 text-sm font-semibold rounded-lg transition-colors ${selectedShift === 'Day' ? 'bg-amber-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    ☀ Day
                  </button>
                  <button onClick={() => setSelectedShift('Night')}
                    className={`py-2.5 text-sm font-semibold rounded-lg transition-colors ${selectedShift === 'Night' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    ☽ Night
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-4 mt-4 border-t border-gray-100">
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-gray-900">{nativeBoxes.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Issued boxes</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center">
                <p className="text-lg font-bold text-gray-900">{assignedEmployees.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Team members</p>
              </div>
            </div>

            {nativeBoxes.length > 0 && (
              <div className={`mt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                allBoxesUpdated
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-orange-50 text-orange-800 border border-orange-200'
              }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${allBoxesUpdated ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                {allBoxesUpdated
                  ? 'All boxes updated for this shift'
                  : `${pendingCount} box${pendingCount !== 1 ? 'es' : ''} need shift update`}
              </div>
            )}

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

          {/* Shift log mini-list */}
          {shiftBoxes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">This Shift Log</p>
              <div className="space-y-2">
                {shiftBoxes.map(box => {
                  const sc = getShiftConsumed(box);
                  const chip = isChipBox(box);
                  const ss = getBoxShiftStatus(box);
                  return (
                    <div key={box.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          ss === 'Consumed This Shift'  ? 'bg-gray-400'  :
                          ss === 'Partially Consumed'   ? 'bg-amber-400' :
                          ss.includes('Carry')          ? 'bg-amber-300' : 'bg-orange-400'
                        }`} />
                        <span className="font-mono text-gray-700 truncate">{box.box_name}</span>
                      </div>
                      <span className={`font-semibold flex-shrink-0 ml-2 ${
                        chip && sc > 0              ? 'text-blue-700'    :
                        ss === 'Consumed This Shift' ? 'text-gray-500'   :
                        ss === 'Partially Consumed'  ? 'text-amber-600'  : 'text-gray-300'
                      }`}>
                        {chip
                          ? (sc > 0 ? sc.toLocaleString() : 'pending')
                          : ss === 'Consumed This Shift' ? 'full'
                          : ss === 'Partially Consumed'  ? 'partial'
                          : 'pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team */}
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

      {editingBox && (
        <UpdateBoxModal
          box={editingBox}
          selectedDate={selectedDate}
          selectedShift={selectedShift}
          onSave={handleUpdateBox}
          onClose={() => setEditingBox(null)}
        />
      )}
    </div>
  );
};

// ─── Update Box Modal ─────────────────────────────────────────────────────────
//
// Chip box quantities:
//   total     = box.quantity          (fixed — never changes)
//   consumed  = box.consumed_quantity (running total across ALL shifts)
//   remaining = total - consumed      (what's physically left)
//
// When opening:
//   - If this shift was previously logged, pre-fill with that value
//   - available = remaining + already_logged_this_shift
//     (so a re-update from 800→850 works correctly)
//
// On save, we send:
//   consumed_this_shift  = absolute number typed (stored in log)
//   consumed_this_update = consumed_this_shift - previously_logged_this_shift
//                          App.jsx adds this to consumed_quantity
//                          and subtracts from remaining_quantity
//
const UpdateBoxModal = ({ box, selectedDate, selectedShift, onSave, onClose }) => {
  const chip = isChipBox(box);

  const total    = box.quantity || 0;
  const consumed = box.consumed_quantity || 0;
  const remaining = boxRemaining(box); // total - consumed (or remaining_quantity if set)

  // Previous log entry for THIS shift (re-update scenario)
  const existingShiftEntry = (box.shiftConsumptionLog || []).find(
    l => l.date === selectedDate && l.shift === selectedShift
  );
  const prevLoggedThisShift = existingShiftEntry ? (existingShiftEntry.consumed || 0) : 0;

  // How many chips can the user enter for this shift:
  //   remaining + what they already logged this shift (undoing previous entry)
  const available = remaining + prevLoggedThisShift;

  const [consumedInput,   setConsumedInput]   = useState(prevLoggedThisShift > 0 ? String(prevLoggedThisShift) : '');
  const [consumptionType, setConsumptionType] = useState(existingShiftEntry?.consumption_type || '');
  const [remarks,         setRemarks]         = useState(box.remarks || '');
  const [error,           setError]           = useState('');

  const consumedThisShift = chip ? (parseInt(consumedInput) || 0) : 0;
  const newRemaining      = Math.max(0, available - consumedThisShift);
  // net_delta: how much the consumed_quantity should change globally
  const netDelta          = consumedThisShift - prevLoggedThisShift;

  // Preview: what total consumed will be after saving
  const newTotalConsumed  = consumed + netDelta;

  const handleSave = () => {
    setError('');
    if (chip) {
      if (!consumedInput || consumedThisShift <= 0) { setError('Enter consumed quantity'); return; }
      if (consumedThisShift > available) {
        setError(`Cannot exceed available (${available.toLocaleString()})`);
        return;
      }
      onSave(box.id, {
        consumed_this_shift:  consumedThisShift, // absolute — stored in log
        consumed_this_update: netDelta,          // signed delta — App.jsx uses this to update totals
        remaining_after:      newRemaining,
        remarks,
      });
    } else {
      if (!consumptionType) { setError('Select Fully or Partially Consumed'); return; }
      onSave(box.id, { consumption_type: consumptionType, remarks });
    }
  };

  const typeName  = box.item_type || box.item_name || '';
  const typeBadge =
    typeName.toLowerCase() === 'chip'  ? 'bg-blue-100 text-blue-800'      :
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
              <span className="text-xs text-gray-400">{selectedDate} · {selectedShift} Shift</span>
            </div>
            {prevLoggedThisShift > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Previously logged {prevLoggedThisShift.toLocaleString()} for this shift — will be replaced
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {chip ? (
            <>
              {/* Total / Consumed / Remaining — current state */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-gray-500 mb-0.5">Total</p>
                  <p className="text-base font-bold text-gray-900">{total.toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-orange-600 mb-0.5">Consumed</p>
                  <p className="text-base font-bold text-orange-800">{consumed.toLocaleString()}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-emerald-600 mb-0.5">Remaining</p>
                  <p className="text-base font-bold text-emerald-800">{remaining.toLocaleString()}</p>
                </div>
              </div>

              {/* Input */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-4 h-4" /> Consumed this shift
                  </span>
                  <span className="text-xs text-gray-400 font-normal">
                    Max {available.toLocaleString()}
                    {prevLoggedThisShift > 0 && ` (${remaining.toLocaleString()} remaining + ${prevLoggedThisShift.toLocaleString()} re-entering)`}
                  </span>
                </label>
                <input
                  type="number" min="0" max={available}
                  value={consumedInput}
                  onChange={e => { setConsumedInput(e.target.value); setError(''); }}
                  placeholder="Enter quantity"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xl font-bold bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-center"
                  autoFocus
                />
              </div>

              {/* After-save preview */}
              {consumedThisShift > 0 && consumedThisShift <= available && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-600 font-semibold mb-2">After saving:</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-gray-500 mb-0.5">This shift</p>
                      <p className="font-bold text-blue-900">{consumedThisShift.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-orange-600 mb-0.5">Consumed</p>
                      <p className="font-bold text-orange-800">{newTotalConsumed.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-emerald-600 mb-0.5">Remaining</p>
                      <p className="font-bold text-emerald-800">{newRemaining.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}

              {consumedThisShift > 0 && newRemaining > 0 && consumedThisShift <= available && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">{newRemaining.toLocaleString()} chips will remain</span> — box auto-carries to next shift.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Tape / Sheet */
            <>
              <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">Box quantity</span>
                <span className="text-lg font-bold text-gray-900">{total.toLocaleString()} units</span>
              </div>

              {existingShiftEntry && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Previously: <span className="font-semibold ml-1">
                    {existingShiftEntry.consumption_type === 'fully' ? 'Fully Consumed' : 'Partially Consumed'}
                  </span> — updating will replace.
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Consumption Status <span className="text-red-400">*</span>
                </p>
                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  consumptionType === 'fully' ? 'border-gray-700 bg-gray-50' : 'border-gray-200 hover:border-gray-400'
                }`}>
                  <input type="radio" name="cons_type" value="fully"
                    checked={consumptionType === 'fully'}
                    onChange={() => { setConsumptionType('fully'); setError(''); }}
                    className="w-4 h-4 text-gray-800"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Fully Consumed</p>
                    <p className="text-xs text-gray-500 mt-0.5">All material used — box lifecycle ends</p>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  consumptionType === 'partially' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
                }`}>
                  <input type="radio" name="cons_type" value="partially"
                    checked={consumptionType === 'partially'}
                    onChange={() => { setConsumptionType('partially'); setError(''); }}
                    className="w-4 h-4 text-amber-600"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Partially Consumed</p>
                    <p className="text-xs text-gray-500 mt-0.5">Material remains — auto-carries to next shift</p>
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
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
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

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <Save className="w-4 h-4" /> Save Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionFloor;