import { useState } from 'react';
import { Ship, Search, Filter, Eye, Edit } from 'lucide-react';

const AllShipments = ({ lcs, onSelectLC, onViewShipment, onSelectShipment }) => {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLC, setFilterLC] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Data Preparation
  const allShipments = lcs.flatMap(lc => 
    lc.shipments.map(s => ({ ...s, lcObj: lc }))
  );

  // Step Definitions
  const steps = [
    { id: 1, name: 'Freight Forwarder' },
    { id: 2, name: 'Customs Duty' },
    { id: 3, name: 'C&F Agent' },
    { id: 4, name: 'LC Commission' },
    { id: 5, name: 'Bank Interest' },
    { id: 6, name: 'Warehouse' }
  ];

  // Helper to determine the Last/Current Step
  const getCurrentStep = (completedSteps, status) => {
    if (status === 'Completed' || completedSteps >= 6) return 'Completed';
    if (completedSteps === 0) return 'Freight Forwarder'; 
    return steps[completedSteps].name;
  };

  // Filtering Logic
  const filteredShipments = allShipments.filter(s => {
    const matchesSearch = searchTerm === '' || 
                          s.shipment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.lcObj.lc_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLC = filterLC === '' || s.lcObj.lc_number.toLowerCase().includes(filterLC.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;

    return matchesSearch && matchesLC && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">All Shipments</h1>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Quick Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Quick Search (LC or Shipment #)..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Specific LC Filter */}
          <div className="relative">
             <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter LC Number..." 
              className="w-full md:w-64 pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={filterLC}
              onChange={(e) => setFilterLC(e.target.value)}
            />
          </div>
          
          {/* Status Filter */}
          <div className="w-full md:w-48">
             <select 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shipment Number</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">LC Number</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Step</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredShipments.length > 0 ? (
                filteredShipments.map((shipment, idx) => {
                  const parentLC = shipment.lcObj; 
                  return (
                    <tr key={shipment.id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{shipment.shipment_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{parentLC?.lc_number}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          shipment.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          shipment.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {shipment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {getCurrentStep(shipment.completedSteps, shipment.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-gray-700 w-8 text-right">{shipment.progress}%</span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                shipment.progress === 100 ? 'bg-green-500' : 
                                shipment.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                              }`} 
                              style={{ width: `${shipment.progress}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 justify-end">
                          
                          {/* View Button: Opens Read-Only View */}
                          <button 
                            onClick={() => onViewShipment && onViewShipment(parentLC, shipment)} 
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" 
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Button: Navigates to Shipment Detail (Similar to Manage Button) */}
                          <button 
                            onClick={() => onSelectShipment && onSelectShipment(parentLC, shipment)} 
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors" 
                            title="Manage Shipment"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">
                    No shipments found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllShipments;