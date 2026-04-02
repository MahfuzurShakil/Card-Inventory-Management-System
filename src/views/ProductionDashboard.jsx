import { useState, useMemo } from 'react';
import {
  Factory, Package, BoxIcon, Layers, AlertTriangle,
  CheckCircle, XCircle, Filter, Cpu, Clock
} from 'lucide-react';

// ─── Days-to-finish ───────────────────────────────────────────────────────────
const calcDaysToFinish = (availableUnits, subBoxes) => {
  if (availableUnits <= 0) return 0;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentConsumption = subBoxes
    .filter(sb => {
      if (!sb.production_date) return false;
      return new Date(sb.production_date) >= thirtyDaysAgo && sb.output_type === 'Good/ QC Approved';
    })
    .reduce((s, sb) => s + (sb.quantity || 0), 0);
  const dailyRate = recentConsumption / 30;
  if (dailyRate <= 0) return null;
  return Math.round(availableUnits / dailyRate);
};

// ─── Donut Chart ──────────────────────────────────────────────────────────────
const DonutChart = ({ data, total }) => {
  const [hovered, setHovered] = useState(null);
  const CX = 100, CY = 100, R = 80, IR = 52;

  const paths = (() => {
    if (total === 0) return [];
    const MIN = 0.5;
    const zeros = data.filter(d => d.value === 0).length;
    const avail = 360 - zeros * MIN;
    let angle = -90;
    return data.map(item => {
      const sweep = item.value === 0 ? MIN : (item.value / total) * avail;
      const s = angle, e = angle + sweep;
      const r = (d) => (d * Math.PI) / 180;
      const path = `M ${CX + R * Math.cos(r(s))} ${CY + R * Math.sin(r(s))}
        A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${CX + R * Math.cos(r(e))} ${CY + R * Math.sin(r(e))}
        L ${CX + IR * Math.cos(r(e))} ${CY + IR * Math.sin(r(e))}
        A ${IR} ${IR} 0 ${sweep > 180 ? 1 : 0} 0 ${CX + IR * Math.cos(r(s))} ${CY + IR * Math.sin(r(s))} Z`;
      angle = e;
      return { ...item, path, pct: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0' };
    });
  })();

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative">
        <svg viewBox="0 0 200 200" width="200" height="200">
          {paths.map((item, i) => (
            <path
              key={i} d={item.path} fill={item.color}
              opacity={hovered !== null && hovered !== i ? 0.4 : 1}
              style={{ strokeWidth: 2, stroke: 'white', cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <circle cx={CX} cy={CY} r={IR - 1} fill="white" />
          <text x={CX} y={CY - 6} textAnchor="middle" fill="#111827" style={{ fontSize: 26, fontWeight: 700 }}>{total}</text>
          <text x={CX} y={CY + 14} textAnchor="middle" fill="#9ca3af" style={{ fontSize: 11 }}>In Production</text>
        </svg>

        {/* Hover tooltip */}
        {hovered !== null && paths[hovered] && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg px-2.5 py-1.5 pointer-events-none shadow-lg whitespace-nowrap z-20">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: paths[hovered].color }} />
              <span className="font-semibold">{paths[hovered].label}</span>
              <span className="text-gray-300">· {paths[hovered].value} boxes · {paths[hovered].pct}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend row below */}
      <div className="flex items-start justify-center gap-8 mt-4 pt-4 border-t border-gray-100 w-full">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{item.value}</span>
            <span className="text-xs text-gray-400">{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Bar Chart ────────────────────────────────────────────────────────────────
const BarChart = ({ data }) => {
  const [tooltip, setTooltip] = useState(null);
  const CHART_H = 200;

  const maxVal = Math.max(...data.map(d => Math.max(d.good, d.wastage)), 1);

  const niceMax = (() => {
    if (maxVal <= 10) return 10;
    const mag = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const steps = [1, 2, 2.5, 5, 10];
    for (const s of steps) {
      const c = Math.ceil(maxVal / (s * mag)) * (s * mag);
      if (c >= maxVal) return c;
    }
    return Math.ceil(maxVal / mag) * mag;
  })();

  const ticks = [0, 1, 2, 3, 4].map(i => Math.round((niceMax / 4) * i));
  const fmt = v => v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`;
  const bh = val => val > 0 ? Math.max(Math.round((val / niceMax) * CHART_H), 3) : 0;

  return (
    <div className="flex gap-2">
      {/* Y-axis */}
      <div className="flex flex-col-reverse justify-between items-end flex-shrink-0 pb-6" style={{ height: CHART_H + 4, width: 52 }}>
        {ticks.map((v, i) => (
          <span key={i} className="block text-right w-full" style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1 }}>{fmt(v)}</span>
        ))}
      </div>

      {/* Plot area */}
      <div className="flex-1 relative">
        {/* Grid lines */}
        <div className="absolute inset-0" style={{ bottom: 24, pointerEvents: 'none' }}>
          {ticks.map((v, i) => (
            <div key={i} className="absolute left-0 right-0 border-t border-gray-100"
              style={{ bottom: `${(v / niceMax) * CHART_H}px` }} />
          ))}
          <div className="absolute left-0 right-0 border-t border-gray-200" style={{ bottom: 0 }} />
        </div>

        {/* Columns */}
        <div className="flex items-end justify-around gap-1" style={{ height: CHART_H + 28 }}>
          {data.map((item, idx) => (
            <div key={idx} className="relative flex flex-col items-center flex-1" style={{ height: CHART_H + 28 }}>
              {tooltip === idx && (
                <div className="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl z-30 whitespace-nowrap"
                  style={{ bottom: CHART_H + 32, left: '50%', transform: 'translateX(-50%)' }}>
                  <div className="font-semibold mb-1 text-center">{item.label}</div>
                  <div className="text-emerald-300">✓ Good: {item.good.toLocaleString()} units</div>
                  <div className="text-red-300">✗ Wastage: {item.wastage.toLocaleString()} units</div>
                </div>
              )}
              <div className="flex items-end gap-px w-full" style={{ height: CHART_H, alignSelf: 'flex-start', marginTop: 'auto' }}
                onMouseEnter={() => setTooltip(idx)} onMouseLeave={() => setTooltip(null)}>
                <div className="flex-1 bg-emerald-500 hover:bg-emerald-400 rounded-t transition-colors cursor-pointer"
                  style={{ height: `${bh(item.good)}px`, alignSelf: 'flex-end' }} />
                <div className="flex-1 bg-red-400 hover:bg-red-300 rounded-t transition-colors cursor-pointer"
                  style={{ height: `${bh(item.wastage)}px`, alignSelf: 'flex-end' }} />
              </div>
              <span className="text-center w-full truncate mt-1.5" style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const ProductionDashboard = ({ lcs, employees, inboundMaterials, boxes, subBoxes, productionAssignments, onNavigate }) => {
  const [timeFilter, setTimeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [chartTimeFilter, setChartTimeFilter] = useState('monthly');

  const productionSubBoxes = subBoxes.filter(sb => !!sb.production_date);

  const filteredSubBoxes = useMemo(() => {
    if (timeFilter === 'all') return subBoxes;
    const now = new Date();
    return subBoxes.filter(sb => {
      if (!sb.production_date) return false;
      const d = new Date(sb.production_date);
      if (timeFilter === 'today') return d.toDateString() === now.toDateString();
      if (timeFilter === 'week') return d >= new Date(now - 7 * 86400000);
      if (timeFilter === 'month') return d >= new Date(now - 30 * 86400000);
      if (timeFilter === 'custom' && dateRange.start && dateRange.end)
        return d >= new Date(dateRange.start) && d <= new Date(dateRange.end);
      return true;
    });
  }, [subBoxes, timeFilter, dateRange]);

  const getStock = (type) => {
    const b = boxes.filter(b => (b.item_type === type || b.item_name === type) && b.status !== 'Consumed');
    const units = b.reduce((s, x) => s + ((x.quantity || 0) - (x.consumed_quantity || 0)), 0);
    return { boxCount: b.length, totalUnits: units, days: calcDaysToFinish(units, subBoxes) };
  };
  const chip = getStock('Chip');
  const tape = getStock('Tape');
  const sheet = getStock('Sheet');

  const goodSB = filteredSubBoxes.filter(sb => sb.output_type === 'Good/ QC Approved');
  const wasteSB = filteredSubBoxes.filter(sb => sb.output_type === 'Wastage');
  const goodQty = goodSB.reduce((s, sb) => s + (sb.quantity || 0), 0);
  const wasteQty = wasteSB.reduce((s, sb) => s + (sb.quantity || 0), 0);
  const totalQty = goodQty + wasteQty;
  const qualityRate = totalQty > 0 ? ((goodQty / totalQty) * 100).toFixed(1) : 0;
  const wastePct = totalQty > 0 ? ((wasteQty / totalQty) * 100).toFixed(1) : 0;

  const lowStock = [];
  if (chip.boxCount < 5) lowStock.push(`Chip (${chip.boxCount} boxes)`);
  if (tape.boxCount < 5) lowStock.push(`Tape (${tape.boxCount} boxes)`);
  if (sheet.boxCount < 5) lowStock.push(`Sheet (${sheet.boxCount} boxes)`);

  const getChartData = () => {
    const now = new Date();
    if (chartTimeFilter === 'daily') {
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now - (6 - i) * 86400000);
        const ds = date.toISOString().split('T')[0];
        const d = productionSubBoxes.filter(sb => sb.production_date === ds);
        return { label: i === 6 ? 'Today' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), good: d.filter(sb => sb.output_type === 'Good/ QC Approved').reduce((s, sb) => s + (sb.quantity || 0), 0), wastage: d.filter(sb => sb.output_type === 'Wastage').reduce((s, sb) => s + (sb.quantity || 0), 0) };
      });
    } else if (chartTimeFilter === 'weekly') {
      return Array.from({ length: 7 }, (_, i) => {
        const ws = new Date(now - (6 - i) * 7 * 86400000), we = new Date(ws.getTime() + 7 * 86400000);
        const d = productionSubBoxes.filter(sb => { const x = new Date(sb.production_date); return x >= ws && x < we; });
        return { label: i === 6 ? 'This Wk' : `W${i + 1}`, good: d.filter(sb => sb.output_type === 'Good/ QC Approved').reduce((s, sb) => s + (sb.quantity || 0), 0), wastage: d.filter(sb => sb.output_type === 'Wastage').reduce((s, sb) => s + (sb.quantity || 0), 0) };
      });
    } else {
      return Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const d = productionSubBoxes.filter(sb => sb.production_date?.startsWith(ym));
        return { label: date.toLocaleDateString('en-US', { month: 'short' }), good: d.filter(sb => sb.output_type === 'Good/ QC Approved').reduce((s, sb) => s + (sb.quantity || 0), 0), wastage: d.filter(sb => sb.output_type === 'Wastage').reduce((s, sb) => s + (sb.quantity || 0), 0) };
      });
    }
  };

  const pieData = [
    { label: 'Chip',  value: boxes.filter(b => (b.item_type === 'Chip'  || b.item_name === 'Chip')  && b.status === 'Material In Production').length, color: '#3b82f6' },
    { label: 'Tape',  value: boxes.filter(b => (b.item_type === 'Tape'  || b.item_name === 'Tape')  && b.status === 'Material In Production').length, color: '#8b5cf6' },
    { label: 'Sheet', value: boxes.filter(b => (b.item_type === 'Sheet' || b.item_name === 'Sheet') && b.status === 'Material In Production').length, color: '#10b981' }
  ];
  const totalForPie = pieData.reduce((s, d) => s + d.value, 0);

  const daysText = (d) => d === null ? '— Days to finish' : d === 0 ? 'Out of stock' : `~${d} Days to finish`;
  const daysTextColor = (d) => d === null || d === 0 ? 'text-gray-400' : d < 7 ? 'text-red-500' : d < 15 ? 'text-orange-500' : 'text-gray-500';

  // ── Stock Card: wide card with left info + right days label ───────────────
  const StockCard = ({ label, stock, iconBg, iconEl }) => (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-col gap-2">
      {/* Top row: icon + label */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {iconEl}
        </div>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      {/* Bottom row: count left, days right */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-900">{stock.boxCount}</span>
            <span className="text-sm text-gray-400 font-normal">Boxes</span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{stock.totalUnits.toLocaleString()} units</p>
        </div>
        <div className={`flex items-center gap-1 ${daysTextColor(stock.days)}`}>
          <Clock style={{ width: 13, height: 13 }} />
          <span className="text-xs font-medium">{daysText(stock.days)}</span>
        </div>
      </div>
    </div>
  );

  // ── Output Card: wide card matching design ────────────────────────────────
  const OutputCard = ({ label, count, sub, badgeText, badgeColor, iconBg, iconEl }) => (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {iconEl}
        </div>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-3xl font-bold text-gray-900">{count}</span>
          <p className="text-sm text-gray-400 mt-0.5">{sub}</p>
        </div>
        {badgeText && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeColor}`}>{badgeText}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Production Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Real-time production metrics and inventory status</p>
        </div>
        {/* <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
            value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div> */}
      </div>

      {timeFilter === 'custom' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-blue-800 mb-1">Start Date</label>
            <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-sm bg-white" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-blue-800 mb-1">End Date</label>
            <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-sm bg-white" />
          </div>
        </div>
      )}

      {/* ── MATERIAL STOCK ───────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Material Stock</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StockCard label="Chip"  stock={chip}  iconBg="bg-blue-50"    iconEl={<Cpu     style={{width:17,height:17}} className="text-blue-500" />} />
          <StockCard label="Tape"  stock={tape}  iconBg="bg-purple-50"  iconEl={<Package style={{width:17,height:17}} className="text-purple-500" />} />
          <StockCard label="Sheet" stock={sheet} iconBg="bg-emerald-50" iconEl={<BoxIcon style={{width:17,height:17}} className="text-emerald-500" />} />
        </div>
      </div>

      {/* ── FINISHED GOODS OUTPUT ────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Finished Goods</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <OutputCard
            label="Total Sub Boxes" count={filteredSubBoxes.length}
            sub="Finished goods boxes"
            iconBg="bg-gray-100" iconEl={<Layers style={{width:17,height:17}} className="text-gray-500" />}
          />
          <OutputCard
            label="Good Output" count={goodSB.length}
            sub={`${goodQty.toLocaleString()} units`}
            badgeText={`${qualityRate}% quality rate`} badgeColor="bg-emerald-100 text-emerald-700"
            iconBg="bg-emerald-50" iconEl={<CheckCircle style={{width:17,height:17}} className="text-emerald-500" />}
          />
          <OutputCard
            label="Wastage" count={wasteSB.length}
            sub={`${wasteQty.toLocaleString()} units`}
            badgeText={`${wastePct}% of total output`} badgeColor="bg-red-100 text-red-600"
            iconBg="bg-red-50" iconEl={<XCircle style={{width:17,height:17}} className="text-red-400" />}
          />
        </div>
      </div>

      {/* Low stock */}
      {lowStock.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-400 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-800"><span className="font-semibold">Low Stock:</span> {lowStock.join(' · ')}</p>
        </div>
      )}

      {/* ── CHARTS ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Production Rate</h3>
              <p className="text-xs text-gray-400 mt-0.5">Good vs Wastage output</p>
            </div>
            <select
              className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
              value={chartTimeFilter} onChange={e => setChartTimeFilter(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <BarChart data={getChartData()} />

          {/* "units" label aligned under y-axis */}
          <div style={{ paddingLeft: 52 }}>
            <span className="text-xs text-gray-400">units</span>
          </div>

          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-xs text-gray-500">Good Output</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-400"></div>
              <span className="text-xs text-gray-500">Wastage</span>
            </div>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Stock Distribution</h3>
            <p className="text-xs text-gray-400 mt-0.5">Boxes in production by material type</p>
          </div>

          {totalForPie > 0 ? (
            <DonutChart data={pieData} total={totalForPie} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-300">
              <Package className="w-10 h-10 mb-2" />
              <p className="text-sm">No items currently in production</p>
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK ACTIONS ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { nav: 'inbound-list',     icon: Package, label: 'Receive Materials',  sub: 'Process incoming shipments',      bg: 'bg-blue-50',    ic: 'text-blue-500'    },
            { nav: 'box-list',         icon: BoxIcon, label: 'Manage Boxes',       sub: 'View and track all boxes',        bg: 'bg-purple-50',  ic: 'text-purple-500'  },
            { nav: 'production-floor', icon: Factory, label: 'Production Floor',   sub: 'Issue materials & record output', bg: 'bg-orange-50',  ic: 'text-orange-500'  },
            { nav: 'subbox-list',      icon: Layers,  label: 'Finished Goods',     sub: 'View production output',          bg: 'bg-emerald-50', ic: 'text-emerald-500' },
          ].map(({ nav, icon: Icon, label, sub, bg, ic }) => (
            <button key={nav} onClick={() => onNavigate(nav)}
              className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-left group">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>
                <Icon style={{ width: 16, height: 16 }} className={ic} />
              </div>
              <p className="font-semibold text-xs text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductionDashboard;
