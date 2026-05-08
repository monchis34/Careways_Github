/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Patient, Outcome, ParentPatient, PatientType, UserRole, Institution, AppUser } from './types';
import { format, subDays, addDays } from 'date-fns';

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
    }
  ];

  const count = 250;
  
  for (let i = 0; i < count; i++) {
    // Distribution: 40% Neo, 40% Pedia, 20% Adult
    const rand = Math.random();
    let type: PatientType = 'Pediatric';
    if (rand < 0.4) type = 'Neonatal';
    else if (rand > 0.8) type = 'Adult';
    
    const mrn = `HRN-${Math.floor(Math.random() * 90000000 + 10000000)}`;
    const admissionDate = format(subDays(new Date(), Math.floor(Math.random() * 120 + 30)), 'yyyy-MM-dd');
    const dischargeDate = format(addDays(new Date(admissionDate), Math.floor(Math.random() * 20 + 2)), 'yyyy-MM-dd');
    const hash = generatePatientHash(mrn, admissionDate);
    
    const hospitals = ['Hospital Central', 'Clínica San Luis', 'General Pediatric', 'Metropolitan Health'];
    const cities = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla'];
    const countries = ['Colombia', 'USA', 'Mexico', 'Spain'];

    patients.push({
      id: Math.random().toString(36).substr(2, 9),
      mrn,
      name: `Patient Name ${i}`,
      birthDate: '2020-01-01',
      type,
      admissionDate,
      dischargeDate,
      patientHash: hash,
      hospital: hospitals[Math.floor(Math.random() * hospitals.length)],
      institutionId: 'inst-1',
      city: cities[Math.floor(Math.random() * cities.length)],
      country: countries[Math.floor(Math.random() * countries.length)]
    });
    
    // Simulate outcomes
    // Logic: Higher education progress = lower mortality (simulated correlation)
    const educationActivated = Math.random() > 0.3;
    const educationProgress = educationActivated ? Math.floor(Math.random() * 100) : 0;
    
    // Mortality probability logic
    let mortalityChance = 0.15;
    if (type === 'Neonatal') mortalityChance += 0.05;
    if (educationProgress > 70) mortalityChance -= 0.10;
    if (Math.random() < 0.1) mortalityChance += 0.2; // random critical event
    
    const isLiving = Math.random() > mortalityChance;
    const hadExtubation = Math.random() < (isLiving ? 0.05 : 0.2);
    
    outcomes.push({
      patientHash: hash,
      age: type === 'Adult' ? Math.floor(Math.random() * 60 + 20) : parseFloat((Math.random() * 15).toFixed(1)),
      weight: type === 'Adult' ? Math.floor(Math.random() * 40 + 60) : Math.floor(Math.random() * 30 + 3),
      systolicBP: Math.floor(Math.random() * 40 + 80),
      fiO2: 45,
      paO2: 85,
      baseExcess: -2.5,
      pupils: 1,
      electiveAdmission: false,
      mechanicalVentilation: true,
      surgeryRecovery: 0,
      weightedDiagnosis: 'None',
      pim3LowRiskDiagnosis: false,
      pim3HighRiskDiagnosis: false,
      pim3VeryHighRiskDiagnosis: false,
      pim3Score: 0,
      mortalityProbability: 5,
      diagnosis: DIAGNOSES[Math.floor(Math.random() * DIAGNOSES.length)],
      intubated: Math.random() > 0.5 ? 1 : 2,
      ventilationDays: Math.floor(Math.random() * 10),
      accidentalExtubation: hadExtubation ? 1 : 2,
      status: isLiving ? 'Living' : 'Deceased',
      createdAt: dischargeDate
    });
    
    parentPatients.push({
      id: Math.random().toString(36).substr(2, 9),
      patientHash: hash,
      name: `Parent/Patient ${i}`,
      phone: `+1 555-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      email: `user${i}@example.com`,
      consent: true,
      educationActivated,
      educationProgress
    });
  }
  
  return { patients, outcomes, parentPatients, institutions, users };
}
