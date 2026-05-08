/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useLanguage } from '../App';
import { AppState, AppUser } from '../types';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserCheck, 
  Mail, 
  Phone,
  BookOpen,
  UserPlus,
  ShieldCheck,
  Hospital
} from 'lucide-react';
import MassiveUserUpload from '../components/MassiveUserUpload';
import { cn } from '../lib/utils';

interface UserManagementViewProps {
  state: AppState;
  onBulkUpload: (users: AppUser[]) => void;
}

export default function UserManagementView({ state, onBulkUpload }: UserManagementViewProps) {
  const { t } = useLanguage();
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<'ParentPatients' | 'AppUsers'>('ParentPatients');

  const parentUsers = useMemo(() => {
    return state.parentPatients.map(p => {
      const patient = state.patients.find(pt => pt.patientHash === p.patientHash);
      return {
        ...p,
        patientMrn: patient?.mrn || 'N/A',
        patientType: patient?.type || 'N/A'
      };
    });
  }, [state]);

  const appUsers = useMemo(() => {
    // Only show users belonging to the same institution for isolation
    return state.users.filter(u => u.institutionId === state.currentUser?.institutionId);
  }, [state.users, state.currentUser?.institutionId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191c1e]">{t.userManagement}</h2>
          <p className="text-sm text-gray-500">{t.userManagementDesc}</p>
        </div>
        <div className="flex gap-2">
          {state.currentUser?.role === 'Administrator' && (
            <button 
              onClick={() => setShowBulkUpload(true)}
              className="flex items-center gap-2 bg-[#00236f] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/10 hover:shadow-xl transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t.userMgmt.bulkUpload}</span>
            </button>
          )}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder={t.common.search}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00236f]/10"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('ParentPatients')}
          className={cn(
            "pb-3 text-sm font-bold transition-all border-b-2 px-1",
            activeTab === 'ParentPatients' ? "border-[#00236f] text-[#00236f]" : "border-transparent text-gray-400"
          )}
        >
          {t.userMgmt.parentTab}
        </button>
        <button 
          onClick={() => setActiveTab('AppUsers')}
          className={cn(
            "pb-3 text-sm font-bold transition-all border-b-2 px-1",
            activeTab === 'AppUsers' ? "border-[#00236f] text-[#00236f]" : "border-transparent text-gray-400"
          )}
        >
          {t.userMgmt.staffTab}
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-[#eceef0] overflow-hidden shadow-sm">
        {activeTab === 'ParentPatients' ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.parentPatient}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.relatedPatient}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.eduStatus}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {parentUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-[#00236f] flex items-center justify-center font-bold text-xs uppercase">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#191c1e]">{u.name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">ID: {u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">{u.patientMrn}</span>
                      <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-bold uppercase">{u.patientType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[10px] font-bold ${u.educationActivated ? 'text-blue-600' : 'text-amber-600'}`}>
                          {u.educationActivated ? t.active : t.pending}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">{u.educationProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${u.educationProgress > 80 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${u.educationProgress}%` }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:text-[#00236f]"><Mail className="w-4 h-4" /></button>
                      <button className="p-2 hover:text-[#00236f]"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.userMgmt.staffTable.collaborator}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.userMgmt.staffTable.role}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.userMgmt.staffTable.status}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.userMgmt.staffTable.contact}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                        {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#191c1e]">{u.firstName} {u.lastName}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-700">{t.roles[u.role] || u.role}</p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">{u.professionSlug || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                      u.status === 'Active' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {u.status === 'Active' ? t.active : t.pending}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 text-gray-400">
                      <Phone className="w-4 h-4 hover:text-[#00236f] cursor-pointer" />
                      <Mail className="w-4 h-4 hover:text-[#00236f] cursor-pointer" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    <button className="p-2 hover:text-[#00236f]"><MoreVertical className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {appUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    <Hospital className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">{t.userMgmt.staffTable.noStaff}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showBulkUpload && (
        <MassiveUserUpload 
          state={state} 
          onUpdateState={onBulkUpload} 
          onClose={() => setShowBulkUpload(false)} 
        />
      )}
    </div>
  );
}
