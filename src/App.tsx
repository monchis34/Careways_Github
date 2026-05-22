/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { UserRole, AppState, Patient, Outcome, ParentPatient, AppUser } from './types';
import { generateSeedData } from './store';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import ClinicianFlow from './views/ClinicianFlow';
import CaregiverView from './views/CaregiverView';
import UserManagementView from './views/UserManagementView';
import UnitAnalystView from './views/UnitAnalystView';
import ClinicalUserManagementView from './views/ClinicalUserManagementView';
import PatientConsultationView from './views/PatientConsultationView';
import PatientRegistryView from './views/PatientRegistryView';
import MainLandingPage from './views/MainLandingPage';
import RegisterFlow from './views/RegisterFlow';
import AdminLoginView from './views/AdminLoginView';
import PatientReportView from './views/PatientReportView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  const t = translations[language];

  // Views: landing -> registration -> internal_login -> app
  const [activeView, setActiveView] = useState<string>('landing');
  const [activePatientHash, setActivePatientHash] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<AppUser | null>(null);
  
  const [state, setState] = useState<AppState>(() => {
    const seed = generateSeedData();
    return {
      currentUser: null,
      ...seed
    };
  });

  const handleLogin = (role: UserRole) => {
    setState(prev => ({
      ...prev,
      currentUser: { 
        id: authenticatedUser?.id || Math.random().toString(36).substr(2, 9),
        role, 
        name: authenticatedUser ? `${authenticatedUser.firstName} ${authenticatedUser.lastName}` : `Demo ${role}`,
        institutionId: authenticatedUser?.institutionId || (role === 'Administrator' ? 'inst-1' : 'inst-2')
      }
    }));
    setActiveView(role === 'Clinician' || role === 'Administrator' || role === 'ClinicalTrainer' || role === 'ClinicalUser' ? 'registry' : 'dashboard');
  };

  const handleRegistrationComplete = (userData: any) => {
    // In a real app, this would create the user in DB
    setIsAuthenticated(true);
    handleLogin(userData.role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setState(prev => ({ ...prev, currentUser: null }));
    setActiveView('landing');
  };

  const addPatientData = (patient: Patient, outcome: Outcome, parentPatient: ParentPatient) => {
    setState(prev => ({
      ...prev,
      patients: [patient, ...prev.patients],
      outcomes: [outcome, ...prev.outcomes],
      parentPatients: [parentPatient, ...prev.parentPatients]
    }));
  };

  const bulkAddUsers = (newUsers: AppUser[]) => {
    setState(prev => ({
      ...prev,
      users: [...prev.users, ...newUsers]
    }));
  };

  const bulkAddPatients = (patients: Patient[], outcomes: Outcome[], parentPatients: ParentPatient[]) => {
    setState(prev => ({
      ...prev,
      patients: [...prev.patients, ...patients],
      outcomes: [...prev.outcomes, ...outcomes],
      parentPatients: [...prev.parentPatients, ...parentPatients]
    }));
  };

  if (activeView === 'landing' && !isAuthenticated) {
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <MainLandingPage 
          onJoin={() => setActiveView('registration')}
          onAdminPanel={() => setActiveView('login')} 
        />
      </LanguageContext.Provider>
    );
  }

  if (activeView === 'login' && !isAuthenticated) {
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <LoginView 
          onLoginSuccess={(email: string) => {
            setIsAuthenticated(true);
            const user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            
            if (user) {
              setAuthenticatedUser(user);
              if (user.role === 'ClinicalUser') {
                // Bypass authority access
                handleLogin(user.role);
              } else {
                setActiveView('authority_access');
              }
            } else {
              // Default mock user if not found
              const baseUser = state.users[0];
              setAuthenticatedUser(baseUser);
              setActiveView('authority_access');
            }
          }}
        />
      </LanguageContext.Provider>
    );
  }

  if (activeView === 'registration' && !isAuthenticated) {
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <RegisterFlow 
          onComplete={handleRegistrationComplete}
          onCancel={() => setActiveView('landing')}
        />
      </LanguageContext.Provider>
    );
  }

  if (activeView === 'authority_access' && isAuthenticated && !state.currentUser) {
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <AdminLoginView 
          onLogin={handleLogin}
          onBack={handleLogout}
          baseRole={authenticatedUser?.role}
        />
      </LanguageContext.Provider>
    );
  }

  if (!state.currentUser && !isAuthenticated) {
    // Fallback if something fails
    return (
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <LoginView onLoginSuccess={(email) => { 
          setIsAuthenticated(true);
          const user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
          setAuthenticatedUser(user || state.users[0]);
          if (user?.role === 'ClinicalUser') {
            handleLogin(user.role);
          } else {
            setActiveView('authority_access'); 
          }
        }} />
      </LanguageContext.Provider>
    );
  }

  const renderContent = () => {
    // Universal views available to multiple roles
    if (activeView === 'dashboard') return <DashboardView state={state} />;
    if (activeView === 'users') return <UserManagementView state={state} onBulkUpload={bulkAddUsers} />;
    if (activeView === 'unit_analyst') return <UnitAnalystView state={state} />;
    if (activeView === 'clinical_users') return <ClinicalUserManagementView />;
    if (activeView === 'patient_consult') return <PatientConsultationView state={state} onOpenReport={(hash) => { setActivePatientHash(hash); setActiveView('report'); }} />;
    if (activeView === 'settings') return <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-gray-200">Settings Section (Under Construction)</div>;
    
    if (activeView === 'report' && activePatientHash) {
      return <PatientReportView state={state} patientHash={activePatientHash} onBack={() => { setActiveView(state.currentUser?.role === 'Clinician' || state.currentUser?.role === 'ClinicalUser' ? 'registry' : 'dashboard'); setActivePatientHash(null); }} />;
    }

    if (activeView === 'bulk') {
      return (
        <PatientRegistryView 
          state={state} 
          onComplete={addPatientData} 
          onBulkComplete={bulkAddPatients} 
          defaultMode="bulk" 
          onNavigate={(view) => setActiveView(view)} 
        />
      );
    }
    if (activeView === 'individual') {
      return <ClinicianFlow onSave={(p,o,pp) => addPatientData(p,o,pp)} onComplete={(p, o, pp) => { setActiveView('registry'); }} onExit={() => setActiveView('registry')} role={state.currentUser?.role} state={state} />;
    }

    if (activeView === 'registry') {
      return <PatientRegistryView state={state} onComplete={addPatientData} onBulkComplete={bulkAddPatients} defaultMode="list" onNavigate={(view, hash) => { if (hash) setActivePatientHash(hash); setActiveView(view); }} />;
    }

    if (activeView === 'education') return <CaregiverView role={state.currentUser?.role || 'Guest'} />;

    const role = state.currentUser?.role;
    
    // Role-specific defaults
    switch (role) {
      case 'Admin/Analyst':
      case 'Administrator':
      case 'Analyst':
      case 'ClinicalTrainer':
        return <DashboardView state={state} />;
      case 'Clinician':
        return <ClinicianFlow onSave={addPatientData} onComplete={() => {}} role={role} state={state} />; 
      case 'Caregiver':
      case 'Guest':
        return <CaregiverView role={role} />;
      default:
        return <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-gray-200">Access Denied</div>;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div className="flex h-screen bg-[#f7f9fb] font-sans overflow-hidden print:overflow-visible print:h-auto">
        <div className="print:hidden h-full flex">
          <Sidebar role={state.currentUser.role} baseRole={authenticatedUser?.role} onRoleChange={(role) => handleLogin(role)} onLogout={handleLogout} activeView={activeView} onViewChange={setActiveView} />
        </div>
        <div className="flex-1 flex flex-col min-w-0 print:block">
          <div className="print:hidden">
            <Header user={state.currentUser} onLanguageChange={setLanguage} currentLanguage={language} state={state} />
          </div>
          <main className="flex-1 overflow-y-auto p-6 md:p-8 print:overflow-visible print:p-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${state.currentUser?.role}-${activeView}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="h-full print:h-auto"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </LanguageContext.Provider>
  );
}
