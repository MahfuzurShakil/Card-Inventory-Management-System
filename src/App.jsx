import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import LCList from './views/LCList';
import LCDetail from './views/LCDetail';
import ShipmentDetail from './views/ShipmentDetail';
import AllShipments from './views/AllShipments';
import Warehouse from './views/Warehouse';
import Reports from './views/Reports';
import ShipmentView from './views/ShipmentView';
import LCForm from './views/LCForm';
// PRODUCTION IMPORTS
import ProductionDashboard from './views/ProductionDashboard';
import EmployeeList from './views/EmployeeList';
import EmployeeForm from './views/EmployeeForm';
import ShiftAssignment from './views/ShiftAssignment';
import InboundMaterialsList from './views/InboundMaterialsList';
import InboundReceiving from './views/InboundReceiving';
import InboundShipmentBoxes from './views/InboundShipmentBoxes';
import BoxList from './views/BoxList';
import BoxCreation from './views/BoxCreation';
import BoxDetail from './views/BoxDetail';
import ProductionFloor from './views/ProductionFloor';
import ProductionIssue from './views/ProductionIssue';
import SubBoxList from './views/SubBoxList';
import SubBoxCreation from './views/SubBoxCreation';
import ClientRejection from './views/ClientRejection';
import SubBoxDetail from './views/SubBoxDetail';
import AdminDashboard from './views/AdminDashboard';

import Production from './views/Production';
import CreateChallan from './views/CreateChallan';


// Finance imports
import FinanceDashboard from './views/FinanceDashboard';
import LocalCosts from './views/LocalCosts';

import ShiftRosterList from './views/ShiftRosterList';

import LandingCost from './views/LandingCost';


import DeliveredGoods from './views/Deliveredgoods';
import ChallanDetail  from './views/Challandetail';


// INITIAL MOCK DATA WITH COMPLETED SHIPMENT FOR TESTING
const INITIAL_LCS = [
  {
    id: 1,
    lc_number: 'LC-2024-001',
    lc_issue_date: '2024-01-15',
    bank_name: 'Standard Chartered Bank',
    lc_value_foreign: 50000,
    lc_currency: 'USD',
    lc_value_bdt: 5500000,
    exchange_rate: 110,
    pi_number: 'PI-2024-001',
    pi_date: '2024-01-10',
    quantity: 10000,
    item_description: 'Premium Chip Cards',
    status: 'Active',
    insurance_bill_amount: 15000,
    cover_note_number: 'CN-2024-001',
    insurance_company_name: 'AIG Insurance',
    shipments: [
      { 
        id: 101, 
        lc_id: 1, 
        shipment_number: 'SH-2024-001', 
        status: 'Completed', 
        progress: 100, 
        completedSteps: 6,
        stepData: {
          freight_forwarder: { 
            ff_name: 'DHL Logistics', 
            awb_bl_no: 'AWB123456', 
            etd: '2024-01-20',
            eta: '2024-01-25',
            ff_bill_amount: 125000,
            freight_bill_path: 'freight_bill_001.pdf',
            created_at: '2024-01-20T10:00:00Z',
            updated_at: '2024-01-20T10:00:00Z'
          },
          customs_duty: { 
            cd: 50000, rd: 20000, sd: 15000, vat: 30000,
            ait: 10000, at: 5000, atv: 8000, df_vat: 12000,
            total_customs_amount: 150000,
            be_document_path: 'be_doc_001.pdf',
            created_at: '2024-01-26T10:00:00Z',
            updated_at: '2024-01-26T10:00:00Z'
          },
          cnf_agent: { 
            cnf_agent_name: 'BD C&F Services',
            documents_handover_date: '2024-01-27',
            cargo_release_date: '2024-01-28',
            cnf_bill_value: 45000,
            cnf_bill_path: 'cnf_bill_001.pdf',
            commercial_doc_path: 'commercial_001.pdf',
            created_at: '2024-01-27T10:00:00Z',
            updated_at: '2024-01-27T10:00:00Z'
          },
          lc_commission: { 
            lc_commission: 15000,
            vat_on_commission: 2000,
            stamp_charges: 1000,
            other_charges: 3000,
            other_vat: 1000,
            total_cost: 22000,
            created_at: '2024-01-28T10:00:00Z',
            updated_at: '2024-01-28T10:00:00Z'
          },
          bank_interest: { 
            date: '2024-01-29',
            document_no: 'INT-001',
            lc_value_bdt_realised: 5500000,
            interest_amount: 18500,
            document_path: 'interest_001.pdf',
            created_at: '2024-01-29T10:00:00Z',
            updated_at: '2024-01-29T10:00:00Z'
          },
          warehouse: {
            items: [
              {
                serial: '001',
                item_name: 'Chip',
                quantity: 10000,
                no_of_boxes: 5,
                quantity_per_box: 2000,
                missing_quantity: 0,
                challan_path: 'challan_001.pdf',
                created_at: '2024-01-30T10:00:00Z',
                updated_at: '2024-01-30T10:00:00Z'
              }
            ],
            total_items: 1,
            total_quantity: 10000,
            created_at: '2024-01-30T10:00:00Z',
            updated_at: '2024-01-30T10:00:00Z'
          }
        }
      },
      { 
        id: 102, 
        lc_id: 1, 
        shipment_number: 'SH-2024-002', 
        status: 'In Progress', 
        progress: 50, 
        completedSteps: 3,
        stepData: {}
      }
    ]
  },
  {
    id: 2,
    lc_number: 'LC-2024-002',
    lc_issue_date: '2024-01-20',
    bank_name: 'HSBC Bangladesh',
    lc_value_foreign: 75000,
    lc_currency: 'USD',
    lc_value_bdt: 8250000,
    exchange_rate: 110,
    pi_number: 'PI-2024-002',
    pi_date: '2024-01-18',
    quantity: 15000,
    item_description: 'Poker Card Sets',
    status: 'Active',
    insurance_bill_amount: 22500,
    cover_note_number: 'CN-2024-002',
    insurance_company_name: 'Sadharan Bima',
    shipments: [
      { id: 103, lc_id: 2, shipment_number: 'SH-2024-003', status: 'Pending', progress: 0, completedSteps: 0, stepData: {} }
    ]
  }
];

// EMPLOYEE DATA
const INITIAL_EMPLOYEES = [
  {
    id: 1,
    employee_id: 'EMP-001',
    name: 'Mohammad Rahman',
    contact: '01712345678',
    expertise: 'Cutting',
    status: 'Active',
    created_by: 'Admin',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    employee_id: 'EMP-002',
    name: 'Fatima Khatun',
    contact: '01798765432',
    expertise: 'Lamination',
    status: 'Active',
    created_by: 'Admin',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 3,
    employee_id: 'EMP-003',
    name: 'Abdul Karim',
    contact: '01856781234',
    expertise: 'Embedding',
    status: 'Active',
    created_by: 'Admin',
    created_at: '2024-01-16T09:30:00Z',
  },
  {
    id: 4,
    employee_id: 'EMP-004',
    name: 'Ayesha Begum',
    contact: '01923456789',
    expertise: 'Production QC',
    status: 'Active',
    created_by: 'Admin',
    created_at: '2024-01-16T09:30:00Z',
  }
];

// PRODUCTION ASSIGNMENTS FOR TODAY
const getTodayDate = () => new Date().toISOString().split('T')[0];

const INITIAL_PRODUCTION_ASSIGNMENTS = [
  {
    id: 1,
    employee_id: 1,
    assignment_date: getTodayDate(),
    shift: 'Day',
    work_segment: 'Cutting',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    employee_id: 2,
    assignment_date: getTodayDate(),
    shift: 'Day',
    work_segment: 'Lamination',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    employee_id: 3,
    assignment_date: getTodayDate(),
    shift: 'Day',
    work_segment: 'Embedding',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    employee_id: 4,
    assignment_date: getTodayDate(),
    shift: 'Day',
    work_segment: 'Production QC',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// ✅ FIXED: Initialize with pending inbound material from completed shipment
const createInboundMaterialFromShipment = (shipment, lc) => {
  const warehouseData = shipment.stepData?.warehouse;
  if (!warehouseData || !warehouseData.items) return null;

  return {
    id: shipment.id,
    shipment_id: shipment.id,
    lc_id: lc.id,
    shipment_number: shipment.shipment_number,
    lc_number: lc.lc_number,
    item_description: lc.item_description,
    status: 'Pending',
    total_quantity: warehouseData.total_quantity || 0,
    missing_quantity: 0,
    number_of_boxes: warehouseData.items.reduce((sum, item) => sum + (parseInt(item.no_of_boxes) || 0), 0),
    csv_file_name: `${shipment.shipment_number}_warehouse.csv`,
    stepData: shipment.stepData, // ✅ CRITICAL: Preserve all shipment data including warehouse items
    created_at: new Date().toISOString()
  };
};

const INITIAL_INBOUND_MATERIALS = INITIAL_LCS.flatMap(lc =>
  lc.shipments
    .filter(s => {
      const ws = s.stepData?.warehouse?.warehouse_status;
      // Show in inbound list as soon as warehouse is dispatched or already received
      // Fallback: also include old 'Completed' shipments that pre-date the status field
      return s.stepData?.warehouse && (
        ws === 'dispatched' || ws === 'received' ||
        (!ws && s.status === 'Completed')
      );
    })
    .map(s => createInboundMaterialFromShipment(s, lc))
).filter(Boolean);

const INITIAL_BOXES = [];
const INITIAL_SUB_BOXES = [];

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedLC, setSelectedLC] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [selectedSubBox, setSelectedSubBox] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [clientRejections, setClientRejections] = useState([]);
  
  // State
  const [lcs, setLcs] = useState(INITIAL_LCS);
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [productionAssignments, setProductionAssignments] = useState(INITIAL_PRODUCTION_ASSIGNMENTS);
  const [inboundMaterials, setInboundMaterials] = useState(INITIAL_INBOUND_MATERIALS);
  const [boxes, setBoxes] = useState(INITIAL_BOXES);
  const [subBoxes, setSubBoxes] = useState(INITIAL_SUB_BOXES);
  const [productionShifts, setProductionShifts] = useState([]);
  // Add this with other production-related states
const [shiftSummaries, setShiftSummaries] = useState([]);



  // Navigation Handler with shift context support
  const [shiftContext, setShiftContext] = useState(null);

  // Finance state
const [localCosts, setLocalCosts] = useState([]);

// Add near the other useState declarations
const [rosterContext, setRosterContext] = useState(null);

const [selectedSubBoxIdsForChallan, setSelectedSubBoxIdsForChallan] = useState([]);

const [financeData, setFinanceData] = useState({});

const [selectedChallan, setSelectedChallan] = useState(null);
  
  const navigate = (view, lc = null, material = null, employee = null, box = null, subBox = null, context = null) => {
    setCurrentView(view);
    if (lc) setSelectedLC(lc);
    if (material) setSelectedMaterial(material);
    if (employee) setSelectedEmployee(employee);
    if (box) setSelectedBox(box);
    if (subBox) setSelectedSubBox(subBox);
    if (context) setShiftContext(context);
    
    // Handle shipment navigation
    if (view === 'shipment-detail' && material && lc) {
      setSelectedShipment(material);
    }
  };

  // Handle View Shipment from Dashboard
  const handleViewShipment = (lc, shipment) => {
    setSelectedLC(lc);
    setSelectedShipment(shipment);
    setCurrentView('shipment-view');
  };

  // Handle Add Shipment
  const handleAddShipment = (lcId) => {
    const lc = lcs.find(l => l.id === lcId);
    if (!lc) return;

    const newShipmentNumber = `SH-2024-${String(Date.now()).slice(-3)}`;
    const newShipment = {
      id: Date.now(),
      lc_id: lcId,
      shipment_number: newShipmentNumber,
      status: 'Pending',
      progress: 0,
      completedSteps: 0,
      stepData: {}
    };

    const updatedLcs = lcs.map(l => 
      l.id === lcId 
        ? { ...l, shipments: [...l.shipments, newShipment] }
        : l
    );

    setLcs(updatedLcs);
    setSelectedShipment(newShipment);
    navigate('shipment-detail', lc, newShipment);
  };

  // Update Shipment in State
  const updateShipmentInState = (lcId, updatedShipmentData) => {
    setLcs(prevLcs => 
      prevLcs.map(lc => {
        if (lc.id === lcId) {
          const updatedShipments = lc.shipments.map(s => 
            s.id === updatedShipmentData.id 
              ? { ...s, ...updatedShipmentData }
              : s
          );
          return { ...lc, shipments: updatedShipments };
        }
        return lc;
      })
    );

    // Create/update inbound material as soon as warehouse is dispatched
    // (does not require all other steps to be complete)
    const newWS = updatedShipmentData.stepData?.warehouse?.warehouse_status;
    const shouldCreateInbound = updatedShipmentData.stepData?.warehouse && (
      newWS === 'dispatched' || newWS === 'received' ||
      (!newWS && updatedShipmentData.status === 'Completed') // backward compat
    );

    if (shouldCreateInbound) {
      const lc = lcs.find(l => l.id === lcId);
      const newInbound = createInboundMaterialFromShipment(updatedShipmentData, lc);

      if (newInbound) {
        setInboundMaterials(prev => {
          const exists = prev.some(im => im.shipment_id === newInbound.shipment_id);
          if (exists) {
            // Never overwrite a record that has already been received
            return prev.map(im => {
              if (im.shipment_id !== newInbound.shipment_id) return im;
              if (im.status === 'Received') return im;
              return newInbound;
            });
          }
          return [...prev, newInbound];
        });
      }
    }

    setSelectedShipment(updatedShipmentData);
  };

  // Handle Save LC
  const handleSaveLC = (lcData) => {
    if (lcData.id) {
      setLcs(lcs.map(lc => lc.id === lcData.id ? lcData : lc));
    } else {
      const newLC = { ...lcData, id: Date.now(), shipments: [] };
      setLcs([...lcs, newLC]);
    }
    navigate('lc-list');
  };

  // Employee Handlers
  const handleSaveEmployee = (employeeData) => {
    if (employeeData.id) {
      setEmployees(employees.map(emp => emp.id === employeeData.id ? employeeData : emp));
    } else {
      const newEmployee = {
        ...employeeData,
        id: Date.now(),
        created_at: new Date().toISOString()
      };
      setEmployees([...employees, newEmployee]);
    }
    navigate('employee-list');
  };

  const updateEmployeeStatus = (employeeId, newStatus) => {
    setEmployees(employees.map(emp => 
      emp.id === employeeId ? { ...emp, status: newStatus } : emp
    ));
  };

  // const handleSaveAssignments = (assignments) => {
  //   setProductionAssignments(assignments);
  //   navigate('employee-list');
  // };

const handleSaveAssignments = (assignments) => {
  setProductionAssignments(assignments);
  navigate('shift-roster-list');
};


  // Handle Inbound Material Receipt — supports both full and partial (batched) receiving
  const handleSaveInboundMaterial = (receiptData) => {
    const material = inboundMaterials.find(im => im.id === receiptData.material_id);
    if (!material) return;

    const newStatus = receiptData.status || 'Received'; // 'Partially Received' or 'Received'

    // Update inbound material status — preserve received_box_keys for partial flow
    setInboundMaterials(prev => prev.map(im =>
      im.id === receiptData.material_id
        ? {
            ...im,
            status:             newStatus,
            received_by:        receiptData.received_by,
            received_at:        receiptData.received_at,
            item_verifications: receiptData.item_verifications,
            received_box_keys:  receiptData.received_box_keys || {},
          }
        : im
    ));

    // Lock/update warehouse step on parent shipment
    setLcs(prevLcs =>
      prevLcs.map(lc => ({
        ...lc,
        shipments: lc.shipments.map(s => {
          if (s.id !== material.shipment_id) return s;
          return {
            ...s,
            stepData: {
              ...s.stepData,
              warehouse: {
                ...s.stepData?.warehouse,
                warehouse_status: newStatus === 'Received' ? 'received' : 'partially_received',
                received_at: receiptData.received_at,
              }
            }
          };
        })
      }))
    );

    // Create boxes ONLY for this batch (batch_boxes contains only the newly confirmed ones)
    if (receiptData.auto_create_boxes && receiptData.batch_boxes?.length > 0) {
      const newBoxes = receiptData.batch_boxes.map((box, idx) => ({
        id: Date.now() + idx + Math.random(),
        inbound_material_id: material.id,
        shipment_id:         material.shipment_id,
        box_name:            box.box_name,
        item_name:           box.item_name,
        item_type:           box.item_type,
        quantity:            box.quantity,
        missing_qty:         box.missing_qty,
        prod_extra_qty:      box.prod_extra_qty || 0,
        remarks:             box.remarks,
        consumed_quantity:   0,
        remaining_quantity:  null,
        barcode:             box.barcode,
        csv_file_name:       material.csv_file_name,
        status:              'Material In Stock',
        created_by:          receiptData.received_by,
        created_at:          new Date().toISOString(),
        updated_at:          new Date().toISOString(),
      }));
      setBoxes(prev => [...prev, ...newBoxes]);
    }

    // Stay on inbound receiving page if partially received so manager can do next batch
    // if (receiptData.is_partial) {
    //   // Don't navigate — page re-renders with updated receivedBoxKeys from material state
    //   // The InboundReceiving component restores state from material.received_box_keys
    //   return;
    // }

    // navigate('inbound-list');
    return;
  };

  // Box Handlers
  const handleSaveBoxes = (boxesData) => {
    const newBoxes = boxesData.map((box, idx) => ({
      ...box,
      id: Date.now() + idx,
      consumed_quantity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    setBoxes(prev => [...prev, ...newBoxes]);
    navigate('box-list');
  };

  const handleIssueBoxes = (issueData) => {
    // ✅ FIXED: Update boxes with proper issue tracking fields
    const updatedBoxes = boxes.map(box => {
      if (issueData.box_ids.includes(box.id)) {
        return {
          ...box,
          status: 'Material In Production',
          issue_date: issueData.issue_date,           // NEW: Track when issued
          issue_shift: issueData.shift,               // NEW: Track which shift
          issued_by: issueData.issued_by,            // NEW: Track who issued
          issued_at: issueData.issued_at,            // NEW: Track timestamp
          remaining_quantity: box.remaining_quantity || box.quantity, // NEW: For partial consumption tracking
          shift_updated: false,                       // NEW: Needs end-of-shift update
          updated_at: new Date().toISOString()
        };
      }
      return box;
    });

    
    setBoxes(updatedBoxes);

    // Create or update production shift data
    const shiftData = {
      id: Date.now(),
      date: issueData.issue_date,
      shift: issueData.shift,
      employee_ids: productionAssignments
        .filter(a => a.assignment_date === issueData.issue_date && a.shift === issueData.shift)
        .map(a => a.employee_id),
      box_ids: issueData.box_ids,
      boxes_updated: false,
      production_recorded: false,
      created_at: new Date().toISOString()
    };

    setProductionShifts(prev => [...prev, shiftData]);
    navigate('production-floor');
  };

  const handleUpdateShiftData = (shiftId, updates) => {
    setProductionShifts(prev => 
      prev.map(shift => shift.id === shiftId ? { ...shift, ...updates } : shift)
    );
  };

  // Sub-Box Handlers
  // const handleSaveSubBox = (subBoxData) => {
  //   const newSubBox = {
  //     ...subBoxData,
  //     id: Date.now(),
  //     box_id: subBoxData.box_id || null,
  //     created_at: new Date().toISOString()
  //   };

  //   setSubBoxes(prev => [...prev, newSubBox]);
  //   navigate('subbox-list');
  // };

  const handleSaveSubBox = (subBoxData) => {
  const newSubBox = {
    ...subBoxData,
    id: Date.now() + Math.random(), // unique id for each box in bulk
    box_id: subBoxData.box_id || null,
    created_at: new Date().toISOString()
  };
  setSubBoxes(prev => [...prev, newSubBox]);
  // Navigation is handled by BulkPrintModal's onDone (calls onSave per box)
  // After the last box is saved, navigate back
  //navigate('subbox-list');
};

const handleUpdateSubBox = (subBoxId, patch) => {
  setSubBoxes(prev =>
    prev.map(sb => sb.id === subBoxId ? { ...sb, ...patch } : sb)
  );
};

const handleCreateChallan = (selectedIds = []) => {
  // Store selected ids and navigate to challan creation
  setSelectedSubBoxIdsForChallan(selectedIds);
  navigate('create-challan');
};

  const handleSaveClientRejection = (rejectionData) => {
    // Add to rejections
    const newRejection = {
      ...rejectionData,
      id: Date.now()
    };
    setClientRejections(prev => [...prev, newRejection]);

    // Update sub-box rejected count
    setSubBoxes(prev => prev.map(sb => 
      sb.id === rejectionData.sub_box_id 
        ? { 
            ...sb, 
            client_rejected_count: (sb.client_rejected_count || 0) + rejectionData.rejected_quantity 
          }
        : sb
    ));

    navigate('subbox-list');
  };

  // Handle Box Consumption Update from Production Floor
  // const handleUpdateBoxConsumption = (boxId, updateData) => {
  //   setBoxes(prev => prev.map(box => {
  //     if (box.id === boxId) {
  //       const currentRemaining = box.remaining_quantity || box.quantity || 0;
  //       const currentConsumed = box.consumed_quantity || 0;
  //       const newConsumed = updateData.consumed_quantity || 0;
        
  //       return { 
  //         ...box, 
  //         ...updateData,
  //         consumed_quantity: currentConsumed + newConsumed,
  //         remaining_quantity: currentRemaining - newConsumed,
  //         updated_at: new Date().toISOString()
  //       };
  //     }
  //     return box;
  //   }));
  // };

 const handleUpdateBoxConsumption = (boxId, updateData) => {
  setBoxes(prev => prev.map(box => {
    if (box.id !== boxId) return box;
 
    const chip =
      (box.item_type || '').toLowerCase() === 'chip' ||
      (box.item_name || '').toLowerCase() === 'chip';
 
    if (chip) {
      // Apply the signed delta to running totals
      const delta        = parseInt(updateData.consumed_this_update || 0);
      const prevConsumed = box.consumed_quantity || 0;
      const prevRemaining =
        box.remaining_quantity != null
          ? box.remaining_quantity
          : Math.max(0, (box.quantity || 0) - prevConsumed);
 
      const newConsumed   = prevConsumed + delta;
      const newRemaining  = Math.max(0, prevRemaining - delta);
 
      return {
        ...box,
        ...updateData,                              // spreads shiftConsumptionLog, carry_over, remarks
        consumed_quantity:  newConsumed,            // override with computed values
        remaining_quantity: newRemaining,
        status: newRemaining <= 0 ? 'Consumed' : 'Material In Production',
        updated_at: new Date().toISOString(),
      };
    } else {
      // Tape / Sheet — no quantity arithmetic, just apply whatever the floor sent
      return {
        ...box,
        ...updateData,
        updated_at: new Date().toISOString(),
      };
    }
  }));
};

  // Handle Shift Summary Update
  // const handleUpdateShiftSummary = (date, shift, summaryData) => {
  //   const shiftKey = `${date}_${shift}`;
    
  //   setProductionShifts(prev => {
  //     const existing = prev.find(s => s.date === date && s.shift === shift);
      
  //     if (existing) {
  //       return prev.map(s => 
  //         s.date === date && s.shift === shift 
  //           ? { ...s, ...summaryData, updated_at: new Date().toISOString() }
  //           : s
  //       );
  //     } else {
  //       return [...prev, {
  //         id: Date.now(),
  //         date,
  //         shift,
  //         ...summaryData,
  //         created_at: new Date().toISOString()
  //       }];
  //     }
  //   });
  // };

  // Handler for updating shift summaries from Production Floor
const handleUpdateShiftSummary = (date, shift, summaryData) => {
  setShiftSummaries(prev => {
    // Remove existing summary for this date/shift if exists
    const filtered = prev.filter(s => !(s.date === date && s.shift === shift));
    
    // Add new/updated summary
    return [
      ...filtered,
      {
        date,
        shift,
        ...summaryData
      }
    ];
  });
};


// Local Cost Handlers
const handleSaveLocalCost = (costData, isEdit) => {
  if (isEdit) {
    setLocalCosts(prev => prev.map(c => c.id === costData.id ? costData : c));
  } else {
    setLocalCosts(prev => [...prev, costData]);
  }
};

const handleDeleteLocalCost = (costId) => {
  if (window.confirm('Are you sure you want to delete this expense?')) {
    setLocalCosts(prev => prev.filter(c => c.id !== costId));
  }
};

const handleDispatchChallan = (subBoxIds, challanPatch) => {
  setSubBoxes(prev => prev.map(sb =>
    subBoxIds.includes(sb.id) ? { ...sb, ...challanPatch } : sb
  ));
};

const handlePaymentSave = (finKey, payments) => {
  setFinanceData(prev => ({ ...prev, [finKey]: payments }));
};

  const renderContent = () => {
    switch(currentView) {
      case 'dashboard':
        return (
          <AdminDashboard 
            lcs={lcs}
            employees={employees}
            inboundMaterials={inboundMaterials}
            boxes={boxes}
            subBoxes={subBoxes}
            localCosts={localCosts}  
            productionAssignments={productionAssignments}
            onNavigate={navigate}
            onSelectLC={(lc) => navigate('lc-detail', lc)}
            onViewShipment={handleViewShipment}
            onSelectShipment={(lc, shipment) => {
              setSelectedLC(lc);
              setSelectedShipment(shipment);
              navigate('shipment-detail', lc, shipment);
            }}
            onViewAllLCs={() => navigate('lc-list')}
            onViewAllShipments={() => navigate('all-shipments')}
          />
        );
      
      case 'lc-list':
        return (
          <LCList 
            lcs={lcs} 
            onSelectLC={(lc) => navigate('lc-detail', lc)} 
            onEditLC={(lc) => navigate('lc-form', lc)} 
          />
        );
      
      case 'lc-detail':
        return selectedLC ? (
          <LCDetail 
            lc={selectedLC} 
            onBack={() => navigate('lc-list')} 
            onSelectShipment={(shipment) => navigate('shipment-detail', selectedLC, shipment)}
            onAddShipment={handleAddShipment}
          />
        ) : null;
      
      case 'shipment-detail':
        return selectedLC && selectedShipment ? (
          <ShipmentDetail 
            lc={selectedLC} 
            shipment={selectedShipment} 
            onBack={() => navigate('lc-detail', selectedLC)}
            onUpdateShipment={(data) => updateShipmentInState(selectedLC.id, data)}
            onComplete={() => navigate('lc-detail', selectedLC)}
          />
        ) : null;

      case 'shipment-view':
        return selectedLC && selectedShipment ? (
          <ShipmentView 
            lc={selectedLC} 
            shipment={selectedShipment} 
            onBack={() => navigate('dashboard')}
          />
        ) : null;

      case 'all-shipments':
        return (
          <AllShipments 
            lcs={lcs} 
            onSelectLC={(lc) => navigate('lc-detail', lc)}
            onSelectShipment={(lc, shipment) => navigate('shipment-detail', lc, shipment)}
            onViewShipment={handleViewShipment}
          />
        );
        
      case 'lc-form':
        return (
          <LCForm 
            lc={selectedLC} 
            existingLcs={lcs}
            onSave={handleSaveLC} 
            onBack={() => navigate('lc-list')} 
          />
        );

      case 'warehouse':
        return <Warehouse lcs={lcs} />;
      
      case 'reports':
      case 'cost-analysis':
        return <Reports lcs={lcs} />;

      // PRODUCTION VIEWS
      case 'production-dashboard':
        return (
          <ProductionDashboard 
            lcs={lcs}
            employees={employees}
            inboundMaterials={inboundMaterials}
            boxes={boxes}
            subBoxes={subBoxes}
            productionAssignments={productionAssignments}
            onNavigate={navigate}
          />
        );

      case 'employee-list':
        return (
          <EmployeeList 
            employees={employees}
            onAddEmployee={() => { setSelectedEmployee(null); navigate('employee-form'); }}
            onEditEmployee={(emp) => navigate('employee-form', null, null, emp)}
            onUpdateStatus={updateEmployeeStatus}
            onNavigate={navigate}
          />
        );

      case 'employee-form':
        return (
          <EmployeeForm 
            employee={selectedEmployee}
            onSave={handleSaveEmployee}
            onBack={() => navigate('employee-list')}
          />
        );
      
      // case 'shift-assignment':
      //   return (
      //     <ShiftAssignment 
      //       employees={employees}
      //       productionAssignments={productionAssignments}
      //       onSaveAssignments={handleSaveAssignments}
      //       onBack={() => navigate('employee-list')}
      //     />
      //   );

      case 'shift-roster-list':
  return (
    <ShiftRosterList
      productionAssignments={productionAssignments}
      employees={employees}
      onCreateRoster={() => navigate('shift-assignment')}
      onEditRoster={(roster) => {
         setRosterContext({ date: roster.date, shift: roster.shift });
  navigate('shift-assignment');
        
      }}
    />
  );

case 'shift-assignment':
  return (
    <ShiftAssignment 
      employees={employees}
      productionAssignments={productionAssignments}
      initialDate={rosterContext?.date}
      initialShift={rosterContext?.shift}
      onSaveAssignments={handleSaveAssignments}
      onBack={() => { setRosterContext(null); navigate('shift-roster-list'); }}
    />
  );

      // ✅ FIXED: Inbound Materials with proper view details handler
      case 'inbound-list':
        return (
          <InboundMaterialsList 
            lcs={lcs}
            inboundMaterials={inboundMaterials}
            onReceiveMaterial={(material) => navigate('inbound-receiving', null, material)}
            onViewDetails={(material) => {
              navigate('inbound-shipment-boxes', null, material);
            }}
          />
        );

      // ✅ FIXED: Inbound Receiving with proper LC data
      // case 'inbound-receiving':
      //   return selectedMaterial ? (
      //     <InboundReceiving 
      //       material={selectedMaterial}
      //       lc={lcs.find(l => l.id === selectedMaterial.lc_id)}
      //       onSave={handleSaveInboundMaterial}
      //       onBack={() => navigate('inbound-list')}
      //     />
      //   ) : null;


        case 'inbound-receiving':
        return selectedMaterial ? (
          <InboundReceiving 
            material={selectedMaterial}
            lc={lcs.find(l => l.id === selectedMaterial.lc_id)}
            onSave={handleSaveInboundMaterial}
            onBack={() => navigate('inbound-list')}
            onComplete={() => navigate('inbound-list')}
          />
        ) : null;

      case 'inbound-shipment-boxes':
        return selectedMaterial ? (
          <InboundShipmentBoxes
            material={selectedMaterial}
            lcs={lcs}
            boxes={boxes}
            onBack={() => navigate('inbound-list')}
          />
        ) : null;
      
      case 'box-list':
  return (
    <BoxList 
      boxes={boxes}
      inboundMaterials={inboundMaterials}
      lcs={lcs}                          // ← ADD THIS LINE
      onViewBox={(box) => navigate('box-detail', null, null, null, box)}
      onIssueToProduction={() => navigate('production-issue')}
    />
  );

      case 'box-creation':
        return (
          <BoxCreation 
            inboundMaterials={inboundMaterials}
            onSave={handleSaveBoxes}
            onBack={() => navigate('box-list')}
          />
        );

      case 'box-detail':
        return selectedBox ? (
          <BoxDetail 
            box={selectedBox}
            inboundMaterial={inboundMaterials.find(im => im.id === selectedBox.inbound_material_id)}
            lcs={lcs}  
            onBack={() => navigate('box-list')}
          />
        ) : null;

      case 'production-issue':
        return (
          <ProductionIssue 
            boxes={boxes}
            employees={employees}
            productionAssignments={productionAssignments}
            onIssueBoxes={handleIssueBoxes}
            onBack={() => navigate('box-list')}
          />
        );

      // REMOVED: Duplicate production-floor case - kept the complete one below at line 909

      // case 'subbox-list':
      //   return (
      //     <SubBoxList 
      //       subBoxes={subBoxes}
      //       boxes={boxes}
      //       onCreateSubBox={() => navigate('subbox-creation')}
      //       onViewSubBox={(subBox) => navigate('subbox-detail', null, null, null, null, subBox)}
      //       onRecordRejection={(subBox) => navigate('client-rejection', null, null, null, null, subBox)}
      //       onNavigate={navigate}
      //     />
      //   );

      case 'subbox-list':
  return (
    <SubBoxList 
      subBoxes={subBoxes}
      boxes={boxes}
      onCreateSubBox={() => navigate('subbox-creation')}
      onViewSubBox={(subBox) => navigate('subbox-detail', null, null, null, null, subBox)}
      onRecordRejection={(subBox) => navigate('client-rejection', null, null, null, null, subBox)}
      onNavigate={navigate}
      onCreateChallan={handleCreateChallan}
    />
  );

  case 'create-challan':
  return (
    <CreateChallan
      subBoxes={subBoxes}
      preSelectedIds={selectedSubBoxIdsForChallan}
      onBack={() => navigate('subbox-list')}
      onDispatch={handleDispatchChallan}
    />
  );

      // case 'subbox-creation':
      //   return (
      //     <SubBoxCreation 
      //       boxes={boxes}
      //       employees={employees}
      //       productionAssignments={productionAssignments}
      //       onSave={handleSaveSubBox}
      //       onBack={() => navigate('subbox-list')}
      //     />
      //   );
case 'subbox-creation':
  return (
    <SubBoxCreation
      onSave={handleSaveSubBox}
      onUpdateSubBox={handleUpdateSubBox}
      onBack={() => navigate('subbox-list')}
      subBoxes={subBoxes}
      shiftSummaries={shiftSummaries}
    />
  );
      case 'client-rejection':
        return selectedSubBox ? (
          <ClientRejection 
            subBox={selectedSubBox}
            box={boxes.find(b => b.id === selectedSubBox.box_id)}
            onSave={handleSaveClientRejection}
            onBack={() => navigate('subbox-list')}
          />
        ) : null;

      case 'subbox-detail':
        return selectedSubBox ? (
          <SubBoxDetail 
            subBox={selectedSubBox}
            box={boxes.find(b => b.id === selectedSubBox.box_id)}
            boxes={boxes}                        // ← ADD THIS
            lcs={lcs}                        // ← ADD
            inboundMaterials={inboundMaterials}  // ← ADD
            clientRejections={clientRejections}
            onBack={() => navigate('subbox-list')}
          />
        ) : null;

        // In renderContent switch, add:
case 'production':
  return (
    <Production
      productionShifts={productionShifts}
      subBoxes={subBoxes}
      productionAssignments={productionAssignments}
      employees={employees}
      shiftSummaries={shiftSummaries}  // VERIFY THIS EXISTS
      onNavigate={navigate}
    />
  );

case 'production-floor':
  return (
    <ProductionFloor 
      boxes={boxes}
      productionAssignments={productionAssignments}
      employees={employees}
      productionShifts={productionShifts}
      shiftContext={shiftContext}
      shiftSummaries={shiftSummaries}  // ADD THIS LINE
      onUpdateBoxConsumption={handleUpdateBoxConsumption}
      onUpdateShiftSummary={handleUpdateShiftSummary}  // ADD THIS LINE
      onNavigate={navigate}
    />
  );


  case 'finance-dashboard':
  return (
    <FinanceDashboard
      lcs={lcs}
      localCosts={localCosts}
      subBoxes={subBoxes}
      onNavigate={navigate}
    />
  );

  case 'landing-cost':
  return (
    <LandingCost
      lcs={lcs}
      financeData={financeData}
      onPaymentSave={handlePaymentSave}
    />
  );

case 'local-costs':
  return (
    <LocalCosts
      localCosts={localCosts}
      onSave={handleSaveLocalCost}
      onDelete={handleDeleteLocalCost}
      onBack={() => navigate('finance-dashboard')}
    />
  );



case 'profitability':
  return (
    <ProfitabilityAnalysis
      lcs={lcs}
      localCosts={localCosts}
      subBoxes={subBoxes}
      sales={sales} // You'll need to add this
      onNavigate={navigate}
    />
  );
  case 'cost-reports':
  return (
    <CostReports
      lcs={lcs}
      localCosts={localCosts}
      subBoxes={subBoxes}
      onNavigate={navigate}
    />
  );

  case 'delivered-goods':
  return (
    <DeliveredGoods
      subBoxes={subBoxes}
      onViewChallan={(challan) => {
        setSelectedChallan(challan);
        navigate('challan-detail');
      }}
    />
  );

case 'challan-detail':
  return selectedChallan ? (
    <ChallanDetail
      challan={selectedChallan}
      onBack={() => navigate('delivered-goods')}
    />
  ) : null;


      default:
        return <Dashboard lcs={lcs} onSelectLC={(lc) => navigate('lc-detail', lc)} />;
    }
  };

  return (
    <Sidebar currentView={currentView} setCurrentView={navigate}>
      {renderContent()}
    </Sidebar>
  );
}

export default App;
