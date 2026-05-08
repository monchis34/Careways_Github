/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLanguage } from '../App';
import { ArrowRight, Globe, Users, Database, LineChart } from 'lucide-react';
import { motion } from 'motion/react';

interface MainLandingPageProps {
  onJoin: () => void;
  onAdminPanel: () => void;
}

export default function MainLandingPage({ onJoin, onAdminPanel }: MainLandingPageProps) {
  const { t, language, setLanguage } = useLanguage();

  const stats = [
    { value: '500+', label: t.landing.stats.professionals, icon: Users },
    { value: '12', label: t.landing.stats.hospitals, icon: Database },
    { value: '5', label: t.landing.stats.countries, icon: Globe },
    { value: '30%', label: t.landing.stats.reduction, icon: LineChart },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#00236f] rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-yellow-400 rounded-full" />
          </div>
          <span className="text-2xl font-bold text-[#00236f]">CareWays</span>
          <span className="text-gray-400 font-medium">{t.landing.brandCollaborative}</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#" className="hover:text-[#00236f]">{t.landing.about}</a>
          <a href="#" className="hover:text-[#00236f]">{t.landing.programs}</a>
          <a href="#" className="hover:text-[#00236f]">{t.landing.research}</a>
          <a href="#" className="hover:text-[#00236f]">{t.landing.contact}</a>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-gray-100 rounded-full p-1 text-[10px] font-bold">
            <button 
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-full transition-all ${language === 'en' ? 'bg-[#00236f] text-white shadow-sm' : 'text-gray-400'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('es')}
              className={`px-3 py-1 rounded-full transition-all ${language === 'es' ? 'bg-[#00236f] text-white shadow-sm' : 'text-gray-400'}`}
            >
              ES
            </button>
          </div>
          <button onClick={onAdminPanel} className="text-sm font-bold text-gray-600 hover:text-[#00236f]">{t.landing.login}</button>
          <button 
            onClick={onJoin}
            className="hidden sm:block px-6 py-2 bg-[#00236f] text-white rounded-full text-sm font-bold shadow-lg shadow-blue-900/20 hover:scale-105 transition-transform"
          >
            {t.landing.join}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32">
        <div className="max-w-4xl">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[5rem] leading-[1.05] font-bold text-[#00236f] tracking-tight mb-8"
          >
            {t.landing.heroTitle}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl text-gray-500 mb-12 max-w-2xl leading-relaxed"
          >
            {t.landing.heroDesc}
          </motion.p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={onJoin}
              className="px-10 py-5 bg-[#00236f] text-white rounded-2xl font-bold text-lg flex items-center gap-3 shadow-2xl shadow-blue-900/10 hover:scale-105 transition-transform"
            >
              {t.landing.join}
              <ArrowRight className="w-6 h-6" />
            </button>
            <button className="px-10 py-5 bg-white border-2 border-gray-100 text-[#00236f] rounded-2xl font-bold text-lg hover:bg-gray-50 transition-colors">
              {t.landing.learnMore}
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-32 bg-white rounded-3xl p-12 shadow-2xl shadow-blue-900/5 grid grid-cols-2 lg:grid-cols-4 gap-12 border border-gray-50">
          {stats.map((stat, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <stat.icon className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
              <div className="text-4xl font-bold text-[#00236f]">{stat.value}</div>
              <div className="text-sm font-medium text-gray-400 capitalize">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
