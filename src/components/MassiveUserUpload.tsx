/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { useLanguage } from '../App';
import { AppState, AppUser, UserRole } from '../types';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  X,
  Loader2,
  Table
} from 'lucide-react';
import Papa from 'papaparse';
import { cn } from '../lib/utils';

interface MassiveUserUploadProps {
  state: AppState;
  onUpdateState: (newUsers: AppUser[]) => void;
  onClose: () => void;
}

interface UploadLog {
  row: number;
  email: string;
  status: 'Success' | 'Error';
  message: string;
}

const REQUIRED_HEADERS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'user_type',
  'profession_slug',
  'specialty_slug'
];

export default function MassiveUserUpload({ state, onUpdateState, onClose }: MassiveUserUploadProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<UploadLog[]>([]);
  const [summary, setSummary] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUserInstitution = state.institutions.find(i => i.id === state.currentUser?.institutionId);

  const downloadTemplate = () => {
    const csvContent = REQUIRED_HEADERS.join(',') + '\n' +
      'Juan,Perez,juan.perez@hospitalcentral.org,+573001234567,Clinical User,surgeon,pediatrics\n' +
      'Maria,Lopez,m.lopez@hospitalcentral.org,+573007654321,Parent-Patient,parent,\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_usuarios_masivos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processFile = () => {
    if (!file || !currentUserInstitution) return;

    setIsProcessing(true);
    setLogs([]);
    setSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          setLogs([{
            row: 0,
            email: 'N/A',
            status: 'Error',
            message: `${t.massiveTasks.headersMissing}: ${missingHeaders.join(', ')}`
          }]);
          setIsProcessing(false);
          setSummary({ success: 0, failed: 1 });
          return;
        }

        const newUsers: AppUser[] = [];
        const processingLogs: UploadLog[] = [];
        let successCount = 0;
        let failedCount = 0;

        results.data.forEach((row: any, index) => {
          const rowNum = index + 1;
          const email = (row.email || '').trim().toLowerCase();
          const firstName = (row.first_name || '').trim();
          const lastName = (row.last_name || '').trim();
          const phone = (row.phone || '').trim();
          const userType = (row.user_type || '').trim();
          const professionSlug = (row.profession_slug || '').trim();
          const specialtySlug = (row.specialty_slug || '').trim();

          // 1. Data Hygiene & Basic Validation
          if (!email || !firstName || !lastName) {
            processingLogs.push({ row: rowNum, email, status: 'Error', message: t.massiveTasks.requiredFields });
            failedCount++;
            return;
          }

          // 2. Domain Whitelist Validation
          const domain = email.split('@')[1];
          if (!currentUserInstitution.domainWhitelist.includes(domain)) {
            processingLogs.push({ row: rowNum, email, status: 'Error', message: `${t.massiveTasks.invalidDomain} (@${domain})` });
            failedCount++;
            return;
          }

          // 3. Email uniqueness (simulated check against current state)
          if (state.users.some(u => u.email === email)) {
            processingLogs.push({ row: rowNum, email, status: 'Error', message: t.massiveTasks.duplicateEmail });
            failedCount++;
            return;
          }

          // 4. Conditional Logic: Auxiliar de Enfermería or Parent/Patient ignore specialty
          let finalSpecialty = specialtySlug;
          if (professionSlug.toLowerCase() === 'auxiliar_enfermeria' || userType.toLowerCase() === 'parent-patient') {
            finalSpecialty = '';
          }

          // 5. User Creation (Pre-approved / Active)
          const newUser: AppUser = {
            id: Math.random().toString(36).substr(2, 9),
            firstName,
            lastName,
            email,
            phone,
            role: userType === 'Clinical User' ? 'Clinician' : (userType === 'Parent-Patient' ? 'Caregiver' : 'Guest'),
            institutionId: currentUserInstitution.id,
            professionSlug,
            specialtySlug: finalSpecialty,
            status: 'Active'
          };

          newUsers.push(newUser);
          processingLogs.push({ row: rowNum, email, status: 'Success', message: t.massiveTasks.clinicalSuccess });
          successCount++;
        });

        setLogs(processingLogs);
        setSummary({ success: successCount, failed: failedCount });
        setIsProcessing(false);
        if (newUsers.length > 0) {
          onUpdateState(newUsers);
        }
      },
      error: (error) => {
        setLogs([{ row: 0, email: 'N/A', status: 'Error', message: `${t.common.error}: ${error.message}` }]);
        setIsProcessing(false);
      }
    });
  };

  const downloadReport = () => {
    if (logs.length === 0) return;
    const csvContent = 'Row,Email,Status,Message\n' + 
      logs.map(l => `${l.row},${l.email},${l.status},${l.message}`).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_carga_usuarios_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-[#191c1e]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#00236f]/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#00236f] rounded-2xl text-white">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#191c1e]">{t.massiveTasks.userUploadTitle}</h3>
              <p className="text-sm text-gray-500">{t.massiveTasks.hospital}: {currentUserInstitution?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {!summary ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex items-start gap-4">
                <FileText className="w-6 h-6 text-blue-600 mt-1" />
                <div className="space-y-2">
                  <p className="text-sm font-bold text-blue-900">{t.massiveTasks.stepsTitle}</p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                    {t.massiveTasks.userSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                  <button 
                    onClick={downloadTemplate}
                    className="mt-2 flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    <Download className="w-3 h-3" />
                    {t.massiveTasks.downloadTemplate}
                  </button>
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-[2rem] p-12 text-center transition-all cursor-pointer",
                  file ? "border-blue-500 bg-blue-50/30" : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mb-4",
                    file ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"
                  )}>
                    <Table className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-[#191c1e]">
                    {file ? file.name : t.massiveTasks.uploadPrompt}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Máximo 10MB • Solo CSV</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  disabled={!file || isProcessing}
                  onClick={processFile}
                  className="flex-1 py-4 bg-[#00236f] text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg transition-all"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  <span>{t.massiveTasks.processUsers}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">{t.common.success}</p>
                  <p className="text-4xl font-bold text-emerald-900">{summary.success}</p>
                  <p className="text-[10px] font-medium text-emerald-600 mt-2">{t.massiveTasks.activated}</p>
                </div>
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                  <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">{t.common.error}</p>
                  <p className="text-4xl font-bold text-red-900">{summary.failed}</p>
                  <p className="text-[10px] font-medium text-red-600 mt-2">{t.massiveTasks.problems}</p>
                </div>
              </div>

              <div className="max-h-[200px] overflow-y-auto rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {logs.map((log, i) => (
                  <div key={i} className="p-4 flex items-start gap-3 bg-white">
                    {log.status === 'Success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-bold text-[#191c1e] truncate">{log.email || `Row ${log.row}`}</p>
                        <span className="text-[10px] font-medium text-gray-400">Row {log.row}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight">{log.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={downloadReport}
                  className="flex-1 py-4 bg-gray-50 text-[#00236f] rounded-2xl font-bold flex items-center justify-center gap-2 border border-[#00236f]/10"
                >
                  <Download className="w-5 h-5" />
                  <span>{t.massiveTasks.downloadLog}</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-4 bg-[#00236f] text-white rounded-2xl font-bold"
                >
                  {t.common.continue}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Re-using motion import from App/Sidebar if possible, or importing here
import { motion } from 'motion/react';
