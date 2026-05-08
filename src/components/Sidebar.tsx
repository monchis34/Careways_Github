/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  Stethoscope, 
  Settings, 
  BookOpen, 
  LogOut,
  Activity,
  Users,
  LineChart,
  Search,
  GraduationCap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../App';

interface SidebarProps {
  role: UserRole;
  activeView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ role, activeView, onViewChange, onLogout }: SidebarProps) {
  const { t } = useLanguage();

  const getNavItems = () => {
    const items = [];

    // ALL ROLES: Clinical Consultation (for Clinicians) or Dashboard (for Analysts)
    if (role === 'Analyst' || role === 'Administrator' || role === 'Admin/Analyst') {
      items.push({ icon: LayoutDashboard, label: t.sidebar.dashboard, id: 'dashboard' });
      items.push({ icon: LineChart, label: t.sidebar.unitAnalyst, id: 'unit_analyst' });
      items.push({ icon: Search, label: t.sidebar.patientConsult, id: 'patient_consult' });
      items.push({ icon: Activity, label: t.sidebar.patientRegistry, id: 'registry' });
      items.push({ icon: Users, label: t.sidebar.manageUsers, id: 'users' });
      items.push({ icon: Settings, label: t.sidebar.settings, id: 'settings' });
    } else if (['Clinician', 'ClinicalTrainer'].includes(role)) {
      items.push({ icon: LayoutDashboard, label: t.sidebar.clinicalConsult, id: 'dashboard' });
      
      if (role === 'Clinician') {
        items.push({ icon: Activity, label: t.sidebar.patientRegistry, id: 'registry' });
        items.push({ icon: Users, label: t.sidebar.manageUsers, id: 'users' });
        items.push({ icon: Settings, label: t.sidebar.settings, id: 'settings' });
      }

      if (role === 'ClinicalTrainer') {
        items.push({ icon: Search, label: t.sidebar.patientConsult, id: 'patient_consult' });
        items.push({ icon: GraduationCap, label: t.sidebar.clinicalUsers, id: 'clinical_users' });
        items.push({ icon: Settings, label: t.sidebar.settings, id: 'settings' });
      }
    }

    if (role === 'Caregiver' || role === 'Guest') {
      items.push({ icon: BookOpen, label: t.sidebar.education, id: 'education' });
      items.push({ icon: Settings, label: t.sidebar.settings, id: 'settings' });
    }

    return items;
  };

  return (
    <aside className="w-64 bg-[#00236f] text-white flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Stethoscope className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">{t.appName}</h1>
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Connect</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1">
        {getNavItems().map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
              activeView === item.id 
                ? "bg-white/10 text-white shadow-xl shadow-black/20" 
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeView === item.id ? "text-cyan-400" : "")} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">{t.sidebar.signOut}</span>
        </button>
      </div>
    </aside>
  );
}
