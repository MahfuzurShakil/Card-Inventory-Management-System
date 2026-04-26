import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  Package,
} from 'lucide-react';
import {
  FinanceStatGrid,
  FinanceSummaryHeader,
} from '../components/finance/FinancePaymentUI';
import {
  formatCurrency,
  getLandingCostSummary,
  getLcFinanceSummary,
} from '../utils/finance';

const DEFAULT_PAGE_SIZE = 5;

const LandingCost = ({ lcs = [], financeData = {}, onOpenLC }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const metrics = useMemo(() => getLandingCostSummary(lcs, financeData), [lcs, financeData]);

  const filteredLCs = useMemo(
    () =>
      lcs.filter((lc) => {
        const lcSummary = getLcFinanceSummary(lc, financeData);
        const matchSearch =
          !search ||
          lc.lc_number.toLowerCase().includes(search.toLowerCase()) ||
          (lc.bank_name || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || lc.status === statusFilter;
        const matchPending = !showOnlyPending || lcSummary.pendingCount > 0;

        return matchSearch && matchStatus && matchPending;
      }),
    [financeData, lcs, search, showOnlyPending, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredLCs.length / DEFAULT_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = filteredLCs.length === 0 ? 0 : (safeCurrentPage - 1) * DEFAULT_PAGE_SIZE;
  const paginatedLCs = filteredLCs.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
  const showingFrom = filteredLCs.length === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + DEFAULT_PAGE_SIZE, filteredLCs.length);

  return (
    <div className="space-y-6">
      <FinanceSummaryHeader
        title="Landing Cost"
        subtitle="Review shipment costs, verify documents, and record payments"
        pendingCount={metrics.pendingCount}
      />

      <FinanceStatGrid
        totalBill={metrics.totalBill}
        totalPaid={metrics.totalPaid}
        remaining={metrics.remaining}
        pendingCount={metrics.pendingCount}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="relative min-w-48 flex-1">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search LC number or bank..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setCurrentPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Draft">Draft</option>
          <option value="Closed">Closed</option>
        </select>
        <label className="flex cursor-pointer select-none items-center gap-2">
          <div
            onClick={() => {
              setShowOnlyPending((prev) => !prev);
              setCurrentPage(1);
            }}
            className={`relative h-5 w-9 rounded-full transition-colors ${showOnlyPending ? 'bg-red-500' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showOnlyPending ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm font-medium text-gray-600">Pending Only</span>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <p className="text-sm text-gray-500">
            Showing {showingFrom} to {showingTo} of {filteredLCs.length}
          </p>
        </div>

        <div className="space-y-4 p-4">
          {paginatedLCs.length === 0 ? (
            <div className="rounded-2xl p-12 text-center">
              <Package className="mx-auto mb-3 h-12 w-12 text-gray-200" />
              <p className="font-medium text-gray-500">No LCs found</p>
              <p className="mt-1 text-sm text-gray-400">
                {showOnlyPending ? 'No pending payment actions.' : 'No LCs match your search filters.'}
              </p>
            </div>
          ) : (
            paginatedLCs.map((lc) => {
              const lcSummary = getLcFinanceSummary(lc, financeData);

              return (
                <button
                  key={lc.id}
                  onClick={() => onOpenLC(lc)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 text-left shadow-sm transition-colors hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <FileText className="h-5 w-5" />
                  </div>

                  <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-400">LC Number</p>
                      <p className="mt-0.5 font-bold text-gray-900">{lc.lc_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Bank</p>
                      <p className="mt-0.5 text-sm font-medium text-gray-700">{lc.bank_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Shipments</p>
                      <p className="mt-0.5 text-sm font-medium text-gray-700">
                        {lc.shipments.length} shipment{lc.shipments.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Landing Cost</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="font-bold text-gray-900">{lcSummary.totalBill > 0 ? formatCurrency(lcSummary.totalBill) : '—'}</p>
                        {lcSummary.pendingCount > 0 && (
                          <span className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                            {lcSummary.pendingCount} action{lcSummary.pendingCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {filteredLCs.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4">
            <p className="text-sm text-gray-500">
              Page {safeCurrentPage} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .slice(Math.max(0, safeCurrentPage - 3), Math.max(0, safeCurrentPage - 3) + 5)
                  .map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 w-9 rounded-lg border text-sm font-medium transition-colors ${
                        page === safeCurrentPage
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safeCurrentPage === totalPages}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingCost;
