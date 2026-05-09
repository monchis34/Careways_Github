/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Patient, Outcome, ParentPatient, PatientType } from '../types';
import { generatePatientHash } from '../store';
import { 
  Fingerprint, Stethoscope, Users, CheckCircle2, 
  Calendar, Weight, Baby, Activity, Send, Loader2,
  AlertTriangle, Search, ChevronDown, Info, Clock, Layout, Plus,
  User, AlertCircle, Wind, ShieldCheck, TrendingDown, FileText, Upload, ArrowRight
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

export default function ClinicianFlow({ onComplete, onBulkComplete, onExit, role, state }: ClinicianFlowProps) {
  const { t } = useLanguage();
  const [isSending, setIsSending] = useState(false);
  const [activeSection, setActiveSection] = useState('Identification');

  // Form State
  const [form, setForm] = useState({
    patient: {
      identifier: '',
      name: '', mrn: '', type: 'Pediatric' as PatientType,
      gender: 'Unknown',
      hospital: '', city: '', country: '',
      birthDate: '', admissionDate: format(new Date(), 'yyyy-MM-dd'),
      dischargeDate: format(new Date(), 'yyyy-MM-dd'), patientHash: ''
    },
    outcome: {
      intubated: 2 as 1 | 2, intubationDateTime: '', ettSize: 3.5, ettExpectedSize: 0,
      ettAdequate: true, ettCuffed: false, accidentalExtubation: 2 as 1 | 2,
      accidentalExtubationCount: 0, newTubeSizeAccidental: 0, requiedCprPostAccidental: false,
      electiveTubeChange: false, newTubeSizeElective: 0, electiveExtubation: false,
      electiveExtubationDate: '', reintubationNeededPostElective: false, failedExtubationAttempts: 0,
      successfulExtubationDate: '', tracheostomy: false, pupils: 1 as 0 | 1,
      electiveAdmission: false, mechanicalVentilation: false, systolicBP: 0, fiO2: 21,
      paO2: 0, baseExcess: 0, surgeryRecovery: 0 as 0 | 1, weightedDiagnosis: 'None',
      pim3LowRiskDiagnosis: false, pim3HighRiskDiagnosis: false, pim3VeryHighRiskDiagnosis: false,
      diagnosis: '', pim3Score: 0, mortalityProbability: 0, manualMortalityProbability: 0,
      status: 'Living' as 'Living' | 'Deceased', mortalityRespiratory: false,
      ventilationDays: 0, weight: 0, age: 0,
    }
  });

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

  const expectedSize = useMemo(() => {
    const years = age.years;
    if (years < 1) return form.outcome.ettCuffed ? 3.0 : 3.5;
    return form.outcome.ettCuffed ? (years / 4) + 3.5 : (years / 4) + 4;
  }, [age.years, form.outcome.ettCuffed]);

  useEffect(() => {
    setForm(f => ({ ...f, outcome: { ...f.outcome, ettExpectedSize: expectedSize } }));
  }, [expectedSize]);

  useEffect(() => {
    const isAdequate = Math.abs(form.outcome.ettSize - expectedSize) <= 0.5;
    setForm(f => ({ ...f, outcome: { ...f.outcome, ettAdequate: isAdequate } }));
  }, [form.outcome.ettSize, expectedSize]);

  useEffect(() => {
    if (form.patient.mrn && form.patient.admissionDate) {
      const hash = generatePatientHash(form.patient.mrn, form.patient.admissionDate);
      setForm(prev => ({ ...prev, patient: { ...prev.patient, patientHash: hash } }));
    }
  }, [form.patient.mrn, form.patient.admissionDate]);

  const calculatedPIM3 = useMemo(() => {
    let score = -4.8829;
    if (form.outcome.pupils === 0) score += 1.6677;
    if (form.outcome.electiveAdmission) score -= 1.3980;
    if (form.outcome.mechanicalVentilation) score += 0.5192;
    const prob = 1 / (1 + Math.exp(-score));
    return { score: score.toFixed(2), prob: (prob * 100).toFixed(2) };
  }, [form.outcome]);

  const handleFinish = async () => {
    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const patientObj: Patient = {
      ...form.patient,
      id: form.patient.patientHash, institutionId: state?.currentUser?.institutionId || 'demo-inst',
      hospital: form.patient.hospital || 'Demo Hospital', 
      city: form.patient.city || 'Bogotá', 
      country: form.patient.country || 'Colombia'
    };
    const outcomeObj: Outcome = {
      ...form.outcome,
      patientHash: form.patient.patientHash, createdAt: new Date().toISOString(),
      age: age.years + age.months/12, ageYears: age.years, ageMonths: age.months, ageDays: age.days,
      pim3Score: Number(calculatedPIM3.score), mortalityProbability: Number(calculatedPIM3.prob)
    };
    const parentPatientObj: ParentPatient = {
      id: Math.random().toString(36).substr(2, 9), patientHash: form.patient.patientHash,
      name: 'Simulated Parent', phone: '+57 321 000 0000', email: 'parent@example.com',
      consent: true, educationActivated: true, educationProgress: 0
    };
    onComplete(patientObj, outcomeObj, parentPatientObj);
    setIsSending(false);
  };

  const sections = [
    { id: 'Identification', icon: User, label: 'Patient Identification' },
    { id: 'ETT', icon: Wind, label: 'Airway Management' },
    { id: 'Events', icon: AlertTriangle, label: 'Critical Events' },
    { id: 'PIM3', icon: Activity, label: 'First ICU Hour / PIM3' },
    { id: 'Risk', icon: FileText, label: 'Risk Stratification' },
    { id: 'Outcome', icon: TrendingDown, label: 'Mortality Outcomes' }
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePendingClick = (sectionId: string, focusId?: string) => {
    scrollToSection(sectionId);
    if (focusId) {
      setTimeout(() => {
        const el = document.getElementById(focusId);
        if (el) {
          el.focus();
          el.classList.add('ring-4', 'ring-rose-400', '!bg-rose-50', 'transition-all', 'duration-500');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-rose-400', '!bg-rose-50');
          }, 2000);
        }
      }, 400); // Wait for scroll
    }
  };

  // Mock Alerts
  const missingFields: { label: string; sectionId: string; focusId?: string }[] = [];
  
  if (!form.patient.identifier) {
    missingFields.push({ label: 'Patient Identification Number is required', sectionId: 'Identification', focusId: 'input-identifier' });
  } else if (form.patient.identifier.length < 5 || form.patient.identifier.length > 30 || !/^[a-zA-Z0-9 -]+$/.test(form.patient.identifier)) {
    missingFields.push({ label: 'Invalid identification format', sectionId: 'Identification', focusId: 'input-identifier' });
  } else if (state?.patients.some(p => p.identifier === form.patient.identifier)) {
    missingFields.push({ label: 'Duplicate patient identification detected', sectionId: 'Identification', focusId: 'input-identifier' });
  }

  if (!form.patient.mrn) missingFields.push({ label: 'Hospital Record Number is required', sectionId: 'Identification', focusId: 'input-mrn' });
  if (!form.patient.name) missingFields.push({ label: 'Full Patient Name is required', sectionId: 'Identification', focusId: 'input-name' });
  if (!form.patient.birthDate) missingFields.push({ label: 'Date of Birth is required', sectionId: 'Identification', focusId: 'input-birthDate' });
  if (!form.patient.hospital) missingFields.push({ label: 'Institution is required', sectionId: 'Identification', focusId: 'input-hospital' });
  if (!form.patient.city) missingFields.push({ label: 'City is required', sectionId: 'Identification', focusId: 'input-city' });
  if (!form.patient.country) missingFields.push({ label: 'Country is required', sectionId: 'Identification', focusId: 'input-country' });
  
  if (form.outcome.intubated === 1 && !form.outcome.intubationDateTime) missingFields.push({ label: 'Intubation time missing', sectionId: 'ETT', focusId: 'input-intubationDateTime' });
  
  if (form.outcome.electiveExtubation && !form.outcome.electiveExtubationDate) missingFields.push({ label: 'Missing Extubation Date', sectionId: 'Events', focusId: 'input-extubationDate' });
  if (form.outcome.fiO2 < 21) missingFields.push({ label: 'Missing FiO2', sectionId: 'PIM3', focusId: 'input-fio2' });
  if (form.outcome.systolicBP === 0 || form.outcome.paO2 === 0) missingFields.push({ label: 'Missing PIM3 Score', sectionId: 'PIM3', focusId: 'input-systolicbp' });
  
  const completionPercent = Math.min((1 - (missingFields.length / 11)) * 100, 100).toFixed(0);
  const canSave = missingFields.length === 0;

  return (
    <div className="h-full flex flex-col pt-2 -mx-4 -mt-4 bg-[#F5F5F5]">
      
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-50 bg-[#204071] text-white p-4 shadow-md flex flex-wrap gap-4 items-center justify-between mx-4 mt-4 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <User className="w-6 h-6 text-[#85F0D4]" />
          </div>
          <div>
            <h1 className="font-bold text-lg">{form.patient.name || 'New Patient'}</h1>
            <div className="flex items-center gap-2 text-xs text-blue-200">
              <span className="font-mono">ID: {form.patient.mrn || '---'}</span>
              <span>•</span>
              <span>{age.label} ({form.patient.type})</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {form.outcome.intubated === 1 && <span className="px-3 py-1 bg-rose-500/20 text-rose-300 font-bold text-xs rounded-full border border-rose-500/30">INTUBATED</span>}
          {form.outcome.mechanicalVentilation && <span className="px-3 py-1 bg-[#3796D8]/20 text-[#3796D8] font-bold text-xs rounded-full border border-[#3796D8]/30">VENTILATED</span>}
          <div className="flex -space-x-2 mr-4">
             <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-[#204071] flex items-center justify-center text-xs font-bold">DR</div>
             <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#204071] flex items-center justify-center text-xs font-bold">RN</div>
          </div>
          <button onClick={onExit} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all">
            Cancel
          </button>
          <button onClick={handleFinish} disabled={isSending || !canSave} className="disabled:opacity-50 px-6 py-2 bg-[#85F0D4] hover:bg-[#FFE362] text-[#204071] rounded-xl text-sm font-black transition-all flex items-center gap-2">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Save & Exit
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-4 gap-6">
        
        {/* Left Panel - Sticky Navigation */}
        <div className="w-64 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-y-auto hidden lg:block">
          <h2 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-4">Sections</h2>
          <nav className="space-y-2">
            {sections.map(s => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                  activeSection === s.id ? "bg-blue-50 text-[#204071]" : "hover:bg-gray-50 text-gray-500"
                )}
              >
                <s.icon className={cn("w-5 h-5", activeSection === s.id ? "text-[#3796D8]" : "")} />
                <span className="font-bold text-sm">{s.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Center Panel - Main Form */}
        <div className="flex-1 overflow-y-auto space-y-8 pr-2 pb-12" id="clinical-form">
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm font-bold border border-yellow-200">
            This form must be completed at the time of intubation / ICU admission
          </div>

          <section id="section-Identification" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-[#204071] mb-6 flex items-center gap-2">
              <User className="text-[#3796D8]" /> Patient Identification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Patient Identification Number" required info="National ID, Passport, etc.">
                <input id="input-identifier" type="text" maxLength={30} value={form.patient.identifier} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, identifier: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
              <FormField label="Hospital Record Number" required>
                <input id="input-mrn" type="text" value={form.patient.mrn} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, mrn: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
              <FormField label="Full Patient Name" required>
                <input id="input-name" type="text" value={form.patient.name} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, name: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
              <FormField label="Date of Birth" required>
                <input id="input-birthDate" type="date" value={form.patient.birthDate} max={format(new Date(), 'yyyy-MM-dd')} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, birthDate: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
              <FormField label="Gender" required>
                <select id="input-gender" value={form.patient.gender} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, gender: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </FormField>
              <FormField label="Weight (kg)" required>
                <input id="input-weight" type="number" step="0.1" value={form.outcome.weight || ''} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, weight: Number(e.target.value) } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
              <FormField label="Institution" required>
                <input id="input-hospital" type="text" value={form.patient.hospital} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, hospital: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
              <FormField label="City" required>
                <input id="input-city" type="text" value={form.patient.city} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, city: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
              <FormField label="Country" required>
                <input id="input-country" type="text" value={form.patient.country} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, country: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
              <FormField label="ICU Admission Date" required>
                <input id="input-admissionDate" type="date" value={form.patient.admissionDate} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, admissionDate: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
              <FormField label="ICU Type">
                <select value={form.patient.type} onChange={e => setForm(f => ({ ...f, patient: { ...f.patient, type: e.target.value as PatientType } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none">
                  <option value="Neonatal">Neonatal</option>
                  <option value="Pediatric">Pediatric</option>
                  <option value="Adult">Adult</option>
                </select>
              </FormField>
              <FormField label="Primary Diagnosis" required>
                <input type="text" value={form.outcome.diagnosis} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, diagnosis: e.target.value } }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white outline-none" />
              </FormField>
            </div>
          </section>

          <section id="section-ETT" className="bg-[#204071] p-8 rounded-3xl shadow-lg border border-blue-900 text-white">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <Wind className="text-[#3796D8]" /> Airway Management
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-900/50 p-6 rounded-2xl">
                <span className="font-bold text-lg">Intubated with Endotracheal Tube?</span>
                <div className="flex gap-2">
                  <button onClick={() => setForm(f => ({ ...f, outcome: { ...f.outcome, intubated: 1 } }))} className={cn("px-6 py-2 rounded-xl font-bold transition-all", form.outcome.intubated === 1 ? "bg-white text-[#204071]" : "bg-blue-800 text-white hover:bg-blue-700")}>Yes</button>
                  <button onClick={() => setForm(f => ({ ...f, outcome: { ...f.outcome, intubated: 2 } }))} className={cn("px-6 py-2 rounded-xl font-bold transition-all", form.outcome.intubated === 2 ? "bg-white text-[#204071]" : "bg-blue-800 text-white hover:bg-blue-700")}>No</button>
                </div>
              </div>
              
              {form.outcome.intubated === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-blue-800 text-black">
                  <FormField label="Intubation Date & Time" required light>
                    <input id="input-intubationDateTime" type="datetime-local" value={form.outcome.intubationDateTime} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, intubationDateTime: e.target.value } }))} className="w-full px-4 py-3 bg-white/10 text-white border border-blue-800 rounded-xl outline-none" />
                  </FormField>
                  <FormField label="Tube Size (mm)" required light>
                    <div className="flex items-center gap-4 bg-white/10 p-2 rounded-xl border border-blue-800">
                       <input type="range" min="2" max="8" step="0.5" value={form.outcome.ettSize} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, ettSize: Number(e.target.value) } }))} className="flex-1" />
                       <div className="text-white text-xl font-black w-12 text-center">{form.outcome.ettSize.toFixed(1)}</div>
                    </div>
                  </FormField>
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-4 rounded-xl text-white">
                      <p className="text-xs uppercase tracking-widest text-[#85F0D4] font-black">Expected Size</p>
                      <p className="text-3xl font-black">{expectedSize.toFixed(1)} <span className="text-sm">mm</span></p>
                    </div>
                    <div className={cn("p-4 rounded-xl text-white", form.outcome.ettAdequate ? "bg-emerald-500/20 border border-emerald-500" : "bg-rose-500/20 border border-rose-500")}>
                      <p className="text-xs uppercase tracking-widest font-black flex items-center justify-between">
                        Size Evaluation
                        {form.outcome.ettAdequate ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                      </p>
                      <p className="text-xl font-black mt-1">{form.outcome.ettAdequate ? "Appropriate Range" : "Outside Range !"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section id="section-Events" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-[#204071] mb-6 flex items-center gap-2">
              <AlertTriangle className="text-rose-500" /> Critical Events
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold">Accidental Extubation Event?</span>
                <Switch checked={form.outcome.accidentalExtubation === 1} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, accidentalExtubation: v ? 1 : 2 } }))} />
              </div>
              {form.outcome.accidentalExtubation === 1 && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-4 border-rose-200">
                  <FormField label="Event Count"><input type="number" value={form.outcome.accidentalExtubationCount} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, accidentalExtubationCount: Number(e.target.value) } }))} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" /></FormField>
                  <FormField label="New Tube Size"><input type="number" step="0.5" value={form.outcome.newTubeSizeAccidental} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, newTubeSizeAccidental: Number(e.target.value) } }))} className="w-full px-4 py-3 bg-gray-50 border rounded-xl" /></FormField>
                  <div className="col-span-2 flex items-center justify-between p-4 bg-rose-50 rounded-xl border border-rose-100">
                    <span className="font-bold text-rose-900">CPR Required post Accidental Extubation?</span>
                    <Switch danger checked={form.outcome.requiedCprPostAccidental} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, requiedCprPostAccidental: v } }))} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <span className="font-bold">Elective Extubation</span>
                <Switch checked={form.outcome.electiveExtubation} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, electiveExtubation: v } }))} />
              </div>
              {form.outcome.electiveExtubation && (
                <div className="grid grid-cols-2 gap-4 pl-4 border-l-4 border-emerald-200">
                   <div className="col-span-2 md:col-span-1">
                     <FormField label="Extubation Date" required>
                       <input id="input-extubationDate" type="date" value={form.outcome.electiveExtubationDate} onChange={e => setForm(f => ({...f, outcome: {...f.outcome, electiveExtubationDate: e.target.value}}))} className="w-full px-4 py-2 bg-gray-100 rounded-xl outline-none" />
                     </FormField>
                   </div>
                   <div className="col-span-2 flex justify-between p-4 bg-blue-50 rounded-xl">
                      <span className="font-bold text-blue-900">Reintubation Required?</span>
                      <Switch checked={form.outcome.reintubationNeededPostElective} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, reintubationNeededPostElective: v } }))} />
                   </div>
                </div>
              )}
            </div>
          </section>

          <section id="section-PIM3" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-[#204071] mb-6 flex items-center gap-2">
              <Activity className="text-purple-500" /> First ICU Hour / PIM3
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <div className="flex justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"><span className="font-bold text-sm">Reactive Pupils</span><Switch checked={form.outcome.pupils === 1} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, pupils: v ? 1 : 0 } }))} /></div>
                 <div className="flex justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"><span className="font-bold text-sm">Elective Admission</span><Switch checked={form.outcome.electiveAdmission} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, electiveAdmission: v } }))} /></div>
                 <div className="flex justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"><span className="font-bold text-sm">Mechanical Ventilation</span><Switch checked={form.outcome.mechanicalVentilation} onChange={v => setForm(f => ({ ...f, outcome: { ...f.outcome, mechanicalVentilation: v } }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <FormField label="Systolic BP (mmHg)"><input id="input-systolicbp" type="number" value={form.outcome.systolicBP === 0 ? '' : form.outcome.systolicBP} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, systolicBP: Number(e.target.value) } }))} className="w-full px-4 py-2 bg-gray-100 rounded-xl outline-none" /></FormField>
                 <FormField label="FiO2 (21-100%)"><input id="input-fio2" type="number" value={form.outcome.fiO2} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, fiO2: Number(e.target.value) } }))} className="w-full px-4 py-2 bg-gray-100 rounded-xl outline-none" /></FormField>
                 <FormField label="PaO2 (mmHg)"><input id="input-pao2" type="number" value={form.outcome.paO2 === 0 ? '' : form.outcome.paO2} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, paO2: Number(e.target.value) } }))} className="w-full px-4 py-2 bg-gray-100 rounded-xl outline-none" /></FormField>
                 <FormField label="Base Excess"><input id="input-baseexcess" type="number" step="0.1" value={form.outcome.baseExcess} onChange={e => setForm(f => ({ ...f, outcome: { ...f.outcome, baseExcess: Number(e.target.value) } }))} className="w-full px-4 py-2 bg-gray-100 rounded-xl outline-none" /></FormField>
              </div>
            </div>
          </section>
          
          <section id="section-Risk" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
             <h3 className="text-xl font-black text-[#204071] mb-6 flex items-center gap-2">
               <FileText className="text-amber-500" /> Risk Stratification
             </h3>
             <div className="p-6 bg-blue-50/50 rounded-2xl flex justify-between items-center border border-blue-100">
                <div>
                   <p className="text-sm font-bold text-blue-900 uppercase">Estimated Mortality (PIM3 Probability)</p>
                   <p className="text-5xl font-black text-[#204071] mt-2">{calculatedPIM3.prob}%</p>
                </div>
                <div className="w-32 h-32 rounded-full border-8 border-gray-200 relative flex items-center justify-center">
                   <div className="absolute inset-0 rounded-full border-8 border-[#3796D8]" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 0 100%, 0 0, 50% 0)' }}></div>
                   <span className="font-bold text-gray-500">PIM3: {calculatedPIM3.score}</span>
                </div>
             </div>
          </section>

          <section id="section-Outcome" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
             <h3 className="text-xl font-black text-[#204071] mb-6 flex items-center gap-2">
               <TrendingDown className="text-emerald-500" /> Mortality Outcomes
             </h3>
             <div className="flex gap-4">
                <button onClick={() => setForm(f => ({...f, outcome: {...f.outcome, status: 'Living'}}))} className={cn("flex-1 py-6 rounded-2xl font-black transition-all border-2", form.outcome.status === 'Living' ? "bg-emerald-50 border-emerald-500 text-emerald-900" : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50")}>DISCHARGED ALIVE</button>
                <button onClick={() => setForm(f => ({...f, outcome: {...f.outcome, status: 'Deceased'}}))} className={cn("flex-1 py-6 rounded-2xl font-black transition-all border-2", form.outcome.status === 'Deceased' ? "bg-rose-50 border-rose-500 text-rose-900" : "bg-white border-gray-200 text-gray-400 hover:bg-gray-50")}>DECEASED</button>
             </div>
          </section>

        </div>

        {/* Right Panel - Alerts and Feed */}
        <div className="w-80 flex flex-col gap-6 hidden xl:flex">
          {/* Alerts Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#204071] mb-4 flex justify-between">Pending Fields <span className="text-[#3796D8]">{completionPercent}%</span></h3>
            <div className="w-full h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
               <div className="h-full bg-[#3796D8]" style={{ width: `${completionPercent}%` }} />
            </div>
            {missingFields.length > 0 ? (
              <ul className="space-y-3">
                {missingFields.map((e, i) => (
                  <li 
                    key={i} 
                    onClick={() => handlePendingClick(e.sectionId, e.focusId)}
                    className="flex flex-col gap-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 p-3 rounded-xl border border-rose-100 cursor-pointer transition-all transform hover:scale-[1.02] hover:shadow-sm"
                  >
                    <div className="flex items-start gap-2 font-black">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" /> 
                      <span>{e.label}</span>
                    </div>
                    <div className="flex justify-between items-center pl-6 text-[10px] uppercase font-bold text-rose-500/80">
                      <span>Section: {e.sectionId}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-3 rounded-xl text-xs font-bold">
                 <CheckCircle2 className="w-4 h-4" /> All required fields complete
              </div>
            )}
          </div>
          
          {/* Clinical Activity Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1 overflow-y-auto">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#204071] mb-4">Clinical Activity Feed</h3>
            <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">
               <div className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1 border-2 border-white" />
                  <p className="text-xs font-bold text-gray-900">Dr. Sarah Mitchell</p>
                  <p className="text-[10px] text-gray-500 font-medium">Pediatric Intensivist</p>
                  <div className="mt-1 bg-gray-50 p-2 rounded-lg text-xs text-gray-600">Updated Airway Management</div>
                  <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">Today - 08:42 AM</p>
               </div>
               <div className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1 border-2 border-white" />
                  <p className="text-xs font-bold text-gray-900">Nurse Emily Carter</p>
                  <p className="text-[10px] text-gray-500 font-medium">Critical Care Nurse</p>
                  <div className="mt-1 bg-gray-50 p-2 rounded-lg text-xs text-gray-600">Added Ventilator Parameters</div>
                  <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">Today - 09:10 AM</p>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Reusable UI Components used within this file

function FormField({ label, required, info, light, children }: any) {
  return (
    <div className="space-y-2 flex-1">
      <div className="flex items-center justify-between">
        <label className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1", light ? "text-blue-300" : "text-gray-500")}>
          {label}
          {required && <span className="text-rose-500">*</span>}
          {info && <Info className="w-3 h-3 text-gray-300 ml-1" title={info} />}
        </label>
      </div>
      {children}
    </div>
  );
}

function Switch({ checked, onChange, danger }: any) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "w-12 h-6 rounded-full transition-all relative shrink-0",
        checked ? (danger ? "bg-rose-500" : "bg-[#3796D8]") : "bg-gray-200"
      )}
    >
      <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", checked ? "left-7" : "left-1")} />
    </button>
  );
}
