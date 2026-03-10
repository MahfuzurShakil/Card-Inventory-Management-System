import { useState, useMemo } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, PieChart, BarChart3, 
  Package, Factory, AlertCircle, Calendar, Filter, Download,
  ArrowUpRight, ArrowDownRight, Plus, Receipt, Banknote
} from 'lucide-react';

const FinanceDashboard = ({ lcs, localCosts, subBoxes, onNavigate }) => {
  const [timeFilter, setTimeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Calculate Landing Costs from completed shipments
  const landingCostData = useMemo(() => {
    const completed = lcs.flatMap(lc => 
      lc.shipments
        .filter(s => s.status === 'Completed')
        .map(s => ({
          lc_number: lc.lc_number,
          shipment_number: s.shipment_number,
          lc_value_bdt: lc.lc_value_bdt || 0,
          insurance: lc.insurance_bill_amount || 0,
          freight: s.stepData?.freight_forwarder?.ff_bill_amount || 0,
          cnf: s.stepData?.cnf_agent?.cnf_bill_value || 0,
          customs: s.stepData?.customs_duty?.total_customs_amount || 0,
          lc_commission: s.stepData?.lc_commission?.total_cost || 0,
          bank_interest: s.stepData?.bank_interest?.interest_amount || 0,
          quantity: lc.quantity || 0
        }))
    );

    return completed.map(item => ({
      ...item,
      total_landing_cost: 
        item.lc_value_bdt +
        item.insurance +
        item.freight +
        item.cnf +
        item.customs +
        item.lc_commission +
        item.bank_interest
    }));
  }, [lcs]);

  // Calculate Local Costs
  const localCostData = useMemo(() => {
    return localCosts.filter(cost => {
      if (timeFilter === 'all') return true;
      const costDate = new Date(cost.date);
      const now = new Date();
      
      if (timeFilter === 'month') {
        return costDate.getMonth() === now.getMonth() && 
               costDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'year') {
        return costDate.getFullYear() === now.getFullYear();
      } else if (timeFilter === 'custom' && dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        return costDate >= start && costDate <= end;
      }
      return true;
    });
  }, [localCosts, timeFilter, dateRange]);

  // Calculate Production Metrics
  const productionMetrics = useMemo(() => {
    const goodSubBoxes = subBoxes.filter(sb => sb.output_type === 'Good/ QC Approved');
    const totalProduced = goodSubBoxes.reduce((sum, sb) => sum + (sb.quantity || 0), 0);
    
    return {
      totalProduced,
      totalSubBoxes: goodSubBoxes.length
    };
  }, [subBoxes]);

  // Calculate Financial Summary
  const financialSummary = useMemo(() => {
    const totalLandingCost = landingCostData.reduce((sum, item) => sum + item.total_landing_cost, 0);
    const totalLocalCost = localCostData.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    const totalQuantityReceived = landingCostData.reduce((sum, item) => sum + item.quantity, 0);
    
    const avgLandingCostPerUnit = totalQuantityReceived > 0 
      ? totalLandingCost / totalQuantityReceived 
      : 0;
    
    const avgLocalCostPerUnit = productionMetrics.totalProduced > 0 
      ? totalLocalCost / productionMetrics.totalProduced 
      : 0;
    
    const totalCostPerUnit = avgLandingCostPerUnit + avgLocalCostPerUnit;

    return {
      totalLandingCost,
      totalLocalCost,
      totalCost: totalLandingCost + totalLocalCost,
      avgLandingCostPerUnit,
      avgLocalCostPerUnit,
      totalCostPerUnit,
      totalQuantityReceived,
      unitsProduced: productionMetrics.totalProduced
    };
  }, [landingCostData, localCostData, productionMetrics]);

  // Cost Breakdown for Charts
  const landingCostBreakdown = useMemo(() => {
    const totals = landingCostData.reduce((acc, item) => ({
      lc_value: acc.lc_value + item.lc_value_bdt,
      insurance: acc.insurance + item.insurance,
      freight: acc.freight + item.freight,
      cnf: acc.cnf + item.cnf,
      customs: acc.customs + item.customs,
      commission: acc.commission + item.lc_commission,
      interest: acc.interest + item.bank_interest
    }), {
      lc_value: 0,
      insurance: 0,
      freight: 0,
      cnf: 0,
      customs: 0,
      commission: 0,
      interest: 0
    });

    return [
      { label: 'LC Value', value: totals.lc_value, color: 'rgb(59, 130, 246)' },
      { label: 'Customs', value: totals.customs, color: 'rgb(147, 51, 234)' },
      { label: 'Freight', value: totals.freight, color: 'rgb(34, 197, 94)' },
      { label: 'C&F', value: totals.cnf, color: 'rgb(251, 191, 36)' },
      { label: 'Insurance', value: totals.insurance, color: 'rgb(239, 68, 68)' },
      { label: 'Commission', value: totals.commission, color: 'rgb(168, 85, 247)' },
      { label: 'Interest', value: totals.interest, color: 'rgb(236, 72, 153)' }
    ].filter(item => item.value > 0);
  }, [landingCostData]);

  const localCostBreakdown = useMemo(() => {
    const byCategory = localCostData.reduce((acc, cost) => {
      const category = cost.category || 'Other';
      acc[category] = (acc[category] || 0) + (cost.total_amount || 0);
      return acc;
    }, {});

    const colors = {
      'Rent': 'rgb(59, 130, 246)',
      'Electricity': 'rgb(251, 191, 36)',
      'Transport': 'rgb(34, 197, 94)',
      'WiFi/Internet': 'rgb(147, 51, 234)',
      'Salaries': 'rgb(239, 68, 68)',
      'Maintenance': 'rgb(236, 72, 153)',
      'Raw Materials': 'rgb(99, 102, 241)',
      'Other': 'rgb(156, 163, 175)'
    };

    return Object.entries(byCategory).map(([label, value]) => ({
      label,
      value,
      color: colors[label] || 'rgb(156, 163, 175)'
    }));
  }, [localCostData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Cost tracking and profitability analysis</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {timeFilter === 'custom' && (
            <>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </>
          )}

          <button
            onClick={() => onNavigate('local-costs')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Local Cost
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Landing Cost */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xs text-gray-600 mb-0.5">Total Landing Cost</p>
          <p className="text-2xl font-bold text-gray-900">
            ৳{(financialSummary.totalLandingCost / 1000000).toFixed(2)}M
          </p>
          <p className="text-xs text-gray-500 mt-1">
            From {landingCostData.length} shipments
          </p>
        </div>

        {/* Total Local Cost */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Banknote className="w-5 h-5 text-purple-600" />
            </div>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-xs text-gray-600 mb-0.5">Total Local Cost</p>
          <p className="text-2xl font-bold text-gray-900">
            ৳{(financialSummary.totalLocalCost / 1000000).toFixed(2)}M
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {localCostData.length} expense entries
          </p>
        </div>

        {/* Avg Cost Per Unit */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xs text-gray-600 mb-0.5">Avg Cost Per Unit</p>
          <p className="text-2xl font-bold text-gray-900">
            ৳{financialSummary.totalCostPerUnit.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Landing + Local
          </p>
        </div>

        {/* Total Production */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Factory className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs text-green-600 font-medium">
              {financialSummary.unitsProduced > 0 ? '+' : ''}
              {((financialSummary.unitsProduced / financialSummary.totalQuantityReceived) * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-0.5">Units Produced</p>
          <p className="text-2xl font-bold text-gray-900">
            {financialSummary.unitsProduced.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            of {financialSummary.totalQuantityReceived.toLocaleString()} received
          </p>
        </div>
      </div>

      {/* Cost Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Landing Cost Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Landing Cost Breakdown</h2>
          
          {landingCostBreakdown.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-6">
                <svg width="220" height="220" viewBox="0 0 220 220">
                  {landingCostBreakdown.map((item, idx) => {
                    const total = landingCostBreakdown.reduce((sum, i) => sum + i.value, 0);
                    const startAngle = landingCostBreakdown.slice(0, idx).reduce(
                      (sum, i) => sum + (i.value / total) * 360, 0
                    );
                    const angle = (item.value / total) * 360;
                    const endAngle = startAngle + angle;

                    const x1 = 110 + 90 * Math.cos((startAngle - 90) * Math.PI / 180);
                    const y1 = 110 + 90 * Math.sin((startAngle - 90) * Math.PI / 180);
                    const x2 = 110 + 90 * Math.cos((endAngle - 90) * Math.PI / 180);
                    const y2 = 110 + 90 * Math.sin((endAngle - 90) * Math.PI / 180);

                    const largeArc = angle > 180 ? 1 : 0;

                    return (
                      <path
                        key={idx}
                        d={`M 110 110 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={item.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                  <circle cx="110" cy="110" r="50" fill="white" />
                  <text x="110" y="110" textAnchor="middle" className="text-xl font-bold fill-gray-900">
                    ৳{(financialSummary.totalLandingCost / 1000000).toFixed(1)}M
                  </text>
                  <text x="110" y="130" textAnchor="middle" className="text-xs fill-gray-500">
                    Total Landing
                  </text>
                </svg>
              </div>

              <div className="space-y-2">
                {landingCostBreakdown.map((item, idx) => {
                  const total = landingCostBreakdown.reduce((sum, i) => sum + i.value, 0);
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">
                          ৳{(item.value / 1000).toFixed(0)}K
                        </span>
                        <span className="text-xs text-gray-500 w-12 text-right">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No landing cost data available</p>
            </div>
          )}
        </div>

        {/* Local Cost Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Local Cost Breakdown</h2>
          
          {localCostBreakdown.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-6">
                <svg width="220" height="220" viewBox="0 0 220 220">
                  {localCostBreakdown.map((item, idx) => {
                    const total = localCostBreakdown.reduce((sum, i) => sum + i.value, 0);
                    const startAngle = localCostBreakdown.slice(0, idx).reduce(
                      (sum, i) => sum + (i.value / total) * 360, 0
                    );
                    const angle = (item.value / total) * 360;
                    const endAngle = startAngle + angle;

                    const x1 = 110 + 90 * Math.cos((startAngle - 90) * Math.PI / 180);
                    const y1 = 110 + 90 * Math.sin((startAngle - 90) * Math.PI / 180);
                    const x2 = 110 + 90 * Math.cos((endAngle - 90) * Math.PI / 180);
                    const y2 = 110 + 90 * Math.sin((endAngle - 90) * Math.PI / 180);

                    const largeArc = angle > 180 ? 1 : 0;

                    return (
                      <path
                        key={idx}
                        d={`M 110 110 L ${x1} ${y1} A 90 90 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={item.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                  <circle cx="110" cy="110" r="50" fill="white" />
                  <text x="110" y="110" textAnchor="middle" className="text-xl font-bold fill-gray-900">
                    ৳{(financialSummary.totalLocalCost / 1000000).toFixed(1)}M
                  </text>
                  <text x="110" y="130" textAnchor="middle" className="text-xs fill-gray-500">
                    Total Local
                  </text>
                </svg>
              </div>

              <div className="space-y-2">
                {localCostBreakdown.map((item, idx) => {
                  const total = localCostBreakdown.reduce((sum, i) => sum + i.value, 0);
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                        <span className="text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">
                          ৳{(item.value / 1000).toFixed(0)}K
                        </span>
                        <span className="text-xs text-gray-500 w-12 text-right">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No local cost data available</p>
              <button
                onClick={() => onNavigate('local-costs')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Add First Entry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cost Analysis Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Per Unit Analysis</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Metric</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Value</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Per Unit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">Landing Cost</td>
                <td className="px-4 py-3 text-right font-semibold text-blue-900">
                  ৳{financialSummary.totalLandingCost.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-blue-700">
                  ৳{financialSummary.avgLandingCostPerUnit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  Per unit received ({financialSummary.totalQuantityReceived.toLocaleString()} units)
                </td>
              </tr>
              
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">Local Cost</td>
                <td className="px-4 py-3 text-right font-semibold text-purple-900">
                  ৳{financialSummary.totalLocalCost.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-purple-700">
                  ৳{financialSummary.avgLocalCostPerUnit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  Per unit produced ({financialSummary.unitsProduced.toLocaleString()} units)
                </td>
              </tr>
              
              <tr className="bg-green-50 hover:bg-green-100">
                <td className="px-4 py-3 font-bold text-gray-900">Total Cost Per Unit</td>
                <td className="px-4 py-3 text-right font-bold text-green-900">
                  ৳{financialSummary.totalCost.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-900 text-lg">
                  ৳{financialSummary.totalCostPerUnit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                  Base cost before markup
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('local-costs')}
          className="p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-all text-left group"
        >
          <Plus className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-sm text-gray-900">Manage Local Costs</p>
          <p className="text-xs text-gray-600 mt-1">Add and track operational expenses</p>
        </button>

        <button
          onClick={() => onNavigate('cost-reports')}
          className="p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-all text-left group"
        >
          <BarChart3 className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-sm text-gray-900">Cost Reports</p>
          <p className="text-xs text-gray-600 mt-1">Detailed cost analysis and trends</p>
        </button>

        <button
          onClick={() => onNavigate('profitability')}
          className="p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-all text-left group"
        >
          <TrendingUp className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-sm text-gray-900">Profitability Analysis</p>
          <p className="text-xs text-gray-600 mt-1">Revenue vs cost comparison</p>
        </button>
      </div>
    </div>
  );
};

export default FinanceDashboard;