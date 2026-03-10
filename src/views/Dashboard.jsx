import { 
  DollarSign, Ship, TrendingUp, Package, CheckCircle2, Loader, Clock, AlertCircle,
  Truck, Activity, BarChart3, ExternalLink, ArrowUpRight, Eye, Edit
} from 'lucide-react';

const Dashboard = ({ lcs, onSelectLC, onViewShipment, onSelectShipment,onViewAllLCs, onViewAllShipments }) => {
  // Data Preparation (Fixed to include lcObj)
  const allShipments = lcs.flatMap(lc => lc.shipments.map(s => ({ ...s, lcObj: lc })));
  
  // Stats Logic
  const stats = {
    totalLCs: lcs.length,
    activeLCs: lcs.filter(lc => lc.status === 'Active').length,
    totalValue: lcs.reduce((sum, lc) => sum + lc.lc_value_bdt, 0),
    pendingShipments: allShipments.filter(s => s.status !== 'Completed').length,
    completedShipments: allShipments.filter(s => s.status === 'Completed').length,
    totalShipments: allShipments.length,
    totalQuantity: lcs.reduce((sum, lc) => sum + lc.quantity, 0),
    inProgressShipments: allShipments.filter(s => s.status === 'In Progress').length,
    avgProgress: allShipments.length > 0 ? Math.round(allShipments.reduce((sum, s) => sum + s.progress, 0) / allShipments.length) : 0,
    totalCosts: allShipments.reduce((sum, s) => {
      let shipmentCost = 0;
      if (s.stepData.freight_forwarder) shipmentCost += s.stepData.freight_forwarder.ff_bill_amount || 0;
      if (s.stepData.customs_duty) shipmentCost += s.stepData.customs_duty.total_customs_amount || 0;
      if (s.stepData.cnf_agent) shipmentCost += s.stepData.cnf_agent.cnf_bill_value || 0;
      if (s.stepData.lc_commission) shipmentCost += s.stepData.lc_commission.total_cost || 0;
      if (s.stepData.bank_interest) shipmentCost += s.stepData.bank_interest.interest_amount || 0;
      return sum + shipmentCost;
    }, 0)
  };

  // Helper handlers to catch missing props
  const handleViewShipment = (lc, shipment) => {
    if (typeof onViewShipment === 'function') {
      onViewShipment(lc, shipment);
    } else {
      console.error("Navigation Error: 'onViewShipment' prop is missing. Please pass this function to the Dashboard component in your Parent (App.js).");
      alert("Error: onViewShipment function is missing. Check Console for details.");
    }
  };

  const handleSelectShipment = (lc, shipment) => {
    if (typeof onSelectShipment === 'function') {
      onSelectShipment(lc, shipment);
    } else {
      console.error("Navigation Error: 'onSelectShipment' prop is missing. Please pass this function to the Dashboard component in your Parent (App.js).");
      alert("Error: onSelectShipment function is missing. Check Console for details.");
    }
  };

  const handleViewAllLCs = () => {
  if (typeof onViewAllLCs === 'function') {
    onViewAllLCs();
  }
};

  const handleViewAllShipments = () => {
  if (typeof onViewAllShipments === 'function') {
    onViewAllShipments();
  }
};

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Cards (Row 1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg"><DollarSign className="w-6 h-6" /></div>
            <ArrowUpRight className="w-5 h-5 opacity-80" />
          </div>
          <div>
            <p className="text-sm font-medium opacity-90">Total LC Value</p>
            <p className="text-3xl font-bold mt-2">৳{(stats.totalValue / 1000000).toFixed(2)}M</p>
            <p className="text-xs mt-2 opacity-75">{stats.totalLCs} Letters of Credit</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg"><Ship className="w-6 h-6 text-green-600" /></div>
            <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">{stats.avgProgress}% Avg</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Shipments</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalShipments}</p>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" />{stats.completedShipments} Complete</span>
              <span className="flex items-center gap-1 text-blue-600"><Loader className="w-3 h-3" />{stats.inProgressShipments} In Progress</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-lg"><TrendingUp className="w-6 h-6 text-purple-600" /></div>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Costs Incurred</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">৳{(stats.totalCosts / 1000000).toFixed(2)}M</p>
            <p className="text-xs text-gray-500 mt-2">Customs, Freight, C&F & Others</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg"><Package className="w-6 h-6 text-orange-600" /></div>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Total Chip Quantity</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{(stats.totalQuantity / 1000).toFixed(0)}K</p>
            <p className="text-xs text-gray-500 mt-2">Units across all LCs</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Row (Row 2) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Active LCs</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeLCs}</p></div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Shipment In Progress</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.inProgressShipments}</p></div>
            <Truck className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Shipment Completed</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.completedShipments}</p></div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Avg Progress</p><p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgProgress}%</p></div>
            <Activity className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6">
        {/* LCs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div><h2 className="text-lg font-semibold text-gray-900">Letters of Credit</h2><p className="text-sm text-gray-500 mt-1">Overview of all LCs in the system</p></div>
            <button 
              onClick={handleViewAllLCs}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              View All
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LC Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lcs.slice(0, 5).map(lc => (
                  <tr key={lc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><div className="font-semibold text-gray-900">{lc.lc_number}</div><div className="text-xs text-gray-500">{new Date(lc.lc_issue_date).toLocaleDateString()}</div></td>
                    <td className="px-6 py-4 text-sm text-gray-700">{lc.bank_name}</td>
                    <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900">{lc.lc_currency} {lc.lc_value_foreign.toLocaleString()}</div><div className="text-xs text-gray-500">৳{(lc.lc_value_bdt / 1000000).toFixed(2)}M</div></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">{lc.shipments.filter(s => s.status === 'Completed').length}/{lc.shipments.length}</div>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5"><div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${lc.shipments.length > 0 ? (lc.shipments.filter(s => s.status === 'Completed').length / lc.shipments.length) * 100 : 0}%` }} /></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${lc.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{lc.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onSelectLC(lc)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => onSelectLC(lc)} className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shipments Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div><h2 className="text-lg font-semibold text-gray-900">All Shipments</h2><p className="text-sm text-gray-500 mt-1">Track shipment progress across all LCs</p></div>
            <button onClick={handleViewAllShipments} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm">View All <ExternalLink className="w-4 h-4" /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LC Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Steps</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allShipments.slice(0, 5).map(shipment => {
                  const parentLC = shipment.lcObj;
                  return (
                    <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4"><div className="font-semibold text-gray-900">{shipment.shipment_number}</div></td>
                      <td className="px-6 py-4 text-sm text-gray-700">{parentLC?.lc_number}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-24"><div className={`h-2 rounded-full ${shipment.progress === 100 ? 'bg-green-600' : shipment.progress > 0 ? 'bg-blue-600' : 'bg-gray-400'}`} style={{ width: `${shipment.progress}%` }} /></div>
                          <span className="text-sm font-medium text-gray-700">{shipment.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{shipment.completedSteps}/6</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-medium rounded-full ${shipment.status === 'Completed' ? 'bg-green-100 text-green-800' : shipment.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{shipment.status}</span></td>
                      <td className="px-6 py-4">
  <div className="flex items-center gap-2 justify-end">
    <button 
      onClick={() => handleViewShipment(shipment.lcObj, shipment)}
      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
      title="View Shipment"
    >
      <Eye className="w-4 h-4" />
    </button>
    <button 
      onClick={() => handleSelectShipment(shipment.lcObj, shipment)}
      className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
      title="Edit Shipment"
    >
      <Edit className="w-4 h-4" />
    </button>
  </div>
</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">Alerts & Notifications</h2></div>
        <div className="p-6 space-y-3">
          {stats.pendingShipments > 0 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div><p className="font-medium text-yellow-900">{stats.pendingShipments} Shipment{stats.pendingShipments > 1 ? 's' : ''} pending</p><p className="text-sm text-yellow-700 mt-1">Initiate processing to avoid delays</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;