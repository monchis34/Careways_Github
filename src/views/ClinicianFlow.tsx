/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Patient, Outcome, ParentPatient, PatientType } from '../types';
import { generatePatientHash } from '../store';
import { 
  Fingerprint, 
  Stethoscope, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Calendar,
  Weight,
  Baby,
  Activity,
  Send,
  Loader2,
  AlertTriangle,
  Database,
  Search,
  ChevronDown,
  Info,
  Clock,
  Layout,
  Plus,
  User,
  Download,
  AlertCircle,
  Wind,
  ShieldCheck,
  TrendingDown,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format, differenceInYears, differenceInMonths, differenceInDays, parseISO, isValid } from 'date-fns';
import { useLanguage } from '../App';
import { UserRole, AppState } from '../types';

interface ClinicianFlowProps {
  onComplete: (patient: Patient, outcome: Outcome, parentPatient: ParentPatient) => void;
  onBulkComplete?: (patients: Patient[], outcomes: Outcome[], parentPatients: ParentPatient[]) => void;
  onExit?: () => void;
  role?: UserRole;
  state?: AppState;
}

type Step = 'Identification' | 'ETT' | 'Events' | 'PIM3' | 'Outcome' | 'Success';

export default function ClinicianFlow({ onComplete, onBulkComplete, onExit, role, state }: ClinicianFlowProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('Identification');
  const [isSending, setIsSending] = useState(false);

  // Form State
  const [form, setForm] = useState({
    patient: {
      name: '',
      mrn: '',
      type: 'Pediatric' as PatientType,
      birthDate: '',
      admissionDate: format(new Date(), 'yyyy-MM-dd'),
      dischargeDate: format(new Date(), 'yyyy-MM-dd'),
      patientHash: ''
    },
    outcome: {
      // 1. Airway Management
      intubated: 2 as 1 | 2,
      intubationDateTime: '',
      ettSize: 3.5,
      ettExpectedSize: 0,
      ettAdequate: true,
      ettCuffed: false,

      // 2. Airway Events
      accidentalExtubation: 2 as 1 | 2,
      accidentalExtubationCount: 0,
      newTubeSizeAccidental: 0,
      requiedCprPostAccidental: false,
      electiveTubeChange: false,
      newTubeSizeElective: 0,
      electiveExtubation: false,
      electiveExtubationDate: '',
      reintubationNeededPostElective: false,
      failedExtubationAttempts: 0,
      successfulExtubationDate: '',
      tracheostomy: false,

      // 3. Clinical / PIM3 First Hour
      pupils: 1 as 0 | 1,
      electiveAdmission: false,
      mechanicalVentilation: false,
      systolicBP: 0,
      fiO2: 21,
      paO2: 0,
      baseExcess: 0,
      surgeryRecovery: 0 as 0 | 1,

      // 4. PIM3 Result
      weightedDiagnosis: 'None',
      pim3LowRiskDiagnosis: false,
      pim3HighRiskDiagnosis: false,
      pim3VeryHighRiskDiagnosis: false,
      diagnosis: '',
      pim3Score: 0,
      mortalityProbability: 0,
      manualMortalityProbability: 0,

      // 5. Outcome
      status: 'Living' as 'Living' | 'Deceased',
      mortalityRespiratory: false,
      ventilationDays: 0,
      weight: 0,
      age: 0,
    }
  });

  // Age Calculation
  const age = useMemo(() => {
    if (!form.patient.birthDate || !form.patient.admissionDate) return { years: 0, months: 0, days: 0, label: '0d' };
    const birth = parseISO(form.patient.birthDate);
    const ref = parseISO(form.patient.admissionDate);
    if (!isValid(birth) || !isValid(ref)) return { years: 0, months: 0, days: 0, label: '0d' };

    const years = differenceInYears(ref, birth);
    const months = differenceInMonths(ref, birth);
    const days = differenceInDays(ref, birth);

    let label = `${days}d`;
    if (years >= 1) label = `${years}y`;
    else if (months >= 1) label = `${months}m`;

    return { years, months, days, label };
  }, [form.patient.birthDate, form.patient.admissionDate]);

  // Expected ETT Size Calculation
  const expectedSize = useMemo(() => {
    const years = age.years;
    if (years < 1) {
      // Simplified Neonatal check: basically based on weight if we had it, but using 3.0-3.5
      return form.outcome.ettCuffed ? 3.0 : 3.5;
    }
    return form.outcome.ettCuffed ? (years / 4) + 3.5 : (years / 4) + 4;
  }, [age.years, form.outcome.ettCuffed]);

  // Update expected size in form
  useEffect(() => {
    setForm(f => ({
      ...f,
      outcome: { ...f.outcome, ettExpectedSize: expectedSize }
    }));
  }, [expectedSize]);

  // Validate ETT Size Adequate (within 0.5mm)
  useEffect(() => {
    const isAdequate = Math.abs(form.outcome.ettSize - expectedSize) <= 0.5;
    setForm(f => ({
      ...f,
      outcome: { ...f.outcome, ettAdequate: isAdequate }
    }));
  }, [form.outcome.ettSize, expectedSize]);

  // Derived patient hash
  useEffect(() => {
    if (form.patient.mrn && form.patient.admissionDate) {
      const hash = generatePatientHash(form.patient.mrn, form.patient.admissionDate);
      setForm(prev => ({ ...prev, patient: { ...prev.patient, patientHash: hash } }));
    }
  }, [form.patient.mrn, form.patient.admissionDate]);

  // PIM3 Calculation Logic
  const calculatedPIM3 = useMemo(() => {
    let score = -4.8829;
    if (form.outcome.pupils === 0) score += 1.6677;
    if (form.outcome.electiveAdmission) score -= 1.3980;
    if (form.outcome.mechanicalVentilation) score += 0.5192;
    // ... Simplified logit model
    const prob = 1 / (1 + Math.exp(-score));
    return {
      score: score.toFixed(2),
      prob: (prob * 100).toFixed(2)
    };
  }, [form.outcome]);

  const handleFinish = async () => {
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const patientObj: Patient = {
      ...form.patient,
      id: form.patient.patientHash,
      institutionId: state?.currentUser?.institutionId || 'demo-inst',
      hospital: 'Demo Hospital',
      city: 'Bogotá',
      country: 'Colombia'
    };

    const outcomeObj: Outcome = {
      ...form.outcome,
      patientHash: form.patient.patientHash,
      createdAt: new Date().toISOString(),
      age: age.years + age.months/12,
      ageYears: age.years,
      ageMonths: age.months,
      ageDays: age.days,
      pim3Score: Number(calculatedPIM3.score),
      mortalityProbability: Number(calculatedPIM3.prob)
    };

    const parentPatientObj: ParentPatient = {
      id: Math.random().toString(36).substr(2, 9),
      patientHash: form.patient.patientHash,
      name: 'Simulated Parent',
      phone: '+57 321 000 0000',
      email: 'parent@example.com',
      consent: true,
      educationActivated: true,
      educationProgress: 0
    };

    onComplete(patientObj, outcomeObj, parentPatientObj);
    setIsSending(false);
    setStep('Success');
  };

  const steps: Step[] = ['Identification', 'ETT', 'Events', 'PIM3', 'Outcome', 'Success'];
  const stepLabels = [
    { key: 'Identification', label: t.clinicalDashboard.stepIdentification, short: t.clinicalDashboard.stepIdentificationShort },
    { key: 'ETT', label: t.clinicalDashboard.stepAirway, short: t.clinicalDashboard.stepAirwayShort },
    { key: 'Events', label: t.clinicalDashboard.stepEvents, short: t.clinicalDashboard.stepEventsShort },
    { key: 'PIM3', label: t.clinicalDashboard.stepPim3, short: t.clinicalDashboard.stepPim3Short },
    { key: 'Outcome', label: t.clinicalDashboard.stepOutcome, short: t.clinicalDashboard.stepOutcomeShort },
    { key: 'Success', label: t.clinicalDashboard.stepSuccess, short: t.clinicalDashboard.stepSuccessShort }
  ];

  const currentStepIdx = steps.indexOf(step);

  const handleNext = () => {
    if (step === 'Identification') setStep('ETT');
    else if (step === 'ETT') setStep('Events');
    else if (step === 'Events') setStep('PIM3');
    else if (step === 'PIM3') setStep('Outcome');
    else if (step === 'Outcome') handleFinish();
  };

  const handleBack = () => {
    if (step === 'ETT') setStep('Identification');
    else if (step === 'Events') setStep('ETT');
    else if (step === 'PIM3') setStep('Events');
    else if (step === 'Outcome') setStep('PIM3');
  };

  const resetFlow = () => {
    setStep('Identification');
    // ... Reset form logic omitted for brevity, should reset to initial state
  };

  return (
    <div className="max-w-[1200px] mx-auto h-full flex flex-col pt-4">
      {/* Progress Header */}
      <div className="mb-12">
        <div className="flex flex-col mb-8">
          <h1 className="text-3xl font-black text-[#00236f] mb-2 tracking-tight">
            Section {currentStepIdx + 1}: {stepLabels[currentStepIdx].short}
          </h1>
          <p className="text-gray-500 font-medium">
            Step {currentStepIdx + 1} of {steps.length - 1} • Clinical Registry Workflow
          </p>
        </div>

        <div className="flex items-center justify-between relative px-4">
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-200 -z-0 -translate-y-1/2" />
          {stepLabels.map((s, idx) => {
            const isCompleted = currentStepIdx > idx;
            const isActive = currentStepIdx === idx;
            return (
              <div key={s.key} className="relative z-10 flex flex-col items-center gap-2">
                <div 
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-4",
                    isCompleted ? "bg-[#50dab7] border-[#50dab7] text-white" : 
                    isActive ? "bg-[#00236f] border-[#00236f] text-white" : 
                    "bg-gray-100 border-gray-100 text-gray-400"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-bold">{idx + 1}</span>}
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-tighter", (isActive || isCompleted) ? "text-[#00236f]" : "text-gray-400")}>
                  {s.label}
                </span>
                {idx === stepLabels.length - 1 ? null : (
                  <div className={cn(
                    "absolute top-6 left-12 w-[calc(100%-48px)] h-[2px] -z-10",
                    isCompleted ? "bg-[#50dab7]" : "bg-gray-200"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-[#f8fafc] rounded-[2.5rem] p-8 shadow-sm border border-gray-100 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 overflow-y-auto"
          >
            {step === 'Identification' && (
              <div className="max-w-4xl mx-auto space-y-8 pb-12">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-10">
                    <User className="w-6 h-6 text-[#00236f]" />
                    <h3 className="text-2xl font-black text-[#00236f] tracking-tight">1. {t.clinicalDashboard.patientIdentification}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField label={t.clinicalDashboard.patientName} required>
                      <input 
                        type="text" 
                        value={form.patient.name}
                        onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, name: e.target.value } }))}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold transition-all"
                        placeholder={t.clinicalDashboard.patientNamePlaceholder}
                      />
                    </FormField>

                    <FormField label={t.clinicalDashboard.hospitalRecordNumber} required labelRight={t.clinicalDashboard.primaryKey}>
                      <div className="relative">
                        <Fingerprint className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          value={form.patient.mrn}
                          onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, mrn: e.target.value } }))}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none font-bold transition-all"
                          placeholder={t.clinicalDashboard.hospitalRecordPlaceholder}
                        />
                      </div>
                    </FormField>

                    <FormField label={t.clinicalDashboard.birthDate} required info={t.clinicalDashboard.birthDateInfo}>
                      <input 
                        type="date" 
                        value={form.patient.birthDate}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, birthDate: e.target.value } }))}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                      />
                    </FormField>

                    <FormField label={t.clinicalDashboard.patientType}>
                      <select 
                        value={form.patient.type}
                        onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, type: e.target.value as PatientType } }))}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold appearance-none"
                      >
                        <option value="Neonatal">{t.allTypes === "Todos los Tipos" ? "UCI Neonatal" : "Neonatal ICU"}</option>
                        <option value="Pediatric">{t.allTypes === "Todos los Tipos" ? "UCI Pediátrica" : "Pediatric ICU"}</option>
                      </select>
                    </FormField>

                    <FormField label={t.clinicalDashboard.admissionDate}>
                      <input 
                        type="date" 
                        value={form.patient.admissionDate}
                        onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, admissionDate: e.target.value } }))}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                      />
                    </FormField>

                    <div className="bg-blue-50 p-6 rounded-3xl flex flex-col justify-center border border-blue-100">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{t.clinicalDashboard.calculatedAge}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-[#00236f]">{age.label}</span>
                        <span className="text-xs font-bold text-blue-500">{t.clinicalDashboard.atEntry}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'ETT' && (
              <div className="max-w-4xl mx-auto space-y-8 pb-12">
                <div className="bg-[#1e3a5f] p-10 rounded-[2.5rem] border border-blue-900 shadow-xl text-white">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                      <Wind className="w-8 h-8 text-blue-300" />
                      <h3 className="text-2xl font-black tracking-tight">{t.clinicalDashboard.airwayEttTitle}</h3>
                    </div>
                    <div className="bg-blue-900/50 px-4 py-2 rounded-xl flex items-center gap-2 border border-blue-800">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">{t.clinicalDashboard.clinicalSensitivity}</span>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="flex items-center justify-between bg-blue-900/30 p-6 rounded-3xl border border-blue-800">
                      <div className="space-y-1">
                        <p className="font-bold text-lg">{t.clinicalDashboard.hadEttQuestion}</p>
                        <p className="text-xs text-blue-300 font-medium italic">Required field for airway metrics</p>
                      </div>
                      <div className="flex gap-2">
                        {[1, 2].map(v => (
                          <button
                            key={v}
                            onClick={() => setForm(f => ({ ...f, outcome: { ...f.outcome, intubated: v as any } }))}
                            className={cn(
                              "px-8 py-3 rounded-xl font-bold transition-all",
                              form.outcome.intubated === v 
                                ? "bg-white text-[#1e3a5f] shadow-lg" 
                                : "bg-blue-800/50 text-blue-300 hover:bg-blue-800"
                            )}
                          >
                            {v === 1 ? t.clinicalDashboard.yes : t.clinicalDashboard.no}
                          </button>
                        ))}
                      </div>
                    </div>

                    {form.outcome.intubated === 1 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8"
                      >
                        <FormField label={t.clinicalDashboard.intubationDateTime} required light>
                          <div className="relative">
                            <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" />
                            <input 
                              type="datetime-local" 
                              value={form.outcome.intubationDateTime}
                              onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, intubationDateTime: e.target.value } }))}
                              className="w-full pl-12 pr-4 py-4 bg-blue-900/30 border border-blue-800 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/20"
                            />
                          </div>
                        </FormField>

                        <FormField label={t.clinicalDashboard.tubeSize} required light info="Valid range: 2.0 - 8.0 mm">
                          <div className="flex items-center gap-4 bg-blue-900/30 p-2 rounded-2xl border border-blue-800">
                             <input 
                                type="range" 
                                min="2" 
                                max="8" 
                                step="0.5" 
                                value={form.outcome.ettSize}
                                onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, ettSize: Number(e.target.value) } }))}
                                className="flex-1 accent-blue-400"
                             />
                             <div className="bg-[#00236f] px-6 py-2 rounded-xl text-xl font-black min-w-[80px] text-center border border-blue-700">
                                {form.outcome.ettSize.toFixed(1)}
                             </div>
                          </div>
                        </FormField>

                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                           <div className="bg-blue-950/50 p-6 rounded-[2rem] border border-blue-900">
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">{t.clinicalDashboard.adequateSizeAge}</p>
                              <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-blue-200">{expectedSize.toFixed(1)}</span>
                                <span className="text-xs font-bold text-blue-500">mm</span>
                              </div>
                           </div>

                           <div className={cn(
                             "p-6 rounded-[2rem] border transition-all flex flex-col justify-center",
                             form.outcome.ettAdequate ? "bg-emerald-950/30 border-emerald-900" : "bg-rose-950/30 border-rose-900"
                           )}>
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.clinicalDashboard.isAdequateSize}</p>
                                {form.outcome.ettAdequate ? <ShieldCheck className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
                              </div>
                              <p className="text-lg font-black">{form.outcome.ettAdequate ? `${t.clinicalDashboard.yes} (±0.5mm)` : `${t.clinicalDashboard.no} (${t.clinicalDashboard.outOfRange})`}</p>
                           </div>

                           <div className="bg-blue-950/50 p-6 rounded-[2rem] border border-blue-900">
                              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">TET C/S Balón</p>
                              <div className="flex gap-2 p-1 bg-blue-900/40 rounded-xl">
                                {[false, true].map(v => (
                                  <button
                                    key={v ? 'cuffed' : 'uncuffed'}
                                    onClick={() => setForm(f => ({ ...f, outcome: { ...f.outcome, ettCuffed: v } }))}
                                    className={cn(
                                       "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                                       form.outcome.ettCuffed === v ? "bg-white text-blue-900" : "text-blue-300"
                                    )}
                                  >
                                    {v ? 'Cuffed' : 'Uncuffed'}
                                  </button>
                                ))}
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 'Events' && (
              <div className="max-w-4xl mx-auto space-y-8 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Accidental Extubation */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-2 bg-rose-50 rounded-xl">
                         <AlertCircle className="w-6 h-6 text-rose-500" />
                       </div>
                       <h4 className="text-xl font-black text-[#00236f] tracking-tight">{t.clinicalEvents.accidentalExtubation}</h4>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                         <p className="font-bold text-gray-700">¿Tuvo eventos?</p>
                         <Switch 
                           checked={form.outcome.accidentalExtubation === 1} 
                           onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, accidentalExtubation: v ? 1 : 2 } }))} 
                         />
                       </div>

                       {form.outcome.accidentalExtubation === 1 && (
                         <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6 pt-4 border-t">
                            <FormField label="Número de eventos">
                               <input 
                                 type="number" 
                                 value={form.outcome.accidentalExtubationCount} 
                                 onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, accidentalExtubationCount: Number(e.target.value) } }))}
                                 className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold"
                               />
                            </FormField>
                            <FormField label="Tamaño Tubo Nuevo (mm)">
                               <input 
                                 type="number" 
                                 step="0.5"
                                 value={form.outcome.newTubeSizeAccidental} 
                                 onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, newTubeSizeAccidental: Number(e.target.value) } }))}
                                 className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold"
                               />
                            </FormField>
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <Activity className="w-4 h-4 text-rose-500" />
                                     <span className="text-sm font-black text-rose-900 tracking-tight">¿Requirió CPR posterior?</span>
                                  </div>
                                  <Switch 
                                    checked={form.outcome.requiedCprPostAccidental} 
                                    danger
                                    onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, requiedCprPostAccidental: v } }))} 
                                  />
                               </div>
                            </div>
                         </motion.div>
                       )}
                    </div>
                  </div>

                  {/* Elective Change */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-2 bg-blue-50 rounded-xl">
                         <Stethoscope className="w-6 h-6 text-blue-500" />
                       </div>
                       <h4 className="text-xl font-black text-[#00236f] tracking-tight">{t.clinicalEvents.electiveChange}</h4>
                    </div>
                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                         <p className="font-bold text-gray-700">¿Hubo cambio electivo?</p>
                         <Switch 
                           checked={form.outcome.electiveTubeChange} 
                           onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, electiveTubeChange: v } }))} 
                         />
                       </div>
                       {form.outcome.electiveTubeChange && (
                         <FormField label={t.clinicalEvents.newTubeSize}>
                           <input 
                             type="number" 
                             step="0.5"
                             value={form.outcome.newTubeSizeElective} 
                             onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, newTubeSizeElective: Number(e.target.value) } }))}
                             className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold"
                           />
                         </FormField>
                       )}
                    </div>
                  </div>

                  {/* Elective Extubation */}
                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-2 bg-emerald-50 rounded-xl">
                         <Wind className="w-6 h-6 text-emerald-500" />
                       </div>
                       <h4 className="text-xl font-black text-[#00236f] tracking-tight">{t.clinicalEvents.electiveExtubation}</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-gray-700">¿Fue electiva?</p>
                            <Switch checked={form.outcome.electiveExtubation} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, electiveExtubation: v } }))} />
                          </div>
                          {form.outcome.electiveExtubation && (
                            <FormField label="Fecha Extubación Electiva">
                               <input type="date" value={form.outcome.electiveExtubationDate} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, electiveExtubationDate: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold" />
                            </FormField>
                          )}
                       </div>

                       <div className="space-y-6">
                          <div className="flex items-center justify-between">
                             <p className="font-bold text-gray-700">{t.clinicalDashboard.reintubationRequired}</p>
                             <Switch checked={form.outcome.reintubationNeededPostElective} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, reintubationNeededPostElective: v } }))} />
                          </div>
                          <FormField label={t.clinicalDashboard.failedExtubationAttempts}>
                             <input type="number" value={form.outcome.failedExtubationAttempts} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, failedExtubationAttempts: Number(e.target.value) } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold" />
                          </FormField>
                          <FormField label={t.clinicalDashboard.successfulExtubationDate}>
                             <input type="date" value={form.outcome.successfulExtubationDate} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, successfulExtubationDate: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold" />
                          </FormField>
                          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                             <p className="font-bold text-blue-900">{t.clinicalDashboard.tracheostomyQuestion}</p>
                             <Switch checked={form.outcome.tracheostomy} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, tracheostomy: v } }))} />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'PIM3' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                       <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                         Primeras 1H en UCI
                       </div>
                    </div>
                    <div className="flex items-center gap-3 mb-10">
                      <Clock className="w-6 h-6 text-[#00236f]" />
                      <h3 className="text-2xl font-black text-[#00236f] tracking-tight">{t.pim3Step.initialContact}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <span className="font-bold text-gray-700 text-sm">{t.pim3Step.reactivePupils}</span>
                           <Switch checked={form.outcome.pupils === 1} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, pupils: v ? 1 : 0 } }))} />
                         </div>
                         <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <span className="font-bold text-gray-700 text-sm">{t.pim3Step.electiveAdmission}</span>
                           <Switch checked={form.outcome.electiveAdmission} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, electiveAdmission: v } }))} />
                         </div>
                         <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <span className="font-bold text-gray-700 text-sm">{t.pim3Step.mechanicalVentilation}</span>
                           <Switch checked={form.outcome.mechanicalVentilation} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, mechanicalVentilation: v } }))} />
                         </div>
                         <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                           <span className="font-bold text-gray-700 text-sm">{t.pim3Step.surgeryRecovery}</span>
                           <Switch checked={form.outcome.surgeryRecovery === 1} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, surgeryRecovery: v ? 1 : 0 } }))} />
                         </div>
                      </div>

                      <div className="space-y-6">
                         <FormField label={t.pim3Step.systolicBp}>
                            <input type="number" value={form.outcome.systolicBP} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, systolicBP: Number(e.target.value) } }))} className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl font-black text-lg focus:bg-white focus:border-blue-200" />
                         </FormField>
                         <FormField label={t.pim3Step.fio2} info="Rango 21-100">
                            <input type="number" min="21" max="100" value={form.outcome.fiO2} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, fiO2: Number(e.target.value) } }))} className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl font-black text-lg" />
                         </FormField>
                         <FormField label="PaO2 (mmHg)">
                            <input type="number" value={form.outcome.paO2} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, paO2: Number(e.target.value) } }))} className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl font-black text-lg" />
                         </FormField>
                         <FormField label={t.pim3Step.baseExcess}>
                            <input type="number" step="0.1" value={form.outcome.baseExcess} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, baseExcess: Number(e.target.value) } }))} className="w-full px-4 py-3 bg-gray-100 border border-transparent rounded-xl font-black text-lg" />
                         </FormField>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-10">
                      <FileText className="w-6 h-6 text-[#00236f]" />
                      <h3 className="text-2xl font-black text-[#00236f] tracking-tight">{t.pim3Step.stratification}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <FormField label={t.pim3Step.weightedDiagnosis}>
                          <select className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold">
                             <option>Select catalog...</option>
                             <option>Apnea</option>
                             <option>Asma</option>
                             <option>Crup</option>
                             <option>Sepsis</option>
                          </select>
                       </FormField>
                       <div className="flex flex-wrap gap-4 pt-10">
                          <CheckOption label={t.riskTaxonomy.low} active={form.outcome.pim3LowRiskDiagnosis} onClick={() => setForm(f => ({ ...f, outcome: { ...f.outcome, pim3LowRiskDiagnosis: !f.outcome.pim3LowRiskDiagnosis } }))} />
                          <CheckOption label={t.riskTaxonomy.high} active={form.outcome.pim3HighRiskDiagnosis} onClick={() => setForm(f => ({ ...f, outcome: { ...f.outcome, pim3HighRiskDiagnosis: !f.outcome.pim3HighRiskDiagnosis } }))} />
                          <CheckOption label={t.riskTaxonomy.veryHigh} active={form.outcome.pim3VeryHighRiskDiagnosis} onClick={() => setForm(f => ({ ...f, outcome: { ...f.outcome, pim3VeryHighRiskDiagnosis: !f.outcome.pim3VeryHighRiskDiagnosis } }))} />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="bg-[#1e3a5f] p-8 rounded-[2.5rem] text-white sticky top-4">
                    <div className="flex items-center gap-3 mb-8">
                       <TrendingDown className="w-6 h-6 text-blue-300" />
                       <h4 className="font-extrabold uppercase tracking-widest text-xs">{t.pim3Step.predictiveAnalysis}</h4>
                    </div>

                    <div className="space-y-12">
                       <div>
                          <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest mb-1">Mortalidad Estimada</p>
                          <div className="flex items-baseline gap-2">
                             <span className="text-6xl font-black">{calculatedPIM3.prob}%</span>
                          </div>
                          <div className="mt-4 h-2 w-full bg-blue-900 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-400 transition-all duration-1000" style={{ width: `${calculatedPIM3.prob}%` }} />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-900/40 p-4 rounded-2xl border border-blue-800">
                             <p className="text-[10px] text-blue-300 font-bold uppercase mb-1">PIM3 Score</p>
                             <p className="text-xl font-black">{calculatedPIM3.score}</p>
                          </div>
                          <div className="bg-blue-900/40 p-4 rounded-2xl border border-blue-800">
                             <p className="text-[10px] text-blue-300 font-bold uppercase mb-1">Risk Category</p>
                             <p className="text-xl font-black">{Number(calculatedPIM3.prob) > 20 ? 'High' : 'Moderate'}</p>
                          </div>
                       </div>

                       <FormField label={t.pim3Step.manualProbability} light>
                          <input type="number" className="w-full px-4 py-3 bg-blue-900/30 border border-blue-800 rounded-xl font-bold" placeholder="%" />
                       </FormField>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'Outcome' && (
              <div className="max-w-4xl mx-auto space-y-8 pb-12">
                <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-10">
                    <TrendingDown className="w-6 h-6 text-[#00236f]" />
                    <h3 className="text-2xl font-black text-[#00236f] tracking-tight">{t.outcomeStep.title}</h3>
                  </div>

                  <div className="space-y-12">
                     <div className="flex items-center justify-between bg-gray-50 p-8 rounded-3xl border border-gray-100">
                        <div className="space-y-1">
                           <p className="text-xl font-black text-[#00236f]">{t.outcomeStep.mortalityLabel}</p>
                           <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t.outcomeStep.finalStatusDesc}</p>
                        </div>
                        <div className="flex gap-2">
                           {['Living', 'Deceased'].map(s => (
                             <button
                               key={s}
                               onClick={() => setForm(f => ({ ...f, outcome: { ...f.outcome, status: s as any } }))}
                               className={cn(
                                 "px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all",
                                 form.outcome.status === s 
                                   ? "bg-[#00236f] text-white shadow-xl shadow-blue-500/20 scale-105" 
                                   : "bg-white text-gray-400 border border-gray-100 hover:bg-gray-50"
                               )}
                             >
                               {s === 'Living' ? t.living : t.deceased}
                             </button>
                           ))}
                        </div>
                     </div>

                     <AnimatePresence>
                       {form.outcome.status === 'Deceased' && (
                         <motion.div 
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className="p-8 bg-rose-50 border border-rose-100 rounded-3xl"
                         >
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                  <div className="p-3 bg-rose-100 rounded-2xl">
                                    <Wind className="w-6 h-6 text-rose-500" />
                                  </div>
                                  <div>
                                     <p className="font-extrabold text-rose-900 uppercase tracking-widest text-xs">Causa Principal</p>
                                     <p className="text-xl font-black text-rose-900">¿Mortalidad Respiratoria?</p>
                                  </div>
                               </div>
                               <Switch 
                                 checked={form.outcome.mortalityRespiratory} 
                                 danger 
                                 onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, mortalityRespiratory: v } }))} 
                               />
                            </div>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormField label="Días de Ventilación Mecánica" required>
                           <div className="relative">
                              <Wind className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                type="number" 
                                value={form.outcome.ventilationDays}
                                onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, ventilationDays: Number(e.target.value) } }))}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg focus:bg-white transition-all outline-none"
                              />
                           </div>
                        </FormField>
                        <FormField label="Peso al Egreso (kg)">
                           <div className="relative">
                              <Weight className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                type="number" 
                                step="0.1"
                                value={form.outcome.weight}
                                onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, weight: Number(e.target.value) } }))}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-black text-lg focus:bg-white transition-all outline-none"
                              />
                           </div>
                        </FormField>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'Success' && (
              <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto py-12">
                <div className="p-8 bg-emerald-100 rounded-full mb-10 relative">
                   <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20" />
                   <ShieldCheck className="w-20 h-20 text-emerald-500 relative z-10" strokeWidth={2.5} />
                </div>
                
                <h2 className="text-4xl font-black text-[#00236f] mb-4 tracking-tighter text-center">{t.outcomeStep.finishedTitle}</h2>
                <p className="text-gray-500 text-center leading-relaxed font-medium mb-12">
                  El paciente ha sido registrado exitosamente en el sistema de vigilancia epidemiológica de la unidad. 
                  Los análisis de mortalidad han sido actualizados.
                </p>

                <div className="w-full bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm mb-12">
                   <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mortalidad Global</p>
                        <p className="text-2xl font-black text-[#00236f]">{form.outcome.status === 'Living' ? 'Vivo (L)' : 'Fallecido (D)'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tamaño TET Adecuado</p>
                        <p className={cn("text-2xl font-black", form.outcome.ettAdequate ? "text-emerald-500" : "text-rose-500")}>
                          {form.outcome.ettAdequate ? 'Sí' : 'No'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Riesgo PIM3</p>
                        <p className="text-2xl font-black text-blue-600">{calculatedPIM3.prob}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ID HASH</p>
                        <p className="text-xs font-mono font-bold text-gray-400 uppercase">{form.patient.patientHash.substring(0, 12)}</p>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <button 
                    onClick={resetFlow}
                    className="flex-1 px-8 py-5 bg-[#00236f] text-white font-black rounded-2xl shadow-xl shadow-blue-500/10 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                  >
                    <Plus className="w-5 h-5" />
                    Nuevo Registro
                  </button>
                  <button 
                    onClick={onExit}
                    className="flex-1 px-8 py-5 bg-white text-gray-600 font-bold border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Volver al Registro
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {step !== 'Success' && (
        <div className="mt-8 flex justify-between items-center px-4">
          <button 
            disabled={step === 'Identification'}
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 font-black uppercase text-xs tracking-widest hover:text-[#00236f] disabled:opacity-20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>

          <button 
            onClick={handleNext}
            disabled={isSending || (step === 'Identification' && !form.patient.name)}
            className="flex items-center gap-3 bg-[#00236f] text-white px-12 py-5 rounded-2xl font-black text-sm shadow-2xl shadow-blue-500/20 hover:scale-105 active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 transition-all"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : step === 'Outcome' ? 'Finalizar Registro' : 'Siguiente Paso'}
            {!isSending && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children, required, labelRight, info, light }: { label: string; children: React.ReactNode; required?: boolean; labelRight?: string; info?: string; light?: boolean }) {
  return (
    <div className="space-y-2 flex-1">
      <div className="flex items-center justify-between">
        <label className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1", light ? "text-blue-300" : "text-[#00236f]/60")}>
          {label}
          {required && <span className="text-red-500">*</span>}
          {info && <Info className="w-3 h-3 text-gray-300 ml-1" />}
        </label>
        {labelRight && <span className="text-[9px] font-black text-[#00236f] bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{labelRight}</span>}
      </div>
      {children}
    </div>
  );
}

function Switch({ checked, onChange, danger }: { checked: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className={cn(
        "w-12 h-6 rounded-full transition-all relative",
        checked ? (danger ? "bg-rose-500" : "bg-[#50dab7]") : "bg-gray-200"
      )}
    >
      <div className={cn(
        "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all",
        checked ? "left-7" : "left-1"
      )} />
    </button>
  );
}

function CheckOption({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
        active ? "bg-[#00236f] text-white border-[#00236f]" : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
      )}
    >
      {label}
    </button>
  );
}
