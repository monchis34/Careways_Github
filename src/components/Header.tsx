/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole } from '../types';
import { Bell, HelpCircle, Search } from 'lucide-react';
import { useLanguage } from '../App';
import { Language } from '../translations';

interface HeaderProps {
  user: {
    role: UserRole;
    name: string;
  };
  onLanguageChange: (lang: Language) => void;
  currentLanguage: Language;
}

export default function Header({ user, onLanguageChange, currentLanguage }: HeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="h-20 bg-white border-b border-[#eceef0] flex items-center justify-between px-8 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder={t.appName}
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm w-80 focus:outline-none focus:ring-2 focus:ring-[#00236f]/10 focus:border-[#00236f]/20 transition-all font-sans"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center bg-[#f2f4f6] p-1 rounded-full border border-[#e0e3e5]">
          <button 
            onClick={() => onLanguageChange('en')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-sm transition-all uppercase tracking-wider ${currentLanguage === 'en' ? 'bg-[#00236f] text-white' : 'text-gray-500 hover:text-[#00236f]'}`}
          >
            ENG
          </button>
          <button 
            onClick={() => onLanguageChange('es')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all uppercase tracking-wider ${currentLanguage === 'es' ? 'bg-[#00236f] text-white' : 'text-gray-500 hover:text-[#00236f]'}`}
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
          <div className="w-10 h-10 rounded-full bg-[#00236f] flex items-center justify-center text-white font-bold text-sm ring-2 ring-offset-2 ring-gray-100">
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
