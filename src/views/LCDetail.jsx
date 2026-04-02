import { useState } from 'react';
import {
  ChevronRight, Plus, Ship, FileText, Building, CreditCard,
  Percent, Warehouse, ChevronDown, ChevronUp, Calendar, DollarSign,
  Shield, Building2, Download, Eye, Hash,
} from 'lucide-react';
import ChipUidFileSummary from '../components/ChipUidFileSummary';
import { buildChipUidOverallSummary, normalizeStoredChipUidFile } from '../utils/chipUidApi';

const LCDetail = ({ lc, onBack, onSelectShipment, onAddShipment }) => {
  const [expandedShipment, setExpandedShipment] = useState(null);
  const [uuidSectionOpen, setUuidSectionOpen] = useState(true);
  const [uuidFiles] = useState(() =>
    (lc?.uuid_files || [])
      .map((summary, index) => normalizeStoredChipUidFile(summary, index))
      .filter(Boolean)
  );

  const steps = [
    { id: 1, name: 'Freight Forwarder', key: 'freight_forwarder', icon: Ship, color: 'blue' },
    { id: 2, name: 'Customs Duty', key: 'customs_duty', icon: FileText, color: 'purple' },
    { id: 3, name: 'C&F Agent', key: 'cnf_agent', icon: Building, color: 'green' },
    { id: 4, name: 'LC Commission', key: 'lc_commission', icon: CreditCard, color: 'orange' },
    { id: 5, name: 'Bank Interest', key: 'bank_interest', icon: Percent, color: 'pink' },
    { id: 6, name: 'Warehouse', key: 'warehouse', icon: Warehouse, color: 'indigo' },
  ];

  const toggleShipment = (shipmentId) => {
    setExpandedShipment(expandedShipment === shipmentId ? null : shipmentId);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const uuidTotals = buildChipUidOverallSummary(uuidFiles);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lc.lc_number}</h1>
            <p className="mt-1 text-sm text-gray-500">Issued on {formatDate(lc.lc_issue_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            lc.status === 'Active' ? 'bg-green-100 text-green-800'
              : lc.status === 'Draft' ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
          }`}>
            {lc.status}
          </span>
          <button
            onClick={onAddShipment}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Add Shipment
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Letter of Credit Details</h2>
        </div>
        <div className="p-6">
          <div className="mb-8">
            <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">LC Information</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">LC Number</p>
                <p className="text-base font-semibold text-gray-900">{lc.lc_number || 'N/A'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">LC Issue Date</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(lc.lc_issue_date)}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">Bank Name</p>
                <p className="text-base font-semibold text-gray-900">{lc.bank_name || 'N/A'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">LC Currency</p>
                <p className="text-base font-semibold text-gray-900">{lc.lc_currency || 'USD'}</p>
              </div>
            </div>
          </div>

          <div className="mb-8 border-b border-gray-200 pb-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">LC Value (Foreign)</p>
                <p className="text-xl font-bold text-blue-900">
                  {lc.lc_currency} {lc.lc_value_foreign?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8 border-b border-gray-200 pb-8">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
              <DollarSign className="h-4 w-4" /> Proforma Invoice (PI) Details
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">PI Number</p>
                <p className="text-base font-semibold text-gray-900">{lc.pi_number || 'N/A'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">PI Date</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(lc.pi_date)}</p>
              </div>
            </div>
          </div>

          <div className="mb-8 border-b border-gray-200 pb-8">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
              <Shield className="h-4 w-4" /> Insurance Details
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">Insurance Company</p>
                <p className="text-base font-semibold text-gray-900">{lc.insurance_company_name || 'N/A'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">Cover Note Number</p>
                <p className="text-base font-semibold text-gray-900">{lc.cover_note_number || 'N/A'}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">Insurance Bill Amount</p>
                <p className="text-base font-semibold text-gray-900">
                  {lc.insurance_bill_amount ? `?${lc.insurance_bill_amount.toLocaleString()}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">Insurance Issue Date</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(lc.insurance_issue_date)}</p>
              </div>
            </div>
          </div>

          <div className="mb-8 border-b border-gray-200 pb-8">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
              <Building2 className="h-4 w-4" /> Item Information
            </h3>
            <div className="mb-4 grid grid-cols-1 gap-6 md:grid-cols-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">Quantity</p>
                <p className="text-xl font-bold text-gray-900">{lc.quantity?.toLocaleString() || '0'}</p>
                <p className="mt-1 text-xs text-gray-500">Units</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-gray-500">Item Description</p>
              <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                {lc.item_description || 'No description provided'}
              </p>
            </div>
          </div>

          <div className="mb-8 border-b border-gray-200 pb-8">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
              <FileText className="h-4 w-4" /> Uploaded Documents
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:bg-blue-50">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <p className="text-sm font-semibold text-gray-900">LC Document</p>
                  </div>
                  {lc.lc_doc && <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Uploaded</span>}
                </div>
                {lc.lc_doc ? (
                  <div>
                    <p className="mb-3 truncate text-xs text-gray-600" title={lc.lc_doc}>{lc.lc_doc}</p>
                    <div className="flex gap-2">
                      <button className="flex flex-1 items-center justify-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-blue-700">
                        <Eye className="h-3 w-3" /> View
                      </button>
                      <button className="flex flex-1 items-center justify-center gap-1 rounded bg-gray-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-gray-700">
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                  </div>
                ) : <p className="text-xs text-gray-400">No document uploaded</p>}
              </div>

              <div className="rounded-lg border border-gray-200 p-4 transition-all hover:border-purple-300 hover:bg-purple-50">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    <p className="text-sm font-semibold text-gray-900">PI Document</p>
                  </div>
                  {lc.pi_doc && <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Uploaded</span>}
                </div>
                {lc.pi_doc ? (
                  <div>
                    <p className="mb-3 truncate text-xs text-gray-600" title={lc.pi_doc}>{lc.pi_doc}</p>
                    <div className="flex gap-2">
                      <button className="flex flex-1 items-center justify-center gap-1 rounded bg-purple-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-purple-700">
                        <Eye className="h-3 w-3" /> View
                      </button>
                      <button className="flex flex-1 items-center justify-center gap-1 rounded bg-gray-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-gray-700">
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                  </div>
                ) : <p className="text-xs text-gray-400">No document uploaded</p>}
              </div>

              <div className="rounded-lg border border-gray-200 p-4 transition-all hover:border-green-300 hover:bg-green-50">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <p className="text-sm font-semibold text-gray-900">Insurance Document</p>
                  </div>
                  {lc.insurance_doc && <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Uploaded</span>}
                </div>
                {lc.insurance_doc ? (
                  <div>
                    <p className="mb-3 truncate text-xs text-gray-600" title={lc.insurance_doc}>{lc.insurance_doc}</p>
                    <div className="flex gap-2">
                      <button className="flex flex-1 items-center justify-center gap-1 rounded bg-green-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-green-700">
                        <Eye className="h-3 w-3" /> View
                      </button>
                      <button className="flex flex-1 items-center justify-center gap-1 rounded bg-gray-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-gray-700">
                        <Download className="h-3 w-3" /> Download
                      </button>
                    </div>
                  </div>
                ) : <p className="text-xs text-gray-400">No document uploaded</p>}
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              className="group mb-4 flex w-full items-center justify-between text-sm font-semibold uppercase tracking-wide text-gray-700"
              onClick={() => setUuidSectionOpen((v) => !v)}
            >
              <span className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-violet-600" />
                Chip UID CSV Files
                {uuidTotals.fileCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                    {uuidTotals.fileCount} file{uuidTotals.fileCount !== 1 ? 's' : ''} · {uuidTotals.validCount} valid UID{uuidTotals.validCount !== 1 ? 's' : ''}
                  </span>
                )}
                {uuidTotals.fileCount === 0 && (
                  <span className="ml-2 text-xs font-normal normal-case text-gray-400">No files uploaded yet</span>
                )}
              </span>
              {uuidSectionOpen
                ? <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                : <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />}
            </button>

            {uuidSectionOpen && (
              <ChipUidFileSummary
                files={uuidFiles}
                showIssueAction={false}
                emptyMessage="No Chip UID CSV files have been saved for this LC yet."
              />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Shipments</h2>
            <span className="text-sm text-gray-500">
              {lc.shipments?.length || 0} shipment{lc.shipments?.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {!lc.shipments || lc.shipments.length === 0 ? (
            <div className="p-12 text-center">
              <Ship className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="mb-4 text-gray-500">No shipments added yet</p>
              <button onClick={onAddShipment}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                Add First Shipment
              </button>
            </div>
          ) : (
            lc.shipments.map((shipment) => {
              const isExpanded = expandedShipment === shipment.id;
              const sd = shipment.stepData || {};

              const stepSummary = [
                { id: 1, key: 'freight_forwarder', name: 'Freight Forwarder', icon: Ship, cost: sd.freight_forwarder?.ff_bill_amount, isCost: true },
                { id: 2, key: 'customs_duty', name: 'Customs Duty', icon: FileText, cost: sd.customs_duty?.total_customs_amount, isCost: true },
                { id: 3, key: 'cnf_agent', name: 'C&F Agent', icon: Building, cost: sd.cnf_agent?.cnf_bill_value, isCost: true },
                { id: 4, key: 'lc_commission', name: 'LC Commission', icon: CreditCard, cost: sd.lc_commission?.total_cost, isCost: true },
                { id: 5, key: 'bank_interest', name: 'Bank Interest', icon: Percent, cost: sd.bank_interest?.interest_amount, isCost: true },
                { id: 6, key: 'warehouse', name: 'Cleared Goods', icon: Warehouse, qty: sd.warehouse?.total_quantity, items: sd.warehouse?.items || [], isCost: false },
              ];

              const totalCost = stepSummary.filter((s) => s.isCost && sd[s.key]).reduce((sum, s) => sum + (s.cost || 0), 0);

              return (
                <div key={shipment.id} className="p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{shipment.shipment_number}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          shipment.status === 'Completed' ? 'bg-green-100 text-green-800'
                            : shipment.status === 'In Progress' ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {shipment.status}
                        </span>
                      </div>
                      <div className="mb-4">
                        <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
                          <span>Progress: {shipment.completedSteps || 0}/6 steps</span>
                          <span className="font-semibold">{shipment.progress || 0}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-gray-200">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              shipment.progress === 100 ? 'bg-green-600'
                                : shipment.progress > 0 ? 'bg-blue-600' : 'bg-gray-400'
                            }`}
                            style={{ width: `${shipment.progress || 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {steps.map((step, idx) => {
                          const StepIcon = step.icon;
                          const isCompleted = idx < (shipment.completedSteps || 0);
                          return (
                            <div
                              key={step.id}
                              className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                                isCompleted ? 'bg-green-100' : 'bg-gray-100'
                              }`}
                              title={step.name}
                            >
                              <StepIcon className={`h-4 w-4 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-center">
                      <button onClick={() => onSelectShipment(shipment)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                        Manage
                      </button>
                      <button onClick={() => toggleShipment(shipment.id)}
                        className="rounded-lg p-2 transition-colors hover:bg-gray-100">
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-600" /> : <ChevronDown className="h-5 w-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && shipment.stepData && (
                    <div className="mt-6 border-t border-gray-200 pt-6">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {sd.freight_forwarder && (
                          <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <Ship className="h-4 w-4 text-blue-500" />
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Freight Forwarder</p>
                            </div>
                            <p className="text-lg font-bold text-blue-900 mb-1">
                              ?{(sd.freight_forwarder.ff_bill_amount || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.cnf_agent && (
                          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <Building className="h-4 w-4 text-green-500" />
                              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">C&amp;F Agent</p>
                            </div>
                            <p className="text-lg font-bold text-green-900 mb-1">
                              ?{(sd.cnf_agent.cnf_bill_value || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.lc_commission && (
                          <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-orange-500" />
                              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">LC Commission</p>
                            </div>
                            <p className="text-lg font-bold text-orange-900 mb-1">
                              ?{(sd.lc_commission.total_cost || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.bank_interest && (
                          <div className="rounded-lg border border-pink-100 bg-pink-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <Percent className="h-4 w-4 text-pink-500" />
                              <p className="text-xs font-semibold uppercase tracking-wide text-pink-700">Bank Interest</p>
                            </div>
                            <p className="text-lg font-bold text-pink-900 mb-1">
                              ?{(sd.bank_interest.interest_amount || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.customs_duty && (
                          <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-purple-500" />
                              <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Customs Duty</p>
                            </div>
                            <p className="text-lg font-bold text-purple-900 mb-1">
                              ?{(sd.customs_duty.total_customs_amount || 0).toLocaleString()}
                            </p>
                          </div>
                        )}
                        {sd.warehouse && (
                          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <Warehouse className="h-4 w-4 text-indigo-500" />
                              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Cleared Goods</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-xs text-gray-400">Total Items</p>
                                <p className="text-sm font-bold text-indigo-900">{(sd.warehouse.items || []).length}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Total Quantity</p>
                                <p className="text-sm font-bold text-indigo-900">{(sd.warehouse.total_quantity || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {totalCost > 0 && (
                        <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Cost (this shipment)</span>
                          <span className="text-base font-bold text-gray-900">?{totalCost.toLocaleString()}</span>
                        </div>
                      )}

                      {!sd.freight_forwarder && !sd.customs_duty && !sd.cnf_agent && !sd.lc_commission && !sd.bank_interest && !sd.warehouse && (
                        <p className="py-8 text-center text-sm text-gray-400">
                          No step data available yet. Click "Manage" to add details.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LCDetail;
