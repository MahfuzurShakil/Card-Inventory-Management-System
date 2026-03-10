import { useState } from 'react';
import { Plus, Search, Eye, Edit2, Calendar, Users, Sun, Moon, X, ChevronLeft, ChevronRight } from 'lucide-react';

const ROWS_PER_PAGE = 12;

// ── Helper: derive roster summary rows from flat productionAssignments ─────────
const buildRosters = (productionAssignments = []) => {
  // Group by date+shift
  const map = {};
  productionAssignments.forEach(a => {
    const key = `${a.assignment_date}__${a.shift}`;
    if (!map[key]) {
      map[key] = {
        date:     a.assignment_date,
        shift:    a.shift,
        segments: { Cutting: 0, Lamination: 0, Embedding: 0, 'Production QC': 0 },
        total:    0,
      };
    }
    map[key].total += 1;
    if (map[key].segments[a.work_segment] !== undefined) {
      map[key].segments[a.work_segment] += 1;
    }
  });

  // Sort descending by date then shift
  return Object.values(map).sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return a.shift === 'Day' ? -1 : 1;
  });
};

// ── Roster Detail Modal ────────────────────────────────────────────────────────
const RosterDetailModal = ({ roster, productionAssignments, employees, onClose, onEdit }) => {
  const assignments = productionAssignments.filter(
    a => a.assignment_date === roster.date && a.shift === roster.shift
  );

  const segments = ['Cutting', 'Lamination', 'Embedding', 'Production QC'];
  const segColors = {
    Cutting:          { bg: 'bg-blue-50',    text: 'text-blue-800',    dot: 'bg-blue-500',    border: 'border-blue-200'    },
    Lamination:       { bg: 'bg-purple-50',  text: 'text-purple-800',  dot: 'bg-purple-500',  border: 'border-purple-200'  },
    Embedding:        { bg: 'bg-orange-50',  text: 'text-orange-800',  dot: 'bg-orange-500',  border: 'border-orange-200'  },
    'Production QC':  { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {/* Modal header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">Shift Roster</h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                roster.shift === 'Day' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {roster.shift === 'Day' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                {roster.shift} Shift
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date(roster.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              &nbsp;·&nbsp; {roster.total} employees total
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segment tabs */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {segments.map(seg => {
            const c    = segColors[seg];
            const emps = assignments
              .filter(a => a.work_segment === seg)
              .map(a => employees.find(e => e.id === a.employee_id))
              .filter(Boolean);

            return (
              <div key={seg} className={`rounded-xl border ${c.border} overflow-hidden`}>
                <div className={`${c.bg} px-4 py-2.5 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{seg}</span>
                  </div>
                  <span className={`text-xs font-bold ${c.text}`}>{emps.length} assigned</span>
                </div>
                {emps.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {emps.map(emp => {
                      const initials = emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                      return (
                        <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className={`w-7 h-7 ${c.bg} border ${c.border} rounded-full flex items-center justify-center text-xs font-bold ${c.text} flex-shrink-0`}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-400">{emp.employee_id} · {emp.contact}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-3 italic">No employees assigned</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-3 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
            Close
          </button>
          <button
            onClick={() => { onClose(); onEdit(roster); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit This Roster
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const ShiftRosterList = ({ productionAssignments = [], employees = [], onCreateRoster, onEditRoster }) => {
  const [searchTerm, setSearchTerm]     = useState('');
  const [shiftFilter, setShiftFilter]   = useState('all');
  const [currentPage, setCurrentPage]   = useState(1);
  const [viewingRoster, setViewingRoster] = useState(null);

  const rosters = buildRosters(productionAssignments);

  const filtered = rosters.filter(r => {
    const dateStr = new Date(r.date + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const matchSearch = searchTerm === '' || dateStr.toLowerCase().includes(searchTerm.toLowerCase()) || r.date.includes(searchTerm);
    const matchShift  = shiftFilter === 'all' || r.shift === shiftFilter;
    return matchSearch && matchShift;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const pageStart  = (safePage - 1) * ROWS_PER_PAGE;
  const pageRows   = filtered.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const handleFilter = (setter) => (val) => { setter(val); setCurrentPage(1); };

  // Derive a sequential roster number (by original creation order: oldest = #1)
  const rosterNumber = (roster) => {
    const sorted = [...rosters].sort((a, b) => a.date.localeCompare(b.date) || (a.shift === 'Day' ? -1 : 1));
    return sorted.findIndex(r => r.date === roster.date && r.shift === roster.shift) + 1;
  };

  // Stats
  const totalDayShifts   = rosters.filter(r => r.shift === 'Day').length;
  const totalNightShifts = rosters.filter(r => r.shift === 'Night').length;
  const totalEmployeeSlots = rosters.reduce((s, r) => s + r.total, 0);

  const segColors = {
    Cutting:         { bg: 'bg-blue-100',    text: 'text-blue-800'    },
    Lamination:      { bg: 'bg-purple-100',  text: 'text-purple-800'  },
    Embedding:       { bg: 'bg-orange-100',  text: 'text-orange-800'  },
    'Production QC': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  };

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Shift Rosters</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {rosters.length} rosters &nbsp;·&nbsp; {totalDayShifts} Day &nbsp;·&nbsp; {totalNightShifts} Night
          </p>
        </div>
        <button
          onClick={onCreateRoster}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Roster
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by date (e.g. Jan 15, 2025)…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>
          <select
            value={shiftFilter}
            onChange={e => handleFilter(setShiftFilter)(e.target.value)}
            className="w-full md:w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Shifts</option>
            <option value="Day">Day Shift</option>
            <option value="Night">Night Shift</option>
          </select>
          {(searchTerm || shiftFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setShiftFilter('all'); setCurrentPage(1); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length > 0 ? (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Shift #</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Shift</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Employees</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Breakdown</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map(roster => {
                  const num       = rosterNumber(roster);
                  const dateLabel = new Date(roster.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

                  return (
                    <tr key={`${roster.date}-${roster.shift}`} className="hover:bg-gray-50 transition-colors">

                      {/* Shift # */}
                      <td className="px-5 py-4">
                        <span className="font-mono text-sm font-bold text-gray-700">#{String(num).padStart(3, '0')}</span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">{dateLabel}</span>
                        </div>
                      </td>

                      {/* Shift badge */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          roster.shift === 'Day'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {roster.shift === 'Day' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                          {roster.shift}
                        </span>
                      </td>

                      {/* Total employees */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm font-bold text-gray-900">{roster.total}</span>
                          <span className="text-xs text-gray-400">employees</span>
                        </div>
                      </td>

                      {/* Segment breakdown mini-pills */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(roster.segments)
                            .filter(([, count]) => count > 0)
                            .map(([seg, count]) => {
                              const c = segColors[seg] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                              return (
                                <span key={seg} className={`px-2 py-0.5 rounded text-xs font-semibold ${c.bg} ${c.text}`}>
                                  {seg.split(' ')[0]} {count}
                                </span>
                              );
                            })}
                          {Object.values(roster.segments).every(v => v === 0) && (
                            <span className="text-xs text-gray-400 italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewingRoster(roster)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => onEditRoster(roster)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Showing <span className="font-semibold text-gray-600">{pageStart + 1}–{Math.min(pageStart + ROWS_PER_PAGE, filtered.length)}</span>{' '}
                of <span className="font-semibold text-gray-600">{filtered.length}</span> rosters
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
                  .map((item, idx) =>
                    item === '…' ? (
                      <span key={`e-${idx}`} className="px-1 text-xs text-gray-400">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`min-w-[30px] h-[30px] px-2 rounded-lg text-xs font-semibold border transition-colors ${
                          safePage === item ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
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
              <Calendar className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400 mb-1">
              {searchTerm || shiftFilter !== 'all' ? 'No rosters match your filters' : 'No shift rosters created yet'}
            </p>
            {!searchTerm && shiftFilter === 'all' && (
              <button
                onClick={onCreateRoster}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Roster
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Roster detail modal ──────────────────────────────────────────── */}
      {viewingRoster && (
        <RosterDetailModal
          roster={viewingRoster}
          productionAssignments={productionAssignments}
          employees={employees}
          onClose={() => setViewingRoster(null)}
          onEdit={(r) => { setViewingRoster(null); onEditRoster(r); }}
        />
      )}
    </div>
  );
};

export default ShiftRosterList;