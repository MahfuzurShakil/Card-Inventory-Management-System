import { 
  ArrowLeft, Ship, CheckCircle2, TrendingUp, DollarSign, 
  Building2, Percent, CreditCard, User, Warehouse, FileText, 
  ChevronDown, ChevronUp, Calendar, Download, Eye, Hash, AlertTriangle, Package
} from 'lucide-react';
import { useState } from 'react';

// ─── File Action Button ───────────────────────────────────────────────────────
const FileActions = ({ filePath }) => {
  if (!filePath) return <span className="text-sm text-gray-400 italic">No file uploaded</span>;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]" title={filePath}>
        📄 {filePath}
      </span>
      <button
        onClick={() => alert(`Viewing: ${filePath}`)}
        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
      >
        <Eye className="w-3 h-3" /> View
      </button>
      <button
        onClick={() => alert(`Downloading: ${filePath}`)}
        className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white text-gray-600 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
      >
        <Download className="w-3 h-3" /> Download
      </button>
    </div>
  );
};

// ─── Single display field ─────────────────────────────────────────────────────
const Field = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className="text-sm font-semibold text-gray-900">
      {value || <span className="text-gray-400 font-normal italic">—</span>}
    </p>
  </div>
);

// ─── Group label inside expanded panel ───────────────────────────────────────
const GroupLabel = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{children}</p>
);

// ─── Horizontal divider ───────────────────────────────────────────────────────
const Divider = () => <div className="border-t border-gray-200 my-5" />;

// ─── Warehouse Items Table with expandable box rows ──────────────────────────
const WarehouseItemsTable = ({ items, formatDateTime }) => {
  const [expandedItems, setExpandedItems] = useState({});
  const toggle = (idx) => setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 text-xs font-semibold text-gray-600 border-b border-gray-200">
          <tr>
            <th className="w-8 px-3 py-3"></th>
            <th className="px-4 py-3 whitespace-nowrap">S/N</th>
            <th className="px-4 py-3 whitespace-nowrap">Item Type</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">Quantity</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">No. of Boxes</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">Qty / Box</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">Total Qty</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">Missing Boxes</th>
            <th className="px-4 py-3 text-right whitespace-nowrap">Missing Qty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {items.map((item, idx) => {
            const boxes = item.boxes || [];
            const noBoxes = parseInt(item.no_of_boxes) || 0;
            const isExpanded = expandedItems[idx];
            return (
              <>
                <tr
                  key={`item-${idx}`}
                  className={`hover:bg-gray-50 transition-colors ${noBoxes > 0 ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-green-50' : ''}`}
                  onClick={() => noBoxes > 0 && toggle(idx)}
                >
                  <td className="px-3 py-3 text-center">
                    {noBoxes > 0 ? (
                      isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                    ) : <span className="block w-4 h-4" />}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.serial || idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      (item.item_type || '').toLowerCase().includes('chip')  ? 'bg-blue-100 text-blue-800' :
                      (item.item_type || '').toLowerCase().includes('tape')  ? 'bg-purple-100 text-purple-800' :
                      (item.item_type || '').toLowerCase().includes('sheet') ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{item.item_type || item.item_name || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{(item.quantity || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {noBoxes > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        <Package className="w-3 h-3" /> {noBoxes} boxes
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{item.quantity_per_box || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{(item.quantity || 0).toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-medium ${parseInt(item.missing_boxes) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {item.missing_boxes || '0'}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${parseInt(item.missing_quantity) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {item.missing_quantity || '0'}
                  </td>
                </tr>

                {/* Expanded box breakdown */}
                {isExpanded && boxes.length > 0 && (
                  <tr key={`boxes-${idx}`}>
                    <td colSpan="9" className="px-0 py-0 bg-gray-50 border-b border-gray-200">
                      <div className="px-8 py-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Box Breakdown — {item.item_type} · {boxes.length} boxes
                        </p>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="max-h-52 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Box Name</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Missing</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Extra</th>
                                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Final Qty</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {boxes.map((box, boxIdx) => (
                                  <tr key={boxIdx} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-mono text-gray-700">{box.box_name}</td>
                                    <td className="px-3 py-2 text-center font-semibold text-gray-800">{(box.quantity || 0).toLocaleString()}</td>
                                    <td className={`px-3 py-2 text-center font-medium ${(box.missing_qty || 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                      {box.missing_qty || 0}
                                    </td>
                                    <td className={`px-3 py-2 text-center font-medium ${(box.extra_qty || 0) > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                      {box.extra_qty || 0}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {(() => {
                                        const finalQty = Math.max(0, (box.quantity || 0) - (box.missing_qty || 0) + (box.extra_qty || 0));
                                        return (
                                          <span className={`text-xs font-semibold ${finalQty < (box.quantity||0) ? 'text-red-600' : finalQty > (box.quantity||0) ? 'text-blue-600' : 'text-green-700'}`}>
                                            {finalQty.toLocaleString()}
                                          </span>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 italic">{box.remarks || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-100 border-t-2 border-gray-200 text-sm font-semibold">
          <tr>
            <td colSpan={3} className="px-4 py-3 text-right text-gray-600">Totals:</td>
            <td className="px-4 py-3 text-right text-gray-900 font-bold">
              {items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0).toLocaleString()}
            </td>
            <td className="px-4 py-3 text-right text-gray-700">
              {items.reduce((s, i) => s + (parseInt(i.no_of_boxes) || 0), 0)} boxes
            </td>
            <td />
            <td className="px-4 py-3 text-right text-gray-900 font-bold">
              {items.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0).toLocaleString()}
            </td>
            <td className={`px-4 py-3 text-right ${items.reduce((s,i)=>s+(parseInt(i.missing_boxes)||0),0)>0?'text-red-600':'text-gray-400'}`}>
              {items.reduce((s,i)=>s+(parseInt(i.missing_boxes)||0),0)||'0'}
            </td>
            <td className={`px-4 py-3 text-right ${items.reduce((s, i) => s + (parseInt(i.missing_quantity) || 0), 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {items.reduce((s, i) => s + (parseInt(i.missing_quantity) || 0), 0) || '0'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ShipmentView = ({ lc, shipment, onBack }) => {
  const stepData = shipment.stepData || {};
  const [expandedSection, setExpandedSection] = useState(null);

  const totalCosts = {
    freight:    stepData.freight_forwarder?.ff_bill_amount || 0,
    customs:    stepData.customs_duty?.total_customs_amount || 0,
    cnf:        stepData.cnf_agent?.cnf_bill_value || 0,
    commission: stepData.lc_commission?.total_cost || 0,
    interest:   stepData.bank_interest?.interest_amount || 0,
  };
  const grandTotal = Object.values(totalCosts).reduce((sum, v) => sum + v, 0);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const summarySections = [
    { id: 'freight',    label: 'Freight Forwarder', value: totalCosts.freight,    icon: Ship,       iconBg: 'bg-blue-100',   iconColor: 'text-blue-600' },
    { id: 'customs',    label: 'Customs Duty',       value: totalCosts.customs,    icon: Building2,  iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { id: 'cnf',        label: 'C&F Agent',          value: totalCosts.cnf,        icon: User,       iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    { id: 'commission', label: 'LC Commission',      value: totalCosts.commission, icon: Percent,    iconBg: 'bg-pink-100',   iconColor: 'text-pink-600' },
    { id: 'interest',   label: 'Bank Interest',      value: totalCosts.interest,   icon: CreditCard, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { id: 'warehouse',  label: 'Warehouse Transfer', value: null,                  icon: Warehouse,  iconBg: 'bg-green-100',  iconColor: 'text-green-600' },
  ];

  const toggleSection = (id) => setExpandedSection(expandedSection === id ? null : id);

  // ─── Freight Forwarder ────────────────────────────────────────────────────────
  const renderFreightDetails = () => {
    const d = stepData.freight_forwarder;
    if (!d) return <p className="text-sm text-gray-400 italic">No data entered for this step yet.</p>;
    return (
      <div>
        <GroupLabel>Shipment Info</GroupLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-5">
          <Field label="Freight Forwarder Name" value={d.ff_name} />
          <Field label="AWB / BL Number"        value={d.awb_bl_no} />
          <Field label="ETD"                    value={formatDate(d.etd)} />
          <Field label="ETA"                    value={formatDate(d.eta)} />
          <Field label="FF Bill Amount (BDT)"   value={d.ff_bill_amount ? `৳${d.ff_bill_amount.toLocaleString()}` : '—'} />
        </div>

        <Divider />

        <GroupLabel>Documents</GroupLabel>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Freight Bill</p>
            <FileActions filePath={d.freight_bill_path} />
          </div>
        </div>

        <div className="flex gap-6 mt-5 pt-4 border-t border-gray-200 text-xs text-gray-400">
          <span>Created: {formatDateTime(d.created_at)}</span>
          <span>Last Updated: {formatDateTime(d.updated_at)}</span>
        </div>
      </div>
    );
  };

  // ─── Customs Duty ─────────────────────────────────────────────────────────────
  const renderCustomsDetails = () => {
    const d = stepData.customs_duty;
    if (!d) return <p className="text-sm text-gray-400 italic">No data entered for this step yet.</p>;
    const taxFields = [
      { label: 'CD (Customs Duty)',        field: 'cd' },
      { label: 'RD (Regulatory Duty)',     field: 'rd' },
      { label: 'SD (Supplementary Duty)',  field: 'sd' },
      { label: 'VAT',                      field: 'vat' },
      { label: 'AIT (Advance Income Tax)', field: 'ait' },
      { label: 'AT (Advance Tax)',         field: 'at' },
      { label: 'ATV (Advance Trade VAT)',  field: 'atv' },
      { label: 'DF VAT (Deferred VAT)',    field: 'df_vat' },
    ];
    return (
      <div>
        <GroupLabel>Tax Breakdown</GroupLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
          {taxFields.map(({ label, field }) => (
            <Field key={field} label={label} value={`৳${(d[field] || 0).toLocaleString()}`} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-sm font-semibold text-gray-700">Total Customs Amount</span>
          <span className="text-base font-bold text-gray-900">৳{(d.total_customs_amount || 0).toLocaleString()}</span>
        </div>

        <Divider />

        <GroupLabel>Documents</GroupLabel>
        <div>
          <p className="text-xs text-gray-500 mb-1.5">BE (Bill of Entry) Document</p>
          <FileActions filePath={d.be_document_path} />
        </div>

        <div className="flex gap-6 mt-5 pt-4 border-t border-gray-200 text-xs text-gray-400">
          <span>Created: {formatDateTime(d.created_at)}</span>
          <span>Last Updated: {formatDateTime(d.updated_at)}</span>
        </div>
      </div>
    );
  };

  // ─── C&F Agent ────────────────────────────────────────────────────────────────
  const renderCnfDetails = () => {
    const d = stepData.cnf_agent;
    if (!d) return <p className="text-sm text-gray-400 italic">No data entered for this step yet.</p>;
    return (
      <div>
        <GroupLabel>Agent & Clearance Info</GroupLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5">
          <Field label="C&F Agent Name"          value={d.cnf_agent_name} />
          <Field label="Documents Handover Date" value={formatDate(d.documents_handover_date)} />
          <Field label="Cargo Release Date"      value={formatDate(d.cargo_release_date)} />
          <Field label="C&F Bill Value (BDT)"    value={d.cnf_bill_value ? `৳${d.cnf_bill_value.toLocaleString()}` : '—'} />
        </div>

        <Divider />

        <GroupLabel>Documents</GroupLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <p className="text-xs text-gray-500 mb-1.5">C&F Bill</p>
            <FileActions filePath={d.cnf_bill_path} />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Commercial Document</p>
            <FileActions filePath={d.commercial_doc_path} />
          </div>
        </div>

        <div className="flex gap-6 mt-5 pt-4 border-t border-gray-200 text-xs text-gray-400">
          <span>Created: {formatDateTime(d.created_at)}</span>
          <span>Last Updated: {formatDateTime(d.updated_at)}</span>
        </div>
      </div>
    );
  };

  // ─── LC Commission ────────────────────────────────────────────────────────────
  const renderCommissionDetails = () => {
    const d = stepData.lc_commission;
    if (!d) return <p className="text-sm text-gray-400 italic">No data entered for this step yet.</p>;
    const fields = [
      { label: 'LC Commission (BDT)',     field: 'lc_commission' },
      { label: 'VAT on Commission (BDT)', field: 'vat_on_commission' },
      { label: 'Stamp Charges (BDT)',     field: 'stamp_charges' },
      { label: 'Other Charges (BDT)',     field: 'other_charges' },
      { label: 'Other VAT (BDT)',         field: 'other_vat' },
    ];
    return (
      <div>
        <GroupLabel>Commission Breakdown</GroupLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-5">
          {fields.map(({ label, field }) => (
            <Field key={field} label={label} value={`৳${(d[field] || 0).toLocaleString()}`} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
          <span className="text-sm font-semibold text-gray-700">Total Commission Cost</span>
          <span className="text-base font-bold text-gray-900">৳{(d.total_cost || 0).toLocaleString()}</span>
        </div>

        <div className="flex gap-6 mt-5 pt-4 border-t border-gray-200 text-xs text-gray-400">
          <span>Created: {formatDateTime(d.created_at)}</span>
          <span>Last Updated: {formatDateTime(d.updated_at)}</span>
        </div>
      </div>
    );
  };

  // ─── Bank Interest ────────────────────────────────────────────────────────────
  const renderInterestDetails = () => {
    const d = stepData.bank_interest;
    if (!d) return <p className="text-sm text-gray-400 italic">No data entered for this step yet.</p>;
    return (
      <div>
        <GroupLabel>Interest Details</GroupLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
          <Field label="Date"                         value={formatDate(d.date)} />
          <Field label="Document No."                 value={d.document_no} />
          <Field label="LC Value Foreign Realised"    value={d.lc_value_foreign_realised ? d.lc_value_foreign_realised.toLocaleString() : '—'} />
          <Field label="Exchange Rate"                value={d.exchange_rate ? d.exchange_rate.toLocaleString() : '—'} />
          <Field label="LC Value BDT Realised"        value={d.lc_value_bdt_realised ? `৳ ${parseFloat(d.lc_value_bdt_realised).toLocaleString()}` : '—'} />
          <Field label="Interest Amount (BDT)"        value={d.interest_amount ? `৳ ${d.interest_amount.toLocaleString()}` : '—'} />
        </div>

        <Divider />

        <GroupLabel>Documents</GroupLabel>
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Interest Document</p>
          <FileActions filePath={d.document_path} />
        </div>

        <div className="flex gap-6 mt-5 pt-4 border-t border-gray-200 text-xs text-gray-400">
          <span>Created: {formatDateTime(d.created_at)}</span>
          <span>Last Updated: {formatDateTime(d.updated_at)}</span>
        </div>
      </div>
    );
  };

  // ─── Warehouse Transfer ───────────────────────────────────────────────────────
  const renderWarehouseDetails = () => {
    const d = stepData.warehouse;
    if (!d) return <p className="text-sm text-gray-400 italic">No data entered for this step yet.</p>;
    const items      = d.items || [];
    const totalBoxes = items.reduce((sum, item) => sum + (parseInt(item.no_of_boxes) || 0), 0);
    const totalMissing = items.reduce((sum, item) => sum + (parseInt(item.missing_quantity) || 0), 0);
    const ws = d.warehouse_status;

    const statusCfg = {
      received:   { label: '✓ Received',   bg: 'bg-green-100', tx: 'text-green-800' },
      dispatched: { label: '→ Dispatched', bg: 'bg-blue-100',  tx: 'text-blue-800'  },
      draft:      { label: '· Draft',      bg: 'bg-gray-100',  tx: 'text-gray-600'  },
    };
    const sc = statusCfg[ws] || statusCfg.draft;

    return (
      <div>
        <GroupLabel>Transfer Summary</GroupLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-5 mb-5">
          <div>
            <p className="text-xs text-gray-500 mb-1">Transfer Status</p>
            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${sc.bg} ${sc.tx}`}>
              {sc.label}
            </span>
          </div>
          <Field label="Total Line Items" value={String(items.length)} />
          <Field label="Total Quantity"   value={(d.total_quantity || 0).toLocaleString()} />
          <Field label="Total Boxes"      value={totalBoxes.toLocaleString()} />
        </div>

        {totalMissing > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span><strong>{totalMissing}</strong> missing units recorded across all items.</span>
          </div>
        )}

        {/* ── Challan Document ── */}
        <Divider />
        <GroupLabel>Challan Document</GroupLabel>
        <div className="mb-5">
          <p className="text-xs text-gray-500 mb-1.5">Challan (one per shipment)</p>
          <FileActions filePath={d.challan_path} />
        </div>

        {/* ── Items with expandable box breakdown ── */}
        {items.length > 0 && (
          <>
            <Divider />
            <GroupLabel>Goods Transferred</GroupLabel>
            <WarehouseItemsTable items={items} formatDateTime={formatDateTime} />
          </>
        )}

        <div className="flex gap-6 mt-5 pt-4 border-t border-gray-200 text-xs text-gray-400">
          <span>Created: {formatDateTime(d.created_at)}</span>
          <span>Last Updated: {formatDateTime(d.updated_at)}</span>
        </div>
      </div>
    );
  };

  const detailRenderers = {
    freight:    renderFreightDetails,
    customs:    renderCustomsDetails,
    cnf:        renderCnfDetails,
    commission: renderCommissionDetails,
    interest:   renderInterestDetails,
    warehouse:  renderWarehouseDetails,
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shipment Details</h1>
            <p className="text-sm text-gray-500 mt-1">
              {lc?.lc_number && <span className="text-gray-400 mr-1">{lc.lc_number} →</span>}
              {shipment.shipment_number}
            </p>
          </div>
        </div>
        <span className={`px-4 py-2 text-sm font-medium rounded-full ${
          shipment.status === 'Completed'   ? 'bg-green-100 text-green-800' :
          shipment.status === 'In Progress' ? 'bg-blue-100  text-blue-800'  :
          'bg-gray-100 text-gray-800'
        }`}>
          {shipment.status}
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Shipment Number', value: shipment.shipment_number,         icon: Ship,         bg: 'bg-blue-100',   ic: 'text-blue-600' },
          { label: 'Progress',        value: `${shipment.progress}%`,           icon: TrendingUp,   bg: 'bg-purple-100', ic: 'text-purple-600' },
          { label: 'Completed Steps', value: `${shipment.completedSteps} / 6`,  icon: CheckCircle2, bg: 'bg-green-100',  ic: 'text-green-600' },
          { label: 'Total Cost',      value: `৳${grandTotal.toLocaleString()}`, icon: DollarSign,   bg: 'bg-orange-100', ic: 'text-orange-600' },
        ].map(({ label, value, icon: Icon, bg, ic }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`${bg} p-3 rounded-lg`}>
                <Icon className={`w-5 h-5 ${ic}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-semibold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Accordion */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Step Details & Documents</h2>
          <span className="ml-auto text-xs text-gray-400">Click a row to expand</span>
        </div>

        <div className="divide-y divide-gray-100">
          {summarySections.map((section) => {
            const Icon       = section.icon;
            const isExpanded = expandedSection === section.id;

            return (
              <div key={section.id}>
                {/* Collapsed row */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                    isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${section.iconBg} p-2 rounded-lg`}>
                      <Icon className={`w-5 h-5 ${section.iconColor}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{section.label}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    {section.id !== 'warehouse' && (
                      <span className="text-sm font-semibold text-gray-800 tabular-nums">
                        {section.value > 0 ? `৳${section.value.toLocaleString()}` : '—'}
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronUp   className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Expanded panel — same neutral bg for every step */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-gray-100 px-6 py-6">
                    {detailRenderers[section.id]?.()}
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand Total row */}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Grand Total Cost</span>
            <span className="text-xl font-bold text-gray-900 tabular-nums">
              ৳{grandTotal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ShipmentView;