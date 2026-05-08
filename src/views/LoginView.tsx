/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole } from '../types';
import { 
  Stethoscope, 
  ShieldCheck, 
  UserCircle,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../App';

interface LoginViewProps {
  onLogin: (role: UserRole) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const { t } = useLanguage();

  const roles: { role: UserRole; display: string; icon: any; color: string; desc: string }[] = [
    { 
      role: 'Clinician', 
      display: t.roles.Clinician,
      icon: Stethoscope, 
      color: 'bg-blue-600',
      desc: t.login.clinicianDesc
    },
    { 
      role: 'Admin/Analyst', 
      display: t.roles.AnalystAdmin,
      icon: ShieldCheck, 
      color: 'bg-purple-600',
      desc: t.login.analystDesc
    },
    { 
      role: 'Caregiver', 
      display: t.roles.Caregiver,
      icon: UserCircle, 
      color: 'bg-emerald-600',
      desc: t.login.caregiverDesc
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex p-3 bg-white rounded-2xl shadow-xl shadow-blue-500/10 mb-6 group hover:scale-110 transition-transform cursor-pointer">
            <Stethoscope className="w-10 h-10 text-[#00236f]" />
          </div>
          <h1 className="text-4xl font-bold text-[#191c1e] tracking-tight mb-3">{t.appName}</h1>
          <p className="text-gray-500 max-w-md mx-auto">{t.tagline}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((item, index) => (
            <motion.button
              key={item.role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onLogin(item.role)}
              className="bg-white border-2 border-transparent hover:border-[#00236f]/20 hover:shadow-2xl hover:shadow-[#00236f]/10 p-8 rounded-[2rem] text-left group transition-all duration-300 flex flex-col h-full"
            >
              <div className={`p-4 ${item.color} rounded-2xl text-white w-fit mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#191c1e] mb-2">{item.display}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-8 flex-1">{item.desc}</p>
              <div className="flex items-center gap-2 text-[#00236f] font-bold text-sm">
                <span>{t.login.access}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            © 2026 Careways Connect • HIPAA Compliant Environment
          </p>
        </div>
      </div>
    </div>
  );
}
