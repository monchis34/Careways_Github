/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, 
  Heart, 
  UserCircle, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Search,
  Mail,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../App';
import professionsCatalog from '../data/professions.json';
import specialtiesCatalog from '../data/specialties.json';

interface RegisterFlowProps {
  onComplete: (userData: any) => void;
  onCancel: () => void;
}

type RegistrationStep = 'TypeSelection' | 'ClinicalData' | 'Validation';

export default function RegisterFlow({ onComplete, onCancel }: RegisterFlowProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<RegistrationStep>('TypeSelection');
  const [regType, setRegType] = useState<'ClinicalUser' | 'ParentPatient' | 'Guest' | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profession: '',
    specialty: '',
    hospital: '',
    country: '',
    otp: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showProfessionList, setShowProfessionList] = useState(false);

  const medicalRoles = [
    'Doctor', 'Nurse', 'Speech Language Pathologist', 'Resident', 
    'Medical Student', 'Respiratory Therapist', 'Nurse Assistant'
  ];

  const filteredProfessions = professionsCatalog.filter(p => 
    p.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const needsSpecialty = medicalRoles.includes(formData.profession);

  const handleNext = () => {
    if (step === 'TypeSelection') {
      if (regType === 'Guest') {
        onComplete({ role: 'Guest', ...formData });
      } else {
        setStep('ClinicalData');
      }
    } else if (step === 'ClinicalData') {
      if (regType === 'ClinicalUser') {
        setStep('Validation');
      } else {
        onComplete({ role: 'Caregiver', ...formData });
      }
    } else if (step === 'Validation') {
      onComplete({ role: 'Clinician', ...formData });
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <AnimatePresence mode="wait">
          {step === 'TypeSelection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="text-4xl font-bold text-[#191c1e] mb-2">{t.registration.chooseType}</h1>
                <p className="text-gray-500">{t.registration.chooseTypeDesc}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RegistrationCard 
                  title={t.registration.clinicalTitle}
                  desc={t.registration.clinicalDesc}
                  icon={Stethoscope}
                  active={regType === 'ClinicalUser'}
                  onClick={() => setRegType('ClinicalUser')}
                  t={t}
                />
                <RegistrationCard 
                  title={t.registration.parentTitle}
                  desc={t.registration.parentDesc}
                  icon={Heart}
                  active={regType === 'ParentPatient'}
                  onClick={() => setRegType('ParentPatient')}
                  t={t}
                />
                <RegistrationCard 
                  title={t.registration.guestTitle}
                  desc={t.registration.guestDesc}
                  icon={Globe}
                  active={regType === 'Guest'}
                  onClick={() => setRegType('Guest')}
                  t={t}
                />
              </div>

              <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 mt-8">
                <button onClick={onCancel} className="text-gray-400 font-bold hover:text-gray-600 transition-colors">
                  {t.back}
                </button>
                <button 
                  disabled={!regType}
                  onClick={handleNext}
                  className="bg-[#00236f] text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 disabled:opacity-30 transition-all hover:scale-105"
                >
                  <span>{t.next}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'ClinicalData' && (
            <motion.div
              key="data"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl shadow-blue-900/5 space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold text-[#191c1e] mb-2">
                  {regType === 'ClinicalUser' ? t.registration.institutionalProfile : t.registration.basicProfile}
                </h2>
                <p className="text-gray-500">
                  {regType === 'ClinicalUser' ? t.registration.otpRequired : t.registration.accessEdu}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label={t.registration.fullName} value={formData.name} onChange={v => setFormData(p => ({...p, name: v}))} placeholder="e.g. Dr. Jane Fox" />
                <Input label={t.registration.emailAddress} value={formData.email} onChange={v => setFormData(p => ({...p, email: v}))} placeholder="jane.fox@hospital.org" type="email" />
                
                {regType === 'ClinicalUser' && (
                  <>
                    <div className="relative space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.registration.profession}</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#00236f]/10"
                          placeholder={t.registration.professionOther}
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowProfessionList(true);
                          }}
                          onFocus={() => setShowProfessionList(true)}
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      
                      {showProfessionList && searchTerm.length >= 0 && (
                        <div className="absolute z-50 top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                          {filteredProfessions.map(p => (
                            <button 
                              key={p}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm transition-colors border-b border-gray-50 last:border-none"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, profession: p }));
                                setSearchTerm(p);
                                setShowProfessionList(false);
                              }}
                            >
                              {p}
                            </button>
                          ))}
                          {filteredProfessions.length === 0 && (
                            <div className="px-4 py-3 text-xs text-red-500 font-medium">No results found (Hygienic data required)</div>
                          )}
                        </div>
                      )}
                    </div>

                    {needsSpecialty && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t.registration.specialty}</label>
                        <select 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#00236f]/10 font-medium"
                          value={formData.specialty}
                          onChange={e => setFormData(p => ({ ...p, specialty: e.target.value }))}
                        >
                          <option value="">{t.registration.selectSpecialty}</option>
                          {specialtiesCatalog.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                <button onClick={() => setStep('TypeSelection')} className="flex items-center gap-2 text-gray-400 font-bold hover:text-gray-600 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.back}</span>
                </button>
                <button 
                  disabled={!formData.name || !formData.email || (regType === 'ClinicalUser' && !formData.profession)}
                  onClick={handleNext}
                  className="bg-[#00236f] text-white px-10 py-4 rounded-full font-bold flex items-center gap-2 disabled:opacity-30 transition-all hover:scale-105 shadow-xl shadow-blue-900/10"
                >
                  <span>{regType === 'ClinicalUser' ? t.registration.requestAccess : t.registration.registerNow}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'Validation' && (
            <motion.div
              key="validation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-12 rounded-[3rem] text-center space-y-8"
            >
              <div className="w-20 h-20 bg-blue-50 text-[#00236f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-[#191c1e] mb-2">{t.registration.verifyEmail}</h2>
                <p className="text-gray-500 max-w-sm mx-auto">
                  {t.registration.verifyInfo.replace('{email}', formData.email)}
                </p>
              </div>

              <div className="flex justify-center gap-4">
                {[1,2,3,4,5,6].map(i => (
                  <input 
                    key={i}
                    type="text"
                    maxLength={1}
                    className="w-12 h-16 bg-gray-50 border-2 border-gray-100 rounded-xl text-center text-2xl font-bold focus:border-[#00236f] outline-none transition-all"
                  />
                ))}
              </div>

              <div className="pt-8 space-y-4">
                <button onClick={handleNext} className="w-full bg-[#00236f] text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-900/20 hover:scale-105 transition-transform">
                  {t.registration.completeReg}
                </button>
                <button onClick={() => setStep('ClinicalData')} className="text-gray-400 font-bold text-sm">
                  {t.back}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RegistrationCard({ title, desc, icon: Icon, active, onClick, t }: { title: string; desc: string; icon: any; active: boolean; onClick: () => void; t: any }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-8 rounded-[2rem] text-left border-2 transition-all duration-300 flex flex-col h-full",
        active 
          ? "bg-[#00236f] border-[#00236f] text-white shadow-2xl shadow-blue-900/20" 
          : "bg-white border-transparent hover:border-blue-100 text-gray-500"
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm",
        active ? "bg-white/20 text-white" : "bg-blue-50 text-[#00236f]"
      )}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className={cn("text-xl font-bold mb-2", active ? "text-white" : "text-[#191c1e]")}>{title}</h3>
      <p className={cn("text-sm leading-relaxed mb-8 flex-1", active ? "text-white/70" : "text-gray-500")}>{desc}</p>
      {active && (
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest animate-pulse">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t.registration.selectedBadge}</span>
        </div>
      )}
    </button>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#00236f]/10"
        placeholder={placeholder}
      />
    </div>
  );
}
