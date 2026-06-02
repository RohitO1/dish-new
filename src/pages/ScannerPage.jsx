import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useAppContext } from '../context/AppContext';
import { QrCode, Zap, Store, ChevronRight } from 'lucide-react';

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
  // Whether this is a "re-scan" from the menu (keeps other data)
  const isRescan = searchParams.get('rescan') === 'true';

  // If the page was opened via a scanned QR link (e.g. /scanner?restId=rest-001), auto-route
  React.useEffect(() => {
    const restId = searchParams.get('restId');
    if (restId) {
      setActiveRestId(restId);
      showNotification('Table Verified! Loading Menu...');
      navigate('/menu', { replace: true });
    }
  }, [searchParams, setActiveRestId, navigate, showNotification]);

  React.useEffect(() => {
    if (scanned) return; // Stop re-initializing after scan
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
    
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, [scanned, navigate, setActiveRestId, showNotification, restaurants]);

  const handleEnterMenu = () => {
    if (scannedRest) {
      setActiveRestId(scannedRest.id);
      navigate('/menu', { replace: true });
    }
  };

  const simulateScan = () => {
    // Use first available restaurant for demo
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
      className="flex flex-col h-screen bg-black text-white relative overflow-hidden"
    >
      {/* Blurred background */}
      <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center blur-md scale-105" />

      {/* Top bar — only show back button on re-scan */}
      {isRescan && (
        <div className="relative z-20 p-6 pt-14">
          <button onClick={() => navigate(-1)}
            className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-white/20 transition-colors">
            ← Back to Menu
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 p-6">
        <AnimatePresence mode="wait">
          {!scanned ? (
            <motion.div key="scanning" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center w-full">

              {/* Header */}
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                className="text-center mb-8">
                <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <QrCode size={28} className="text-blue-400" />
                </div>
                <h2 className="text-3xl font-black mb-2">{t('scanner.title')}</h2>
                <p className="text-neutral-400 text-sm">Point your camera at the QR code on the table.</p>
              </motion.div>

              {/* Viewfinder */}
              <motion.div
                initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}
                className="w-72 h-72 border-2 border-white/30 rounded-[2.5rem] relative mb-8 overflow-hidden backdrop-blur-sm bg-black/20 shadow-[0_0_80px_rgba(59,130,246,0.15)]">
                {/* Scan line */}
                <motion.div
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                  className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_20px_rgba(59,130,246,1)] z-20"
                />
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover z-10" playsInline muted />
                {/* Corner brackets */}
                {[['top-3 left-3 border-t-2 border-l-2 rounded-tl-2xl'],
                  ['top-3 right-3 border-t-2 border-r-2 rounded-tr-2xl'],
                  ['bottom-3 left-3 border-b-2 border-l-2 rounded-bl-2xl'],
                  ['bottom-3 right-3 border-b-2 border-r-2 rounded-br-2xl']].map(([cls], i) => (
                  <div key={i} className={`absolute w-8 h-8 border-blue-400 z-30 pointer-events-none ${cls}`} />
                ))}
              </motion.div>

              {!hasCamera && (
                <div className="mb-4 bg-red-900/20 border border-red-800/50 rounded-2xl p-4 text-center text-sm text-red-400 max-w-xs">
                  Camera unavailable. Use the demo button below.
                </div>
              )}

              {/* Demo Scan Button */}
              <motion.button onClick={simulateScan}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 backdrop-blur-md text-blue-400 font-bold px-6 py-3 rounded-2xl hover:bg-blue-600/30 transition-colors text-sm">
                <Zap size={16} /> {t('scanner.simulate', 'Demo Scan')}
              </motion.button>
            </motion.div>
          ) : (
            // Success State
            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', bounce: 0.4 }}
              className="flex flex-col items-center text-center px-4">

              {/* Success ring */}
              <div className="relative mb-8">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.6, delay: 0.1 }}
                  className="w-28 h-28 rounded-full bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_60px_rgba(16,185,129,0.4)]">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}>
                    <Store size={48} className="text-emerald-400" />
                  </motion.div>
                </motion.div>
                {/* Pulse rings */}
                <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-full border-2 border-emerald-500/30" />
              </div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <p className="text-emerald-400 font-bold text-sm mb-2 uppercase tracking-widest">✓ Table Verified</p>
                <h2 className="text-3xl font-black mb-2">{scannedRest?.name}</h2>
                <p className="text-neutral-400 text-sm mb-10">Your AR menu is ready. Tap below to explore.</p>
              </motion.div>

              <motion.button onClick={handleEnterMenu}
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="w-full max-w-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black py-5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center gap-3 text-lg">
                Enter {scannedRest?.name} <ChevronRight size={22} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vendor Login Link */}
      {!scanned && (
        <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center pb-safe">
          <button onClick={() => navigate('/vendor-auth')} 
            className="bg-black/50 backdrop-blur-md border border-white/10 text-neutral-300 hover:text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all hover:bg-black/70 shadow-lg flex items-center gap-2">
            Restaurant Partner? <span className="text-emerald-400">Sign in here</span>
          </button>
        </div>
      )}

      {/* NO BottomNav here — scanner is a gate, not a tab */}
    </motion.div>
  );
}
