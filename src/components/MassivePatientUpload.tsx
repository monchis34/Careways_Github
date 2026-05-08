/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useLanguage } from '../App';
import { AppState, Patient, Outcome, ParentPatient } from '../types';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  X,
  Loader2,
  Database
} from 'lucide-react';
import Papa from 'papaparse';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { generatePatientHash } from '../store';

interface MassivePatientUploadProps {
  state: AppState;
  onComplete: (patients: Patient[], outcomes: Outcome[], parentPatients: ParentPatient[]) => void;
  onClose: () => void;
}

interface UploadLog {
  row: number;
  identifier: string;
  status: 'Success' | 'Error';
  message: string;
}

const PATIENT_HEADERS = [
  'mrn',
  'type',
  'admission_date',
  'systolic_bp',
  'fio2',
  'pao2',
  'base_excess',
  'pupils_reactive',
  'diagnosis_cat',
  'age',
  'weight'
];

export default function MassivePatientUpload({ state, onComplete, onClose }: MassivePatientUploadProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [summary, setSummary] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const csvContent = PATIENT_HEADERS.join(',') + '\n' +
      'MRN12345,Pediatric,2024-05-01,95,45,85,-2.5,1,Respiratory,5.5,18.5\n' +
      'MRN67890,Neonatal,2024-05-02,80,21,90,0,1,Neurological,0.1,3.2\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_pacientes_masivos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFile = () => {
    if (!file) return;

    setIsProcessing(true);
    setLogs([]);
    setSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const missingHeaders = PATIENT_HEADERS.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          setLogs([{ row: 0, identifier: 'N/A', status: 'Error', message: `${t.massiveTasks.headersMissing}: ${missingHeaders.join(', ')}` }]);
          setIsProcessing(false);
          setSummary({ success: 0, failed: 1 });
          return;
        }

        const patients: Patient[] = [];
        const outcomes: Outcome[] = [];
        const parents: ParentPatient[] = [];
        const processingLogs: UploadLog[] = [];
        let successCount = 0;
        let failedCount = 0;

        results.data.forEach((row: any, index) => {
          const rowNum = index + 1;
          const mrn = (row.mrn || '').trim();
          const admissionDate = (row.admission_date || '').trim();

          if (!mrn || !admissionDate) {
            processingLogs.push({ row: rowNum, identifier: mrn || 'N/A', status: 'Error', message: t.massiveTasks.requiredFields });
            failedCount++;
            return;
          }

          const hash = generatePatientHash(mrn, admissionDate);
          
          // Basic Patient Object
          const newPatient: Patient = {
            id: Math.random().toString(36).substr(2, 9),
            mrn: mrn,
            name: `Patient ${mrn}`,
            birthDate: '2020-01-01',
            type: (row.type || 'Pediatric') as any,
            admissionDate,
            dischargeDate: new Date().toISOString().split('T')[0],
            patientHash: hash,
            hospital: state.institutions.find(i => i.id === state.currentUser?.institutionId)?.name || 'Unknown',
            institutionId: state.currentUser?.institutionId || 'unknown',
            city: 'Unknown',
            country: 'Unknown'
          };

          // Outcome / PIM3 Object
          const newOutcome: Outcome = {
            patientHash: hash,
            age: Number(row.age) || 0,
            weight: Number(row.weight) || 0,
            systolicBP: Number(row.systolic_bp) || 0,
            fiO2: Number(row.fio2) || 21,
            paO2: Number(row.pao2) || 0,
            baseExcess: Number(row.base_excess) || 0,
            pupils: (Number(row.pupils_reactive) === 1 ? 1 : 0) as 0|1,
            diagnosis: row.diagnosis_cat || 'Respiratory',
            surgeryRecovery: 0,
            weightedDiagnosis: 'None',
            pim3LowRiskDiagnosis: false,
            pim3HighRiskDiagnosis: false,
            pim3VeryHighRiskDiagnosis: false,
            pim3Score: 0,
            mortalityProbability: 5,
            electiveAdmission: false,
            mechanicalVentilation: row.type === 'Pediatric',
            intubated: 2,
            ventilationDays: 0,
            accidentalExtubation: 2,
            status: 'Living',
            createdAt: new Date().toISOString()
          };

          const newParent: ParentPatient = {
            id: Math.random().toString(36).substr(2, 9),
            patientHash: hash,
            name: `Parent of ${hash}`,
            email: '',
            phone: '',
            consent: true,
            educationActivated: true,
            educationProgress: 0
          };

          patients.push(newPatient);
          outcomes.push(newOutcome);
          parents.push(newParent);
          
          processingLogs.push({ row: rowNum, identifier: hash, status: 'Success', message: t.massiveTasks.clinicalSuccess });
          successCount++;
        });

        setLogs(processingLogs);
        setSummary({ success: successCount, failed: failedCount });
        setIsProcessing(false);
        if (patients.length > 0) {
          onComplete(patients, outcomes, parents);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-[#191c1e]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-emerald-50/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-600 rounded-2xl text-white">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#191c1e]">{t.massiveTasks.patientUploadTitle}</h3>
              <p className="text-sm text-gray-500">{t.analytics.massiveDataCapture}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {!summary ? (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-start gap-4">
                <FileText className="w-6 h-6 text-emerald-600 mt-1" />
                <div className="space-y-2">
                  <p className="text-sm font-bold text-emerald-900">{t.massiveTasks.stepsTitle}</p>
                  <ul className="text-xs text-emerald-700 space-y-1 list-disc pl-4">
                    {t.massiveTasks.patientSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                  <button onClick={downloadTemplate} className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:underline">
                    <Download className="w-3 h-3" /> {t.massiveTasks.downloadTemplate}
                  </button>
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-[2rem] p-12 text-center transition-all cursor-pointer",
                  file ? "border-emerald-500 bg-emerald-50/30" : "border-gray-200 hover:border-emerald-400 hover:bg-gray-50"
                )}
              >
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <div className="flex flex-col items-center">
                  <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", file ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400")}>
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-[#191c1e]">{file ? file.name : t.massiveTasks.uploadPrompt}</p>
                </div>
              </div>

              <button
                disabled={!file || isProcessing}
                onClick={processFile}
                className="w-full py-4 bg-[#00236f] text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg transition-all"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                <span>{t.massiveTasks.processOutcomes}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1">{t.common.success}</p>
                  <p className="text-4xl font-bold text-emerald-900">{summary.success}</p>
                </div>
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100 text-center">
                  <p className="text-xs font-bold text-red-600 uppercase mb-1">{t.common.error}</p>
                  <p className="text-4xl font-bold text-red-900">{summary.failed}</p>
                </div>
              </div>

              <div className="max-h-[200px] overflow-y-auto rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {logs.map((log, i) => (
                  <div key={i} className="p-4 flex items-start gap-3">
                    {log.status === 'Success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />}
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[#191c1e]">{log.identifier}</p>
                      <p className="text-[10px] text-gray-500">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button onClick={onClose} className="flex-1 py-4 bg-[#00236f] text-white rounded-2xl font-bold">{t.massiveTasks.finish}</button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
