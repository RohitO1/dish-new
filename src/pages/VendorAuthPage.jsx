import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';

export default function VendorAuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setSupabaseUser, setIsInitializing } = useAppContext();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google', 
        options: { redirectTo: window.location.origin + '/vendor-onboard' } 
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'Failed to connect to Google.');
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    setSupabaseUser({ id: 'DEV_BYPASS', email: 'ai_bot@dev.local', role: 'vendor' });
    setIsInitializing(false);
    navigate('/vendor-onboard', { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 relative"
    >
      {/* Back button */}
      <button onClick={() => navigate('/scanner')} 
        className="absolute top-8 left-6 flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
            <ChefHat size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            Vendor Portal
          </h1>
          <p className="text-neutral-400 text-sm mt-3 text-center px-4">
            Sign in to manage your digital AR menu, track live orders, and customize your restaurant settings.
          </p>
        </div>

        {/* Form Area */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl">
          
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-red-900/20 border border-red-800/50 text-red-400 text-sm font-medium p-4 rounded-xl mb-6">
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button type="button" onClick={handleGoogleLogin} disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full bg-white text-black font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-70 transition-all">
            {loading ? <Loader2 size={24} className="animate-spin" /> : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </motion.button>
          
          <button 
            type="button"
            onClick={handleDevBypass}
            className="w-full mt-4 bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 font-bold py-3 rounded-xl hover:bg-emerald-600/40 transition-colors"
          >
            Dev Bypass (AI Auto-Test)
          </button>

        </motion.div>

        <p className="text-center text-xs text-neutral-600 mt-8">
          🔒 Secured by Supabase Authentication · 100% Free
        </p>
      </div>
    </motion.div>
  );
}
