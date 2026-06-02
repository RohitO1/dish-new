import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, TrendingUp, Utensils, QrCode as QrIcon, Box, Edit2, Plus, X, Camera, Upload, Sparkles, Loader2, CheckCircle2, Printer, AlertTriangle, LogOut, Store, Settings, Users, Save, Trash2, XCircle, RefreshCw, Video, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../services/supabase';
import { generateModelFromImage, generateModelFromVideo } from '../services/tripo';

export default function VendorDashboardPage() {
  const navigate = useNavigate();
  const { orders, activeRestId, vendorTab, setVendorTab, updateOrderStatus, dishes, restaurants, addDish, updateDish, user, setUser, updateRestaurant, supabaseUser, setActiveRestId, isInitializing } = useAppContext();
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
  const videoInputRef  = React.useRef(null);
  const dishCameraRef  = React.useRef(null);
  const [cameraOpen, setCameraOpen]     = React.useState(false);
  const [cameraStream, setCameraStream] = React.useState(null);
  const [isCameraStarting, setIsCameraStarting] = React.useState(false);

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

  // Stage labels shared between image and video pipelines
  const STAGE_LABELS = {
    extracting: 'Extracting keyframes from video...',
    queued:     'Queued on Tripo servers...',
    uploading:  'Uploading frames to AI...',
    running:    'Generating 3D model...',
    texturing:  'Applying photorealistic textures...',
    downloading:'Downloading model to cloud...',
    success:    '3D AR Model ready!',
  };

  // Shared handler that finalizes a GLB result from any pipeline
  const finalizeGlbResult = React.useCallback(async (glbResult) => {
    let finalUrl = glbResult;

    // If it's an actual File, upload to Supabase Storage for a public URL
    if (glbResult instanceof File) {
      setScanState('uploading');
      setScanStageLabel('Saving model to Supabase Cloud...');
      finalUrl = await uploadGlbFile(glbResult, false); // Do not hide state!
      
      if (!finalUrl) {
        // Upload failed (scanState already set to error by uploadGlbFile)
        return;
      }
    }

    setScanState('complete');
    setProgress(100);
    setScanStageLabel('3D AR Model Generated!');

    // AI Auto-Fill if fields are still empty
    setEditingDish(prev => {
      if (!prev) return prev;
      const autoTags = prev.tags?.length ? prev.tags : ['High Protein', 'Gluten Free', 'AI Generated'];
      const autoMacros = (prev.macros && prev.macros.calories) ? prev.macros : { calories: '350', protein: '25g', carbs: '15g', fat: '12g' };
      const autoDesc = prev.description ? prev.description : "A visually stunning dish, reconstructed beautifully using Tripo3D API's AI model generator.";
      return { ...prev, modelUrl: finalUrl, description: autoDesc, macros: autoMacros, tags: autoTags };
    });
  }, []);

  // Single-image pipeline (Scan Dish / camera capture)
  const startAiProcessing = React.useCallback(async (imageFile = null) => {
    setScanState('uploading');
    setScanStageLabel('Uploading image...');
    setProgress(5);
    try {
      const glbResult = await generateModelFromImage(imageFile, (pct, stage) => {
        setProgress(pct);
        setScanStageLabel(STAGE_LABELS[stage] || stage);
        if (pct < 100) setScanState(stage === 'queued' ? 'uploading'
          : stage === 'running' ? 'processing'
          : stage === 'texturing' ? 'texturing'
          : stage === 'downloading' ? 'processing'
          : 'scanning');
      });
      await finalizeGlbResult(glbResult);
    } catch (err) {
      const msg = err?.message || 'Unknown error';
      console.error('[AI 3D Image] Error:', err);
      setScanState('error');
      setProgress(0);
      setScanStageLabel(msg);
    }
  }, [finalizeGlbResult]);

  // Video pipeline — the primary flow
  const startVideoProcessing = React.useCallback(async (videoFile) => {
    setScanState('scanning');
    setScanStageLabel('Extracting keyframes from video...');
    setProgress(2);
    try {
      const glbResult = await generateModelFromVideo(videoFile, (pct, stage) => {
        setProgress(pct);
        setScanStageLabel(STAGE_LABELS[stage] || stage);
        if (pct < 100) setScanState(
          stage === 'extracting' ? 'scanning'
          : stage === 'queued' ? 'uploading'
          : stage === 'uploading' ? 'uploading'
          : stage === 'running' ? 'processing'
          : stage === 'texturing' ? 'texturing'
          : stage === 'downloading' ? 'processing'
          : 'scanning'
        );
      });
      await finalizeGlbResult(glbResult);
    } catch (err) {
      const msg = err?.message || 'Unknown error';
      console.error('[AI 3D Video] Error:', err);
      setScanState('error');
      setProgress(0);
      setScanStageLabel(msg);
    }
  }, [finalizeGlbResult]);

  const openDishCamera = async () => {
    setIsCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setCameraStream(stream);
      setCameraOpen(true);
      setTimeout(() => {
        if (dishCameraRef.current) dishCameraRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      fileInputRef.current?.click();
    } finally {
      setIsCameraStarting(false);
    }
  };

  const captureDishFrame = () => {
    // Capture current frame as a Blob then run AI
    if (dishCameraRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width  = dishCameraRef.current.videoWidth  || 640;
      canvas.height = dishCameraRef.current.videoHeight || 480;
      canvas.getContext('2d').drawImage(dishCameraRef.current, 0, 0);
      canvas.toBlob(blob => {
        if (blob) startAiProcessing(new File([blob], 'dish-capture.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    } else {
      startAiProcessing(null);
    }
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraOpen(false);
  };

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
        setScanState('complete');
        setScanStageLabel('3D Model Uploaded Successfully!');
        setProgress(100);
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
    <div className="flex flex-col h-screen bg-neutral-100 text-neutral-900 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex justify-between items-center border-b z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-500/30">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="font-black text-xl leading-tight flex items-center gap-2">
              <Store size={16} className="text-emerald-600" />
              {currentRestaurant?.name || user?.displayName || 'Vendor OS'}
            </h1>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>{user?.email || t('vendor.cloudSynced')}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors flex items-center gap-2">
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b border-neutral-200 shrink-0 overflow-x-auto no-scrollbar shadow-sm z-0">
        <button onClick={() => setVendorTab('orders')} className={`px-6 py-4 text-sm font-black flex items-center gap-2 border-b-[3px] whitespace-nowrap transition-colors ${vendorTab === 'orders' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}`}><ListOrdered size={18}/> {t('vendor.kitchenDisplay')}</button>
        <button onClick={() => setVendorTab('analytics')} className={`px-6 py-4 text-sm font-black flex items-center gap-2 border-b-[3px] whitespace-nowrap transition-colors ${vendorTab === 'analytics' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}`}><TrendingUp size={18}/> {t('vendor.analytics')}</button>
        <button onClick={() => setVendorTab('menu')} className={`px-6 py-4 text-sm font-black flex items-center gap-2 border-b-[3px] whitespace-nowrap transition-colors ${vendorTab === 'menu' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}`}><Utensils size={18}/> {t('vendor.menu3D')}</button>
        <button onClick={() => setVendorTab('qr')} className={`px-6 py-4 text-sm font-black flex items-center gap-2 border-b-[3px] whitespace-nowrap transition-colors ${vendorTab === 'qr' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}`}><QrIcon size={18}/> {t('vendor.qr')}</button>
        <button onClick={() => setVendorTab('staff')} className={`px-6 py-4 text-sm font-black flex items-center gap-2 border-b-[3px] whitespace-nowrap transition-colors ${vendorTab === 'staff' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}`}><Users size={18}/> Staff</button>
        <button onClick={() => setVendorTab('settings')} className={`px-6 py-4 text-sm font-black flex items-center gap-2 border-b-[3px] whitespace-nowrap transition-colors ${vendorTab === 'settings' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-neutral-500 hover:bg-neutral-50'}`}><Settings size={18}/> Settings</button>
      </div>

      <div className="flex-1 overflow-hidden relative bg-neutral-50">
        <AnimatePresence mode="wait">
          {vendorTab === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-x-auto p-6 flex gap-6 items-start">
              
              {/* Pending Verification Lane (special) */}
              <div className="w-80 shrink-0 bg-white rounded-2xl border border-amber-200 shadow-sm flex flex-col max-h-full overflow-hidden">
                <div className="p-4 bg-amber-50 border-b border-amber-200 font-black flex justify-between items-center">
                  <span>⏳ Verify Table</span>
                  <span className="bg-amber-200 text-amber-800 px-3 py-1 rounded-full text-xs">{pendingVerification.length}</span>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto bg-amber-50/20 flex-1">
                  <AnimatePresence>
                    {pendingVerification.map(o => (
                      <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={o.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
                        <div className="flex justify-between mb-3">
                          <span className="font-mono font-black text-sm text-neutral-800">{getOrderNumber(o)}</span>
                          <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">{o.orderType === 'dine_in' ? 'DINE-IN' : 'PRE-ORDER'}</span>
                        </div>
                        <ul className="text-sm font-bold mb-4 bg-neutral-50 p-3 rounded-lg border border-neutral-100 space-y-1 text-neutral-700">
                          {o.items.map((item, i) => <li key={i}>1x {item.name}</li>)}
                        </ul>
                        {o.verificationCode && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-center">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Verification Code</p>
                            <p className="text-3xl font-black text-amber-700 tracking-[0.3em] font-mono">{o.verificationCode}</p>
                            <p className="text-[10px] text-neutral-500 mt-1">Ask the customer for this code</p>
                          </div>
                        )}
                        {o.contactName && (
                          <div className="text-xs text-neutral-500 mb-3 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
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
                { title: t('vendor.cookQueue'), data: pending, color: 'blue', bg: 'bg-white', headerBg: 'bg-blue-50', border: 'border-blue-200', action: 'Preparing', actionLabel: t('vendor.startCooking'), actionColor: 'bg-blue-600 text-white' },
                { title: t('vendor.preparing'), data: prep, color: 'orange', bg: 'bg-white', headerBg: 'bg-orange-50', border: 'border-orange-200', action: 'Ready', actionLabel: t('vendor.markReady'), actionColor: 'bg-orange-500 text-white' },
                { title: t('vendor.ready'), data: ready, color: 'emerald', bg: 'bg-white', headerBg: 'bg-emerald-50', border: 'border-emerald-200', action: 'Completed', actionLabel: t('vendor.completeOrder'), actionColor: 'bg-emerald-600 text-white' }
              ].map(lane => (
                <div key={lane.title} className={`w-80 shrink-0 ${lane.bg} rounded-2xl border ${lane.border} shadow-sm flex flex-col max-h-full overflow-hidden`}>
                  <div className={`p-4 ${lane.headerBg} border-b ${lane.border} font-black flex justify-between items-center`}>
                    <span>{lane.title}</span>
                    <span className={`bg-${lane.color}-200 text-${lane.color}-800 px-3 py-1 rounded-full text-xs`}>{lane.data.length}</span>
                  </div>
                  <div className="p-4 space-y-4 overflow-y-auto bg-neutral-50/50 flex-1">
                    <AnimatePresence>
                      {lane.data.map(o => (
                        <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={o.id} className={`bg-white border rounded-xl p-4 shadow-sm ${o.orderType === 'prepaid' ? 'border-purple-200 bg-purple-50/10' : 'border-neutral-200'}`}>
                          <div className="flex justify-between mb-3">
                             <span className="font-mono font-black text-sm text-neutral-800">{getOrderNumber(o)}</span>
                             {o.orderType === 'prepaid' && <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">DUE: {o.scheduledTime}</span>}
                          </div>
                          <ul className="text-sm font-bold mb-4 bg-neutral-50 p-3 rounded-lg border border-neutral-100 space-y-1 text-neutral-700">
                            {o.items.map((item, i) => <li key={i}>1x {item.name}</li>)}
                          </ul>
                          {lane.title === t('vendor.ready') && o.paymentStatus === 'Unpaid' && (
                             <div className="text-xs mb-3 font-black text-red-500 bg-red-50 p-2 rounded-lg text-center border border-red-100">Collect ${o.total.toFixed(2)} Cash</div>
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
                <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
                  <p className="text-sm text-neutral-500 font-bold mb-2 relative z-10">{t('vendor.grossRevenue')}</p>
                  <h3 className="text-5xl font-black text-emerald-600 relative z-10">${todayRevenue.toFixed(2)}</h3>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
                  <p className="text-sm text-neutral-500 font-bold mb-2 relative z-10">{t('vendor.ordersCompleted')}</p>
                  <h3 className="text-5xl font-black text-blue-600 relative z-10">{completed.length}</h3>
                </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
                <h3 className="font-black text-lg border-b border-neutral-100 pb-4 mb-4">{t('vendor.recentTransactions')}</h3>
                <div className="space-y-4">
                  {completed.slice(0, 5).map(o => (
                    <div key={o.id} className="flex justify-between items-center py-3 border-b border-neutral-50 last:border-0 text-sm">
                      <span className="text-neutral-500 font-medium bg-neutral-100 px-3 py-1 rounded-lg">{o.timestamp.split('T')[1].slice(0,5)}</span>
                      <span className="font-mono font-black text-neutral-800">{getOrderNumber(o)}</span>
                      <span className="font-black text-lg text-neutral-800">${o.total.toFixed(2)}</span>
                    </div>
                  ))}
                  {completed.length === 0 && <p className="text-sm font-medium text-neutral-400 text-center py-4">No completed orders today.</p>}
                </div>
              </div>
            </motion.div>
          )}

          {vendorTab === 'menu' && !editingDish && (
            <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">{t('vendor.manageAssets')}</h2>
                <button onClick={() => setEditingDish({ name: '', price: '', description: '', modelUrl: '', macros: { calories: '', protein: '', carbs: '', fat: '' }, tags: [] })} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors">
                  <Plus size={18} /> Add Dish
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {dishes.filter(d => d.restId === activeRestId).map(dish => (
                  <div key={dish.id} className="bg-white p-6 rounded-3xl border border-neutral-200 flex flex-col justify-between shadow-sm group hover:shadow-md transition-shadow">
                    <div className="flex gap-5 items-start mb-6">
                      <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                        <Box size={32} className="text-neutral-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg leading-tight mb-2">{dish.name}</h3>
                        <p className="text-emerald-600 font-black bg-emerald-50 inline-block px-3 py-1 rounded-lg">${Number(dish.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <button onClick={() => setEditingDish(dish)} className="w-full text-neutral-500 font-bold hover:text-blue-600 bg-neutral-50 hover:bg-blue-50 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
                      <Edit2 size={16} /> Edit Asset
                    </button>
                  </div>
                ))}
                {dishes.filter(d => d.restId === activeRestId).length === 0 && (
                   <p className="text-neutral-500 col-span-2 text-center py-10">No dishes yet. Add one to get started.</p>
                )}
              </div>
            </motion.div>
          )}

          {vendorTab === 'menu' && editingDish && (
            <motion.div key="menu-edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-0 overflow-y-auto p-8 max-w-3xl mx-auto w-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">{editingDish.id ? 'Edit Dish' : 'Create New Dish'}</h2>
                <button onClick={() => { setEditingDish(null); setScanState('idle'); setProgress(0); if(cameraStream) cameraStream.getTracks().forEach(t=>t.stop()); setCameraOpen(false); }} className="p-2 bg-neutral-200 rounded-full hover:bg-neutral-300 transition-colors"><X size={20} /></button>
              </div>

              {/* Live Camera Capture Overlay */}
              {cameraOpen && (
                <div className="bg-black rounded-3xl overflow-hidden mb-8 relative shadow-2xl">
                  <video ref={dishCameraRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-6 gap-3">
                    <p className="text-white text-sm font-bold bg-black/50 px-4 py-2 rounded-full">Position dish in frame, then capture</p>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => { cameraStream?.getTracks().forEach(t=>t.stop()); setCameraStream(null); setCameraOpen(false); }} className="bg-white/20 text-white font-bold px-6 py-3 rounded-full">
                        Cancel
                      </button>
                      <button type="button" onClick={captureDishFrame} className="bg-white text-neutral-900 font-black px-8 py-3 rounded-full shadow-lg">
                        ✦ Capture & Generate 3D
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {scanState !== 'idle' && (
                <div className={`rounded-3xl p-8 mb-8 text-white relative overflow-hidden shadow-2xl ${scanState === 'error' ? 'bg-red-900' : 'bg-neutral-900'}`}>
                  {scanState !== 'complete' && scanState !== 'error' && <div className="absolute inset-0 bg-blue-600/20 animate-pulse" />}
                  {scanState === 'error' && <div className="absolute inset-0 bg-red-800/30" />}
                  <div className="relative z-10 flex flex-col items-center justify-center py-6 text-center">
                    {scanState === 'uploading'  && <Upload  className="mb-4 text-blue-400 animate-bounce" size={40} />}
                    {scanState === 'scanning'   && <Camera  className="mb-4 text-purple-400" size={40} />}
                    {scanState === 'processing' && <Loader2 className="mb-4 text-emerald-400 animate-spin" size={40} />}
                    {scanState === 'texturing'  && <Sparkles className="mb-4 text-amber-400" size={40} />}
                    {scanState === 'complete'   && <CheckCircle2 className="mb-4 text-emerald-500" size={48} />}
                    {scanState === 'error'      && <XCircle className="mb-4 text-red-400" size={48} />}
                    <h3 className={`text-xl font-black ${
                      scanState === 'complete' ? 'text-emerald-400' 
                      : scanState === 'error' ? 'text-red-300'
                      : 'text-white'
                    }`}>
                      {scanState === 'error' ? '3D Generation Failed' : (scanStageLabel || 'Processing...')}
                    </h3>
                    {scanState === 'error' && (
                      <>
                        <p className="text-red-300/80 text-xs mt-2 max-w-xs px-2 break-words">{scanStageLabel}</p>
                        <button type="button"
                          onClick={() => { setScanState('idle'); setProgress(0); setScanStageLabel(''); }}
                          className="mt-5 flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-5 py-2.5 rounded-full transition-all">
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
              }} className={`space-y-6 bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm transition-opacity ${scanState !== 'idle' && scanState !== 'complete' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Dish Name</label>
                    <input type="text" required value={editingDish.name} onChange={e => setEditingDish({...editingDish, name: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Price ($)</label>
                    <input type="number" step="0.01" required value={editingDish.price} onChange={e => setEditingDish({...editingDish, price: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Description</label>
                  <textarea required value={editingDish.description} onChange={e => setEditingDish({...editingDish, description: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 h-24"></textarea>
                </div>

                {/* ── Video Upload → 3D Model Section ── */}
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-3 flex justify-between items-end">
                    <span className="flex items-center gap-2"><Film size={16} className="text-blue-600" /> Generate 3D AR Model</span>
                    <div className="flex gap-2">
                      {/* Hidden inputs */}
                      <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={(e) => {
                        if (e.target.files[0]) startVideoProcessing(e.target.files[0]);
                      }} />
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
                        if (e.target.files[0]) startAiProcessing(e.target.files[0]);
                      }} />
                      <input type="file" accept=".glb,.gltf" className="hidden" ref={glbInputRef} onChange={(e) => {
                        if (e.target.files[0]) uploadGlbFile(e.target.files[0]);
                      }} />
                      {/* Scan Dish camera fallback (single image) */}
                      <button type="button" onClick={openDishCamera} disabled={isCameraStarting} className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50">
                        {isCameraStarting ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} {isCameraStarting ? 'Opening...' : 'Scan Dish'}
                      </button>
                    </div>
                  </label>

                  {/* Primary: Video Upload Card */}
                  {scanState === 'idle' && !editingDish.modelUrl && (
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith('video/')) startVideoProcessing(file);
                      }}
                      className="w-full border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-100/60 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group"
                    >
                      <div className="w-16 h-16 bg-blue-100 group-hover:bg-blue-200 rounded-2xl flex items-center justify-center mb-4 transition-colors shadow-sm">
                        <Video size={32} className="text-blue-600" />
                      </div>
                      <p className="font-black text-neutral-800 text-base mb-1">Upload Dish Video</p>
                      <p className="text-xs text-neutral-500 text-center max-w-xs leading-relaxed">
                        Record a short video rotating around the dish. We'll extract frames and build a photorealistic 3D AR model automatically.
                      </p>
                      <div className="flex items-center gap-4 mt-4">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wider">MP4 · MOV · WebM</span>
                        <span className="text-[10px] font-bold text-neutral-400">or drag & drop</span>
                      </div>
                    </div>
                  )}

                  {/* 3D Preview when model exists */}
                  {editingDish.modelUrl && (
                    <div className="relative">
                      <div className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 h-64 relative shadow-inner">
                        <model-viewer src={editingDish.modelUrl} auto-rotate camera-controls shadow-intensity="1" style={{width: '100%', height: '100%', backgroundColor: 'transparent'}}></model-viewer>
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-neutral-800 text-[10px] px-3 py-1 rounded-full font-black shadow-sm uppercase tracking-wider flex items-center gap-1"><Box size={10}/> 3D Preview</div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => videoInputRef.current?.click()} className="flex-1 text-xs bg-blue-50 text-blue-700 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors border border-blue-200">
                          <Video size={14} /> Re-upload Video
                        </button>
                        <button type="button" onClick={() => setEditingDish({...editingDish, modelUrl: ''})} className="text-xs bg-red-50 text-red-600 font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors border border-red-200">
                          <Trash2 size={14} /> Remove Model
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-100">
                  <h3 className="font-bold text-neutral-800 mb-4">Nutritional Macros</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Calories (kcal)</label>
                      <input type="number" required value={editingDish.macros?.calories || ''} onChange={e => setEditingDish({...editingDish, macros: {...editingDish.macros, calories: e.target.value}})} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Protein (g)</label>
                      <input type="number" required value={parseInt(editingDish.macros?.protein || 0)} onChange={e => setEditingDish({...editingDish, macros: {...editingDish.macros, protein: e.target.value + 'g'}})} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Carbs (g)</label>
                      <input type="number" required value={parseInt(editingDish.macros?.carbs || 0)} onChange={e => setEditingDish({...editingDish, macros: {...editingDish.macros, carbs: e.target.value + 'g'}})} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 mb-1">Fat (g)</label>
                      <input type="number" required value={parseInt(editingDish.macros?.fat || 0)} onChange={e => setEditingDish({...editingDish, macros: {...editingDish.macros, fat: e.target.value + 'g'}})} className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Allergens */}
                <div className="pt-4 border-t border-neutral-100">
                  <h3 className="font-bold text-neutral-800 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Allergen Warnings</h3>
                  <div className="flex flex-wrap gap-2">
                    {ALLERGEN_OPTIONS.map(a => {
                      const active = editingDish.allergens?.includes(a);
                      return (
                        <button key={a} type="button"
                          onClick={() => setEditingDish(prev => ({ ...prev, allergens: active ? (prev.allergens||[]).filter(x=>x!==a) : [...(prev.allergens||[]), a] }))}
                          className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-all ${
                            active ? 'bg-red-100 text-red-700 border-red-300' : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:border-neutral-300'
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
                <div className="bg-white border border-neutral-200 rounded-2xl p-5 flex items-center justify-between mb-6 shadow-sm">
                  <div>
                    <p className="font-black text-neutral-800">Number of Tables</p>
                    <p className="text-xs text-neutral-500 mt-0.5">One unique QR per table</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setTableCount(n => Math.max(1, n-1))}
                      className="w-9 h-9 bg-neutral-100 hover:bg-neutral-200 rounded-full font-black flex items-center justify-center transition-colors">−</button>
                    <span className="font-black text-xl w-8 text-center">{tableCount}</span>
                    <button type="button" onClick={() => setTableCount(n => Math.min(50, n+1))}
                      className="w-9 h-9 bg-neutral-100 hover:bg-neutral-200 rounded-full font-black flex items-center justify-center transition-colors">+</button>
                  </div>
                </div>

                {/* QR Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: tableCount }, (_, i) => (
                    <div key={i} className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col items-center shadow-sm">
                      <p className="font-black text-xs text-neutral-500 mb-3 uppercase tracking-widest">Table {i + 1}</p>
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
                    <p className="text-sm text-neutral-500">Manage who has access to the POS and kitchen display.</p>
                  </div>
                  <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors">
                    <Plus size={16} /> Add Employee
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase">
                      <tr>
                        <th className="p-4">Name</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">PIN Code</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {[
                        { name: 'Alice Johnson', role: 'Manager', pin: '****' },
                        { name: 'Bob Smith', role: 'Chef', pin: '****' },
                        { name: 'Charlie Davis', role: 'Waiter', pin: '****' }
                      ].map((staff, i) => (
                        <tr key={i} className="hover:bg-neutral-50 transition-colors">
                          <td className="p-4 font-bold text-neutral-800">{staff.name}</td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                              staff.role === 'Manager' ? 'bg-purple-100 text-purple-700' :
                              staff.role === 'Chef' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>{staff.role}</span>
                          </td>
                          <td className="p-4 font-mono text-neutral-400">{staff.pin}</td>
                          <td className="p-4 flex justify-end gap-2">
                            <button className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                            <button className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
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

                <form onSubmit={handleSettingsSave} className="bg-white rounded-3xl border border-neutral-200 p-8 shadow-sm space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Restaurant Name</label>
                    <input type="text" required value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">Cover Image URL</label>
                    <input type="url" value={settingsForm.cover} onChange={e => setSettingsForm({...settingsForm, cover: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                    {settingsForm.cover && (
                      <div className="w-full h-32 mt-3 rounded-xl bg-cover bg-center border border-neutral-200" style={{ backgroundImage: `url(${settingsForm.cover})` }}></div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-neutral-100">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Tax Rate (%)</label>
                      <input type="number" step="0.1" required value={settingsForm.taxRate} onChange={e => setSettingsForm({...settingsForm, taxRate: parseFloat(e.target.value)})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Accept Cash on Table</label>
                      <select value={settingsForm.acceptCash} onChange={e => setSettingsForm({...settingsForm, acceptCash: e.target.value === 'true'})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-emerald-500">
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
