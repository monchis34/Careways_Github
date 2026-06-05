/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Patient, Outcome, ParentPatient, PatientType, UserRole, Institution, AppUser } from './types';
import { format, subDays, addDays } from 'date-fns';
import Papa from 'papaparse';
import patientsCsvRaw from './data/patients.csv?raw';

// Simple deterministic hash for demo purposes
export function generatePatientHash(mrn: string, admissionDate: string): string {
  const str = `${mrn}-${admissionDate}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'PT-' + Math.abs(hash).toString(16).toUpperCase();
}

const DIAGNOSES = [
  'Respiratory Distress',
  'Sepsis',
  'Post-Op Cardiac',
  'Traumatic Brain Injury',
  'Pneumonia',
  'Congenital Anomaly',
  'Metabolic Crisis',
  'Preterm Birth Complications'
];

export function generateSeedData() {
  const patients: Patient[] = [];
  const outcomes: Outcome[] = [];
  const parentPatients: ParentPatient[] = [];
  
  const institutions: Institution[] = [
    { id: 'inst-1', name: 'Hospital Central', domainWhitelist: ['hospitalcentral.org', 'hc.gov'] },
    { id: 'inst-2', name: 'Clínica San Luis', domainWhitelist: ['sanluis.cl', 'sl.com'] },
    { id: 'inst-3', name: 'General Pediatric', domainWhitelist: ['peds.edu'] },
  ];

  const users: AppUser[] = [
    { 
      id: 'user-1', 
      firstName: 'Admin', 
      lastName: 'H.C.', 
      email: 'admin@hospitalcentral.org', 
      phone: '+573001234567', 
      role: 'Administrator', 
      institutionId: 'inst-1', 
      status: 'Active' 
    },
    { 
      id: 'trainer-1', 
      firstName: 'Clinical', 
      lastName: 'Trainer', 
      email: 'trainer@sanluis.cl', 
      phone: '+573111234567', 
      role: 'ClinicalTrainer', 
      institutionId: 'inst-2', 
      status: 'Active' 
    },
    { 
      id: 'clinician-1', 
      firstName: 'Clinical', 
      lastName: 'User', 
      email: 'clinician@hospitalcentral.org', 
      phone: '+573112223333', 
      role: 'ClinicalUser', 
      institutionId: 'inst-1', 
      status: 'Active' 
    },
    { 
      id: 'analyst-1', 
      firstName: 'Data', 
      lastName: 'Analyst', 
      email: 'analyst@hospitalcentral.org', 
      phone: '+573114445555', 
      role: 'Analyst', 
      institutionId: 'inst-1', 
      status: 'Active' 
    }
  ];

  const parsed = Papa.parse(patientsCsvRaw, {
    header: true,
    skipEmptyLines: true
  });

  // Clear drafts and existing local data for demo consistency
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('autosave_draft_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    // Ignore if not available
  }

  const hospitals = ['Hospital Central', 'Clínica San Luis', 'General Pediatric'];
  const cities = ['Bogotá', 'Medellín', 'Cali'];
  const countries = ['Colombia', 'USA', 'Mexico'];

  let seqId = 1000;

  parsed.data.forEach((row: any) => {
    // Generate simple data for missing fields
    const rHospital = hospitals[Math.floor(Math.random() * hospitals.length)];
    const rCity = cities[Math.floor(Math.random() * cities.length)];
    const rCountry = countries[Math.floor(Math.random() * countries.length)];
    
    let mrn = row['MRN'] || `HRN-${Math.floor(Math.random() * 90000000 + 10000000)}`;
    const admissionDate = format(subDays(new Date(), Math.floor(Math.random() * 120 + 30)), 'yyyy-MM-dd');
    const hash = generatePatientHash(mrn, admissionDate);

    seqId++;

    let genderStr = row['Genero'];
    let fullGender = 'Unknown';
    if (genderStr === 'M') fullGender = 'Male';
    if (genderStr === 'F') fullGender = 'Female';

    patients.push({
      id: Math.random().toString(36).substr(2, 9),
      identifier: `${seqId}`,
      gender: fullGender,
      mrn: mrn,
      name: row['Nombre_Paciente'] || `Patient ${seqId}`,
      birthDate: row['Fecha_Nacimiento'] || '2020-01-01',
      type: 'Pediatric',
      admissionDate,
      dischargeDate: format(addDays(new Date(admissionDate), parseInt(row['Dias_VM'] || '5') + 2), 'yyyy-MM-dd'),
      patientHash: hash,
      hospital: rHospital,
      institutionId: 'inst-1',
      city: rCity,
      country: rCountry
    });

    let isLiving = true;
    if (row['Desenlace_Paciente'] === '2' || row['Mortalidad'] === '1' || row['Status'] === 'Deceased') {
        isLiving = false;
    } else if (row['Desenlace_Paciente'] === '1' || row['Mortalidad'] === '2') {
        isLiving = true;
    }
    
    let ageRaw = parseFloat(row['Edad_Intubacion']) || 1;
    let weightRaw = parseFloat(row['Peso_kg']) || 10;
    
    // Extubation logic
    let accidentalExtubation = (row['Extubacion_Accidental'] === '1' || row['Extubacion_Accidental'] === 'SI') ? 1 : 2;

    const ettSizeStr = row['Tamano_ETT_Usado'];
    const ettSize = ettSizeStr ? parseFloat(ettSizeStr) : undefined;
    const ettCuffed = row['ETT_Con_Balon'] === '1' || row['ETT_Con_Balon'] === 'SI';
    
    // Calculaate ETT Expected Size
    const calcExpectedEtt = (age: number, cuffed: boolean) => {
        if (age < 1) {
            if (age < 0.25) return cuffed ? 3.0 : 3.5;
            if (age <= 0.5) return cuffed ? 3.5 : 4.0;
            return cuffed ? 3.5 : 4.0;
        }
        return cuffed ? (age / 4) + 3.5 : (age / 4) + 4.0;
    }
    const ettExpectedSize = calcExpectedEtt(ageRaw, ettCuffed);
    const ettAdequate = ettSize ? Math.abs(ettSize - ettExpectedSize) <= 0.5 : false;

    // Simulate simple PIM3 Risk logic based on inputs
    let baseExcess = parseFloat(row['PIM3_Base_Excess']) || 0;
    let sbp = parseFloat(row['PIM3_SBP_mmHg']) || 90;
    let fio2 = parseFloat(row['PIM3_FiO2_Porcentaje']) || 21;
    let pao2 = parseFloat(row['PIM3_PaO2_mmHg']) || 100;
    let pupils = row['PIM3_Pupilas_Reactivas'] === '1' ? 1 : 0;
    let mv = row['VM_Primera_Hora'] === '1' || row['VM_Primera_Hora'] === 'SI';
    let highRisk = row['PIM3_Riesgo_Alto'] ? parseInt(row['PIM3_Riesgo_Alto']) : 0;
    let veryHighRisk = row['PIM3_Riesgo_Muy_Alto'] ? parseInt(row['PIM3_Riesgo_Muy_Alto']) : 0;

    let pimScore = 0;
    if (sbp < 90) pimScore += 1;
    if (Math.abs(baseExcess) > 5) pimScore += 1;
    if (pupils === 0) pimScore += 2;
    if (mv) pimScore += 1;
    if (fio2 > 0 && pao2/fio2 < 2) pimScore += 1;
    if (highRisk > 0) pimScore += 2;
    if (veryHighRisk > 0) pimScore += 3;
    let mortProb = Math.min(100, Math.max(0, pimScore * 8.5)); // rough estimate mapping
    
    outcomes.push({
      patientHash: hash,
      age: ageRaw,
      weight: weightRaw,
      systolicBP: sbp,
      fiO2: fio2,
      paO2: pao2,
      baseExcess: baseExcess,
      pupils: pupils as 0|1,
      electiveAdmission: row['Admision_Electiva_UCI'] === 'SI' || row['Admision_Electiva_UCI'] === '1',
      mechanicalVentilation: mv,
      surgeryRecovery: parseInt(row['PIM3_Recuperacion_Cirugia']) as 0|1|2|3 || 0,
      weightedDiagnosis: 'None',
      pim3LowRiskDiagnosis: row['PIM3_Riesgo_Bajo'] ? (parseInt(row['PIM3_Riesgo_Bajo']) as 0|1|2) : 0,
      pim3HighRiskDiagnosis: highRisk as 0|1|2,
      pim3VeryHighRiskDiagnosis: veryHighRisk as 0|1|2,
      pim3Score: pimScore,
      mortalityProbability: mortProb,
      diagnosis: row['Diagnostico_Principal_PIM3'] || DIAGNOSES[Math.floor(Math.random() * DIAGNOSES.length)],
      intubated: (row['Intubado_UCI'] === 'SI' || row['Intubado_UCI'] === '1') ? 1 : 2,
      ventilationDays: parseFloat(row['Dias_VM']) || 0,
      accidentalExtubation: accidentalExtubation as 1|2,
      status: isLiving ? 'Living' : 'Deceased',
      createdAt: format(new Date(), 'yyyy-MM-dd'),
      ettSize: ettSize,
      ettCuffed: ettCuffed,
      ettExpectedSize: ettExpectedSize,
      ettAdequate: ettAdequate,
      electiveTubeChange: row['Cambio_Electivo_ETT'] === '1' || row['Cambio_Electivo_ETT'] === 'SI',
      electiveExtubation: row['Extubacion_Electiva'] === '1' || row['Extubacion_Electiva'] === 'SI',
      tracheostomy: row['Traqueostomia'] === '1' || row['Traqueostomia'] === 'SI' ? 1 : 2,
      tracheostomyDate: row['Fecha_Traqueostomia'] || undefined
    });
    
    parentPatients.push({
      id: Math.random().toString(36).substr(2, 9),
      patientHash: hash,
      name: `Parent of ${row['Nombre_Paciente'] || 'Patient'}`,
      phone: `+1 555-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      email: `parent${seqId}@example.com`,
      consent: true,
      educationActivated: true,
      educationProgress: Math.floor(Math.random() * 100)
    });
  });
  
  return { patients, outcomes, parentPatients, institutions, users };
}
