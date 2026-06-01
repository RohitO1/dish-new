import React from 'react';
import { MapPin, CheckCircle2, Clock, ChefHat, ShieldCheck, XCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

const STATUS_STEPS = [
  { id: 'Pending', icon: Clock, label: 'Received' },
  { id: 'Preparing', icon: ChefHat, label: 'Cooking' },
  { id: 'Ready', icon: CheckCircle2, label: 'Ready' }
];

function OrderTimeline({ currentStatus }) {
  // Don't show timeline for verification or cancelled states
  if (currentStatus === 'Pending Verification' || currentStatus === 'Cancelled') return null;
  
  const currentIndex = STATUS_STEPS.findIndex(s => s.id === currentStatus);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="relative flex justify-between items-center mt-6 mb-8 px-2">
      {/* Background Line */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-neutral-800 -translate-y-1/2 z-0 rounded-full" />
      {/* Active Line */}
      <motion.div 
        className="absolute top-1/2 left-0 h-1 bg-blue-500 -translate-y-1/2 z-0 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
        initial={{ width: '0%' }}
        animate={{ width: `${(activeIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
      
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = index <= activeIndex;
        const isActive = index === activeIndex;
        
        return (
          <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
            <motion.div 
              initial={false}
              animate={{ 
                scale: isActive ? 1.2 : 1,
                backgroundColor: isCompleted ? '#3b82f6' : '#262626',
                borderColor: isCompleted ? '#60a5fa' : '#404040'
              }}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-500 ${isCompleted ? 'text-white' : 'text-neutral-500'}`}
            >
              <step.icon size={14} />
            </motion.div>
            <span className={`text-[10px] font-bold absolute -bottom-5 w-20 text-center transition-colors duration-500 ${isActive ? 'text-blue-400' : isCompleted ? 'text-neutral-300' : 'text-neutral-600'}`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DinerOrdersPage() {
  const { orders, user, restaurants } = useAppContext();
  const { t } = useTranslation();

  // Helper for sequential order number
  const getOrderNumber = (order) => {
    const vendorOrders = orders.filter(o => o.restId === (order.restId || order.rest_id) || o.rest_id === (order.restId || order.rest_id))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const index = vendorOrders.findIndex(o => o.id === order.id);
    return index !== -1 ? `Order #${String(index + 1).padStart(3, '0')}` : `#${order.id.slice(-3)}`;
  };

  // Match orders by user_id (supports anonymous phone-based IDs and uid-based IDs)
  const myOrders = orders.filter(o => {
    const userId = o.user_id || o.userId;
    return userId === user?.uid || userId === user?.phone || userId === user?.email || userId === 'anonymous';
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-screen bg-neutral-950 text-white pb-24">
      <div className="p-6 border-b border-neutral-900 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-2xl font-black">{t('orders.liveTracking')}</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {myOrders.length === 0 && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-neutral-500 text-center mt-10">
            {t('orders.noOrders')}
          </motion.p>
        )}
        
        <AnimatePresence>
          {myOrders.map((order, index) => (
            <motion.div 
              key={order.id} 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}
              className="bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 rounded-[2rem] p-6 shadow-lg"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-black text-xl">{restaurants.find(r => r.id === (order.restId || order.rest_id))?.name || 'Restaurant'}</span>
                  <span className="block text-xs font-bold text-neutral-400 mt-1 uppercase tracking-wider">
                    <span className="text-blue-400">{getOrderNumber(order)}</span> • {order.orderType === 'prepaid' ? `Pre-Order @ ${order.scheduledTime}` : 'Dine-In'}
                  </span>
                </div>
              </div>
              
              {/* Pending Verification - Show the 4-digit code prominently */}
              {order.status === 'Pending Verification' && (
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="mb-6">
                  <div className="bg-amber-900/20 border border-amber-800/50 rounded-2xl p-6 text-center">
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30">
                        <ShieldCheck size={24} className="text-amber-400" />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Your Verification Code</p>
                    {order.verificationCode && (
                      <p className="text-4xl font-black text-amber-300 tracking-[0.4em] font-mono mb-3">{order.verificationCode}</p>
                    )}
                    <p className="text-sm text-neutral-400">Show this code to the waiter to confirm your table presence.</p>
                  </div>
                </motion.div>
              )}

              {/* Cancelled Order */}
              {order.status === 'Cancelled' && (
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="mb-6">
                  <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30 shrink-0">
                      <XCircle size={20} className="text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-400">Order Rejected</p>
                      <p className="text-xs text-neutral-500">This order was not verified by the restaurant staff.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <OrderTimeline currentStatus={order.status} />

              <div className="bg-black/40 rounded-2xl p-4 mb-4 border border-white/5">
                <ul className="text-sm font-medium text-neutral-300 space-y-2">
                  {order.items.map((item, i) => <li key={i} className="flex justify-between"><span>1x {item.name}</span><span className="text-neutral-500">${Number(item.price).toFixed(2)}</span></li>)}
                </ul>
              </div>
              
              {/* Call Waiter Button for Dine-In */}
              {order.orderType === 'dine_in' && order.status !== 'Cancelled' && (
                <button onClick={() => alert('Waiter has been notified and will be at your table shortly!')} className="w-full mb-4 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm">
                  <Bell size={16} /> Call Waiter
                </button>
              )}
              
              <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-neutral-800/50 pt-4">
                <span className="text-xl">{t('orders.total')}: <span className="text-blue-400">${Number(order.total).toFixed(2)}</span></span>
                <span className={`px-3 py-1 rounded-lg text-xs ${order.paymentStatus === 'Paid' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>
                  {order.paymentStatus} via {order.paymentMethod}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <BottomNav />
    </motion.div>
  );
}

