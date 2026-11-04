import React from 'react';
import {
  Users,
  DoorOpen,
  BedDouble,
  Footprints,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  OutletHRMetrics,
  OutletRoomMetrics,
  OutletTherapistMetrics,
} from '@/types/posdashboard';

interface RoomTherapistAnalysisProps {
  hrMetrics?: OutletHRMetrics;
  roomMetrics?: OutletRoomMetrics;
  therapistMetrics?: OutletTherapistMetrics;
  selectedOutletName?: string;
  selectedOutletCode?: string;
}

export const RoomTherapistAnalysis: React.FC<RoomTherapistAnalysisProps> = ({
  hrMetrics,
  roomMetrics,
  therapistMetrics,
  selectedOutletName,
  selectedOutletCode = 'ALL',
}) => {
  const hr = hrMetrics || {
    totalActiveStaff: 0,
    activeTR: 0,
    activeTB: 0,
    departments: [],
  };

  const room = roomMetrics || {
    totalRooms: 0,
    roomsBM: 0,
    roomsRF: 0,
    usedRooms: 0,
    usedBM: 0,
    usedRF: 0,
    availableRooms: 0,
    availableBM: 0,
    availableRF: 0,
    occupancyPercent: 0,
    cumulativeTurnover: 0,
  };

  const th = therapistMetrics || {
    inChargeTR: 0,
    inChargeTB: 0,
    totalInCharge: 0,
    onTreatmentRF: 0,
    onTreatmentBM: 0,
    totalOnTreatment: 0,
    availableTR: 0,
    availableTB: 0,
    totalAvailable: 0,
    utilizationPercent: 0,
    cumulativeProductivity: 0,
  };


  return (
    <section className="mb-8 space-y-5">
      {/* =========================================================================
          MODULE 1: HUMAN RESOURCES (TODAY ACTIVE EMPLOYEES & DEPARTMENTS)
         ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 border border-zen-sand/40 shadow-zen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-zen-stone/60">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-zen-matcha" />
              <h3 className="text-base font-bold text-zen-charcoal">
                Today Active Employees & On-Duty Roster
              </h3>
              {selectedOutletCode && selectedOutletCode !== 'ALL' && (
                <span className="text-xs font-mono font-bold text-zen-moss bg-zen-paper px-2 py-0.5 rounded-md border border-zen-sand/40">
                  {selectedOutletName || selectedOutletCode}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zen-muted mt-0.5">
              Filtered from fingerprint biometric scans (excluding completed shifts &gt; 2 hrs)
            </p>
          </div>
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <span className="flex items-center px-3 py-1 rounded-full text-xs font-bold bg-zen-paper text-zen-charcoal border border-zen-sand/50">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
              {hr.totalActiveStaff} Staff On-Duty
            </span>
          </div>
        </div>

        {/* Primary Staff Highlight Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
          {/* Card 1: Foot Therapists (TR) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-200/80 hover:border-emerald-400 transition-all shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5">
                <Footprints className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900">Foot Reflexology</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                TR
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                {hr.activeTR}
              </span>
              <span className="text-xs text-emerald-700 font-medium">therapists on duty</span>
            </div>
            <p className="text-[10px] text-emerald-600/90 mt-1">
              Reflexology specialist roster available today
            </p>
          </div>

          {/* Card 2: Body Massage Therapists (TB) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zen-paper to-white border border-zen-sand/60 hover:border-zen-matcha transition-all shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5">
                <BedDouble className="w-4 h-4 text-zen-moss" />
                <span className="text-xs font-bold text-zen-charcoal">Body Massage</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zen-matcha/20 text-zen-moss border border-zen-matcha/30">
                TB
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-black text-zen-charcoal font-mono">
                {hr.activeTB}
              </span>
              <span className="text-xs text-zen-muted font-medium">therapists on duty</span>
            </div>
            <p className="text-[10px] text-zen-muted mt-1">
              Body therapy and massage roster available today
            </p>
          </div>

          {/* Card 3: Support Staff */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-stone-50 to-white border border-stone-200 hover:border-stone-300 transition-all shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-stone-600" />
                <span className="text-xs font-bold text-stone-800">Support & Operations</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-200 text-stone-700">
                OPS
              </span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
                {Math.max(0, hr.totalActiveStaff - (hr.activeTR + hr.activeTB))}
              </span>
              <span className="text-xs text-stone-600 font-medium">operational staff</span>
            </div>
            <p className="text-[10px] text-stone-500 mt-1">
              Front office, cashiers, cleaning & supervisors
            </p>
          </div>
        </div>

        {/* All Departments Breakdown Badges */}
        {hr.departments && hr.departments.length > 0 && (
          <div className="pt-3 border-t border-zen-stone/40">
            <p className="text-[11px] font-bold text-zen-muted uppercase tracking-wider mb-2">
              Department Staff Distribution
            </p>
            <div className="flex flex-wrap gap-2">
              {hr.departments.map((dept) => (
                <div
                  key={dept.departemen}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-zen-paper/60 border border-zen-sand/40 text-xs text-zen-charcoal"
                >
                  <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 bg-white rounded border border-zen-sand/40 text-zen-moss">
                    {dept.departemen}
                  </span>
                  <span className="font-medium text-[11px] text-zen-charcoal">{dept.label}</span>
                  <span className="font-mono font-black text-xs text-zen-moss bg-zen-matcha/10 px-2 py-0.5 rounded-full">
                    {dept.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODULE 2: ROOM & THERAPIST ANALYTICS (CAPACITY, UTILIZATION & RATIOS)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Panel A: Room Analytics (ot_master_room vs STARTED trans) */}
        <div className="bg-white rounded-2xl p-5 border border-zen-sand/40 shadow-zen flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zen-stone/60">
              <div className="flex items-center space-x-2">
                <DoorOpen className="w-5 h-5 text-zen-matcha" />
                <div>
                  <h4 className="text-sm font-bold text-zen-charcoal">Room Capacity & Occupancy</h4>
                  <p className="text-[10px] text-zen-muted">
                    Active treatment rooms vs currently serving guests
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-zen-paper border border-zen-sand/40 text-zen-moss">
                {room.totalRooms} Total Rooms
              </span>
            </div>

            {/* Top Room Stat Blocks */}
            <div className="grid grid-cols-3 gap-2.5 mb-4 text-center">
              <div className="p-3 rounded-xl bg-zen-paper/50 border border-zen-sand/30">
                <span className="block text-[10px] font-bold text-zen-muted uppercase">Total Rooms</span>
                <span className="text-xl sm:text-2xl font-black text-zen-charcoal font-mono">
                  {room.totalRooms}
                </span>
                <span className="block text-[10px] text-zen-muted">registered</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60">
                <span className="block text-[10px] font-bold text-amber-700 uppercase">In Use</span>
                <span className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
                  {room.usedRooms}
                </span>
                <span className="block text-[10px] text-amber-700 font-medium">active service</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase">Available</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">
                  {room.availableRooms}
                </span>
                <span className="block text-[10px] text-emerald-700 font-medium">ready to host</span>
              </div>
            </div>

            {/* Split Breakdown: BM vs RF */}
            <div className="space-y-2.5 mb-4 p-3.5 rounded-xl bg-zen-paper/30 border border-zen-sand/30 text-xs">
              {/* Body Massage Rooms */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-zen-charcoal flex items-center">
                    <BedDouble className="w-3.5 h-3.5 mr-1.5 text-zen-moss" />
                    Body Massage Rooms (BM)
                  </span>
                  <span className="font-mono font-bold text-zen-charcoal">
                    {room.usedBM} in use / {room.roomsBM} total ({room.availableBM} free)
                  </span>
                </div>
                <div className="w-full bg-zen-sand/30 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-zen-matcha h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${room.roomsBM > 0 ? Math.min(100, Math.round((room.usedBM / room.roomsBM) * 100)) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Reflexology Chairs/Rooms */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-zen-charcoal flex items-center">
                    <Footprints className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Foot & Reflexology Rooms (RF)
                  </span>
                  <span className="font-mono font-bold text-zen-charcoal">
                    {room.usedRF} in use / {room.roomsRF} total ({room.availableRF} free)
                  </span>
                </div>
                <div className="w-full bg-zen-sand/30 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${room.roomsRF > 0 ? Math.min(100, Math.round((room.usedRF / room.roomsRF) * 100)) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Room Ratios & KPIs */}
          <div className="pt-3 border-t border-zen-stone/60 grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-zen-paper/60 border border-zen-sand/30 flex items-center justify-between">
              <div>
                <span className="block text-[10px] text-zen-muted uppercase font-bold">Occupancy Rate</span>
                <span className="text-base font-black text-zen-charcoal font-mono">
                  {room.occupancyPercent}%
                </span>
              </div>
              <Activity className="w-4 h-4 text-zen-matcha" />
            </div>
            <div className="p-2.5 rounded-lg bg-zen-paper/60 border border-zen-sand/30 flex items-center justify-between">
              <div>
                <span className="block text-[10px] text-zen-muted uppercase font-bold">Turnover Velocity</span>
                <span className="text-base font-black text-zen-charcoal font-mono">
                  {room.cumulativeTurnover}x
                </span>
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Panel B: Therapist Analytics (TR & TB vs Pos Master) */}
        <div className="bg-white rounded-2xl p-5 border border-zen-sand/40 shadow-zen flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zen-stone/60">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-zen-matcha" />
                <div>
                  <h4 className="text-sm font-bold text-zen-charcoal">Therapist Deployment & Velocity</h4>
                  <p className="text-[10px] text-zen-muted">
                    In-charge therapists vs currently serving guests
                  </p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-zen-paper border border-zen-sand/40 text-zen-moss">
                {th.totalInCharge} In-Charge
              </span>
            </div>

            {/* Top Therapist Stat Blocks */}
            <div className="grid grid-cols-3 gap-2.5 mb-4 text-center">
              <div className="p-3 rounded-xl bg-zen-paper/50 border border-zen-sand/30">
                <span className="block text-[10px] font-bold text-zen-muted uppercase">In-Charge</span>
                <span className="text-xl sm:text-2xl font-black text-zen-charcoal font-mono">
                  {th.totalInCharge}
                </span>
                <span className="block text-[10px] text-zen-muted">on roster</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60">
                <span className="block text-[10px] font-bold text-amber-700 uppercase">On Treatment</span>
                <span className="text-xl sm:text-2xl font-black text-amber-900 font-mono">
                  {th.totalOnTreatment}
                </span>
                <span className="block text-[10px] text-amber-700 font-medium">serving now</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                <span className="block text-[10px] font-bold text-emerald-700 uppercase">Available</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">
                  {th.totalAvailable}
                </span>
                <span className="block text-[10px] text-emerald-700 font-medium">idle / next</span>
              </div>
            </div>

            {/* Split Breakdown: Foot TR/RF vs Body TB/BM */}
            <div className="space-y-2.5 mb-4 p-3.5 rounded-xl bg-zen-paper/30 border border-zen-sand/30 text-xs">
              {/* Foot Therapists (TR & RF) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-zen-charcoal flex items-center">
                    <Footprints className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Foot Therapists (TR / RF)
                  </span>
                  <span className="font-mono font-bold text-zen-charcoal">
                    {th.onTreatmentRF} busy / {th.inChargeTR} active ({th.availableTR} free)
                  </span>
                </div>
                <div className="w-full bg-zen-sand/30 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${th.inChargeTR > 0 ? Math.min(100, Math.round((th.onTreatmentRF / th.inChargeTR) * 100)) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Body Therapists (TB & BM) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-zen-charcoal flex items-center">
                    <BedDouble className="w-3.5 h-3.5 mr-1.5 text-zen-moss" />
                    Body Therapists (TB / BM)
                  </span>
                  <span className="font-mono font-bold text-zen-charcoal">
                    {th.onTreatmentBM} busy / {th.inChargeTB} active ({th.availableTB} free)
                  </span>
                </div>
                <div className="w-full bg-zen-sand/30 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-zen-matcha h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${th.inChargeTB > 0 ? Math.min(100, Math.round((th.onTreatmentBM / th.inChargeTB) * 100)) : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Therapist Ratios & KPIs */}
          <div className="pt-3 border-t border-zen-stone/60 grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-zen-paper/60 border border-zen-sand/30 flex items-center justify-between">
              <div>
                <span className="block text-[10px] text-zen-muted uppercase font-bold">Utilization Rate</span>
                <span className="text-base font-black text-zen-charcoal font-mono">
                  {th.utilizationPercent}%
                </span>
              </div>
              <Activity className="w-4 h-4 text-zen-matcha" />
            </div>
            <div className="p-2.5 rounded-lg bg-zen-paper/60 border border-zen-sand/30 flex items-center justify-between">
              <div>
                <span className="block text-[10px] text-zen-muted uppercase font-bold">Therapist Productivity</span>
                <span className="text-base font-black text-zen-charcoal font-mono">
                  {th.cumulativeProductivity}x
                </span>
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
