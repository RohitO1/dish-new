import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useAppContext } from '../context/AppContext';
import { QrCode, Zap, Sparkles, ChevronRight, Star } from 'lucide-react';

export default function ScannerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setActiveRestId, showNotification, restaurants } = useAppContext();
  const { t } = useTranslation();
  const videoRef = React.useRef(null);
  const controlsRef = React.useRef(null);
  const [hasCamera, setHasCamera] = React.useState(true);
  const [scanned, setScanned] = React.useState(false);
  const [scannedRest, setScannedRest] = React.useState(null);
  const isRescan = searchParams.get('rescan') === 'true';

  React.useEffect(() => {
    const restId = searchParams.get('restId');
    if (restId) {
      setActiveRestId(restId);
      showNotification('Table Verified! Loading Menu...');
      navigate('/menu', { replace: true });
    }
  }, [searchParams, setActiveRestId, navigate, showNotification]);

  React.useEffect(() => {
    if (scanned) return;
    const codeReader = new BrowserQRCodeReader();
    const startScan = async () => {
      try {
        const controls = await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (result && !scanned) {
            const text = result.getText();
            try {
              const url = new URL(text);
              const restId = url.searchParams.get('restId');
              if (restId) {
                if (controlsRef.current) controlsRef.current.stop();
                const rest = restaurants.find(r => r.id === restId);
                setScannedRest({ id: restId, name: rest?.name || 'Restaurant' });
                setScanned(true);
              } else {
                showNotification('Invalid Table QR Code');
              }
            } catch (e) {
              if (text.startsWith('rest-')) {
                if (controlsRef.current) controlsRef.current.stop();
                const rest = restaurants.find(r => r.id === text);
                setScannedRest({ id: text, name: rest?.name || 'Restaurant' });
                setScanned(true);
              }
            }
          }
        });
        controlsRef.current = controls;
      } catch (err) {
        console.error(err);
        setHasCamera(false);
      }
    };
    startScan();
    return () => { if (controlsRef.current) controlsRef.current.stop(); };
  }, [scanned, navigate, setActiveRestId, showNotification, restaurants]);

  const handleEnterMenu = () => {
    if (scannedRest) {
      setActiveRestId(scannedRest.id);
      navigate('/menu', { replace: true });
    }
  };

  const simulateScan = () => {
    const rest = restaurants[0];
    if (rest) {
      if (controlsRef.current) controlsRef.current.stop();
      setScannedRest({ id: rest.id, name: rest.name });
      setScanned(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col h-screen relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #1a1408 0%, #0B0C10 60%, #050508 100%)' }}
    >
      {/* Ambient gold orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-5 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />

      {/* Fine grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'1\'/%3E%3C/svg%3E")', backgroundSize: '200px' }} />

      {/* Top bar */}
      {isRescan && (
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="relative z-20 p-6 pt-14 flex items-center">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-champagne-400 text-sm font-sans font-medium hover:text-champagne-300 transition-colors">
            <ChevronRight size={16} className="rotate-180" />
            Back to Menu
          </button>
        </motion.div>
      )}

      {/* Brand header */}
      <motion.div
        initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
        className="relative z-10 text-center pt-16 pb-4 px-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-px h-6 bg-gradient-to-b from-transparent via-champagne-500 to-transparent" />
          <span className="text-champagne-500 text-xs font-sans font-semibold tracking-[0.35em] uppercase">Exclusive Dining</span>
          <div className="w-px h-6 bg-gradient-to-b from-transparent via-champagne-500 to-transparent" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-pearl mb-2">3Dish</h1>
        <p className="text-neutral-500 text-sm font-sans">Scan your table to begin the experience</p>
      </motion.div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 pb-8">
        <AnimatePresence mode="wait">
          {!scanned ? (
            <motion.div key="scanning"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center w-full">

              {/* QR Viewfinder */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.4, delay: 0.15 }}
                className="relative mb-8">

                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-[2.5rem] opacity-30 blur-xl"
                  style={{ background: 'radial-gradient(circle, #D4AF37, transparent)' }} />

                {/* Main viewfinder */}
                <div className="w-72 h-72 rounded-[2.5rem] relative overflow-hidden border border-champagne-500/20"
                  style={{ background: 'rgba(11, 12, 16, 0.8)', backdropFilter: 'blur(24px)' }}>

                  {/* Animated scan line */}
                  <motion.div
                    animate={{ top: ['5%', '95%', '5%'] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: 'linear' }}
                    className="absolute w-full h-[1px] z-20"
                    style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)', boxShadow: '0 0 20px 4px rgba(212,175,55,0.6)' }}
                  />

                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover z-10 opacity-80" playsInline muted />

                  {/* Corner brackets - champagne gold */}
                  {[
                    'top-4 left-4 border-t-2 border-l-2 rounded-tl-xl',
                    'top-4 right-4 border-t-2 border-r-2 rounded-tr-xl',
                    'bottom-4 left-4 border-b-2 border-l-2 rounded-bl-xl',
                    'bottom-4 right-4 border-b-2 border-r-2 rounded-br-xl',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-8 h-8 border-champagne-500 z-30 pointer-events-none ${cls}`} />
                  ))}

                  {/* Center QR icon placeholder */}
                  <div className="absolute inset-0 flex items-center justify-center z-5 opacity-20">
                    <QrCode size={80} className="text-champagne-400" />
                  </div>
                </div>
              </motion.div>

              {!hasCamera && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mb-4 border rounded-2xl p-4 text-center text-sm max-w-xs"
                  style={{ background: 'rgba(180, 50, 50, 0.1)', borderColor: 'rgba(180,50,50,0.3)', color: '#f87171' }}>
                  Camera unavailable. Please use the demo button below.
                </motion.div>
              )}

              {/* Demo/Simulate button */}
              <motion.button onClick={simulateScan}
                whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 font-sans font-semibold text-sm px-8 py-4 rounded-2xl transition-all border"
                style={{
                  background: 'rgba(212, 175, 55, 0.08)',
                  borderColor: 'rgba(212, 175, 55, 0.3)',
                  color: '#D4AF37',
                  boxShadow: '0 0 30px rgba(212,175,55,0.1)'
                }}>
                <Zap size={16} />
                {t('scanner.simulate', 'Demo Table Scan')}
              </motion.button>
            </motion.div>

          ) : (
            // ── Success state ──────────────────────────────────
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.35 }}
              className="flex flex-col items-center text-center px-4">

              {/* Gold success ring */}
              <div className="relative mb-8">
                <motion.div
                  initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{
                    border: '2px solid rgba(212,175,55,0.6)',
                    background: 'radial-gradient(circle, rgba(212,175,55,0.15), rgba(11,12,16,0.8))',
                    boxShadow: '0 0 60px rgba(212,175,55,0.3), inset 0 0 30px rgba(212,175,55,0.05)'
                  }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}>
                    <Sparkles size={48} className="text-champagne-500" />
                  </motion.div>
                </motion.div>
                <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="absolute inset-0 rounded-full border border-champagne-500/20" />
                <motion.div animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
                  className="absolute inset-0 rounded-full border border-champagne-500/10" />
              </div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star size={12} className="text-champagne-500 fill-champagne-500" />
                  <p className="text-champagne-500 font-sans font-semibold text-xs tracking-[0.3em] uppercase">Table Verified</p>
                  <Star size={12} className="text-champagne-500 fill-champagne-500" />
                </div>
                <h2 className="text-4xl font-serif font-bold text-pearl mb-3">{scannedRest?.name}</h2>
                <p className="text-neutral-500 text-sm font-sans mb-10 max-w-xs">
                  Your interactive 3D menu is ready. Explore dishes in stunning augmented reality.
                </p>
              </motion.div>

              <motion.button onClick={handleEnterMenu}
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                className="w-full max-w-xs font-sans font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-base"
                style={{
                  background: 'linear-gradient(135deg, #D4AF37, #AA8C2C)',
                  color: '#0B0C10',
                  boxShadow: '0 8px 40px rgba(212,175,55,0.4)'
                }}>
                Explore Menu <ChevronRight size={20} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vendor link */}
      {!scanned && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="absolute bottom-8 left-0 right-0 z-30 flex justify-center">
          <button onClick={() => navigate('/vendor-auth')}
            className="font-sans text-xs font-medium px-6 py-3 rounded-full transition-all border border-white/5 text-neutral-500 hover:text-champagne-400 hover:border-champagne-500/20"
            style={{ background: 'rgba(11,12,16,0.7)', backdropFilter: 'blur(16px)' }}>
            Restaurant Partner? <span className="text-champagne-500">Sign in →</span>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
