/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { AppState } from '../types';
import { useLanguage } from '../App';
import { 
  Search, 
  FileText, 
  Shield, 
  Activity, 
  Heart, 
  Calendar,
  Lock,
  User,
  MapPin
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PatientConsultationViewProps {
  state: AppState;
}

export default function PatientConsultationView({ state }: PatientConsultationViewProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return state.patients.filter(p => p.patientHash.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [state.patients, searchTerm]);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-[#191c1e]">{t.sidebar.patientConsult}</h2>
        <p className="text-sm text-gray-500">{t.patientConsult.desc}</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-14 pr-4 py-6 bg-white border-2 border-gray-100 rounded-[2rem] text-lg font-medium shadow-sm focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none placeholder:text-gray-300"
            placeholder={t.patientConsult.searchPlaceholder}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {searchResults.map(p => (
          <PatientRecordCard key={p.id} patient={p} state={state} />
        ))}
      </div>

      {searchTerm && searchResults.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Lock className="w-6 h-6 text-gray-300" />
          </div>
          <h3 className="font-bold text-gray-800">{t.patientConsult.noRecords}</h3>
          <p className="text-sm text-gray-500 mt-1 px-8">{t.patientConsult.ensureHash}</p>
        </div>
      )}

      {!searchTerm && (
        <div className="bg-blue-50/50 p-10 rounded-[3rem] border border-blue-100 text-center">
          <Shield className="w-12 h-12 text-blue-400 mx-auto mb-6" />
          <h3 className="font-bold text-blue-900 text-xl mb-3 uppercase tracking-tight">{t.patientConsult.accessControlProtocol}</h3>
          <p className="text-blue-700/80 max-w-lg mx-auto text-sm leading-relaxed">
            {t.patientConsult.accessControlDesc}
          </p>
        </div>
      )}
    </div>
  );
}

interface PatientRecordCardProps {
  patient: any;
  state: AppState;
  key?: string | number;
}

function PatientRecordCard({ patient, state }: PatientRecordCardProps) {
  const { t } = useLanguage();
  const outcome = state.outcomes.find(o => o.patientHash === patient.patientHash);
  const parent = state.parentPatients.find(p => p.patientHash === patient.patientHash);

  return (
    <div className="bg-white rounded-[2rem] border border-[#eceef0] shadow-sm hover:shadow-xl transition-all overflow-hidden group">
      <div className="p-6 bg-blue-50/50 border-b border-[#eceef0] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <FileText className="w-5 h-5 text-[#00236f]" />
          </div>
          <span className="font-bold text-sm text-blue-900">{patient.patientHash}</span>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
          outcome?.status === 'Living' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        )}>
          {outcome?.status || 'Unknown'}
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {t.patientConsult.admission}
            </p>
            <p className="text-xs font-bold text-gray-700">{patient.admissionDate}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <User className="w-3 h-3" /> {t.patientConsult.age}
            </p>
            <p className="text-xs font-bold text-gray-700">{outcome?.age || 'N/A'} {t.patientConsult.yrs}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {t.patientConsult.facility}
          </p>
          <p className="text-xs font-bold text-gray-700">{patient.hospital} • {patient.city}</p>
        </div>

        <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.pim3Title}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-[#191c1e]">{outcome?.systolicBP || '0'}</span>
            <span className="text-[10px] font-medium text-gray-400 uppercase">{t.patientConsult.sbpAbbr}</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t.patientConsult.eduProgress}</span>
          </div>
          <span className="text-sm font-bold text-[#191c1e]">{parent?.educationProgress || 0}%</span>
        </div>
      </div>
      
      <button className="w-full py-4 bg-gray-50 border-t border-[#eceef0] text-[#00236f] font-bold text-sm hover:bg-[#00236f] hover:text-white transition-colors">
        {t.patientConsult.openFullReport}
      </button>
    </div>
  );
}
