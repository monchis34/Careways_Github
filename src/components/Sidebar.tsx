/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  GraduationCap,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../App';

interface SidebarProps {
  role: UserRole;
  baseRole?: string;
  activeView: string;
  onViewChange: (view: string) => void;
  onRoleChange?: (newRole: UserRole) => void;
  onLogout: () => void;
}

export default function Sidebar({ role, baseRole, activeView, onViewChange, onRoleChange, onLogout }: SidebarProps) {
  const { t } = useLanguage();
  const [profileSelectorOpen, setProfileSelectorOpen] = useState(false);

  // Determine allowed roles based on baseRole
  let allowedRoles: { role: UserRole; label: string; icon: any }[] = [];
  if (baseRole) {
    const rolesConfig = [
      { role: 'Analyst' as UserRole, label: t.roles?.Analyst || 'Analyst', icon: BarChart3 },
      { role: 'Administrator' as UserRole, label: t.roles?.Administrator || 'Administrator', icon: Settings },
      { role: 'ClinicalTrainer' as UserRole, label: t.roles?.ClinicalTrainer || 'Clinical Trainer', icon: ShieldCheck },
      { role: 'ClinicalUser' as UserRole, label: t.roles?.ClinicalUser || 'Clinical User', icon: Stethoscope },
    ];
    
    if (baseRole === 'Analyst') {
      allowedRoles = rolesConfig;
    } else if (baseRole === 'Administrator') {
      allowedRoles = rolesConfig.filter(r => ['Administrator', 'ClinicalTrainer', 'ClinicalUser'].includes(r.role));
    } else if (baseRole === 'ClinicalTrainer') {
      allowedRoles = rolesConfig.filter(r => ['ClinicalTrainer', 'ClinicalUser'].includes(r.role));
    }
  }

  const getNavItems = () => {
    const items = [];

    // ALL ROLES: Clinical Insights (for Clinicians) or Dashboard (for Analysts)
    if (role === 'Analyst' || role === 'Administrator' || role === 'Admin/Analyst') {
      items.push({ icon: LayoutDashboard, label: t.sidebar.dashboard, id: 'dashboard' });
      items.push({ icon: LineChart, label: t.sidebar.unitAnalyst, id: 'unit_analyst' });
      items.push({ icon: Search, label: t.sidebar.patientConsult, id: 'patient_consult' });
      items.push({ icon: Activity, label: t.sidebar.patientRegistry, id: 'registry' });
      items.push({ icon: Users, label: t.sidebar.manageUsers, id: 'users' });
      items.push({ icon: Settings, label: t.sidebar.settings, id: 'settings' });
    } else if (['Clinician', 'ClinicalTrainer', 'ClinicalUser'].includes(role)) {
      items.push({ icon: LayoutDashboard, label: t.sidebar.clinicalConsult, id: 'dashboard' });
      
      if (role === 'Clinician') {
        items.push({ icon: Activity, label: t.sidebar.patientRegistry, id: 'registry' });
        items.push({ icon: Users, label: t.sidebar.manageUsers, id: 'users' });
        items.push({ icon: Settings, label: t.sidebar.settings, id: 'settings' });
      }

      if (role === 'ClinicalUser') {
        items.push({ icon: Activity, label: t.sidebar.patientRegistry, id: 'registry' });
        items.push({ icon: Search, label: t.sidebar.patientConsult, id: 'patient_consult' }); // For Patient Search?
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
        {allowedRoles.length > 0 && onRoleChange && (
          <div className="mb-4 relative rounded-xl border border-white/10 bg-white/5 transition-all">
            <button 
              onClick={() => setProfileSelectorOpen(!profileSelectorOpen)}
              className="w-full flex items-center justify-between p-3"
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Active Profile</span>
                <span className="text-sm font-medium text-white truncate w-32">{allowedRoles.find(r => r.role === role)?.label || role}</span>
              </div>
              {profileSelectorOpen ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronUp className="w-4 h-4 text-white/60" />}
            </button>
            
            {profileSelectorOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-[#0a1945] rounded-xl border border-white/10 overflow-hidden shadow-xl shadow-black/30 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="p-2 space-y-1">
                  {allowedRoles.map((r) => (
                    <button
                      key={r.role}
                      onClick={() => {
                        onRoleChange(r.role);
                        setProfileSelectorOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                        role === r.role ? "bg-cyan-900/40 text-cyan-400 font-bold" : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <r.icon className="w-4 h-4" />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
