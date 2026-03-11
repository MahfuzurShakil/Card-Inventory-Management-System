import { useState, useMemo } from 'react';
import {
  Ship, FileText, Building, CreditCard, Percent, Shield,
  ChevronDown, ChevronRight, CheckCircle2, Clock, AlertCircle,
  Eye, Upload, Save, X, Plus, Check, Bell, Filter,
  DollarSign, TrendingUp, Package, ArrowLeft, ExternalLink,
  RefreshCw, Info, Paperclip, Calendar, Hash
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const fmt = (n) =>
  n === undefined || n === null || n === '' ? '—'
    : `৳${Number(n).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtRaw = (n) => Number(n) || 0;

const STEP_KEYS = [
  'freight_forwarder',
  'customs_duty',
  'cnf_agent',
  'lc_commission',
  'bank_interest',
  'insurance',     // virtual — comes from LC
];

const STEP_META = {
  freight_forwarder: { label: 'Freight',      icon: Ship,        color: 'blue'   },
  customs_duty:      { label: 'Customs',       icon: FileText,    color: 'purple' },
  cnf_agent:         { label: 'C&F Agent',     icon: Building,    color: 'orange' },
  lc_commission:     { label: 'LC Commission', icon: CreditCard,  color: 'pink'   },
  bank_interest:     { label: 'Bank Interest', icon: Percent,     color: 'indigo' },
  insurance:         { label: 'Insurance',     icon: Shield,      color: 'teal'   },
};

const COLOR_CLASSES = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'bg-blue-100 text-blue-600',   badge: 'bg-blue-100 text-blue-700'   },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-700' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-200',   icon: 'bg-pink-100 text-pink-600',   badge: 'bg-pink-100 text-pink-700'   },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   icon: 'bg-teal-100 text-teal-600',   badge: 'bg-teal-100 text-teal-700'   },
};

/* derive per-step bill amount and payment status from stepData */
const getStepInfo = (stepKey, stepData, lc) => {
  if (stepKey === 'insurance') {
    return {
      billAmount:  fmtRaw(lc.insurance_bill_amount),
      details: [
        { label: 'Company',        value: lc.insurance_company_name || '—' },
        { label: 'Cover Note #',   value: lc.cover_note_number || '—' },
        { label: 'Issue Date',     value: lc.insurance_issue_date || '—' },
        { label: 'Bill Amount',    value: fmt(lc.insurance_bill_amount) },
      ],
      docName: lc.insurance_doc || null,
      isReadOnly: true,  // LC-level data, finance can't edit
    };
  }

  const sd = stepData?.[stepKey] || null;

  if (stepKey === 'freight_forwarder') {
    return {
      billAmount: fmtRaw(sd?.ff_bill_amount),
      details: sd ? [
        { label: 'Freight Forwarder', value: sd.ff_name || '—' },
        { label: 'AWB / BL No',       value: sd.awb_bl_no || '—' },
        { label: 'ETD',               value: sd.etd || '—' },
        { label: 'ETA',               value: sd.eta || '—' },
        { label: 'Bill Amount',       value: fmt(sd.ff_bill_amount) },
      ] : [],
      docName: sd?.freight_bill_path || null,
      isReadOnly: false,
    };
  }

  if (stepKey === 'customs_duty') {
    const total = sd
      ? ['cd','rd','sd','vat','ait','at','atv','df_vat']
          .reduce((s, f) => s + fmtRaw(sd[f]), 0)
      : 0;
    return {
      billAmount: total,
      details: sd ? [
        { label: 'CD',     value: fmt(sd.cd) },
        { label: 'RD',     value: fmt(sd.rd) },
        { label: 'SD',     value: fmt(sd.sd) },
        { label: 'VAT',    value: fmt(sd.vat) },
        { label: 'AIT',    value: fmt(sd.ait) },
        { label: 'AT',     value: fmt(sd.at) },
        { label: 'ATV',    value: fmt(sd.atv) },
        { label: 'DF VAT', value: fmt(sd.df_vat) },
        { label: 'Total',  value: fmt(total), bold: true },
      ] : [],
      docName: sd?.be_document_path || null,
      isReadOnly: true,  // customs — view only
    };
  }

  if (stepKey === 'cnf_agent') {
    return {
      billAmount: fmtRaw(sd?.cnf_bill_value),
      details: sd ? [
        { label: 'C&F Agent Name',       value: sd.cnf_agent_name || '—' },
        { label: 'Documents Handover',   value: sd.documents_handover_date || '—' },
        { label: 'Cargo Release Date',   value: sd.cargo_release_date || '—' },
        { label: 'Bill Value',           value: fmt(sd.cnf_bill_value) },
      ] : [],
      docName: sd?.cnf_bill_path || null,
      isReadOnly: false,
    };
  }

  if (stepKey === 'lc_commission') {
    const total = sd
      ? ['lc_commission','vat_on_commission','stamp_charges','other_charges','other_vat']
          .reduce((s, f) => s + fmtRaw(sd[f]), 0)
      : 0;
    return {
      billAmount: total,
      details: sd ? [
        { label: 'LC Commission',     value: fmt(sd.lc_commission) },
        { label: 'VAT on Commission', value: fmt(sd.vat_on_commission) },
        { label: 'Stamp Charges',     value: fmt(sd.stamp_charges) },
        { label: 'Other Charges',     value: fmt(sd.other_charges) },
        { label: 'Other VAT',         value: fmt(sd.other_vat) },
        { label: 'Total',             value: fmt(total), bold: true },
      ] : [],
      docName: null,
      isReadOnly: false,
    };
  }

  if (stepKey === 'bank_interest') {
    const total = fmtRaw(sd?.lc_value_bdt_realised) + fmtRaw(sd?.interest_amount);
    return {
      billAmount: total,
      details: sd ? [
        { label: 'LC Value (BDT Realised)', value: fmt(sd.lc_value_bdt_realised) },
        { label: 'Interest Amount',         value: fmt(sd.interest_amount) },
        { label: 'Document No.',            value: sd.document_no || '—' },
        { label: 'Date',                    value: sd.date || '—' },
        { label: 'Total',                   value: fmt(total), bold: true },
      ] : [],
      docName: sd?.document_path || null,
      isReadOnly: false,
    };
  }

  return { billAmount: 0, details: [], docName: null, isReadOnly: false };
};

/* ─────────────────────────────────────────────────────────────────
   PAYMENT MODAL
   Finance user records an actual payment against a step
───────────────────────────────────────────────────────────────── */
const PaymentModal = ({ stepKey, shipmentId, lcNumber, billAmount, existingPayments = [], onClose, onSave }) => {
  const [payments, setPayments] = useState(existingPayments.length > 0
    ? existingPayments
    : [{ amount: '', date: new Date().toISOString().split('T')[0], ref: '', note: '', file: null }]
  );

  const addRow = () => setPayments(p => [...p, { amount: '', date: new Date().toISOString().split('T')[0], ref: '', note: '', file: null }]);
  const removeRow = (i) => setPayments(p => p.filter((_, idx) => idx !== i));
  const updateRow = (i, field, val) => setPayments(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const totalPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const remaining = billAmount - totalPaid;
  const meta = STEP_META[stepKey];
  const Icon = meta.icon;
  const c = COLOR_CLASSES[meta.color];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${c.bg} ${c.border} border-b px-6 py-5 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${c.icon}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Record Payment — {meta.label}</h2>
                <p className="text-sm text-gray-500">{lcNumber} · Shipment #{shipmentId}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-60 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Bill vs Paid summary */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white bg-opacity-70 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Bill Amount</p>
              <p className="font-bold text-gray-900 text-sm">{fmt(billAmount)}</p>
            </div>
            <div className="bg-white bg-opacity-70 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Paid</p>
              <p className={`font-bold text-sm ${totalPaid > billAmount ? 'text-red-600' : 'text-green-600'}`}>{fmt(totalPaid)}</p>
            </div>
            <div className="bg-white bg-opacity-70 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Remaining</p>
              <p className={`font-bold text-sm ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {remaining < 0 ? `Over by ${fmt(Math.abs(remaining))}` : fmt(remaining)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment rows */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-800 text-sm">Payment Entries</h3>
            <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="w-4 h-4" /> Add Payment
            </button>
          </div>

          {payments.map((row, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment #{i + 1}</span>
                {payments.length > 1 && (
                  <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paid (৳) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={e => updateRow(i, 'amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={row.date}
                    onChange={e => updateRow(i, 'date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Voucher #</label>
                  <input
                    type="text"
                    value={row.ref}
                    onChange={e => updateRow(i, 'ref', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. VCH-2025-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
                  <input
                    type="text"
                    value={row.note}
                    onChange={e => updateRow(i, 'note', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional note..."
                  />
                </div>
              </div>
              {/* File attachment */}
              <div className="relative">
                <input
                  type="file"
                  id={`pay-file-${i}`}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => updateRow(i, 'file', e.target.files[0]?.name || null)}
                />
                <div className={`border border-dashed rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm cursor-pointer transition-colors
                  ${row.file ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 bg-white text-gray-500 hover:border-blue-400'}`}>
                  <Paperclip className="w-4 h-4" />
                  {row.file ? row.file : 'Attach payment document (PDF / Image)'}
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
              Cancel
            </button>
            <button
              onClick={() => onSave(payments)}
              disabled={payments.some(p => !p.amount || !p.date)}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Payments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   STEP CARD  (one cost step inside a shipment accordion)
───────────────────────────────────────────────────────────────── */
const StepCard = ({ stepKey, stepData, lc, shipmentId, financeData, onPaymentSave }) => {
  const [expanded, setExpanded] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const info = getStepInfo(stepKey, stepData, lc);
  const meta = STEP_META[stepKey];
  const Icon = meta.icon;
  const c = COLOR_CLASSES[meta.color];

  const finKey = `${shipmentId}__${stepKey}`;
  const existingPayments = financeData?.[finKey] || [];
  const totalPaid = existingPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  const hasData = info.billAmount > 0 || info.details.length > 0;
  const isFullyPaid = hasData && totalPaid >= info.billAmount && info.billAmount > 0;
  const isPartiallyPaid = totalPaid > 0 && !isFullyPaid;
  const isPendingPayment = hasData && !isFullyPaid && !info.isReadOnly;

  const paymentStatus = info.isReadOnly
    ? null
    : isFullyPaid ? 'paid'
    : isPartiallyPaid ? 'partial'
    : hasData ? 'pending'
    : 'no-data';

  const statusBadge = {
    paid:     { label: 'Paid',         cls: 'bg-green-100 text-green-700 border-green-200' },
    partial:  { label: 'Partial',      cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    pending:  { label: 'Pending',      cls: 'bg-red-100 text-red-700 border-red-200' },
    'no-data':{ label: 'No Data Yet',  cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  };

  return (
    <>
      <div className={`border rounded-xl overflow-hidden transition-all ${expanded ? `${c.border} border` : 'border-gray-200'}`}>
        {/* Card header */}
        <div
          className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors ${expanded ? c.bg : 'bg-white hover:bg-gray-50'}`}
          onClick={() => setExpanded(e => !e)}
        >
          <div className={`p-2 rounded-lg flex-shrink-0 ${expanded ? c.icon : 'bg-gray-100 text-gray-500'}`}>
            <Icon className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-gray-900">{meta.label}</span>
              {info.isReadOnly && (
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">view only</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm font-semibold text-gray-800">
                {info.billAmount > 0 ? fmt(info.billAmount) : '—'}
              </span>
              {!info.isReadOnly && totalPaid > 0 && (
                <span className="text-xs text-gray-400">paid: {fmt(totalPaid)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {paymentStatus && paymentStatus !== 'no-data' && (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge[paymentStatus]?.cls}`}>
                {statusBadge[paymentStatus]?.label}
              </span>
            )}
            {paymentStatus === 'no-data' && (
              <span className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-400">No Data</span>
            )}
            {isPendingPayment && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" title="Payment pending" />
            )}
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className={`border-t ${c.border} ${c.bg} px-4 py-4 space-y-4`}>
            {/* Details grid */}
            {info.details.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {info.details.map((d, i) => (
                  <div key={i} className={`bg-white rounded-lg p-2.5 border border-white ${d.bold ? 'col-span-2 md:col-span-3' : ''}`}>
                    <p className="text-xs text-gray-400 mb-0.5">{d.label}</p>
                    <p className={`text-sm ${d.bold ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{d.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Document */}
            {info.docName && (
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-white w-fit">
                <Paperclip className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-blue-600 underline cursor-pointer hover:text-blue-700">{info.docName}</span>
              </div>
            )}

            {/* Payment history */}
            {!info.isReadOnly && existingPayments.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment History</p>
                <div className="bg-white rounded-lg border border-white overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500">Amount</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Ref</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Note</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Doc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {existingPayments.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-700">{p.date || '—'}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(p.amount)}</td>
                          <td className="px-3 py-2 text-gray-600">{p.ref || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{p.note || '—'}</td>
                          <td className="px-3 py-2">
                            {p.file ? (
                              <span className="text-blue-500 underline cursor-pointer hover:text-blue-600">{p.file}</span>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action button */}
            {!info.isReadOnly && hasData && (
              <div className="flex justify-end">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowPayModal(true); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm
                    ${isFullyPaid
                      ? 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  {isFullyPaid ? (
                    <><RefreshCw className="w-3.5 h-3.5" /> Update Payment</>
                  ) : (
                    <><DollarSign className="w-3.5 h-3.5" /> Record Payment</>
                  )}
                </button>
              </div>
            )}

            {info.isReadOnly && (
              <p className="text-xs text-gray-400 italic flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                {stepKey === 'insurance'
                  ? 'Insurance details are set during LC creation. Contact procurement to update.'
                  : 'Customs data is entered by the procurement team and is read-only here.'}
              </p>
            )}
          </div>
        )}
      </div>

      {showPayModal && (
        <PaymentModal
          stepKey={stepKey}
          shipmentId={shipmentId}
          lcNumber={lc.lc_number}
          billAmount={info.billAmount}
          existingPayments={existingPayments}
          onClose={() => setShowPayModal(false)}
          onSave={(payments) => {
            onPaymentSave(finKey, payments);
            setShowPayModal(false);
          }}
        />
      )}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────
   SHIPMENT ACCORDION ROW
───────────────────────────────────────────────────────────────── */
const ShipmentRow = ({ lc, shipment, financeData, onPaymentSave }) => {
  const [expanded, setExpanded] = useState(false);

  const sd = shipment.stepData || {};

  // Compute totals
  const billAmounts = {
    freight_forwarder: fmtRaw(sd.freight_forwarder?.ff_bill_amount),
    customs_duty: ['cd','rd','sd','vat','ait','at','atv','df_vat'].reduce((s,f) => s + fmtRaw(sd.customs_duty?.[f]), 0),
    cnf_agent: fmtRaw(sd.cnf_agent?.cnf_bill_value),
    lc_commission: ['lc_commission','vat_on_commission','stamp_charges','other_charges','other_vat'].reduce((s,f) => s + fmtRaw(sd.lc_commission?.[f]), 0),
    bank_interest: fmtRaw(sd.bank_interest?.lc_value_bdt_realised) + fmtRaw(sd.bank_interest?.interest_amount),
    insurance: fmtRaw(lc.insurance_bill_amount),
  };

  const totalBill = Object.values(billAmounts).reduce((s, v) => s + v, 0);

  // count pending payment steps (non-readonly with data but no payment)
  const pendingSteps = STEP_KEYS.filter(k => {
    const ba = billAmounts[k];
    if (ba <= 0) return false;
    if (k === 'customs_duty' || k === 'insurance') return false; // read-only
    const finKey = `${shipment.shipment_number}__${k}`;
    const paid = (financeData?.[finKey] || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    return paid < ba;
  });

  const allPaid = pendingSteps.length === 0 &&
    STEP_KEYS.some(k => billAmounts[k] > 0 && k !== 'customs_duty' && k !== 'insurance');

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Shipment header row */}
      <div
        className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors ${expanded ? 'bg-gray-50 border-b border-gray-200' : 'bg-white hover:bg-gray-50'}`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-400">Shipment</p>
            <p className="font-semibold text-gray-900 text-sm mt-0.5">{shipment.shipment_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Status</p>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5
              ${shipment.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {shipment.status === 'Completed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              {shipment.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Bill</p>
            <p className="font-bold text-gray-900 text-sm mt-0.5">{totalBill > 0 ? fmt(totalBill) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Payment Status</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {allPaid ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium border border-green-200">
                  All Paid
                </span>
              ) : pendingSteps.length > 0 ? (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium border border-red-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {pendingSteps.length} Pending
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">—</span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </div>

      {/* Cost steps */}
      {expanded && (
        <div className="p-4 space-y-2 bg-gray-50">
          {STEP_KEYS.map(stepKey => (
            <StepCard
              key={stepKey}
              stepKey={stepKey}
              stepData={sd}
              lc={lc}
              shipmentId={shipment.shipment_number}
              financeData={financeData}
              onPaymentSave={onPaymentSave}
            />
          ))}

          {/* Shipment total summary */}
          <div className="mt-3 bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cost Summary</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {STEP_KEYS.map(k => billAmounts[k] > 0 && (
                <div key={k} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-500 text-xs">{STEP_META[k].label}</span>
                  <span className="font-semibold text-gray-900">{fmt(billAmounts[k])}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
              <span className="font-semibold text-gray-700">Total Landing Cost</span>
              <span className="font-bold text-lg text-gray-900">{fmt(totalBill)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   LC ACCORDION SECTION
───────────────────────────────────────────────────────────────── */
const LCSection = ({ lc, financeData, onPaymentSave }) => {
  const [expanded, setExpanded] = useState(false);

  const allShipmentBills = lc.shipments.map(s => {
    const sd = s.stepData || {};
    return (
      fmtRaw(sd.freight_forwarder?.ff_bill_amount) +
      ['cd','rd','sd','vat','ait','at','atv','df_vat'].reduce((sum, f) => sum + fmtRaw(sd.customs_duty?.[f]), 0) +
      fmtRaw(sd.cnf_agent?.cnf_bill_value) +
      ['lc_commission','vat_on_commission','stamp_charges','other_charges','other_vat'].reduce((sum, f) => sum + fmtRaw(sd.lc_commission?.[f]), 0) +
      fmtRaw(sd.bank_interest?.lc_value_bdt_realised) + fmtRaw(sd.bank_interest?.interest_amount)
    );
  });

  const totalBill = allShipmentBills.reduce((s, v) => s + v, 0) + fmtRaw(lc.insurance_bill_amount);

  const totalPendingSteps = lc.shipments.reduce((count, s) => {
    const sd = s.stepData || {};
    const ba = {
      freight_forwarder: fmtRaw(sd.freight_forwarder?.ff_bill_amount),
      cnf_agent: fmtRaw(sd.cnf_agent?.cnf_bill_value),
      lc_commission: ['lc_commission','vat_on_commission','stamp_charges','other_charges','other_vat'].reduce((s,f) => s + fmtRaw(sd.lc_commission?.[f]), 0),
      bank_interest: fmtRaw(sd.bank_interest?.lc_value_bdt_realised) + fmtRaw(sd.bank_interest?.interest_amount),
    };
    return count + Object.entries(ba).filter(([k, v]) => {
      if (v <= 0) return false;
      const finKey = `${s.shipment_number}__${k}`;
      const paid = (financeData?.[finKey] || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
      return paid < v;
    }).length;
  }, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* LC header */}
      <div
        className="flex items-center gap-4 px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <p className="text-xs text-gray-400">LC Number</p>
            <p className="font-bold text-gray-900 mt-0.5">{lc.lc_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Bank</p>
            <p className="font-medium text-gray-700 text-sm mt-0.5">{lc.bank_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Shipments</p>
            <p className="font-medium text-gray-700 text-sm mt-0.5">{lc.shipments.length} shipment{lc.shipments.length !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Total Landing Cost</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="font-bold text-gray-900">{totalBill > 0 ? fmt(totalBill) : '—'}</p>
              {totalPendingSteps > 0 && (
                <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 font-medium">
                  <Bell className="w-3 h-3" />
                  {totalPendingSteps} action{totalPendingSteps !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Shipments */}
      {expanded && (
        <div className="border-t border-gray-200 p-5 space-y-3 bg-gray-50">
          {lc.shipments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No shipments for this LC yet.</p>
            </div>
          ) : (
            lc.shipments.map(shipment => (
              <ShipmentRow
                key={shipment.shipment_number}
                lc={lc}
                shipment={shipment}
                financeData={financeData}
                onPaymentSave={onPaymentSave}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────── */
const LandingCost = ({ lcs = [], financeData = {}, onPaymentSave }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  // Summary metrics
  const metrics = useMemo(() => {
    let totalBill = 0, totalPaid = 0, pendingCount = 0;

    lcs.forEach(lc => {
      totalBill += fmtRaw(lc.insurance_bill_amount);
      lc.shipments.forEach(s => {
        const sd = s.stepData || {};
        const bills = {
          freight_forwarder: fmtRaw(sd.freight_forwarder?.ff_bill_amount),
          cnf_agent: fmtRaw(sd.cnf_agent?.cnf_bill_value),
          lc_commission: ['lc_commission','vat_on_commission','stamp_charges','other_charges','other_vat'].reduce((sum,f) => sum + fmtRaw(sd.lc_commission?.[f]), 0),
          bank_interest: fmtRaw(sd.bank_interest?.lc_value_bdt_realised) + fmtRaw(sd.bank_interest?.interest_amount),
        };
        Object.entries(bills).forEach(([k, v]) => {
          totalBill += v;
          const finKey = `${s.shipment_number}__${k}`;
          const paid = (financeData?.[finKey] || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
          totalPaid += Math.min(paid, v);
          if (v > 0 && paid < v) pendingCount++;
        });
      });
    });

    return { totalBill, totalPaid, pendingCount, remaining: totalBill - totalPaid };
  }, [lcs, financeData]);

  const filteredLCs = useMemo(() => {
    return lcs.filter(lc => {
      const matchSearch = !search || lc.lc_number.toLowerCase().includes(search.toLowerCase()) || (lc.bank_name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || lc.status === statusFilter;

      if (showOnlyPending) {
        const hasPending = lc.shipments.some(s => {
          const sd = s.stepData || {};
          const ba = {
            freight_forwarder: fmtRaw(sd.freight_forwarder?.ff_bill_amount),
            cnf_agent: fmtRaw(sd.cnf_agent?.cnf_bill_value),
            lc_commission: ['lc_commission','vat_on_commission','stamp_charges','other_charges','other_vat'].reduce((sum,f) => sum + fmtRaw(sd.lc_commission?.[f]), 0),
            bank_interest: fmtRaw(sd.bank_interest?.lc_value_bdt_realised) + fmtRaw(sd.bank_interest?.interest_amount),
          };
          return Object.entries(ba).some(([k, v]) => {
            if (v <= 0) return false;
            const finKey = `${s.shipment_number}__${k}`;
            const paid = (financeData?.[finKey] || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
            return paid < v;
          });
        });
        if (!hasPending) return false;
      }

      return matchSearch && matchStatus;
    });
  }, [lcs, search, statusFilter, showOnlyPending, financeData]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landing Cost</h1>
          <p className="text-sm text-gray-500 mt-1">Review shipment costs, verify documents, and record payments</p>
        </div>
        {metrics.pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
            <Bell className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-red-700">{metrics.pendingCount} payment{metrics.pendingCount !== 1 ? 's' : ''} pending action</span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Total Bill</p>
            <div className="p-1.5 bg-blue-50 rounded-lg"><DollarSign className="w-3.5 h-3.5 text-blue-600" /></div>
          </div>
          <p className="text-xl font-bold text-gray-900">{fmt(metrics.totalBill)}</p>
          <p className="text-xs text-gray-400 mt-1">All cost components</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Total Paid</p>
            <div className="p-1.5 bg-green-50 rounded-lg"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /></div>
          </div>
          <p className="text-xl font-bold text-green-700">{fmt(metrics.totalPaid)}</p>
          <p className="text-xs text-gray-400 mt-1">Finance recorded</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">Remaining</p>
            <div className="p-1.5 bg-orange-50 rounded-lg"><TrendingUp className="w-3.5 h-3.5 text-orange-600" /></div>
          </div>
          <p className="text-xl font-bold text-orange-700">{fmt(metrics.remaining)}</p>
          <p className="text-xs text-gray-400 mt-1">Yet to be paid</p>
        </div>
        <div className={`border rounded-xl p-4 shadow-sm ${metrics.pendingCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-medium ${metrics.pendingCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Pending Actions</p>
            <div className={`p-1.5 rounded-lg ${metrics.pendingCount > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
              <Bell className={`w-3.5 h-3.5 ${metrics.pendingCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
          </div>
          <p className={`text-xl font-bold ${metrics.pendingCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>{metrics.pendingCount}</p>
          <p className={`text-xs mt-1 ${metrics.pendingCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {metrics.pendingCount > 0 ? 'Requires payment' : 'All clear'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search LC number or bank..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Draft">Draft</option>
          <option value="Closed">Closed</option>
        </select>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setShowOnlyPending(v => !v)}
            className={`w-9 h-5 rounded-full transition-colors relative ${showOnlyPending ? 'bg-red-500' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showOnlyPending ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-gray-600 font-medium">Pending Only</span>
        </label>
      </div>

      {/* LC list */}
      <div className="space-y-4">
        {filteredLCs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No LCs found</p>
            <p className="text-sm text-gray-400 mt-1">
              {showOnlyPending ? 'No pending payment actions.' : 'No LCs match your search filters.'}
            </p>
          </div>
        ) : (
          filteredLCs.map(lc => (
            <LCSection
              key={lc.id}
              lc={lc}
              financeData={financeData}
              onPaymentSave={onPaymentSave}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LandingCost;