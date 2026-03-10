import { FileBarChart, Ship, DollarSign, TrendingUp, Calendar, BarChart3 } from 'lucide-react';

const Reports = ({ lcs }) => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <FileBarChart className="w-10 h-10 text-blue-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">LC Summary Report</h3>
          <p className="text-sm text-gray-600">Overview of all letters of credit</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <Ship className="w-10 h-10 text-green-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Shipment Performance</h3>
          <p className="text-sm text-gray-600">Track shipment timelines and efficiency</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <DollarSign className="w-10 h-10 text-purple-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Cost Analysis</h3>
          <p className="text-sm text-gray-600">Detailed breakdown of all costs</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <TrendingUp className="w-10 h-10 text-orange-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Trend Analysis</h3>
          <p className="text-sm text-gray-600">Monitor procurement trends over time</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <Calendar className="w-10 h-10 text-indigo-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Monthly Report</h3>
          <p className="text-sm text-gray-600">Month-wise procurement summary</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <BarChart3 className="w-10 h-10 text-pink-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Custom Report</h3>
          <p className="text-sm text-gray-600">Generate custom reports</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;