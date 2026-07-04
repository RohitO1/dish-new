import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, TrendingUp, Utensils, QrCode as QrIcon, Box, Edit2, Plus, X, Camera, Upload, Sparkles, Loader2, CheckCircle2, Printer, AlertTriangle, LogOut, Store, Settings, Users, Save, Trash2, XCircle, RefreshCw, Video, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../services/supabase';

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  const { orders, activeRestId, vendorTab, setVendorTab, updateOrderStatus, dishes, restaurants, addDish, updateDish, user, setUser, updateRestaurant, supabaseUser, setActiveRestId, isInitializing, theme, toggleTheme } = useAppContext();
  const { t } = useTranslation();

  // Auth and Onboarding Guards
  React.useEffect(() => {
    if (isInitializing) return; // Wait for auth state to load
    
    if (!supabaseUser) {
      navigate('/vendor-auth', { replace: true });
      return;
    }

    const myRest = restaurants.find(r => r.vendor_id === supabaseUser.id || r.vendorId === supabaseUser.id);
    if (!myRest && restaurants.length === 0) {
      // Wait for restaurants to load from DB before redirecting
      return;
    }
    if (!myRest) {
      navigate('/vendor-onboard', { replace: true });
    } else if (!activeRestId) {
      setActiveRestId(myRest.id);
    }
  }, [supabaseUser, restaurants, activeRestId, navigate, setActiveRestId]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  const currentRestaurant = restaurants.find(r => r.id === activeRestId);
  const [editingDish, setEditingDish] = React.useState(null);
  
  // AI Scanning State
  const [scanState, setScanState] = React.useState('idle');
  const [scanStageLabel, setScanStageLabel] = React.useState('');
  const [progress, setProgress]             = React.useState(0);
  const fileInputRef   = React.useRef(null);
  const glbInputRef    = React.useRef(null);

  // Multi-table QR
  const [tableCount, setTableCount] = React.useState(1);

  // Settings State
  const [settingsForm, setSettingsForm] = React.useState({
    name: '',
    cover: '',
    taxRate: 8,
    acceptCash: true
  });

  React.useEffect(() => {
    if (currentRestaurant) {
      setSettingsForm({
        name: currentRestaurant.name || '',
        cover: currentRestaurant.cover || '',
        taxRate: currentRestaurant.taxRate !== undefined ? currentRestaurant.taxRate : 8,
        acceptCash: currentRestaurant.acceptCash !== undefined ? currentRestaurant.acceptCash : true
      });
    }
  }, [currentRestaurant]);

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    await updateRestaurant(activeRestId, settingsForm);
  };

  // Allergens state (part of editingDish)
  const ALLERGEN_OPTIONS = ['Gluten', 'Nuts', 'Dairy', 'Eggs', 'Shellfish', 'Soy'];

  // Auto-fill dish metadata helper (optional enhancement after upload)
  const finalizeGlbResult = React.useCallback((finalUrl) => {
    setScanState('complete');
    setProgress(100);
    setScanStageLabel('3D AR Model Ready!');

    setEditingDish(prev => {
      if (!prev) return prev;
      const autoTags = prev.tags?.length ? prev.tags : ['Bestseller', 'New'];
      const autoDesc = prev.description ? prev.description : "A visually stunning dish, ready to view in AR.";
      return { ...prev, modelUrl: finalUrl, description: autoDesc, tags: autoTags };
    });
  }, []);

  const uploadGlbFile = async (file, hideState = false) => {
    if (!supabase) {
      alert("Supabase is not configured. Please check your .env settings.");
      return null;
    }
    
    if (!hideState) {
      setScanState('uploading');
      setScanStageLabel('Uploading .glb model...');
      setProgress(30);
    }

    try {
      const filePath = `${activeRestId}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('models')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('models')
        .getPublicUrl(filePath);

      if (!hideState) {
        setEditingDish(prev => prev ? { ...prev, modelUrl: publicUrlData.publicUrl } : prev);
        finalizeGlbResult(publicUrlData.publicUrl);
      }
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Upload failed", error);
      if (!hideState) {
        setScanState('idle');
        alert("Upload failed. Make sure you created the 'models' bucket in your Supabase Storage.");
      }
      return null;
    }
  };

  // Helper for sequential order number
  const getOrderNumber = (order) => {
    const vendorOrders = orders.filter(o => o.restId === activeRestId || o.rest_id === activeRestId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const index = vendorOrders.findIndex(o => o.id === order.id);
    return index !== -1 ? `Order #${String(index + 1).padStart(3, '0')}` : `#${order.id.slice(-3)}`;
  };

  const restOrders = orders.filter(o => o.restId === activeRestId);
  const pendingVerification = restOrders.filter(o => o.status === 'Pending Verification');
  const pending = restOrders.filter(o => o.status === 'Pending' || o.status === 'Scheduled');
  const prep = restOrders.filter(o => o.status === 'Preparing');
  const ready = restOrders.filter(o => o.status === 'Ready');
  const completed = restOrders.filter(o => o.status === 'Completed');

  const todayRevenue = completed.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-neutral-50 dark:bg-obsidian-900 text-neutral-900 dark:text-pearl">
      {/* Header */}
      <div className="p-4 flex justify-between items-center z-10 shrink-0 bg-white/95 dark:bg-obsidian-900/98 backdrop-blur-xl border-b border-neutral-200 dark:border-champagne-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-champagne-500/10 dark:bg-champagne-500/20 border border-champagne-500/20 dark:border-champagne-500/30">
            <LayoutDashboard size={20} className="text-champagne-600 dark:text-champagne-500" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg leading-tight flex items-center gap-2 text-neutral-900 dark:text-pearl">
              {currentRestaurant?.name || 'Dashboard'}
            </h1>
            <p className="text-xs font-sans flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-champagne-500"></span>
              {user?.email || 'Cloud Synced'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
            {theme === 'dark' ? <span title="Switch to Premium Light Mode">☀️</span> : <span title="Switch to Dark Luxury Mode">🌙</span>}
          </button>
          <button onClick={handleLogout}
            className="text-xs font-sans font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2 bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-pearl hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 overflow-x-auto no-scrollbar z-0 bg-neutral-100 dark:bg-obsidian-900 border-b border-neutral-200 dark:border-champagne-500/10">
        {[
          { key: 'orders',    icon: ListOrdered, label: t('vendor.kitchenDisplay') },
          { key: 'analytics', icon: TrendingUp,   label: t('vendor.analytics') },
          { key: 'menu',      icon: Utensils,     label: t('vendor.menu3D') },
          { key: 'qr',        icon: QrIcon,       label: t('vendor.qr') },
          { key: 'staff',     icon: Users,        label: 'Staff' },
          { key: 'settings',  icon: Settings,     label: 'Settings' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setVendorTab(tab.key)}
            className="px-5 py-4 text-xs font-sans font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all"
            style={vendorTab === tab.key
              ? { borderColor: '#D4AF37', color: '#D4AF37', background: 'rgba(212,175,55,0.06)' }
              : { borderColor: 'transparent', color: '#6B7280' }
            }>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative bg-neutral-50 dark:bg-neutral-950">
        <AnimatePresence mode="wait">
          {vendorTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-x-auto p-6 flex gap-6 items-start">
              
              {/* Pending Verification Lane (special) */}
              <div className="w-80 shrink-0 bg-white dark:bg-obsidian-800 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-sm flex flex-col max-h-full overflow-hidden">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800/50 font-black flex justify-between items-center text-neutral-900 dark:text-pearl">
                  <span>⏳ Verify Table</span>
                  <span className="bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs">{pendingVerification.length}</span>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto bg-amber-50/20 dark:bg-obsidian-900/30 flex-1">
                  <AnimatePresence>
                    {pendingVerification.map(o => (
                      <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={o.id} className="bg-white dark:bg-obsidian-800 border border-amber-200 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between mb-3">
                          <span className="font-mono font-black text-sm text-neutral-800 dark:text-pearl">{getOrderNumber(o)}</span>
                          <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-md">{o.orderType === 'dine_in' ? 'DINE-IN' : 'PRE-ORDER'}</span>
                        </div>
                        <ul className="text-sm font-bold mb-4 bg-neutral-50 dark:bg-obsidian-900/60 p-3 rounded-lg border border-neutral-100 dark:border-neutral-700/50 space-y-1 text-neutral-700 dark:text-neutral-300">
                          {o.items.map((item, i) => <li key={i}>1x {item.name}</li>)}
                        </ul>
                        {o.verificationCode && (
                          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-4 text-center">
                            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1">Verification Code</p>
                            <p className="text-3xl font-black text-amber-700 dark:text-amber-300 tracking-[0.3em] font-mono">{o.verificationCode}</p>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">Ask the customer for this code</p>
                          </div>
                        )}
                        {o.contactName && (
                          <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 bg-neutral-50 dark:bg-obsidian-900/60 p-2 rounded-lg border border-neutral-100 dark:border-neutral-700/50">
                            📞 {o.contactName} • {o.contactPhone}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => updateOrderStatus(o.id, 'Pending')} className="flex-1 rounded-lg py-3 text-sm font-black bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm">✓ Approve</button>
                          <button onClick={() => updateOrderStatus(o.id, 'Cancelled')} className="flex-1 rounded-lg py-3 text-sm font-black bg-red-500 text-white hover:bg-red-400 transition-colors shadow-sm">✕ Reject</button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Standard Lanes */}
              {[
                { title: t('vendor.cookQueue'), data: pending, color: 'blue', bg: 'bg-white dark:bg-obsidian-800', headerBg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-900/50', action: 'Preparing', actionLabel: t('vendor.startCooking'), actionColor: 'bg-blue-600 text-white' },
                { title: t('vendor.preparing'), data: prep, color: 'orange', bg: 'bg-white dark:bg-obsidian-800', headerBg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-900/50', action: 'Ready', actionLabel: t('vendor.markReady'), actionColor: 'bg-orange-500 text-white' },
                { title: t('vendor.ready'), data: ready, color: 'emerald', bg: 'bg-white dark:bg-obsidian-800', headerBg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-900/50', action: 'Completed', actionLabel: t('vendor.completeOrder'), actionColor: 'bg-emerald-600 text-white' }
              ].map(lane => (
                <div key={lane.title} className={`w-80 shrink-0 ${lane.bg} rounded-2xl border ${lane.border} shadow-sm flex flex-col max-h-full overflow-hidden`}>
                  <div className={`p-4 ${lane.headerBg} border-b ${lane.border} font-black flex justify-between items-center text-neutral-900 dark:text-pearl`}>
                    <span>{lane.title}</span>
                    <span className={`bg-${lane.color}-200 dark:bg-${lane.color}-900/60 text-${lane.color}-800 dark:text-${lane.color}-300 px-3 py-1 rounded-full text-xs`}>{lane.data.length}</span>
                  </div>
                  <div className="p-4 space-y-4 overflow-y-auto bg-neutral-50/50 dark:bg-obsidian-900/30 flex-1">
                    <AnimatePresence>
                      {lane.data.map(o => (
                        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={o.id} className={`bg-white dark:bg-obsidian-800 border rounded-xl p-4 shadow-sm ${o.orderType === 'prepaid' ? 'border-purple-200 dark:border-purple-900/50 bg-purple-50/10 dark:bg-purple-900/10' : 'border-neutral-200 dark:border-neutral-700/50'}`}>
                          <div className="flex justify-between mb-3">
                             <span className="font-mono font-black text-sm text-neutral-800 dark:text-pearl">{getOrderNumber(o)}</span>
                             {o.orderType === 'prepaid' && <span className="text-[10px] font-black text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-md">DUE: {o.scheduledTime}</span>}
                          </div>
                          <ul className="text-sm font-bold mb-4 bg-neutral-50 dark:bg-obsidian-900/60 p-3 rounded-lg border border-neutral-100 dark:border-neutral-700/50 space-y-1 text-neutral-700 dark:text-neutral-300">
                            {o.items.map((item, i) => <li key={i}>1x {item.name}</li>)}
                          </ul>
                          {lane.title === t('vendor.ready') && o.paymentStatus === 'Unpaid' && (
                             <div className="text-xs mb-3 font-black text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center border border-red-100 dark:border-red-900/40">Collect ${o.total.toFixed(2)} Cash</div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => updateOrderStatus(o.id, lane.action)} className={`flex-[2] rounded-lg py-3 text-sm font-black transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-sm ${lane.actionColor || 'bg-neutral-100 text-neutral-800 border border-neutral-200 hover:bg-neutral-200'}`}>
                              {lane.actionLabel}
                            </button>
                            {lane.title === t('vendor.ready') && (
                              <button onClick={() => alert('Printing Receipt...')} className="flex-1 rounded-lg py-3 flex items-center justify-center bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200 transition-colors" title="Print Receipt">
                                <Printer size={18} />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {vendorTab === 'analytics' && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
              <h2 className="text-2xl font-black mb-8">{t('vendor.analytics')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-obsidian-800 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-700/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-50 dark:bg-emerald-900/20 rounded-full group-hover:scale-110 transition-transform"></div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mb-2 relative z-10">{t('vendor.grossRevenue')}</p>
                  <h3 className="text-5xl font-black text-emerald-600 relative z-10">${todayRevenue.toFixed(2)}</h3>
                </div>
                <div className="bg-white dark:bg-obsidian-800 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-700/50 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-50 dark:bg-blue-900/20 rounded-full group-hover:scale-110 transition-transform"></div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mb-2 relative z-10">{t('vendor.ordersCompleted')}</p>
                  <h3 className="text-5xl font-black text-blue-600 relative z-10">{completed.length}</h3>
                </div>
              </div>
              <div className="bg-white dark:bg-obsidian-800 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-700/50 shadow-sm">
                <h3 className="font-black text-lg border-b border-neutral-100 dark:border-neutral-700/50 pb-4 mb-4">{t('vendor.recentTransactions')}</h3>
                <div className="space-y-4">
                  {completed.slice(0, 5).map(o => (
                    <div key={o.id} className="flex justify-between items-center py-3 border-b border-neutral-50 dark:border-neutral-700/30 last:border-0 text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400 font-medium bg-neutral-100 dark:bg-obsidian-900/60 px-3 py-1 rounded-lg">{o.timestamp.split('T')[1].slice(0,5)}</span>
                      <span className="font-mono font-black text-neutral-800 dark:text-pearl">{getOrderNumber(o)}</span>
                      <span className="font-black text-lg text-neutral-800 dark:text-pearl">${o.total.toFixed(2)}</span>
                    </div>
                  ))}
                  {completed.length === 0 && <p className="text-sm font-medium text-neutral-400 dark:text-neutral-500 text-center py-4">No completed orders today.</p>}
                </div>
              </div>
            </motion.div>
          )}

          {vendorTab === 'menu' && !editingDish && (
            <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">{t('vendor.manageAssets')}</h2>
                <button onClick={() => setEditingDish({ name: '', price: '', description: '', modelUrl: '', macros: { calories: '', protein: '', carbs: '', fat: '' }, tags: [], sizes: [] })} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors">
                  <Plus size={18} /> Add Dish
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dishes.filter(d => d.restId === activeRestId).map(dish => (
                  <div key={dish.id} className="bg-white dark:bg-obsidian-800 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-700/50 flex flex-col justify-between shadow-sm group hover:shadow-md transition-shadow">
                    <div className="flex gap-5 items-start mb-6">
                      <div className="w-20 h-20 bg-neutral-100 dark:bg-obsidian-900/60 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                        <Box size={32} className="text-neutral-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg leading-tight mb-2">{dish.name}</h3>
                        <p className="text-emerald-600 font-black bg-emerald-50 dark:bg-emerald-900/20 inline-block px-3 py-1 rounded-lg">${Number(dish.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <button onClick={() => setEditingDish(dish)} className="w-full text-neutral-500 dark:text-neutral-400 font-bold hover:text-blue-600 dark:hover:text-blue-400 bg-neutral-50 dark:bg-obsidian-900/40 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-neutral-200 dark:border-neutral-700/50">
                      <Edit2 size={16} /> Edit Asset
                    </button>
                  </div>
                ))}
                {dishes.filter(d => d.restId === activeRestId).length === 0 && (
                   <p className="text-neutral-500 dark:text-neutral-400 col-span-2 text-center py-10">No dishes yet. Add one to get started.</p>
                )}
              </div>
            </motion.div>
          )}

          {vendorTab === 'menu' && editingDish && (
            <motion.div key="menu-edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">{editingDish.id ? 'Edit Dish' : 'Create New Dish'}</h2>
                <button onClick={() => { setEditingDish(null); setScanState('idle'); setProgress(0); }} className="p-2 bg-neutral-200 dark:bg-obsidian-700 rounded-full hover:bg-neutral-300 dark:hover:bg-obsidian-600 transition-colors text-neutral-700 dark:text-neutral-300"><X size={20} /></button>
              </div>

              {scanState !== 'idle' && (
                <div className={`rounded-3xl p-8 mb-8 relative overflow-hidden shadow-sm ${scanState === 'error' ? 'bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-100' : 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white'}`}>
                  {scanState !== 'complete' && scanState !== 'error' && <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-600/20 animate-pulse" />}
                  {scanState === 'error' && <div className="absolute inset-0 bg-red-500/5 dark:bg-red-800/30" />}
                  <div className="relative z-10 flex flex-col items-center justify-center py-6 text-center">
                    <h3 className={`text-xl font-black ${
                      scanState === 'complete' ? 'text-emerald-600 dark:text-emerald-400' 
                      : scanState === 'error' ? 'text-red-700 dark:text-red-300'
                      : 'text-neutral-900 dark:text-white'
                    }`}>
                      {scanState === 'error' ? 'Upload Failed' : (scanStageLabel || 'Uploading...')}
                    </h3>
                    {scanState === 'error' && (
                      <>
                        <p className="text-red-600/80 dark:text-red-300/80 text-xs mt-2 max-w-xs px-2 break-words">{scanStageLabel}</p>
                        <button type="button"
                          onClick={() => { setScanState('idle'); setProgress(0); setScanStageLabel(''); }}
                          className="mt-5 flex items-center gap-2 bg-red-100 hover:bg-red-200 dark:bg-white/10 dark:hover:bg-white/20 border border-red-200 dark:border-white/20 text-red-800 dark:text-white font-bold px-5 py-2.5 rounded-full transition-all">
                          <RefreshCw size={15} /> Try Again
                        </button>
                      </>
                    )}
                    {scanState === 'complete' && <p className="text-neutral-400 text-sm mt-1">Model attached — fill in details and publish.</p>}
                    {scanState !== 'complete' && scanState !== 'error' && (
                      <div className="w-full max-w-md bg-neutral-800 rounded-full h-2 mt-6 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.4 }}
                          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />
                      </div>
                    )}
                    {scanState !== 'complete' && scanState !== 'error' && (
                      <p className="text-neutral-500 text-xs mt-3">{Math.round(progress)}% complete</p>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                let success;
                if (editingDish.id) {
                  success = await updateDish(editingDish.id, editingDish) !== null;
                } else {
                  success = await addDish({ ...editingDish, restId: activeRestId }) !== null;
                }
                
                if (success) {
                  setEditingDish(null);
                  setScanState('idle');
                  setProgress(0);
                }
              }} className={`space-y-6 bg-white dark:bg-obsidian-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-opacity ${scanState !== 'idle' && scanState !== 'complete' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Dish Name</label>
                    <input type="text" required value={editingDish.name} onChange={e => setEditingDish({...editingDish, name: e.target.value})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Price ($)</label>
                    <input type="number" step="0.01" required value={editingDish.price} onChange={e => setEditingDish({...editingDish, price: e.target.value})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Description</label>
                  <textarea required value={editingDish.description} onChange={e => setEditingDish({...editingDish, description: e.target.value})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-xl p-3 focus:outline-none focus:border-blue-500 h-24"></textarea>
                </div>

                {/* ── Direct .GLB Upload Section ── */}
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-3 flex justify-between items-end">
                    <span className="flex items-center gap-2"><Box size={16} className="text-blue-600" /> 3D AR Model (.GLB)</span>
                    <div className="flex gap-2">
                      <input type="file" accept=".glb,.gltf" className="hidden" ref={glbInputRef} onChange={(e) => {
                        if (e.target.files[0]) uploadGlbFile(e.target.files[0]);
                      }} />
                    </div>
                  </label>

                  {/* Primary: GLB Upload Card */}
                  {scanState === 'idle' && !editingDish.modelUrl && (
                    <div
                      onClick={() => glbInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
                          uploadGlbFile(file);
                        } else {
                          showNotification("Please drop a valid .glb or .gltf file.");
                        }
                      }}
                      className="w-full border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100/60 dark:hover:bg-blue-900/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                    >
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60 rounded-2xl flex items-center justify-center mb-4 transition-colors shadow-sm">
                        <Upload size={32} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="font-black text-neutral-800 dark:text-pearl text-base mb-1">Upload .GLB File</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center max-w-xs leading-relaxed">
                        Upload your photorealistic 3D model. Drag and drop a .glb file here to let diners view it in AR.
                      </p>
                      <div className="flex items-center gap-4 mt-4">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-3 py-1 rounded-full uppercase tracking-wider">.GLB / .GLTF</span>
                        <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">or drag &amp; drop</span>
                      </div>
                    </div>
                  )}

                  {/* 3D Preview when model exists */}
                  {editingDish.modelUrl && (
                    <div className="relative">
                      <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700/50 bg-neutral-100 dark:bg-obsidian-900 h-64 relative shadow-inner">
                        <model-viewer src={editingDish.modelUrl} auto-rotate camera-controls shadow-intensity="1" style={{width: '100%', height: '100%', backgroundColor: 'transparent'}}></model-viewer>
                        <div className="absolute top-3 left-3 bg-white/90 dark:bg-obsidian-800/90 backdrop-blur-sm text-neutral-800 dark:text-pearl text-[10px] px-3 py-1 rounded-full font-black shadow-sm uppercase tracking-wider flex items-center gap-1"><Box size={10}/> 3D Preview</div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => glbInputRef.current?.click()} className="flex-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800/50">
                          <Upload size={14} /> Re-upload Model
                        </button>
                        <button type="button" onClick={() => setEditingDish({...editingDish, modelUrl: ''})} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800/50">
                          <Trash2 size={14} /> Remove Model
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700/50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-neutral-800 dark:text-pearl">Variants & Quantities (Optional)</h3>
                    <button type="button" onClick={() => setEditingDish(prev => ({ ...prev, sizes: [...(prev.sizes || []), { size: 'Regular', price: '' }] }))} className="text-sm text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 hover:underline">
                      <Plus size={14} /> Add Variant
                    </button>
                  </div>
                  {(editingDish.sizes || []).map((variant, index) => (
                    <div key={index} className="flex gap-4 mb-3 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">Size</label>
                        <select value={variant.size} onChange={e => {
                          const newSizes = [...(editingDish.sizes || [])];
                          newSizes[index].size = e.target.value;
                          setEditingDish({ ...editingDish, sizes: newSizes });
                        }} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-lg p-2 focus:outline-none focus:border-blue-500">
                          <option value="Regular">Regular</option>
                          <option value="Medium">Medium</option>
                          <option value="Large">Large</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">Price ($)</label>
                        <input type="number" step="0.01" required value={variant.price} onChange={e => {
                          const newSizes = [...(editingDish.sizes || [])];
                          newSizes[index].price = e.target.value;
                          setEditingDish({ ...editingDish, sizes: newSizes });
                        }} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-lg p-2 focus:outline-none focus:border-blue-500" />
                      </div>
                      <button type="button" onClick={() => {
                        const newSizes = editingDish.sizes.filter((_, i) => i !== index);
                        setEditingDish({ ...editingDish, sizes: newSizes });
                      }} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mb-[1px]">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700/50">
                  <h3 className="font-bold text-neutral-800 dark:text-pearl mb-4">Nutritional Macros</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">Calories (kcal)</label>
                      <input type="number" required value={editingDish.macros?.calories || ''} onChange={e => setEditingDish({...editingDish, macros: {...editingDish.macros, calories: e.target.value}})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-lg p-2 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">Protein (g)</label>
                      <input type="number" required value={parseInt(editingDish.macros?.protein || 0)} onChange={e => setEditingDish({...editingDish, macros: {...editingDish.macros, protein: e.target.value + 'g'}})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-lg p-2 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">Carbs (g)</label>
                      <input type="number" required value={parseInt(editingDish.macros?.carbs || 0)} onChange={e => setEditingDish({...editingDish, macros: {...editingDish.macros, carbs: e.target.value + 'g'}})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-lg p-2 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">Fat (g)</label>
                      <input type="number" required value={parseInt(editingDish.macros?.fat || 0)} onChange={e => setEditingDish({...editingDish, macros: {...editingDish.macros, fat: e.target.value + 'g'}})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-lg p-2 focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Allergens */}
                <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700/50">
                  <h3 className="font-bold text-neutral-800 dark:text-pearl mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Allergen Warnings</h3>
                  <div className="flex flex-wrap gap-2">
                    {ALLERGEN_OPTIONS.map(a => {
                      const active = editingDish.allergens?.includes(a);
                      return (
                        <button key={a} type="button"
                          onClick={() => setEditingDish(prev => ({ ...prev, allergens: active ? (prev.allergens||[]).filter(x=>x!==a) : [...(prev.allergens||[]), a] }))}
                          className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${
                            active ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800/50' : 'bg-neutral-50 dark:bg-obsidian-900/40 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700/50 hover:border-neutral-300 dark:hover:border-neutral-600'
                          }`}>{a}</button>
                      );
                    })}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={scanState !== 'idle' && scanState !== 'complete'}
                  className={`w-full bg-blue-600 text-white font-black py-4 rounded-xl mt-6 transition-all ${scanState !== 'idle' && scanState !== 'complete' ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50'}`}>
                  {editingDish.id ? 'Save Changes' : 'Publish Dish'}
                </button>
              </form>
            </motion.div>
          )}

          {vendorTab === 'qr' && (
            <motion.div key="qr" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 overflow-y-auto p-6">
              <div className="max-w-lg mx-auto">
                <h2 className="text-2xl font-black mb-1">{currentRestaurant?.name}</h2>
                <p className="text-sm text-neutral-500 mb-6">Generate and print QR codes for each table.</p>

                {/* Table Count Selector */}
                <div className="bg-white dark:bg-obsidian-800 border border-neutral-200 dark:border-neutral-700/50 rounded-2xl p-5 flex items-center justify-between mb-6 shadow-sm">
                  <div>
                    <p className="font-black text-neutral-800 dark:text-pearl">Number of Tables</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">One unique QR per table</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setTableCount(n => Math.max(1, n-1))}
                      className="w-9 h-9 bg-neutral-100 dark:bg-obsidian-900/60 hover:bg-neutral-200 dark:hover:bg-obsidian-700 rounded-full font-black flex items-center justify-center transition-colors text-neutral-800 dark:text-pearl">−</button>
                    <span className="font-black text-xl w-8 text-center">{tableCount}</span>
                    <button type="button" onClick={() => setTableCount(n => Math.min(50, n+1))}
                      className="w-9 h-9 bg-neutral-100 dark:bg-obsidian-900/60 hover:bg-neutral-200 dark:hover:bg-obsidian-700 rounded-full font-black flex items-center justify-center transition-colors text-neutral-800 dark:text-pearl">+</button>
                  </div>
                </div>

                {/* QR Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: tableCount }, (_, i) => (
                    <div key={i} className="bg-white dark:bg-obsidian-800 border border-neutral-200 dark:border-neutral-700/50 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                      <p className="font-black text-xs text-neutral-500 dark:text-neutral-400 mb-3 uppercase tracking-widest">Table {i + 1}</p>
                      <QRCodeSVG
                        value={`${window.location.origin}/scanner?restId=${activeRestId}&table=${i+1}`}
                        size={140}
                        level="H"
                        includeMargin={false}
                        fgColor="#171717"
                      />
                      <p className="text-[10px] text-neutral-400 mt-3 font-medium text-center break-all">
                        Table {i+1} · {currentRestaurant?.name}
                      </p>
                    </div>
                  ))}
                </div>

                <button onClick={() => window.print()}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all">
                  <Printer size={18} /> Print All {tableCount} Table QR{tableCount > 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          )}

          {vendorTab === 'staff' && (
            <motion.div key="staff" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto w-full">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-black mb-1">Employee Management</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage who has access to the POS and kitchen display.</p>
                  </div>
                  <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors">
                    <Plus size={16} /> Add Employee
                  </button>
                </div>

                <div className="bg-white dark:bg-obsidian-800 rounded-2xl border border-neutral-200 dark:border-neutral-700/50 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 dark:bg-obsidian-900/60 border-b border-neutral-200 dark:border-neutral-700/50 text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase">
                      <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">PIN Code</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/30">
                      {[
                        { name: 'Alice Johnson', role: 'Manager', pin: '****' },
                        { name: 'Bob Smith', role: 'Chef', pin: '****' },
                        { name: 'Charlie Davis', role: 'Waiter', pin: '****' }
                      ].map((staff, i) => (
                        <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-obsidian-900/40 transition-colors">
                          <td className="p-4 font-bold text-neutral-800 dark:text-pearl">{staff.name}</td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                              staff.role === 'Manager' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                              staff.role === 'Chef' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                              'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>{staff.role}</span>
                          </td>
                          <td className="p-4 font-mono text-neutral-400 dark:text-neutral-500">{staff.pin}</td>
                          <td className="p-4 flex justify-end gap-2">
                            <button className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 size={16}/></button>
                            <button className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {vendorTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto w-full">
                <h2 className="text-2xl font-black mb-1">Store Configuration</h2>
                <p className="text-sm text-neutral-500 mb-6">Update your restaurant profile and billing details.</p>

                <form onSubmit={handleSettingsSave} className="bg-white dark:bg-obsidian-800 rounded-3xl border border-neutral-200 dark:border-neutral-700/50 p-8 shadow-sm space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Restaurant Name</label>
                    <input type="text" required value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Cover Image URL</label>
                    <input type="url" value={settingsForm.cover} onChange={e => setSettingsForm({...settingsForm, cover: e.target.value})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                    {settingsForm.cover && (
                      <div className="w-full h-32 mt-3 rounded-xl bg-cover bg-center border border-neutral-200 dark:border-neutral-700/50" style={{ backgroundImage: `url(${settingsForm.cover})` }}></div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-neutral-100 dark:border-neutral-700/50">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Tax Rate (%)</label>
                      <input type="number" step="0.1" required value={settingsForm.taxRate} onChange={e => setSettingsForm({...settingsForm, taxRate: parseFloat(e.target.value)})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Accept Cash on Table</label>
                      <select value={settingsForm.acceptCash} onChange={e => setSettingsForm({...settingsForm, acceptCash: e.target.value === 'true'})} className="w-full bg-neutral-50 dark:bg-obsidian-900/60 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-pearl rounded-xl p-3 focus:outline-none focus:border-emerald-500">
                        <option value="true">Yes</option>
                        <option value="false">No (Digital Only)</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl mt-4 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all">
                    <Save size={18} /> Save Settings
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
