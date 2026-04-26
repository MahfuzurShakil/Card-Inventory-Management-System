/* eslint-disable react-refresh/only-export-components */
import { createElement, isValidElement, useMemo, useState } from 'react';
import {
  Bell,
  Building,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Edit3,
  FileText,
  Hash,
  Paperclip,
  Percent,
  Save,
  Shield,
  Ship,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  createPaymentDraft,
  formatBalance,
  formatCurrency,
  getPaymentMetrics,
  getPaymentStatusMeta,
  getStepBillAmount,
  toAmount,
} from '../../utils/finance';

export const STEP_META = {
  freight_forwarder: { label: 'Freight', icon: Ship, color: 'blue' },
  customs_duty: { label: 'Customs', icon: FileText, color: 'purple' },
  cnf_agent: { label: 'C&F Agent', icon: Building, color: 'orange' },
  lc_commission: { label: 'LC Commission', icon: CreditCard, color: 'pink' },
  bank_interest: { label: 'Bank Interest', icon: Percent, color: 'indigo' },
  insurance: { label: 'Insurance', icon: Shield, color: 'teal' },
};

const renderIconNode = (icon, className) => {
  if (isValidElement(icon)) {
    return icon;
  }

  if (typeof icon === 'function' || typeof icon === 'object') {
    return createElement(icon, { className });
  }

  return <span className={className} />;
};

const COLOR_CLASSES = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'bg-pink-100 text-pink-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'bg-teal-100 text-teal-600' },
};

const SHIPMENT_STEP_THEME = {
  bg: 'bg-blue-50',
  border: 'border-blue-200',
  icon: 'bg-blue-100 text-blue-600',
};

const CUSTOMS_FIELDS = [
  ['CD', 'cd'],
  ['RD', 'rd'],
  ['SD', 'sd'],
  ['VAT', 'vat'],
  ['AIT', 'ait'],
  ['AT', 'at'],
  ['ATV', 'atv'],
  ['DF VAT', 'df_vat'],
];

const COMMISSION_FIELDS = [
  ['LC Commission', 'lc_commission'],
  ['VAT on Commission', 'vat_on_commission'],
  ['Stamp Charges', 'stamp_charges'],
  ['Other Charges', 'other_charges'],
  ['Other VAT', 'other_vat'],
];

const getDocumentRows = (stepKey, stepData, lc) => {
  switch (stepKey) {
    case 'freight_forwarder':
      return [['Freight Bill', stepData?.freight_forwarder?.freight_bill_path]];
    case 'customs_duty':
      return [['BE Document', stepData?.customs_duty?.be_document_path]];
    case 'cnf_agent':
      return [
        ['C&F Bill', stepData?.cnf_agent?.cnf_bill_path],
        ['Commercial Document', stepData?.cnf_agent?.commercial_doc_path],
      ];
    case 'bank_interest':
      return [['Interest Document', stepData?.bank_interest?.document_path]];
    case 'insurance':
      return [['Insurance Document', lc?.insurance_doc]];
    default:
      return [];
  }
};

export const getStepInfo = (stepKey, stepData = {}, lc = {}) => {
  const billAmount = getStepBillAmount(stepKey, stepData, lc);

  switch (stepKey) {
    case 'freight_forwarder': {
      const freight = stepData?.freight_forwarder;
      return {
        billAmount,
        detailRows: freight
          ? [
              ['Freight Forwarder', freight.ff_name || '—'],
              ['AWB / BL No', freight.awb_bl_no || '—'],
              ['ETD', freight.etd || '—'],
              ['ETA', freight.eta || '—'],
              ['Bill Amount', formatCurrency(freight.ff_bill_amount)],
            ]
          : [],
        documents: getDocumentRows(stepKey, stepData, lc),
      };
    }
    case 'customs_duty': {
      const customs = stepData?.customs_duty;
      return {
        billAmount,
        detailRows: customs
          ? [
              ...CUSTOMS_FIELDS.map(([label, field]) => [label, formatCurrency(customs[field])]),
              ['Total', formatCurrency(billAmount), true],
            ]
          : [],
        documents: getDocumentRows(stepKey, stepData, lc),
      };
    }
    case 'cnf_agent': {
      const cnf = stepData?.cnf_agent;
      return {
        billAmount,
        detailRows: cnf
          ? [
              ['C&F Agent Name', cnf.cnf_agent_name || '—'],
              ['Documents Handover', cnf.documents_handover_date || '—'],
              ['Cargo Release Date', cnf.cargo_release_date || '—'],
              ['Bill Amount', formatCurrency(cnf.cnf_bill_value)],
            ]
          : [],
        documents: getDocumentRows(stepKey, stepData, lc),
      };
    }
    case 'lc_commission': {
      const commission = stepData?.lc_commission;
      return {
        billAmount,
        detailRows: commission
          ? [
              ...COMMISSION_FIELDS.map(([label, field]) => [label, formatCurrency(commission[field])]),
              ['Total', formatCurrency(billAmount), true],
            ]
          : [],
        documents: [],
      };
    }
    case 'bank_interest': {
      const interest = stepData?.bank_interest;
      return {
        billAmount,
        detailRows: interest
          ? [
              ['Document Date', interest.date || '—'],
              ['Document No.', interest.document_no || '—'],
              [
                'LC Value Foreign Realised',
                interest.lc_value_foreign_realised
                  ? toAmount(interest.lc_value_foreign_realised).toLocaleString()
                  : '—',
              ],
              ['Exchange Rate', interest.exchange_rate ? toAmount(interest.exchange_rate).toLocaleString() : '—'],
              ['LC Value BDT Realised', formatCurrency(interest.lc_value_bdt_realised)],
              ['Interest Amount', formatCurrency(interest.interest_amount)],
              ['Total', formatCurrency(billAmount), true],
            ]
          : [],
        documents: getDocumentRows(stepKey, stepData, lc),
      };
    }
    case 'insurance':
      return {
        billAmount,
        detailRows: [
          ['Insurance Company', lc?.insurance_company_name || '—'],
          ['Cover Note #', lc?.cover_note_number || '—'],
          ['Issue Date', lc?.insurance_issue_date || '—'],
          ['Bill Amount', formatCurrency(lc?.insurance_bill_amount)],
        ],
        documents: getDocumentRows(stepKey, stepData, lc),
      };
    default:
      return { billAmount: 0, detailRows: [], documents: [] };
  }
};

const PaymentModal = ({
  stepKey,
  title,
  billAmount,
  payments,
  mode,
  initialPayment,
  lcNumber,
  shipmentNumber,
  colorOverride = null,
  onClose,
  onSave,
}) => {
  const meta = STEP_META[stepKey];
  const Icon = meta.icon;
  const colors = colorOverride || COLOR_CLASSES[meta.color];
  const [formData, setFormData] = useState(createPaymentDraft(initialPayment));
  const summary = useMemo(() => getPaymentMetrics(billAmount, payments), [billAmount, payments]);
  const draftAmount = toAmount(formData.amount);
  const draftDiscount = toAmount(formData.discount);
  const draftSettled = draftAmount + draftDiscount;
  const hasValidAmount = draftAmount > 0;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className={`${colors.bg} ${colors.border} rounded-t-2xl border-b px-6 py-5`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${colors.icon}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {mode === 'edit' ? 'Edit Payment' : 'Record Payment'} - {title}
                </h2>
                <p className="text-sm text-gray-500">
                  {lcNumber}
                  {shipmentNumber ? ` · ${shipmentNumber}` : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-white hover:bg-opacity-60">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white bg-opacity-70 p-3 text-center">
              <p className="mb-1 text-xs text-gray-500">Bill Amount</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(billAmount)}</p>
            </div>
            <div className="rounded-xl bg-white bg-opacity-70 p-3 text-center">
              <p className="mb-1 text-xs text-gray-500">Total Paid</p>
              <p className={`text-sm font-bold ${summary.totalPaid > billAmount ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(summary.totalPaid)}
              </p>
            </div>
            <div className="rounded-xl bg-white bg-opacity-70 p-3 text-center">
              <p className="mb-1 text-xs text-gray-500">Remaining</p>
              <p className={`text-sm font-bold ${summary.remaining < 0 ? 'text-red-600' : summary.remaining === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {formatBalance(summary.remaining)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Amount Paid (৳) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(event) => handleChange('amount', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(event) => handleChange('date', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Discount</label>
              <input
                type="number"
                step="0.01"
                value={formData.discount}
                onChange={(event) => handleChange('discount', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="0 for none, negative for overprice"
              />
              <p className="mt-1 text-xs text-gray-400">Positive reduces remaining, negative captures overprice.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Reference / Voucher #</label>
              <input
                type="text"
                value={formData.ref}
                onChange={(event) => handleChange('ref', event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. VCH-2026-001"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Note</label>
            <input
              type="text"
              value={formData.note}
              onChange={(event) => handleChange('note', event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder="Optional note..."
            />
          </div>

          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => handleChange('file', event.target.files[0]?.name || null)}
            />
            <div className={`flex items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm transition-colors ${formData.file ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 bg-white text-gray-500 hover:border-blue-400'}`}>
              <Paperclip className="h-4 w-4" />
              {formData.file || 'Attach payment document (PDF / Image)'}
            </div>
          </div>

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-medium">Draft settlement</p>
            <p className="mt-1">
              Cash paid {formatCurrency(draftAmount)} + discount {formatCurrency(draftDiscount)} = settled value {formatCurrency(draftSettled)}
            </p>
          </div>

          {!hasValidAmount && <p className="text-sm text-red-500">Amount paid is required and must be greater than 0.</p>}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(formData)}
              disabled={!hasValidAmount || !formData.date}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {mode === 'edit' ? 'Update Payment' : 'Save Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FinanceStepCard = ({
  stepKey,
  lc,
  shipment,
  payments,
  onPaymentSave,
  onPaymentEdit,
  onPaymentDelete,
  forceExpanded = false,
  isExpanded,
  onToggle,
  theme = 'default',
}) => {
  const [internalExpanded, setInternalExpanded] = useState(forceExpanded);
  const [modalState, setModalState] = useState({ open: false, mode: 'create', payment: null });
  const stepInfo = getStepInfo(stepKey, shipment?.stepData, lc);
  const meta = STEP_META[stepKey];
  const Icon = meta.icon;
  const expanded = typeof isExpanded === 'boolean' ? isExpanded : internalExpanded;
  const colors = theme === 'shipment-blue' ? SHIPMENT_STEP_THEME : COLOR_CLASSES[meta.color];
  const metrics = useMemo(() => getPaymentMetrics(stepInfo.billAmount, payments), [stepInfo.billAmount, payments]);
  const canRecordPayment = stepInfo.billAmount > 0;
  const statusChip = getPaymentStatusMeta(metrics);

  const toggleExpanded = () => {
    if (onToggle) {
      onToggle(stepKey);
      return;
    }

    setInternalExpanded((prev) => !prev);
  };

  const openCreateModal = (event) => {
    event?.stopPropagation();
    setModalState({ open: true, mode: 'create', payment: null });
  };

  const openEditModal = (payment) => {
    setModalState({ open: true, mode: 'edit', payment });
  };

  const closeModal = () => setModalState({ open: false, mode: 'create', payment: null });

  const handleModalSave = (paymentData) => {
    if (modalState.mode === 'edit' && modalState.payment?.id != null) {
      onPaymentEdit(stepKey, modalState.payment.id, paymentData);
    } else {
      onPaymentSave(stepKey, paymentData);
    }
    closeModal();
  };

  return (
    <>
      <div className={`overflow-hidden rounded-xl border transition-all ${expanded ? colors.border : 'border-gray-200'}`}>
        <div
          className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors ${expanded ? colors.bg : 'bg-white hover:bg-gray-50'}`}
          onClick={toggleExpanded}
        >
          <div className={`rounded-lg p-2 ${expanded ? colors.icon : 'bg-gray-100 text-gray-500'}`}>
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{meta.label}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusChip.cls}`}>{statusChip.label}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-gray-800">
                {stepInfo.billAmount > 0 ? formatCurrency(stepInfo.billAmount) : '—'}
              </span>
              {metrics.totalPaid > 0 && <span className="text-xs text-gray-400">paid: {formatCurrency(metrics.totalPaid)}</span>}
              {metrics.totalDiscount !== 0 && <span className="text-xs text-gray-400">discount: {formatCurrency(metrics.totalDiscount)}</span>}
            </div>
          </div>

          {metrics.isPending && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-400 animate-pulse" />}
          {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>

        {expanded && (
          <div className={`space-y-4 border-t px-4 py-4 ${colors.bg} ${colors.border}`}>
            {stepInfo.detailRows.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {stepInfo.detailRows.map(([label, value, bold]) => (
                  <div
                    key={`${stepKey}-${label}`}
                    className={`rounded-lg border border-white bg-white p-2.5 ${bold ? 'col-span-2 md:col-span-3' : ''}`}
                  >
                    <p className="mb-0.5 text-xs text-gray-400">{label}</p>
                    <p className={`text-sm ${bold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">No data entered for this step yet.</p>
            )}

            {stepInfo.documents.length > 0 && (
              <div className="space-y-2">
                {stepInfo.documents.map(([label, fileName]) => (
                  <div key={`${stepKey}-${label}`} className="w-fit rounded-lg border border-white bg-white px-3 py-2.5">
                    <p className="mb-1 text-xs text-gray-500">{label}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Paperclip className="h-4 w-4 text-gray-400" />
                      <span className={fileName ? 'cursor-pointer text-blue-600 underline hover:text-blue-700' : 'text-gray-400'}>
                        {fileName || 'No file attached'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment History</p>
                <div className="overflow-hidden rounded-lg border border-white bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Discount</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Settled</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Ref</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Note</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Doc</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-700">{payment.date || '—'}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatCurrency(payment.amount)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(payment.discount)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            {formatCurrency(toAmount(payment.amount) + toAmount(payment.discount))}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{payment.ref || '—'}</td>
                          <td className="max-w-xs truncate px-3 py-2 text-gray-500">{payment.note || '—'}</td>
                          <td className="px-3 py-2 text-blue-500">{payment.file || '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditModal(payment);
                                }}
                                className="rounded p-1 text-blue-600 transition-colors hover:bg-blue-50"
                                title="Edit payment"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onPaymentDelete(stepKey, payment.id);
                                }}
                                className="rounded p-1 text-red-600 transition-colors hover:bg-red-50"
                                title="Delete payment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span>Remaining: {formatBalance(metrics.remaining)}</span>
                <span>Settled: {formatCurrency(metrics.totalSettled)}</span>
              </div>
              <button
                onClick={openCreateModal}
                disabled={!canRecordPayment}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Record Payment
              </button>
            </div>
          </div>
        )}
      </div>

      {modalState.open && (
        <PaymentModal
          stepKey={stepKey}
          title={meta.label}
          billAmount={stepInfo.billAmount}
          payments={payments}
          mode={modalState.mode}
          initialPayment={modalState.payment}
          lcNumber={lc?.lc_number}
          shipmentNumber={shipment?.shipment_number}
          colorOverride={theme === 'shipment-blue' ? SHIPMENT_STEP_THEME : null}
          onClose={closeModal}
          onSave={handleModalSave}
        />
      )}
    </>
  );
};

export const FinanceStatCard = ({
  label,
  value,
  subtext,
  icon,
  iconClassName,
  panelClassName = 'bg-white border-gray-200',
  valueClassName = 'text-gray-900',
}) => {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${panelClassName}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className={`text-xs font-medium ${panelClassName.includes('border-red') ? 'text-red-600' : 'text-gray-500'}`}>{label}</p>
        <div className={`rounded-lg p-1.5 ${iconClassName}`}>
          {renderIconNode(icon, 'h-3.5 w-3.5')}
        </div>
      </div>
      <p className={`text-xl font-bold ${valueClassName}`}>{value}</p>
      {subtext && <p className={`mt-1 text-xs ${panelClassName.includes('border-red') ? 'text-red-500' : 'text-gray-400'}`}>{subtext}</p>}
    </div>
  );
};

export const FinanceSummaryHeader = ({ title, subtitle, pendingCount }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
    {pendingCount > 0 && (
      <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
        <Bell className="h-4 w-4 animate-pulse text-red-500" />
        <span className="text-sm font-semibold text-red-700">
          {pendingCount} payment{pendingCount !== 1 ? 's' : ''} pending action
        </span>
      </div>
    )}
  </div>
);

export const FinanceStatGrid = ({ totalBill, totalPaid, remaining, pendingCount, paidSubtext, remainingSubtext }) => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
    <FinanceStatCard
      label="Total Bill"
      value={formatCurrency(totalBill)}
      subtext="All cost components"
      icon={DollarSign}
      iconClassName="bg-blue-50 text-blue-600"
    />
    <FinanceStatCard
      label="Total Paid"
      value={formatCurrency(totalPaid)}
      subtext={paidSubtext || 'Finance recorded'}
      valueClassName="text-green-700"
      icon={CheckCircle2}
      iconClassName="bg-green-50 text-green-600"
    />
    <FinanceStatCard
      label="Remaining"
      value={formatBalance(remaining)}
      subtext={remainingSubtext || 'Yet to be paid'}
      valueClassName={remaining < 0 ? 'text-red-700' : 'text-orange-700'}
      icon={TrendingUp}
      iconClassName="bg-orange-50 text-orange-600"
    />
    <FinanceStatCard
      label="Pending Actions"
      value={String(pendingCount)}
      subtext={pendingCount > 0 ? 'Requires payment' : 'All clear'}
      valueClassName={pendingCount > 0 ? 'text-red-700' : 'text-gray-900'}
      panelClassName={pendingCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}
      icon={Bell}
      iconClassName={pendingCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-400'}
    />
  </div>
);

export const FinanceMiniMeta = ({ label, value, icon, bgClassName, iconClassName }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-3 ${bgClassName}`}>
          {renderIconNode(icon, `h-5 w-5 ${iconClassName}`)}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export const FinanceScopeMetaCards = ({ shipment }) => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
    <FinanceMiniMeta label="Shipment Number" value={shipment.shipment_number} icon={Hash} bgClassName="bg-blue-100" iconClassName="text-blue-600" />
    <FinanceMiniMeta label="Status" value={shipment.status} icon={FileText} bgClassName="bg-purple-100" iconClassName="text-purple-600" />
    <FinanceMiniMeta label="Progress" value={`${shipment.progress}%`} icon={TrendingUp} bgClassName="bg-green-100" iconClassName="text-green-600" />
    <FinanceMiniMeta label="Completed Steps" value={`${shipment.completedSteps} / 6`} icon={Calendar} bgClassName="bg-orange-100" iconClassName="text-orange-600" />
  </div>
);
