import { useMemo } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import {
  FinanceScopeMetaCards,
  FinanceStatGrid,
  FinanceStepCard,
  STEP_META,
} from '../components/finance/FinancePaymentUI';
import { SHIPMENT_FINANCE_STEP_KEYS, formatCurrency, getShipmentFinanceSummary } from '../utils/finance';

const LandingCostShipment = ({
  lc,
  shipment,
  financeData,
  onPaymentSave,
  onPaymentEdit,
  onPaymentDelete,
  onBack,
}) => {
  const shipmentSummary = useMemo(
    () => getShipmentFinanceSummary(lc, shipment, financeData),
    [financeData, lc, shipment]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shipment Payment Details</h1>
            <p className="mt-1 text-sm text-gray-500">
              <span className="mr-1 text-gray-400">{lc?.lc_number} -&gt;</span>
              {shipment.shipment_number}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            shipment.status === 'Completed'
              ? 'bg-green-100 text-green-800'
              : shipment.status === 'In Progress'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {shipment.status}
        </span>
      </div>

      <FinanceScopeMetaCards shipment={shipment} />

      <FinanceStatGrid
        totalBill={shipmentSummary.totalBill}
        totalPaid={shipmentSummary.totalPaid}
        remaining={shipmentSummary.remaining}
        pendingCount={shipmentSummary.pendingCount}
        paidSubtext="Recorded against this shipment"
        remainingSubtext="Open shipment liability"
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <FileText className="h-5 w-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Step Details & Payments</h2>
          <span className="ml-auto text-xs text-gray-400">Click a step to expand</span>
        </div>

        <div className="space-y-3 bg-gray-50 p-4">
          {SHIPMENT_FINANCE_STEP_KEYS.map((stepKey) => {
            const stepSummary = shipmentSummary.steps.find((step) => step.stepKey === stepKey);

            return (
              <FinanceStepCard
                key={stepKey}
                stepKey={stepKey}
                lc={lc}
                shipment={shipment}
                payments={stepSummary?.payments || []}
                onPaymentSave={(_, paymentData) => onPaymentSave(stepSummary.financeKey, paymentData)}
                onPaymentEdit={(_, paymentId, paymentData) =>
                  onPaymentEdit(stepSummary.financeKey, paymentId, paymentData)
                }
                onPaymentDelete={(_, paymentId) => onPaymentDelete(stepSummary.financeKey, paymentId)}
              />
            );
          })}

          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Cost Summary</p>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              {shipmentSummary.steps
                .filter((step) => step.billAmount > 0)
                .map((step) => (
                  <div key={`${shipment.id}-${step.stepKey}`} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-xs text-gray-500">{STEP_META[step.stepKey]?.label || step.stepKey}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(step.billAmount)}</span>
                  </div>
                ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
              <span className="font-semibold text-gray-700">Total Landing Cost</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(shipmentSummary.totalBill)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingCostShipment;
