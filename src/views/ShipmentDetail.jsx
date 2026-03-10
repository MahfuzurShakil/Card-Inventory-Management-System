import { useState, useEffect } from 'react';
import { Ship, FileText, Building, CreditCard, Percent, Warehouse, ChevronRight, ChevronDown, Upload, Plus, X, Check, Package, AlertTriangle, Send } from 'lucide-react';

const ShipmentDetail = ({ lc, shipment, onBack, onUpdateShipment, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({ customsClearedGoods: [] });
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [reconcileModal, setReconcileModal] = useState(null); // { itemIdx, type: 'missing'|'extra' }
  const [reconcileQty, setReconcileQty] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');

  const ITEM_TYPES = ['Chip', 'Tape', 'Sheet'];

  const steps = [
    { id: 1, name: 'Freight Forwarder', icon: Ship, color: 'blue' },
    { id: 2, name: 'Customs Duty', icon: FileText, color: 'purple' },
    { id: 3, name: 'C&F Agent', icon: Building, color: 'orange' },
    { id: 4, name: 'LC Commission', icon: CreditCard, color: 'pink' },
    { id: 5, name: 'Bank Interest', icon: Percent, color: 'indigo' },
    { id: 6, name: 'Warehouse Transfer', icon: Warehouse, color: 'green' }
  ];

  const canCompleteShipment = () => {
    const sd = shipment.stepData || {};
    return sd.freight_forwarder && sd.customs_duty && sd.cnf_agent &&
           sd.lc_commission && sd.bank_interest && sd.warehouse;
  };

  // Warehouse transfer status helpers
  const warehouseStatus       = shipment.stepData?.warehouse?.warehouse_status || null;
  const isWarehouseDispatched = warehouseStatus === 'dispatched';
  const isWarehouseLocked     = warehouseStatus === 'received' || isWarehouseDispatched; // dispatched = fully locked too

  // Minimum required: at least one item with item_type, no_of_boxes > 0, quantity > 0
  const canDispatch = () => {
    const goods = formData.customsClearedGoods || [];
    if (goods.length === 0) return false;
    return goods.every(item =>
      item.item_type &&
      parseInt(item.no_of_boxes) > 0 &&
      parseInt(item.quantity) > 0
    );
  };

  // ── Auto-generate boxes for a warehouse item ──────────────────────────────
  const generateBoxesForItem = (item) => {
    const noBoxes = parseInt(item.no_of_boxes) || 0;
    const totalQty = parseInt(item.quantity) || 0;
    if (noBoxes <= 0 || totalQty <= 0) return [];

    const base = Math.floor(totalQty / noBoxes);
    const rem  = totalQty % noBoxes;
    const ts   = Date.now();

    return Array.from({ length: noBoxes }, (_, i) => ({
      box_index:   i + 1,
      box_name:    `${item.item_type}-BOX-${String(i + 1).padStart(3, '0')}`,
      item_type:   item.item_type,
      quantity:    i === noBoxes - 1 ? base + rem : base,
      missing_qty: 0,
      extra_qty:   0,
      reconciliation_notes: [],
      barcode:     `BC-${ts}-${i + 1}`,
    }));
  };

  useEffect(() => {
    if (shipment) {
      const nextStep = shipment.completedSteps + 1 > 6 ? 6 : shipment.completedSteps + 1;
      setCurrentStep(nextStep);
      const sd = shipment.stepData || {};
      setFormData(prev => ({
        ...prev,
        ff_name: '', awb_bl_no: '', etd: '', eta: '', ff_bill_amount: '',
        cd: '', rd: '', sd: '', vat: '', ait: '', at: '', atv: '', df_vat: '',
        cnf_agent_name: '', documents_handover_date: '', cargo_release_date: '', cnf_bill_value: '',
        lc_commission: '', vat_on_commission: '', stamp_charges: '', other_charges: '', other_vat: '',
        date: '', document_no: '', lc_value_bdt_realised: '', interest_amount: '',
        challan_path: sd.warehouse?.challan_path || null,
        customsClearedGoods: sd.warehouse?.items || [],
        ...(sd.freight_forwarder || {}),
        ...(sd.customs_duty || {}),
        ...(sd.cnf_agent || {}),
        ...(sd.lc_commission || {}),
        ...(sd.bank_interest || {}),
      }));
      setUploadedFiles({
        freight_bill:      sd.freight_forwarder?.freight_bill_path || null,
        be_document:       sd.customs_duty?.be_document_path || null,
        cnf_bill:          sd.cnf_agent?.cnf_bill_path || null,
        commercial_doc:    sd.cnf_agent?.commercial_doc_path || null,
        interest_document: sd.bank_interest?.document_path || null,
        challan:           sd.warehouse?.challan_path || null,
      });
    }
  }, [shipment]);

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleFileUpload = (fieldName, e) => {
    const file = e.target.files[0];
    if (file) setUploadedFiles(prev => ({ ...prev, [fieldName]: file.name }));
  };

  const calculateCustomsTotal = () => {
    return ['cd', 'rd', 'sd', 'vat', 'ait', 'at', 'atv', 'df_vat']
      .reduce((s, f) => s + (parseFloat(formData[f]) || 0), 0);
  };

  const calculateCommissionTotal = () => {
    return ['lc_commission', 'vat_on_commission', 'stamp_charges', 'other_charges', 'other_vat']
      .reduce((s, f) => s + (parseFloat(formData[f]) || 0), 0);
  };

  // ── Warehouse item actions ────────────────────────────────────────────────
  const addWarehouseItem = () => {
    setFormData(prev => {
      const nextSerial = String(prev.customsClearedGoods.length + 1).padStart(3, '0');
      return {
        ...prev,
        customsClearedGoods: [...prev.customsClearedGoods, {
          serial: nextSerial, item_type: 'Chip', quantity: '', no_of_boxes: '',
          quantity_per_box: '', missing_quantity: '0',
          boxes: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        }]
      };
    });
  };

  const updateWarehouseItem = (index, field, value) => {
    const updated = [...formData.customsClearedGoods];
    updated[index][field] = value;
    updated[index].updated_at = new Date().toISOString();

    // No of boxes or qty/box changed: auto-calc total quantity
    if (field === 'no_of_boxes' || field === 'quantity_per_box') {
      const nob = parseInt(field === 'no_of_boxes'     ? value : updated[index].no_of_boxes)     || 0;
      const qpb = parseInt(field === 'quantity_per_box' ? value : updated[index].quantity_per_box) || 0;
      updated[index].quantity = nob * qpb;
      updated[index].boxes = generateBoxesForItem(updated[index]);
    }
    // User manually edits total quantity: keep qty_per_box in sync
    if (field === 'quantity') {
      const qty = parseInt(value) || 0;
      const nob = parseInt(updated[index].no_of_boxes) || 0;
      if (nob > 0) updated[index].quantity_per_box = Math.floor(qty / nob);
      updated[index].boxes = generateBoxesForItem(updated[index]);
    }

    setFormData(prev => ({ ...prev, customsClearedGoods: updated }));
  };

  const removeWarehouseItem = (index) => {
    setFormData(prev => ({
      ...prev,
      customsClearedGoods: prev.customsClearedGoods.filter((_, i) => i !== index)
    }));
  };

  const toggleItemExpand = (idx) => {
    setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
    // Ensure boxes are generated before expanding
    const item = formData.customsClearedGoods[idx];
    if (!item.boxes || item.boxes.length === 0) {
      const updated = [...formData.customsClearedGoods];
      updated[idx].boxes = generateBoxesForItem(item);
      setFormData(prev => ({ ...prev, customsClearedGoods: updated }));
    }
  };

  // ── Reconciliation (missing / extra) ─────────────────────────────────────
  const openReconcile = (itemIdx, boxIdx, type) => {
    setReconcileModal({ itemIdx, boxIdx, type });
    setReconcileQty('');
    setReconcileNote('');
  };

  const submitReconcile = () => {
    if (!reconcileQty || parseInt(reconcileQty) <= 0) return;
    const updated = [...formData.customsClearedGoods];
    const box = { ...updated[reconcileModal.itemIdx].boxes[reconcileModal.boxIdx] };
    const qty = parseInt(reconcileQty);
    if (reconcileModal.type === 'missing') {
      box.missing_qty = (box.missing_qty || 0) + qty;
    } else {
      box.extra_qty = (box.extra_qty || 0) + qty;
    }
    box.reconciliation_notes = [
      ...(box.reconciliation_notes || []),
      { type: reconcileModal.type, qty, note: reconcileNote, at: new Date().toISOString() }
    ];
    updated[reconcileModal.itemIdx].boxes[reconcileModal.boxIdx] = box;
    setFormData(prev => ({ ...prev, customsClearedGoods: updated }));
    setReconcileModal(null);
  };

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = () => {
    let newData = { ...shipment.stepData };
    let progress = Math.round((currentStep / 6) * 100);
    const timestamp = new Date().toISOString();

    if (currentStep === 1) {
      newData.freight_forwarder = {
        ff_name: formData.ff_name, awb_bl_no: formData.awb_bl_no,
        etd: formData.etd, eta: formData.eta,
        ff_bill_amount: parseFloat(formData.ff_bill_amount) || 0,
        freight_bill_path: uploadedFiles.freight_bill || null,
        created_at: shipment.stepData?.freight_forwarder?.created_at || timestamp, updated_at: timestamp
      };
    } else if (currentStep === 2) {
      newData.customs_duty = {
        cd: parseFloat(formData.cd) || 0, rd: parseFloat(formData.rd) || 0,
        sd: parseFloat(formData.sd) || 0, vat: parseFloat(formData.vat) || 0,
        ait: parseFloat(formData.ait) || 0, at: parseFloat(formData.at) || 0,
        atv: parseFloat(formData.atv) || 0, df_vat: parseFloat(formData.df_vat) || 0,
        total_customs_amount: calculateCustomsTotal(),
        be_document_path: uploadedFiles.be_document || null,
        created_at: shipment.stepData?.customs_duty?.created_at || timestamp, updated_at: timestamp
      };
    } else if (currentStep === 3) {
      newData.cnf_agent = {
        cnf_agent_name: formData.cnf_agent_name,
        documents_handover_date: formData.documents_handover_date,
        cargo_release_date: formData.cargo_release_date,
        cnf_bill_value: parseFloat(formData.cnf_bill_value) || 0,
        cnf_bill_path: uploadedFiles.cnf_bill || null,
        commercial_doc_path: uploadedFiles.commercial_doc || null,
        created_at: shipment.stepData?.cnf_agent?.created_at || timestamp, updated_at: timestamp
      };
    } else if (currentStep === 4) {
      newData.lc_commission = {
        lc_commission: parseFloat(formData.lc_commission) || 0,
        vat_on_commission: parseFloat(formData.vat_on_commission) || 0,
        stamp_charges: parseFloat(formData.stamp_charges) || 0,
        other_charges: parseFloat(formData.other_charges) || 0,
        other_vat: parseFloat(formData.other_vat) || 0,
        total_cost: calculateCommissionTotal(),
        created_at: shipment.stepData?.lc_commission?.created_at || timestamp, updated_at: timestamp
      };
    } else if (currentStep === 5) {
      newData.bank_interest = {
        date: formData.date, document_no: formData.document_no,
        lc_value_bdt_realised: parseFloat(formData.lc_value_bdt_realised) || 0,
        interest_amount: parseFloat(formData.interest_amount) || 0,
        document_path: uploadedFiles.interest_document || null,
        created_at: shipment.stepData?.bank_interest?.created_at || timestamp, updated_at: timestamp
      };
    } else if (currentStep === 6) {
      // Do not allow save if goods already received by store
      if (isWarehouseLocked) return;

      // Ensure boxes are generated for every item
      const itemsWithBoxes = formData.customsClearedGoods.map(item => ({
        ...item,
        boxes: item.boxes && item.boxes.length > 0 ? item.boxes : generateBoxesForItem(item),
        quantity_per_box: parseInt(item.no_of_boxes) > 0
          ? Math.floor((parseInt(item.quantity) || 0) / parseInt(item.no_of_boxes))
          : 0,
      }));

      // Preserve existing warehouse_status — never downgrade dispatched/received on re-save
      const preservedStatus = shipment.stepData?.warehouse?.warehouse_status || 'draft';

      newData.warehouse = {
        challan_path: uploadedFiles.challan || shipment.stepData?.warehouse?.challan_path || null,
        items: itemsWithBoxes,
        total_quantity: itemsWithBoxes.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0),
        total_boxes:    itemsWithBoxes.reduce((s, i) => s + (parseInt(i.no_of_boxes) || 0), 0),
        total_missing:  itemsWithBoxes.reduce((s, i) => s + (parseInt(i.missing_quantity) || 0), 0),
        warehouse_status: preservedStatus,
        created_at: shipment.stepData?.warehouse?.created_at || timestamp, updated_at: timestamp
      };
      progress = 100;
    }

    const allStepsCompleted = newData.freight_forwarder && newData.customs_duty &&
                              newData.cnf_agent && newData.lc_commission &&
                              newData.bank_interest && newData.warehouse;

    const updatedShipment = {
      ...shipment,
      stepData: newData,
      completedSteps: Math.max(shipment.completedSteps, currentStep),
      progress,
      status: allStepsCompleted ? 'Completed' : 'In Progress',
      last_updated: timestamp, updated_by: 'User'
    };

    onUpdateShipment(updatedShipment);
    if (allStepsCompleted && currentStep === 6) {
      onComplete && onComplete(updatedShipment);
    } else {
      setCurrentStep(s => Math.min(6, s + 1));
    }
  };

  // ── Dispatch handler ─────────────────────────────────────────────────────
  // Sets warehouse_status = 'dispatched', which triggers inbound material creation in App.jsx
  const handleDispatch = () => {
    if (!canDispatch() || isWarehouseLocked) return;
    const timestamp = new Date().toISOString();

    const itemsWithBoxes = formData.customsClearedGoods.map(item => ({
      ...item,
      boxes: item.boxes && item.boxes.length > 0 ? item.boxes : generateBoxesForItem(item),
      quantity_per_box: parseInt(item.no_of_boxes) > 0
        ? Math.floor((parseInt(item.quantity) || 0) / parseInt(item.no_of_boxes))
        : 0,
    }));

    const updatedWarehouse = {
      challan_path:    uploadedFiles.challan || shipment.stepData?.warehouse?.challan_path || null,
      items:           itemsWithBoxes,
      total_quantity:  itemsWithBoxes.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0),
      total_boxes:     itemsWithBoxes.reduce((s, i) => s + (parseInt(i.no_of_boxes) || 0), 0),
      total_missing:   itemsWithBoxes.reduce((s, i) => s + (parseInt(i.missing_quantity) || 0), 0),
      warehouse_status: 'dispatched',
      dispatched_at:   timestamp,
      created_at:      shipment.stepData?.warehouse?.created_at || timestamp,
      updated_at:      timestamp,
    };

    const newStepData = { ...shipment.stepData, warehouse: updatedWarehouse };
    const allStepsCompleted = newStepData.freight_forwarder && newStepData.customs_duty &&
      newStepData.cnf_agent && newStepData.lc_commission && newStepData.bank_interest;

    const updatedShipment = {
      ...shipment,
      stepData: newStepData,
      completedSteps: Math.max(shipment.completedSteps, 6),
      progress: 100,
      status: allStepsCompleted ? 'Completed' : 'In Progress',
      last_updated: timestamp,
      updated_by: 'User',
    };

    onUpdateShipment(updatedShipment);
  };

  // ── Step renderers ────────────────────────────────────────────────────────
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Freight Forwarder Name *', field: 'ff_name', type: 'text', placeholder: 'Enter FF name' },
                { label: 'AWB/BL No. *', field: 'awb_bl_no', type: 'text', placeholder: 'Enter AWB/BL number' },
                { label: 'ETD (Estimated Time of Departure) *', field: 'etd', type: 'date' },
                { label: 'ETA (Estimated Time of Arrival) *', field: 'eta', type: 'date' },
                { label: 'FF Bill Amount (BDT) *', field: 'ff_bill_amount', type: 'number', placeholder: '0.00' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input type={type} value={formData[field] || ''} placeholder={placeholder}
                    onChange={e => handleInputChange(field, e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Freight Bill</label>
                <FileUploadBox name="freight_bill" uploadedFiles={uploadedFiles} onUpload={handleFileUpload} color="blue" />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'CD (Customs Duty)', field: 'cd' }, { label: 'RD (Regulatory Duty)', field: 'rd' },
                { label: 'SD (Supplementary Duty)', field: 'sd' }, { label: 'VAT', field: 'vat' },
                { label: 'AIT (Advance Income Tax)', field: 'ait' }, { label: 'AT (Advance Tax)', field: 'at' },
                { label: 'ATV (Advance Trade VAT)', field: 'atv' }, { label: 'DF VAT (Deferred VAT)', field: 'df_vat' }
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input type="number" value={formData[field] || ''} placeholder="0.00"
                    onChange={e => handleInputChange(field, e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
              ))}
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-purple-900">Total Customs Amount:</span>
              <span className="text-2xl font-bold text-purple-900">৳ {calculateCustomsTotal().toLocaleString()}</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload BE Document</label>
              <FileUploadBox name="be_document" uploadedFiles={uploadedFiles} onUpload={handleFileUpload} color="purple" />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'C&F Agent Name *', field: 'cnf_agent_name', type: 'text', placeholder: 'Enter C&F agent name' },
                { label: 'Documents Handover Date *', field: 'documents_handover_date', type: 'date' },
                { label: 'Cargo Release Date *', field: 'cargo_release_date', type: 'date' },
                { label: 'C&F Bill Value (BDT) *', field: 'cnf_bill_value', type: 'number', placeholder: '0.00' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input type={type} value={formData[field] || ''} placeholder={placeholder}
                    onChange={e => handleInputChange(field, e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload C&F Bill</label>
                <FileUploadBox name="cnf_bill" uploadedFiles={uploadedFiles} onUpload={handleFileUpload} color="orange" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Commercial Documents</label>
                <FileUploadBox name="commercial_doc" uploadedFiles={uploadedFiles} onUpload={handleFileUpload} color="orange" />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'LC Commission (BDT)', field: 'lc_commission' },
                { label: 'VAT on Commission', field: 'vat_on_commission' },
                { label: 'Stamp Charges', field: 'stamp_charges' },
                { label: 'Other Charges', field: 'other_charges' },
                { label: 'Other VAT', field: 'other_vat' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input type="number" value={formData[field] || ''} placeholder="0.00"
                    onChange={e => handleInputChange(field, e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                </div>
              ))}
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-pink-900">Total Commission Cost:</span>
              <span className="text-2xl font-bold text-pink-900">৳ {calculateCommissionTotal().toLocaleString()}</span>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Date *', field: 'date', type: 'date' },
                { label: 'Document No. *', field: 'document_no', type: 'text', placeholder: 'Enter document number' },
                { label: 'LC Value BDT Realised *', field: 'lc_value_bdt_realised', type: 'number', placeholder: '0.00' },
                { label: 'Interest Amount (BDT) *', field: 'interest_amount', type: 'number', placeholder: '0.00' },
              ].map(({ label, field, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input type={type} value={formData[field] || ''} placeholder={placeholder}
                    onChange={e => handleInputChange(field, e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Interest Document</label>
              <FileUploadBox name="interest_document" uploadedFiles={uploadedFiles} onUpload={handleFileUpload} color="indigo" />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            {/* ── Add Item button — only shown when items already exist ── */}
            {formData.customsClearedGoods.length > 0 && !isWarehouseLocked && (
              <div className="flex justify-end">
                <button onClick={addWarehouseItem}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            )}

            {formData.customsClearedGoods.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-lg py-8 text-center bg-gray-50">
                <Warehouse className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500 mb-3">No items added yet</p>
                {!isWarehouseLocked && (
                  <button onClick={addWarehouseItem}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                    <Plus className="w-4 h-4" /> Add First Item
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-8 px-3 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Serial</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Item Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">No of Boxes</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Qty / Box</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Box Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.customsClearedGoods.map((item, idx) => {
                      const boxes = item.boxes && item.boxes.length > 0
                        ? item.boxes
                        : (parseInt(item.no_of_boxes) > 0 ? generateBoxesForItem(item) : []);
                      const isExpanded = expandedItems[idx];
                      const totalQty = parseInt(item.quantity) || 0;
                      const noBoxes  = parseInt(item.no_of_boxes) || 0;
                      const qtyPerBox = noBoxes > 0 ? Math.floor(totalQty / noBoxes) : 0;

                      return (
                        <>
                          {/* ── Main item row ── */}
                          <tr key={`item-${idx}`}
                            className={`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-green-50' : ''}`}
                            onClick={() => noBoxes > 0 && toggleItemExpand(idx)}>
                            <td className="px-3 py-3 text-center">
                              {noBoxes > 0 ? (
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              ) : <span className="w-4 h-4 block" />}
                            </td>
                            {/* Serial — auto-generated, read-only */}
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">
                              {item.serial}
                            </td>
                            {/* Change 5: read-only when locked */}
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              {isWarehouseLocked ? (
                                <span className="px-2 py-1 text-sm text-gray-700">{item.item_type || 'N/A'}</span>
                              ) : (
                                <select className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-green-500"
                                  value={item.item_type || 'Chip'}
                                  onChange={e => updateWarehouseItem(idx, 'item_type', e.target.value)}>
                                  {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              )}
                            </td>
                            {/* No of Boxes */}
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              {isWarehouseLocked ? (
                                <span className="px-2 py-1 text-sm text-gray-700">{item.no_of_boxes}</span>
                              ) : (
                                <input type="number" className="w-24 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-green-500"
                                  value={item.no_of_boxes} onChange={e => updateWarehouseItem(idx, 'no_of_boxes', e.target.value)}
                                  placeholder="0" />
                              )}
                            </td>
                            {/* Qty / Box */}
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              {isWarehouseLocked ? (
                                <span className="px-2 py-1 text-sm text-gray-700">{item.quantity_per_box}</span>
                              ) : (
                                <input type="number" className="w-24 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-green-500"
                                  value={item.quantity_per_box} onChange={e => updateWarehouseItem(idx, 'quantity_per_box', e.target.value)}
                                  placeholder="0" />
                              )}
                            </td>
                            {/* Total Qty */}
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              {isWarehouseLocked ? (
                                <span className="px-2 py-1 text-sm font-medium text-gray-900">{(parseInt(item.quantity) || 0).toLocaleString()}</span>
                              ) : (
                                <input type="number" className="w-28 px-2 py-1 border border-green-300 bg-green-50 rounded text-sm focus:ring-2 focus:ring-green-500 font-medium"
                                  value={item.quantity} onChange={e => updateWarehouseItem(idx, 'quantity', e.target.value)}
                                  placeholder="0" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {noBoxes > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                  <Package className="w-3 h-3" /> {noBoxes} boxes created
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">Enter box count</span>
                              )}
                            </td>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              {!isWarehouseLocked && (
                                <button onClick={() => removeWarehouseItem(idx)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded">
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* ── Expanded box breakdown ── */}
                          {isExpanded && boxes.length > 0 && (
                            <tr key={`boxes-${idx}`}>
                              <td colSpan="8" className="px-0 py-0 border-b border-gray-200 bg-gray-50">
                                <div className="px-8 py-3">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Box Breakdown — {item.item_type} &nbsp;·&nbsp; {boxes.length} boxes
                                  </p>
                                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="max-h-56 overflow-y-auto">
                                      <table className="w-full text-xs">
                                        <thead className="bg-gray-100 sticky top-0 z-10">
                                          <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Box Name</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Missing</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Extra</th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                          {boxes.map((box, boxIdx) => (
                                            <tr key={boxIdx} className="hover:bg-gray-50">
                                              <td className="px-3 py-2 font-mono text-gray-700 text-xs">{box.box_name}</td>
                                              <td className="px-3 py-2 text-center font-semibold text-gray-800">{(box.quantity || 0).toLocaleString()}</td>
                                              <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                                                {isWarehouseLocked ? (
                                                  <span className="text-xs text-gray-700">{box.missing_qty || 0}</span>
                                                ) : (
                                                <input
                                                  type="number" min="0"
                                                  value={box.missing_qty || ''}
                                                  onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const updated = [...formData.customsClearedGoods];
                                                    updated[idx].boxes[boxIdx] = { ...updated[idx].boxes[boxIdx], missing_qty: val };
                                                    setFormData(prev => ({ ...prev, customsClearedGoods: updated }));
                                                  }}
                                                  placeholder="0"
                                                  className="w-16 px-2 py-1 text-center text-xs border border-gray-200 rounded bg-gray-50 focus:ring-1 focus:ring-red-400 focus:border-red-400 focus:bg-white transition-all"
                                                />
                                                )}
                                              </td>
                                              <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                                                {isWarehouseLocked ? (
                                                  <span className="text-xs text-gray-700">{box.extra_qty || 0}</span>
                                                ) : (
                                                <input
                                                  type="number" min="0"
                                                  value={box.extra_qty || ''}
                                                  onChange={e => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const updated = [...formData.customsClearedGoods];
                                                    updated[idx].boxes[boxIdx] = { ...updated[idx].boxes[boxIdx], extra_qty: val };
                                                    setFormData(prev => ({ ...prev, customsClearedGoods: updated }));
                                                  }}
                                                  placeholder="0"
                                                  className="w-16 px-2 py-1 text-center text-xs border border-gray-200 rounded bg-gray-50 focus:ring-1 focus:ring-blue-400 focus:border-blue-400 focus:bg-white transition-all"
                                                />
                                                )}
                                              </td>
                                              <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                                {isWarehouseLocked ? (
                                                  <span className="text-xs text-gray-500">{box.remarks || '—'}</span>
                                                ) : (
                                                <input
                                                  type="text"
                                                  value={box.remarks || ''}
                                                  onChange={e => {
                                                    const updated = [...formData.customsClearedGoods];
                                                    updated[idx].boxes[boxIdx] = { ...updated[idx].boxes[boxIdx], remarks: e.target.value };
                                                    setFormData(prev => ({ ...prev, customsClearedGoods: updated }));
                                                  }}
                                                  placeholder="Optional note..."
                                                  className="w-full min-w-[120px] px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 focus:ring-1 focus:ring-gray-400 focus:bg-white transition-all"
                                                />
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Summary with inline status ── */}
            {formData.customsClearedGoods.length > 0 && (
              <div className={`border rounded-lg p-4 flex items-center justify-between ${
                warehouseStatus === 'received'   ? 'bg-green-50 border-green-200' :
                warehouseStatus === 'dispatched' ? 'bg-blue-50 border-blue-200'  :
                                                   'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex gap-6 text-sm">
                  <span className="text-gray-600">Total Items: <strong className="text-gray-900">{formData.customsClearedGoods.length}</strong></span>
                  <span className="text-gray-600">Total Qty: <strong className="text-gray-900">
                    {formData.customsClearedGoods.reduce((s, i) => s + (parseInt(i.quantity) || 0), 0).toLocaleString()}
                  </strong></span>
                  <span className="text-gray-600">Total Boxes: <strong className="text-green-700">
                    {formData.customsClearedGoods.reduce((s, i) => s + (parseInt(i.no_of_boxes) || 0), 0)}
                  </strong></span>
                </div>
                {/* Inline status badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${
                    warehouseStatus === 'received'   ? 'bg-green-600 text-white' :
                    warehouseStatus === 'dispatched' ? 'bg-blue-600 text-white'  :
                                                       'bg-gray-400 text-white'
                  }`}>
                    {warehouseStatus === 'received'   ? '✓ Received' :
                     warehouseStatus === 'dispatched' ? '→ Dispatched' : '· Draft'}
                  </span>
                </div>
              </div>
            )}

            {/* ── Challan Upload — below the table ── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Challan <span className="text-gray-400 font-normal">(one challan for the entire shipment)</span>
              </label>
              <FileUploadBox name="challan" uploadedFiles={uploadedFiles} onUpload={handleFileUpload} color="green" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Reconciliation Modal ── */}
      {reconcileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {reconcileModal.type === 'missing' ? 'Report Missing Items' : 'Report Extra Items'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {reconcileModal.type === 'missing'
                ? 'Enter the quantity of items that were missing from this box.'
                : 'Enter the quantity of extra items found in this box.'}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" min="1" value={reconcileQty}
                  onChange={e => setReconcileQty(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="0" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input type="text" value={reconcileNote}
                  onChange={e => setReconcileNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Reason or observation..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setReconcileModal(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submitReconcile}
                className={`flex-1 py-2 rounded-lg text-sm font-medium text-white ${
                  reconcileModal.type === 'missing' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{lc.lc_number} → {shipment.shipment_number}</h1>
            <p className="text-sm text-gray-500 mt-1">Shipment Progress Tracker</p>
          </div>
        </div>
        <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
          shipment.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {shipment.status}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="relative">
          <div className="absolute top-6 left-0 h-1 bg-gray-200" style={{ width: 'calc(100% - 48px)', left: '24px' }} />
          <div className="absolute top-6 left-0 h-1 bg-blue-600 transition-all duration-500"
            style={{ width: `calc((100% - 48px) * ${shipment.completedSteps / (steps.length - 1)})`, left: '24px', maxWidth: 'calc(100% - 48px)' }} />
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < shipment.completedSteps;
              const isCurrent = index === currentStep - 1;
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <button onClick={() => setCurrentStep(step.id)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all mb-3 relative z-10 ${
                      isCompleted ? 'bg-green-600 text-white shadow-lg'
                      : isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-lg'
                      : 'bg-gray-200 text-gray-400'
                    } hover:scale-110`}>
                    <Icon className="w-6 h-6" />
                  </button>
                  <p className={`text-xs font-medium text-center max-w-20 ${isCurrent ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                    {step.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {currentStep === 6 ? (
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Step {currentStep}: {steps[currentStep - 1]?.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Add items — boxes are auto-generated. Click a row to view box breakdown.
              </p>
            </div>
            {warehouseStatus && (
              <div className="relative group inline-flex items-center gap-1.5 flex-shrink-0 ml-4 mt-0.5">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full cursor-default ${
                  warehouseStatus === 'received'   ? 'bg-green-100 text-green-800' :
                  warehouseStatus === 'dispatched' ? 'bg-blue-100 text-blue-800'  :
                                                     'bg-gray-100 text-gray-600'
                }`}>
                  {warehouseStatus === 'received'   ? '✓ Received' :
                   warehouseStatus === 'dispatched' ? '→ Dispatched' : '· Draft'}
                  <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {warehouseStatus === 'received'
                    ? 'Goods have been received by the store. This record is now locked and cannot be edited.'
                    : warehouseStatus === 'dispatched'
                    ? 'Goods have been dispatched to the store. This record is locked and cannot be edited.'
                    : 'Draft saved. Dispatch to store when ready.'}
                  <div className="absolute right-3 -top-1 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Step {currentStep}: {steps[currentStep - 1]?.name}
          </h2>
        )}
        {renderStepContent()}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <button onClick={() => setCurrentStep(s => Math.max(1, s - 1))} disabled={currentStep === 1}
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
            Previous Step
          </button>
          {currentStep === 6 ? (
            <div className="flex items-center gap-3">
              {/* Save Draft — only available while status is null/draft */}
              <button
                onClick={handleSave}
                disabled={isWarehouseLocked}
                title={isWarehouseDispatched ? 'Dispatched — record is locked' : isWarehouseLocked ? 'Record is locked' : ''}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                Save Draft
              </button>
              {/* Dispatch to Store — hidden once already dispatched or received */}
              {!isWarehouseLocked && (
                <button
                  onClick={handleDispatch}
                  disabled={!canDispatch()}
                  title={!canDispatch() ? 'Add at least one item with item type, boxes and quantity to dispatch' : ''}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors font-medium shadow-md disabled:opacity-40 disabled:cursor-not-allowed">
                  <Send className="w-4 h-4" />
                  Dispatch to Store
                </button>
              )}
            </div>
          ) : canCompleteShipment() ? (
            <button onClick={handleSave}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors font-medium shadow-md">
              Complete Shipment <Check className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSave}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors font-medium shadow-md">
              Save & Continue <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Reusable file upload box ──────────────────────────────────────────────────
const FileUploadBox = ({ name, uploadedFiles, onUpload, color = 'blue' }) => (
  <div className="relative">
    <input type="file" onChange={e => onUpload(name, e)}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      accept=".pdf,.jpg,.jpeg,.png" />
    <div className={`border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-center hover:border-${color}-400 transition-colors cursor-pointer`}>
      {uploadedFiles[name] ? (
        <div className="flex items-center justify-center gap-2 text-green-600">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">{uploadedFiles[name]}</span>
        </div>
      ) : (
        <div className="text-gray-500">
          <Upload className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Click to upload</p>
        </div>
      )}
    </div>
  </div>
);

export default ShipmentDetail;