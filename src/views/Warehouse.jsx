import { Warehouse as WarehouseIcon, Package, Activity } from 'lucide-react';

const Warehouse = ({ lcs }) => {
  const completedShipments = lcs.flatMap(lc => lc.shipments).filter(s => s.status === 'Completed');
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Warehouse Inventory</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-600">Received Shipments</p><p className="text-3xl font-bold text-gray-900 mt-2">{completedShipments.length}</p></div>
            <WarehouseIcon className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-600">Total Items</p><p className="text-3xl font-bold text-gray-900 mt-2">{completedShipments.reduce((sum, s) => sum + (s.stepData.warehouse?.total_items || 0), 0)}</p></div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-600">Total Quantity</p><p className="text-3xl font-bold text-gray-900 mt-2">{completedShipments.reduce((sum, s) => sum + (s.stepData.warehouse?.total_quantity || 0), 0).toLocaleString()}</p></div>
            <Activity className="w-10 h-10 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">Received Inventory</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">LC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {completedShipments.map(shipment => {
                const parentLC = lcs.find(lc => lc.id === shipment.lc_id);
                return (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{shipment.shipment_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{parentLC?.lc_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{shipment.stepData.warehouse?.total_items || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{shipment.stepData.warehouse?.total_quantity?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">Recently</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Warehouse;