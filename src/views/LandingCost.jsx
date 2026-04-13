import { useMemo, useState } from 'react';
import { Eye, FileText, Filter, Package, Shield } from 'lucide-react';
import {
  FinanceStatGrid,
  FinanceStepCard,
  FinanceSummaryHeader,
} from '../components/finance/FinancePaymentUI';
import {
  formatCurrency,
  getLandingCostSummary,
  getLcFinanceSummary,
  getLcInsuranceSummary,
  getShipmentFinanceSummary,
} from '../utils/finance';

const getShipmentPaymentStatus = (summary) => {
  if (summary.totalBill <= 0) {
    return { label: 'No Data', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  }

  if (summary.remaining <= 0) {
    return { label: 'All Paid', cls: 'bg-green-100 text-green-700 border-green-200' };
  }

  if (summary.totalSettled > 0) {
    return { label: 'Partial', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  }

  return { label: 'Pending', cls: 'bg-red-100 text-red-700 border-red-200' };
};

const ShipmentSummaryRow = ({ lc, shipment, summary, onOpenShipment }) => {
  const status = getShipmentPaymentStatus(summary);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-900">{shipment.shipment_number}</p>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            shipment.status === 'Completed'
              ? 'bg-green-100 text-green-700'
              : shipment.status === 'In Progress'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {shipment.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
        {summary.totalBill > 0 ? formatCurrency(summary.totalBill) : '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.cls}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {summary.pendingCount > 0 ? `${summary.pendingCount} step${summary.pendingCount > 1 ? 's' : ''}` : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onOpenShipment(lc, shipment)}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
      </td>
    </tr>
  );
};

const LCSection = ({ lc, financeData, onOpenShipment, onPaymentSave, onPaymentEdit, onPaymentDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const lcSummary = useMemo(() => getLcFinanceSummary(lc, financeData), [lc, financeData]);
  const insurance = useMemo(() => getLcInsuranceSummary(lc, financeData), [lc, financeData]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div
        className="flex cursor-pointer items-center gap-4 px-6 py-5 transition-colors hover:bg-gray-50"
        onClick={() => setExpanded((prev) => !prev)}
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
                  {lcSummary.pendingCount} action{lcSummary.pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-gray-200 bg-gray-50 p-5">
          <div className="rounded-xl border border-teal-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-teal-100 p-2 text-teal-600">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">LC Insurance</p>
                <p className="text-xs text-gray-500">One payable insurance record for this LC</p>
              </div>
            </div>

            <FinanceStepCard
              stepKey="insurance"
              lc={lc}
              shipment={null}
              payments={insurance.payments}
              onPaymentSave={(_, paymentData) => onPaymentSave(insurance.financeKey, paymentData)}
              onPaymentEdit={(_, paymentId, paymentData) => onPaymentEdit(insurance.financeKey, paymentId, paymentData)}
              onPaymentDelete={(_, paymentId) => onPaymentDelete(insurance.financeKey, paymentId)}
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Shipments</p>
                <p className="text-xs text-gray-500">Open a shipment to review detailed step payments</p>
              </div>
            </div>

            {lc.shipments.length === 0 ? (
              <div className="p-10 text-center">
                <Package className="mx-auto mb-3 h-12 w-12 text-gray-200" />
                <p className="font-medium text-gray-500">No shipments for this LC yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Shipment</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total Bill</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pending Actions</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lc.shipments.map((shipment) => {
                      const shipmentSummary = getShipmentFinanceSummary(lc, shipment, financeData);

                      return (
                        <ShipmentSummaryRow
                          key={shipment.id}
                          lc={lc}
                          shipment={shipment}
                          summary={shipmentSummary}
                          onOpenShipment={onOpenShipment}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LandingCost = ({
  lcs = [],
  financeData = {},
  onOpenShipment,
  onPaymentSave,
  onPaymentEdit,
  onPaymentDelete,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showOnlyPending, setShowOnlyPending] = useState(false);

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
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Draft">Draft</option>
          <option value="Closed">Closed</option>
        </select>
        <label className="flex cursor-pointer select-none items-center gap-2">
          <div
            onClick={() => setShowOnlyPending((prev) => !prev)}
            className={`relative h-5 w-9 rounded-full transition-colors ${showOnlyPending ? 'bg-red-500' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showOnlyPending ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm font-medium text-gray-600">Pending Only</span>
        </label>
      </div>

      <div className="space-y-4">
        {filteredLCs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Package className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="font-medium text-gray-500">No LCs found</p>
            <p className="mt-1 text-sm text-gray-400">
              {showOnlyPending ? 'No pending payment actions.' : 'No LCs match your search filters.'}
            </p>
          </div>
        ) : (
          filteredLCs.map((lc) => (
            <LCSection
              key={lc.id}
              lc={lc}
              financeData={financeData}
              onOpenShipment={onOpenShipment}
              onPaymentSave={onPaymentSave}
              onPaymentEdit={onPaymentEdit}
              onPaymentDelete={onPaymentDelete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LandingCost;
