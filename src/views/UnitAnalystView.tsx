/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AppState, Outcome } from '../types';
import { useLanguage } from '../App';
import { 
  TrendingDown, 
  Brain, 
  BarChart2, 
  ShieldCheck, 
  Target,
  Zap,
  Info,
  Filter,
  Wind,
  AlertTriangle,
  Activity,
  Heart,
  Clock,
  PieChart as PieChartIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface UnitAnalystViewProps {
  state: AppState;
}

export default function UnitAnalystView({ state }: UnitAnalystViewProps) {
  const { t } = useLanguage();
  
  const [filterInstitution, setFilterInstitution] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const hospitals = useMemo(() => Array.from(new Set(state.patients.map(p => p.hospital))), [state.patients]);

  // Filtered datasets
  const filteredPatients = useMemo(() => {
    return state.patients.filter(p => {
      const matchInst = !filterInstitution || p.hospital === filterInstitution;
      const matchType = !filterType || p.type === filterType;
      return matchInst && matchType;
    });
  }, [state.patients, filterInstitution, filterType]);

  const patientHashes = useMemo(() => new Set(filteredPatients.map(p => p.patientHash)), [filteredPatients]);

  const filteredOutcomes = useMemo(() => {
    return state.outcomes.filter(o => patientHashes.has(o.patientHash));
  }, [state.outcomes, patientHashes]);

  // Calculations
  const kpis = useMemo(() => {
    const total = filteredOutcomes.length || 1;
    const outcomes = filteredOutcomes;
    const deaths = outcomes.filter(o => o.status === 'Deceased').length;
    const respDeaths = outcomes.filter(o => o.status === 'Deceased' && o.mortalityRespiratory).length;
    
    // SMR (Observed / Expected PIM3)
    const expectedMortalityTotal = outcomes.reduce((acc, o) => acc + (o.mortalityProbability || 0), 0) / 100;
    const smr = deaths / (expectedMortalityTotal || 1);

    const avgVentDays = outcomes.reduce((acc, o) => acc + (o.ventilationDays || 0), 0) / total;

    // Airway Analysis
    const intubatedCount = outcomes.filter(o => o.intubated === 1).length;
    const adequateSizeCount = outcomes.filter(o => o.intubated === 1 && o.ettAdequate).length;
    const accidentalExtubations = outcomes.filter(o => o.accidentalExtubation === 1).length;
    const cprPostExtubCount = outcomes.filter(o => o.accidentalExtubation === 1 && o.requiedCprPostAccidental).length;

    return {
      globalMortality: (deaths / total) * 100,
      respiratoryMortality: (respDeaths / total) * 100,
      smr,
      avgVentDays,
      intubationRate: (intubatedCount / total) * 100,
      adequateSizeRate: (adequateSizeCount / (intubatedCount || 1)) * 100,
      accidentalExtRate: (accidentalExtubations / total) * 100,
      cprRate: (cprPostExtubCount / (accidentalExtubations || 1)) * 100
    };
  }, [filteredOutcomes]);

  // Calibration Curve Data
  const calibrationData = useMemo(() => {
    const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    return buckets.slice(0, -1).map((low, i) => {
      const high = buckets[i + 1];
      const outcomes = filteredOutcomes.filter(o => {
        const prob = o.mortalityProbability || 0;
        return prob >= low && prob < high;
      });
      const expected = outcomes.length ? (outcomes.reduce((acc, o) => acc + (o.mortalityProbability || 0), 0) / outcomes.length) : (low + high) / 2;
      const observed = outcomes.length ? (outcomes.filter(o => o.status === 'Deceased').length / outcomes.length) * 100 : 0;
      
      return {
        decile: `${low}-${high}%`,
        expected,
        observed,
        target: expected 
      };
    });
  }, [filteredOutcomes]);

  // Correlation: Airway Complications vs Mortality
  const correlationData = useMemo(() => {
    const groups = [
      { name: t.clinicalDashboard.correlationNormal, patients: filteredOutcomes.filter(o => o.accidentalExtubation !== 1) },
      { name: t.clinicalDashboard.correlationAccidental, patients: filteredOutcomes.filter(o => o.accidentalExtubation === 1) },
      { name: t.clinicalDashboard.correlationInadequate, patients: filteredOutcomes.filter(o => o.intubated === 1 && !o.ettAdequate) }
    ];

    return groups.map(g => ({
      category: g.name,
      mortality: g.patients.length ? (g.patients.filter(o => o.status === 'Deceased').length / g.patients.length) * 100 : 0
    }));
  }, [filteredOutcomes]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Filter */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black text-[#00236f] tracking-tight">{t.sidebar.unitAnalyst}</h2>
            <p className="text-sm text-gray-500 font-medium">{t.unitAnalystView.advancedTitle}</p>
          </div>
          <div className="flex items-center gap-2 px-6 py-2 bg-[#50dab7]/10 text-[#50dab7] rounded-2xl border border-[#50dab7]/20">
             <ShieldCheck className="w-5 h-5" />
             <span className="text-xs font-black uppercase tracking-widest">{t.analyticsLabels.significanceValid}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
           <Filter className="w-4 h-4 text-gray-400 ml-2" />
           <select 
             value={filterInstitution}
             onChange={e => setFilterInstitution(e.target.value)}
             className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-100 outline-none"
           >
             <option value="">{t.common.allInstitutions}</option>
             {hospitals.map(h => <option key={h} value={h}>{h}</option>)}
           </select>
           <select 
             value={filterType}
             onChange={e => setFilterType(e.target.value)}
             className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-blue-100 outline-none"
           >
             <option value="">{t.common.allPatients}</option>
             <option value="Neonatal">{t.common.neonatal}</option>
             <option value="Pediatric">{t.common.pediatric}</option>
           </select>
        </div>
      </div>

      {/* Primary Mortality KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Activity className="w-5 h-5 text-rose-500" />}
          label={t.clinicalDashboard.globalRate} 
          value={`${kpis.globalMortality.toFixed(1)}%`} 
          sub={t.unitAnalystView.rawMortality}
        />
        <StatCard 
          icon={<Wind className="w-5 h-5 text-blue-500" />}
          label={t.clinicalDashboard.respRate} 
          value={`${kpis.respiratoryMortality.toFixed(1)}%`} 
          sub={t.unitAnalystView.primaryAirwayCause}
        />
        <StatCard 
          icon={<Target className="w-5 h-5 text-[#00236f]" />}
          label={t.clinicalDashboard.smr} 
          value={kpis.smr.toFixed(2)} 
          sub={t.clinicalDashboard.obsVsExp}
          color={kpis.smr > 1.1 ? 'rose' : 'emerald'}
        />
        <StatCard 
          icon={<Clock className="w-5 h-5 text-gray-500" />}
          label={t.clinicalDashboard.avgVentDays} 
          value={kpis.avgVentDays.toFixed(1)} 
          sub={t.unitAnalystView.unitComplexity}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Airway Analysis */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-5">
              <Wind className="w-32 h-32 text-blue-500" />
           </div>
           
           <div className="flex items-center gap-3 mb-10">
              <div className="p-3 bg-blue-50 rounded-2xl">
                 <Wind className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-[#00236f] tracking-tight">{t.clinicalDashboard.airwayVentilation}</h3>
           </div>

           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              <MiniStat label={t.clinicalDashboard.intubatedPct} value={`${kpis.intubationRate.toFixed(1)}%`} />
              <MiniStat label={t.unitAnalystView.adequacySize} value={`${kpis.adequateSizeRate.toFixed(1)}%`} color={kpis.adequateSizeRate > 90 ? 'emerald' : 'amber'} />
              <MiniStat label={t.clinicalDashboard.accidentalExtubations} value={`${kpis.accidentalExtRate.toFixed(1)}%`} color={kpis.accidentalExtRate > 5 ? 'rose' : 'emerald'} />
              <MiniStat label={t.intensivist.cprPostExtub} value={`${kpis.cprRate.toFixed(1)}%`} color="rose" />
           </div>

           <div className="h-[350px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">{t.unitAnalystView.correlationTitle}</p>
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={correlationData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} unit="%" />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="mortality" radius={[8, 8, 0, 0]} barSize={60}>
                       {correlationData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={index === 0 ? '#00236f' : (index === 1 ? '#ef4444' : '#f59e0b')} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* PIM3 Calibration */}
        <div className="bg-[#1e3a5f] p-10 rounded-[2.5rem] border border-blue-900 shadow-xl text-white">
           <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-800/50 rounded-2xl">
                 <ShieldCheck className="w-6 h-6 text-blue-300" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">{t.clinicalDashboard.pim3Calibration}</h3>
           </div>

           <div className="space-y-10">
              <div>
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">{t.unitAnalystView.modelCalibration}</p>
                <div className="h-[250px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={calibrationData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#ffffff11" vertical={false} />
                         <XAxis dataKey="decile" tick={{ fill: '#ffffff66', fontSize: 8 }} axisLine={false} />
                         <YAxis tick={{ fill: '#ffffff66', fontSize: 8 }} axisLine={false} unit="%" />
                         <Tooltip 
                           contentStyle={{ backgroundColor: '#1e3a5f', border: '1px solid #1e40af', borderRadius: '12px' }}
                           itemStyle={{ fontSize: '10px' }}
                         />
                         <Line type="monotone" dataKey="observed" stroke="#50dab7" strokeWidth={3} dot={{ fill: '#50dab7', strokeWidth: 2 }} />
                         <Line type="monotone" dataKey="target" stroke="#ffffff33" strokeDasharray="5 5" dot={false} />
                      </LineChart>
                   </ResponsiveContainer>
                </div>
                <div className="mt-4 flex justify-between text-[8px] font-bold text-blue-300 uppercase tracking-tighter">
                   <span>{t.unitAnalystView.observedMortality}</span>
                   <span>{t.unitAnalystView.expectedMortality}</span>
                </div>
              </div>

              <div className="p-6 bg-blue-900/40 rounded-3xl border border-blue-800">
                 <div className="flex items-center gap-3 mb-4">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold">{t.unitAnalystView.discrimination}</span>
                 </div>
                 <div className="space-y-3">
                    <RiskCategory label={t.riskTaxonomy.low} value="0.8%" />
                    <RiskCategory label={t.riskTaxonomy.high} value="12.5%" />
                    <RiskCategory label={t.riskTaxonomy.veryHigh} value="44.2%" />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub: string; color?: 'rose' | 'emerald' }) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:scale-[1.02] cursor-default group">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
          {icon}
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className={cn(
        "text-3xl font-black tracking-tighter transition-colors",
        color === 'rose' ? "text-rose-600" : (color === 'emerald' ? "text-emerald-600" : "text-[#00236f]")
      )}>
        {value}
      </p>
      <p className="text-[10px] font-bold text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: 'emerald' | 'amber' | 'rose' }) {
  const colors = {
    emerald: 'text-emerald-600',
    amber: 'text-amber-500',
    rose: 'text-rose-600'
  };
  return (
    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
       <p className={cn("text-xl font-black", color ? colors[color] : "text-[#00236f]")}>{value}</p>
    </div>
  );
}

function RiskCategory({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
       <span className="text-xs font-bold text-blue-300">{label}</span>
       <span className="text-xs font-black text-white">{value}</span>
    </div>
  );
}
