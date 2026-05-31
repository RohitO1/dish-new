import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, Mail, Lock, Eye, EyeOff, User, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from '../services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAppContext } from '../context/AppContext';

export default function VendorAuthPage() {
  const navigate = useNavigate();
  const { setUser } = useAppContext();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email above, then click Forgot Password.'); return; }
    setLoading(true); setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err.code));
    }
    setLoading(false);
  };

  const friendlyError = (code) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered. Try logging in instead.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/weak-password': return 'Password must be at least 6 characters long.';
      case 'auth/user-not-found': return 'No account found with this email. Register instead?';
      case 'auth/wrong-password': return 'Incorrect password. Please try again.';
      case 'auth/invalid-credential': return 'Email or password is incorrect. Please check and try again.';
      case 'auth/too-many-requests': return 'Too many failed attempts. Please try again later.';
      default: return 'Something went wrong. Please try again.';
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) { setError('Please enter your restaurant / business name.'); return; }
    setLoading(true);
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      setUser({ email: cred.user.email, uid: cred.user.uid, displayName, role: 'vendor' });
      navigate('/vendor-onboard');
    } catch (err) {
      setError(friendlyError(err.code));
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setUser({ email: cred.user.email, uid: cred.user.uid, displayName: cred.user.displayName, role: 'vendor' });
      navigate('/vendor-onboard');
    } catch (err) {
      setError(friendlyError(err.code));
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 relative"
    >
      {/* Back button */}
      <button onClick={() => navigate('/role-select')} 
        className="absolute top-8 left-6 flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
            <ChefHat size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
            Vendor Portal
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Restaurant Management System</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-neutral-900 border border-neutral-800 rounded-2xl p-1 mb-8">
          <button onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'login' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}>
            Sign In
          </button>
          <button onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${mode === 'register' ? 'bg-white text-black shadow-sm' : 'text-neutral-400 hover:text-white'}`}>
            Create Account
          </button>
        </div>

        {/* Form */}
        <motion.form key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
          onSubmit={mode === 'register' ? handleRegister : handleLogin}
          className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 space-y-5 shadow-2xl">

          <AnimatePresence>
            {mode === 'register' && (
              <motion.div key="displayName" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Restaurant / Business Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required
                    placeholder="e.g. The Quantum Café"
                    className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl pl-11 pr-4 py-4 focus:outline-none focus:border-emerald-500 transition-colors text-sm" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="restaurant@email.com"
                className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl pl-11 pr-4 py-4 focus:outline-none focus:border-emerald-500 transition-colors text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Min. 6 characters"
                className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl pl-11 pr-12 py-4 focus:outline-none focus:border-emerald-500 transition-colors text-sm" />
              <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-red-900/20 border border-red-800/50 text-red-400 text-sm font-medium p-4 rounded-xl">
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button type="submit" disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 disabled:opacity-70 transition-all">
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              mode === 'register' ? 'Create Vendor Account →' : 'Sign In to Dashboard →'
            )}
          </motion.button>

          <p className="text-center text-xs text-neutral-500 pt-2">
            {mode === 'register' 
              ? <>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(''); setResetSent(false); }} className="text-emerald-400 font-bold hover:underline">Sign In</button></>
              : <>Don't have an account? <button type="button" onClick={() => { setMode('register'); setError(''); setResetSent(false); }} className="text-emerald-400 font-bold hover:underline">Register Free</button></>
            }
          </p>

          {mode === 'login' && (
            <>
              {resetSent ? (
                <div className="bg-emerald-900/20 border border-emerald-800/50 text-emerald-400 text-sm font-medium p-4 rounded-xl text-center">
                  ✅ Password reset email sent! Check your inbox.
                </div>
              ) : (
                <p className="text-center text-xs text-neutral-600">
                  Forgot your password? <button type="button" onClick={handleForgotPassword} className="text-blue-400 hover:underline font-bold">Reset it here</button>
                </p>
              )}
            </>
          )}
        </motion.form>

        <p className="text-center text-xs text-neutral-600 mt-6">
          🔒 Secured by Firebase Authentication · 100% Free
        </p>
      </div>
    </motion.div>
  );
}
