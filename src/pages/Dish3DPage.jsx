import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Flame, Droplets, Leaf, Heart, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';

const ALLERGEN_ICONS = { Gluten: '🌾', Nuts: '🥜', Dairy: '🥛', Eggs: '🥚', Shellfish: '🦐', Soy: '🫘' };
const TAG_COLORS   = { Vegan: 'bg-emerald-500/20 text-emerald-400', Bestseller: 'bg-amber-500/20 text-amber-400', 'High Protein': 'bg-blue-500/20 text-blue-400', 'Low Calorie': 'bg-purple-500/20 text-purple-400', Spicy: 'bg-red-500/20 text-red-400' };

export default function Dish3DPage() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const { activeRestId, dishes, addToCart, favorites, toggleFavorite } = useAppContext();
  const { t }      = useTranslation();
  const [showMicros, setShowMicros] = useState(false);
  const [arTip, setArTip]           = useState(true);

  useEffect(() => {
    if (!activeRestId) navigate('/scanner', { replace: true });
  }, [activeRestId, navigate]);

  useEffect(() => {
    if (!customElements.get('model-viewer')) {
      const s = document.createElement('script');
      s.type = 'module';
      s.src  = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      document.head.appendChild(s);
    }
  }, []);

  const dish = dishes.find(d => d.id === id);
  const isFav = favorites.includes(id);

  if (!dish) return null;

  const macroPercent = (val, max) => Math.min(100, Math.round((parseInt(val) || 0) / max * 100));

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="flex flex-col h-screen bg-black text-white relative overflow-hidden">

      {/* Top Bar */}
      <div className="absolute top-0 w-full z-20 flex justify-between items-center p-5">
        <button onClick={() => navigate('/menu')}
          className="w-12 h-12 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 shadow-lg hover:bg-white/10 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <motion.button whileTap={{ scale: 1.3 }} onClick={() => toggleFavorite(id)}
          className="w-12 h-12 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10">
          <Heart size={22} className={isFav ? 'text-red-500 fill-red-500' : 'text-white'} />
        </motion.button>
      </div>

      {/* AR Tip Banner */}
      <AnimatePresence>
        {arTip && (
          <motion.div initial={{ y: -60 }} animate={{ y: 60 }} exit={{ y: -60 }}
            className="absolute top-0 left-0 right-0 z-30 flex justify-center">
            <div className="bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold px-5 py-2 rounded-full shadow-lg flex items-center gap-2">
              <span>📱</span> Tap "View in AR" to see this dish on your table!
              <button onClick={() => setArTip(false)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Model Viewer */}
      <div className="flex-1 relative bg-gradient-to-b from-neutral-900 via-neutral-950 to-black">
        <div className="w-full h-full" dangerouslySetInnerHTML={{__html: `
          <model-viewer
            src="${dish.modelUrl}"
            ar
            ar-modes="webxr scene-viewer quick-look"
            auto-rotate
            camera-controls
            shadow-intensity="2"
            environment-image="neutral"
            exposure="1.2"
            style="width: 100%; height: 100%; --poster-color: transparent;"
          >
            <button slot="ar-button" style="
              position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%);
              background: linear-gradient(135deg, #2563eb, #4f46e5);
              color: white; border: none; border-radius: 9999px; padding: 14px 30px;
              font-weight: 900; font-family: inherit; font-size: 15px;
              box-shadow: 0 4px 24px rgba(37,99,235,0.5); cursor: pointer;">
              📱 ${t('dish.viewInAr')}
            </button>
          </model-viewer>
        `}} />
      </div>

      {/* Info Panel */}
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 20 }}
        className="bg-neutral-900/95 backdrop-blur-2xl rounded-t-[2.5rem] px-6 pt-5 pb-8 relative z-30 border-t border-neutral-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] max-h-[55vh] overflow-y-auto">

        <div className="w-10 h-1.5 bg-neutral-700 rounded-full mx-auto mb-4" />

        {/* Name + Price */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-black leading-tight mb-2">{dish.name}</h2>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {dish.tags?.map(tag => (
                <span key={tag} className={`text-[11px] font-black px-2.5 py-1 rounded-full ${TAG_COLORS[tag] || 'bg-neutral-700 text-neutral-300'}`}>{tag}</span>
              ))}
              {dish.allergens?.map(a => (
                <span key={a} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 flex items-center gap-1">
                  <AlertTriangle size={10} /> {ALLERGEN_ICONS[a] || ''} {a}
                </span>
              ))}
            </div>
          </div>
          <p className="text-blue-400 font-black text-xl bg-blue-900/20 px-4 py-2 rounded-2xl border border-blue-900/50 shrink-0">
            ${Number(dish.price).toFixed(2)}
          </p>
        </div>

        <p className="text-sm text-neutral-400 mb-5 leading-relaxed">{dish.description}</p>

        {/* Macro Bars */}
        <div className="space-y-2 mb-4">
          {[
            { label: 'Calories', value: dish.macros?.calories, unit: 'kcal', max: 800, color: 'bg-orange-500', icon: <Flame size={14} className="text-orange-500" /> },
            { label: 'Protein',  value: parseInt(dish.macros?.protein), unit: 'g', max: 60,  color: 'bg-blue-500',    icon: <Droplets size={14} className="text-blue-400" /> },
            { label: 'Carbs',    value: parseInt(dish.macros?.carbs),   unit: 'g', max: 100, color: 'bg-emerald-500', icon: <Leaf size={14} className="text-emerald-500" /> },
            { label: 'Fat',      value: parseInt(dish.macros?.fat),     unit: 'g', max: 50,  color: 'bg-amber-500',   icon: <span className="text-amber-400 text-xs font-black">F</span> },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-3">
              <div className="w-5 flex justify-center">{m.icon}</div>
              <span className="text-xs font-bold text-neutral-400 w-14">{m.label}</span>
              <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${macroPercent(m.value, m.max)}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${m.color}`} />
              </div>
              <span className="text-xs font-black text-neutral-300 w-16 text-right">{m.value || 0} {m.unit}</span>
            </div>
          ))}
        </div>

        {/* Micros Expandable */}
        {dish.micros && (
          <div className="mb-5">
            <button onClick={() => setShowMicros(v => !v)}
              className="flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-neutral-300 transition-colors w-full">
              {showMicros ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showMicros ? 'Hide' : 'Show'} Micronutrients
            </button>
            <AnimatePresence>
              {showMicros && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 grid grid-cols-4 gap-2">
                  {Object.entries(dish.micros).map(([key, val]) => (
                    <div key={key} className="bg-neutral-800/60 rounded-xl p-2 text-center border border-neutral-700/50">
                      <span className="text-emerald-400 font-black text-sm block">{val}</span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wide">{key}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Ingredients */}
        {dish.ingredients?.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {dish.ingredients.map(ing => (
              <span key={ing} className="text-[11px] bg-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full border border-neutral-700">{ing}</span>
            ))}
          </div>
        )}

        {/* Add to Cart */}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { addToCart(dish); navigate(-1); }}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-3 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
          <ShoppingCart size={20} /> {t('dish.addToOrder')}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
