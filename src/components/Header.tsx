/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserRole, AppState } from '../types';
import { Bell, HelpCircle, Search, AlertTriangle, User } from 'lucide-react';
import { useLanguage } from '../App';
import { Language } from '../translations';
import { differenceInYears, parseISO } from 'date-fns';

interface HeaderProps {
  user: {
    role: UserRole;
    name: string;
  };
  onLanguageChange: (lang: Language) => void;
  currentLanguage: Language;
  state?: AppState;
}

export default function Header({ user, onLanguageChange, currentLanguage, state }: HeaderProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchResults = state?.patients ? state.patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.identifier?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5) : [];

  return (
    <header className="h-20 bg-white border-b border-[#eceef0] flex items-center justify-between px-8 flex-shrink-0 relative z-50">
      <div className="flex items-center gap-4 relative">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder={currentLanguage === 'en' ? 'Search Patient (Name, ID)...' : 'Buscar Paciente (Nombre, ID)...'}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchOpen(e.target.value.length > 0);
            }}
            onFocus={() => setIsSearchOpen(searchTerm.length > 0)}
            onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm w-96 focus:outline-none focus:ring-2 focus:ring-[#00236f]/10 focus:border-[#00236f]/20 transition-all font-bold"
          />
        </div>
        
        {/* Search Dropdown */}
        {isSearchOpen && (
          <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-2xl shadow-xl shadow-blue-900/10 border border-gray-100 overflow-hidden z-50">
            {searchResults.length > 0 ? (
               <div className="divide-y divide-gray-50">
                 {searchResults.map(patient => {
                   const outcome = state?.outcomes.find(o => o.patientHash === patient.patientHash);
                   const isIncomplete = !outcome || outcome.status !== 'Living'; // Mock logic
                   const age = patient.birthDate ? differenceInYears(new Date(), parseISO(patient.birthDate)) : 0;
                   
                   return (
                     <div key={patient.patientHash} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors block text-left w-full">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-black text-[#204071]">{patient.name || 'Unknown'}</p>
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{patient.identifier || patient.mrn}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                           <span>{patient.hospital}</span>
                           <span>•</span>
                           <span className="text-[#3796D8] font-bold">{patient.type}</span>
                           <span>•</span>
                           <span>{age} yrs</span>
                        </div>
                        {isIncomplete && (
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded w-max">
                             <AlertTriangle className="w-3 h-3" />
                             Incomplete Clinical Record
                          </div>
                        )}
                     </div>
                   );
                 })}
               </div>
            ) : (
               <div className="p-8 text-center text-gray-400 font-bold text-sm">No patients found</div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center bg-[#f2f4f6] p-1 rounded-full border border-[#e0e3e5]">
          <button 
            onClick={() => onLanguageChange('en')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-sm transition-all uppercase tracking-wider ${currentLanguage === 'en' ? 'bg-[#204071] text-white' : 'text-gray-500 hover:text-[#204071]'}`}
          >
            ENG
          </button>
          <button 
            onClick={() => onLanguageChange('es')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all uppercase tracking-wider ${currentLanguage === 'es' ? 'bg-[#204071] text-white' : 'text-gray-500 hover:text-[#204071]'}`}
          >
            ESP
          </button>
        </div>

        <div className="flex gap-2">
          <HeaderButton icon={Bell} />
          <HeaderButton icon={HelpCircle} />
        </div>

        <div className="h-10 w-px bg-gray-200 mx-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-[#191c1e]">{user.name}</p>
            <p className="text-[11px] font-semibold text-cyan-600 uppercase tracking-wide">
              {t.roles[user.role as keyof typeof t.roles]}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#204071] flex items-center justify-center text-white font-bold text-sm ring-2 ring-offset-2 ring-gray-100">
            {user.name.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderButton({ icon: Icon }: { icon: any }) {
  return (
    <button className="p-2.5 text-gray-500 hover:text-[#00236f] hover:bg-gray-50 rounded-xl transition-all">
      <Icon className="w-5 h-5" />
    </button>
  );
}
