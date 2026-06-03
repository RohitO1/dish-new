import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, MapPin, Clock, Smartphone, CreditCard, Banknote, Flame, Droplets, Leaf, Check, User, Phone, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import { supabase } from '../services/supabase';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, setCart, placeOrder, activeRestId, restaurants, user, setUser } = useAppContext();
  const { t } = useTranslation();

  const currentRestaurant = restaurants.find(r => r.id === activeRestId);
  const taxRate = currentRestaurant?.taxRate !== undefined ? currentRestaurant.taxRate / 100 : 0.08;
  
  useEffect(() => {
    if (!activeRestId) {
      navigate('/scanner', { replace: true });
    }
  }, [activeRestId, navigate]);

  const subtotal = cart.reduce((sum, item) => sum + Number(item.price), 0);
  const total = subtotal * (1 + taxRate);
  
  const [step, setStep] = useState(() => sessionStorage.getItem('cart_step') || 'cart');
  const [orderConf, setOrderConf] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('cart_orderConf')) || { type: 'dine_in', time: '19:30', method: 'UPI' }; }
    catch { return { type: 'dine_in', time: '19:30', method: 'UPI' }; }
  });
  const [contactDetails, setContactDetails] = useState({ name: '', phone: '' });
  const [tipPct, setTipPct] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // After returning from Google OAuth redirect, auto-advance past the auth step
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && step === 'auth') {
        sessionStorage.removeItem('cart_step');
        sessionStorage.removeItem('cart_orderConf');
        setStep('details');
      }
    };
    checkSession();
  }, []);

  const totalMacros = cart.reduce((acc, item) => {
    if (item.macros) {
      acc.calories += parseInt(item.macros.calories) || 0;
      acc.protein += parseInt(item.macros.protein) || 0;
      acc.carbs += parseInt(item.macros.carbs) || 0;
      acc.fat += parseInt(item.macros.fat) || 0;
    }
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  if (cart.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center pb-20 bg-neutral-50 dark:bg-obsidian-900 text-neutral-900 dark:text-pearl">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
            style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
            <ShoppingCart size={36} style={{ color: '#D4AF37', opacity: 0.5 }} />
          </div>
          <p className="font-serif text-xl text-pearl mb-2">{t('cart.empty')}</p>
          <p className="text-neutral-600 text-sm font-sans mb-8">Your selections await.</p>
          <button onClick={() => navigate('/menu')}
            className="font-sans font-bold px-8 py-3.5 rounded-full transition-all"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#AA8C2C)', color: '#0B0C10', boxShadow: '0 4px 20px rgba(212,175,55,0.3)' }}>
            {t('cart.browseMenu')}
          </button>
        </motion.div>
        <BottomNav/>
      </div>
    );
  }

  const finalTotal = total + (total * tipPct);

  const executeCheckout = async () => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 2000));

    const code = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    const status = orderConf.type === 'dine_in' ? 'Pending Verification' : 'Scheduled';
    const paymentStatus = orderConf.type === 'dine_in' && orderConf.method === 'Cash' ? 'Unpaid' : 'Paid';
    
    const success = await placeOrder({ 
      orderType: orderConf.type, 
      scheduledTime: orderConf.type === 'prepaid' ? orderConf.time : null,
      paymentMethod: orderConf.method,
      paymentStatus: paymentStatus,
      status: status,
      tipAmount: total * tipPct,
      verificationCode: orderConf.type === 'dine_in' ? code : null,
      contactName: contactDetails.name,
      contactPhone: contactDetails.phone
    });
    
    setIsProcessing(false);
    if (success) {
      sessionStorage.removeItem('cart_step');
      sessionStorage.removeItem('cart_orderConf');
      if (orderConf.type === 'prepaid') {
        setStep('success');
      } else {
        navigate('/orders');
      }
    }
  };

  const handleNext = async () => {
    if (step === 'cart') setStep('type');
    else if (step === 'type') {
      if (orderConf.type === 'dine_in') {
        setStep('pay');
      } else {
        // Pre-order: check for existing Supabase session first
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStep('details'); // already signed in, skip auth
        } else {
          setStep('auth');
        }
      }
    } else if (step === 'auth') {
      // This step is handled by its own Google button — do nothing here
    } else if (step === 'details') {
      if (!contactDetails.name || !contactDetails.phone) {
        alert('Please fill in your contact details.');
        return;
      }
      setStep('pay');
    } else if (step === 'pay') {
      executeCheckout();
    }
  };

  const handleBack = () => {
    if (step === 'cart') navigate('/menu');
    else if (step === 'type') setStep('cart');
    else if (step === 'auth') setStep('type');
    else if (step === 'details') setStep('type'); // always back to type, skipping auth
    else if (step === 'pay') {
      if (orderConf.type === 'dine_in') setStep('type');
      else setStep('details');
    }
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col h-screen pt-20 px-6 bg-neutral-50 dark:bg-obsidian-900 text-neutral-900 dark:text-pearl">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center text-center space-y-5">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ border: '2px solid rgba(212,175,55,0.5)', background: 'radial-gradient(circle, rgba(212,175,55,0.15), transparent)', boxShadow: '0 0 50px rgba(212,175,55,0.25)' }}>
            <Check size={42} style={{ color: '#D4AF37' }} />
          </div>
          <h2 className="text-3xl font-serif font-bold text-pearl">Pre-Order Placed!</h2>
          <p className="text-neutral-500 font-sans text-sm">Your order has been confirmed by the restaurant.</p>
          <div className="rounded-3xl p-6 w-full max-w-sm mt-2 text-left"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,175,55,0.15)' }}>
            <h3 className="font-sans font-semibold text-sm mb-4 flex items-center gap-2" style={{ color: '#D4AF37' }}>
              <Store size={16} /> Vendor Contact
            </h3>
            <div className="space-y-3">
              <p className="text-sm font-sans flex items-center gap-3 text-neutral-400"><MapPin size={15} className="text-neutral-600" />{currentRestaurant?.name}</p>
              <p className="text-sm font-sans flex items-center gap-3 text-neutral-400"><Phone size={15} className="text-neutral-600" />{currentRestaurant?.phone || '+1 (555) 123-4567'}</p>
              <p className="text-sm font-sans flex items-center gap-3 text-neutral-400"><User size={15} className="text-neutral-600" />contact@{currentRestaurant?.name?.replace(/\s+/g, '').toLowerCase() || 'vendor'}.com</p>
            </div>
          </div>
          <button onClick={() => navigate('/orders')}
            className="mt-6 w-full max-w-sm font-sans font-bold py-4 rounded-2xl transition-all"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#AA8C2C)', color: '#0B0C10', boxShadow: '0 8px 30px rgba(212,175,55,0.35)' }}>
            View My Orders →
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col h-screen pb-24 bg-neutral-50 dark:bg-obsidian-900 text-neutral-900 dark:text-pearl">
      <div className="p-5 flex items-center gap-4 sticky top-0 z-10"
        style={{ background: 'rgba(11,12,16,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(212,175,55,0.08)' }}>
        <button onClick={handleBack}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <ChevronLeft size={22} className="text-neutral-300" />
        </button>
        <h1 className="text-xl font-serif font-bold text-pearl">{t('cart.checkout')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {step === 'cart' && (
            <motion.div key="cart" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
              {cart.map((item) => (
                <motion.div layout key={item.cartId} className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-3xl p-5 flex justify-between items-center shadow-lg">
                  <div>
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-xs text-neutral-500 mt-1">1x Portion</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-lg block text-blue-400">${Number(item.price).toFixed(2)}</span>
                    <button onClick={() => setCart(cart.filter(c => c.cartId !== item.cartId))} className="text-xs font-bold text-red-500 mt-2 bg-red-500/10 px-3 py-1 rounded-lg">{t('cart.remove')}</button>
                  </div>
                </motion.div>
              ))}
              
              <div className="mt-8 mb-4">
                <h3 className="font-black text-lg mb-4 text-neutral-300">Total Nutritional Summary</h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3 flex flex-col items-center justify-center">
                    <Flame size={16} className="text-orange-500 mb-1" />
                    <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Cals</span>
                    <span className="font-black text-sm text-orange-400">{totalMacros.calories}</span>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 flex flex-col items-center justify-center">
                    <Droplets size={16} className="text-blue-500 mb-1" />
                    <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Pro</span>
                    <span className="font-black text-sm text-blue-400">{totalMacros.protein}g</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex flex-col items-center justify-center">
                    <Leaf size={16} className="text-emerald-500 mb-1" />
                    <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Carbs</span>
                    <span className="font-black text-sm text-emerald-400">{totalMacros.carbs}g</span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex flex-col items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-amber-500/30 border border-amber-500 mb-1"></span>
                    <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Fat</span>
                    <span className="font-black text-sm text-amber-400">{totalMacros.fat}g</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-blue-900/10 border border-blue-900/30 rounded-3xl p-6">
                <div className="flex justify-between text-neutral-400 mb-2"><span>Subtotal</span><span>${(total / 1.08).toFixed(2)}</span></div>
                <div className="flex justify-between text-neutral-400 mb-4 border-b border-neutral-800 pb-4"><span>Tax (8%)</span><span>${(total - (total / 1.08)).toFixed(2)}</span></div>
                <div className="text-2xl font-black flex justify-between text-white"><span>{t('cart.total')}</span><span className="text-blue-400">${total.toFixed(2)}</span></div>
              </div>
            </motion.div>
          )}

          {step === 'type' && (
            <motion.div key="type" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
              <h2 className="text-xl font-bold mb-6">{t('cart.howToOrder')}</h2>
              
              <div onClick={() => setOrderConf({...orderConf, type: 'dine_in'})} className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${orderConf.type === 'dine_in' ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}`}>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-3 rounded-xl ${orderConf.type === 'dine_in' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}><MapPin size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">Order Now (Dine-In)</h3>
                    <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mt-1">No Sign-in Required</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">You are at a table in the restaurant. We will generate a verification code for the waiter.</p>
              </div>

              <div onClick={() => setOrderConf({...orderConf, type: 'prepaid'})} className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${orderConf.type === 'prepaid' ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}`}>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-3 rounded-xl ${orderConf.type === 'prepaid' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}><Clock size={24} /></div>
                  <div>
                    <h3 className="font-bold text-lg">Pre-Order</h3>
                    <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mt-1">Auth Required</p>
                  </div>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">Order ahead of time or for takeout. You will need to sign in with Google to maintain authenticity.</p>
                {orderConf.type === 'prepaid' && (
                  <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} type="time" value={orderConf.time} onChange={e => setOrderConf({...orderConf, time: e.target.value})} className="mt-6 w-full bg-black border border-blue-500/50 rounded-xl p-4 text-white font-bold text-lg focus:outline-none focus:border-blue-500 shadow-inner" />
                )}
              </div>
            </motion.div>
          )}
          
          {step === 'auth' && (
            <motion.div key="auth" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6 flex flex-col items-center justify-center py-10">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-2 shadow-2xl">
                <svg className="w-10 h-10" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-center">Sign In Required</h2>
              <p className="text-neutral-400 text-center text-sm px-4 leading-relaxed">To prevent fake pre-orders and ensure authenticity, please sign in with Google.</p>
              
              <div className="w-full bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 space-y-4">
                <motion.button
                  disabled={googleLoading}
                  onClick={async () => {
                    setGoogleLoading(true);
                    // Persist cart state before redirect so it survives the OAuth round-trip
                    sessionStorage.setItem('cart_step', 'details');
                    sessionStorage.setItem('cart_orderConf', JSON.stringify(orderConf));
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo: window.location.origin + '/cart' }
                    });
                    if (error) { alert(error.message); setGoogleLoading(false); }
                  }}
                  whileHover={{ scale: googleLoading ? 1 : 1.02 }} whileTap={{ scale: googleLoading ? 1 : 0.98 }}
                  className="w-full bg-white text-black font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 disabled:opacity-60 transition-all">
                  {googleLoading ? (
                    <div className="w-5 h-5 border-2 border-neutral-400 border-t-neutral-800 rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </motion.button>
                <p className="text-center text-xs text-neutral-600">You will be redirected to Google and brought back here automatically.</p>
              </div>
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div key="details" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold mb-4">Contact Details</h2>
              <p className="text-sm text-neutral-400 mb-6">The vendor needs this to notify you about your order updates.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input type="text" value={contactDetails.name} onChange={e => setContactDetails({...contactDetails, name: e.target.value})} placeholder="e.g. John Doe" className="w-full bg-white dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-4 focus:outline-none focus:border-blue-500 transition-colors text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input type="tel" value={contactDetails.phone} onChange={e => setContactDetails({...contactDetails, phone: e.target.value})} placeholder="+1 (555) 000-0000" className="w-full bg-white dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-4 focus:outline-none focus:border-blue-500 transition-colors text-sm" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'pay' && (
            <motion.div key="pay" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-4">
              <h2 className="text-xl font-bold mb-6">{t('cart.paymentMethod')}</h2>
              
              <div onClick={() => setOrderConf({...orderConf, method: 'UPI'})} className={`p-5 rounded-3xl border-2 cursor-pointer flex items-center gap-5 transition-all ${orderConf.method === 'UPI' ? 'border-emerald-500 bg-emerald-900/20' : 'border-neutral-800 bg-neutral-900/50'}`}>
                <div className={`p-3 rounded-xl ${orderConf.method === 'UPI' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}><Smartphone size={24} /></div>
                <div><h3 className="font-bold">{t('cart.upi')}</h3><p className="text-xs text-neutral-500">{t('cart.upiDesc')}</p></div>
              </div>

              <div onClick={() => setOrderConf({...orderConf, method: 'Card'})} className={`p-5 rounded-3xl border-2 cursor-pointer flex items-center gap-5 transition-all ${orderConf.method === 'Card' ? 'border-emerald-500 bg-emerald-900/20' : 'border-neutral-800 bg-neutral-900/50'}`}>
                <div className={`p-3 rounded-xl ${orderConf.method === 'Card' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}><CreditCard size={24} /></div>
                <div><h3 className="font-bold">{t('cart.card')}</h3><p className="text-xs text-neutral-500">{t('cart.cardDesc')}</p></div>
              </div>
              
              <AnimatePresence>
                {orderConf.method === 'Card' && (
                   <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-5 bg-black/50 rounded-3xl space-y-4 border border-emerald-900/50">
                      <input type="text" placeholder="Card Number" className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
                      <div className="flex gap-4">
                        <input type="text" placeholder="MM/YY" className="w-1/2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
                        <input type="text" placeholder="CVV" className="w-1/2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>

              {orderConf.type === 'dine_in' && (
                <div onClick={() => setOrderConf({...orderConf, method: 'Cash'})} className={`p-5 rounded-3xl border-2 cursor-pointer flex items-center gap-5 transition-all ${orderConf.method === 'Cash' ? 'border-emerald-500 bg-emerald-900/20' : 'border-neutral-800 bg-neutral-900/50'}`}>
                  <div className={`p-3 rounded-xl ${orderConf.method === 'Cash' ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}><Banknote size={24} /></div>
                  <div><h3 className="font-bold">{t('cart.cash', 'Cash on Table')}</h3><p className="text-xs text-neutral-500">{t('cart.cashDesc', 'Pay after meal')}</p></div>
                </div>
              )}

              {/* Tip Selector */}
              <div className="pt-4 border-t border-neutral-800">
                <h3 className="text-sm font-bold mb-3">{t('cart.addTip', 'Add a tip?')}</h3>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 0.15, 0.20, 0.25].map(pct => (
                    <button key={pct} onClick={() => setTipPct(pct)}
                      className={`py-3 rounded-xl font-black text-sm border transition-all ${tipPct === pct ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30' : 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>
                      {pct === 0 ? 'No Tip' : `${pct * 100}%`}
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-20 w-full p-5"
        style={{ background: 'rgba(11,12,16,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(212,175,55,0.08)', borderRadius: '2rem 2rem 0 0' }}>
        {step === 'cart' && (
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleNext}
            className="w-full font-sans font-bold py-4 rounded-2xl transition-all"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#AA8C2C)', color: '#0B0C10', boxShadow: '0 6px 30px rgba(212,175,55,0.3)' }}>
            {t('cart.proceedToCheckout')}
          </motion.button>
        )}
        {step === 'type' && (
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleNext}
            className="w-full font-sans font-bold py-4 rounded-2xl transition-all"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#AA8C2C)', color: '#0B0C10', boxShadow: '0 6px 30px rgba(212,175,55,0.3)' }}>
            {orderConf.type === 'dine_in' ? 'Continue to Payment' : 'Proceed with Pre-Order'}
          </motion.button>
        )}
        {step === 'details' && (
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleNext}
            className="w-full font-sans font-bold py-4 rounded-2xl transition-all"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#AA8C2C)', color: '#0B0C10', boxShadow: '0 6px 30px rgba(212,175,55,0.3)' }}>
            Continue to Payment
          </motion.button>
        )}
        {step === 'pay' && (
          <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} disabled={isProcessing} onClick={handleNext}
            className="w-full font-sans font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all"
            style={{ background: 'linear-gradient(135deg,#D4AF37,#AA8C2C)', color: '#0B0C10', boxShadow: '0 6px 30px rgba(212,175,55,0.3)', opacity: isProcessing ? 0.7 : 1 }}>
            {isProcessing ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1 }}
                className="w-5 h-5 border-2 rounded-full" style={{ borderColor: 'rgba(11,12,16,0.3)', borderTopColor: '#0B0C10' }} /> Processing...</>
            ) : (
              <>{t('cart.payAndPlace')} · ${finalTotal.toFixed(2)}</>
            )}
          </motion.button>
        )}
      </div>
      <BottomNav />
    </motion.div>
  );
}
