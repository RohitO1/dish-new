import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';

export default function RoleSelectPage() {
  const navigate = useNavigate();
  const { user, setUser, setActiveRestId } = useAppContext();
  const { t } = useTranslation();

  const selectDiner = () => {
    setUser({ ...user, role: 'diner' });
    setActiveRestId(null); // always start fresh at scanner
    navigate('/scanner');
  };

  const selectVendor = () => {
    navigate('/vendor-auth');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-6"
    >
      <h2 className="text-3xl font-bold mb-10 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">{t('roles.selectPortal')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <motion.button 
          whileHover={{ scale: 1.03, borderColor: '#3b82f6' }} whileTap={{ scale: 0.97 }}
          onClick={selectDiner} 
          className="group flex flex-col items-center p-10 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-3xl transition-all shadow-xl hover:shadow-blue-900/20"
        >
          <div className="p-4 bg-blue-900/20 rounded-2xl mb-6 group-hover:bg-blue-600 transition-colors">
            <User size={48} className="text-blue-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t('roles.dinerTitle')}</h3>
          <p className="text-neutral-400 text-sm text-center">{t('roles.dinerDesc')}</p>
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.03, borderColor: '#10b981' }} whileTap={{ scale: 0.97 }}
          onClick={selectVendor} 
          className="group flex flex-col items-center p-10 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-3xl transition-all shadow-xl hover:shadow-emerald-900/20"
        >
          <div className="p-4 bg-emerald-900/20 rounded-2xl mb-6 group-hover:bg-emerald-600 transition-colors">
            <ChefHat size={48} className="text-emerald-500 group-hover:text-white transition-colors" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t('roles.vendorTitle')}</h3>
          <p className="text-neutral-400 text-sm text-center">{t('roles.vendorDesc')}</p>
        </motion.button>
      </div>
    </motion.div>
  );
}
