/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole } from '../types';
import { 
  ShieldCheck, 
  Settings, 
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Stethoscope
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../App';

interface AdminLoginViewProps {
  onLogin: (role: UserRole) => void;
  onBack: () => void;
}

export default function AdminLoginView({ onLogin, onBack }: AdminLoginViewProps) {
  const { t } = useLanguage();

  const adminRoles: { role: UserRole; display: string; icon: any; color: string; desc: string }[] = [
    { 
      role: 'ClinicalTrainer', 
      display: t.roles.ClinicalTrainer,
      icon: ShieldCheck, 
      color: 'bg-blue-600',
      desc: t.adminLogin.trainerDesc
    },
    {
      role: 'ClinicalUser',
      display: t.roles.ClinicalUser,
      icon: Stethoscope,
      color: 'bg-indigo-600',
      desc: t.adminLogin.clinicalUserDesc
    },
    { 
      role: 'Administrator', 
      display: t.roles.Administrator,
      icon: Settings, 
      color: 'bg-purple-600',
      desc: t.adminLogin.adminDesc
    },
    { 
      role: 'Analyst', 
      display: t.roles.Analyst,
      icon: BarChart3, 
      color: 'bg-emerald-600',
      desc: t.adminLogin.analystDesc
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-6">
      <div className="max-w-7xl w-full">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 font-bold mb-12 hover:text-[#00236f] transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>{t.adminLogin.backToHome}</span>
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex p-4 bg-white rounded-3xl shadow-xl shadow-blue-500/10 mb-6 font-bold text-[#00236f] text-sm uppercase tracking-widest px-8">
            {t.adminLogin.internalPortal}
          </div>
          <h1 className="text-4xl font-bold text-[#191c1e] tracking-tight mb-3">{t.adminLogin.authorityAccess}</h1>
          <p className="text-gray-500 max-w-md mx-auto">{t.adminLogin.selectProfile}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {adminRoles.map((item, index) => (
            <motion.button
              key={item.role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onLogin(item.role)}
              className="bg-white border-2 border-transparent hover:border-[#00236f]/20 hover:shadow-2xl hover:shadow-[#00236f]/10 p-10 rounded-[3rem] text-left group transition-all duration-300 flex flex-col h-full"
            >
              <div className={`p-5 ${item.color} rounded-2xl text-white w-fit mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
                <item.icon className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-[#191c1e] mb-3">{item.display}</h3>
              <p className="text-gray-500 leading-relaxed mb-10 flex-1">{item.desc}</p>
              <div className="flex items-center gap-2 text-[#00236f] font-bold text-sm">
                <span>{t.adminLogin.enterSystem}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
