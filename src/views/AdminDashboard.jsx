import { useState, useMemo } from 'react';
import {
  DollarSign, Ship, Package, Factory, Users, AlertTriangle,
  CheckCircle, Clock, TrendingUp, Activity,
  Layers, Box, BarChart3, Target,
  FileText, Inbox, AlertCircle, ChevronRight, Calendar,
  ChevronDown, Hash, Receipt, Truck
} from 'lucide-react';

// ── Mini progress bar ─────────────────────────────────────────────────────────
const MiniBar = ({ value, max, color }) => (
  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
    <div className={`h-full rounded-full transition-all ${color}`}
      style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
  </div>
);

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon: Icon, iconBg, iconColor, accent }) => (
  <div className={`bg-white rounded-xl border ${accent || 'border-gray-200'} p-5 flex flex-col gap-3`}>
    <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, icon: Icon, iconBg, iconColor, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2.5">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

// ── Status pill ───────────────────────────────────────────────────────────────
const Pill = ({ label, color }) => {
  const cls = { green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-600', blue: 'bg-blue-100 text-blue-700', gray: 'bg-gray-100 text-gray-600' }[color] || 'bg-gray-100 text-gray-600';
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
};

const NavLink = ({ label, onClick }) => (
  <button onClick={onClick} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
    {label} <ChevronRight className="w-3.5 h-3.5" />
  </button>
);

const fmt = (n) => n >= 1_000_000 ? `৳${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `৳${(n / 1_000).toFixed(0)}K` : `৳${n}`;

// ═════════════════════════════════════════════════════════════════════════════
const AdminDashboard = ({
  lcs = [],
  employees = [],
  inboundMaterials = [],
  boxes = [],
  subBoxes = [],
  productionAssignments = [],
  localCosts = [],
  onNavigate,
}) => {

  const [chartFilter, setChartFilter] = useState('daily_7');

  // ── PROCUREMENT ──────────────────────────────────────────────────────────
  const allShipments   = lcs.flatMap(lc => lc.shipments);
  const completedShip  = allShipments.filter(s => s.status === 'Completed');
  const inProgressShip = allShipments.filter(s => s.status === 'In Progress');
  const pendingShip    = allShipments.filter(s => s.status === 'Pending');

  const activeLCs        = lcs.filter(lc => lc.status === 'Active');
  const totalLCValue     = lcs.reduce((s, lc) => s + (lc.lc_value_bdt || 0), 0);
  const activeShipments  = activeLCs.flatMap(lc => lc.shipments);
  const activeCompleted  = activeShipments.filter(s => s.status === 'Completed').length;
  const activeInProgress = activeShipments.filter(s => s.status === 'In Progress').length;
  const activePending    = activeShipments.filter(s => s.status === 'Pending').length;

  const totalReceivedQty = completedShip.reduce((s, sh) => s + (sh.stepData?.warehouse?.total_quantity || 0), 0);

  const calcShipCosts = (sh) => {
    const sd = sh.stepData || {};
    return (sd.freight_forwarder?.ff_bill_amount || 0) + (sd.customs_duty?.total_customs_amount || 0) +
           (sd.cnf_agent?.cnf_bill_value || 0) + (sd.lc_commission?.total_cost || 0) + (sd.bank_interest?.interest_amount || 0);
  };
  const totalProcCost    = allShipments.reduce((s, sh) => s + calcShipCosts(sh), 0);
  const insuranceCost    = lcs.reduce((s, lc) => s + (lc.insurance_bill_amount || 0), 0);
  const totalLandingCost = totalProcCost + insuranceCost;

  const customsCost    = allShipments.reduce((s, sh) => s + (sh.stepData?.customs_duty?.total_customs_amount || 0), 0);
  const freightCost    = allShipments.reduce((s, sh) => s + (sh.stepData?.freight_forwarder?.ff_bill_amount || 0), 0);
  const cnfCost        = allShipments.reduce((s, sh) => s + (sh.stepData?.cnf_agent?.cnf_bill_value || 0), 0);
  const commissionCost = allShipments.reduce((s, sh) => s + (sh.stepData?.lc_commission?.total_cost || 0), 0);
  const interestCost   = allShipments.reduce((s, sh) => s + (sh.stepData?.bank_interest?.interest_amount || 0), 0);

  const shipRate = allShipments.length > 0 ? Math.round((completedShip.length / allShipments.length) * 100) : 0;

  const recentLCs = [...lcs].sort((a, b) => new Date(b.lc_issue_date) - new Date(a.lc_issue_date)).slice(0, 5);

  // ── LOCAL COSTS ──────────────────────────────────────────────────────────
  const totalLocalCost  = localCosts.reduce((s, c) => s + (c.total_amount || 0), 0);
  const localByCategory = localCosts.reduce((acc, c) => {
    const cat = c.category || 'Other';
    acc[cat] = (acc[cat] || 0) + (c.total_amount || 0);
    return acc;
  }, {});

  // ── PRODUCTION ───────────────────────────────────────────────────────────
  const totalProduced  = subBoxes.reduce((s, sb) => s + (sb.quantity || 0), 0);
  const totalGood      = subBoxes.filter(sb => sb.output_type === 'Good/ QC Approved').reduce((s, sb) => s + (sb.quantity || 0), 0);
  const totalWastage   = subBoxes.filter(sb => sb.output_type === 'Wastage').reduce((s, sb) => s + (sb.quantity || 0), 0);
  const totalRejected  = subBoxes.reduce((s, sb) => s + (sb.client_rejected_count || 0), 0);
  const wastageRate    = totalProduced > 0 ? ((totalWastage / totalProduced) * 100).toFixed(1) : '0.0';
  const rejectionRate  = totalGood > 0     ? ((totalRejected / totalGood) * 100).toFixed(1)    : '0.0';
  const qualityRate    = totalProduced > 0 ? ((totalGood / totalProduced) * 100).toFixed(1)    : '0.0';
  const dayOutput      = subBoxes.filter(sb => sb.shift === 'Day').reduce((s, sb) => s + (sb.quantity || 0), 0);
  const nightOutput    = subBoxes.filter(sb => sb.shift === 'Night').reduce((s, sb) => s + (sb.quantity || 0), 0);

  // ── COMBINED COST PER UNIT ────────────────────────────────────────────────
  const landingCPU = totalReceivedQty > 0 ? totalLandingCost / totalReceivedQty : 0;
  const localCPU   = totalProduced > 0    ? totalLocalCost   / totalProduced    : 0;
  const totalCPU   = landingCPU + localCPU;

  // ── INBOUND ───────────────────────────────────────────────────────────────
  const pendingInbound  = inboundMaterials.filter(im => im.status === 'Pending').length;
  const partialInbound  = inboundMaterials.filter(im => im.status === 'Partially Received').length;
  const receivedInbound = inboundMaterials.filter(im => im.status === 'Received').length;

  // ── BOXES ─────────────────────────────────────────────────────────────────
  const totalBoxes    = boxes.length;
  const boxesInStock  = boxes.filter(b => b.status === 'Material In Stock').length;
  const boxesInProd   = boxes.filter(b => b.status === 'Material In Production').length;
  const boxesConsumed = boxes.filter(b => b.status === 'Consumed').length;
  const chipBoxes     = boxes.filter(b => (b.item_type || b.item_name || '').toLowerCase().includes('chip'));
  const tapeBoxes     = boxes.filter(b => (b.item_type || b.item_name || '').toLowerCase().includes('tape'));
  const sheetBoxes    = boxes.filter(b => (b.item_type || b.item_name || '').toLowerCase().includes('sheet'));
  const chipStock     = chipBoxes.filter(b => b.status !== 'Consumed').reduce((s, b) => s + Math.max(0, (b.quantity || 0) - (b.consumed_quantity || 0)), 0);

  // ── CHART DATA ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const now = new Date();
    if (chartFilter === 'daily_7') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() - (6 - i));
        const ds = d.toISOString().split('T')[0];
        return {
          label: i === 6 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
          good:  subBoxes.filter(sb => sb.production_date === ds && sb.output_type === 'Good/ QC Approved').reduce((s, sb) => s + (sb.quantity || 0), 0),
          waste: subBoxes.filter(sb => sb.production_date === ds && sb.output_type === 'Wastage').reduce((s, sb) => s + (sb.quantity || 0), 0),
        };
      });
    }
    if (chartFilter === 'weekly_7') {
      return Array.from({ length: 7 }, (_, i) => {
        const wEnd = new Date(now); wEnd.setDate(wEnd.getDate() - (6 - i) * 7);
        const wStart = new Date(wEnd); wStart.setDate(wStart.getDate() - 6);
        const inRange = (sb) => { const d = new Date(sb.production_date); return d >= wStart && d <= wEnd; };
        return {
          label: `W${i + 1}`,
          good:  subBoxes.filter(sb => inRange(sb) && sb.output_type === 'Good/ QC Approved').reduce((s, sb) => s + (sb.quantity || 0), 0),
          waste: subBoxes.filter(sb => inRange(sb) && sb.output_type === 'Wastage').reduce((s, sb) => s + (sb.quantity || 0), 0),
        };
      });
    }
    // monthly_6
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        good:  subBoxes.filter(sb => sb.production_date?.startsWith(ym) && sb.output_type === 'Good/ QC Approved').reduce((s, sb) => s + (sb.quantity || 0), 0),
        waste: subBoxes.filter(sb => sb.production_date?.startsWith(ym) && sb.output_type === 'Wastage').reduce((s, sb) => s + (sb.quantity || 0), 0),
      };
    });
  }, [chartFilter, subBoxes]);

  const maxBar = Math.max(...chartData.map(d => d.good + d.waste), 1);

  // ── EMPLOYEES ─────────────────────────────────────────────────────────────
  const activeEmp  = employees.filter(e => e.status === 'Active').length;
  const inactiveEmp = employees.filter(e => e.status === 'Inactive').length;
  const today      = new Date().toISOString().split('T')[0];
  const dayShift   = new Set(productionAssignments.filter(a => a.assignment_date === today && a.shift === 'Day').map(a => a.employee_id)).size;
  const nightShift = new Set(productionAssignments.filter(a => a.assignment_date === today && a.shift === 'Night').map(a => a.employee_id)).size;
  const onShift    = dayShift + nightShift;
  const expertiseCount = employees.reduce((acc, e) => { acc[e.expertise] = (acc[e.expertise] || 0) + 1; return acc; }, {});

  // ── ALERTS ────────────────────────────────────────────────────────────────
  const alerts = [];
  if (parseFloat(wastageRate) > 5)          alerts.push({ type: 'red',   icon: AlertTriangle, msg: `Wastage ${wastageRate}% — exceeds 5% threshold` });
  if (pendingInbound > 0)                   alerts.push({ type: 'amber', icon: Inbox,         msg: `${pendingInbound} inbound shipment${pendingInbound > 1 ? 's' : ''} awaiting receipt` });
  if (pendingShip.length > 0)               alerts.push({ type: 'amber', icon: Ship,          msg: `${pendingShip.length} shipment${pendingShip.length > 1 ? 's' : ''} pending` });
  if (chipStock === 0 && totalBoxes > 0)    alerts.push({ type: 'red',   icon: AlertCircle,   msg: 'No chip stock remaining — production at risk' });
  if (onShift === 0 && activeEmp > 0)       alerts.push({ type: 'amber', icon: Users,         msg: 'No employees assigned to today\'s shifts' });
  if (alerts.length === 0)                  alerts.push({ type: 'green', icon: CheckCircle,   msg: 'All systems operational — no critical issues detected' });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Procurement · Production · Workforce · Finance</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5" />
          {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* ALERTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alerts.map((a, i) => {
          const Icon = a.icon;
          const s  = { red: 'bg-red-50 border-red-200 text-red-800', amber: 'bg-amber-50 border-amber-200 text-amber-800', green: 'bg-emerald-50 border-emerald-200 text-emerald-800' };
          const ic = { red: 'text-red-500', amber: 'text-amber-500', green: 'text-emerald-500' };
          return (
            <div key={i} className={`flex items-center gap-2.5 px-4 py-2.5 border rounded-xl text-sm font-medium ${s[a.type]}`}>
              <Icon className={`w-4 h-4 shrink-0 ${ic[a.type]}`} />{a.msg}
            </div>
          );
        })}
      </div>

      {/* ══ ROW 1 KPIs — FINANCIAL ══ */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Financial Overview</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard label="Total LC Value"     value={fmt(totalLCValue)}         sub={`${activeLCs.length} active LCs`}       icon={DollarSign}  iconBg="bg-blue-50"    iconColor="text-blue-600" />
          <KpiCard label="Total Landing Cost" value={fmt(totalLandingCost)}     sub={`${completedShip.length} shipments`}    icon={Truck}       iconBg="bg-indigo-50"  iconColor="text-indigo-600" />
          <KpiCard label="Total Local Cost"   value={fmt(totalLocalCost)}       sub={`${localCosts.length} expense entries`} icon={Receipt}     iconBg="bg-purple-50"  iconColor="text-purple-600" />
          <KpiCard label="Avg Cost Per Unit"  value={`৳${totalCPU.toFixed(2)}`} sub="Landing + Local combined"              icon={Hash}        iconBg="bg-teal-50"    iconColor="text-teal-600" />
          <KpiCard label="Units Received"     value={totalReceivedQty.toLocaleString()} sub={`৳${landingCPU.toFixed(2)} landing/unit`} icon={Package} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        </div>
      </div>

      {/* ══ ROW 2 KPIs — PRODUCTION ══ */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Production Output</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KpiCard label="Total Produced"  value={totalProduced.toLocaleString()}  sub={`From ${subBoxes.length} sub-boxes`}        icon={Factory}       iconBg="bg-gray-50"    iconColor="text-gray-600" />
          <KpiCard label="Good Output"     value={totalGood.toLocaleString()}      sub={`${qualityRate}% quality rate`}              icon={CheckCircle}   iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <KpiCard label="Wastage Rate"    value={`${wastageRate}%`}               sub={`${totalWastage.toLocaleString()} units`}   icon={Target}        iconBg={parseFloat(wastageRate) > 5 ? 'bg-red-50' : 'bg-emerald-50'} iconColor={parseFloat(wastageRate) > 5 ? 'text-red-500' : 'text-emerald-600'} accent={parseFloat(wastageRate) > 5 ? 'border-red-200' : undefined} />
          <KpiCard label="Wastage Units"   value={totalWastage.toLocaleString()}   sub={`${wastageRate}% of production`}            icon={Activity}      iconBg="bg-orange-50"  iconColor="text-orange-500" />
          <KpiCard label="Client Rejected" value={totalRejected.toLocaleString()}  sub={`${rejectionRate}% rejection rate`}         icon={AlertTriangle} iconBg="bg-red-50"     iconColor="text-red-500" />
        </div>
      </div>

      {/* ══ PROCUREMENT STATUS + MATERIAL STOCK ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Procurement */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Procurement Status" subtitle="Active LCs, shipment pipeline & recent LCs"
            icon={Ship} iconBg="bg-blue-50" iconColor="text-blue-600"
            action={<NavLink label="All LCs" onClick={() => onNavigate('lc-list')} />}
          />

          {/* Active LC summary */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{activeLCs.length}</p>
              <p className="text-xs text-blue-600 mt-0.5">Active LCs</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">{activePending}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pending Ships</p>
            </div>
            <div className={`border rounded-xl p-3 text-center ${activeInProgress > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-2xl font-bold ${activeInProgress > 0 ? 'text-amber-700' : 'text-gray-300'}`}>{activeInProgress}</p>
              <p className={`text-xs mt-0.5 ${activeInProgress > 0 ? 'text-amber-600' : 'text-gray-400'}`}>In Progress</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{activeCompleted}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Completed</p>
            </div>
          </div>

          {/* Overall completion */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-500 font-medium">Overall shipment completion</span>
              <span className="font-bold text-gray-900">{shipRate}% &nbsp;({completedShip.length} of {allShipments.length})</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${shipRate}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{totalReceivedQty.toLocaleString()} units received across all completed shipments</p>
          </div>

          {/* Recent LCs — clear progress layout */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Letters of Credit</p>
              <button onClick={() => onNavigate('all-shipments')} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                All Shipments <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {recentLCs.length > 0 ? recentLCs.map(lc => {
                const total = lc.shipments.length;
                const done  = lc.shipments.filter(s => s.status === 'Completed').length;
                const inP   = lc.shipments.filter(s => s.status === 'In Progress').length;
                const pend  = lc.shipments.filter(s => s.status === 'Pending').length;
                const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={lc.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{lc.lc_number}</p>
                        <Pill label={lc.status} color={lc.status === 'Active' ? 'green' : lc.status === 'Draft' ? 'amber' : 'gray'} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{lc.lc_currency} {(lc.lc_value_foreign || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-xs">
                        {done > 0    && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-semibold">{done} done</span>}
                        {inP > 0     && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">{inP} active</span>}
                        {pend > 0    && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-semibold">{pend} pending</span>}
                        <span className="text-gray-400">/ {total}</span>
                        <span className="font-bold text-gray-700">{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-xs text-gray-400 text-center py-5">No LCs created yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Material Stock */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
          <SectionHeader title="Material Stock" subtitle="Boxes by type & lifecycle"
            icon={Box} iconBg="bg-purple-50" iconColor="text-purple-600"
            action={<NavLink label="All Boxes" onClick={() => onNavigate('box-list')} />}
          />
          <div className="space-y-3">
            {[
              { label: 'Chip',  bxs: chipBoxes,  extra: chipStock > 0 ? `${chipStock.toLocaleString()} units` : null, bar: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-800'    },
              { label: 'Tape',  bxs: tapeBoxes,  extra: null,                                                          bar: 'bg-purple-500',  badge: 'bg-purple-100 text-purple-800' },
              { label: 'Sheet', bxs: sheetBoxes, extra: null,                                                          bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
            ].map(({ label, bxs, extra, bar, badge }) => {
              const active = bxs.filter(b => b.status !== 'Consumed').length;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${bar}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-800">{label}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{active} boxes{extra ? ` · ${extra}` : ''}</span>
                    </div>
                    <MiniBar value={active} max={Math.max(totalBoxes, 1)} color={bar} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Box Lifecycle</p>
            <div className="space-y-2">
              {[{ label: 'In Stock', v: boxesInStock, color: 'bg-emerald-500' }, { label: 'In Production', v: boxesInProd, color: 'bg-blue-500' }, { label: 'Consumed', v: boxesConsumed, color: 'bg-gray-300' }].map(({ label, v, color }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-gray-600 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${totalBoxes > 0 ? (v / totalBoxes) * 100 : 0}%` }} />
                  </div>
                  <span className="w-6 text-right font-semibold text-gray-700">{v}</span>
                </div>
              ))}
            </div>
          </div>
          {(pendingInbound + partialInbound) > 0 && (
            <button onClick={() => onNavigate('inbound-list')}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-amber-800">{pendingInbound + partialInbound} inbound pending receipt</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-600" />
            </button>
          )}
        </div>
      </div>

      {/* ══ PRODUCTION CHART + QUALITY ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Production chart with dropdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Production Output" subtitle="Good output vs wastage over selected period"
            icon={BarChart3} iconBg="bg-emerald-50" iconColor="text-emerald-600"
            action={
              <div className="relative">
                <select value={chartFilter} onChange={(e) => setChartFilter(e.target.value)}
                  className="appearance-none pr-7 pl-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer">
                  <option value="daily_7">Last 7 Days</option>
                  <option value="weekly_7">Last 7 Weeks</option>
                  <option value="monthly_6">Last 6 Months</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            }
          />

          {totalProduced > 0 ? (
            <div className="flex items-end gap-1.5" style={{ height: 140 }}>
              {chartData.map((d, i) => {
                const total  = d.good + d.waste;
                const goodH  = maxBar > 0 ? Math.round((d.good  / maxBar) * 100) : 0;
                const wasteH = maxBar > 0 ? Math.round((d.waste / maxBar) * 100) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {total > 0 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                        <div className="text-emerald-300">Good: {d.good.toLocaleString()}</div>
                        <div className="text-red-300">Waste: {d.waste.toLocaleString()}</div>
                      </div>
                    )}
                    <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: 108 }}>
                      {d.waste > 0 && <div className="w-full bg-red-300 hover:bg-red-400 rounded-t-sm transition-colors" style={{ height: `${wasteH}%`, minHeight: 3 }} />}
                      {d.good  > 0 && <div className="w-full bg-emerald-400 hover:bg-emerald-500 rounded-t-sm transition-colors" style={{ height: `${goodH}%`, minHeight: 3 }} />}
                      {total   === 0 && <div className="w-full h-0.5 bg-gray-100 rounded" />}
                    </div>
                    <span className="text-xs text-gray-400 truncate max-w-full text-center">{d.label}</span>
                    {total > 0 && <span className="text-xs font-semibold text-gray-600">{total >= 1000 ? `${(total / 1000).toFixed(0)}k` : total}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-gray-300">
              <div className="text-center"><BarChart3 className="w-10 h-10 mx-auto mb-2" /><p className="text-xs">No production data yet</p></div>
            </div>
          )}

          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /><span className="text-xs text-gray-500">Good / QC Approved</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-300" /><span className="text-xs text-gray-500">Wastage</span></div>
          </div>

          <div className="grid grid-cols-4 gap-3 mt-3">
            {[
              { label: 'Total Produced', value: totalProduced.toLocaleString(),  color: 'text-gray-900'    },
              { label: 'Good Units',      value: totalGood.toLocaleString(),     color: 'text-emerald-700' },
              { label: 'Wastage Units',   value: totalWastage.toLocaleString(),  color: 'text-red-600'     },
              { label: 'Client Rejected', value: totalRejected.toLocaleString(), color: 'text-orange-600'  },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Quality Overview" subtitle="Output quality breakdown"
            icon={Target} iconBg="bg-orange-50" iconColor="text-orange-500" />
          <div className="flex items-center justify-center my-3">
            <div className="relative" style={{ width: 136, height: 136 }}>
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#f3f4f6" strokeWidth="16" />
                {totalProduced > 0 && (
                  <>
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="16"
                      strokeDasharray={`${(totalGood / totalProduced) * 238.6} 238.6`} />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#f87171" strokeWidth="16"
                      strokeDasharray={`${(totalWastage / totalProduced) * 238.6} 238.6`}
                      strokeDashoffset={`-${(totalGood / totalProduced) * 238.6}`} />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#fb923c" strokeWidth="16"
                      strokeDasharray={`${(totalRejected / totalProduced) * 238.6} 238.6`}
                      strokeDashoffset={`-${((totalGood + totalWastage) / totalProduced) * 238.6}`} />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xl font-bold text-gray-900">{qualityRate}%</p>
                <p className="text-xs text-gray-400">quality</p>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Good / QC Approved', v: totalGood,     pct: qualityRate,   dot: 'bg-emerald-500', t: 'text-emerald-700' },
              { label: 'Wastage',             v: totalWastage,  pct: wastageRate,   dot: 'bg-red-400',     t: 'text-red-600'    },
              { label: 'Client Rejected',     v: totalRejected, pct: rejectionRate, dot: 'bg-orange-400',  t: 'text-orange-600' },
            ].map(({ label, v, pct, dot, t }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${dot}`} /><span className="text-xs text-gray-600">{label}</span></div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${t}`}>{v.toLocaleString()}</span>
                  <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">Cumulative Shift Output</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-amber-900">{dayOutput.toLocaleString()}</p>
                <p className="text-xs text-amber-600 mt-0.5">☀ Day Shift</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-indigo-900">{nightOutput.toLocaleString()}</p>
                <p className="text-xs text-indigo-600 mt-0.5">☽ Night Shift</p>
              </div>
            </div>
          </div>
          <button onClick={() => onNavigate('subbox-list')}
            className="mt-3 w-full flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-xs hover:bg-emerald-100 transition-colors">
            <span className="font-semibold text-emerald-800">View Finished Goods</span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* ══ LANDING COST + LOCAL COST — side by side ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Landing Cost */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Landing Cost Breakdown" subtitle="Per shipment cost components"
            icon={Truck} iconBg="bg-indigo-50" iconColor="text-indigo-600"
            action={<NavLink label="Finance" onClick={() => onNavigate('finance-dashboard')} />}
          />
          <div className="space-y-2.5">
            {[
              { label: 'LC Value (BDT)', value: totalLCValue,    color: 'bg-blue-500'   },
              { label: 'Customs Duty',   value: customsCost,     color: 'bg-purple-500' },
              { label: 'Freight',        value: freightCost,     color: 'bg-green-500'  },
              { label: 'C&F Agent',      value: cnfCost,         color: 'bg-yellow-400' },
              { label: 'Insurance',      value: insuranceCost,   color: 'bg-teal-500'   },
              { label: 'LC Commission',  value: commissionCost,  color: 'bg-pink-400'   },
              { label: 'Bank Interest',  value: interestCost,    color: 'bg-orange-400' },
            ].filter(i => i.value > 0).map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-28 text-xs text-gray-600 shrink-0 truncate">{label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${totalLandingCost > 0 ? Math.min(100, (value / totalLandingCost) * 100) : 0}%` }} />
                </div>
                <span className="w-20 text-right text-xs font-semibold text-gray-700 shrink-0">{fmt(value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">Total Landing Cost</span>
            <span className="text-base font-bold text-indigo-700">{fmt(totalLandingCost)}</span>
          </div>
          <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-600">Landing Cost / Unit Received</p>
              <p className="text-xl font-bold text-indigo-900">৳{landingCPU.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-indigo-600">Units Received</p>
              <p className="text-sm font-bold text-indigo-900">{totalReceivedQty.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Local Costs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Local Cost Breakdown" subtitle="Operational expenses by category"
            icon={Receipt} iconBg="bg-purple-50" iconColor="text-purple-600"
            action={<NavLink label="Manage" onClick={() => onNavigate('local-costs')} />}
          />
          {Object.keys(localByCategory).length > 0 ? (
            <>
              <div className="space-y-2.5">
                {Object.entries(localByCategory).sort(([, a], [, b]) => b - a).map(([cat, value]) => {
                  const catColors = { 'Rent': 'bg-blue-500', 'Electricity': 'bg-yellow-400', 'Transport': 'bg-green-500', 'WiFi/Internet': 'bg-violet-500', 'Salaries': 'bg-red-500', 'Maintenance': 'bg-orange-400', 'Raw Materials': 'bg-indigo-500', 'Other': 'bg-gray-400' };
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-gray-600 shrink-0 truncate">{cat}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${catColors[cat] || 'bg-gray-400'}`} style={{ width: `${totalLocalCost > 0 ? Math.min(100, (value / totalLocalCost) * 100) : 0}%` }} />
                      </div>
                      <span className="w-20 text-right text-xs font-semibold text-gray-700 shrink-0">{fmt(value)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">Total Local Cost</span>
                <span className="text-base font-bold text-purple-700">{fmt(totalLocalCost)}</span>
              </div>
              <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600">Local Cost / Unit Produced</p>
                  <p className="text-xl font-bold text-purple-900">৳{localCPU.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-600">Units Produced</p>
                  <p className="text-sm font-bold text-purple-900">{totalProduced.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-3 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal-600 font-semibold">Combined Cost / Unit</p>
                  <p className="text-xl font-bold text-teal-900">৳{totalCPU.toFixed(2)}</p>
                </div>
                <div className="text-right text-xs text-teal-600">
                  <p>Landing + Local</p>
                  <p className="font-semibold">{fmt(totalLandingCost + totalLocalCost)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-300">
              <Receipt className="w-10 h-10 mb-2" />
              <p className="text-xs text-gray-400 mb-3">No local costs recorded yet</p>
              <button onClick={() => onNavigate('local-costs')}
                className="px-4 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                Add First Entry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══ WORKFORCE + INBOUND MATERIALS — side by side ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Workforce */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Workforce" subtitle="Headcount, expertise & today's shift coverage"
            icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600"
            action={<NavLink label="Manage" onClick={() => onNavigate('employee-list')} />}
          />
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{activeEmp}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Active</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-400">{inactiveEmp}</p>
              <p className="text-xs text-gray-400 mt-0.5">Inactive</p>
            </div>
            <div className={`border rounded-xl p-3 text-center ${dayShift > 0 ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-2xl font-bold ${dayShift > 0 ? 'text-amber-700' : 'text-gray-300'}`}>{dayShift}</p>
              <p className={`text-xs mt-0.5 ${dayShift > 0 ? 'text-amber-600' : 'text-gray-400'}`}>☀ Day Today</p>
            </div>
            <div className={`border rounded-xl p-3 text-center ${nightShift > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-2xl font-bold ${nightShift > 0 ? 'text-indigo-700' : 'text-gray-300'}`}>{nightShift}</p>
              <p className={`text-xs mt-0.5 ${nightShift > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>☽ Night Today</p>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-500">Active utilisation</span>
              <span className="font-bold text-gray-900">{employees.length > 0 ? Math.round((activeEmp / employees.length) * 100) : 0}% ({activeEmp} of {employees.length})</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${employees.length > 0 ? (activeEmp / employees.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Expertise Distribution</p>
            <div className="space-y-2">
              {Object.entries(expertiseCount).map(([exp, count]) => {
                const colors = { 'Cutting': { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' }, 'Lamination': { bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800' }, 'Embedding': { bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-800' }, 'Production QC': { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' } };
                const c = colors[exp] || { bar: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' };
                return (
                  <div key={exp} className="flex items-center gap-3">
                    <span className="w-28 text-xs text-gray-600 truncate">{exp}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${activeEmp > 0 ? (count / activeEmp) * 100 : 0}%` }} />
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{count}</span>
                  </div>
                );
              })}
              {Object.keys(expertiseCount).length === 0 && <p className="text-xs text-gray-300 text-center py-3">No employees registered yet</p>}
            </div>
          </div>
          <button onClick={() => onNavigate('shift-roster-list')}
            className="mt-4 w-full flex items-center justify-between px-3 py-2.5 bg-purple-50 border border-purple-100 rounded-xl text-xs hover:bg-purple-100 transition-colors">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-purple-800">View Shift Rosters</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-purple-500" />
          </button>
        </div>

        {/* Inbound Materials */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Inbound Materials" subtitle="Shipment receipt & processing status"
            icon={Inbox} iconBg="bg-amber-50" iconColor="text-amber-600"
            action={<NavLink label="View All" onClick={() => onNavigate('inbound-list')} />}
          />
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`border rounded-xl p-3 text-center ${pendingInbound > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-2xl font-bold ${pendingInbound > 0 ? 'text-orange-700' : 'text-gray-300'}`}>{pendingInbound}</p>
              <p className={`text-xs mt-0.5 ${pendingInbound > 0 ? 'text-orange-600' : 'text-gray-400'}`}>Pending</p>
            </div>
            <div className={`border rounded-xl p-3 text-center ${partialInbound > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-2xl font-bold ${partialInbound > 0 ? 'text-amber-700' : 'text-gray-300'}`}>{partialInbound}</p>
              <p className={`text-xs mt-0.5 ${partialInbound > 0 ? 'text-amber-600' : 'text-gray-400'}`}>In Progress</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{receivedInbound}</p>
              <p className="text-xs text-emerald-600 mt-0.5">Received</p>
            </div>
          </div>
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-500">Receipt completion rate</span>
              <span className="font-bold text-gray-900">{inboundMaterials.length > 0 ? Math.round((receivedInbound / inboundMaterials.length) * 100) : 0}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${inboundMaterials.length > 0 ? (receivedInbound / inboundMaterials.length) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{receivedInbound} of {inboundMaterials.length} shipments fully received</p>
          </div>
          <div className="border-t border-gray-100 pt-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Box Pipeline (from received shipments)</p>
            <div className="space-y-2">
              {[{ label: 'In Stock', v: boxesInStock, color: 'bg-emerald-500', t: 'text-emerald-700' }, { label: 'In Production', v: boxesInProd, color: 'bg-blue-500', t: 'text-blue-700' }, { label: 'Consumed', v: boxesConsumed, color: 'bg-gray-300', t: 'text-gray-500' }].map(({ label, v, color, t }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-gray-600 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${totalBoxes > 0 ? (v / totalBoxes) * 100 : 0}%` }} />
                  </div>
                  <span className={`w-16 text-right font-semibold ${t}`}>{v} / {totalBoxes}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onNavigate('inbound-list')}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors">
              <Inbox className="w-3.5 h-3.5" /> Receive Materials
            </button>
            <button onClick={() => onNavigate('box-list')}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors">
              <Box className="w-3.5 h-3.5" /> View Boxes
            </button>
          </div>
        </div>
      </div>

      {/* ══ QUICK NAVIGATION ══ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Navigation</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { nav: 'lc-list',          label: 'LCs',           icon: FileText, bg: 'bg-blue-50',    ic: 'text-blue-600'    },
            { nav: 'all-shipments',    label: 'Shipments',      icon: Ship,     bg: 'bg-indigo-50',  ic: 'text-indigo-600'  },
            { nav: 'inbound-list',     label: 'Inbound',        icon: Inbox,    bg: 'bg-amber-50',   ic: 'text-amber-600'   },
            { nav: 'box-list',         label: 'Material Boxes', icon: Box,      bg: 'bg-purple-50',  ic: 'text-purple-600'  },
            { nav: 'production-floor', label: 'Prod. Floor',    icon: Factory,  bg: 'bg-orange-50',  ic: 'text-orange-500'  },
            { nav: 'subbox-list',      label: 'Finished Goods', icon: Layers,   bg: 'bg-emerald-50', ic: 'text-emerald-600' },
          ].map(({ nav, label, icon: Icon, bg, ic }) => (
            <button key={nav} onClick={() => onNavigate(nav)}
              className="flex flex-col items-center gap-2 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all group text-center">
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
                <Icon className={ic} style={{ width: 18, height: 18 }} />
              </div>
              <p className="text-xs font-medium text-gray-700 leading-tight">{label}</p>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;