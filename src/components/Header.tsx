/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
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
  onSearchSelect?: (mrn: string) => void;
}

export default function Header({ user, onLanguageChange, currentLanguage, state, onSearchSelect }: HeaderProps) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    
    const results: any[] = [];
    const seenMrns = new Set<string>();

    // Search drafts first
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('autosave_draft_')) {
          const mrn = key.replace('autosave_draft_', '');
          const val = localStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            const pat = parsed.form?.patient;
            if (pat && (
               (pat.name && pat.name.toLowerCase().includes(term)) || 
               (pat.mrn && pat.mrn.toLowerCase().includes(term)) ||
               (pat.identifier && pat.identifier.toLowerCase().includes(term))
            )) {
               results.push({ ...pat, isDraft: true });
               seenMrns.add(pat.mrn);
            }
          }
        }
      }
    } catch (e) {}

    // Search state
    if (state?.patients) {
      state.patients.forEach(p => {
        if (!seenMrns.has(p.mrn) && (
            (p.name && p.name.toLowerCase().includes(term)) || 
            (p.mrn && p.mrn.toLowerCase().includes(term)) ||
            (p.identifier && p.identifier.toLowerCase().includes(term))
        )) {
            results.push({ ...p, isDraft: false });
            seenMrns.add(p.mrn);
        }
      });
    }

    return results.slice(0, 5);
  }, [searchTerm, state]);

  return (
    <header className="h-20 bg-white border-b border-[#eceef0] flex items-center justify-between px-8 flex-shrink-0 relative z-[999]">
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
          <div className="absolute top-full left-0 mt-2 w-96 max-h-96 overflow-y-auto custom-scrollbar bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999]">
            {searchResults.length > 0 ? (
               <div className="divide-y divide-gray-50">
                 {searchResults.map(patient => {
                   const age = patient.birthDate ? differenceInYears(new Date(), parseISO(patient.birthDate)) : 0;
                   const isDraft = patient.isDraft;
                   
                   return (
                     <div 
                        key={patient.mrn || patient.patientHash} 
                        onMouseDown={() => {
                          if (onSearchSelect && patient.mrn) onSearchSelect(patient.mrn);
                          setSearchTerm('');
                          setIsSearchOpen(false);
                        }}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors block text-left w-full"
                     >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-black text-[#204071]">{patient.name || 'Unknown'}</p>
                          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{patient.identifier || patient.mrn}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                           <span>{patient.hospital || 'No hospital'}</span>
                           <span>•</span>
                           <span className="text-[#3796D8] font-bold">{patient.type || 'Pediatric'}</span>
                           {age > 0 && (
                             <>
                               <span>•</span>
                               <span>{age} yrs</span>
                             </>
                           )}
                        </div>
                        {isDraft && (
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded w-max">
                             <AlertTriangle className="w-3 h-3" />
                             Draft in Progress
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
