import { 
  DollarSign, Ship, TrendingUp, Package, Factory, Users, AlertTriangle,
  CheckCircle, Clock, XCircle, ArrowUpRight, ArrowDownRight, Activity,
  Layers, BoxIcon, Zap, Target, TrendingDown, BarChart3, PieChart
} from 'lucide-react';

const AdminDashboard = ({ lcs, employees, inboundMaterials, boxes, subBoxes, productionAssignments, onNavigate }) => {
  
  // ============ PROCUREMENT METRICS ============
  const allShipments = lcs.flatMap(lc => lc.shipments);
  const completedShipments = allShipments.filter(s => s.status === 'Completed');
  
  const procurement = {
    totalLCValue: lcs.reduce((sum, lc) => sum + lc.lc_value_bdt, 0),
    activeLCs: lcs.filter(lc => lc.status === 'Active').length,
    totalShipments: allShipments.length,
    completedShipments: completedShipments.length,
    pendingShipments: allShipments.filter(s => s.status === 'Pending').length,
    inProgressShipments: allShipments.filter(s => s.status === 'In Progress').length,
    totalCosts: allShipments.reduce((sum, s) => {
      let cost = 0;
      if (s.stepData.freight_forwarder) cost += s.stepData.freight_forwarder.ff_bill_amount || 0;
      if (s.stepData.customs_duty) cost += s.stepData.customs_duty.total_customs_amount || 0;
      if (s.stepData.cnf_agent) cost += s.stepData.cnf_agent.cnf_bill_value || 0;
      if (s.stepData.lc_commission) cost += s.stepData.lc_commission.total_cost || 0;
      if (s.stepData.bank_interest) cost += s.stepData.bank_interest.interest_amount || 0;
      return sum + cost;
    }, 0),
    totalReceivedQuantity: completedShipments.reduce((sum, s) => sum + (s.stepData.warehouse?.total_quantity || 0), 0)
  };

  // ============ PRODUCTION METRICS ============
  const production = {
    totalBoxes: boxes.length,
    boxesInStock: boxes.filter(b => b.status === 'Material In Stock').length,
    boxesInProduction: boxes.filter(b => b.status === 'Material In Production').length,
    boxesConsumed: boxes.filter(b => b.status === 'Consumed').length,
    
    totalSubBoxes: subBoxes.length,
    goodOutput: subBoxes.filter(sb => sb.output_type === 'Good/ QC Approved').length,
    wastageOutput: subBoxes.filter(sb => sb.output_type === 'Wastage').length,
    
    totalProduced: subBoxes.reduce((sum, sb) => sum + (sb.quantity || 0), 0),
    totalGood: subBoxes.filter(sb => sb.output_type === 'Good/ QC Approved').reduce((sum, sb) => sum + (sb.quantity || 0), 0),
    totalWastage: subBoxes.filter(sb => sb.output_type === 'Wastage').reduce((sum, sb) => sum + (sb.quantity || 0), 0),
    totalRejected: subBoxes.reduce((sum, sb) => sum + (sb.client_rejected_count || 0), 0),
    
    activeEmployees: employees.filter(e => e.status === 'Active').length,
    totalEmployees: employees.length,
    inboundReceived: inboundMaterials.length
  };

  // ============ CALCULATED KPIs ============
  const kpis = {
    wastageRate: production.totalProduced > 0 ? ((production.totalWastage / production.totalProduced) * 100).toFixed(1) : 0,
    rejectionRate: production.totalGood > 0 ? ((production.totalRejected / production.totalGood) * 100).toFixed(1) : 0,
    productionEfficiency: production.boxesConsumed > 0 ? ((production.boxesConsumed / production.totalBoxes) * 100).toFixed(1) : 0,
    procurementCompletion: procurement.totalShipments > 0 ? ((procurement.completedShipments / procurement.totalShipments) * 100).toFixed(1) : 0,
    costPerUnit: procurement.totalReceivedQuantity > 0 ? (procurement.totalCosts / procurement.totalReceivedQuantity).toFixed(2) : 0,
    utilizationRate: production.totalBoxes > 0 ? (((production.boxesInProduction + production.boxesConsumed) / production.totalBoxes) * 100).toFixed(1) : 0
  };

  // ============ SHIFT PERFORMANCE ============
  const shiftData = {
    day: subBoxes.filter(sb => sb.shift === 'Day').reduce((sum, sb) => sum + (sb.quantity || 0), 0),
    night: subBoxes.filter(sb => sb.shift === 'Night').reduce((sum, sb) => sum + (sb.quantity || 0), 0)
  };

  // ============ QUALITY TRENDS ============
  const qualityStatus = production.totalProduced > 0 
    ? parseFloat(kpis.wastageRate) + parseFloat(kpis.rejectionRate)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Comprehensive overview of Card Inventory Management</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Key Performance Indicators - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Business Value */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-sm font-medium opacity-90">Total LC Value</p>
          <p className="text-3xl font-bold mt-2">৳{(procurement.totalLCValue / 1000000).toFixed(2)}M</p>
          <div className="mt-3 pt-3 border-t border-white border-opacity-20">
            <p className="text-xs opacity-75">{procurement.activeLCs} Active LCs</p>
          </div>
        </div>

        {/* Production Output */}
        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Factory className="w-6 h-6" />
            </div>
            <CheckCircle className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-sm font-medium opacity-90">Good Production</p>
          <p className="text-3xl font-bold mt-2">{production.totalGood.toLocaleString()}</p>
          <div className="mt-3 pt-3 border-t border-white border-opacity-20">
            <p className="text-xs opacity-75">{production.goodOutput} sub-boxes completed</p>
          </div>
        </div>

        {/* Wastage Rate Alert */}
        <div className={`rounded-xl shadow-lg p-6 text-white ${
          parseFloat(kpis.wastageRate) > 5 
            ? 'bg-gradient-to-br from-red-500 to-red-700' 
            : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            {parseFloat(kpis.wastageRate) > 5 ? (
              <TrendingUp className="w-5 h-5 opacity-80" />
            ) : (
              <TrendingDown className="w-5 h-5 opacity-80" />
            )}
          </div>
          <p className="text-sm font-medium opacity-90">Wastage Rate</p>
          <p className="text-3xl font-bold mt-2">{kpis.wastageRate}%</p>
          <div className="mt-3 pt-3 border-t border-white border-opacity-20">
            <p className="text-xs opacity-75">
              {parseFloat(kpis.wastageRate) > 5 ? 'Above 5% threshold' : 'Within acceptable range'}
            </p>
          </div>
        </div>

        {/* Procurement Progress */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <Ship className="w-6 h-6" />
            </div>
            <Activity className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-sm font-medium opacity-90">Shipment Completion</p>
          <p className="text-3xl font-bold mt-2">{kpis.procurementCompletion}%</p>
          <div className="mt-3 pt-3 border-t border-white border-opacity-20">
            <p className="text-xs opacity-75">{procurement.completedShipments}/{procurement.totalShipments} completed</p>
          </div>
        </div>
      </div>

      {/* Operational Metrics - Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Active Staff</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{production.activeEmployees}</p>
          <p className="text-xs text-gray-500 mt-1">of {production.totalEmployees} total</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-8 h-8 text-indigo-500" />
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Received Items</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{procurement.totalReceivedQuantity.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">total units</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <BoxIcon className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Boxes in Stock</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{production.boxesInStock}</p>
          <p className="text-xs text-gray-500 mt-1">{production.boxesInProduction} in production</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-orange-500" />
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Utilization Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.utilizationRate}%</p>
          <p className="text-xs text-gray-500 mt-1">box efficiency</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Client Rejected</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{production.totalRejected}</p>
          <p className="text-xs text-gray-500 mt-1">{kpis.rejectionRate}% rate</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Cost/Unit</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">৳{kpis.costPerUnit}</p>
          <p className="text-xs text-gray-500 mt-1">avg procurement</p>
        </div>
      </div>

      {/* Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Pipeline Funnel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Production Pipeline</h3>
              <p className="text-sm text-gray-500 mt-1">Material flow from warehouse to output</p>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {/* Received Materials */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Received Materials</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{production.inboundReceived}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            {/* Boxes Created */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BoxIcon className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Boxes Created</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{production.totalBoxes}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ 
                  width: production.inboundReceived > 0 ? `${(production.totalBoxes / production.inboundReceived) * 100}%` : '0%' 
                }} />
              </div>
            </div>

            {/* In Production */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Processing</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{production.boxesInProduction}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-600 h-2 rounded-full" style={{ 
                  width: production.totalBoxes > 0 ? `${(production.boxesInProduction / production.totalBoxes) * 100}%` : '0%' 
                }} />
              </div>
            </div>

            {/* Output */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Finished Output</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{production.totalSubBoxes}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ 
                  width: production.boxesConsumed > 0 ? `${(production.totalSubBoxes / production.boxesConsumed) * 100}%` : '0%' 
                }} />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{production.boxesInStock}</p>
                <p className="text-xs text-gray-500 mt-1">Ready</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{production.boxesInProduction}</p>
                <p className="text-xs text-gray-500 mt-1">Processing</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{production.boxesConsumed}</p>
                <p className="text-xs text-gray-500 mt-1">Completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Analysis */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quality Analysis</h3>
              <p className="text-sm text-gray-500 mt-1">Production output breakdown</p>
            </div>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>

          {/* Quality Donut Chart Visualization */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              {/* Donut Segments */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Circle */}
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="20" />
                
                {/* Good Output */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="20"
                  strokeDasharray={`${production.totalProduced > 0 ? (production.totalGood / production.totalProduced) * 251.2 : 0} 251.2`}
                  strokeLinecap="round"
                />
                
                {/* Wastage */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="20"
                  strokeDasharray={`${production.totalProduced > 0 ? (production.totalWastage / production.totalProduced) * 251.2 : 0} 251.2`}
                  strokeDashoffset={`-${production.totalProduced > 0 ? (production.totalGood / production.totalProduced) * 251.2 : 0}`}
                  strokeLinecap="round"
                />
                
                {/* Rejected (from good) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  fill="none" 
                  stroke="#f59e0b" 
                  strokeWidth="20"
                  strokeDasharray={`${production.totalProduced > 0 ? (production.totalRejected / production.totalProduced) * 251.2 : 0} 251.2`}
                  strokeDashoffset={`-${production.totalProduced > 0 ? ((production.totalGood + production.totalWastage) / production.totalProduced) * 251.2 : 0}`}
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <p className="text-3xl font-bold text-gray-900">{production.totalProduced.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Output</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded-full" />
                <span className="text-sm font-medium text-gray-700">Good / QC Approved</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-900">{production.totalGood.toLocaleString()}</p>
                <p className="text-xs text-green-700">
                  {production.totalProduced > 0 ? ((production.totalGood / production.totalProduced) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded-full" />
                <span className="text-sm font-medium text-gray-700">Wastage</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-900">{production.totalWastage.toLocaleString()}</p>
                <p className="text-xs text-red-700">{kpis.wastageRate}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-600 rounded-full" />
                <span className="text-sm font-medium text-gray-700">Client Rejected</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-orange-900">{production.totalRejected.toLocaleString()}</p>
                <p className="text-xs text-orange-700">{kpis.rejectionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shift Performance Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Shift Performance</h3>
            <p className="text-sm text-gray-500 mt-1">Output comparison between day and night shifts</p>
          </div>
          <Activity className="w-5 h-5 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Day Shift */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-6 border border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">☀️</span>
                </div>
                <div>
                  <p className="font-semibold text-amber-900">Day Shift</p>
                  <p className="text-xs text-amber-700">6 AM - 6 PM</p>
                </div>
              </div>
            </div>
            
            <p className="text-4xl font-bold text-amber-900 mb-2">{shiftData.day.toLocaleString()}</p>
            <p className="text-sm text-amber-700 mb-4">units produced</p>
            
            <div className="w-full bg-amber-200 rounded-full h-3">
              <div 
                className="bg-amber-600 h-3 rounded-full transition-all" 
                style={{ 
                  width: `${shiftData.day + shiftData.night > 0 ? (shiftData.day / (shiftData.day + shiftData.night)) * 100 : 50}%` 
                }} 
              />
            </div>
            <p className="text-xs text-amber-700 mt-2 text-right">
              {shiftData.day + shiftData.night > 0 ? ((shiftData.day / (shiftData.day + shiftData.night)) * 100).toFixed(1) : 0}% of total
            </p>
          </div>

          {/* Night Shift */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">🌙</span>
                </div>
                <div>
                  <p className="font-semibold text-indigo-900">Night Shift</p>
                  <p className="text-xs text-indigo-700">6 PM - 6 AM</p>
                </div>
              </div>
            </div>
            
            <p className="text-4xl font-bold text-indigo-900 mb-2">{shiftData.night.toLocaleString()}</p>
            <p className="text-sm text-indigo-700 mb-4">units produced</p>
            
            <div className="w-full bg-indigo-200 rounded-full h-3">
              <div 
                className="bg-indigo-600 h-3 rounded-full transition-all" 
                style={{ 
                  width: `${shiftData.day + shiftData.night > 0 ? (shiftData.night / (shiftData.day + shiftData.night)) * 100 : 50}%` 
                }} 
              />
            </div>
            <p className="text-xs text-indigo-700 mt-2 text-right">
              {shiftData.day + shiftData.night > 0 ? ((shiftData.night / (shiftData.day + shiftData.night)) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
        </div>
      </div>

      {/* Alerts & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alerts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Alerts</h3>
          <div className="space-y-3">
            {parseFloat(kpis.wastageRate) > 5 && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-900">High Wastage Alert</p>
                  <p className="text-sm text-red-700 mt-1">
                    Wastage rate at {kpis.wastageRate}% exceeds 5% threshold. Review production processes.
                  </p>
                </div>
              </div>
            )}

            {production.boxesInStock === 0 && production.boxesInProduction === 0 && (
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-orange-900">No Materials Available</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Production pipeline empty. Process inbound materials immediately.
                  </p>
                </div>
              </div>
            )}

            {procurement.pendingShipments > 0 && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-yellow-900">{procurement.pendingShipments} Pending Shipments</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Initiate procurement process to avoid delays.
                  </p>
                </div>
              </div>
            )}

            {production.activeEmployees < 4 && (
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900">Low Staff Count</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Only {production.activeEmployees} active employees. Ensure adequate shift coverage.
                  </p>
                </div>
              </div>
            )}

            {parseFloat(kpis.wastageRate) <= 5 && production.boxesInStock > 0 && procurement.pendingShipments === 0 && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900">All Systems Operational</p>
                  <p className="text-sm text-green-700 mt-1">
                    No critical issues detected. Operations running smoothly.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Business Insights */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Business Insights</h3>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <p className="font-medium text-blue-900">Procurement Efficiency</p>
              </div>
              <p className="text-sm text-gray-700">
                {kpis.procurementCompletion}% shipment completion rate with ৳{kpis.costPerUnit} avg cost per unit.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Factory className="w-4 h-4 text-blue-600" />
                <p className="font-medium text-blue-900">Production Capacity</p>
              </div>
              <p className="text-sm text-gray-700">
                {kpis.utilizationRate}% utilization rate. {production.boxesInStock} boxes ready for production.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-600" />
                <p className="font-medium text-blue-900">Quality Performance</p>
              </div>
              <p className="text-sm text-gray-700">
                {qualityStatus < 10 ? 'Excellent' : qualityStatus < 15 ? 'Good' : 'Needs Attention'} quality metrics with {kpis.wastageRate}% wastage and {kpis.rejectionRate}% rejection rates.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <p className="font-medium text-blue-900">Workforce Status</p>
              </div>
              <p className="text-sm text-gray-700">
                {production.activeEmployees} active staff members across day and night shifts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
