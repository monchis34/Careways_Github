import React, { useState } from 'react';
import { useLanguage } from '../App';
import { ShieldCheck, Lock, Building, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginViewProps {
  onLoginSuccess: (email: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLoginSuccess(email);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Language Toggle */}
      <div className="absolute top-6 right-6 flex bg-gray-100 rounded-full p-1 text-[10px] font-bold">
        <button 
          onClick={() => setLanguage('en')}
          className={`px-3 py-1 rounded-full transition-all ${language === 'en' ? 'bg-[#00236f] text-white shadow-sm' : 'text-gray-500'}`}
        >
          EN
        </button>
        <button 
          onClick={() => setLanguage('es')}
          className={`px-3 py-1 rounded-full transition-all ${language === 'es' ? 'bg-[#00236f] text-white shadow-sm' : 'text-gray-500'}`}
        >
          ES
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[400px] w-full bg-transparent"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#191c1e] tracking-tight mb-2">{t.login.welcomeBack}</h1>
          <p className="text-gray-500 text-sm font-medium">{t.login.signInToContinue}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-[#191c1e] mb-2">{t.login.institutionalEmail}</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@hospital.org"
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-100/80 focus:bg-white focus:border-[#00236f] focus:ring-4 focus:ring-[#00236f]/10 outline-none transition-all placeholder:text-gray-400 font-medium"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-[#191c1e] mb-2">{t.login.password}</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-100/80 focus:bg-white focus:border-[#00236f] focus:ring-4 focus:ring-[#00236f]/10 outline-none transition-all placeholder:text-gray-400 font-mono font-medium"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mt-3 mb-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="w-4 h-4 rounded-md border-2 border-gray-300 flex items-center justify-center group-hover:border-[#00236f] transition-colors relative bg-white">
                <input type="checkbox" className="opacity-0 absolute w-full h-full cursor-pointer z-10" />
                <div className="w-2 h-2 rounded-[2px] bg-[#00236f] hidden group-has-[:checked]:block" />
              </div>
              <span className="text-gray-600 font-medium">{t.login.rememberMe}</span>
            </label>
            <a href="#" className="font-bold text-[#00236f] hover:underline cursor-pointer">{t.login.forgotPassword}</a>
          </div>

          <button 
            type="submit"
            className="w-full py-4 mt-2 bg-[#00236f] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {t.login.signIn}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.login.or}</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button 
          type="button"
          className="w-full py-4 bg-white border-2 border-gray-100 text-[#191c1e] hover:text-[#00236f] hover:border-[#00236f]/20 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <Building className="w-5 h-5" />
          {t.login.ssoLogin}
        </button>

        <div className="mt-10 text-center text-sm font-medium text-gray-500">
          {t.login.noAccount} <a href="#" className="text-[#00236f] font-bold hover:underline ml-1">{t.login.requestAccess}</a>
        </div>

        <div className="mt-12 flex items-center justify-center gap-6 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          <div className="flex items-center gap-1.5 hover:text-gray-600 transition-colors cursor-default">
            <ShieldCheck className="w-4 h-4" />
            HIPAA Compliant
          </div>
          <div className="flex items-center gap-1.5 hover:text-gray-600 transition-colors cursor-default">
            <Lock className="w-4 h-4" />
            256-bit SSL
          </div>
        </div>
      </motion.div>
    </div>
  );
}
