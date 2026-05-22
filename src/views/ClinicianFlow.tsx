import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Patient, Outcome, ParentPatient, PatientType } from '../types';
import { generatePatientHash } from '../store';
import { useLanguage } from '../App';
import { 
  User, Wind, AlertTriangle, Activity, TrendingDown,
  FileText, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Info, History, Printer, Download
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';

interface ClinicianFlowProps {
  onComplete: (patient: Patient, outcome: Outcome, parentPatient: ParentPatient) => void;
  onSave?: (patient: Patient, outcome: Outcome, parentPatient: ParentPatient) => void;
  onBulkComplete?: (patients: Patient[], outcomes: Outcome[], parentPatients: ParentPatient[]) => void;
  onExit?: () => void;
  role?: string;
  state?: any;
  editMrn?: string | null;
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

const LOCALIZED_COUNTRIES: Record<string, I18nString> = {
  'USA': { en: 'USA', es: 'EE. UU.' },
  'Colombia': { en: 'Colombia', es: 'Colombia' },
  'Mexico': { en: 'Mexico', es: 'México' },
  'Spain': { en: 'Spain', es: 'España' }
};

type I18nString = { en: string; es: string };

const getLocalizedLabel = (item: { label: I18nString } | undefined | null, isEn: boolean): string => {
  if (!item) return '';
  return isEn ? item.label.en : item.label.es;
};

const getLocalizedDesc = (item: { desc?: I18nString } | undefined | null, isEn: boolean): string => {
  if (!item || !item.desc) return '';
  return isEn ? item.desc.en : item.desc.es;
};

const RISK_SUBTYPES: Record<string, { value: string, label: I18nString, desc?: I18nString }[]> = {
  'Low Risk': [
    { value: 'asthma', label: { en: 'Asthma', es: 'Asma' } },
    { value: 'bronchiolitis', label: { en: 'Bronchiolitis', es: 'Bronquiolitis' } },
    { value: 'croup', label: { en: 'Croup (laryngotracheitis)', es: 'Crup (Laringotraqueítis)' } },
    { value: 'osa', label: { en: 'Obstructive sleep apnea', es: 'Apnea obstructiva del sueño' } },
    { value: 'dka', label: { en: 'Diabetic ketoacidosis', es: 'Cetoacidosis diabética' } },
    { value: 'seizure', label: { en: 'Seizure disorders', es: 'Trastornos convulsivos' } }
  ],
  'High Risk': [
    { value: 'hemorrhage', label: { en: 'Spontaneous cerebral hemorrhage', es: 'Hemorragia cerebral espontánea' }, desc: { en: 'e.g., intracranial bleed without prior known condition', es: 'ej., sangrado intracraneal sin condición previa' } },
    { value: 'cardiomyopathy', label: { en: 'Cardiomyopathy or myocarditis', es: 'Miocardiopatía o miocarditis' }, desc: { en: 'severe heart muscle disease or inflammation', es: 'enfermedad grave del músculo cardíaco o inflamación' } },
    { value: 'hlhs', label: { en: 'Hypoplastic left heart syndrome (HLHS)', es: 'Síndrome de corazón izquierdo hipoplásico (SCIH)' }, desc: { en: 'or other severe congenital heart defects requiring urgent intervention', es: 'u otros defectos cardíacos congénitos graves que requieren intervención urgente' } },
    { value: 'neuro', label: { en: 'Neurodegenerative disorders', es: 'Trastornos neurodegenerativos' }, desc: { en: 'e.g., severe progressive neurological conditions', es: 'ej., condiciones neurológicas progresivas severas' } },
    { value: 'nec', label: { en: 'Necrotizing enterocolitis (NEC)', es: 'Enterocolitis necrotizante (ECN)' }, desc: { en: 'in infants, especially with severe forms', es: 'en lactantes, especialmente en formas graves' } }
  ],
  'Very High Risk': [
    { value: 'cardiac_arrest', label: { en: 'Cardiac arrest before ICU admission', es: 'Paro cardíaco antes del ingreso a UCI' } },
    { value: 'scid', label: { en: 'Severe combined immunodeficiency (SCID)', es: 'Inmunodeficiencia combinada grave (SCID)' } },
    { value: 'leukemia', label: { en: 'Post-induction leukemia/lymphoma', es: 'Leucemia/linfoma post-inducción' } },
    { value: 'bone_marrow', label: { en: 'Bone marrow transplant recipient', es: 'Receptor de trasplante de médula ósea' } },
    { value: 'liver_failure', label: { en: 'Severe liver failure', es: 'Insuficiencia hepática grave' } }
  ]
};

const INDICATIONS: { value: string, label: I18nString, desc: I18nString }[] = [
  { value: 'resp_failure', label: { en: '1. Respiratory Failure', es: '1. Insuficiencia Respiratoria' }, desc: { en: 'Hypoxemia, hypercapnia, ARDS, pneumonia, aspiration', es: 'Hipoxemia, hipercapnia, SDRA, neumonía, aspiración' } },
  { value: 'upper_airway', label: { en: '2. Upper Airway Obstruction', es: '2. Obstrucción de Vía Aérea Superior' }, desc: { en: 'Severe croup, subglottic stenosis, epiglottitis, foreign body', es: 'Crup severo, estenosis subglótica, epiglotitis, cuerpo extraño' } },
  { value: 'neuro_weakness', label: { en: '3. Neuromuscular Weakness', es: '3. Debilidad Neuromuscular' }, desc: { en: 'Guillain-Barré, muscular dystrophy, SMA, botulism', es: 'Guillain-Barré, distrofia muscular, AME, botulismo' } },
  { value: 'drive_impairment', label: { en: '4. Respiratory Drive Impairment', es: '4. Alteración del Impulso Respiratorio' }, desc: { en: 'Central apnea, drug-induced, hypoventilation', es: 'Apnea central, inducida por fármacos, hipoventilación' } },
  { value: 'airway_protection', label: { en: '5. Airway Protection', es: '5. Protección de Vía Aérea' }, desc: { en: 'GCS < 8, absent gag/cough reflex', es: 'Glasgow < 8, ausencia de reflejo nauseoso/tusígeno' } },
  { value: 'hemodynamic', label: { en: '6. Hemodynamic Instability', es: '6. Inestabilidad Hemodinámica' }, desc: { en: 'Shock, cardiac arrest, CPR', es: 'Shock, paro cardíaco, RCP' } },
  { value: 'therapeutic_vent', label: { en: '7. Therapeutic Ventilation', es: '7. Ventilación Terapéutica' }, desc: { en: 'ICP control, pulmonary hypertension crisis, metabolic acidosis', es: 'Control de PIC, crisis de hipertensión pulmonar, acidosis metabólica' } },
  { value: 'pulm_hygiene', label: { en: '8. Pulmonary Hygiene', es: '8. Higiene Pulmonar' }, desc: { en: 'Inability to clear secretions, atelectasis', es: 'Incapacidad para eliminar secreciones, atelectasia' } },
  { value: 'procedures', label: { en: '9. Procedures / Sedation', es: '9. Procedimientos / Sedación' }, desc: { en: 'Surgical procedures, deep sedation, MRI', es: 'Procedimientos quirúrgicos, sedación profunda, RM' } },
  { value: 'post_op', label: { en: '10. Post-Operative', es: '10. Postoperatorio' }, desc: { en: 'Cardiac, airway, neurosurgery', es: 'Cirugía cardíaca, vía aérea, neurocirugía' } },
  { value: 'other', label: { en: '99. Other', es: '99. Otro' }, desc: { en: '', es: '' } }
];

const RISK_CATEGORIES: { id: string, label: I18nString }[] = [
  { id: 'None', label: { en: 'None / Average Risk', es: 'Ninguna / Riesgo Promedio' } },
  { id: 'Low Risk', label: { en: 'Low Risk', es: 'Riesgo Bajo' } },
  { id: 'High Risk', label: { en: 'High Risk', es: 'Riesgo Alto' } },
  { id: 'Very High Risk', label: { en: 'Very High Risk', es: 'Riesgo Muy Alto' } }
];

const GENDERS: { id: string, label: I18nString }[] = [
  { id: 'Unknown', label: { en: 'Select', es: 'Seleccionar' } },
  { id: 'Male', label: { en: 'Male', es: 'Masculino' } },
  { id: 'Female', label: { en: 'Female', es: 'Femenino' } }
];

const TUBE_TYPES: { id: number, label: I18nString }[] = [
  { id: 0, label: { en: '-- Select --', es: '-- Seleccionar --' } },
  { id: 1, label: { en: 'Cuffed', es: 'Con Neumo' } },
  { id: 2, label: { en: 'Uncuffed', es: 'Sin Neumo' } }
];

const PRIMARY_DIAGNOSES: { id: string, label: I18nString }[] = [
  { id: 'asthma', label: { en: "Asthma", es: "Asma" } },
  { id: 'bronchiolitis', label: { en: "Bronchiolitis", es: "Bronquiolitis" } },
  { id: 'croup', label: { en: "Croup (laryngotracheitis)", es: "Crup (laringotraqueítis)" } },
  { id: 'osa', label: { en: "Obstructive sleep apnea", es: "Apnea obstructiva del sueño" } },
  { id: 'dka', label: { en: "Diabetic ketoacidosis", es: "Cetoacidosis diabética" } },
  { id: 'seizure', label: { en: "Seizure disorders", es: "Trastornos convulsivos" } },
  { id: 'hemorrhage', label: { en: "Spontaneous cerebral hemorrhage", es: "Hemorragia cerebral espontánea" } },
  { id: 'cardiomyopathy', label: { en: "Cardiomyopathy or myocarditis", es: "Miocardiopatía o miocarditis" } },
  { id: 'hlhs', label: { en: "Hypoplastic left heart syndrome (HLHS)", es: "Síndrome de corazón izquierdo hipoplásico" } },
  { id: 'neuro', label: { en: "Neurodegenerative disorders", es: "Trastornos neurodegenerativos" } },
  { id: 'nec', label: { en: "Necrotizing enterocolitis (NEC)", es: "Enterocolitis necrotizante" } },
  { id: 'cardiac_arrest', label: { en: "Cardiac arrest before ICU admission", es: "Paro cardíaco antes del ingreso a UCI" } },
  { id: 'scid', label: { en: "Severe combined immunodeficiency (SCID)", es: "Inmunodeficiencia combinada grave (IDCG)" } },
  { id: 'leukemia', label: { en: "Post-induction leukemia/lymphoma", es: "Leucemia/linfoma post-inducción" } },
  { id: 'bone_marrow', label: { en: "Bone marrow transplant recipient", es: "Receptor de trasplante de médula ósea" } },
  { id: 'liver_failure', label: { en: "Severe liver failure", es: "Insuficiencia hepática grave" } },
  { id: 'pneumonia', label: { en: "Pneumonia", es: "Neumonía" } },
  { id: 'sepsis', label: { en: "Sepsis / Septic Shock", es: "Sepsis / Shock Séptico" } },
  { id: 'tbi', label: { en: "Traumatic Brain Injury", es: "Traumatismo craneoencefálico" } },
  { id: 'chd_other', label: { en: "Congenital Heart Disease (Other)", es: "Cardiopatía congénita (Otra)" } },
  { id: 'rds', label: { en: "Respiratory distress syndrome", es: "Síndrome de distrés respiratorio" } },
  { id: 'aki', label: { en: "Acute kidney injury", es: "Lesión renal aguda" } },
  { id: 'meningitis', label: { en: "Meningitis / Encephalitis", es: "Meningitis / Encefalitis" } },
];

export default function ClinicianFlow({ onComplete, onSave, onExit, state, editMrn }: ClinicianFlowProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [isSending, setIsSending] = useState(false);
  const [activeSection, setActiveSection] = useState('identification');
  const [successData, setSuccessData] = useState<{pat: Patient, out: Outcome, par: ParentPatient} | null>(null);

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
      failedExtubationAttempts: 0, successfulExtubationDate: '', tracheostomy: 0 as 0|1|2, tracheostomyDate: '',
      status: '' as '' | 'Living' | 'Deceased', deceasedLessThan24h: 0 as 0|1|2, mortalityRespiratory: 0 as 0|1|2, ventilationDays: 0,
      pupils: 2 as 0|1|2, mechanicalVentilation: 0 as 0|1|2, systolicBP: '' as unknown as number, fiO2: '' as unknown as number, paO2: '' as unknown as number, baseExcess: '' as unknown as number,
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

  useEffect(() => {
    if (editMrn) {
      let loadedMetadata: any = null;
      let logsList: any[] = [];
      const saved = localStorage.getItem(`autosave_draft_${editMrn}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.form) {
            setForm(parsed.form);
            if (parsed.activeSection) setActiveSection(parsed.activeSection);
            
            logsList.push({
               name: parsed.lastUser || (isEn ? "Previous User" : "Usuario Previo"),
               role: parsed.lastRole || "Clinician",
               action: isEn ? "Draft Auto-saved" : "Borrador Guardado",
               time: parsed.timestamp ? differenceInDays(new Date(), parseISO(parsed.timestamp)) === 0 
                  ? format(parseISO(parsed.timestamp), "HH:mm") 
                  : format(parseISO(parsed.timestamp), "MM/dd") 
                  : "Recently"
            });
            setEditLogs(logsList);
            return;
          }
        } catch (e) {}
      }

      // If no draft or failed to parse, try state
      if (state?.patients) {
        const pat = state.patients.find((p: any) => p.mrn === editMrn);
        if (pat) {
          const out = state.outcomes?.find((o: any) => o.patientHash === pat.patientHash);
          const par = state.parentPatients?.find((p: any) => p.patientHash === pat.patientHash);
          setForm(f => ({
            ...f,
            patient: { ...f.patient, ...pat },
            outcome: { ...f.outcome, ...(out || {}) },
            caregiver: { ...f.caregiver, ...(par || {}) }
          }));
          
          logsList.push({
             name: isEn ? "System" : "Sistema",
             role: "Record",
             action: isEn ? "Finalized Clinical Record" : "Registro Clínico Finalizado",
             time: pat.admissionDate
          });
          setEditLogs(logsList);
        }
      }
    }
  }, [editMrn, state, isEn]);

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
    if (form.outcome.systolicBP === '' || form.outcome.baseExcess === '' || form.outcome.paO2 === '' || form.outcome.fiO2 === '') {
      return null;
    }
    // Official PIM3 formulation
    let score = -4.8829;
    if (form.outcome.pupils === 0) score += 1.6677; // Fixed pupils
    if (form.outcome.electiveAdmission === 1) score -= 1.3980;
    if (form.outcome.mechanicalVentilation === 1 || form.outcome.intubated === 1) score += 0.5192;
    if (form.outcome.surgeryRecovery === 1) score -= 0.8876;
    
    if (form.outcome.pim3LowRiskDiagnosis === 1 || form.outcome.riskCategory === 'Low Risk') score -= 1.0506;
    if (form.outcome.pim3HighRiskDiagnosis === 1 || form.outcome.riskCategory === 'High Risk') score += 1.3787;
    if (form.outcome.pim3VeryHighRiskDiagnosis === 1 || form.outcome.riskCategory === 'Very High Risk') score += 2.5979;

    const sbp = Number(form.outcome.systolicBP);
    if (!isNaN(sbp) && sbp >= 0) {
      score += (Math.abs(sbp - 120) * 0.01395);
    }
    const be = Number(form.outcome.baseExcess);
    if (!isNaN(be)) {
      score += (Math.abs(be) * 0.104);
    }

    const pao2 = Number(form.outcome.paO2) || 1;
    const fio2 = Number(form.outcome.fiO2) || 21;
    const isVentilated = form.outcome.mechanicalVentilation === 1 || form.outcome.intubated === 1;
    if (isVentilated) {
      const pao2fio2 = (100 * pao2 / fio2);
      score += Math.abs((pao2fio2) - 250) * 0.0071; // Non-linear component representation
    }

    const prob = Math.exp(score) / (1 + Math.exp(score));
    return { score: score.toFixed(2), prob: (prob * 100).toFixed(2) };
  }, [form.outcome]);

  const [editLogs, setEditLogs] = useState<{name: string, role: string, action: string, time: string}[]>([]);

  useEffect(() => {
    if (form.patient.mrn && form.patient.mrn.length >= 3) {
      const payload = { 
        form, 
        activeSection, 
        lastUser: state?.currentUser?.name || "Dr. Staff", 
        lastRole: state?.currentUser?.role || "Clinician",
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`autosave_draft_${form.patient.mrn}`, JSON.stringify(payload));
    }
  }, [form, activeSection, state]);

  // Dynamic Validation Panel
  const missingFields: { label: string; sectionId: string }[] = [];
  if (!form.patient.country) missingFields.push({ label: isEn ? 'Country missing' : 'País faltante', sectionId: 'identification' });
  if (!form.patient.city) missingFields.push({ label: isEn ? 'City missing' : 'Ciudad faltante', sectionId: 'identification' });
  if (!form.patient.hospital) missingFields.push({ label: isEn ? 'Hospital missing' : 'Hospital faltante', sectionId: 'identification' });
  if (!form.patient.mrn) missingFields.push({ label: isEn ? 'Record Number missing' : 'Número de historia faltante', sectionId: 'identification' });
  if (!form.patient.name) missingFields.push({ label: isEn ? 'Name missing' : 'Nombre faltante', sectionId: 'identification' });
  if (!form.patient.birthDate) missingFields.push({ label: isEn ? 'DOB missing' : 'Fecha de nacimiento', sectionId: 'identification' });
  
  if (form.patient.admissionDate && form.patient.dischargeDate) {
    if (parseISO(form.patient.dischargeDate) < parseISO(form.patient.admissionDate)) {
      missingFields.push({ label: isEn ? 'Discharge date cannot be before admission date' : 'La fecha de alta no puede ser anterior a la admisión', sectionId: 'identification' });
    }
  }
  if (form.outcome.weight < 0.5 || form.outcome.weight > 150) missingFields.push({ label: isEn ? 'Invalid Weight' : 'Peso inválido', sectionId: 'identification' });
  if (!form.outcome.diagnosis) missingFields.push({ label: isEn ? 'Diagnosis missing' : 'Diagnóstico faltante', sectionId: 'identification' });
  
  if (form.outcome.intubated === 0) missingFields.push({ label: isEn ? 'Specify Intubation' : 'Especifique Intubación', sectionId: 'airway' });
  if (form.outcome.intubated === 1 && !form.outcome.intubationDateTime) missingFields.push({ label: isEn ? 'Intubation Date' : 'Fecha Intubación', sectionId: 'airway' });
  if (form.outcome.intubated === 1 && !form.outcome.primaryIndication) missingFields.push({ label: isEn ? 'Intubation Indication' : 'Indicación de Intubación', sectionId: 'airway' });
  if (form.outcome.intubated === 1 && form.outcome.primaryIndication === '99. Other' && (!form.outcome.primaryIndicationOther || form.outcome.primaryIndicationOther.trim().length < 5)) {
    missingFields.push({ label: isEn ? 'Specify Other Indication (Min 5 chars)' : 'Especifique Otra Indicación (mín 5 caracteres)', sectionId: 'airway' });
  }
  
  const warnings: { label: string; sectionId: string }[] = [];
  if (form.outcome.intubated === 1) {
    if (form.outcome.primaryIndication === '1. Respiratory Failure') {
       if (form.outcome.fiO2 <= 60 && form.outcome.paO2 >= 60 && form.outcome.mechanicalVentilation !== 1) {
         warnings.push({ label: isEn ? 'Clinical inconsistency: indication does not match physiological data' : 'Inconsistencia clínica: indicación no coincide con datos fisiológicos', sectionId: 'airway' });
       }
    }
    if (form.outcome.primaryIndication === '6. Hemodynamic Instability') {
       if ((form.outcome.systolicBP === 0 || form.outcome.systolicBP >= 90) && form.outcome.baseExcess >= -5) {
         warnings.push({ label: isEn ? 'Clinical match warning: SBP or Base Excess are not in shock range' : 'Inconsistencia clínica: PAS o exceso base no están en rango de shock', sectionId: 'airway' });
       }
    }
  }

  if (form.outcome.systolicBP === '' || Number(form.outcome.systolicBP) < 0 || Number(form.outcome.systolicBP) > 300) missingFields.push({ label: isEn ? 'Invalid/Missing SBP' : 'PAS inválida o faltante', sectionId: 'pim3' });
  if (form.outcome.fiO2 === '' || Number(form.outcome.fiO2) < 21 || Number(form.outcome.fiO2) > 100) missingFields.push({ label: isEn ? 'Invalid/Missing FiO2' : 'FiO2 inválida o faltante', sectionId: 'pim3' });
  if (form.outcome.paO2 === '' || Number(form.outcome.paO2) < 0) missingFields.push({ label: isEn ? 'Invalid/Missing PaO2' : 'PaO2 inválida o faltante', sectionId: 'pim3' });
  if (form.outcome.baseExcess === '') missingFields.push({ label: isEn ? 'Base Excess Missing' : 'Exceso Base Faltante', sectionId: 'pim3' });

  if (!calculatedPIM3) {
    warnings.push({ label: isEn ? 'Missing variables for accurate PIM3 calculation' : 'Faltan variables para cálculo preciso PIM3', sectionId: 'pim3' });
  }

  // Error for clinical inconsistency (blocks save)
  if (form.outcome.mechanicalVentilation === 1 && form.outcome.intubated !== 1) {
    missingFields.push({ label: isEn ? 'Clinical inconsistency detected with PIM3 model: Mech Vent given but No Intubation' : 'Inconsistencia clínica detectada con PIM3: Ventilación Mecánica sin Intubación', sectionId: 'pim3' });
  }

  // 6. Advanced Clinical Validation Engine
  if (form.outcome.electiveExtubation === 1 && form.outcome.intubated !== 1) {
    missingFields.push({ label: isEn ? 'Cannot have extubation without intubation' : 'No puede haber extubación sin intubación', sectionId: 'events' });
  }
  if (form.outcome.accidentalExtubation === 1 && form.outcome.intubated !== 1) {
    missingFields.push({ label: isEn ? 'Cannot have accidental extubation without intubation' : 'No puede haber extubación accidental sin intubación', sectionId: 'events' });
  }
  if (form.outcome.tracheostomy === 1 && form.outcome.mechanicalVentilation !== 1) {
    warnings.push({ label: isEn ? 'Tracheostomy without mechanical ventilation is unusual' : 'Traqueostomía sin ventilación mecánica es inusual', sectionId: 'events' });
  }
  if (age.rawYears < 1 && form.outcome.systolicBP && Number(form.outcome.systolicBP) > 120) {
    warnings.push({ label: isEn ? 'SBP > 120 is very high for infants <1y' : 'PAS > 120 es muy alta para lactantes <1a', sectionId: 'pim3' });
  } else if (age.rawYears > 15 && form.outcome.systolicBP && Number(form.outcome.systolicBP) < 80) {
    warnings.push({ label: isEn ? 'SBP < 80 is very low for >15y' : 'PAS < 80 es muy baja para >15a', sectionId: 'pim3' });
  }

  if (!form.outcome.riskCategory) missingFields.push({ label: isEn ? 'Risk Category Missing' : 'Categoría de Riesgo Faltante', sectionId: 'risk' });
  if (['Low Risk', 'High Risk', 'Very High Risk'].includes(form.outcome.riskCategory || '') && !form.outcome.riskSubtype) {
    missingFields.push({ label: isEn ? 'Risk Subtype Missing' : 'Subtipo de Riesgo Faltante', sectionId: 'risk' });
  }

  if (form.outcome.accidentalExtubation === 1) {
    if (form.outcome.accidentalExtubationCount < 1) missingFields.push({ label: isEn ? 'Invalid Accidental Extubation Count (min 1)' : 'Eventos de extubación accidental inválidos (mín 1)', sectionId: 'events' });
    if (!form.outcome.newTubeSizeAccidental || form.outcome.newTubeSizeAccidental < 2 || form.outcome.newTubeSizeAccidental > 10) missingFields.push({ label: isEn ? 'Invalid/Missing accidental new tube size (2.0-10.0)' : 'Tamaño de nuevo tubo accidental inválido o faltante (2.0-10.0)', sectionId: 'events' });
    if (form.outcome.newTubeTypeAccidentalCuffed === 0) missingFields.push({ label: isEn ? 'Accidental new tube type missing' : 'Tipo de nuevo tubo accidental faltante', sectionId: 'events' });
    if (form.outcome.requiedCprPostAccidental === 0) missingFields.push({ label: isEn ? 'CPR Required answer missing' : 'Respuesta sobre RCP requerida faltante', sectionId: 'events' });
  }

  if (form.outcome.tracheostomy === 1) {
    if (!form.outcome.tracheostomyDate) {
      missingFields.push({ label: isEn ? 'Tracheostomy Date Missing' : 'Fecha Traqueostomía Faltante', sectionId: 'events' });
    } else {
      const trachDtObj = parseISO(form.outcome.tracheostomyDate);
      if (form.outcome.intubationDateTime) {
         if (trachDtObj < parseISO(form.outcome.intubationDateTime)) {
           missingFields.push({ label: isEn ? 'Procedure date cannot be earlier than intubation' : 'La fecha del procedimiento no puede ser anterior a la intubación', sectionId: 'events' });
         }
      }
      if (form.patient.dischargeDate) {
         if (trachDtObj > parseISO(form.patient.dischargeDate)) {
           missingFields.push({ label: isEn ? 'Procedure date cannot be after discharge' : 'La fecha del procedimiento no puede ser posterior al alta', sectionId: 'events' });
         }
      }
    }
  }

  if (form.outcome.electiveTubeChange === 1) {
    if (!form.outcome.newTubeSizeElective || form.outcome.newTubeSizeElective < 2 || form.outcome.newTubeSizeElective > 10) {
      missingFields.push({ label: isEn ? 'Invalid/Missing elective new tube size (2.0-10.0)' : 'Tamaño de nuevo tubo electivo inválido o faltante (2.0-10.0)', sectionId: 'events' });
    }
    if (form.outcome.newTubeTypeElectiveCuffed === 0) {
      missingFields.push({ label: isEn ? 'Elective new tube type missing' : 'Tipo de nuevo tubo electivo faltante', sectionId: 'events' });
    }
  }

  if (form.outcome.electiveExtubation === 1) {
    if (form.outcome.reintubationNeededPostElective === 0) {
      missingFields.push({ label: isEn ? 'Reintubation after elective extubation missing' : 'Reintubación post extubación electiva faltante', sectionId: 'events' });
    }
    if (form.outcome.failedExtubationAttempts === '' as unknown as number || form.outcome.failedExtubationAttempts < 0 || form.outcome.failedExtubationAttempts > 10) {
      missingFields.push({ label: isEn ? 'Invalid/Missing failed extubation attempts (0-10)' : 'Intentos fallidos inválidos o faltantes (0-10)', sectionId: 'events' });
    }
    if (!form.outcome.successfulExtubationDate) {
      missingFields.push({ label: isEn ? 'Successful extubation date missing' : 'Fecha de extubación exitosa faltante', sectionId: 'events' });
    } else if (form.outcome.intubationDateTime) {
      if (parseISO(form.outcome.successfulExtubationDate) < parseISO(form.outcome.intubationDateTime)) {
         missingFields.push({ label: isEn ? 'Extubation date cannot be earlier than intubation' : 'La fecha de extubación no puede ser anterior a la intubación', sectionId: 'events' });
      }
    }
  }

  if (!form.outcome.status) missingFields.push({ label: isEn ? 'Vital Status Missing' : 'Estado Vital Faltante', sectionId: 'outcomes' });
  if (form.outcome.status === 'Deceased' && !form.outcome.deceasedLessThan24h) {
    missingFields.push({ label: isEn ? 'Death within 24h specification missing' : 'Especificación de muerte <24h faltante', sectionId: 'outcomes' });
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
    if (!canSave) {
       // Scroll to first invalid field section
       const firstInvalid = missingFields[0]?.sectionId;
       if (firstInvalid) {
         const el = document.getElementById(`sect-${firstInvalid}`);
         if (el && formRef.current) {
           formRef.current.scrollTo({ top: el.offsetTop - 50, behavior: 'smooth' });
           setActiveSection(firstInvalid);
         }
       }
       return;
    }
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
    
    // Derived analytics
    const excludeMortalityBenchmark = form.outcome.status === 'Deceased' && form.outcome.deceasedLessThan24h === 1;
    let tracheostomyUnder30Days = false;
    if (form.outcome.tracheostomy === 1 && form.outcome.tracheostomyDate && form.outcome.intubationDateTime) {
      tracheostomyUnder30Days = differenceInDays(parseISO(form.outcome.tracheostomyDate), parseISO(form.outcome.intubationDateTime)) < 30;
    }
    const ettAgeMismatch = !ettAdequate;
    const ventilationQualityFlags = {
       accidentalExtubations: form.outcome.accidentalExtubation === 1 ? form.outcome.accidentalExtubationCount : 0,
       failedExtubations: form.outcome.electiveExtubation === 1 ? form.outcome.failedExtubationAttempts : 0,
       prolongedVentilation: form.outcome.intubationDateTime && form.patient.dischargeDate ? (differenceInDays(parseISO(form.patient.dischargeDate), parseISO(form.outcome.intubationDateTime)) > 7) : false
    };

    const out: Outcome & any = {
      ...form.outcome,
      status: form.outcome.status as 'Living' | 'Deceased',
      patientHash: hash, createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: state?.currentUser?.name || "Clinician",
      age: age.rawYears, ageYears: Math.floor(age.rawYears),
      ettExpectedSize: expectedSize, ettAdequate,
      pim3Score: calculatedPIM3 ? Number(calculatedPIM3.score) : 0, 
      mortalityProbability: calculatedPIM3 ? Number(calculatedPIM3.prob) : 0,
      
      // Analytics Flags
      analytics_excludeMortalityBenchmark: excludeMortalityBenchmark,
      analytics_tracheostomyUnder30Days: tracheostomyUnder30Days,
      analytics_ettAgeMismatch: ettAgeMismatch,
      analytics_ventilationQualityFlags: ventilationQualityFlags
    };
    const par: ParentPatient = {
      id: Math.random().toString(36).substr(2, 9), patientHash: hash,
      name: form.caregiver.name, phone: `${form.caregiver.phoneCode} ${form.caregiver.phone}`,
      email: form.caregiver.email, consent: true, educationActivated: true, educationProgress: 0
    };
    if (onSave) {
      onSave(pat, out, par);
    }
    setSuccessData({ pat, out, par });
    setIsSending(false);
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
    <div className="h-full flex flex-col pt-2 -mx-4 -mt-4 bg-[#F5F5F5] print:overflow-visible print:h-auto print:bg-white print:m-0 print:pt-0">
      <div className="sticky top-0 z-50 bg-[#204071] text-white p-4 shadow-md flex items-center justify-between mx-4 mt-4 rounded-2xl print:hidden">
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
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center mr-2">
            <div className="w-8 h-8 rounded-full bg-blue-700 text-xs font-bold flex items-center justify-center text-blue-100 border-2 border-blue-900 relative group cursor-help shadow-sm">
              DR
              <div className="absolute hidden group-hover:block top-full mt-2 right-0 whitespace-nowrap bg-gray-900 text-white text-xs p-2 rounded-lg z-50 shadow-xl border border-gray-700 text-left">
                <p className="font-bold">Dr. Juan Pérez</p>
                <p className="text-gray-300">Physician</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-xs font-bold flex items-center justify-center text-emerald-100 border-2 border-blue-900 relative group cursor-help -ml-3 shadow-sm">
              RN
              <div className="absolute hidden group-hover:block top-full mt-2 right-0 whitespace-nowrap bg-gray-900 text-white text-xs p-2 rounded-lg z-50 shadow-xl border border-gray-700 text-left">
                <p className="font-bold">Ana Gómez</p>
                <p className="text-gray-300">Nurse</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-xs font-bold flex items-center justify-center text-indigo-100 border-2 border-blue-900 relative group cursor-help -ml-3 shadow-sm">
              RT
              <div className="absolute hidden group-hover:block top-full mt-2 right-0 whitespace-nowrap bg-gray-900 text-white text-xs p-2 rounded-lg z-50 shadow-xl border border-gray-700 text-left">
                <p className="font-bold">Carlos Ruiz</p>
                <p className="text-gray-300">Respiratory Therapist</p>
              </div>
            </div>
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
      </div>

      <div className="flex-1 flex overflow-hidden p-4 gap-6 relative print:hidden">
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

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col max-h-[300px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
              <History className="w-4 h-4" /> {isEn ? 'Clinical Activity Log' : 'Bitácora Clínica'}
            </h3>
            <div className="overflow-y-auto pr-2 space-y-4 flex-1 custom-scrollbar">
               {(editLogs.length > 0 ? editLogs : [
                 { name: "Dr. Juan Pérez", role: "Physician", action: isEn ? "Updated PIM3 variables" : "Actualizó variables PIM3", time: "10 min ago" },
                 { name: "Ana Gómez", role: "Nurse", action: isEn ? "Updated airway data" : "Actualizó datos de vía aérea", time: "1 hr ago" },
                 { name: "Carlos Ruiz", role: "Respiratory Therapist", action: isEn ? "Initial admission registry" : "Registro de admisión inicial", time: "2 hrs ago" }
               ]).map((log, i) => (
                 <div key={i} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>
                    <div>
                       <p className="font-bold text-gray-900 leading-tight">{log.name} <span className="font-normal text-gray-500 text-xs">({log.role})</span></p>
                       <p className="text-gray-600 text-[11px] mt-0.5">{log.action}</p>
                       <p className="text-gray-400 text-[10px] mt-0.5">{log.time}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Dynamic Form Content */}
        <div className="flex-1 overflow-y-auto space-y-8 pb-32 scroll-smooth" id="clinical-form" ref={formRef}>
          
          <Section id="identification" title={isEn ? 'Patient Identification' : 'Identificación del Paciente'}>
            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <FormField label={isEn ? "Country" : "País"}>
                <select value={form.patient.country} onChange={e => handleCountryChange(e.target.value)} className="input">
                  <option value="">-- {isEn ? 'Select' : 'Seleccionar'} --</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{getLocalizedLabel({ label: LOCALIZED_COUNTRIES[c] }, isEn)}</option>)}
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

            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField label={isEn ? "Hospital Patient ID" : "ID Paciente Hospital"}>
                <input value={form.patient.identifier || ''} onChange={e => setForm(f=>({...f, patient: {...f.patient, identifier: e.target.value}}))} className="input" />
              </FormField>
              <FormField label={isEn ? "Admission Date" : "Fecha de Admisión"}>
                <input type="date" value={form.patient.admissionDate} onChange={e => setForm(f=>({...f, patient: {...f.patient, admissionDate: e.target.value}}))} className="input" />
              </FormField>
              <FormField label={isEn ? "Discharge Date" : "Fecha de Alta"}>
                <input type="date" value={form.patient.dischargeDate} onChange={e => setForm(f=>({...f, patient: {...f.patient, dischargeDate: e.target.value}}))} className="input" />
              </FormField>
            </div>

            <FormField label={isEn ? "Record Number" : "Número de Historia"}>
              <input 
                 value={form.patient.mrn} 
                 onChange={e => {
                    const val = e.target.value;
                    const saved = localStorage.getItem(`autosave_draft_${val}`);
                    if (saved) {
                       try {
                         const parsed = JSON.parse(saved);
                         if (parsed.form) setForm({...parsed.form, patient: {...parsed.form.patient, mrn: val}});
                         if (parsed.activeSection) setActiveSection(parsed.activeSection);
                       } catch (e) {
                         setForm(f=>({...f, patient: {...f.patient, mrn: val}}));
                       }
                    } else {
                       setForm(f=>({...f, patient: {...f.patient, mrn: val}}));
                    }
                 }} 
                 className="input" 
              />
            </FormField>
            <FormField label={isEn ? "Full Name" : "Nombre Completo"}><input value={form.patient.name} onChange={e => setForm(f=>({...f, patient: {...f.patient, name: e.target.value}}))} className="input" /></FormField>
            <FormField label={isEn ? "Date of Birth" : "Fecha de Nacimiento"}><input type="date" value={form.patient.birthDate} onChange={e => setForm(f=>({...f, patient: {...f.patient, birthDate: e.target.value}}))} className="input" /></FormField>
            <FormField label={isEn ? "Gender" : "Género"}>
              <select value={form.patient.gender} onChange={e=>setForm(f=>({...f, patient: {...f.patient, gender: e.target.value}}))} className="input">
                {GENDERS.map(g => <option key={g.id} value={g.id}>{getLocalizedLabel(g, isEn)}</option>)}
              </select>
            </FormField>
            <FormField label={isEn ? "Weight (kg)" : "Peso (kg)"}><input type="number" min="0.5" step="0.1" value={form.outcome.weight||''} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, weight: Number(e.target.value)}}))} className="input" /></FormField>
            <FormField label={isEn ? "Primary Diagnosis" : "Diagnóstico Primario"}>
              <select value={form.outcome.diagnosis} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, diagnosis: e.target.value}}))} className="input">
                <option value="">-- {isEn ? 'Select Diagnosis' : 'Seleccionar Diagnóstico'} --</option>
                {[...PRIMARY_DIAGNOSES].sort((a,b) => getLocalizedLabel(a, isEn).localeCompare(getLocalizedLabel(b, isEn))).map(d => (
                  <option key={d.id} value={d.id}>{getLocalizedLabel(d, isEn)}</option>
                ))}
              </select>
            </FormField>
            
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
                 <BooleanToggle 
                   value={form.outcome.intubated} 
                   onChange={(v:any) => setForm(f=>({
                     ...f, 
                     outcome: {
                       ...f.outcome, 
                       intubated: v,
                       ...(v !== 1 ? { primaryIndication: '', primaryIndicationOther: '', intubationDateTime: '' } : {})
                     }
                   }))} 
                   isEn={isEn} 
                 />
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
                          <option key={i.value} value={i.value}>{getLocalizedLabel(i, isEn)} {getLocalizedDesc(i, isEn) ? `(${getLocalizedDesc(i, isEn)})` : ''}</option>
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
                      <div className="mt-6 pt-6 border-t border-rose-200/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 fade-in">
                        <FormField label={isEn ? "Number of Events" : "Número de Eventos"}><input type="number" min="1" value={form.outcome.accidentalExtubationCount} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, accidentalExtubationCount: Number(e.target.value)}}))} className="input bg-white" /></FormField>
                        <FormField label={isEn ? "New Tube Size" : "Nuevo Tamaño Tubo"}><input type="number" step="0.5" value={form.outcome.newTubeSizeAccidental} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, newTubeSizeAccidental: Number(e.target.value)}}))} className="input bg-white" /></FormField>
                        <FormField label={isEn ? "Reintubation Tube Type" : "Tipo de Tubo Reintubación"}>
                          <select value={form.outcome.newTubeTypeAccidentalCuffed} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, newTubeTypeAccidentalCuffed: Number(e.target.value) as 0|1|2}}))} className="input bg-white">
                            {TUBE_TYPES.map(t => <option key={t.id} value={t.id}>{getLocalizedLabel(t, isEn)}</option>)}
                          </select>
                        </FormField>
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
                        <BooleanToggle 
                          value={form.outcome.electiveTubeChange} 
                          onChange={(v:any) => setForm(f=>({
                             ...f, 
                             outcome: {
                               ...f.outcome, 
                               electiveTubeChange: v,
                               ...(v === 2 ? {
                                  newTubeSizeElective: 0,
                                  newTubeTypeElectiveCuffed: 0
                               } : {})
                             }
                          }))} 
                          isEn={isEn} 
                        />
                      </div>
                    </div>
                    {form.outcome.electiveTubeChange === 1 && (
                      <div className="mt-6 pt-6 border-t border-amber-200/50 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in">
                        <FormField label={isEn ? "New Tube Size" : "Nuevo Tamaño Tubo"}>
                          <input type="number" step="0.5" min="2" max="10" value={form.outcome.newTubeSizeElective || ''} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, newTubeSizeElective: Number(e.target.value)}}))} className="input bg-white" />
                        </FormField>
                        <FormField label={isEn ? "Elective Tube Type" : "Tipo de Tubo Electivo"}>
                          <select value={form.outcome.newTubeTypeElectiveCuffed} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, newTubeTypeElectiveCuffed: Number(e.target.value) as 0|1|2}}))} className="input bg-white">
                            {TUBE_TYPES.map(t => <option key={t.id} value={t.id}>{getLocalizedLabel(t, isEn)}</option>)}
                          </select>
                        </FormField>
                      </div>
                    )}
                  </div>

                  {/* Event 3 */}
                  <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="font-black text-emerald-900 block">D3. {isEn?'Elective Extubation':'Extubación Electiva'}</span>
                      </div>
                      <div className="w-48">
                        <BooleanToggle 
                          value={form.outcome.electiveExtubation} 
                          onChange={(v:any) => setForm(f=>({
                             ...f, 
                             outcome: {
                               ...f.outcome, 
                               electiveExtubation: v,
                               ...(v === 2 ? {
                                  reintubationNeededPostElective: 0,
                                  failedExtubationAttempts: '' as unknown as number,
                                  successfulExtubationDate: ''
                               } : {
                                  ...(f.outcome.failedExtubationAttempts === undefined ? {failedExtubationAttempts: '' as unknown as number} : {})
                               })
                             }
                          }))} 
                          isEn={isEn} 
                        />
                      </div>
                    </div>
                    {form.outcome.electiveExtubation === 1 && (
                      <div className="mt-6 pt-6 border-t border-emerald-200/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-2 fade-in">
                        <FormField label={isEn ? "Reintubation Needed?" : "¿Requirió Reintubación?"}>
                          <BooleanToggle value={form.outcome.reintubationNeededPostElective} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, reintubationNeededPostElective: v}}))} isEn={isEn} />
                        </FormField>
                        <FormField label={isEn ? "Failed Attempts" : "Intentos Fallidos"}>
                          <input type="number" min="0" max="10" value={form.outcome.failedExtubationAttempts} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, failedExtubationAttempts: Number(e.target.value)}}))} className="input bg-white" />
                        </FormField>
                        <FormField label={isEn ? "Successful Extubation Date" : "Fecha Extubación Exitosa"}>
                          <input type="date" value={form.outcome.successfulExtubationDate} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, successfulExtubationDate: e.target.value}}))} className="input bg-white" />
                        </FormField>
                      </div>
                    )}
                  </div>

                  {/* Procedures */}
                  <div className="p-5 bg-purple-50 border border-purple-100 rounded-2xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <span className="font-black text-purple-900 block flex items-center gap-2">E1. {isEn?'Tracheotomy Procedure':'Procedimiento Traqueotomía'}</span>
                        <p className="text-[10px] uppercase font-bold text-purple-600 mt-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Quality Metric</p>
                      </div>
                      <div className="w-48">
                        <BooleanToggle value={form.outcome.tracheostomy} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, tracheostomy: v}}))} isEn={isEn} />
                      </div>
                    </div>
                    {form.outcome.tracheostomy === 1 && (
                      <div className="mt-6 pt-6 border-t border-purple-200/50 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in">
                        <FormField label={isEn ? "Tracheostomy Date" : "Fecha de Traqueostomía"}>
                          <input type="date" value={form.outcome.tracheostomyDate || ''} onChange={e => setForm(f=>({...f, outcome: {...f.outcome, tracheostomyDate: e.target.value}}))} className="input bg-white" />
                        </FormField>
                        <FormField label={isEn ? "Days from Intubation (Calculated)" : "Días desde Intubación (Calculado)"}>
                          <input type="text" readOnly className="input bg-purple-100/50 text-purple-900 font-bold border-purple-200" value={
                             (form.outcome.intubationDateTime && form.outcome.tracheostomyDate && isValid(parseISO(form.outcome.intubationDateTime)) && isValid(parseISO(form.outcome.tracheostomyDate))) ? 
                             Math.max(0, differenceInDays(parseISO(form.outcome.tracheostomyDate), parseISO(form.outcome.intubationDateTime))) + ' days' : '---'
                          } />
                        </FormField>
                      </div>
                    )}
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
            <FormField label={isEn ? "Systolic BP (mmHg)" : "Presión Sistólica (mmHg)"}><input type="number" min="0" value={form.outcome.systolicBP || ''} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, systolicBP: Number(e.target.value)}}))} className="input" /></FormField>
            <FormField label="FiO2 (21-100)"><input type="number" min="21" max="100" value={form.outcome.fiO2 || ''} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, fiO2: Number(e.target.value)}}))} className="input" /></FormField>
            <FormField label="PaO2 (mmHg)"><input type="number" min="0" value={form.outcome.paO2 || ''} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, paO2: Number(e.target.value)}}))} className="input" /></FormField>
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
                      {RISK_CATEGORIES.map(rc => <option key={rc.id} value={rc.id}>{getLocalizedLabel(rc, isEn)}</option>)}
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
                            <option key={s.value} value={s.value}>{getLocalizedLabel(s, isEn)}</option>
                          ))}
                        </select>
                      </FormField>
                      {form.outcome.riskSubtype && RISK_SUBTYPES[form.outcome.riskCategory || ''].find(s => s.value === form.outcome.riskSubtype)?.desc && (
                         <p className="mt-2 text-xs italic text-indigo-700">
                           ({getLocalizedDesc(RISK_SUBTYPES[form.outcome.riskCategory || ''].find(s => s.value === form.outcome.riskSubtype), isEn)})
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
                      <span className="text-3xl font-black text-[#204071]">{calculatedPIM3 ? <>{calculatedPIM3.prob}<span className="text-lg">%</span></> : '---'}</span>
                    </div>
                  </div>
                  <h3 className="mt-6 font-black text-[#204071] text-lg">{isEn ? 'Mortality Probability' : 'Probabilidad de Mortalidad'}</h3>
                  <p className="text-sm text-center text-blue-800/60 mt-2">{isEn ? 'Calculated automatically using the official Pediatric Index of Mortality 3 formula' : 'Calculado automáticamente usando la fórmula oficial del Índice Pediátrico de Mortalidad 3'}</p>
               </div>
               <div className="flex flex-col justify-center p-8 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-6 relative">
                 {!calculatedPIM3 && (
                   <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 border border-amber-200 rounded-3xl text-center">
                     <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
                     <p className="text-sm font-bold text-amber-800">
                       {isEn ? 'PIM3 cannot be calculated until required physiological values are entered' : 'PIM3 no puede ser calculado hasta que se ingresen los valores fisiológicos requeridos'}
                     </p>
                   </div>
                 )}
                 <div>
                    <h4 className="text-sm font-bold uppercase text-gray-500 tracking-wider mb-2">{isEn ? 'Raw PIM3 Logit Score' : 'Puntaje Logit PIM3 Bruto'}</h4>
                    <span className="text-4xl font-black text-gray-900">{calculatedPIM3 ? calculatedPIM3.score : '---'}</span>
                 </div>
                 <div className="pt-6 border-t border-gray-100 space-y-3">
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500">{isEn ? 'Physiological Deviations' : 'Desviaciones Fisiológicas'}</span>
                     <span className="font-bold text-rose-500">{Number(form.outcome.baseExcess)!==0 && (Math.abs(Number(form.outcome.baseExcess))>5 || Number(form.outcome.systolicBP)<80) ? (isEn?'High':'Alta') : (isEn?'Normal':'Normal')}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                     <span className="text-gray-500">{isEn ? 'Ventilation Demand' : 'Precisión de Ventilación'}</span>
                     <span className="font-bold text-amber-500">{(form.outcome.paO2 && form.outcome.fiO2 && (Number(form.outcome.paO2) / (Number(form.outcome.fiO2)/100)) < 200) ? (isEn?'Critical':'Crítico') : (isEn?'Stable':'Estable')}</span>
                   </div>
                 </div>
               </div>
             </div>
          </Section>

          <Section id="outcomes" title={isEn ? 'Mortality Outcomes' : 'Desenlaces y Mortalidad'}>
             <div className="col-span-full border-b border-gray-100 pb-6 mb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
               <FormField label={isEn ? "Vital Status at ICU Discharge" : "Estado Vital al Alta en UCI"}>
                 <BooleanToggle 
                   value={form.outcome.status === 'Living' ? 1 : (form.outcome.status === 'Deceased' ? 2 : 0)} 
                   onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, status: v === 1 ? 'Living' : 'Deceased'}}))} 
                   yesLabel={isEn ? 'Discharged Alive' : 'Dado de Alta (Vivo)'} 
                   noLabel={isEn ? 'Deceased' : 'Fallecido'} 
                   isEn={isEn} 
                 />
               </FormField>
             </div>
             
             {form.outcome.status !== '' && (
               <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                 <FormField label={isEn ? "Mechanical Ventilation Days" : "Días de Ventilación Mecánica"}>
                   <input type="number" value={form.outcome.ventilationDays} onChange={e=>setForm(f=>({...f, outcome: {...f.outcome, ventilationDays: Number(e.target.value)}}))} className="input bg-white" />
                 </FormField>

                 {form.outcome.status === 'Deceased' && (
                   <>
                     <div className="col-span-full sm:col-span-1">
                       <FormField label={isEn ? "Did death occur within 24 hours of ICU admission?" : "¿Ocurrió la muerte dentro de las 24 horas del ingreso a la UCI?"}>
                         <BooleanToggle value={form.outcome.deceasedLessThan24h} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, deceasedLessThan24h: v}}))} isEn={isEn} />
                       </FormField>
                     </div>
                     <div className="col-span-full sm:col-span-1">
                       <FormField label={isEn ? "Primary Respiratory Mortality?" : "¿Mortalidad Primaria Respiratoria?"}>
                         <BooleanToggle value={form.outcome.mortalityRespiratory} onChange={(v:any) => setForm(f=>({...f, outcome: {...f.outcome, mortalityRespiratory: v}}))} isEn={isEn} />
                       </FormField>
                     </div>
                   </>
                 )}
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
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
               {missingFields.map((nf,i) => (
                 <button 
                   key={i} 
                   onClick={() => document.getElementById(`sect-${nf.sectionId}`)?.scrollIntoView({ behavior: 'smooth' })}
                   className="w-full text-left text-[11px] font-bold text-rose-600 flex items-start gap-2 bg-rose-50 hover:bg-rose-100 p-2.5 rounded-xl transition-colors"
                 >
                   <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"/> {nf.label}
                 </button>
               ))}
            </div>

            {warnings.length > 0 && (
              <>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-500 mt-6 mb-3">{isEn ? 'Clinical Warnings' : 'Advertencias Clínicas'} ({warnings.length})</h4>
                <div className="space-y-2 max-h-[20vh] overflow-y-auto pr-2 custom-scrollbar">
                   {warnings.map((w,i) => (
                     <button 
                       key={i} 
                       onClick={() => document.getElementById(`sect-${w.sectionId}`)?.scrollIntoView({ behavior: 'smooth' })}
                       className="w-full text-left text-[11px] font-bold text-amber-600 flex items-start gap-2 bg-amber-50 hover:bg-amber-100 p-2.5 rounded-xl transition-colors"
                     >
                       <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {w.label}
                     </button>
                   ))}
                </div>
              </>
            )}

            <div className="mt-6">
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

      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#204071]/80 backdrop-blur-sm print:hidden p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600 mx-auto">
               <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-center text-[#204071] mb-2">{isEn ? 'Patient Record Saved Successfully' : 'Registro de Paciente Guardado'}</h2>
            
            <div className="bg-gray-50 p-5 rounded-2xl space-y-4 mb-8 border border-gray-100 mt-6 text-sm">
               <div className="flex justify-between border-b border-gray-200 pb-3">
                 <span className="font-bold text-gray-500 uppercase text-xs">{isEn ? 'Patient Name' : 'Nombre Completo'}</span>
                 <span className="font-bold text-gray-900">{successData.pat.name}</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-3">
                 <span className="font-bold text-gray-500 uppercase text-xs">{isEn ? 'Patient ID' : 'ID Paciente'}</span>
                 <span className="font-bold text-gray-900">{successData.pat.mrn}</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-3">
                 <span className="font-bold text-gray-500 uppercase text-xs">{isEn ? 'Hospital' : 'Hospital'}</span>
                 <span className="font-bold text-gray-900">{successData.pat.hospital}</span>
               </div>
               <div className="flex justify-between border-b border-gray-200 pb-3">
                 <span className="font-bold text-gray-500 uppercase text-xs">{isEn ? 'Date & Time' : 'Fecha y Hora'}</span>
                 <span className="font-bold text-gray-900">{format(new Date(), 'yyyy-MM-dd HH:mm')}</span>
               </div>
               <div className="flex justify-between">
                 <span className="font-bold text-gray-500 uppercase text-xs">{isEn ? 'Recorded by' : 'Registrado por'}</span>
                 <span className="font-bold text-gray-900">{state?.currentUser?.name || (isEn ? 'Dr. Juan Pérez' : 'Dr. Juan Pérez')}</span>
               </div>
            </div>

            <div className="flex flex-col gap-3">
               <button onClick={() => window.print()} className="w-full py-3.5 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-colors flex justify-center items-center gap-2">
                 <Printer className="w-5 h-5"/> {isEn ? 'Print Record' : 'Imprimir Registro'}
               </button>
               <button onClick={() => window.print()} className="w-full py-3.5 rounded-xl bg-gray-50 text-gray-700 font-bold hover:bg-gray-100 transition-colors flex justify-center items-center gap-2">
                 <Download className="w-5 h-5"/> {isEn ? 'Download PDF' : 'Descargar PDF'}
               </button>
               <button 
                  onClick={() => {
                     setSuccessData(null);
                     if (onComplete) onComplete(successData.pat, successData.out, successData.par);
                  }} 
                  className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 hover:text-gray-700 transition-colors mt-2"
               >
                 {isEn ? 'Close & Continue' : 'Cerrar y Continuar'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Clinical Record */}
      {successData && (
        <div className="hidden print:block absolute top-0 left-0 w-full min-h-screen bg-white z-[99999] text-black">
           <div className="max-w-4xl mx-auto p-12 print-content">
              <div className="border-b-4 border-black pb-6 mb-8 flex justify-between items-end">
                 <div>
                   <h1 className="text-4xl font-black">{isEn ? 'CLINICAL PATIENT REPORT' : 'HISTORIA CLÍNICA'}</h1>
                   <p className="text-gray-500 mt-2 font-bold">{successData.pat.hospital} • {successData.pat.city}, {successData.pat.country}</p>
                 </div>
                 <div className="text-right">
                   <p className="font-bold text-lg">{format(new Date(), 'yyyy-MM-dd HH:mm')}</p>
                   <p className="text-sm text-gray-500">{isEn ? 'Recorded by:' : 'Registrado por:'} {state?.currentUser?.name || 'Dr. Juan Pérez'}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                 <div>
                   <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 uppercase">{isEn ? 'Patient Details' : 'Datos del Paciente'}</h2>
                   <div className="space-y-2">
                     <p><span className="font-bold mr-2 uppercase text-xs">{isEn ? 'Name:' : 'Nombre:'}</span> {successData.pat.name}</p>
                     <p><span className="font-bold mr-2 uppercase text-xs">{isEn ? 'Record ID:' : 'ID:'}</span> {successData.pat.mrn}</p>
                     <p><span className="font-bold mr-2 uppercase text-xs">{isEn ? 'DOB / Type:' : 'Fecha Nac. / Tipo:'}</span> {successData.pat.birthDate} ({successData.pat.type})</p>
                     <p><span className="font-bold mr-2 uppercase text-xs">{isEn ? 'Gender:' : 'Género:'}</span> {successData.pat.gender}</p>
                   </div>
                 </div>
                 <div>
                   <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 uppercase">{isEn ? 'Caregiver Details' : 'Datos del Cuidador'}</h2>
                   <div className="space-y-2">
                     <p><span className="font-bold mr-2 uppercase text-xs">{isEn ? 'Name:' : 'Nombre:'}</span> {successData.par.name}</p>
                     <p><span className="font-bold mr-2 uppercase text-xs">{isEn ? 'Contact:' : 'Contacto:'}</span> {successData.par.phone}</p>
                     <p><span className="font-bold mr-2 uppercase text-xs">{isEn ? 'Email:' : 'Correo:'}</span> {successData.par.email}</p>
                   </div>
                 </div>
              </div>

              <div className="mb-12">
                 <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 uppercase">{isEn ? 'Clinical Abstract' : 'Resumen Clínico'}</h2>
                 <div className="grid grid-cols-3 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                   <div>
                     <p className="text-xs font-bold text-gray-500 uppercase">{isEn ? 'Admission Date' : 'Fecha de Ingreso'}</p>
                     <p className="text-lg font-black">{successData.pat.admissionDate}</p>
                   </div>
                   <div>
                     <p className="text-xs font-bold text-gray-500 uppercase">{isEn ? 'Outcome Status' : 'Estado de Egreso'}</p>
                     <p className="text-lg font-black">{successData.out.status}</p>
                   </div>
                   <div>
                     <p className="text-xs font-bold text-gray-500 uppercase">{isEn ? 'Risk Category' : 'Categoría de Riesgo'}</p>
                     <p className="text-lg font-black">{successData.out.riskCategory}</p>
                   </div>
                 </div>
              </div>
              
              <div className="mb-12">
                 <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 uppercase">{isEn ? 'Airway Management' : 'Manejo de Vía Aérea'}</h2>
                 <div className="space-y-4">
                     <p><span className="font-bold mr-2">{isEn ? 'Intubated:' : 'Intubado:'}</span> {successData.out.intubated === 1 ? 'Yes' : 'No'}</p>
                     {successData.out.intubated === 1 && (
                       <div className="pl-4 border-l-2 border-gray-300 space-y-2">
                          <p><span className="font-bold">{isEn ? 'Intubation Date/Time:' : 'Fecha/Hora Intubación:'}</span> {successData.out.intubationDateTime}</p>
                          <p><span className="font-bold">{isEn ? 'Tube Details:' : 'Detalles de Tubo:'}</span> {isEn?'Size':'Tamaño'} {successData.out.tubeSize} ({successData.out.tubeTypeCuffed === 1 ? (isEn?'Cuffed':'Con Neumo') : (isEn?'Uncuffed':'Sin Neumo')})</p>
                          <p><span className="font-bold">{isEn ? 'Subglottic Secretion Drainage:' : 'Aspiración Subglótica:'}</span> {successData.out.subglotticSecretionDrainage === 1 ? 'Yes' : 'No'}</p>
                       </div>
                     )}
                 </div>
              </div>
              
              <div className="mb-12">
                 <h2 className="text-xl font-bold border-b border-gray-300 pb-2 mb-4 uppercase">{isEn ? 'Critical Events' : 'Eventos Críticos'}</h2>
                 <ul className="list-disc pl-5 space-y-2">
                    {successData.out.accidentalExtubation === 1 && (
                       <li>
                         <span className="font-bold">{isEn ? 'Accidental Extubation' : 'Extubación Accidental'}</span> 
                         ({successData.out.accidentalExtubationCount} {isEn ? 'events' : 'eventos'}, CPR: {successData.out.requiedCprPostAccidental === 1 ? 'Yes' : 'No'})
                       </li>
                    )}
                    {successData.out.electiveTubeChange === 1 && (
                       <li>
                         <span className="font-bold">{isEn ? 'Elective Tube Change' : 'Cambio Electivo de Tubo'}</span> 
                         ({isEn?'New Size':'Nuevo Tamaño'}: {successData.out.newTubeSizeElective}, {isEn?'Type':'Tipo'}: {successData.out.newTubeTypeElectiveCuffed === 1 ? (isEn?'Cuffed':'Con Neumo') : (isEn?'Uncuffed':'Sin Neumo')})
                       </li>
                    )}
                    {successData.out.electiveExtubation === 1 && (
                       <li>
                         <span className="font-bold">{isEn ? 'Elective Extubation' : 'Extubación Electiva'}</span> 
                         ({isEn?'Success Date':'Fecha Exito'}: {successData.out.successfulExtubationDate})
                       </li>
                    )}
                    {successData.out.accidentalExtubation !== 1 && successData.out.electiveTubeChange !== 1 && successData.out.electiveExtubation !== 1 && (
                       <li className="text-gray-500 italic">{isEn ? 'No critical events reported.' : 'Sin eventos críticos.'}</li>
                    )}
                 </ul>
              </div>

           </div>
        </div>
      )}
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
