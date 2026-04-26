export const SHIPMENT_FINANCE_STEP_KEYS = [
  'freight_forwarder',
  'customs_duty',
  'cnf_agent',
  'lc_commission',
  'bank_interest',
];

export const LC_FINANCE_STEP_KEYS = ['insurance'];

const CUSTOMS_FIELDS = ['cd', 'rd', 'sd', 'vat', 'ait', 'at', 'atv', 'df_vat'];
const COMMISSION_FIELDS = ['lc_commission', 'vat_on_commission', 'stamp_charges', 'other_charges', 'other_vat'];

export const toAmount = (value) => Number(value) || 0;

export const formatCurrency = (value) =>
  `৳${toAmount(value).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const formatBalance = (value) =>
  toAmount(value) < 0 ? `Over by ${formatCurrency(Math.abs(toAmount(value)))}` : formatCurrency(value);

export const getShipmentFinanceKey = (shipmentId, stepKey) => `shipment:${shipmentId}:${stepKey}`;

export const getLcFinanceKey = (lcId, stepKey) => `lc:${lcId}:${stepKey}`;

export const getFinanceKey = ({ lcId = null, shipmentId = null, stepKey }) =>
  shipmentId != null ? getShipmentFinanceKey(shipmentId, stepKey) : getLcFinanceKey(lcId, stepKey);

export const getStepBillAmount = (stepKey, stepData = {}, lc = {}) => {
  const sd = stepData?.[stepKey] || null;

  switch (stepKey) {
    case 'freight_forwarder':
      return toAmount(sd?.ff_bill_amount);
    case 'customs_duty':
      return sd
        ? toAmount(sd.total_customs_amount) || CUSTOMS_FIELDS.reduce((sum, field) => sum + toAmount(sd[field]), 0)
        : 0;
    case 'cnf_agent':
      return toAmount(sd?.cnf_bill_value);
    case 'lc_commission':
      return sd
        ? toAmount(sd.total_cost) || COMMISSION_FIELDS.reduce((sum, field) => sum + toAmount(sd[field]), 0)
        : 0;
    case 'bank_interest':
      return toAmount(sd?.lc_value_bdt_realised) + toAmount(sd?.interest_amount);
    case 'insurance':
      return toAmount(lc?.insurance_bill_amount);
    default:
      return 0;
  }
};

export const normalizePayment = (payment = {}) => ({
  ...payment,
  amount: toAmount(payment.amount),
  discount: toAmount(payment.discount),
});

export const getPaymentsForKey = (financeData = {}, key) => {
  const entries = financeData?.[key];
  return Array.isArray(entries) ? entries.map(normalizePayment) : [];
};

export const getPaymentTotals = (payments = []) =>
  payments.reduce(
    (totals, payment) => {
      const normalized = normalizePayment(payment);
      totals.totalPaid += normalized.amount;
      totals.totalDiscount += normalized.discount;
      totals.totalSettled += normalized.amount + normalized.discount;
      return totals;
    },
    { totalPaid: 0, totalDiscount: 0, totalSettled: 0 }
  );

export const getPaymentMetrics = (billAmount, payments = []) => {
  const totals = getPaymentTotals(payments);
  const remaining = toAmount(billAmount) - totals.totalSettled;

  return {
    billAmount: toAmount(billAmount),
    ...totals,
    remaining,
    isOverSettled: remaining < 0,
    isSettled: toAmount(billAmount) > 0 && remaining <= 0,
    isPartial: totals.totalSettled > 0 && remaining > 0,
    isPending: toAmount(billAmount) > 0 && remaining > 0,
  };
};

export const getPaymentStatusMeta = (metrics) => {
  if (!metrics || metrics.billAmount <= 0) {
    return { label: 'No Data', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  }

  if (metrics.remaining <= 0) {
    return { label: 'Paid', cls: 'bg-green-100 text-green-700 border-green-200' };
  }

  if (metrics.totalSettled > 0) {
    return { label: 'Partial', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  }

  return { label: 'Pending', cls: 'bg-red-100 text-red-700 border-red-200' };
};

export const getStepMetrics = ({ stepKey, lc, shipment, financeData }) => {
  const billAmount = getStepBillAmount(stepKey, shipment?.stepData, lc);
  const financeKey = getFinanceKey({
    lcId: stepKey === 'insurance' ? lc?.id : null,
    shipmentId: stepKey === 'insurance' ? null : shipment?.id,
    stepKey,
  });
  const payments = getPaymentsForKey(financeData, financeKey);

  return {
    stepKey,
    financeKey,
    payments,
    ...getPaymentMetrics(billAmount, payments),
  };
};

export const getShipmentFinanceSummary = (lc, shipment, financeData = {}) => {
  const steps = SHIPMENT_FINANCE_STEP_KEYS.map((stepKey) =>
    getStepMetrics({ stepKey, lc, shipment, financeData })
  );

  return {
    steps,
    totalBill: steps.reduce((sum, step) => sum + step.billAmount, 0),
    totalPaid: steps.reduce((sum, step) => sum + step.totalPaid, 0),
    totalDiscount: steps.reduce((sum, step) => sum + step.totalDiscount, 0),
    totalSettled: steps.reduce((sum, step) => sum + step.totalSettled, 0),
    remaining: steps.reduce((sum, step) => sum + step.remaining, 0),
    pendingCount: steps.filter((step) => step.isPending).length,
  };
};

export const getLcInsuranceSummary = (lc, financeData = {}) =>
  getStepMetrics({
    stepKey: 'insurance',
    lc,
    shipment: null,
    financeData,
  });

export const getLcFinanceSummary = (lc, financeData = {}) => {
  const shipmentSummaries = (lc?.shipments || []).map((shipment) =>
    getShipmentFinanceSummary(lc, shipment, financeData)
  );
  const insurance = getLcInsuranceSummary(lc, financeData);

  return {
    shipmentSummaries,
    insurance,
    totalBill: shipmentSummaries.reduce((sum, item) => sum + item.totalBill, 0) + insurance.billAmount,
    totalPaid: shipmentSummaries.reduce((sum, item) => sum + item.totalPaid, 0) + insurance.totalPaid,
    totalDiscount:
      shipmentSummaries.reduce((sum, item) => sum + item.totalDiscount, 0) + insurance.totalDiscount,
    totalSettled:
      shipmentSummaries.reduce((sum, item) => sum + item.totalSettled, 0) + insurance.totalSettled,
    remaining: shipmentSummaries.reduce((sum, item) => sum + item.remaining, 0) + insurance.remaining,
    pendingCount:
      shipmentSummaries.reduce((sum, item) => sum + item.pendingCount, 0) + (insurance.isPending ? 1 : 0),
  };
};

export const getLandingCostSummary = (lcs = [], financeData = {}) =>
  lcs.reduce(
    (totals, lc) => {
      const lcSummary = getLcFinanceSummary(lc, financeData);
      totals.totalBill += lcSummary.totalBill;
      totals.totalPaid += lcSummary.totalPaid;
      totals.totalDiscount += lcSummary.totalDiscount;
      totals.totalSettled += lcSummary.totalSettled;
      totals.remaining += lcSummary.remaining;
      totals.pendingCount += lcSummary.pendingCount;
      return totals;
    },
    { totalBill: 0, totalPaid: 0, totalDiscount: 0, totalSettled: 0, remaining: 0, pendingCount: 0 }
  );

export const createPaymentDraft = (payment = null) => ({
  amount: payment?.amount ?? '',
  discount: payment?.discount ?? 0,
  date: payment?.date || new Date().toISOString().split('T')[0],
  ref: payment?.ref || '',
  note: payment?.note || '',
  file: payment?.file || null,
});
