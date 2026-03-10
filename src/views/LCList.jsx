import { useState } from 'react';
import { Search, Filter, Plus, Eye, Edit, ChevronRight } from 'lucide-react';

const LCList = ({ lcs, onSelectLC, onEditLC }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredLCs = lcs
    .filter(lc => statusFilter === 'all' || lc.status === statusFilter)
    .filter(lc => searchTerm === '' || lc.lc_number.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Letters of Credit</h1>
        <button 
           onClick={onEditLC} // Passing null triggers Create mode in App.jsx
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                 >
               <Plus className="w-4 h-4" /> Create New LC
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search by LC number..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Completed">Completed</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><Filter className="w-4 h-4" /> More Filters</button>
          </div>
        </div>
      </div>

      {/* LC Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LC Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PI Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LC Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipments</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLCs.map(lc => (
                <tr key={lc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-gray-900">{lc.lc_number}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(lc.lc_issue_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{lc.bank_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lc.pi_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{lc.lc_currency} {lc.lc_value_foreign.toLocaleString()}</div><div className="text-xs text-gray-500">৳{(lc.lc_value_bdt / 1000000).toFixed(2)}M</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{lc.shipments.filter(s => s.status === 'Completed').length}/{lc.shipments.length}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${lc.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{lc.status}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button onClick={() => onSelectLC(lc)} className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => onEditLC(lc)} className="text-gray-600 hover:text-gray-800"><Edit className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LCList;