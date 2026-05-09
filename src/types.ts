/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Clinician' | 'Admin/Analyst' | 'Caregiver' | 'ClinicalTrainer' | 'ClinicalUser' | 'Administrator' | 'Analyst' | 'Guest';

export type PatientType = 'Neonatal' | 'Pediatric' | 'Adult';

export type RegistrationType = 'ClinicalUser' | 'ParentPatient' | 'Guest';

export interface Patient {
  id: string; // Internal UUID
  identifier: string; // Patient Identification Number
  name: string; // [OBLIGATORIO - Texto]
  mrn: string; // Medical Record Number (Encrypted/Hidden)
  type: PatientType;
  gender: string;
  birthDate: string; // [OBLIGATORIO]
  admissionDate: string;
  dischargeDate: string;
  patientHash: string; // The link to everything else
  institutionId: string;
  hospital: string;
  city: string;
  country: string;
}

export interface Outcome {
  patientHash: string;
  age: number; // Decimal (0.1 = 1 month)
  ageYears?: number;
  ageMonths?: number;
  ageDays?: number;
  weight: number; // Kilograms
  weightAtBirth?: number; // Neonatal specific
  gestationalAge?: number; // Neonatal specific
  
  // PIM3 Section - Database Key v2
  pupils: 0 | 1; // 0=Non-reactive, 1=Reactive (Simplified to 0/1 as per requirement)
  systolicBP: number;
  fiO2: number; // Percentage 21-100
  paO2: number; // mmHg 0-500
  baseExcess: number; // mmol/L
  electiveAdmission: boolean;
  mechanicalVentilation: boolean;
  surgeryRecovery: 0 | 1; // 0=No, 1=Yes
  
  // Risk Taxonomy / PIM3
  weightedDiagnosis: string;
  pim3LowRiskDiagnosis: boolean;
  pim3HighRiskDiagnosis: boolean;
  pim3VeryHighRiskDiagnosis: boolean;
  pim3Score: number;
  mortalityProbability: number;
  manualMortalityProbability?: number;

  diagnosis: string; // Primary category
  
  // 1. MANEJO DE VÍA AÉREA - TUBO ENDOTRAQUEAL (ETT)
  intubated: 1 | 2; // 1=Yes, 2=No
  intubationDateTime?: string; // [OBLIGATORIO si TET=Sí]
  ettSize?: number; // 2.0 to 8.0, 0.5 increments
  ettExpectedSize?: number; // Calculation
  ettAdequate?: boolean; // Toggle Sí/No (within 0.5mm)
  ettCuffed?: boolean; // true = CON BALÓN, false = SIN BALÓN

  // 2. EVENTOS DE VÍA AÉREA - EXTUBACIONES
  accidentalExtubation: 1 | 2; // 1=Yes, 2=No
  accidentalExtubationCount?: number;
  newTubeSizeAccidental?: number;
  requiedCprPostAccidental?: boolean;
  
  electiveTubeChange?: boolean;
  newTubeSizeElective?: number;

  electiveExtubation?: boolean;
  electiveExtubationDate?: string;
  reintubationNeededPostElective?: boolean;
  failedExtubationAttempts?: number;
  successfulExtubationDate?: string;

  tracheostomy?: boolean;

  // 3. DESENLACE - MORTALIDAD
  status: 'Living' | 'Deceased'; // MORTALIDAD S/N
  mortalityRespiratory?: boolean; // MORT. CAUSAS RESPIRATORIA S/N
  ventilationDays: number;
  
  createdAt: string;
}

export interface ParentPatient {
  id: string;
  patientHash: string;
  name: string;
  phone: string;
  email: string;
  consent: boolean;
  educationActivated: boolean;
  educationProgress: number; // 0 to 100
}

export interface Institution {
  id: string;
  name: string;
  domainWhitelist: string[];
}

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  institutionId: string;
  professionSlug?: string;
  specialtySlug?: string;
  status: 'Active' | 'Pending' | 'Inactive';
}

export interface AppState {
  currentUser: {
    id: string;
    role: UserRole;
    name: string;
    institutionId: string;
  } | null;
  patients: Patient[];
  outcomes: Outcome[];
  parentPatients: ParentPatient[];
  institutions: Institution[];
  users: AppUser[];
}
