import { useState, useMemo } from 'react';
import { Factory, Calendar, Users, Package, CheckCircle, XCircle, Eye, Search, Filter, ChevronLeft, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react';

const Production = ({ productionShifts = [], subBoxes = [], productionAssignments, employees, onNavigate, shiftSummaries = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // UPDATED: Aggregate production data from subBoxes AND shiftSummaries
  const productionData = useMemo(() => {
    const grouped = {};

    // First, get data from subBoxes (actual production output)
    subBoxes.forEach(subBox => {
      const key = `${subBox.production_date}_${subBox.shift}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          date: subBox.production_date,
          shift: subBox.shift,
          finished_product: 0,
          qc_good: 0,
          wastage: 0,
          employee_count: 0,
          box_count: 0
        };
      }

      // Count finished products and categorize
      if (subBox.output_type === 'Good/ QC Approved') {
        grouped[key].qc_good += (subBox.quantity || 0);
        grouped[key].finished_product += (subBox.quantity || 0);
      } else if (subBox.output_type === 'Wastage') {
        grouped[key].wastage += (subBox.quantity || 0);
        grouped[key].finished_product += (subBox.quantity || 0);
      }
    });

    // IMPORTANT: Merge shift summary data (from Production Floor updates)
    shiftSummaries.forEach(summary => {
      const key = `${summary.date}_${summary.shift}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          date: summary.date,
          shift: summary.shift,
          finished_product: 0,
          qc_good: 0,
          wastage: 0,
          employee_count: 0,
          box_count: 0
        };
      }

      // Override/add shift summary data
      grouped[key].finished_product = summary.finished_product || 0;
      grouped[key].qc_good = summary.qc_good || 0;
      grouped[key].wastage = summary.wastage || 0;
    });

    // Also include data from productionShifts if available (backward compatibility)
    productionShifts.forEach(shift => {
      const key = `${shift.date}_${shift.shift}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          date: shift.date,
          shift: shift.shift,
          finished_product: shift.finished_product_count || 0,
          qc_good: shift.qc_approved_count || 0,
          wastage: shift.wastage_count || 0,
          employee_count: 0,
          box_count: 0
        };
      }
    });

    // Add employee count from assignments
    productionAssignments.forEach(assignment => {
      const key = `${assignment.assignment_date}_${assignment.shift}`;
      if (grouped[key]) {
        grouped[key].employee_count += 1;
      }
    });

    return Object.values(grouped).sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      return a.shift === 'Day' ? -1 : 1;
    });
  }, [productionShifts, subBoxes, productionAssignments, shiftSummaries]);

  // Filter data
  const filteredData = productionData.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.date.includes(searchTerm) ||
      item.shift.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter === '' || item.date === dateFilter;
    const matchesShift = shiftFilter === 'all' || item.shift === shiftFilter;

    return matchesSearch && matchesDate && matchesShift;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  // Statistics
  const totalFinished = filteredData.reduce((sum, item) => sum + item.finished_product, 0);
  const totalQCGood = filteredData.reduce((sum, item) => sum + item.qc_good, 0);
  const totalWastage = filteredData.reduce((sum, item) => sum + item.wastage, 0);
  const wastageRate = totalFinished > 0 ? ((totalWastage / totalFinished) * 100).toFixed(1) : 0;

  const handleViewDetails = (date, shift) => {
    // Navigate to production floor with date and shift context
    onNavigate('production-floor', null, null, null, null, null, { date, shift });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor production output by shift and date
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Finished</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalFinished.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">QC Good</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{totalQCGood.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Wastage</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{totalWastage.toLocaleString()}</p>
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
              <p className={`text-2xl font-bold mt-1 ${
                wastageRate > 5 ? 'text-red-900' : 'text-green-900'
              }`}>
                {wastageRate}%
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              wastageRate > 5 ? 'bg-red-100' : 'bg-green-100'
            }`}>
              <Factory className={`w-6 h-6 ${wastageRate > 5 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Alert for no data */}
      {/* {filteredData.length === 0 && productionData.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">No Production Data Yet</p>
              <p className="text-blue-800">
                Production data will appear here once you update shift summaries from the Production Floor. 
                Go to Production Floor to record finished goods and wastage.
              </p>
            </div>
          </div>
        </div>
      )} */}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by date or shift..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm)(e.target.value)}
            />
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleFilterChange(setDateFilter)(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <select 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={shiftFilter}
              onChange={(e) => handleFilterChange(setShiftFilter)(e.target.value)}
            >
              <option value="all">All Shifts</option>
              <option value="Day">Day Shift</option>
              <option value="Night">Night Shift</option>
            </select>
          </div>
        </div>
      </div>

      {/* Production Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shift</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">No. of Employees</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Finished Product</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">QC Good</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Wastage</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => {
                  const qcRate = item.finished_product > 0 
                    ? ((item.qc_good / item.finished_product) * 100).toFixed(1) 
                    : 0;
                  const wastagePercent = item.finished_product > 0
                    ? ((item.wastage / item.finished_product) * 100).toFixed(1)
                    : 0;

                  return (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {new Date(item.date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          item.shift === 'Day' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {item.shift} Shift
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{item.employee_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-gray-900">
                          {item.finished_product.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-right">
                          <span className="font-semibold text-green-700">
                            {item.qc_good.toLocaleString()}
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">{qcRate}% pass rate</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-right">
                          <span className={`font-semibold ${
                            wastagePercent > 5 ? 'text-red-700' : 'text-gray-700'
                          }`}>
                            {item.wastage.toLocaleString()}
                          </span>
                          <p className={`text-xs mt-0.5 ${
                            wastagePercent > 5 ? 'text-red-500' : 'text-gray-500'
                          }`}>
                            {wastagePercent}%
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleViewDetails(item.date, item.shift)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Details
                        </button>
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
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, filteredData.length)}</span> of{' '}
                <span className="font-medium">{filteredData.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      {filteredData.length === 0 && productionData.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Filter className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">No results found</p>
              <p className="text-blue-800">
                Try adjusting your filters. There are {productionData.length} total production shifts in the system.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Production;