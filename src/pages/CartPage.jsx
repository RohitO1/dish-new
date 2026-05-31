import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, MapPin, Clock, Smartphone, CreditCard, Banknote, Flame, Droplets, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, setCart, placeOrder, activeRestId, restaurants } = useAppContext();
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
  const [step, setStep] = useState('cart'); 
  const [orderConf, setOrderConf] = useState({ type: 'dine_in', time: '19:30', method: 'UPI' });
  const [tipPct, setTipPct] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

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
      <div className="flex flex-col h-screen bg-neutral-950 text-white items-center justify-center pb-20">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
          <div className="w-24 h-24 bg-neutral-900 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <ShoppingCart size={40} className="text-neutral-600" />
          </div>
          <p className="text-neutral-400 text-lg mb-6">{t('cart.empty')}</p>
          <button onClick={() => navigate('/menu')} className="bg-blue-600 text-white font-bold px-8 py-3 rounded-full hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">{t('cart.browseMenu')}</button>
        </motion.div>
        <BottomNav/>
      </div>
    );
  }

  const finalTotal = total + (total * tipPct);

  const executeCheckout = async () => {
    setIsProcessing(true);
    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 2000));

    const status = orderConf.type === 'dine_in' ? 'Awaiting Arrival' : 'Scheduled';
    const paymentStatus = orderConf.type === 'dine_in' && orderConf.method === 'Cash' ? 'Unpaid' : 'Paid';
    
    const success = await placeOrder({ 
      orderType: orderConf.type, 
      scheduledTime: orderConf.type === 'prepaid' ? orderConf.time : null,
      paymentMethod: orderConf.method,
      paymentStatus: paymentStatus,
      status: status,
      tipAmount: total * tipPct
    });
    
    setIsProcessing(false);
    if (success) navigate('/orders');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-screen bg-neutral-950 text-white pb-24">
      <div className="p-6 border-b border-neutral-900 flex items-center gap-4 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => step === 'cart' ? navigate('/menu') : setStep(step === 'pay' ? 'type' : 'cart')} className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-neutral-700 transition-colors"><ChevronLeft size={24} /></button>
        <h1 className="text-2xl font-black">{t('cart.checkout')}</h1>
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
                  <h3 className="font-bold text-lg">{t('cart.dineIn')}</h3>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">{t('cart.dineInDesc')}</p>
              </div>

              <div onClick={() => setOrderConf({...orderConf, type: 'prepaid'})} className={`p-6 rounded-3xl border-2 cursor-pointer transition-all ${orderConf.type === 'prepaid' ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}`}>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-3 rounded-xl ${orderConf.type === 'prepaid' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}><Clock size={24} /></div>
                  <h3 className="font-bold text-lg">{t('cart.prepaid')}</h3>
                </div>
                <p className="text-sm text-neutral-400 leading-relaxed">{t('cart.prepaidDesc')}</p>
                {orderConf.type === 'prepaid' && (
                  <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} type="time" value={orderConf.time} onChange={e => setOrderConf({...orderConf, time: e.target.value})} className="mt-6 w-full bg-black border border-blue-500/50 rounded-xl p-4 text-white font-bold text-lg focus:outline-none focus:border-blue-500 shadow-inner" />
                )}
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
                      <input type="text" placeholder="Card Number" className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
                      <div className="flex gap-4">
                        <input type="text" placeholder="MM/YY" className="w-1/2 bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
                        <input type="text" placeholder="CVV" className="w-1/2 bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
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

      <div className="fixed bottom-20 w-full p-6 bg-neutral-900/90 backdrop-blur-xl border-t border-neutral-800 rounded-t-[2rem]">
        {step === 'cart' && <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep('type')} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">{t('cart.proceedToCheckout')}</motion.button>}
        {step === 'type' && <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep('pay')} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">{t('cart.continueToPayment')}</motion.button>}
        {step === 'pay' && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={isProcessing} onClick={executeCheckout} 
            className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex justify-center items-center gap-2 transition-all">
            {isProcessing ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: 'linear', duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> Processing...</>
            ) : (
              <>{t('cart.payAndPlace')} • ${finalTotal.toFixed(2)}</>
            )}
          </motion.button>
        )}
      </div>
      <BottomNav />
    </motion.div>
  );
}
