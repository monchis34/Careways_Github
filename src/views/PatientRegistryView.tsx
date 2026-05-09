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
  defaultMode?: ViewMode;
  onNavigate?: (view: string) => void;
}

type ViewMode = 'list' | 'single' | 'bulk';

export default function PatientRegistryView({ state, onComplete, onBulkComplete, defaultMode = 'list', onNavigate }: PatientRegistryViewProps) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Living' | 'Deceased'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Neonatal' | 'Pediatric'>('All');
  
  // Advanced Filters
  const [filterInstitution, setFilterInstitution] = useState('All');
  const [filterDiagnosis, setFilterDiagnosis] = useState('All');
  const [filterCity, setFilterCity] = useState('All');
  const [filterCountry, setFilterCountry] = useState('All');

  const uniqueInstitutions = useMemo(() => Array.from(new Set(state.patients.map(p => p.hospital).filter(Boolean))), [state.patients]);
  const uniqueDiagnoses = useMemo(() => Array.from(new Set(state.outcomes.map(o => o.diagnosis).filter(Boolean))), [state.outcomes]);
  const uniqueCities = useMemo(() => Array.from(new Set(state.patients.map(p => p.city).filter(Boolean))), [state.patients]);
  const uniqueCountries = useMemo(() => Array.from(new Set(state.patients.map(p => p.country).filter(Boolean))), [state.patients]);

  const filteredPatients = useMemo(() => {
    return state.patients.filter(p => {
      const outcome = state.outcomes.find(o => o.patientHash === p.patientHash);
      const matchesSearch = p.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.patientHash.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || outcome?.status === statusFilter;
      const matchesType = typeFilter === 'All' || p.type === typeFilter;
      
      const matchesInstitution = filterInstitution === 'All' || p.hospital === filterInstitution;
      const matchesDiagnosis = filterDiagnosis === 'All' || (outcome?.diagnosis && outcome.diagnosis.toLowerCase().includes(filterDiagnosis.toLowerCase()));
      const matchesCity = filterCity === 'All' || p.city === filterCity;
      const matchesCountry = filterCountry === 'All' || p.country === filterCountry;
      
      return matchesSearch && matchesStatus && matchesType && matchesInstitution && matchesDiagnosis && matchesCity && matchesCountry;
    });
  }, [state.patients, state.outcomes, searchTerm, statusFilter, typeFilter, filterInstitution, filterDiagnosis, filterCity, filterCountry]);

  const activeFiltersCount = (statusFilter !== 'All' ? 1 : 0) + (typeFilter !== 'All' ? 1 : 0) + (filterInstitution !== 'All' ? 1 : 0) + (filterDiagnosis !== 'All' ? 1 : 0) + (filterCity !== 'All' ? 1 : 0) + (filterCountry !== 'All' ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('All');
    setTypeFilter('All');
    setFilterInstitution('All');
    setFilterDiagnosis('All');
    setFilterCity('All');
    setFilterCountry('All');
    setSearchTerm('');
  };

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
        onClose={() => {
          if (onNavigate) {
            onNavigate('registry');
          } else {
            setViewMode('list');
          }
        }}
        onComplete={(p, o, pp) => {
          onBulkComplete(p, o, pp);
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
            onClick={() => onNavigate ? onNavigate('bulk') : setViewMode('bulk')}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-all"
          >
            <Database className="w-4 h-4" />
            <span>{t.userMgmt.bulkUpload}</span>
          </button>
          <button 
            onClick={() => onNavigate ? onNavigate('individual') : setViewMode('single')}
            className="flex items-center gap-2 bg-[#204071] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-900/10 hover:shadow-xl transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newAdmission}</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between w-full">
           <div className="flex-1 w-full md:w-auto relative">
             <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#3796D8]" />
             <input 
               type="text"
               placeholder="Search by ID, Name or Hash..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#3796D8]/20 focus:border-[#3796D8] outline-none transition-all"
             />
           </div>
           
           <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">{filteredPatients.length} matching patients</span>
              {activeFiltersCount > 0 && (
                 <button onClick={clearFilters} className="text-sm font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-all">Clear Filters ({activeFiltersCount})</button>
              )}
           </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-50 pt-4">
          <div className="flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-2 rounded-xl text-xs font-bold border border-gray-100">
            <Filter className="w-4 h-4" /> Filters
          </div>

          <select 
            value={filterInstitution}
            onChange={(e) => setFilterInstitution(e.target.value)}
            className="bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl text-xs font-bold text-[#204071] outline-none focus:ring-2 focus:ring-[#3796D8]/20 transition-all"
          >
            <option value="All">Institution</option>
            {uniqueInstitutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
          </select>

          <div className="relative flex items-center">
             <input 
               list="diagnoses"
               placeholder="Diagnosis..."
               value={filterDiagnosis === 'All' ? '' : filterDiagnosis}
               onChange={(e) => setFilterDiagnosis(e.target.value || 'All')}
               className="bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl text-xs font-bold text-[#204071] outline-none focus:ring-2 focus:ring-[#3796D8]/20 transition-all max-w-[200px]"
             />
             <datalist id="diagnoses">
               {uniqueDiagnoses.map(diag => <option key={diag} value={diag} />)}
             </datalist>
          </div>

          <select 
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl text-xs font-bold text-[#204071] outline-none focus:ring-2 focus:ring-[#3796D8]/20 transition-all"
          >
            <option value="All">City</option>
            {uniqueCities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>

          <select 
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl text-xs font-bold text-[#204071] outline-none focus:ring-2 focus:ring-[#3796D8]/20 transition-all"
          >
            <option value="All">Country</option>
            {uniqueCountries.map(country => <option key={country} value={country}>{country}</option>)}
          </select>

          <div className="w-px h-6 bg-gray-200 mx-1"></div>

          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 outline-none transition-all"
          >
            <option value="All">{t.allTypes}</option>
            <option value="Neonatal">Neonatal</option>
            <option value="Pediatric">Pediatric</option>
          </select>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 outline-none transition-all"
          >
            <option value="All">{t.allStatus}</option>
            <option value="Living">{t.riskTaxonomy.low}</option>
            <option value="Deceased">{t.unitAnalystView.expectedMortality}</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Patient / ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Institution / ICU</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Admission / DOB</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Diagnosis</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completion</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Risk / Alerts</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.map(patient => {
                const outcome = state.outcomes.find(o => o.patientHash === patient.patientHash);
                
                // Calculate Mock completion %
                const completionPercentage = outcome ? (outcome.status === 'Living' ? 75 : 100) : 30;
                const progressColor = completionPercentage < 30 ? 'bg-red-500' : completionPercentage < 70 ? 'bg-yellow-500' : 'bg-green-500';

                return (
                  <tr key={patient.patientHash} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#204071]">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#191c1e]">{patient.name || 'Unknown Patient'}</p>
                          <p className="text-[10px] font-mono text-gray-400">ID: {patient.identifier || patient.mrn || 'Unknown ID'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-700">{patient.hospital || 'Unknown Institution'}</p>
                        <p className="text-[10px] uppercase font-bold text-blue-500">{patient.type}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {patient.admissionDate ? format(new Date(patient.admissionDate), 'MMM dd, yyyy') : 'N/A'}
                        </div>
                        <p className="text-[10px] text-gray-400">DOB: {patient.birthDate ? format(new Date(patient.birthDate), 'MMM dd, yyyy') : 'Unknown'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-700 truncate max-w-[150px]">{outcome?.diagnosis || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-700">{completionPercentage}%</span>
                          {completionPercentage < 100 && (
                            <span className="text-[9px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">Incomplete</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className={cn("h-1.5 rounded-full w-full", progressColor)} style={{ width: `${completionPercentage}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={cn(
                          "w-max px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                          outcome?.status === 'Deceased' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          {outcome?.status === 'Deceased' ? 'High Risk' : 'Low Risk'}
                        </span>
                        {/* Mock Clinical Alerts */}
                        {completionPercentage < 70 && (
                          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-bold">
                            <AlertCircle className="w-3 h-3" /> Missing FiO2
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col gap-2 items-end">
                        <button 
                          onClick={() => {
                            if (onNavigate) {
                              onNavigate('individual', patient.patientHash);
                            } else {
                              setViewMode('single');
                            }
                          }}
                          className="px-4 py-1.5 bg-white border border-gray-200 hover:border-[#3796D8] hover:text-[#3796D8] rounded-xl text-[10px] font-bold shadow-sm transition-all text-gray-500"
                        >
                          Edit Record
                        </button>
                        <button 
                          onClick={() => {
                            if (onNavigate) {
                              onNavigate('report', patient.patientHash);
                            }
                          }}
                          className="px-4 py-2 bg-[#F6FBFF] border border-[#3796D8]/30 hover:border-[#3796D8] text-[#204071] rounded-xl text-xs font-bold shadow-sm transition-all focus:ring-2 focus:ring-[#3796D8]/20 flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#3796D8]" /> 
                          {t.openFullReport || "Open Full Clinical Report"}
                        </button>
                      </div>
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
