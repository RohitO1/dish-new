import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Globe, Target, Flame, Droplets, Leaf, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import BottomNav from '../components/BottomNav';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { userPreferences, updatePreferences } = useAppContext();
  const { i18n, t } = useTranslation();

  const [localGoals, setLocalGoals] = useState(userPreferences.goals);

  const handleLanguageChange = (lang) => {
    updatePreferences({ language: lang });
    i18n.changeLanguage(lang);
  };

  const saveGoals = (e) => {
    e.preventDefault();
    updatePreferences({ goals: localGoals });
    // Optional: show notification if we exported it from context
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col h-screen bg-neutral-950 text-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-14 pb-5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-neutral-700 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><SettingsIcon size={24}/> {t('settings.title', 'Settings & Preferences')}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-28 space-y-8">

        {/* Language Section */}
        <div>
          <h2 className="font-black text-lg mb-4 flex items-center gap-2">
            <Globe size={20} className="text-blue-400" /> {t('settings.language', 'Language')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { code: 'en', label: 'English' },
              { code: 'es', label: 'Español' },
              { code: 'hi', label: 'हिन्दी' }
            ].map(lang => (
              <button key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`py-3 rounded-2xl font-bold border transition-all ${
                  userPreferences.language === lang.code 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30' 
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Goals Section */}
        <div>
          <h2 className="font-black text-lg mb-4 flex items-center gap-2">
            <Target size={20} className="text-emerald-400" /> {t('settings.goals', 'Daily Dietary Goals')}
          </h2>
          <form onSubmit={saveGoals} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-4">
            
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 mb-2">
                <Flame size={14} className="text-orange-500" /> Calories (kcal)
              </label>
              <input type="number" required value={localGoals.calories}
                onChange={e => setLocalGoals({...localGoals, calories: Number(e.target.value)})}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-white" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 mb-2 uppercase">
                  <Droplets size={12} className="text-blue-400" /> Protein (g)
                </label>
                <input type="number" required value={localGoals.protein}
                  onChange={e => setLocalGoals({...localGoals, protein: Number(e.target.value)})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-white text-center" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 mb-2 uppercase">
                  <Leaf size={12} className="text-emerald-500" /> Carbs (g)
                </label>
                <input type="number" required value={localGoals.carbs}
                  onChange={e => setLocalGoals({...localGoals, carbs: Number(e.target.value)})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-white text-center" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 mb-2 uppercase">
                  <span className="text-amber-400 ml-1">F</span> Fat (g)
                </label>
                <input type="number" required value={localGoals.fat}
                  onChange={e => setLocalGoals({...localGoals, fat: Number(e.target.value)})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-white text-center" />
              </div>
            </div>

            <button type="submit"
              className="w-full mt-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 font-black py-3 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
              {t('settings.saveGoals', 'Save Goals')}
            </button>
          </form>
        </div>

      </div>
      <BottomNav />
    </motion.div>
  );
}
