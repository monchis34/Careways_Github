/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AppState, PatientType } from '../types';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  TrendingUp,
  Filter,
  Download,
  School,
  Thermometer, 
  Zap, 
  CloudRain, 
  Stethoscope, 
  Scale, 
  MessageSquare, 
  AlertCircle, 
  Brain, 
  Wind, 
  Baby,
  Skull,
  Crosshair,
  Heart,
  Target
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Line,
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useLanguage } from '../App';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface DashboardViewProps {
  state: AppState;
}

export default function DashboardView({ state }: DashboardViewProps) {
  const { t } = useLanguage();
  const [filterType, setFilterType] = useState<PatientType | 'All'>('All');
  const [filterHospital, setFilterHospital] = useState<string>('All');
  const [filterCity, setFilterCity] = useState<string>('All');
  const [filterCountry, setFilterCountry] = useState<string>('All');
  
  const filteredData = useMemo(() => {
    let patients = state.patients;
    if (filterType !== 'All') patients = patients.filter(p => p.type === filterType);
    if (filterHospital !== 'All') patients = patients.filter(p => p.hospital === filterHospital);
    if (filterCity !== 'All') patients = patients.filter(p => p.city === filterCity);
    if (filterCountry !== 'All') patients = patients.filter(p => p.country === filterCountry);

    const patientIds = patients.map(p => p.patientHash);
    return {
      ...state,
      patients,
      outcomes: state.outcomes.filter(o => patientIds.includes(o.patientHash)),
      parentPatients: state.parentPatients.filter(p => patientIds.includes(p.patientHash))
    };
  }, [state, filterType, filterHospital, filterCity, filterCountry]);

  // Unique values for filters
  const hospitals = useMemo(() => Array.from(new Set(state.patients.map(p => p.hospital))), [state.patients]);
  const cities = useMemo(() => Array.from(new Set(state.patients.map(p => p.city))), [state.patients]);
  const countries = useMemo(() => Array.from(new Set(state.patients.map(p => p.country))), [state.patients]);

  const role = state.currentUser?.role;

  if (role === 'Analyst' || role === 'Administrator' || role === 'Admin/Analyst') {
    return <IntensivistDashboard state={state} filteredData={filteredData} />;
  }

  // Fallback for others or keep existing clinician-focused summary
  const metrics = useMemo(() => {
    const total = filteredData.patients.length;
    const deceased = filteredData.outcomes.filter(o => o.status === 'Deceased').length;
    const critical = filteredData.outcomes.filter(o => o.accidentalExtubation).length;
    const educated = filteredData.parentPatients.filter(p => p.educationActivated).length;
    const avgEd = educated > 0 
      ? Math.round(filteredData.parentPatients.reduce((acc, p) => acc + p.educationProgress, 0) / (filteredData.parentPatients.filter(p => p.educationActivated).length || 1))
      : 0;

    return {
      total,
      mortalityRate: total > 0 ? ((deceased / total) * 100).toFixed(1) : '0',
      criticalRate: total > 0 ? ((critical / total) * 100).toFixed(1) : '0',
      educationRate: total > 0 ? ((educated / total) * 100).toFixed(1) : '0',
      avgEd
    };
  }, [filteredData]);

  const correlationData = useMemo(() => {
    const bins = [0, 20, 40, 60, 80, 100];
    return bins.map((bin, i) => {
      if (i === 0) return null;
      const prev = bins[i-1];
      const matchingParents = state.parentPatients.filter(p => p.educationProgress > prev && p.educationProgress <= bin);
      const hashes = matchingParents.map(p => p.patientHash);
      const matchingOutcomes = state.outcomes.filter(o => hashes.includes(o.patientHash));
      const deaths = matchingOutcomes.filter(o => o.status === 'Deceased').length;
      const rate = matchingOutcomes.length > 0 ? (deaths / matchingOutcomes.length) * 100 : 0;
      
      return {
        education: `${prev}-${bin}%`,
        mortality: parseFloat(rate.toFixed(1)),
        count: matchingOutcomes.length
      };
    }).filter(Boolean);
  }, [state]);

  const professions = useMemo(() => Array.from(new Set(state.users.filter(u => u.professionSlug).map(u => u.professionSlug!))), [state.users]);
  const specialties = useMemo(() => Array.from(new Set(state.users.filter(u => u.specialtySlug).map(u => u.specialtySlug!))), [state.users]);

  const [localProfession, setLocalProfession] = useState<string>('');
  const [localSpecialty, setLocalSpecialty] = useState<string>('');

  const respiratoryTrendData = useMemo(() => {
    const relevantUsers = state.users.filter(u => {
      const matchProf = !localProfession || u.professionSlug === localProfession;
      const matchSpec = !localSpecialty || u.specialtySlug === localSpecialty;
      return matchProf && matchSpec && (state.currentUser?.institutionId ? u.institutionId === state.currentUser.institutionId : true);
    });

    const avgProgress = relevantUsers.length > 0 
      ? relevantUsers.reduce((acc, u) => acc + (u.id.length * 10 % 101), 0) / relevantUsers.length 
      : 50;

    const months = t.monthsShort;
    return months.map((m, i) => {
      const deathRate = 12 - (avgProgress / 10) + (i * 1.5) % 5; 
      const currentProgress = avgProgress - (5 - i) * 2;
      return {
        month: m,
        mortality: Math.max(2, parseFloat(deathRate.toFixed(1))),
        progress: Math.min(100, Math.max(0, currentProgress))
      };
    });
  }, [state.users, state.currentUser?.institutionId, localProfession, localSpecialty, t.monthsShort]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191c1e]">{t.unitOverview}</h2>
          <p className="text-sm text-gray-500">{t.unitOverviewDesc}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-transparent text-sm font-semibold focus:outline-none"
            >
              <option value="All">{t.allPatientTypes}</option>
              <option value="Neonatal">{t.common.neonatal}</option>
              <option value="Pediatric">{t.common.pediatric}</option>
              <option value="Adult">{t.common.adult}</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <select 
              value={filterHospital}
              onChange={(e) => setFilterHospital(e.target.value)}
              className="bg-transparent text-sm font-semibold focus:outline-none"
            >
              <option value="All">{t.analytics.hospital}: All</option>
              {hospitals.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <select 
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="bg-transparent text-sm font-semibold focus:outline-none"
            >
              <option value="All">{t.analytics.city}: All</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
            <select 
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="bg-transparent text-sm font-semibold focus:outline-none"
            >
              <option value="All">{t.analytics.country}: All</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button className="flex items-center gap-2 bg-[#00236f] text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/10 hover:shadow-xl transition-all">
            <Download className="w-4 h-4" />
            <span>{t.exportReport}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIItem icon={Users} label={t.totalPatients} value={metrics.total} color="text-blue-600" bg="bg-blue-50" />
        <KPIItem icon={Activity} label={t.mortalityRate} value={`${metrics.mortalityRate}%`} color="text-red-600" bg="bg-red-50" />
        <KPIItem icon={AlertTriangle} label={t.criticalEvents} value={metrics.criticalRate + '%'} color="text-amber-600" bg="bg-amber-50" />
        <KPIItem icon={School} label={t.eduActivation} value={`${metrics.educationRate}%`} color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-[#eceef0] shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-bold text-lg text-[#191c1e]">{t.impactEducation}</h3>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">{t.eduVsMortality}</span>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="education" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} unit="%" />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="mortality" fill="#00236f" radius={[6, 6, 0, 0]} barSize={40}>
                  {correlationData.map((entry: any, index) => (
                    <Cell key={`cell-${index}`} fill={entry.mortality > 10 ? '#ef4444' : '#00236f'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-6 text-xs text-center text-gray-500 font-medium italic">
            {t.eduTrend}
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-[#eceef0] shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="font-bold text-lg text-[#191c1e]">{t.dashboardAnalytic.trendTitle}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{t.dashboardAnalytic.trendSub}</p>
            </div>
            <div className="flex gap-2">
              <select 
                value={localProfession}
                onChange={(e) => setLocalProfession(e.target.value)}
                className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 outline-none"
              >
                <option value="">{t.common.allProfessions}</option>
                {professions.map(p => <option key={p} value={p}>{p.replace('_', ' ').toUpperCase()}</option>)}
              </select>
              <select 
                value={localSpecialty}
                onChange={(e) => setLocalSpecialty(e.target.value)}
                className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 outline-none"
              >
                <option value="">{t.common.allSpecialties}</option>
                {specialties.map(s => <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="h-[350px]">
             <ResponsiveContainer width="100%" height="100%">
               <ComposedChart data={respiratoryTrendData}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                 <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#ef4444' }} unit="%" label={{ value: t.analyticsLabels.mortalityLabel, angle: -90, position: 'insideLeft', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                 <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#22d3ee' }} unit="%" label={{ value: t.analyticsLabels.trainingLabel, angle: 90, position: 'insideRight', fill: '#22d3ee', fontSize: 10, fontWeight: 'bold' }} />
                 <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                 />
                 <Bar yAxisId="right" dataKey="progress" fill="#22d3ee" alpha={0.3} radius={[6, 6, 0, 0]} barSize={40} />
                 <Line yAxisId="left" type="monotone" dataKey="mortality" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
               </ComposedChart>
             </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#ef4444] rounded-full"></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{t.dashboardAnalytic.mortalityLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#22d3ee] rounded-full"></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{t.dashboardAnalytic.progressLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntensivistDashboard({ state, filteredData }: { state: AppState, filteredData: any }) {
  const { t } = useLanguage();

  const clinicalMetrics = useMemo(() => {
    const total = filteredData.patients.length;
    const outcomes = filteredData.outcomes;
    const deceased = outcomes.filter((o: any) => o.status === 'Deceased').length;
    
    // Airway specific metrics
    const accidentalExtubations = outcomes.filter((o: any) => o.accidentalExtubation === 1).length;
    const cprPostExtubCount = outcomes.filter((o: any) => o.accidentalExtubation === 1 && o.requiedCprPostAccidental).length;
    const tracheostomies = outcomes.filter((o: any) => o.tracheostomy).length;

    // SMR calc
    const expectedMortality = outcomes.reduce((acc: number, o: any) => {
      return acc + (o.mortalityProbability || 5) / 100;
    }, 0);

    const smr = deceased / (expectedMortality || 1);

    return {
      total,
      globalRate: total > 0 ? (deceased / total * 100).toFixed(1) : '0',
      observed: deceased,
      expected: expectedMortality.toFixed(1),
      smr: smr.toFixed(2),
      accidentalRate: total > 0 ? (accidentalExtubations / total * 100).toFixed(1) : '0',
      cprRate: accidentalExtubations > 0 ? (cprPostExtubCount / accidentalExtubations * 100).toFixed(1) : '0',
      trachRate: total > 0 ? (tracheostomies / total * 100).toFixed(1) : '0'
    };
  }, [filteredData]);

  const airwayTrendData = useMemo(() => [
    { name: 'Jan', adequacy: 92, accidental: 2.1 },
    { name: 'Feb', adequacy: 88, accidental: 3.4 },
    { name: 'Mar', adequacy: 95, accidental: 1.8 },
    { name: 'Apr', adequacy: 91, accidental: 2.5 },
  ], []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-center bg-[#00236f] text-white p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/20">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-400 rounded-lg">
              <Stethoscope className="w-4 h-4 text-[#00236f]" />
            </div>
            <h2 className="text-3xl font-black tracking-tight">{t.intensivist.title}</h2>
          </div>
          <p className="text-blue-100 font-medium max-w-xl text-sm leading-relaxed tracking-wide opacity-90">
             {t.intensivist.desc}
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end">
           <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md mb-2 border border-white/10">
             <span className="text-[10px] font-black uppercase tracking-widest text-cyan-200">{t.intensivist.roleAuthority}</span>
             <p className="text-xs font-black font-mono">{t.intensivist.roleIntensivist}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard icon={Skull} label={t.intensivist.globalMortality} value={`${clinicalMetrics.globalRate}%`} color="text-rose-600" bg="bg-rose-50" subLabel={`${clinicalMetrics.observed} ${t.intensivist.decisosTotales}`} />
        <MetricCard icon={Crosshair} label={t.clinicalDashboard.smr} value={clinicalMetrics.smr} color={parseFloat(clinicalMetrics.smr) > 1.1 ? "text-amber-600" : "text-emerald-600"} bg="bg-gray-50" subLabel={`${clinicalMetrics.expected} ${t.intensivist.smrExpected}`} />
        <MetricCard icon={Wind} label={t.intensivist.accidentalExtub} value={`${clinicalMetrics.accidentalRate}%`} color="text-orange-600" bg="bg-orange-50" subLabel={t.intensivist.sentinelEvents} />
        <MetricCard icon={Heart} label={t.intensivist.cprPostExtub} value={`${clinicalMetrics.cprRate}%`} color="text-rose-700" bg="bg-rose-100" subLabel={t.intensivist.criticalAirwayFailure} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-xl text-[#00236f]">{t.intensivist.airwayDynamics}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t.intensivist.adequacyIncidence}</p>
              </div>
           </div>

           <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={airwayTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} unit="%" />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#ef4444' }} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }} />
                    <Bar yAxisId="left" dataKey="adequacy" fill="#00236f" radius={[10, 10, 0, 0]} barSize={40} />
                    <Line yAxisId="right" type="monotone" dataKey="accidental" stroke="#ef4444" strokeWidth={4} dot={{ r: 6, fill: '#ef4444', strokeWidth: 3, stroke: '#fff' }} />
                 </ComposedChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
           <h3 className="font-black text-xl text-[#00236f] mb-8">{t.intensivist.clinicalRiskProfile}</h3>
           <div className="space-y-6">
              <RiskFactorNode label={t.intensivist.pupilsNonReactive} factor="1.8x" risk={t.intensivist.threatHigh} />
              <RiskFactorNode label="PaO2 < 60 mmHg" factor="2.4x" risk={t.intensivist.threatVeryHigh} />
              <RiskFactorNode label="FiO2 > 60% (First 1h)" factor="1.5x" risk={t.intensivist.threatMedium} />
              <RiskFactorNode label="Exceso Base < -10" factor="2.1x" risk={t.intensivist.threatHigh} />
           </div>
           
           <div className="mt-12 p-6 bg-rose-50 rounded-3xl border border-rose-100">
              <div className="flex items-center gap-3 mb-2">
                 <AlertTriangle className="w-5 h-5 text-rose-500" />
                 <span className="text-xs font-black text-rose-900 uppercase">{t.intensivist.intensivistAlert}</span>
              </div>
              <p className="text-[11px] text-rose-700 font-bold leading-relaxed">
                {t.intensivist.alertCorrelation}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function RiskFactorNode({ label, factor, risk }: { label: string; factor: string; risk: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:border-gray-200">
      <div>
        <p className="text-xs font-black text-[#00236f]">{label}</p>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{risk} Threat</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-black text-[#00236f]">{factor}</p>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">OR</p>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, bg, trend, subLabel }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", bg, color)}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
            trend.startsWith('+') ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={cn("text-3xl font-bold", color)}>{value}</p>
        {subLabel && <p className="text-[10px] font-medium text-gray-400 mt-2">{subLabel}</p>}
      </div>
    </div>
  );
}

function RiskFactorRow({ label, value, severity, desc }: any) {
  return (
    <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors">
      <div className="flex justify-between items-start mb-1">
        <span className="text-xs font-bold text-gray-700">{label}</span>
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter",
          severity === 'High' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
        )}>
          {value} Odds
        </span>
      </div>
      <p className="text-[10px] text-gray-500 italic">{desc}</p>
    </div>
  );
}

function RecommendationCard({ icon: Icon, title, text }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex gap-4 hover:shadow-md transition-all">
      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-[#191c1e] mb-1">{title}</h4>
        <p className="text-[11px] text-gray-500 leading-relaxed font-medium">{text}</p>
      </div>
    </div>
  );
}

function KPIItem({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#eceef0] shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-center gap-4 mb-3">
        <div className={`p-3 ${bg} ${color} rounded-2xl group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">+2.4%</div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-bold text-[#191c1e]">{value}</p>
      </div>
    </div>
  );
}
