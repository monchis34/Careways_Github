/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { AppState, Patient, Outcome, ParentPatient } from '../types';
import { useLanguage } from '../App';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronRight,
  User,
  Calendar,
  Activity,
  FileText,
  AlertCircle,
  Plus,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import ClinicianFlow from './ClinicianFlow';
import MassivePatientUpload from '../components/MassivePatientUpload';

interface PatientRegistryViewProps {
  state: AppState;
  onComplete: (patient: Patient, outcome: Outcome, parentPatient: ParentPatient) => void;
  onBulkComplete: (patients: Patient[], outcomes: Outcome[], parentPatients: ParentPatient[]) => void;
}

type ViewMode = 'list' | 'single' | 'bulk';

export default function PatientRegistryView({ state, onComplete, onBulkComplete }: PatientRegistryViewProps) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Living' | 'Deceased'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Neonatal' | 'Pediatric'>('All');

  const filteredPatients = useMemo(() => {
    return state.patients.filter(p => {
      const outcome = state.outcomes.find(o => o.patientHash === p.patientHash);
      const matchesSearch = p.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.patientHash.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || outcome?.status === statusFilter;
      const matchesType = typeFilter === 'All' || p.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [state.patients, state.outcomes, searchTerm, statusFilter, typeFilter]);

  if (viewMode === 'single') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setViewMode('list')}
            className="text-sm font-bold text-gray-500 hover:text-[#00236f] flex items-center gap-2"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            {t.backToRegistry}
          </button>
        </div>
        <ClinicianFlow 
          state={state}
          role={state.currentUser?.role}
          onExit={() => setViewMode('list')}
          onComplete={(p, o, pp) => {
            onComplete(p, o, pp);
            setViewMode('list');
          }} 
        />
      </div>
    );
  }

  if (viewMode === 'bulk') {
    return (
      <MassivePatientUpload 
        state={state}
        onClose={() => setViewMode('list')}
        onComplete={(p, o, pp) => {
          onBulkComplete(p, o, pp);
          setViewMode('list');
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191c1e]">{t.patientRegistry}</h2>
          <p className="text-sm text-gray-500">{t.patientRegistryDesc}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setViewMode('bulk')}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-all"
          >
            <Database className="w-4 h-4" />
            <span>{t.userMgmt.bulkUpload}</span>
          </button>
          <button 
            onClick={() => setViewMode('single')}
            className="flex items-center gap-2 bg-[#00236f] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/10 hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newAdmission}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder={t.searchMrn}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold"
          >
            <option value="All">{t.allTypes}</option>
            <option value="Neonatal">Neonatal</option>
            <option value="Pediatric">Pediatric</option>
          </select>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl text-xs font-bold"
          >
            <option value="All">{t.allStatus}</option>
            <option value="Living">{t.riskTaxonomy.low}</option> {/* Use a placeholder if needed, or update options */}
            <option value="Deceased">{t.unitAnalystView.expectedMortality}</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.patientTableHeader}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.admissionTableHeader}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.outcomeStatusTableHeader}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.pim3ScoreTableHeader}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.actionsTableHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.map(patient => {
                const outcome = state.outcomes.find(o => o.patientHash === patient.patientHash);
                return (
                  <tr key={patient.patientHash} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#00236f]">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#191c1e]">{patient.mrn || 'Unknown MRN'}</p>
                          <p className="text-[10px] font-mono text-gray-400">{patient.patientHash.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-300" />
                        {patient.admissionDate ? format(new Date(patient.admissionDate), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        outcome?.status === 'Deceased' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {outcome?.status === 'Deceased' ? t.unitAnalystView.observedMortality : (outcome?.status === 'Living' ? t.riskTaxonomy.low : outcome?.status || 'Unknown')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-bold text-gray-700">
                          {outcome ? (0.5 + (outcome.systolicBP / 200)).toFixed(3) : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-[#00236f]">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <AlertCircle className="w-8 h-8 opacity-20" />
                      <p className="text-sm font-medium">{t.noPatientsFound}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
