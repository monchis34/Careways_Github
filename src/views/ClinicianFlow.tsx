import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Patient, Outcome, ParentPatient, PatientType } from '../types';
import { generatePatientHash } from '../store';
import { useLanguage } from '../App';
import { 
  User, Wind, AlertTriangle, Activity, TrendingDown,
  FileText, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';

interface ClinicianFlowProps {
  onComplete: (patient: Patient, outcome: Outcome, parentPatient: ParentPatient) => void;
  onBulkComplete?: (patients: Patient[], outcomes: Outcome[], parentPatients: ParentPatient[]) => void;
  onExit?: () => void;
  role?: string;
  state?: any;
}

const geoData: Record<string, Record<string, string[]>> = {
  USA: {
    'New York': ['NY General Hospital', 'Mount Sinai', 'NYU Langone'],
    'Miami': ['Miami Childrens', 'Jackson Memorial']
  },
  Colombia: {
    'Bogotá': ['Hospital Central', 'Clínica Infantil', 'Fundación Cardioinfantil'],
    'Medellín': ['San Vicente', 'Pablo Tobón Uribe']
  },
  Mexico: {
    'Mexico City': ['Hospital Infantil de México', 'Centro Médico Nacional'],
    'Guadalajara': ['Hospital Civil']
  },
  Spain: {
    'Madrid': ['Hospital La Paz', 'Niño Jesús'],
    'Barcelona': ['Sant Joan de Déu']
  }
};

const COUNTRIES = Object.keys(geoData);

const RISK_SUBTYPES: Record<string, { value: string, label: string, desc?: string }[]> = {
  'Low Risk': [
    { value: 'asthma', label: 'Asthma' },
    { value: 'bronchiolitis', label: 'Bronchiolitis' },
    { value: 'croup', label: 'Croup (laryngotracheitis)' },
    { value: 'osa', label: 'Obstructive sleep apnea' },
    { value: 'dka', label: 'Diabetic ketoacidosis' },
    { value: 'seizure', label: 'Seizure disorders' }
  ],
  'High Risk': [
    { value: 'hemorrhage', label: 'Spontaneous cerebral hemorrhage', desc: 'e.g., intracranial bleed without prior known condition' },
    { value: 'cardiomyopathy', label: 'Cardiomyopathy or myocarditis', desc: 'severe heart muscle disease or inflammation' },
    { value: 'hlhs', label: 'Hypoplastic left heart syndrome (HLHS)', desc: 'or other severe congenital heart defects requiring urgent intervention' },
    { value: 'neuro', label: 'Neurodegenerative disorders', desc: 'e.g., severe progressive neurological conditions' },
    { value: 'nec', label: 'Necrotizing enterocolitis (NEC)', desc: 'in infants, especially with severe forms' }
  ],
  'Very High Risk': [
    { value: 'cardiac_arrest', label: 'Cardiac arrest before ICU admission' },
    { value: 'scid', label: 'Severe combined immunodeficiency (SCID)' },
    { value: 'leukemia', label: 'Post-induction leukemia/lymphoma' },
    { value: 'bone_marrow', label: 'Bone marrow transplant recipient' },
    { value: 'liver_failure', label: 'Severe liver failure' }
  ]
};

const INDICATIONS = [
  { value: '1. Respiratory Failure', desc: 'Hypoxemia, hypercapnia, ARDS, pneumonia, aspiration' },
  { value: '2. Upper Airway Obstruction', desc: 'Severe croup, subglottic stenosis, epiglottitis, foreign body' },
  { value: '3. Neuromuscular Weakness', desc: 'Guillain-Barré, muscular dystrophy, SMA, botulism' },
  { value: '4. Respiratory Drive Impairment', desc: 'Central apnea, drug-induced, hypoventilation' },
  { value: '5. Airway Protection', desc: 'GCS < 8, absent gag/cough reflex' },
  { value: '6. Hemodynamic Instability', desc: 'Shock, cardiac arrest, CPR' },
  { value: '7. Therapeutic Ventilation', desc: 'ICP control, pulmonary hypertension crisis, metabolic acidosis' },
  { value: '8. Pulmonary Hygiene', desc: 'Inability to clear secretions, atelectasis' },
  { value: '9. Procedures / Sedation', desc: 'Surgical procedures, deep sedation, MRI' },
  { value: '10. Post-Operative', desc: 'Cardiac, airway, neurosurgery' },
  { value: '99. Other', desc: '' }
];

export default function ClinicianFlow({ onComplete, onExit, state }: ClinicianFlowProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [isSending, setIsSending] = useState(false);
  const [activeSection, setActiveSection] = useState('identification');

  const [form, setForm] = useState({
    patient: {
      identifier: '', name: '', mrn: '', type: 'Pediatric' as PatientType,
      gender: 'Unknown', hospital: '', city: '', country: '',
      birthDate: '', admissionDate: format(new Date(), 'yyyy-MM-dd'), dischargeDate: format(new Date(), 'yyyy-MM-dd'),
      patientHash: ''
    },
    outcome: {
      weight: 0, diagnosis: '', intubated: 0 as 0|1|2, intubationDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), electiveAdmission: 0 as 0|1|2,
      ettSize: 3.5, ettCuffed: 0 as 0|1|2, accidentalExtubation: 0 as 0|1|2, accidentalExtubationCount: 0,
      newTubeSizeAccidental: 0, newTubeTypeAccidentalCuffed: 0 as 0|1|2, requiedCprPostAccidental: 0 as 0|1|2,
      electiveTubeChange: 0 as 0|1|2, newTubeSizeElective: 0, newTubeTypeElectiveCuffed: 0 as 0|1|2,
      electiveExtubation: 0 as 0|1|2, electiveExtubationDate: '', reintubationNeededPostElective: 0 as 0|1|2,
      failedExtubationAttempts: 0, successfulExtubationDate: '', tracheostomy: 0 as 0|1|2,
      status: 'Living' as 'Living' | 'Deceased', mortalityRespiratory: 0 as 0|1|2, ventilationDays: 0,
      pupils: 2 as 0|1|2, mechanicalVentilation: 0 as 0|1|2, systolicBP: 0, fiO2: 21, paO2: 100, baseExcess: 0,
      surgeryRecovery: 0 as 0|1, weightedDiagnosis: 'None', pim3LowRiskDiagnosis: 0 as 0|1|2,
      pim3HighRiskDiagnosis: 0 as 0|1|2, pim3VeryHighRiskDiagnosis: 0 as 0|1|2,
      riskCategory: '' as '' | 'Low Risk' | 'High Risk' | 'Very High Risk' | 'None',
      riskSubtype: '',
      primaryIndication: '',
      primaryIndicationOther: '',
    },
    caregiver: {
      name: '', idNumber: '', phoneCode: '+1', phone: '', email: ''
    }
  });

  const age = useMemo(() => {
    if (!form.patient.birthDate) return { label: '---', rawYears: 0 };
    const birth = parseISO(form.patient.birthDate);
    const intubDate = form.outcome.intubated === 1 && form.outcome.intubationDateTime ? parseISO(form.outcome.intubationDateTime) : parseISO(form.patient.admissionDate);
    
    if (!isValid(birth) || !isValid(intubDate)) return { label: '---', rawYears: 0 };

    const days = differenceInDays(intubDate, birth);
    if (days < 0) return { label: 'Invalid', rawYears: 0 };
    const rawYears = days / 365.25;

    let label = `${days}d`;
    if (rawYears >= 1) label = `${Math.floor(rawYears)}y`;
    else if (days >= 30) label = `${Math.floor(days / 30)}m`;

    return { label, rawYears };
  }, [form.patient.birthDate, form.patient.admissionDate, form.outcome.intubationDateTime, form.outcome.intubated]);

  const expectedSize = useMemo(() => {
    const y = age.rawYears;
    const isCuffed = form.outcome.ettCuffed === 1;
    if (y < 1) return isCuffed ? 3.0 : 3.5;
    return isCuffed ? (y / 4) + 3.5 : (y / 4) + 4;
  }, [age.rawYears, form.outcome.ettCuffed]);

  const ettAdequate = Math.abs(form.outcome.ettSize - expectedSize) <= 0.5;

  const calculatedPIM3 = useMemo(() => {
    // Official PIM3 formulation
    let score = -4.8829;
    if (form.outcome.pupils === 0) score += 1.6677; // Fixed pupils
    if (form.outcome.electiveAdmission === 1) score -= 1.3980;
    if (form.outcome.mechanicalVentilation === 1) score += 0.5192;
    if (form.outcome.surgeryRecovery === 1) score -= 0.8876;
    
    if (form.outcome.pim3LowRiskDiagnosis === 1 || form.outcome.riskCategory === 'Low Risk') score -= 1.0506;
    if (form.outcome.pim3HighRiskDiagnosis === 1 || form.outcome.riskCategory === 'High Risk') score += 1.3787;
    if (form.outcome.pim3VeryHighRiskDiagnosis === 1 || form.outcome.riskCategory === 'Very High Risk') score += 2.5979;

    const sbp = form.outcome.systolicBP;
    if (sbp > 0) {
      score += (Math.abs(sbp - 120) * 0.0139);
    }
    const be = form.outcome.baseExcess;
    if (be !== 0) {
      score += (Math.abs(be) * 0.0531);
    }

    const pao2 = form.outcome.paO2 || 1;
    const fio2 = form.outcome.fiO2 || 21;
    const isVentilated = form.outcome.mechanicalVentilation === 1;
    if (isVentilated) {
      const pao2fio2 = (pao2 / (fio2 / 100));
      score += Math.abs((pao2fio2) - 250) * 0.001; // simplification of non-linear component for demo
    }

    const prob = Math.exp(score) / (1 + Math.exp(score));
    return { score: score.toFixed(2), prob: (prob * 100).toFixed(2) };
  }, [form.outcome]);

  // Dynamic Validation Panel
  const missingFields: { label: string; sectionId: string }[] = [];
  if (!form.patient.country) missingFields.push({ label: isEn ? 'Country missing' : 'País faltante', sectionId: 'identification' });
  if (!form.patient.city) missingFields.push({ label: isEn ? 'City missing' : 'Ciudad faltante', sectionId: 'identification' });
  if (!form.patient.hospital) missingFields.push({ label: isEn ? 'Hospital missing' : 'Hospital faltante', sectionId: 'identification' });
  if (!form.patient.mrn) missingFields.push({ label: isEn ? 'Record Number missing' : 'Número de historia faltante', sectionId: 'identification' });
  if (!form.patient.name) missingFields.push({ label: isEn ? 'Name missing' : 'Nombre faltante', sectionId: 'identification' });
  if (!form.patient.birthDate) missingFields.push({ label: isEn ? 'DOB missing' : 'Fecha de nacimiento', sectionId: 'identification' });
  if (form.outcome.weight < 0.5 || form.outcome.weight > 150) missingFields.push({ label: isEn ? 'Invalid Weight' : 'Peso inválido', sectionId: 'identification' });
  if (!form.outcome.diagnosis) missingFields.push({ label: isEn ? 'Diagnosis missing' : 'Diagnóstico faltante', sectionId: 'identification' });
  
  if (form.outcome.intubated === 0) missingFields.push({ label: isEn ? 'Specify Intubation' : 'Especifique Intubación', sectionId: 'airway' });
  if (form.outcome.intubated === 1 && !form.outcome.intubationDateTime) missingFields.push({ label: isEn ? 'Intubation Date' : 'Fecha Intubación', sectionId: 'airway' });
  if (form.outcome.intubated === 1 && !form.outcome.primaryIndication) missingFields.push({ label: isEn ? 'Intubation Indication' : 'Indicación de Intubación', sectionId: 'airway' });
  if (form.outcome.primaryIndication === '99. Other' && !form.outcome.primaryIndicationOther) missingFields.push({ label: isEn ? 'Specify Other Indication' : 'Especifique Otra Indicación', sectionId: 'airway' });
  
  if (form.outcome.systolicBP < 0 || form.outcome.systolicBP > 300) missingFields.push({ label: isEn ? 'Invalid SBP' : 'PAS inválida', sectionId: 'pim3' });
  if (form.outcome.fiO2 < 21 || form.outcome.fiO2 > 100) missingFields.push({ label: isEn ? 'Invalid FiO2' : 'FiO2 inválida', sectionId: 'pim3' });

  if (!form.outcome.riskCategory) missingFields.push({ label: isEn ? 'Risk Category Missing' : 'Categoría de Riesgo Faltante', sectionId: 'risk' });
  if (['Low Risk', 'High Risk', 'Very High Risk'].includes(form.outcome.riskCategory || '') && !form.outcome.riskSubtype) {
    missingFields.push({ label: isEn ? 'Risk Subtype Missing' : 'Subtipo de Riesgo Faltante', sectionId: 'risk' });
  }

  if (!form.caregiver.name) missingFields.push({ label: isEn ? 'Caregiver Name' : 'Nombre del Cuidador', sectionId: 'identification' });
  if (!form.caregiver.phone) missingFields.push({ label: isEn ? 'Caregiver Phone' : 'Teléfono Cuidador', sectionId: 'identification' });
  if (!form.caregiver.email || !form.caregiver.email.includes('@')) missingFields.push({ label: isEn ? 'Invalid Email' : 'Email Inválido', sectionId: 'identification' });

  const totalRequired = 15;
  const missingCount = missingFields.length;
  const canSave = missingCount === 0;
  const completionPercent = Math.min((1 - (missingCount / totalRequired)) * 100, 100).toFixed(0);

  const formRef = useRef<HTMLDivElement>(null);

  const sections = [
    { id: 'identification', icon: User, label: isEn ? 'Patient Identification' : 'Identificación del Paciente' },
    { id: 'airway', icon: Wind, label: isEn ? 'Airway Management' : 'Manejo de Vía Aérea' },
    { id: 'events', icon: AlertTriangle, label: isEn ? 'Critical Events' : 'Eventos Críticos' },
    { id: 'pim3', icon: Activity, label: isEn ? 'First ICU Hour / PIM3' : 'Primera Hora UCI / PIM3' },
    { id: 'risk', icon: ShieldCheck, label: isEn ? 'Risk Stratification' : 'Estratificación de Riesgo' },
    { id: 'outcomes', icon: TrendingDown, label: isEn ? 'Mortality Outcomes' : 'Desenlaces y Mortalidad' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!formRef.current) return;
      const scrollPos = formRef.current.scrollTop;
      let currentId = sections[0].id;
      for (const section of sections) {
        const el = document.getElementById(`sect-${section.id}`);
        if (el && el.offsetTop <= scrollPos + 300) {
          currentId = section.id;
        }
      }
      setActiveSection(currentId);
    };
    const el = formRef.current;
    el?.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleFinish = async () => {
    if (!canSave) return;
    setIsSending(true);
    await new Promise(r => setTimeout(r, 800));
    const hash = generatePatientHash(form.patient.mrn, form.patient.admissionDate);
    
    // Auto-derive patient type from age for analytics
    let t: PatientType = 'Pediatric';
    if (age.rawYears < 0.08) t = 'Neonatal'; // < 1 month
    else if (age.rawYears >= 18) t = 'Adult';
    
    const pat: Patient = {
      ...form.patient,
      type: t,
      id: hash, patientHash: hash, institutionId: state?.currentUser?.institutionId || 'inst-1',
    };
    const out: Outcome = {
      ...form.outcome,
      patientHash: hash, createdAt: new Date().toISOString(),
      age: age.rawYears, ageYears: Math.floor(age.rawYears),
      ettExpectedSize: expectedSize, ettAdequate,
      pim3Score: Number(calculatedPIM3.score), mortalityProbability: Number(calculatedPIM3.prob)
    };
    const par: ParentPatient = {
      id: Math.random().toString(36).substr(2, 9), patientHash: hash,
      name: form.caregiver.name, phone: `${form.caregiver.phoneCode} ${form.caregiver.phone}`,
      email: form.caregiver.email, consent: true, educationActivated: true, educationProgress: 0
    };
    onComplete(pat, out, par);
  };

  const handleCountryChange = (country: string) => {
    setForm(f => ({ ...f, patient: { ...f.patient, country, city: '', hospital: '' }}));
  };

  const handleCityChange = (city: string) => {
    setForm(f => ({ ...f, patient: { ...f.patient, city, hospital: '' }}));
  };

  const currentCities = form.patient.country ? Object.keys(geoData[form.patient.country] || {}) : [];
  const currentHospitals = form.patient.country && form.patient.city ? (geoData[form.patient.country][form.patient.city] || []) : [];

  return (
    <div className="h-full flex flex-col pt-2 -mx-4 -mt-4 bg-[#F5F5F5]">
      <div className="sticky top-0 z-50 bg-[#204071] text-white p-4 shadow-md flex items-center justify-between mx-4 mt-4 rounded-2xl">
        <div>
          <h1 className="font-bold">{form.patient.name || (isEn ? 'New Patient' : 'Nuevo Paciente')}</h1>
          <p className="text-xs text-blue-200">
             {age.label} • {form.patient.mrn || '---'} {form.outcome.intubated === 1 && ` • ${isEn ? 'INTUBATED' : 'INTUBADO'}`}
          </p>
        </div>
        <div className="flex gap-2 text-sm max-w-sm right-0 bg-blue-900/40 p-2 rounded-xl text-blue-100 italic">
          <Info className="w-5 h-5 flex-shrink-0" />
          <span className="text-[11px] leading-tight flex items-center">{isEn ? 'Cierre de caso permitido únicamente al dar de alta o al reportar fallecimiento.' : 'Cierre permitido SOLO si el paciente es dado de alta o fallece.'}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onExit} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold">
            {isEn ? 'Cancel' : 'Cancelar'}
          </button>
          <button onClick={handleFinish} disabled={isSending || !canSave} className="disabled:opacity-50 px-6 py-2 bg-[#85F0D4] hover:bg-[#68dcb8] text-[#204071] rounded-xl text-sm font-black flex items-center gap-2 transition-colors">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {isEn ? 'Save & Close Case' : 'Guardar y Cerrar'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-4 gap-6 relative">
        {/* Scroll Spy Sidebar */}
        <div className="w-64 flex flex-col gap-4 hidden lg:flex flex-shrink-0 relative">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <nav className="space-y-1 relative">
              {sections.map(s => (
                <button 
                  key={s.id} 
                  onClick={() => { document.getElementById(`sect-${s.id}`)?.scrollIntoView({ behavior: 'smooth' }); }}
                  className={cn("w-full flex items-center gap-3 p-3 rounded-xl text-sm text-left transition-all", activeSection === s.id ? "bg-blue-50 text-blue-900 font-bold shadow-sm" : "text-gray-500 hover:bg-gray-50")}
                >
                  <s.icon className={cn("w-4 h-4", activeSection === s.id ? "text-blue-600" : "")} /> 
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Dynamic Form Content */}
        <div className="flex-1 overflow-y-auto space-y-8 pb-32 scroll-smooth" id="clinical-form" ref={formRef}>
          
          <Section id="identification" title={isEn ? 'Patient Identification' : 'Identificación del Paciente'}>
            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <FormField label={isEn ? "Country" : "País"}>
                <select value={form.patient.country} onChange={e => handleCountryChange(e.target.value)} className="input">
                  <option value="">-- {isEn ? 'Select' : 'Seleccionar'} --</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label={isEn ? "City" : "Ciudad"}>
                <select disabled={!form.patient.country} value={form.patient.city} onChange={e => handleCityChange(e.target.value)} className="input disabled:opacity-50">
                   <option value="">-- {isEn ? 'Select City' : 'Seleccionar Ciudad'} --</option>
                   {currentCities.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label={isEn ? "Hospital" : "Hospital"}>
                <select disabled={!form.patient.city} value={form.patient.hospital} onChange={e => setForm(f=>({...f, patient: {...f.patient, hospital: e.target.value}}))} className="input disabled:opacity-50">
                   <option value="">-- {isEn ? 'Select Hospital' : 'Seleccionar Hospital'} --</option>
                   {currentHospitals.map(h => <option key={h}>{h}</option>)}
                </select>
              </FormField>
            </div>

            <FormField label={isEn ? "Record Number" : "Número de Historia"}><input value={form.patient.mrn} onChange={e => setForm(f=>({...f, patient: {...f.patient, mrn: e.target.value}}))} className="input" /></FormField>
            <FormField label={isEn ? "Full Name" : "Nombre Completo"}><input value={form.patient.name} onChange={e => setForm(f=>({...f, patient: {...f.patient, name: e.target.value}}))} className="input" /></FormField>
            <FormField label={isEn ? "Date of Birth" : "Fecha de Nacimiento"}><input type="date" value={form.patient.birthDate} onChange={e => setForm(f=>({...f, patient: {...f.patient, birthDate: e.target.value}}))} className="input" /></FormField>
            <FormField label={isEn ? "Gender" : "Género"}>
              <select value={form.patient.gender} onChange={e=>setForm(f=>({...f, patient: {...f.patient, gender: e.target.value}}))} className="input">
                <option value="Unknown">{isEn ? 'Select' : 'Seleccionar'}</option>
                <option value="Male">{isEn ? 'Male' : 'Masculino'}</option>
                <option value="Female">{isEn ? 'Female' : 'Femenino'}</option>
              </select>
            </FormField>
            <FormField label={isEn ? "Weight (kg)" : "Peso (kg)"}><input type="number" step="0.1" value={form.outcome.weight||''} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, weight: Number(e.target.value)}}))} className="input" /></FormField>
            <FormField label={isEn ? "Primary Diagnosis (ICD-10)" : "Diagnóstico Primario"}><input value={form.outcome.diagnosis} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, diagnosis: e.target.value}}))} className="input" /></FormField>
            
            <div className="col-span-full mt-6 bg-[#E8F5E9] border border-[#C8E6C9] p-6 rounded-2xl">
              <h4 className="font-black text-[#2E7D32] mb-4 text-sm flex items-center gap-2">
                <User className="w-4 h-4" /> {isEn ? 'Caregiver / Contact (Mandatory for Discharge)' : 'Cuidador / Contacto (Obligatorio para Alta)'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField label={isEn ? "Caregiver Full Name" : "Nombre Completo del Cuidador"}><input value={form.caregiver.name} onChange={e=>setForm(f=>({...f, caregiver: {...f.caregiver, name: e.target.value}}))} className="input bg-white" /></FormField>
                <FormField label={isEn ? "ID Number" : "Documento de Identidad"}><input value={form.caregiver.idNumber} onChange={e=>setForm(f=>({...f, caregiver: {...f.caregiver, idNumber: e.target.value}}))} className="input bg-white" /></FormField>
                <FormField label={isEn ? "Email Address" : "Correo Electrónico"}><input type="email" value={form.caregiver.email} onChange={e=>setForm(f=>({...f, caregiver: {...f.caregiver, email: e.target.value}}))} className="input bg-white" /></FormField>
                <div className="col-span-1 grid grid-cols-3 gap-2">
                   <div className="col-span-1"><FormField label={isEn?"Code":"Cód"}><input value={form.caregiver.phoneCode} onChange={e=>setForm(f=>({...f, caregiver: {...f.caregiver, phoneCode: e.target.value}}))} className="input bg-white text-center" /></FormField></div>
                   <div className="col-span-2"><FormField label={isEn?"Phone Number":"Teléfono"}><input value={form.caregiver.phone} onChange={e=>setForm(f=>({...f, caregiver: {...f.caregiver, phone: e.target.value}}))} className="input bg-white" /></FormField></div>
                </div>
              </div>
            </div>
          </Section>

          <Section id="airway" title={isEn ? 'Airway Management' : 'Manejo de Vía Aérea'}>
             <div className="col-span-full border-b border-gray-100 pb-6 mb-2">
               <FormField label={isEn ? "Had Endotracheal Tube?" : "¿Tuvo tubo endotraqueal?"}>
                 <BooleanToggle value={form.outcome.intubated} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, intubated: v}}))} isEn={isEn} />
               </FormField>
             </div>

             {form.outcome.intubated === 1 && (
               <div className="col-span-full animate-in slide-in-from-top-4 fade-in duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                    <FormField label={isEn ? "Primary Indication for Intubation" : "Indicación Principal de Intubación"}>
                      <select 
                        value={form.outcome.primaryIndication} 
                        onChange={e => setForm(f=>({...f, outcome: {...f.outcome, primaryIndication: e.target.value}}))} 
                        className="input bg-white w-full h-auto py-3 px-4"
                      >
                        <option value="">-- {isEn ? 'Select Indication' : 'Seleccionar Indicación'} --</option>
                        {INDICATIONS.map(i => (
                          <option key={i.value} value={i.value}>{i.value} {i.desc ? `(${i.desc})` : ''}</option>
                        ))}
                      </select>
                    </FormField>

                    {form.outcome.primaryIndication === '99. Other' && (
                      <FormField label={isEn ? "Specify Other Indication" : "Especifique Otra Indicación"}>
                        <input value={form.outcome.primaryIndicationOther} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, primaryIndicationOther: e.target.value}}))} className="input bg-white" />
                      </FormField>
                    )}

                    <div className="col-span-full border-t border-blue-100/50 my-2"></div>

                    <FormField label={isEn ? "Intubation Date & Time" : "Fecha y Hora de Intubación"}>
                      <input type="datetime-local" value={form.outcome.intubationDateTime} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, intubationDateTime: e.target.value}}))} className="input bg-white" />
                    </FormField>
                    
                    <FormField label={isEn ? "Elective ICU Admission?" : "¿Admisión Electiva en UCI?"}>
                       <BooleanToggle value={form.outcome.electiveAdmission} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, electiveAdmission: v}}))} isEn={isEn} />
                    </FormField>

                    <div className="col-span-full mt-4 pt-4 border-t border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2"><Wind className="w-4 h-4"/> {isEn ? 'First ETT Details' : 'Detalles Primer Tubo ETT'}</h4>
                        <FormField label={isEn ? "Tube Type" : "Tipo de Tubo (NeumoTaponamiento)"}>
                          <BooleanToggle value={form.outcome.ettCuffed} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, ettCuffed: v}}))} yesLabel={isEn?"Cuffed":"Con Neumo"} noLabel={isEn?"Uncuffed":"Sin Neumo"} />
                        </FormField>
                        <FormField label={isEn ? "ETT Size (mm)" : "Tamaño ETT (mm)"}>
                          <input type="number" step="0.5" value={form.outcome.ettSize || ''} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, ettSize: Number(e.target.value)}}))} className="input bg-white" />
                        </FormField>
                      </div>
                      
                      {/* Computed Display Side */}
                      <div className="bg-[#204071] text-white p-6 rounded-2xl flex flex-col justify-center">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-xs text-blue-300 uppercase tracking-wider mb-1 font-bold">{isEn ? 'Age at Intubation' : 'Edad Intubación'}</p>
                            <p className="text-2xl font-black">{age.rawYears > 0 ? age.label : '---'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-300 uppercase tracking-wider mb-1 font-bold">{isEn ? 'Expected Size' : 'Tamaño Esperado'}</p>
                            <p className="text-2xl font-black">{expectedSize.toFixed(1)} <span className="text-sm">mm</span></p>
                          </div>
                          <div className="col-span-2 pt-4 border-t border-blue-800">
                             <div className="flex items-center justify-between">
                               <p className="text-xs text-blue-300 uppercase tracking-wider font-bold">{isEn ? 'Clinical Assessment' : 'Evaluación Clínica'}</p>
                               {ettAdequate ? 
                                  <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> {isEn?'Adequate':'Adecuado'}</span> : 
                                  <span className="bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {isEn?'Suboptimal':'Subóptimo'}</span>
                               }
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                 </div>
               </div>
             )}
          </Section>

          {form.outcome.intubated === 1 && (
            <Section id="events" title={isEn ? 'Critical Events' : 'Eventos Críticos'}>
               <div className="col-span-full space-y-6">
                  {/* Event 1 */}
                  <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="font-black text-rose-900 block">D1. {isEn?'Accidental Extubation':'Extubación Accidental'}</span>
                        <p className="text-xs text-rose-700">{isEn?'Did the patient experience an unplanned extubation?':'¿Experimentó el paciente una extubación no planeada?'}</p>
                      </div>
                      <div className="w-48">
                        <BooleanToggle value={form.outcome.accidentalExtubation} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, accidentalExtubation: v}}))} isEn={isEn} />
                      </div>
                    </div>
                    {form.outcome.accidentalExtubation === 1 && (
                      <div className="mt-6 pt-6 border-t border-rose-200/50 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 fade-in">
                        <FormField label={isEn ? "Number of Events" : "Número de Eventos"}><input type="number" value={form.outcome.accidentalExtubationCount} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, accidentalExtubationCount: Number(e.target.value)}}))} className="input bg-white" /></FormField>
                        <FormField label={isEn ? "New Tube Size" : "Nuevo Tamaño Tubo"}><input type="number" step="0.5" value={form.outcome.newTubeSizeAccidental} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, newTubeSizeAccidental: Number(e.target.value)}}))} className="input bg-white" /></FormField>
                        <FormField label={isEn ? "CPR Required" : "Requirió RCP"}><BooleanToggle value={form.outcome.requiedCprPostAccidental} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, requiedCprPostAccidental: v}}))} isEn={isEn} /></FormField>
                      </div>
                    )}
                  </div>

                  {/* Event 2 */}
                  <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="font-black text-amber-900 block">D2. {isEn?'Elective Tube Change':'Cambio Electivo de Tubo'}</span>
                      </div>
                      <div className="w-48">
                        <BooleanToggle value={form.outcome.electiveTubeChange} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, electiveTubeChange: v}}))} isEn={isEn} />
                      </div>
                    </div>
                  </div>

                  {/* Procedures */}
                  <div className="p-5 bg-purple-50 border border-purple-100 rounded-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="font-black text-purple-900 block">E1. {isEn?'Tracheotomy Procedure':'Procedimiento Traqueotomía'}</span>
                      </div>
                      <div className="w-48">
                        <BooleanToggle value={form.outcome.tracheostomy} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, tracheostomy: v}}))} isEn={isEn} />
                      </div>
                    </div>
                  </div>
               </div>
            </Section>
          )}

          <Section id="pim3" title={isEn ? 'First ICU Hour / PIM3' : 'Primera Hora UCI / PIM3'}>
            <p className="col-span-full text-sm text-gray-500 mb-2 italic">
               {isEn ? 'Measurements MUST correspond to the first hour of ICU admission for accurate severity scoring.' : 'Las mediciones DEBEN corresponder a la primera hora tras el ingreso a la UCI.'}
            </p>
            <FormField label={isEn ? "Pupil Reactivity" : "Reactividad Pupilar"}>
               <BooleanToggle value={form.outcome.pupils} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, pupils: v}}))} yesLabel={isEn?'Reactive':'Reactivas'} noLabel={isEn?'Fixed / Non-reactive':'Fijas / No Reactivas'} />
            </FormField>
            <FormField label={isEn ? "Mechanical Ventilation" : "Ventilación Mecánica"}>
               <BooleanToggle value={form.outcome.mechanicalVentilation} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, mechanicalVentilation: v}}))} isEn={isEn} />
            </FormField>
            <FormField label={isEn ? "Recovery from Surgery" : "Recuperación Post-Quirúrgica"}>
               <BooleanToggle value={form.outcome.surgeryRecovery} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, surgeryRecovery: v}}))} isEn={isEn} />
            </FormField>
            <FormField label={isEn ? "Systolic BP (mmHg)" : "Presión Sistólica (mmHg)"}><input type="number" value={form.outcome.systolicBP || ''} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, systolicBP: Number(e.target.value)}}))} className="input" /></FormField>
            <FormField label="FiO2 (21-100)"><input type="number" value={form.outcome.fiO2 || ''} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, fiO2: Number(e.target.value)}}))} className="input" /></FormField>
            <FormField label="PaO2 (mmHg)"><input type="number" value={form.outcome.paO2 || ''} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, paO2: Number(e.target.value)}}))} className="input" /></FormField>
            <FormField label={isEn ? "Base Excess" : "Exceso de Base"}><input type="number" step="0.1" value={form.outcome.baseExcess || ''} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, baseExcess: Number(e.target.value)}}))} className="input" /></FormField>
          </Section>
          
          <Section id="risk" title={isEn ? 'Risk Stratification' : 'Estratificación de Riesgo'}>
             <div className="col-span-full bg-indigo-50 border border-indigo-100 p-6 rounded-2xl mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField label={isEn ? "Risk Category" : "Categoría de Riesgo"}>
                    <select 
                      value={form.outcome.riskCategory || ''} 
                      onChange={e => setForm(f=>({...f, outcome: {...f.outcome, riskCategory: e.target.value as any, riskSubtype: ''}}))} 
                      className="input bg-white"
                    >
                      <option value="">-- {isEn ? 'Select Category' : 'Seleccionar Categoría'} --</option>
                      <option value="None">{isEn ? 'None / Average Risk' : 'Ninguna / Riesgo Promedio'}</option>
                      <option value="Low Risk">{isEn ? 'Low Risk' : 'Riesgo Bajo'}</option>
                      <option value="High Risk">{isEn ? 'High Risk' : 'Riesgo Alto'}</option>
                      <option value="Very High Risk">{isEn ? 'Very High Risk' : 'Riesgo Muy Alto'}</option>
                    </select>
                  </FormField>

                  {['Low Risk', 'High Risk', 'Very High Risk'].includes(form.outcome.riskCategory || '') && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                      <FormField label={isEn ? "Diagnosis Subtype" : "Subtipo de Diagnóstico"}>
                        <select 
                          value={form.outcome.riskSubtype || ''} 
                          onChange={e => setForm(f=>({...f, outcome: {...f.outcome, riskSubtype: e.target.value}}))} 
                          className="input bg-white"
                        >
                          <option value="">-- {isEn ? 'Select Subtype' : 'Seleccionar Subtipo'} --</option>
                          {RISK_SUBTYPES[form.outcome.riskCategory || '']?.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </FormField>
                      {form.outcome.riskSubtype && RISK_SUBTYPES[form.outcome.riskCategory || ''].find(s => s.value === form.outcome.riskSubtype)?.desc && (
                         <p className="mt-2 text-xs italic text-indigo-700">
                           ({RISK_SUBTYPES[form.outcome.riskCategory || ''].find(s => s.value === form.outcome.riskSubtype)?.desc})
                         </p>
                      )}
                    </div>
                  )}
                </div>
             </div>

             <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="flex flex-col justify-center items-center p-8 bg-blue-50 border border-blue-100 rounded-3xl">
                  <div className="w-40 h-40 rounded-full border-[12px] border-[#204071] flex items-center justify-center bg-white shadow-xl">
                    <div className="text-center">
                      <span className="text-3xl font-black text-[#204071]">{calculatedPIM3.prob}<span className="text-lg">%</span></span>
                    </div>
                  </div>
                  <h3 className="mt-6 font-black text-[#204071] text-lg">{isEn ? 'Mortality Probability' : 'Probabilidad de Mortalidad'}</h3>
                  <p className="text-sm text-center text-blue-800/60 mt-2">{isEn ? 'Calculated automatically using the official Pediatric Index of Mortality 3 formula' : 'Calculado automáticamente usando la fórmula oficial del Índice Pediátrico de Mortalidad 3'}</p>
               </div>
               <div className="flex flex-col justify-center p-8 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-6">
                 <div>
                    <h4 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-2">{isEn ? 'Raw PIM3 Logit Score' : 'Puntaje Logit PIM3 Bruto'}</h4>
                    <span className="text-4xl font-black text-gray-900">{calculatedPIM3.score}</span>
                 </div>
                 <div className="pt-6 border-t border-gray-100 space-y-3">
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500">{isEn ? 'Physiological Deviations' : 'Desviaciones Fisiológicas'}</span>
                     <span className="font-bold text-rose-500">{Math.abs(form.outcome.baseExcess)>5 || form.outcome.systolicBP<80 ? (isEn?'High':'Alta') : (isEn?'Normal':'Normal')}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500">{isEn ? 'Ventilation Demand' : 'Precisión de Ventilación'}</span>
                     <span className="font-bold text-amber-500">{(form.outcome.paO2 / (form.outcome.fiO2/100)) < 200 ? (isEn?'Critical':'Crítico') : (isEn?'Stable':'Estable')}</span>
                   </div>
                 </div>
               </div>
             </div>
          </Section>

          <Section id="outcomes" title={isEn ? 'Mortality Outcomes' : 'Desenlaces y Mortalidad'}>
             <div className="col-span-full border-b border-gray-100 pb-6 mb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
               <FormField label={isEn ? "Vital Status at ICU Discharge" : "Estado Vital al Alta en UCI"}>
                 <select value={form.outcome.status} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, status: e.target.value as 'Living'|'Deceased'}}))} className="input bg-[#204071] text-white border-transparent font-bold">
                   <option value="Living">{isEn ? 'Discharged Alive' : 'Dado de Alta (Vivo)'}</option>
                   <option value="Deceased">{isEn ? 'Deceased' : 'Fallecido'}</option>
                 </select>
               </FormField>
               
               <FormField label={isEn ? "Mechanical Ventilation Days" : "Días de Ventilación Mecánica"}>
                 <input type="number" value={form.outcome.ventilationDays} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, ventilationDays: Number(e.target.value)}}))} className="input" />
               </FormField>
             </div>
             
             {form.outcome.status === 'Deceased' && (
               <div className="col-span-full animate-in slide-in-from-top-2 fade-in">
                 <FormField label={isEn ? "Primary Respiratory Mortality?" : "¿Mortalidad Primaria Respiratoria?"}>
                   <BooleanToggle value={form.outcome.mortalityRespiratory} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, mortalityRespiratory: v}}))} isEn={isEn} />
                 </FormField>
               </div>
             )}
          </Section>

        </div>

        {/* Validation Right Sidebar */}
        <div className="w-72 flex flex-col gap-6 hidden xl:flex flex-shrink-0 relative">
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 p-5 sticky top-0">
            <h3 className="text-xs font-black uppercase text-[#204071] mb-2">{isEn ? 'Completion Progress' : 'Progreso'} <span className="text-blue-500">{completionPercent}%</span></h3>
            <div className="w-full h-2 bg-gray-100 rounded-full mb-6 overflow-hidden">
               <div className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out" style={{width: `${completionPercent}%`}}/>
            </div>
            
            <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">{isEn ? 'Pending Requirements' : 'Requisitos Pendientes'} ({missingCount})</h4>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
               {missingFields.map((nf,i) => (
                 <button 
                   key={i} 
                   onClick={() => document.getElementById(`sect-${nf.sectionId}`)?.scrollIntoView({ behavior: 'smooth' })}
                   className="w-full text-left text-[11px] font-bold text-rose-600 flex items-start gap-2 bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl transition-colors"
                 >
                   <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/> {nf.label}
                 </button>
               ))}
               {canSave && (
                 <div className="text-xs uppercase font-black text-emerald-700 flex flex-col items-center justify-center gap-2 bg-emerald-50 p-6 rounded-xl border border-emerald-100 text-center">
                   <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                     <CheckCircle2 className="w-6 h-6"/> 
                   </div>
                   {isEn ? 'Ready for Case Closure' : 'Listo para Cierre de Caso'}
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: any) {
  return (
    <section id={`sect-${id}`} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 scroll-m-8">
      <h3 className="text-xl font-black text-[#204071] mb-8">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {children}
      </div>
    </section>
  );
}

function FormField({ label, children }: any) {
  return (
    <div className="space-y-2 w-full">
      <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider inline-block">{label}</label>
      {React.cloneElement(children as any, { 
         className: cn("w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#204071] focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm", children.props.className) 
      })}
    </div>
  );
}

const BooleanToggle = ({ value, onChange, yesLabel, noLabel, isEn }: any) => {
  const yLabel = yesLabel || (isEn ? 'YES' : 'SÍ');
  const nLabel = noLabel || (isEn ? 'NO' : 'NO');
  
  return (
    <div className="flex gap-2 w-full">
      <button
        onClick={(e) => { e.preventDefault(); onChange(1); }}
        className={cn("flex-1 py-3 px-2 rounded-xl text-xs font-black tracking-widest transition-all outline-none", 
          value === 1 ? "bg-[#204071] text-white shadow-md border-transparent" : "bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 hover:border-gray-300")}
      >
        {yLabel}
      </button>
      <button
        onClick={(e) => { e.preventDefault(); onChange(2); }}
        className={cn("flex-1 py-3 px-2 rounded-xl text-xs font-black tracking-widest transition-all outline-none", 
          value === 2 ? "bg-[#204071] text-white shadow-md border-transparent" : "bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 hover:border-gray-300")}
      >
        {nLabel}
      </button>
    </div>
  );
};
