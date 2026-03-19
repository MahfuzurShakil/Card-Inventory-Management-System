import { useState } from 'react';
import { Package, Search, TruckIcon, AlertTriangle, Eye, ChevronLeft, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Action Buttons per status:
//   Pending             → [Receive]
//   Partially Received  → [Continue Receiving] [View icon]
//   Received            → [View icon only]
// ─────────────────────────────────────────────────────────────────────────────
const ActionButtons = ({ material, onReceiveMaterial, onViewDetails }) => {
  if (material.status === 'Received') {
    return (
      <button
        onClick={() => onViewDetails && onViewDetails(material)}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="View Details"
      >
        <Eye className="w-4 h-4" />
      </button>
    );
  }

  if (material.status === 'Partially Received') {
    return (
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => onReceiveMaterial(material)}
          className="px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors bg-amber-500 hover:bg-amber-600"
        >
          Continue Receiving
        </button>
        <button
          onClick={() => onViewDetails && onViewDetails(material)}
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="View received boxes"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Pending — only Receive button
  return (
    <button
      onClick={() => onReceiveMaterial(material)}
      className="px-3 py-1.5 text-white text-sm font-medium rounded-lg transition-colors bg-blue-600 hover:bg-blue-700"
    >
      Receive
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const InboundMaterialsList = ({ inboundMaterials, lcs, onReceiveMaterial, onViewDetails }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getShipmentDetails = (shipmentId) => {
    for (const lc of lcs) {
      const shipment = lc.shipments.find(s => s.id === shipmentId);
      if (shipment) return { shipment, lc };
    }
    return null;
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredMaterials = inboundMaterials.filter(material => {
    const details = (() => {
      for (const lc of lcs) {
        const shipment = lc.shipments.find(s => s.id === material.shipment_id);
        if (shipment) return { shipment, lc };
      }
      return null;
    })();
    const warehouseStatus = details?.shipment?.stepData?.warehouse?.warehouse_status;
    if (!warehouseStatus || warehouseStatus === 'draft') return false;

    const matchesSearch = searchTerm === '' ||
      material.shipment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.item_description && material.item_description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || material.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleFilterChange = (setter) => (value) => { setter(value); setCurrentPage(1); };

  // Stats — count only visible (non-draft) materials
  const visibleMaterials = inboundMaterials.filter(m => {
    for (const lc of lcs) {
      const s = lc.shipments.find(s => s.id === m.shipment_id);
      if (s) {
        const ws = s.stepData?.warehouse?.warehouse_status;
        return ws && ws !== 'draft';
      }
    }
    return false;
  });
  const totalMaterials = visibleMaterials.length;
  const pendingCount   = visibleMaterials.filter(m => m.status === 'Pending').length;
  const partialCount   = visibleMaterials.filter(m => m.status === 'Partially Received').length;
  const receivedCount  = visibleMaterials.filter(m => m.status === 'Received').length;

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMaterials = filteredMaterials.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbound Materials</h1>
          <p className="text-sm text-gray-500 mt-1">Manage incoming shipments from customs clearance</p>
        </div>
      </div>

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Shipments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalMaterials}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Pending Receipt</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{pendingCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Awaiting receive</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{partialCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Partial receipt ongoing</p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Received</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{receivedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">All boxes confirmed</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search & Filter ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by shipment number or item..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm)(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Partially Received">In Progress</option>
            <option value="Received">Received</option>
          </select>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shipment #</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">LC Number</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">No of Boxes</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Qty/Box</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Quantity</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Received At</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedMaterials.length > 0 ? (
                paginatedMaterials.map((material) => {
                  const details = getShipmentDetails(material.shipment_id);
                  const lc = details?.lc;
                  const shipment = details?.shipment;
                  const warehouseItems = shipment?.stepData?.warehouse?.items || [];

                  // No warehouse items — plain single row
                  if (warehouseItems.length === 0) {
                    return (
                      <tr key={material.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <TruckIcon className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">{material.shipment_number}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{lc?.lc_number || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">—</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">—</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">—</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">—</td>
                        <td className="px-6 py-4 text-sm">
                          {material.status === 'Received' && material.received_at
                            ? <span className="text-xs text-gray-700">{fmtDate(material.received_at)}</span>
                            : material.status === 'Partially Received'
                              ? <span className="text-xs text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3" />Receiving…</span>
                              : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          {material.status === 'Pending' ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Pending</span>
                          ) : material.status === 'Partially Received' ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Partially Received</span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Received</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ActionButtons
                            material={material}
                            onReceiveMaterial={onReceiveMaterial}
                            onViewDetails={onViewDetails}
                          />
                        </td>
                      </tr>
                    );
                  }

                  // Multiple warehouse items — sub-rows with rowSpan on shared columns
                  return warehouseItems.map((item, itemIdx) => {
                    const itemQty   = parseInt(item.quantity) || 0;
                    const itemBoxes = parseInt(item.no_of_boxes) || 0;
                    const qtyPerBox = itemBoxes > 0 ? Math.floor(itemQty / itemBoxes) : 0;

                    return (
                      <tr key={`${material.id}-${itemIdx}`} className="hover:bg-gray-50 transition-colors">
                        {/* Shipment # — rowSpan, first sub-row only */}
                        {itemIdx === 0 ? (
                          <>
                            <td className="px-6 py-4" rowSpan={warehouseItems.length}>
                              <div className="flex items-center gap-2">
                                <TruckIcon className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold text-gray-900">{material.shipment_number}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700" rowSpan={warehouseItems.length}>
                              {lc?.lc_number || 'N/A'}
                            </td>
                          </>
                        ) : null}

                        {/* Item Name — per sub-row */}
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded ${
                            (item.item_type || item.item_name || '').toLowerCase().includes('chip')  ? 'bg-blue-100 text-blue-800' :
                            (item.item_type || item.item_name || '').toLowerCase().includes('tape')  ? 'bg-purple-100 text-purple-800' :
                            (item.item_type || item.item_name || '').toLowerCase().includes('sheet') ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.item_type || item.item_name || 'N/A'}
                          </span>
                        </td>

                        {/* No of Boxes — per sub-row */}
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                          {itemBoxes}
                        </td>

                        {/* Qty/Box — per sub-row */}
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                          {qtyPerBox.toLocaleString()}
                        </td>

                        {/* Quantity — per sub-row */}
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                          {itemQty.toLocaleString()}
                        </td>

                        {/* Received At — rowSpan, first sub-row only */}
                        {itemIdx === 0 ? (
                          <td className="px-6 py-4 text-sm" rowSpan={warehouseItems.length}>
                            {material.status === 'Received' && material.received_at ? (
                              <span className="text-xs text-gray-700">{fmtDate(material.received_at)}</span>
                            ) : material.status === 'Partially Received' ? (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3 flex-shrink-0" />Receiving…
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        ) : null}

                        {/* Status — rowSpan */}
                        {itemIdx === 0 ? (
                          <td className="px-6 py-4" rowSpan={warehouseItems.length}>
                            {material.status === 'Pending' ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">Pending</span>
                            ) : material.status === 'Partially Received' ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Partially Received</span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Received</span>
                            )}
                          </td>
                        ) : null}

                        {/* Action — rowSpan */}
                        {itemIdx === 0 ? (
                          <td className="px-6 py-4 text-right" rowSpan={warehouseItems.length}>
                            <ActionButtons
                              material={material}
                              onReceiveMaterial={onReceiveMaterial}
                              onViewDetails={onViewDetails}
                            />
                          </td>
                        ) : null}
                      </tr>
                    );
                  });
                })
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all'
                      ? 'No materials found matching your filters.'
                      : (
                        <div>
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="mb-4">No inbound materials available.</p>
                          <p className="text-xs text-gray-400">Complete a shipment (Step 6) to see it here</p>
                        </div>
                      )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, filteredMaterials.length)}</span> of{' '}
                <span className="font-medium">{filteredMaterials.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InboundMaterialsList;