import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function AuthPage() {
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const { t } = useTranslation();

  const handleEnter = () => {
    setUser({ phone: phone || '+19998887777', role: 'diner' });
    navigate('/role-select');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-6 relative"
    >
      <div className="absolute top-6 right-6 z-10"><LanguageSwitcher /></div>
      <div className="w-full max-w-md bg-neutral-900/50 backdrop-blur-xl p-8 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="flex justify-center mb-6">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
            className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)]"
          >
            <Sparkles size={32} className="text-white" />
          </motion.div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">{t('auth.title')}</h1>
        <p className="text-neutral-400 text-center mb-8 text-sm">{t('auth.subtitle')}</p>
        
        <div className="space-y-4 mb-6">
          <input 
            type="text" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            placeholder="Enter Phone Number (No OTP Required)" 
            className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-blue-500 transition-colors" 
          />
          <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-3 text-xs text-blue-400 font-medium">
            💡 This is a free, frictionless login simulation. No SMS or OTP will be sent, saving you messaging costs.
          </div>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleEnter} 
          className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-neutral-200 transition-colors shadow-lg"
        >
          {t('auth.enterEcosystem')}
        </motion.button>
      </div>
    </motion.div>
  );
}
