/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Play, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Download,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../App';

export default function CaregiverView({ role }: { role: string }) {
  const { t } = useLanguage();
  
  const allModules = [
    { title: t.caregiver.moduleTitles.airway, duration: "30-40h", target: ['Clinician', 'Administrator'], level: 'Advanced' },
    { title: t.caregiver.moduleTitles.critical, duration: "20-25h", target: ['Clinician', 'Administrator'], level: 'Critical' },
    { title: t.caregiver.moduleTitles.anesthesia, duration: "12-15h", target: ['Clinician', 'Administrator'], level: 'Specialist' },
    { title: t.caregiver.moduleTitles.nursing, duration: "10-12h", target: ['Clinician', 'Administrator'], level: 'Professional' },
    { title: t.caregiver.moduleTitles.slp, duration: "8-10h", target: ['Clinician', 'Administrator'], level: 'Specialist' },
    { title: t.caregiver.moduleTitles.parentSchool, duration: "4-6h", target: ['Caregiver', 'Guest', 'Clinician', 'Administrator'], level: 'Open' }
  ];

  const filteredModules = allModules.filter(m => {
    if (role === 'Clinician') return m.target.includes('Clinician');
    if (role === 'Caregiver' || role === 'Guest') return m.target.includes('Caregiver');
    return true; // Admin sees all
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#191c1e] tracking-tight">{role === 'Clinician' ? t.caregiver.clinicalCurriculum : t.parentSchool}</h2>
          <p className="text-gray-500 font-medium">{role === 'Clinician' ? t.caregiver.trainingPath : t.parentSchoolDesc}</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-bold">{t.accountVerified}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#00236f] rounded-[2.5rem] overflow-hidden shadow-2xl relative group">
            <div className="aspect-video relative">
              <img 
                src="https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=2070&auto=format&fit=crop" 
                alt="Main Education" 
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <button className="w-20 h-20 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#00236f] shadow-2xl hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-current ml-1" />
                </button>
              </div>
            </div>
            <div className="p-8 text-white">
              <div className="flex items-center gap-3 mb-4 text-cyan-400">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">{t.featuredModule}</span>
                <div className="flex items-center gap-1 text-xs">
                   <Clock className="w-3 h-3" />
                   <span>{t.caregiver.minsRemaining.replace('{mins}', '14')}</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 tracking-tight">{t.featuredModuleTitle}</h3>
              <p className="text-white/70 text-sm max-w-2xl">
                {t.featuredModuleDesc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModules.map((mod, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-2xl bg-blue-50 text-[#00236f]">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{mod.level}</span>
                </div>
                <h4 className="font-bold text-[#191c1e] mb-1 group-hover:text-[#00236f] transition-colors">{mod.title}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {mod.duration}
                  </span>
                  <span>•</span>
                  <span>Curriculum</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-600 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-500/10">
            <h3 className="text-xl font-bold mb-4">{t.certProgress}</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span>{t.modules}</span>
                  <span>1 / 4</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-white h-full" style={{ width: '25%' }} />
                </div>
              </div>
              <div className="w-14 h-14 rounded-full border-4 border-white/20 flex items-center justify-center font-bold text-sm">
                25%
              </div>
            </div>
            <button className="w-full bg-white text-emerald-600 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              <span>{t.downloadRecord}</span>
            </button>
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-6">
            <h3 className="font-bold text-gray-900 border-b border-gray-50 pb-4">{t.specialistSupport}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.nursingHelp}</p>
                  <p className="text-xs text-gray-500">{t.available247}</p>
                </div>
              </div>
              <button className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <span>{t.startChat}</span>
              </button>
            </div>
          </div>

          <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex gap-4">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              {t.moduleReminder} <span className="font-bold">May 10th</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
