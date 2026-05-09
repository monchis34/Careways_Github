import React, { useState, useMemo } from 'react';
import { AppState, Patient, Outcome } from '../types';
import { useLanguage } from '../App';
import { differenceInYears, parseISO, format } from 'date-fns';
import { 
  ArrowLeft, FileText, Activity, AlertCircle, Heart, Lock, CheckCircle2,
  Calendar, MapPin, Search, Wind, Droplets, Baby, Upload, User, Layout, Plus, Clock, Info, ShieldCheck, PlayCircle, Printer, Download, Pill, Stethoscope, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PatientReportViewProps {
  state: AppState;
  patientHash: string;
  onBack: () => void;
}

export default function PatientReportView({ state, patientHash, onBack }: PatientReportViewProps) {
  const { t } = useLanguage();
  const patient = state.patients.find(p => p.patientHash === patientHash);
  const outcome = state.outcomes.find(o => o.patientHash === patientHash);

  const [activeTab, setActiveTab] = useState('overview');

  if (!patient || !outcome) {
    return <div className="p-12 text-center">Patient record not found.</div>;
  }

  const age = patient.birthDate ? differenceInYears(new Date(), parseISO(patient.birthDate)) : 0;
  // Calculate mock completion %
  const completionPercentage = outcome.status === 'Living' ? 75 : 100;
  
  const tabs = [
    { id: 'overview', label: t.patientReport.patientOverview, icon: Layout },
    { id: 'timeline', label: t.patientReport.icuEvolution, icon: Clock },
    { id: 'airway', label: t.patientReport.airwayManagement, icon: Wind },
    { id: 'events', label: t.patientReport.criticalEvents, icon: AlertTriangle },
    { id: 'vitals', label: t.patientReport.vitalSigns, icon: Activity },
    { id: 'meds', label: t.patientReport.medications, icon: Pill },
    { id: 'diagnosis', label: t.patientReport.diagnoses, icon: Stethoscope },
    { id: 'pim3', label: t.patientReport.pim3Risk, icon: ShieldCheck },
    { id: 'notes', label: t.patientReport.clinicalNotes, icon: FileText },
    { id: 'attachments', label: t.patientReport.attachments, icon: Upload },
    { id: 'audit', label: t.patientReport.auditTrail, icon: Lock },
  ];

  return (
    <div style={{ fontFamily: "'Neue Haas Grotesk Display', Arial, sans-serif" }} className="min-h-screen bg-[#F6FBFF] pb-24 text-[#204071]">
      
      {/* Sticky Patient Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-full transition-colors group">
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-[#204071]" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#3796D8] border border-blue-100 shadow-inner">
                <Baby className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-[#191c1e] tracking-tight">{patient.name || 'Unknown Patient'}</h1>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-mono font-bold">
                    ID: {patient.identifier || patient.mrn}
                  </span>
                  {outcome.status === 'Deceased' ? (
                     <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[10px] font-bold uppercase tracking-widest">
                       High Risk
                     </span>
                  ) : (
                     <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold uppercase tracking-widest">
                       Stable
                     </span>
                  )}
                  {outcome.mechanicalVentilation && (
                     <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                       <Wind className="w-3 h-3" /> Ventilated
                     </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-medium">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {patient.hospital} • {patient.city}, {patient.country}</span>
                  <span>•</span>
                  <span>{patient.type} ICU</span>
                  <span>•</span>
                  <span>DOB: {patient.birthDate ? format(new Date(patient.birthDate), 'MMM dd, yyyy') : 'N/A'} ({age} yrs)</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t.patientReport.recordCompletion}</p>
               <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden flex items-center">
                 <div className="h-full bg-[#3796D8]" style={{ width: `${completionPercentage}%` }}></div>
               </div>
             </div>
             
             {/* Clinical Users */}
             <div className="flex -space-x-2">
               <div className="w-8 h-8 rounded-full border-2 border-white bg-[#204071] flex items-center justify-center text-white text-[10px] font-bold z-30" title="Dr. Sarah Mitchell - Intensivist">SM</div>
               <div className="w-8 h-8 rounded-full border-2 border-white bg-[#3796D8] flex items-center justify-center text-white text-[10px] font-bold z-20" title="Nurse Emily Carter">EC</div>
               <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-gray-500 text-[10px] font-bold z-10">
                 <Plus className="w-3 h-3" />
               </div>
             </div>
             
             <button className="flex items-center gap-2 bg-[#204071] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:shadow-md transition-all">
               <Printer className="w-4 h-4" /> {t.patientReport.generateReport}
             </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 px-6 border-t border-gray-50 scrollbar-hide">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap",
                  isActive 
                    ? "border-[#204071] text-[#204071] bg-blue-50/50" 
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <tab.icon className={cn("w-4 h-4", isActive ? "text-[#3796D8]" : "text-gray-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-2"><Calendar className="w-3 h-3" /> {t.patientReport.icuStayDuration}</p>
                    <p className="text-2xl font-black text-[#204071]">
                      {patient.admissionDate ? Math.max(1, differenceInYears(new Date(), parseISO(patient.admissionDate)) * 365) : 3} <span className="text-sm text-gray-400 font-medium">{t.patientReport.days}</span>
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-2"><Wind className="w-3 h-3" /> {t.patientReport.ventilation}</p>
                    {outcome.mechanicalVentilation ? (
                       <p className="text-2xl font-black text-[#3796D8]">{t.patientReport.active}</p>
                    ) : (
                       <p className="text-2xl font-black text-gray-300">{t.patientReport.none}</p>
                    )}
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-2"><ShieldCheck className="w-3 h-3" /> {t.patientReport.pim3Score}</p>
                    <p className="text-2xl font-black text-[#204071]">{outcome.pim3Score || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mb-2"><Heart className="w-3 h-3" /> {t.patientReport.mortalityRisk}</p>
                    <p className="text-2xl font-black text-[#FFE362]">{outcome.mortalityProbability || 'N/A'}%</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                   <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-[#204071]"><Stethoscope className="w-4 h-4 text-[#3796D8]" /> {t.patientReport.primaryDiagnosis}</h3>
                   <p className="text-lg font-medium text-gray-800">{outcome.diagnosis || t.patientReport.noPrimaryDiagnosis}</p>
                </div>
              </motion.div>
            )}
            
            {activeTab === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm"
              >
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                   
                   {/* ICU Admission Event */}
                   <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-[#3796D8] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                         <MapPin className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                         <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-bold text-[#204071]">{t.patientReport.mockTimeline.icuAdmission}</div>
                            <time className="font-mono text-xs text-gray-400 uppercase">{patient.admissionDate || 'N/A'}</time>
                         </div>
                         <div className="text-sm text-gray-500">{t.patientReport.mockTimeline.icuAdmissionDesc}</div>
                      </div>
                   </div>

                   {/* Intubation Event (if applicable) */}
                   {outcome.intubationDateTime && (
                     <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-amber-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                           <Wind className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-gray-100 bg-white shadow-sm">
                           <div className="flex items-center justify-between space-x-2 mb-1">
                              <div className="font-bold text-amber-600">{t.patientReport.mockTimeline.intubation}</div>
                              <time className="font-mono text-xs text-gray-400 uppercase">{format(new Date(outcome.intubationDateTime), 'MMM dd, yyyy HH:mm')}</time>
                           </div>
                           <div className="text-sm text-gray-500">{t.patientReport.mockTimeline.intubationDesc} - Size: {outcome.ettSize}mm.</div>
                        </div>
                     </div>
                   )}
                   
                   {/* More events based on outcomes could be appended here mockingly */}
                   
                </div>
              </motion.div>
            )}

            {activeTab === 'airway' && (
              <motion.div
                key="airway"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                 <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-[#204071]"><Wind className="w-4 h-4 text-[#3796D8]" /> Airway Management Registry</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <div className="flex justify-between p-4 bg-gray-50 rounded-xl">
                             <span className="font-bold text-sm text-gray-600">Intubated</span>
                             <span className="font-black text-[#204071]">{outcome.intubated === 1 ? 'Yes' : 'No'}</span>
                          </div>
                          {outcome.intubated === 1 && (
                             <>
                               <div className="flex justify-between p-4 bg-cyan-50 rounded-xl">
                                 <span className="font-bold text-sm text-cyan-900">ETT Size Used</span>
                                 <span className="font-black text-cyan-700">{outcome.ettSize} mm</span>
                               </div>
                               <div className="flex justify-between gap-4">
                                  <div className="flex-1 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                                     <span className="font-bold text-sm text-gray-600">Tube Cuffed</span>
                                     <span className="font-black">{outcome.ettCuffed ? 'Yes' : 'No'}</span>
                                  </div>
                                  <div className="flex-1 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                                     <span className="font-bold text-sm text-gray-600">Adequate Size</span>
                                     <span className="font-black">{outcome.ettAdequate ? 'Yes' : 'No'}</span>
                                  </div>
                               </div>
                             </>
                          )}
                       </div>
                       
                       <div className="space-y-4">
                          {/* Extubation History Mock */}
                          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Extubation History</h4>
                          
                          <div className={cn("p-4 rounded-xl border flex items-center justify-between", outcome.accidentalExtubation === 1 ? "bg-rose-50 border-rose-100" : "bg-gray-50 border-gray-100")}>
                             <div className="flex items-center gap-2">
                               {outcome.accidentalExtubation === 1 ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : <CheckCircle2 className="w-4 h-4 text-gray-400" />}
                               <span className={cn("font-bold text-sm", outcome.accidentalExtubation === 1 ? "text-rose-900" : "text-gray-600")}>Accidental Extubation Event</span>
                             </div>
                             <span className={cn("font-black", outcome.accidentalExtubation === 1 ? "text-rose-600" : "text-gray-400")}>{outcome.accidentalExtubation === 1 ? `${outcome.accidentalExtubationCount} Events` : 'None'}</span>
                          </div>
                          
                          <div className={cn("p-4 rounded-xl border flex items-center justify-between", outcome.electiveExtubation ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100")}>
                             <div className="flex items-center gap-2">
                               <Wind className={cn("w-4 h-4", outcome.electiveExtubation ? "text-emerald-500" : "text-gray-400")} />
                               <span className={cn("font-bold text-sm", outcome.electiveExtubation ? "text-emerald-900" : "text-gray-600")}>Elective Extubation</span>
                             </div>
                             <span className={cn("font-black", outcome.electiveExtubation ? "text-emerald-600" : "text-gray-400")}>{outcome.electiveExtubation ? outcome.electiveExtubationDate : 'N/A'}</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'events' && (
              <motion.div
                key="events"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                 <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-[#204071]"><AlertTriangle className="w-4 h-4 text-amber-500" /> Critical Events Panel</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className={cn("p-6 rounded-2xl border flex flex-col gap-3", outcome.accidentalExtubation === 1 ? "bg-rose-50 border-rose-100" : "bg-gray-50 border-gray-100")}>
                          <div className="flex items-center gap-3">
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", outcome.accidentalExtubation === 1 ? "bg-rose-100 text-rose-500" : "bg-gray-200 text-gray-500")}>
                                <AlertTriangle className="w-5 h-5" />
                             </div>
                             <div>
                                <h4 className={cn("font-bold text-sm", outcome.accidentalExtubation === 1 ? "text-rose-900" : "text-gray-500")}>Accidental Extubation</h4>
                                <p className="text-xs text-gray-500">{outcome.accidentalExtubation === 1 ? `${outcome.accidentalExtubationCount} Events Recorded` : 'No events recorded'}</p>
                             </div>
                          </div>
                          {outcome.accidentalExtubation === 1 && outcome.requiedCprPostAccidental && (
                             <div className="mt-2 px-3 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-2 w-max">
                               <Heart className="w-4 h-4" /> CPR Required post-event
                             </div>
                          )}
                       </div>

                       <div className={cn("p-6 rounded-2xl border flex flex-col gap-3", outcome.reintubationNeededPostElective ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100")}>
                          <div className="flex items-center gap-3">
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", outcome.reintubationNeededPostElective ? "bg-amber-100 text-amber-500" : "bg-gray-200 text-gray-500")}>
                                <Activity className="w-5 h-5" />
                             </div>
                             <div>
                                <h4 className={cn("font-bold text-sm", outcome.reintubationNeededPostElective ? "text-amber-900" : "text-gray-500")}>Reintubation Attempt</h4>
                                <p className="text-xs text-gray-500">{outcome.reintubationNeededPostElective ? 'Required after elective extubation' : 'None required'}</p>
                             </div>
                          </div>
                       </div>
                       
                       <div className={cn("p-6 rounded-2xl border flex flex-col gap-3", outcome.mechanicalVentilation ? "bg-cyan-50 border-cyan-100" : "bg-gray-50 border-gray-100")}>
                          <div className="flex items-center gap-3">
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", outcome.mechanicalVentilation ? "bg-cyan-100 text-cyan-600" : "bg-gray-200 text-gray-500")}>
                                <Wind className="w-5 h-5" />
                             </div>
                             <div>
                                <h4 className={cn("font-bold text-sm", outcome.mechanicalVentilation ? "text-cyan-900" : "text-gray-500")}>Mechanical Ventilation</h4>
                                <p className="text-xs text-gray-500">{outcome.mechanicalVentilation ? 'Currently ventilated. Monitor settings.' : 'Not required'}</p>
                             </div>
                          </div>
                       </div>
                       
                       <div className={cn("p-6 rounded-2xl border flex flex-col gap-3", outcome.status === 'Deceased' ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100")}>
                          <div className="flex items-center gap-3">
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", outcome.status === 'Deceased' ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-500")}>
                                <User className="w-5 h-5" />
                             </div>
                             <div>
                                <h4 className={cn("font-bold text-sm", outcome.status === 'Deceased' ? "text-white" : "text-gray-500")}>Mortality</h4>
                                <p className={cn("text-xs", outcome.status === 'Deceased' ? "text-gray-400" : "text-gray-500")}>{outcome.status === 'Deceased' ? 'Deceased' : 'Living'}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'pim3' && (
              <motion.div
                key="pim3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                 <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1 space-y-6">
                       <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-[#204071]"><ShieldCheck className="w-4 h-4 text-[#3796D8]" /> PIM3 Risk Assessment</h3>
                       
                       <div className="space-y-4">
                          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                            <span className="font-bold text-gray-600">Calculated PIM3 Score</span>
                            <span className="font-black text-xl text-[#204071]">{outcome.pim3Score || 0}</span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                            <span className="font-bold text-gray-600">Manual Risk Override</span>
                            <span className="font-black text-xl text-[#204071]">{outcome.manualMortalityProbability || outcome.mortalityProbability || 0}%</span>
                          </div>
                          
                          <div className="pt-4 space-y-2">
                             <div className="flex justify-between items-center text-sm">
                               <span className="text-gray-500">Low Risk Diagnosis</span>
                               <CheckCircle2 className={cn("w-4 h-4", outcome.pim3LowRiskDiagnosis ? "text-[#3796D8]" : "text-gray-300")} />
                             </div>
                             <div className="flex justify-between items-center text-sm">
                               <span className="text-gray-500">High Risk Diagnosis</span>
                               <CheckCircle2 className={cn("w-4 h-4", outcome.pim3HighRiskDiagnosis ? "text-amber-500" : "text-gray-300")} />
                             </div>
                             <div className="flex justify-between items-center text-sm">
                               <span className="text-gray-500">Very High Risk Diagnosis</span>
                               <CheckCircle2 className={cn("w-4 h-4", outcome.pim3VeryHighRiskDiagnosis ? "text-rose-500" : "text-gray-300")} />
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    <div className="w-64 h-64 shrink-0 relative flex items-center justify-center rounded-full border-8 border-gray-50 shadow-inner">
                       <div className="absolute inset-0 rounded-full border-8 border-transparent border-t-[#3796D8] border-r-[#3796D8] rotate-45 opacity-20"></div>
                       {/* This could be a real radial chart or gauge, simulating with stylized div */}
                       <div className="text-center">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mortality Prob.</p>
                          <p className="text-5xl font-black text-[#204071]">{outcome.mortalityProbability || 0}%</p>
                          <p className={cn("text-xs font-bold uppercase tracking-widest mt-2", 
                             (outcome.mortalityProbability || 0) < 10 ? "text-emerald-500" : 
                             (outcome.mortalityProbability || 0) < 30 ? "text-amber-500" : "text-rose-500"
                          )}>
                             {(outcome.mortalityProbability || 0) < 10 ? 'Low Risk' : (outcome.mortalityProbability || 0) < 30 ? 'Moderate Risk' : 'High Risk'}
                          </p>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'vitals' && (
              <motion.div
                key="vitals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                 <div className="bg-[#1e2329] p-6 rounded-2xl flex flex-col justify-between h-40">
                    <p className="text-[#85F0D4] font-mono text-xs uppercase tracking-widest">Systolic BP</p>
                    <p className="text-5xl font-black text-white font-mono">{outcome.systolicBP || '--'} <span className="text-sm text-gray-500">mmHg</span></p>
                 </div>
                 <div className="bg-[#1e2329] p-6 rounded-2xl flex flex-col justify-between h-40">
                    <p className="text-[#3796D8] font-mono text-xs uppercase tracking-widest">FiO2</p>
                    <p className="text-5xl font-black text-white font-mono">{outcome.fiO2 || 21} <span className="text-sm text-gray-500">%</span></p>
                 </div>
                 <div className="bg-[#1e2329] p-6 rounded-2xl flex flex-col justify-between h-40">
                    <p className="text-[#FFE362] font-mono text-xs uppercase tracking-widest">PaO2</p>
                    <p className="text-5xl font-black text-white font-mono">{outcome.paO2 || '--'} <span className="text-sm text-gray-500">mmHg</span></p>
                 </div>
                 <div className="bg-[#1e2329] p-6 rounded-2xl flex flex-col justify-between h-40">
                    <p className="text-rose-400 font-mono text-xs uppercase tracking-widest">Base Excess</p>
                    <p className="text-5xl font-black text-white font-mono">{outcome.baseExcess || '0.0'}</p>
                 </div>
                 
                 <div className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col justify-between h-40">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1"><User className="w-3 h-3" /> Weight</p>
                    <p className="text-3xl font-black text-[#204071]">{outcome.weight || '--'} <span className="text-sm text-gray-500">kg</span></p>
                 </div>
                 <div className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col justify-between h-40">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1"><Activity className="w-3 h-3" /> Pupillary Resp</p>
                    <p className="text-2xl font-black text-[#204071]">{outcome.pupils === 1 ? 'Reactive' : 'Non-reactive'}</p>
                 </div>
                 <div className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col justify-between h-40">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Recovery</p>
                    <p className="text-2xl font-black text-[#204071]">{outcome.surgeryRecovery ? 'Yes' : 'No'}</p>
                 </div>
                 <div className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col justify-between h-40">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1"><Clock className="w-3 h-3" /> Elective Adm.</p>
                    <p className="text-2xl font-black text-[#204071]">{outcome.electiveAdmission ? 'Yes' : 'No'}</p>
                 </div>
              </motion.div>
            )}

            {!['overview', 'timeline', 'airway', 'events', 'pim3', 'vitals'].includes(activeTab) && (
              <motion.div
                key="other"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400 flex flex-col items-center justify-center min-h-[400px]"
              >
                 <Info className="w-12 h-12 mb-4 opacity-20" />
                 <h3 className="text-xl font-bold text-gray-500 mb-2">{t.patientReport.moduleLoaded}</h3>
                 <p className="text-sm">{t.patientReport.moduleLoadedDesc}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar: Dynamic Activity Feed */}
        <div className="w-[320px] shrink-0 hidden xl:block">
           <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-32">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#204071] mb-6 flex items-center gap-2">
                <Activity className="w-3 h-3 text-[#3796D8]" /> {t.patientReport.clinicalActivityFeed}
              </h3>
              
              <div className="space-y-6">
                 {/* Mock Feed Items */}
                 <div className="flex gap-3">
                   <div className="w-8 h-8 rounded-full border border-gray-100 bg-[#F6FBFF] flex items-center justify-center text-[#204071] text-[10px] font-bold shrink-0">SM</div>
                   <div>
                     <p className="text-xs font-bold text-[#191c1e]">Dr. Sarah Mitchell</p>
                     <p className="text-[10px] font-medium text-[#3796D8] mb-1">Pediatric Intensivist</p>
                     <p className="text-xs text-gray-600 mb-1">Updated Airway Management</p>
                     <p className="text-[9px] font-mono text-gray-400">08:42 AM</p>
                   </div>
                 </div>

                 <div className="flex gap-3">
                   <div className="w-8 h-8 rounded-full border border-gray-100 bg-[#F6FBFF] flex items-center justify-center text-[#204071] text-[10px] font-bold shrink-0">EC</div>
                   <div>
                     <p className="text-xs font-bold text-[#191c1e]">Nurse Emily Carter</p>
                     <p className="text-[10px] font-medium text-[#3796D8] mb-1">PICU Nurse</p>
                     <p className="text-xs text-gray-600 mb-1">Updated Vital Signs</p>
                     <p className="text-[9px] font-mono text-gray-400">09:10 AM</p>
                   </div>
                 </div>
              </div>
           </div>
        </div>
        
      </div>
    </div>
  );
}
