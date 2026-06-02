import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Flame, Droplets, Leaf, Heart, ChevronDown, ChevronUp, AlertTriangle, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';

const ALLERGEN_ICONS = { Gluten: '🌾', Nuts: '🥜', Dairy: '🥛', Eggs: '🥚', Shellfish: '🦐', Soy: '🫘' };

const TAG_COLORS = {
  Vegan:         { bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  color: '#34D399' },
  Bestseller:    { bg: 'rgba(212,175,55,0.12)', border: 'rgba(212,175,55,0.3)',   color: '#D4AF37' },
  'High Protein':{ bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)', color: '#60A5FA' },
  'Low Calorie': { bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.25)', color: '#A78BFA' },
  Spicy:         { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   color: '#F87171' },
};

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

  const modelUrl = dish.modelUrl || dish.model_url;
  const macroPercent = (val, max) => Math.min(100, Math.round((parseInt(val) || 0) / max * 100));

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      className="flex flex-col h-screen relative overflow-hidden"
      style={{ background: '#050508' }}>

      {/* Top Controls */}
      <div className="absolute top-0 w-full z-20 flex justify-between items-center p-5 pt-12">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/menu')}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'rgba(11,12,16,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <ChevronLeft size={22} className="text-neutral-300" />
        </motion.button>
        <motion.button whileTap={{ scale: 1.2 }} onClick={() => toggleFavorite(id)}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{
            background: isFav ? 'rgba(239,68,68,0.15)' : 'rgba(11,12,16,0.7)',
            backdropFilter: 'blur(20px)',
            border: isFav ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
          }}>
          <Heart size={20} style={{ color: isFav ? '#EF4444' : '#9CA3AF', fill: isFav ? '#EF4444' : 'none' }} />
        </motion.button>
      </div>

      {/* AR Tip Banner */}
      <AnimatePresence>
        {arTip && (
          <motion.div initial={{ y: -60 }} animate={{ y: 56 }} exit={{ y: -60 }}
            className="absolute top-0 left-0 right-0 z-30 flex justify-center px-6">
            <div className="flex items-center gap-2.5 font-sans text-xs font-semibold px-5 py-2.5 rounded-full"
              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37', backdropFilter: 'blur(16px)' }}>
              <span>✦</span>
              Tap "View in AR" to see this dish on your table!
              <button onClick={() => setArTip(false)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">✕</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Model Viewer */}
      <div className="flex-1 relative" style={{ background: 'radial-gradient(ellipse at center, #1a1408 0%, #050508 80%)' }}>
        {/* Ambient gold light */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-72 h-72 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #D4AF37, transparent 70%)' }} />
        </div>
        <div className="w-full h-full" dangerouslySetInnerHTML={{__html: `
          <model-viewer
            src="${modelUrl}"
            ar
            ar-modes="webxr scene-viewer quick-look"
            auto-rotate
            auto-rotate-delay="0"
            rotation-per-second="25deg"
            camera-controls
            camera-orbit="0deg 75deg 105%"
            shadow-intensity="1.5"
            shadow-softness="1"
            environment-image="neutral"
            exposure="1.4"
            interaction-prompt="none"
            style="width:100%;height:100%;--poster-color:transparent;"
          >
            <button slot="ar-button" style="
              position:absolute; bottom:28px; left:50%; transform:translateX(-50%);
              background:linear-gradient(135deg,#D4AF37,#AA8C2C);
              color:#0B0C10; border:none; border-radius:9999px; padding:14px 32px;
              font-weight:800; font-family:inherit; font-size:14px;
              box-shadow:0 8px 30px rgba(212,175,55,0.5); cursor:pointer; letter-spacing:0.05em;">
              ✦ ${t('dish.viewInAr', 'View in AR')}
            </button>
          </model-viewer>
        `}} />
      </div>

      {/* Info Panel */}
      <motion.div initial={{ y: 120 }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        className="relative z-30 px-6 pt-5 pb-8 max-h-[56vh] overflow-y-auto"
        style={{
          background: 'rgba(11,12,16,0.97)',
          backdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(212,175,55,0.1)',
          borderRadius: '2.5rem 2.5rem 0 0',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.8)',
        }}>

        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'rgba(212,175,55,0.3)' }} />

        {/* Name + Price */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1">
              {dish.tags?.includes('Bestseller') && (
                <div className="flex items-center gap-1">
                  <Crown size={10} style={{ color: '#D4AF37' }} />
                  <span className="text-[10px] font-sans font-semibold tracking-widest uppercase" style={{ color: '#D4AF37' }}>Bestseller</span>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-serif font-bold text-pearl leading-tight mb-2">{dish.name}</h2>
            <div className="flex flex-wrap gap-1.5 mb-1">
              {dish.tags?.filter(t => t !== 'Bestseller').map(tag => {
                const style = TAG_COLORS[tag] || { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', color: '#9CA3AF' };
                return (
                  <span key={tag} className="text-[11px] font-sans font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}>
                    {tag}
                  </span>
                );
              })}
              {dish.allergens?.map(a => (
                <span key={a} className="text-[11px] font-sans font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}>
                  <AlertTriangle size={9} /> {ALLERGEN_ICONS[a] || ''} {a}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-serif font-bold" style={{ color: '#D4AF37' }}>
              ${Number(dish.price).toFixed(2)}
            </p>
          </div>
        </div>

        <p className="text-sm text-neutral-500 font-sans mb-5 leading-relaxed">{dish.description}</p>

        {/* Macro Bars */}
        <div className="space-y-2.5 mb-5">
          {[
            { label: 'Calories', value: dish.macros?.calories, unit: 'kcal', max: 800,  color: '#F97316', trackColor: 'rgba(249,115,22,0.12)', icon: <Flame size={13} style={{ color: '#F97316' }} /> },
            { label: 'Protein',  value: parseInt(dish.macros?.protein), unit: 'g', max: 60,   color: '#60A5FA', trackColor: 'rgba(96,165,250,0.1)',  icon: <Droplets size={13} style={{ color: '#60A5FA' }} /> },
            { label: 'Carbs',    value: parseInt(dish.macros?.carbs),   unit: 'g', max: 100,  color: '#34D399', trackColor: 'rgba(52,211,153,0.1)',  icon: <Leaf size={13} style={{ color: '#34D399' }} /> },
            { label: 'Fat',      value: parseInt(dish.macros?.fat),     unit: 'g', max: 50,   color: '#D4AF37', trackColor: 'rgba(212,175,55,0.1)',  icon: <span className="text-[11px] font-black" style={{ color: '#D4AF37' }}>F</span> },
          ].map(m => (
            <div key={m.label} className="flex items-center gap-3">
              <div className="w-5 flex justify-center flex-shrink-0">{m.icon}</div>
              <span className="text-xs font-sans font-medium text-neutral-600 w-14 flex-shrink-0">{m.label}</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: m.trackColor }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${macroPercent(m.value, m.max)}%` }}
                  transition={{ delay: 0.3, duration: 0.9, ease: 'easeOut' }}
                  className="h-full rounded-full" style={{ background: m.color }} />
              </div>
              <span className="text-xs font-sans font-semibold text-neutral-400 w-16 text-right flex-shrink-0">
                {m.value || 0} {m.unit}
              </span>
            </div>
          ))}
        </div>

        {/* Micros Expandable */}
        {dish.micros && (
          <div className="mb-5">
            <button onClick={() => setShowMicros(v => !v)}
              className="flex items-center gap-2 text-xs font-sans font-medium text-neutral-600 hover:text-champagne-400 transition-colors w-full"
              style={{ color: showMicros ? '#D4AF37' : '#6B7280' }}>
              {showMicros ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showMicros ? 'Hide' : 'Show'} Micronutrients
            </button>
            <AnimatePresence>
              {showMicros && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 grid grid-cols-4 gap-2">
                  {Object.entries(dish.micros).map(([key, val]) => (
                    <div key={key} className="rounded-xl p-2 text-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="font-sans font-bold text-sm block" style={{ color: '#D4AF37' }}>{val}</span>
                      <span className="text-[10px] text-neutral-600 font-sans uppercase tracking-wide">{key}</span>
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
              <span key={ing} className="text-[11px] font-sans px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.06)' }}>
                {ing}
              </span>
            ))}
          </div>
        )}

        {/* Add to Cart */}
        <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
          onClick={() => { addToCart(dish); navigate(-1); }}
          className="w-full font-sans font-bold py-4 rounded-2xl flex justify-center items-center gap-3 text-base transition-all"
          style={{
            background: 'linear-gradient(135deg, #D4AF37, #AA8C2C)',
            color: '#0B0C10',
            boxShadow: '0 8px 40px rgba(212,175,55,0.35)',
          }}>
          <ShoppingCart size={19} />
          {t('dish.addToOrder', 'Add to Order')}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
