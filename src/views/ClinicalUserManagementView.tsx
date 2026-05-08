/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useLanguage } from '../App';
import { 
  Users, 
  Search, 
  Filter, 
  GraduationCap, 
  Award, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils';

// Mock data for clinical users
const MOCK_CLINICAL_USERS = [
  { id: '1', name: 'Dr. Alejandro Gomez', profession: 'Médico', specialty: 'Pediatría', progress: 100, status: 'Certified', lastActivity: '2024-05-01', inactiveDays: 0 },
  { id: '2', name: 'Lic. Maria Torres', profession: 'Enfermera', specialty: 'UCI Pediátrica', progress: 45, status: 'Started', lastActivity: '2024-04-15', inactiveDays: 22 },
  { id: '3', name: 'Dr. Roberto Mejia', profession: 'Residente', specialty: 'Cirugía', progress: 0, status: 'Not Started', lastActivity: '2024-01-10', inactiveDays: 118 },
  { id: '4', name: 'Dra. Sandra Lopez', profession: 'Médico', specialty: 'Anestesiología', progress: 90, status: 'Missing Eval', lastActivity: '2024-05-05', inactiveDays: 2 },
  { id: '5', name: 'Lic. Juan Castro', profession: 'RT', specialty: 'Respiratoria', progress: 15, status: 'Started', lastActivity: '2023-11-20', inactiveDays: 168 }
];

export default function ClinicalUserManagementView() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'MissingEval' | 'Evaluated'>('All');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const filteredUsers = useMemo(() => {
    return MOCK_CLINICAL_USERS.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'All' || 
                         (activeTab === 'MissingEval' && user.status === 'Missing Eval') ||
                         (activeTab === 'Evaluated' && user.status === 'Certified');
      return matchesSearch && matchesTab;
    });
  }, [searchTerm, activeTab]);

  const inactiveRanking = useMemo(() => {
    return [...MOCK_CLINICAL_USERS]
      .filter(u => u.status === 'Not Started')
      .sort((a, b) => b.inactiveDays - a.inactiveDays);
  }, []);

  const formatInactiveTime = (days: number) => {
    if (days >= 365) return `${Math.floor(days / 365)} ${t.training.years}`;
    if (days >= 30) return `${Math.floor(days / 30)} ${t.training.months}`;
    return `${days} ${t.training.days}`;
  };

  if (selectedUser) {
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedUser(null)} className="text-blue-600 font-bold flex items-center gap-2 mb-4">
          <ChevronRight className="w-4 h-4 rotate-180" />
          {t.back}
        </button>
        
        <div className="bg-white p-8 rounded-[2rem] border border-[#eceef0] shadow-sm">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#00236f] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                {selectedUser.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#191c1e]">{selectedUser.name}</h2>
                <p className="text-gray-500">{selectedUser.profession} • {selectedUser.specialty}</p>
              </div>
            </div>
            <div className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2",
              selectedUser.status === 'Missing Eval' ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            )}>
              {selectedUser.status === 'Missing Eval' ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {selectedUser.status}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                {t.clinicalUserMgmt.userProfile.questionnaireEval}
              </h3>
              <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
                <p className="text-sm font-medium text-gray-700 italic">"{t.clinicalUserMgmt.userProfile.evalDesc}"</p>
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">{t.clinicalUserMgmt.userProfile.finalScoreLabel}</label>
                  <input type="number" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl" placeholder="e.g. 85" />
                </div>
                <button className="w-full py-3 bg-[#00236f] text-white rounded-xl font-bold hover:shadow-lg transition-all">
                  {t.clinicalUserMgmt.userProfile.submitGrade}
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              <h3 className="font-bold flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                {t.clinicalUserMgmt.userProfile.curriculumProgress}
              </h3>
              <div className="space-y-4">
                <ProgressItem label={t.caregiver.moduleTitles.airway} progress={100} />
                <ProgressItem label={t.pim3Title} progress={100} />
                <ProgressItem label={t.caregiver.moduleTitles.parentSchool} progress={100} />
                <ProgressItem label={t.analyticsLabels.confusionCells.tpSub} progress={25} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-[#191c1e]">{t.training.clinicalUsers}</h2>
        <p className="text-sm text-gray-500">{t.clinicalUserMgmt.monitorEngagement}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPIBox label={t.training.certified} value="42" icon={Award} color="text-emerald-600" bg="bg-emerald-50" />
        <KPIBox label={t.training.startedMissingEval} value="12" icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <KPIBox label={t.training.notStarted} value="18" icon={AlertCircle} color="text-red-600" bg="bg-red-50" />
      </div>

      <div className="bg-white rounded-[2rem] border border-[#eceef0] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
            {(['All', 'MissingEval', 'Evaluated'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === tab ? "bg-white text-[#00236f] shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {tab === 'All' ? (t.common.allPatients.includes('Todos') ? 'Todos' : 'All') : tab === 'MissingEval' ? t.training.startedMissingEval : t.training.evaluated}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder={t.clinicalUserMgmt.userTable.searchPlaceholder} 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">{t.clinicalUserMgmt.userTable.clinician}</th>
                <th className="px-6 py-4">{t.clinicalUserMgmt.userTable.specialty}</th>
                <th className="px-6 py-4">{t.clinicalUserMgmt.userTable.progress}</th>
                <th className="px-6 py-4">{t.clinicalUserMgmt.userTable.status}</th>
                <th className="px-6 py-4">{t.clinicalUserMgmt.userTable.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#00236f] flex items-center justify-center font-bold text-xs uppercase">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#191c1e]">{user.name}</p>
                        <p className="text-[10px] font-semibold text-gray-400">{user.profession}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-gray-600">{user.specialty}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${user.progress}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-500">{user.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                      user.status === 'Certified' ? "bg-emerald-100 text-emerald-700" :
                      user.status === 'Missing Eval' ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedUser(user)}
                      className="p-2 hover:bg-white rounded-lg text-blue-600 transition-colors shadow-sm border border-transparent hover:border-blue-100"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border border-[#eceef0] shadow-sm">
          <h3 className="font-bold text-lg mb-6">{t.training.courseEvolution}</h3>
          <div className="space-y-4">
            <StatRow label={t.training.certified} value={42} total={78} color="bg-emerald-500" />
            <StatRow label={t.clinicalUserMgmt.inCourse} value={18} total={78} color="bg-blue-500" />
            <StatRow label={t.training.notStarted} value={18} total={78} color="bg-gray-300" />
          </div>
        </div>

        <div className="bg-[#191c1e] text-white p-8 rounded-[2rem] shadow-xl">
          <h3 className="font-bold text-lg mb-6">{t.training.topInactive}</h3>
          <div className="space-y-4">
            {inactiveRanking.map((user, idx) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-white/20 font-bold text-lg w-6">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-sm">{user.name}</p>
                    <p className="text-[10px] text-white/40 font-medium">{user.profession} • {user.specialty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-red-400">{formatInactiveTime(user.inactiveDays)}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{t.clinicalUserMgmt.inactiveLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPIBox({ label, value, icon: Icon, color, bg }: { label: string, value: string, icon: any, color: string, bg: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#eceef0] shadow-sm flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-bold text-[#191c1e]">{value}</p>
      </div>
      <div className={`p-4 ${bg} ${color} rounded-2xl`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

function ProgressItem({ label, progress }: { label: string, progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-gray-600">{label}</span>
        <span className="text-blue-600">{progress}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full transition-all duration-1000", progress === 100 ? "bg-emerald-500" : "bg-blue-600")} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function StatRow({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percentage = (value / total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-bold">
        <span className="text-gray-600">{label}</span>
        <span className="text-[#191c1e]">{value} users</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
