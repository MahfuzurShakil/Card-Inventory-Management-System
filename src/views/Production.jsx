import { useState, useMemo } from 'react';
import {
  Factory, Calendar, Users, Package, CheckCircle, XCircle, Eye,
  Search, Filter, ChevronLeft, ChevronRight, TrendingUp, AlertCircle,
  Edit, AlertTriangle, Hash
} from 'lucide-react';

const Production = ({
  productionShifts = [],
  subBoxes = [],
  productionAssignments,
  employees,
  onNavigate,
  shiftSummaries = [],
  boxes = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Aggregate production data ─────────────────────────────────────────────
  const productionData = useMemo(() => {
    const grouped = {};

    // From shift summaries (source of truth — saved from Production Floor)
    shiftSummaries.forEach(summary => {
      const key = `${summary.date}_${summary.shift}`;
      grouped[key] = {
        date:             summary.date,
        shift:            summary.shift,
        chips_used:       summary.chips_used ?? summary.finished_product ?? 0,
        finished_product: summary.chips_used ?? summary.finished_product ?? 0,
        qc_good:          summary.qc_good   || 0,
        wastage:          summary.wastage   || 0,
        employee_count:   0,
        summary_saved:    true,
        remarks:          summary.remarks   || '',
      };
    });

    // From productionShifts (backward compat — only if not already from shiftSummaries)
    productionShifts.forEach(shift => {
      const key = `${shift.date}_${shift.shift}`;
      if (!grouped[key]) {
        grouped[key] = {
          date:             shift.date,
          shift:            shift.shift,
          chips_used:       shift.finished_product_count || 0,
          finished_product: shift.finished_product_count || 0,
          qc_good:          shift.qc_approved_count      || 0,
          wastage:          shift.wastage_count          || 0,
          employee_count:   0,
          summary_saved:    false,
          remarks:          '',
        };
      }
    });

    // From subBoxes — also ensures shifts with sub-boxes appear even if no summary
    subBoxes.forEach(subBox => {
      const key = `${subBox.production_date}_${subBox.shift}`;
      if (!grouped[key]) {
        grouped[key] = {
          date:             subBox.production_date,
          shift:            subBox.shift,
          chips_used:       0,
          finished_product: 0,
          qc_good:          0,
          wastage:          0,
          employee_count:   0,
          summary_saved:    false,
          remarks:          '',
        };
      }
    });

    // Employee count from assignments
    productionAssignments.forEach(a => {
      const key = `${a.assignment_date}_${a.shift}`;
      if (grouped[key]) grouped[key].employee_count += 1;
    });

    // Pending-box count: native boxes for this date+shift that need update
    Object.keys(grouped).forEach(key => {
      const [date, shift] = key.split('_');
      const pendingCount = boxes.filter(b =>
        b.issue_date  === date &&
        b.issue_shift === shift &&
        !b.shift_updated &&
        b.status !== 'Consumed'
      ).length;
      grouped[key].pending_boxes = pendingCount;
    });

    return Object.values(grouped).sort((a, b) => {
      const dc = new Date(b.date) - new Date(a.date);
      if (dc !== 0) return dc;
      return a.shift === 'Day' ? -1 : 1;
    });
  }, [productionShifts, subBoxes, productionAssignments, shiftSummaries, boxes]);

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredData = productionData.filter(item => {
    const matchSearch = searchTerm === '' ||
      item.date.includes(searchTerm) ||
      item.shift.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDate  = dateFilter === '' || item.date === dateFilter;
    const matchShift = shiftFilter === 'all' || item.shift === shiftFilter;
    return matchSearch && matchDate && matchShift;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (setter) => (value) => { setter(value); setCurrentPage(1); };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalChipsUsed = filteredData.reduce((s, i) => s + (i.chips_used || 0), 0);
  const totalQCGood    = filteredData.reduce((s, i) => s + i.qc_good, 0);
  const totalWastage   = filteredData.reduce((s, i) => s + i.wastage, 0);
  const wastageRate    = totalChipsUsed > 0
    ? ((totalWastage / totalChipsUsed) * 100).toFixed(1) : 0;

  const handleGoToFloor = (date, shift) => {
    onNavigate('production-floor', null, null, null, null, null, { date, shift });
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor production output by shift and date</p>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Chips Used</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalChipsUsed.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Hash className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">QC Approved</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{totalQCGood.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Wastage</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{totalWastage.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Wastage Rate</p>
              <p className={`text-2xl font-bold mt-1 ${parseFloat(wastageRate) > 5 ? 'text-red-700' : 'text-emerald-700'}`}>
                {wastageRate}%
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              parseFloat(wastageRate) > 5 ? 'bg-red-100' : 'bg-emerald-100'
            }`}>
              <Factory className={`w-6 h-6 ${parseFloat(wastageRate) > 5 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by date or shift..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={e => handleFilterChange(setSearchTerm)(e.target.value)}
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={e => handleFilterChange(setDateFilter)(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={shiftFilter}
            onChange={e => handleFilterChange(setShiftFilter)(e.target.value)}
          >
            <option value="all">All Shifts</option>
            <option value="Day">Day Shift</option>
            <option value="Night">Night Shift</option>
          </select>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shift</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Employees</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">QC Approved</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Wastage</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Chips Used</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => {
                  const qcRate = item.chips_used > 0
                    ? ((item.qc_good / item.chips_used) * 100).toFixed(1) : 0;
                  const wastagePercent = item.chips_used > 0
                    ? ((item.wastage / item.chips_used) * 100).toFixed(1) : 0;
                  const hasPending    = (item.pending_boxes || 0) > 0;
                  const summaryMissing = !item.summary_saved;

                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">

                      {/* Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {new Date(item.date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Shift */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          item.shift === 'Day'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {item.shift === 'Day' ? '☀' : '☽'} {item.shift} Shift
                        </span>
                      </td>

                      {/* Employees */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{item.employee_count}</span>
                        </div>
                      </td>

                      {/* QC Approved */}
                      <td className="px-6 py-4 text-right">
                        {item.summary_saved ? (
                          <div>
                            <span className="font-semibold text-emerald-700">{item.qc_good.toLocaleString()}</span>
                            <p className="text-xs text-gray-400 mt-0.5">{qcRate}% pass rate</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 italic">—</span>
                        )}
                      </td>

                      {/* Wastage */}
                      <td className="px-6 py-4 text-right">
                        {item.summary_saved ? (
                          <div>
                            <span className={`font-semibold ${parseFloat(wastagePercent) > 5 ? 'text-red-700' : 'text-gray-700'}`}>
                              {item.wastage.toLocaleString()}
                            </span>
                            <p className={`text-xs mt-0.5 ${parseFloat(wastagePercent) > 5 ? 'text-red-400' : 'text-gray-400'}`}>
                              {wastagePercent}%
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 italic">—</span>
                        )}
                      </td>

                      {/* Chips Used */}
                      <td className="px-6 py-4 text-right">
                        {item.summary_saved ? (
                          <span className="font-semibold text-blue-700">{(item.chips_used || 0).toLocaleString()}</span>
                        ) : (
                          <span className="text-xs text-gray-300 italic">—</span>
                        )}
                      </td>

                      {/* Status + Actions */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1.5">
                          {/* Status indicator */}
                          {hasPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                              <AlertTriangle className="w-3 h-3" /> {item.pending_boxes} boxes pending
                            </span>
                          ) : summaryMissing ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3" /> Summary needed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-3 h-3" /> Complete
                            </span>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1 mt-0.5">
                            <button
                              onClick={() => handleGoToFloor(item.date, item.shift)}
                              title="View on Production Floor"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                            {(hasPending || summaryMissing) && (
                              <button
                                onClick={() => handleGoToFloor(item.date, item.shift)}
                                title="Update production summary or box statuses"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"
                              >
                                <Edit className="w-3 h-3" /> Update
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Factory className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">
                      {searchTerm || dateFilter || shiftFilter !== 'all'
                        ? 'No production data found matching your filters.'
                        : 'No production shifts recorded yet.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span>–
              <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredData.length)}</span> of{' '}
              <span className="font-medium">{filteredData.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {filteredData.length === 0 && productionData.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Filter className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              No results for current filters. <span className="font-medium">{productionData.length} shifts</span> total in the system.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Production;