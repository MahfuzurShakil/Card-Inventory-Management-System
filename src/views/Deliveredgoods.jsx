import { useState, useMemo } from 'react';
import {
  Truck, Search, Eye, Download, FileText, Package,
  Calendar, User, ChevronLeft, ChevronRight, CheckCircle,
  Layers, X
} from 'lucide-react';
import { openChallanPrint } from '../utils/challanPrint';

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildChallans(subBoxes) {
  const map = {};

  subBoxes.forEach(sb => {
    if (!sb.challan_no || sb.delivery_status !== 'Dispatched') return;

    if (!map[sb.challan_no]) {
      map[sb.challan_no] = {
        challan_no: sb.challan_no,
        date: sb.challan_date || sb.production_date || '',
        prepared_by: sb.challan_prepared_by || 'Production Staff',
        item_name: sb.challan_item_name || 'Smart Blank Card',
        item_description: sb.challan_item_description || sb.challan_remarks || '',
        remarks: sb.challan_item_description || sb.challan_remarks || '',
        boxes: [],
      };
    }

    map[sb.challan_no].boxes.push(sb);
  });

  return Object.values(map).sort((a, b) => {
    const da = new Date(b.date);
    const db = new Date(a.date);
    if (!isNaN(da) && !isNaN(db)) return da - db;
    return b.challan_no.localeCompare(a.challan_no);
  });
}

function itemBreakdown(boxes) {
  const good = boxes.filter(b => b.output_type === 'Good/ QC Approved').length;
  const wastage = boxes.filter(b => b.output_type !== 'Good/ QC Approved').length;
  return { good, wastage };
}

const DeliveredGoods = ({ subBoxes = [], onViewChallan }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS = 10;

  const challans = useMemo(() => buildChallans(subBoxes), [subBoxes]);

  const filtered = useMemo(() => challans.filter(challan => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      challan.challan_no.toLowerCase().includes(q) ||
      challan.prepared_by.toLowerCase().includes(q);
    const matchDate = !dateFilter || challan.date === dateFilter;
    return matchSearch && matchDate;
  }), [challans, searchTerm, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = filtered.slice((safePage - 1) * ROWS, safePage * ROWS);

  const totalBoxes = challans.reduce((sum, challan) => sum + challan.boxes.length, 0);
  const totalUnits = challans.reduce(
    (sum, challan) => sum + challan.boxes.reduce((inner, box) => inner + (box.quantity || 0), 0),
    0
  );
  const totalGood = challans.reduce(
    (sum, challan) => sum + challan.boxes.filter(box => box.output_type === 'Good/ QC Approved').length,
    0
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setCurrentPage(1);
  };

  const hasFilters = searchTerm || dateFilter;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivered Goods</h1>
          <p className="text-sm text-gray-500 mt-1">Confirmed challans for dispatched finished good boxes</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Challans</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{challans.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">confirmed dispatches</p>
            </div>
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Boxes Dispatched</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalBoxes.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">sub-boxes total</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Units Dispatched</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalUnits.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">across all challans</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">QC Approved Boxes</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{totalGood.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">good output</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by challan number or prepared by..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={e => {
              setDateFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Challan No.</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">No. of Boxes</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Summary</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prepared By</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pageRows.length > 0 ? pageRows.map(challan => {
                const totalQty = challan.boxes.reduce((sum, box) => sum + (box.quantity || 0), 0);
                const { good, wastage } = itemBreakdown(challan.boxes);

                return (
                  <tr key={challan.challan_no} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-semibold text-gray-900 font-mono">{challan.challan_no}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{fmtDate(challan.date)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div>
                        <span className="font-semibold text-gray-900">{challan.boxes.length}</span>
                        <span className="text-xs text-gray-400 ml-1">boxes</span>
                        <p className="text-xs text-gray-500 mt-0.5">{totalQty.toLocaleString()} units</p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {good > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                            <CheckCircle className="w-3 h-3" /> QC {good}
                          </span>
                        )}
                        {wastage > 0 && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            Waste {wastage}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-gray-700">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{challan.prepared_by}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => onViewChallan(challan)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => openChallanPrint(challan, challan.boxes)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Challan
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div>
                      <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm text-gray-500 mb-1">
                        {hasFilters ? 'No challans match your filters.' : 'No challans created yet.'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {!hasFilters && 'Confirm a challan from Finished Goods to see dispatch records here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(safePage - 1) * ROWS + 1}</span>-
              <span className="font-medium">{Math.min(safePage * ROWS, filtered.length)}</span> of{' '}
              <span className="font-medium">{filtered.length}</span> challans
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">Page {safePage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveredGoods;
