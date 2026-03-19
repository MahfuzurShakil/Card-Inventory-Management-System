import { useState, useMemo } from 'react';
import {
  ChevronRight, Scan, Package, AlertCircle, Calendar, Clock,
  Users, X, CheckCircle, Plus, Cpu, Layers, AlertTriangle
} from 'lucide-react';

// ─── Helper ───────────────────────────────────────────────────────────────────
const isChipBox = (box) =>
  (box.item_type || '').toLowerCase() === 'chip' ||
  (box.item_name || '').toLowerCase() === 'chip';

// Check if a box has been updated for a specific date+shift using shiftConsumptionLog
const boxHasLogEntry = (box, date, shift) =>
  (box.shiftConsumptionLog || []).some(l => l.date === date && l.shift === shift);

const ProductionIssue = ({ boxes, employees, productionAssignments, onIssueBoxes, onBack }) => {
  const today = new Date().toISOString().split('T')[0];

  const [barcodeInput, setBarcodeInput]   = useState('');
  const [selectedShift, setSelectedShift] = useState('Day');
  const [issueDate, setIssueDate]         = useState(today);
  const [scannedBoxes, setScannedBoxes]   = useState([]);
  const [error, setError]                 = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ── Prior-shift gate ──────────────────────────────────────────────────────
  // Find boxes that were issued to a previous shift but have NOT been logged
  // (no shiftConsumptionLog entry for their issue_date + issue_shift).
  // A box is "done" if:
  //   - it is fully Consumed (status === 'Consumed'), OR
  //   - it has a shiftConsumptionLog entry for its issue shift
  const priorShiftPendingBoxes = useMemo(() => {
    // Collect all boxes currently in production (not yet consumed globally)
    // that were issued to a shift OTHER than the current issueDate+selectedShift
    const inProductionBoxes = boxes.filter(b => {
      const isCurrentShift = b.issue_date === issueDate && b.issue_shift === selectedShift;
      if (isCurrentShift) return false;
      if (!b.issue_date || !b.issue_shift) return false;
      // Only care about boxes that are still active (not fully consumed)
      if (b.status === 'Consumed') return false;
      return b.status === 'Material In Production';
    });

    if (inProductionBoxes.length === 0) return [];

    // Find the most recent prior shift
    const sorted = [...inProductionBoxes].sort((a, b) => {
      const dateDiff = new Date(b.issue_date) - new Date(a.issue_date);
      if (dateDiff !== 0) return dateDiff;
      // Night shift is "later" than Day shift on the same date
      return a.issue_shift === 'Night' ? -1 : 1;
    });

    const latestDate  = sorted[0].issue_date;
    const latestShift = sorted[0].issue_shift;

    // From that latest prior shift, find boxes that haven't been logged yet
    return inProductionBoxes.filter(b =>
      b.issue_date  === latestDate &&
      b.issue_shift === latestShift &&
      !boxHasLogEntry(b, latestDate, latestShift)
    );
  }, [boxes, issueDate, selectedShift]);

  const priorShiftBlocked = priorShiftPendingBoxes.length > 0;
  const priorShiftLabel   = priorShiftPendingBoxes.length > 0
    ? `${priorShiftPendingBoxes[0].issue_date} — ${priorShiftPendingBoxes[0].issue_shift} Shift`
    : '';

  // ── Available "In Stock" boxes ────────────────────────────────────────────
  const availableBoxes = boxes.filter(b => b.status === 'Material In Stock');

  // ── Carry-over chip boxes (partial remaining from any prior shift) ────────
  const carryOverBoxes = useMemo(() =>
    boxes.filter(b => {
      if (!isChipBox(b)) return false;
      if (b.status === 'Consumed') return false;
      if (b.status !== 'Material In Production') return false;
      // Must have remaining chips
      const remaining = b.remaining_quantity ?? Math.max(0, (b.quantity || 0) - (b.consumed_quantity || 0));
      return remaining > 0;
    }).sort((a, b) => {
      const remA = a.remaining_quantity ?? Math.max(0, (a.quantity || 0) - (a.consumed_quantity || 0));
      const remB = b.remaining_quantity ?? Math.max(0, (b.quantity || 0) - (b.consumed_quantity || 0));
      return remA - remB;
    }),
    [boxes]
  );

  // ── Shift assignments ─────────────────────────────────────────────────────
  const shiftAssignments = productionAssignments.filter(
    a => a.assignment_date === issueDate && a.shift === selectedShift
  );

  const teamsBySegment = { Cutting: [], Lamination: [], Embedding: [], QC: [] };
  shiftAssignments.forEach(a => {
    const employee = employees.find(e => e.id === a.employee_id);
    if (employee && teamsBySegment[a.work_segment]) {
      teamsBySegment[a.work_segment].push({
        ...a,
        employee_name:       employee.name,
        employee_id_number:  employee.employee_id,
        expertise:           employee.expertise,
      });
    }
  });

  // ── Scan handler ──────────────────────────────────────────────────────────
  const handleScan = () => {
    setError('');
    if (!barcodeInput.trim()) { setError('Please enter a barcode'); return; }
    if (scannedBoxes.find(b => b.barcode === barcodeInput.trim())) {
      setError('This box has already been scanned');
      setBarcodeInput('');
      return;
    }
    const box = boxes.find(b => b.barcode === barcodeInput.trim());
    if (!box) { setError(`Box not found: ${barcodeInput}`); return; }

    if (box.status === 'Consumed') {
      setError(`This box is fully consumed and cannot be re-issued.`);
      return;
    }
    if (box.status !== 'Material In Stock' && box.status !== 'Material In Production') {
      setError(`Cannot issue box with status "${box.status}".`);
      return;
    }
    // For chip carry-overs: check there are remaining chips
    if (box.status === 'Material In Production' && isChipBox(box)) {
      const remaining = box.remaining_quantity ?? Math.max(0, (box.quantity || 0) - (box.consumed_quantity || 0));
      if (remaining <= 0) {
        setError('This chip box is fully consumed and has no remaining chips.');
        return;
      }
    }
    if (shiftAssignments.length === 0) {
      setError(`No employees assigned to ${selectedShift} shift on ${issueDate}. Please assign employees first.`);
      return;
    }
    setScannedBoxes(prev => [...prev, box]);
    setBarcodeInput('');
  };

  const handleAutoAddSuggested = (box) => {
    if (scannedBoxes.find(b => b.id === box.id)) { setError('Already in list'); return; }
    setScannedBoxes(prev => [...prev, box]);
    setError('');
  };

  const handleRemoveBox = (boxId) => {
    setScannedBoxes(prev => prev.filter(b => b.id !== boxId));
    setError('');
  };

  const handleConfirmIssue = () => {
    const chipInList = scannedBoxes.filter(isChipBox);
    if (chipInList.length === 0) { setError('At least 1 Chip box is required.'); return; }

    const issueData = {
      box_ids:    scannedBoxes.map(b => b.id),
      issue_date: issueDate,
      shift:      selectedShift,
      issued_by:  'Store Keeper',
      issued_at:  new Date().toISOString(),
    };
    onIssueBoxes(issueData);
    setSuccessMessage(`Successfully issued ${scannedBoxes.length} box${scannedBoxes.length !== 1 ? 'es' : ''} to ${selectedShift} shift!`);
    setScannedBoxes([]);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleScan(); };

  const chipBoxes  = scannedBoxes.filter(b => isChipBox(b));
  const tapeBoxes  = scannedBoxes.filter(b => (b.item_name || b.item_type || '').toLowerCase() === 'tape');
  const sheetBoxes = scannedBoxes.filter(b => (b.item_name || b.item_type || '').toLowerCase() === 'sheet');

  const itemColor = (name) => {
    const n = (name || '').toLowerCase();
    if (n === 'chip')  return 'bg-blue-100 text-blue-800';
    if (n === 'tape')  return 'bg-purple-100 text-purple-800';
    if (n === 'sheet') return 'bg-emerald-100 text-emerald-800';
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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Issue to Production</h1>
          <p className="text-sm text-gray-400">Scan material boxes and assign to shift</p>
        </div>
      </div>

      {/* ── Prior-shift gate banner ──────────────────────────────────────────── */}
      {priorShiftBlocked && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-900">
              Previous shift boxes not fully updated
            </p>
            <p className="text-xs text-red-700 mt-0.5">
              <span className="font-medium">{priorShiftPendingBoxes.length} box{priorShiftPendingBoxes.length !== 1 ? 'es' : ''}</span> from{' '}
              <span className="font-medium">{priorShiftLabel}</span> still need consumption updates on the Production Floor.
              Please update those boxes before issuing materials for the new shift.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {priorShiftPendingBoxes.slice(0, 6).map(b => (
                <span key={b.id} className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded font-mono">{b.box_name}</span>
              ))}
              {priorShiftPendingBoxes.length > 6 && (
                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">+{priorShiftPendingBoxes.length - 6} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Success banner ───────────────────────────────────────────────────── */}
      {successMessage && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-900">{successMessage}</p>
        </div>
      )}

      {/* ── Two-column layout ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: Scan + Boxes ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-0 bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Scan bar */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Scan className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Scan Box Barcode</p>
                <p className="text-xs text-gray-400">Use scanner or type manually, then press Enter</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Scan or type barcode here..."
                disabled={priorShiftBlocked}
                className={`flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all ${
                  priorShiftBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                autoFocus={!priorShiftBlocked}
              />
              <button
                onClick={handleScan}
                disabled={priorShiftBlocked}
                className={`px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                  priorShiftBlocked
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Add Box
              </button>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* ── Carry-over chip boxes suggestion ─────────────────────────────── */}
          {!priorShiftBlocked && carryOverBoxes.filter(s => !scannedBoxes.find(b => b.id === s.id)).length > 0 && (
            <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-100">
              <p className="text-xs font-semibold text-amber-800 mb-2.5 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                Carry-over chip boxes — finish these first
              </p>
              <div className="flex flex-col gap-2">
                {carryOverBoxes
                  .filter(s => !scannedBoxes.find(b => b.id === s.id))
                  .slice(0, 4)
                  .map(box => {
                    const totalQty   = box.quantity || 0;
                    const remaining  = box.remaining_quantity ?? Math.max(0, totalQty - (box.consumed_quantity || 0));
                    const pct        = totalQty > 0 ? Math.round((remaining / totalQty) * 100) : 0;
                    return (
                      <button
                        key={box.id}
                        onClick={() => handleAutoAddSuggested(box)}
                        className="flex items-center gap-3 px-3 py-2.5 bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl text-xs transition-colors group text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{box.box_name}</span>
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded">carry-over</span>
                            {box.issue_date && (
                              <span className="text-gray-400">from {box.issue_date} {box.issue_shift}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-amber-400 rounded-full h-1.5 transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-gray-600 font-medium whitespace-nowrap">
                              {remaining.toLocaleString()} / {totalQty.toLocaleString()} remaining
                            </span>
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-amber-600 group-hover:text-amber-800 flex-shrink-0" />
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Scanned boxes list */}
          {scannedBoxes.length > 0 ? (
            <>
              {/* Summary pills */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600">
                  {scannedBoxes.length} box{scannedBoxes.length !== 1 ? 'es' : ''} queued
                </p>
                <div className="flex gap-1.5">
                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                    chipBoxes.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'}`}>
                    Chip {chipBoxes.length}{chipBoxes.length === 0 && ' ✗'}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    Tape {tapeBoxes.length}
                  </span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                    Sheet {sheetBoxes.length}
                  </span>
                </div>
              </div>

              {/* Box rows */}
              <div className="divide-y divide-gray-100">
                {scannedBoxes.map(box => {
                  const isCarryOver = box.status === 'Material In Production';
                  const remaining   = isCarryOver
                    ? (box.remaining_quantity ?? Math.max(0, (box.quantity || 0) - (box.consumed_quantity || 0)))
                    : (box.quantity || 0);
                  const typeName    = box.item_name || box.item_type || '';

                  return (
                    <div key={box.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${itemColor(typeName)}`}>
                        <Package className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{box.box_name}</p>
                          <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${itemColor(typeName)}`}>
                            {typeName}
                          </span>
                          {isCarryOver && (
                            <span className="px-1.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded">
                              carry-over
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isChipBox(box)
                            ? `${remaining.toLocaleString()} chips ${isCarryOver ? 'remaining' : 'total'}`
                            : `${(box.quantity || 0).toLocaleString()} units`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveBox(box.id)}
                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Confirm button */}
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={handleConfirmIssue}
                  disabled={chipBoxes.length === 0 || priorShiftBlocked}
                  className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors shadow-sm ${
                    chipBoxes.length === 0 || priorShiftBlocked
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {chipBoxes.length === 0
                    ? 'Chip box required'
                    : `Issue ${scannedBoxes.length} Box${scannedBoxes.length !== 1 ? 'es' : ''} to ${selectedShift} Shift`}
                </button>
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-14">
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <Package className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">No boxes scanned yet</p>
              <p className="text-xs text-gray-300 mt-1">
                {priorShiftBlocked ? 'Resolve prior shift updates first' : 'Scan a barcode above to begin'}
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Shift context + Team ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Date & Shift selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Issue Context</p>
            <div className="space-y-4">

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Issue Date
                </label>
                <input
                  type="date" value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
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

              {/* Gate status */}
              <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                priorShiftBlocked
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${priorShiftBlocked ? 'bg-red-400' : 'bg-emerald-500'}`} />
                {priorShiftBlocked
                  ? `Blocked — ${priorShiftPendingBoxes.length} prior-shift box${priorShiftPendingBoxes.length !== 1 ? 'es' : ''} need update on Production Floor`
                  : 'Ready to issue'}
              </div>

              {/* Assignment status */}
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium ${
                shiftAssignments.length > 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${shiftAssignments.length > 0 ? 'bg-emerald-500' : 'bg-red-400'}`} />
                {shiftAssignments.length > 0
                  ? `${shiftAssignments.length} employees assigned`
                  : 'No employees assigned to this shift'}
              </div>
            </div>
          </div>

          {/* Team by segment */}
          {shiftAssignments.length > 0 && (
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
                {Object.entries(teamsBySegment).some(([, m]) => m.length === 0) && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">Not assigned:</p>
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

          {shiftAssignments.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No team assigned</p>
              <p className="text-xs text-gray-400 mt-1">Assign employees to this shift before issuing materials</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionIssue;