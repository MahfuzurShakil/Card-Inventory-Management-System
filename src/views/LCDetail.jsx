import { useState } from 'react';
import { 
  ChevronRight, Plus, Ship, FileText, Building, CreditCard, 
  Percent, Warehouse, ChevronDown, ChevronUp, Calendar, DollarSign,
  Shield, Building2, Download, Eye
} from 'lucide-react';

const LCDetail = ({ lc, onBack, onSelectShipment, onAddShipment }) => {
  const [expandedShipment, setExpandedShipment] = useState(null);

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

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lc.lc_number}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Issued on {formatDate(lc.lc_issue_date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
            lc.status === 'Active' ? 'bg-green-100 text-green-800' : 
            lc.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {lc.status}
          </span>
          <button 
            onClick={onAddShipment} 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Shipment
          </button>
        </div>
      </div>

      {/* Complete LC Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Letter of Credit Details</h2>
        </div>
        <div className="p-6">
          {/* Section 1: LC Basic Information */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">LC Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">LC Number</p>
                <p className="text-base font-semibold text-gray-900">{lc.lc_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">LC Issue Date</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(lc.lc_issue_date)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Bank Name</p>
                <p className="text-base font-semibold text-gray-900">{lc.bank_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">LC Currency</p>
                <p className="text-base font-semibold text-gray-900">{lc.lc_currency || 'USD'}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Financial Details */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            {/* <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Financial Details</h3> */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">LC Value (Foreign)</p>
                <p className="text-xl font-bold text-blue-900">
                  {lc.lc_currency} {lc.lc_value_foreign?.toLocaleString() || '0'}
                </p>
              </div>
              
            </div>
          </div>

          {/* Section 3: Proforma Invoice Details */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Proforma Invoice (PI) Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">PI Number</p>
                <p className="text-base font-semibold text-gray-900">{lc.pi_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">PI Date</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(lc.pi_date)}</p>
              </div>
            </div>
          </div>

          {/* Section 4: Insurance Details */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Insurance Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Insurance Company</p>
                <p className="text-base font-semibold text-gray-900">{lc.insurance_company_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Cover Note Number</p>
                <p className="text-base font-semibold text-gray-900">{lc.cover_note_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Insurance Bill Amount</p>
                <p className="text-base font-semibold text-gray-900">
                  {lc.insurance_bill_amount ? `৳${lc.insurance_bill_amount.toLocaleString()}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Insurance Issue Date</p>
                <p className="text-base font-semibold text-gray-900">{formatDate(lc.insurance_issue_date)}</p>
              </div>
            </div>
          </div>

          {/* Section 5: Item Information */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Item Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Quantity</p>
                <p className="text-xl font-bold text-gray-900">{lc.quantity?.toLocaleString() || '0'}</p>
                <p className="text-xs text-gray-500 mt-1">Units</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Item Description</p>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {lc.item_description || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Section 6: Uploaded Documents */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Uploaded Documents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LC Document */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold text-sm text-gray-900">LC Document</p>
                  </div>
                  {lc.lc_doc && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Uploaded
                    </span>
                  )}
                </div>
                {lc.lc_doc ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-3 truncate" title={lc.lc_doc}>
                      {lc.lc_doc}
                    </p>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors">
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No document uploaded</p>
                )}
              </div>

              {/* PI Document */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:bg-purple-50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <p className="font-semibold text-sm text-gray-900">PI Document</p>
                  </div>
                  {lc.pi_doc && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Uploaded
                    </span>
                  )}
                </div>
                {lc.pi_doc ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-3 truncate" title={lc.pi_doc}>
                      {lc.pi_doc}
                    </p>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors">
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors">
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No document uploaded</p>
                )}
              </div>

              {/* Insurance Document */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <p className="font-semibold text-sm text-gray-900">Insurance Document</p>
                  </div>
                  {lc.insurance_doc && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Uploaded
                    </span>
                  )}
                </div>
                {lc.insurance_doc ? (
                  <div>
                    <p className="text-xs text-gray-600 mb-3 truncate" title={lc.insurance_doc}>
                      {lc.insurance_doc}
                    </p>
                    <div className="flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors">
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors">
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No document uploaded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
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
              <Ship className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No shipments added yet</p>
              <button
                onClick={onAddShipment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Shipment
              </button>
            </div>
          ) : (
            lc.shipments.map((shipment) => {
              const isExpanded = expandedShipment === shipment.id;
              const sd = shipment.stepData || {};

              // Helpers to extract step summary values
              const stepSummary = [
                {
                  id: 1, key: 'freight_forwarder', name: 'Freight Forwarder', icon: Ship,
                  cost: sd.freight_forwarder?.ff_bill_amount,
                  sub: sd.freight_forwarder?.ff_name,
                  isCost: true,
                },
                {
                  id: 2, key: 'customs_duty', name: 'Customs Duty', icon: FileText,
                  cost: sd.customs_duty?.total_customs_amount,
                  sub: sd.customs_duty ? `CD: ৳${(sd.customs_duty.cd || 0).toLocaleString()}  VAT: ৳${(sd.customs_duty.vat || 0).toLocaleString()}` : null,
                  isCost: true,
                },
                {
                  id: 3, key: 'cnf_agent', name: 'C&F Agent', icon: Building,
                  cost: sd.cnf_agent?.cnf_bill_value,
                  sub: sd.cnf_agent?.cnf_agent_name,
                  isCost: true,
                },
                {
                  id: 4, key: 'lc_commission', name: 'LC Commission', icon: CreditCard,
                  cost: sd.lc_commission?.total_cost,
                  sub: sd.lc_commission ? `Commission: ৳${(sd.lc_commission.lc_commission || 0).toLocaleString()}` : null,
                  isCost: true,
                },
                {
                  id: 5, key: 'bank_interest', name: 'Bank Interest', icon: Percent,
                  cost: sd.bank_interest?.interest_amount,
                  sub: sd.bank_interest ? `Rate: ${sd.bank_interest.interest_rate || 0}%` : null,
                  isCost: true,
                },
                {
                  id: 6, key: 'warehouse', name: 'Cleared Goods', icon: Warehouse,
                  cost: null,
                  qty: sd.warehouse?.total_quantity,
                  items: sd.warehouse?.items || [],
                  isCost: false,
                },
              ];

              const totalCost = stepSummary
                .filter(s => s.isCost && sd[s.key])
                .reduce((sum, s) => sum + (s.cost || 0), 0);

              return (
                <div key={shipment.id} className="p-6">
                  {/* Shipment Header — original layout, actions middle-aligned */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      {/* Number + status */}
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {shipment.shipment_number}
                        </h3>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          shipment.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          shipment.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {shipment.status}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                          <span>Progress: {shipment.completedSteps || 0}/6 steps</span>
                          <span className="font-semibold">{shipment.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${
                              shipment.progress === 100 ? 'bg-green-600' :
                              shipment.progress > 0 ? 'bg-blue-600' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${shipment.progress || 0}%` }}
                          />
                        </div>
                      </div>
                      {/* Step icons */}
                      <div className="flex items-center gap-2">
                        {steps.map((step, idx) => {
                          const StepIcon = step.icon;
                          const isCompleted = idx < (shipment.completedSteps || 0);
                          return (
                            <div
                              key={step.id}
                              className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${
                                isCompleted ? 'bg-green-100' : 'bg-gray-100'
                              }`}
                              title={step.name}
                            >
                              <StepIcon className={`w-4 h-4 ${isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Actions — vertically centered */}
                    <div className="flex items-center gap-2 self-center">
                      <button
                        onClick={() => onSelectShipment(shipment)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Manage
                      </button>
                      <button
                        onClick={() => toggleShipment(shipment.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded
                          ? <ChevronUp className="w-5 h-5 text-gray-600" />
                          : <ChevronDown className="w-5 h-5 text-gray-600" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded step summary — card grid style */}
                  {isExpanded && shipment.stepData && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                        {/* Freight Forwarder */}
                        {sd.freight_forwarder && (
                          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Ship className="w-4 h-4 text-blue-500" />
                              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Freight Forwarder</p>
                            </div>
                            <p className="text-lg font-bold text-blue-900 mb-1">
                              ৳{(sd.freight_forwarder.ff_bill_amount || 0).toLocaleString()}
                            </p>
                          </div>
                        )}

                        {/* C&F Agent */}
                        {sd.cnf_agent && (
                          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Building className="w-4 h-4 text-green-500" />
                              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">C&amp;F Agent</p>
                            </div>
                            <p className="text-lg font-bold text-green-900 mb-1">
                              ৳{(sd.cnf_agent.cnf_bill_value || 0).toLocaleString()}
                            </p>
                            
                          </div>
                        )}

                        {/* LC Commission */}
                        {sd.lc_commission && (
                          <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="w-4 h-4 text-orange-500" />
                              <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">LC Commission</p>
                            </div>
                            <p className="text-lg font-bold text-orange-900 mb-1">
                              ৳{(sd.lc_commission.total_cost || 0).toLocaleString()}
                            </p>
                            
                          </div>
                        )}

                        {/* Bank Interest */}
                        {sd.bank_interest && (
                          <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Percent className="w-4 h-4 text-pink-500" />
                              <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide">Bank Interest</p>
                            </div>
                            <p className="text-lg font-bold text-pink-900 mb-1">
                              ৳{(sd.bank_interest.interest_amount || 0).toLocaleString()}
                            </p>
                            
                          </div>
                        )}

                        {/* Customs Duty */}
                        {sd.customs_duty && (
                          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-purple-500" />
                              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Customs Duty</p>
                            </div>
                            <p className="text-lg font-bold text-purple-900 mb-1">
                              ৳{(sd.customs_duty.total_customs_amount || 0).toLocaleString()}
                            </p>
                            
                          </div>
                        )}

                        {/* Cleared Goods / Warehouse */}
                        {sd.warehouse && (
  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
    <div className="flex items-center gap-2 mb-3">
      <Warehouse className="w-4 h-4 text-indigo-500" />
      <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Cleared Goods</p>
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
      <div>
        <p className="text-xs text-gray-400">Total Boxes</p>
        <p className="text-sm font-bold text-indigo-900">{(sd.warehouse.items || []).reduce((s, i) => s + (parseInt(i.no_of_boxes) || 0), 0)}</p>
      </div>
      <div>
        <p className="text-xs text-gray-400">Status</p>
        <p className="text-sm font-bold text-indigo-900">{sd.warehouse.received_date ? 'Received' : 'Pending'}</p>
      </div>
    </div>
  </div>
)}

                      </div>

                      {/* Total cost summary strip */}
                      {totalCost > 0 && (
                        <div className="mt-3 flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cost (this shipment)</span>
                          <span className="text-base font-bold text-gray-900">৳{totalCost.toLocaleString()}</span>
                        </div>
                      )}

                      {/* No data message */}
                      {!sd.freight_forwarder && !sd.customs_duty && !sd.cnf_agent &&
                       !sd.lc_commission && !sd.bank_interest && !sd.warehouse && (
                        <p className="text-center py-8 text-sm text-gray-400">
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