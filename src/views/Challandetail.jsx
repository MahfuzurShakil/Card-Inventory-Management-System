import { useState } from 'react';
import {
  ChevronRight, Calendar, Printer, Download,
  Barcode, ChevronLeft, ChevronRight as ChevronRightIcon,
  Truck, Package, Layers, FileText, User
} from 'lucide-react';
import { openChallanPrint } from '../utils/challanPrint';

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const InfoItem = ({ label, value, mono = false, icon }) => (
  <div className="space-y-1">
    <p className="text-xs text-gray-500 uppercase font-medium flex items-center gap-1.5">
      {icon}
      {label}
    </p>
    <p className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
  </div>
);

const ChallanDetail = ({ challan, onBack }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS = 10;

  if (!challan) return null;

  const boxes = challan.boxes || [];
  const totalQty = boxes.reduce((sum, box) => sum + (box.quantity || 0), 0);
  const totalPages = Math.max(1, Math.ceil(boxes.length / ROWS));
  const safePage = Math.min(currentPage, totalPages);
  const pageBoxes = boxes.slice((safePage - 1) * ROWS, safePage * ROWS);
  const itemDescription = challan.item_description || challan.remarks;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180 text-gray-500" />
            </button>
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-gray-400">Challan Details</p>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">{challan.challan_no}</h1>
              <p className="text-sm text-gray-500 mt-0.5">Delivery challan information and dispatched box list</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              <Truck className="w-4 h-4" /> Dispatched
            </span>
            <button
              onClick={() => openChallanPrint(challan, boxes)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Challan
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoItem icon={<FileText className="w-3.5 h-3.5 text-gray-400" />} label="Challan No." value={challan.challan_no} mono />
            <InfoItem icon={<Calendar className="w-3.5 h-3.5 text-gray-400" />} label="Date" value={fmtDate(challan.date)} />
            <InfoItem icon={<User className="w-3.5 h-3.5 text-gray-400" />} label="Prepared By" value={challan.prepared_by || '—'} />
            <InfoItem icon={<Package className="w-3.5 h-3.5 text-gray-400" />} label="Item Name" value={challan.item_name || 'Smart Blank Card'} />
            <InfoItem icon={<Package className="w-3.5 h-3.5 text-gray-400" />} label="Number of Box" value={boxes.length.toLocaleString()} />
            <InfoItem icon={<Layers className="w-3.5 h-3.5 text-gray-400" />} label="Total Quantity" value={totalQty.toLocaleString()} />
            <div className="space-y-1">
              <p className="text-xs text-gray-500 uppercase font-medium flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-gray-400" />
                Status
              </p>
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                <Truck className="w-3 h-3" /> Dispatched
              </span>
            </div>
          </div>

          {itemDescription && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium mb-1.5">Item Description</p>
              <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-3 whitespace-pre-wrap">
                {itemDescription}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Dispatched Boxes</h3>
            <p className="text-sm text-gray-500 mt-0.5">{boxes.length} sub-boxes in this challan</p>
          </div>
          <button
            onClick={() => openChallanPrint(challan, boxes)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download Challan
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Box Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Barcode</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Shift</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Production Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pageBoxes.length > 0 ? pageBoxes.map((box, idx) => {
                const rejected = box.client_rejected_count || 0;
                const globalIdx = (safePage - 1) * ROWS + idx + 1;

                return (
                  <tr key={box.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-400 text-xs font-mono">{globalIdx}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold font-mono text-gray-900">
                        {box.sub_box_name || box.box_name || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {box.barcode ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600">
                          <Barcode className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[130px]" title={box.barcode}>{box.barcode}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                        box.shift === 'Day' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                      }`}>
                        {box.shift}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{fmtDate(box.production_date)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">
                      {(box.quantity || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {rejected > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                          {rejected.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs italic">—</span>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-sm text-gray-500">
                    No boxes found in this challan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(safePage - 1) * ROWS + 1}</span>-
              <span className="font-medium">{Math.min(safePage * ROWS, boxes.length)}</span> of{' '}
              <span className="font-medium">{boxes.length}</span> boxes
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">Page {safePage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallanDetail;
