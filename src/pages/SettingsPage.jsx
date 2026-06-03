import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Globe, Target, Flame, Droplets, Leaf, Settings as SettingsIcon, LogOut, User, ShieldCheck, ChefHat, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import BottomNav from '../components/BottomNav';
import { supabase } from '../services/supabase';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { userPreferences, updatePreferences, user, setUser, supabaseUser, theme, toggleTheme } = useAppContext();
  const { i18n, t } = useTranslation();
  const [localGoals, setLocalGoals] = useState(userPreferences.goals);
  const [saved, setSaved] = useState(false);

  const handleLanguageChange = (lang) => {
    updatePreferences({ language: lang });
    i18n.changeLanguage(lang);
  };

  const saveGoals = (e) => {
    e.preventDefault();
    updatePreferences({ goals: localGoals });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    if (supabase && supabaseUser) {
      await supabase.auth.signOut();
    }
    setUser(null);
    navigate('/scanner', { replace: true });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col h-screen bg-neutral-950 text-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-14 pb-5 border-b border-neutral-900">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-neutral-700 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black flex items-center gap-2"><SettingsIcon size={22}/> Settings</h1>
          <p className="text-xs text-neutral-500">Preferences & account</p>
        </div>
        <button onClick={toggleTheme} className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-neutral-700 transition-colors">
          {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-blue-400" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-28 space-y-8 pt-6">

        {/* Account Section */}
        {user && (
          <div>
            <h2 className="font-black text-lg mb-4 flex items-center gap-2">
              {user.role === 'vendor' ? <ChefHat size={20} className="text-emerald-400" /> : <User size={20} className="text-blue-400" />}
              Account
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${user.role === 'vendor' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' : 'bg-blue-600/20 text-blue-400 border border-blue-600/30'}`}>
                  {(user.email || user.phone || 'A')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{user.email || user.phone || 'Anonymous Diner'}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={11} className={user.role === 'vendor' ? 'text-emerald-400' : 'text-blue-400'} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${user.role === 'vendor' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {user.role === 'vendor' ? 'Restaurant Partner' : 'Diner'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/40 font-bold py-3 rounded-2xl transition-colors text-sm">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Language Section */}
        <div>
          <h2 className="font-black text-lg mb-4 flex items-center gap-2">
            <Globe size={20} className="text-blue-400" /> {t('settings.language', 'Language')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { code: 'en', label: 'English', flag: '🇬🇧' },
              { code: 'es', label: 'Español', flag: '🇪🇸' },
              { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' }
            ].map(lang => (
              <button key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`py-3 rounded-2xl font-bold border transition-all text-sm ${
                  userPreferences.language === lang.code 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30' 
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}>
                <div>{lang.flag}</div>
                <div className="text-xs mt-1">{lang.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Goals Section */}
        <div>
          <h2 className="font-black text-lg mb-4 flex items-center gap-2">
            <Target size={20} className="text-emerald-400" /> {t('settings.goals', 'Daily Dietary Goals')}
          </h2>
          <form onSubmit={saveGoals} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 space-y-4">
            
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-neutral-400 mb-2">
                <Flame size={14} className="text-orange-500" /> Calories (kcal)
              </label>
              <input type="number" required value={localGoals.calories}
                onChange={e => setLocalGoals({...localGoals, calories: Number(e.target.value)})}
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 mb-2 uppercase">
                  <Droplets size={12} className="text-blue-400" /> Protein (g)
                </label>
                <input type="number" required value={localGoals.protein}
                  onChange={e => setLocalGoals({...localGoals, protein: Number(e.target.value)})}
                  className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white text-center" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 mb-2 uppercase">
                  <Leaf size={12} className="text-emerald-500" /> Carbs (g)
                </label>
                <input type="number" required value={localGoals.carbs}
                  onChange={e => setLocalGoals({...localGoals, carbs: Number(e.target.value)})}
                  className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white text-center" />
              </div>
              <div>
                <label className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 mb-2 uppercase">
                  <span className="text-amber-400 font-black">F</span> Fat (g)
                </label>
                <input type="number" required value={localGoals.fat}
                  onChange={e => setLocalGoals({...localGoals, fat: Number(e.target.value)})}
                  className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-emerald-500 text-neutral-900 dark:text-white text-center" />
              </div>
            </div>

            <AnimatePresence>
              {saved && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-center text-emerald-400 text-sm font-bold py-2">
                  ✓ Goals saved!
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit"
              className="w-full mt-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 font-black py-3 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
              {t('settings.saveGoals', 'Save Goals')}
            </button>
          </form>
        </div>

        {/* App Info */}
        <div className="text-center text-xs text-neutral-700 pb-4 space-y-1">
          <p className="font-bold">3Dish · Next-Gen AR Dining</p>
          <p>Powered by Supabase & Hugging Face TripoSR</p>
        </div>

      </div>
      <BottomNav />
    </motion.div>
  );
}
