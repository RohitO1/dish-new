import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';

export default function Notification() {
  const { notification } = useAppContext();

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          className="fixed top-4 left-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.3)] flex items-center gap-2 text-sm font-bold"
        >
          <CheckCircle2 size={18} /> {notification}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
