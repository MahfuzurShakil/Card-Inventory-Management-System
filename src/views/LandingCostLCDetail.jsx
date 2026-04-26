import { useMemo } from 'react';
import { ArrowLeft, FileText, Package, Shield } from 'lucide-react';
import {
  FinanceStatGrid,
  FinanceStepCard,
} from '../components/finance/FinancePaymentUI';
import {
  formatBalance,
  formatCurrency,
  getLcFinanceSummary,
  getLcInsuranceSummary,
  getPaymentStatusMeta,
  getShipmentFinanceSummary,
} from '../utils/finance';

const ShipmentSummaryRow = ({ lc, shipment, summary, onOpenShipment }) => {
  const status = getPaymentStatusMeta({
    billAmount: summary.totalBill,
    totalSettled: summary.totalSettled,
    remaining: summary.remaining,
  });

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-900">{shipment.shipment_number}</p>
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
        {summary.totalBill > 0 ? formatCurrency(summary.totalBill) : '—'}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-green-700">
        {summary.totalPaid > 0 ? formatCurrency(summary.totalPaid) : '—'}
      </td>
      <td className="px-4 py-3 text-sm font-semibold text-orange-700">
        {summary.totalBill > 0 ? formatBalance(summary.remaining) : '—'}
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
          View
        </button>
      </td>
    </tr>
  );
};

const LandingCostLCDetail = ({
  lc,
  financeData,
  onOpenShipment,
  onPaymentSave,
  onPaymentEdit,
  onPaymentDelete,
  onBack,
}) => {
  const lcSummary = useMemo(() => getLcFinanceSummary(lc, financeData), [lc, financeData]);
  const insurance = useMemo(() => getLcInsuranceSummary(lc, financeData), [lc, financeData]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lc.lc_number}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {lc.bank_name || '—'} · {lc.shipments.length} shipment{lc.shipments.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <FinanceStatGrid
        totalBill={lcSummary.totalBill}
        totalPaid={lcSummary.totalPaid}
        remaining={lcSummary.remaining}
        pendingCount={lcSummary.pendingCount}
        paidSubtext="Recorded against this LC"
        remainingSubtext="Open LC liability"
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total Bill</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Total Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Remaining</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pending Action</th>
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
  );
};

export default LandingCostLCDetail;
