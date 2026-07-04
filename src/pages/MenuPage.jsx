import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, Box, QrCode, Heart, Search, Flame, Activity, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

const FILTER_TABS = ['All', 'Vegan', 'High Protein', 'Low Calorie', 'Favorites'];

export default function MenuPage() {
  const navigate = useNavigate();
  const { activeRestId, dishes, setActiveDishId, restaurants, setActiveRestId, favorites, toggleFavorite, addToCart } = useAppContext();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    if (!activeRestId) navigate('/scanner', { replace: true });
  }, [activeRestId, navigate]);

  const restaurant = restaurants.find(r => r.id === activeRestId);
  const allDishes  = dishes.filter(d => d.restId === activeRestId || d.rest_id === activeRestId);

  const filtered = allDishes.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
                        d.description?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === 'All' ? true
                      : activeFilter === 'Favorites' ? favorites.includes(d.id)
                      : d.tags?.includes(activeFilter);
    return matchSearch && matchFilter;
  });

  const handleDishClick = (id) => { setActiveDishId(id); navigate(`/dish/${id}`); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col h-screen overflow-hidden bg-neutral-50 dark:bg-obsidian-900 text-neutral-900 dark:text-pearl">

      {/* ── Hero Banner ── */}
      <div className="h-60 bg-cover bg-center relative rounded-b-[2.5rem] overflow-hidden shadow-2xl shrink-0"
        style={{ backgroundImage: `url(${restaurant?.cover})` }}>
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #0B0C10 0%, rgba(11,12,16,0.4) 50%, transparent 100%)' }} />
        {/* Subtle gold grain */}
        <div className="absolute inset-0 opacity-5"
          style={{ background: 'linear-gradient(135deg, #D4AF37, transparent 60%)' }} />

        <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
          <div>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="flex items-center gap-2 mb-1.5">
              <Crown size={12} style={{ color: '#D4AF37' }} />
              <span className="text-[10px] font-sans font-semibold tracking-[0.3em] uppercase" style={{ color: '#D4AF37' }}>
                {allDishes.length} Signature Dishes
              </span>
            </motion.div>
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
              className="text-3xl font-serif font-bold text-pearl leading-tight">
              {restaurant?.name}
            </motion.h1>
            <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
              className="text-xs text-neutral-500 font-sans mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: '#D4AF37' }} />
              AR Menu Active
            </motion.p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/health')}
              className="p-3 rounded-full transition-all hover:scale-105"
              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <Activity size={18} style={{ color: '#D4AF37' }} />
            </button>
            <button onClick={() => navigate('/scanner?rescan=true')}
              className="p-3 rounded-full transition-all hover:scale-105"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <QrCode size={18} className="text-neutral-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="px-4 mt-4 shrink-0">
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search signature dishes..."
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-sans text-neutral-900 dark:text-pearl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 placeholder:text-neutral-500 dark:placeholder:text-neutral-700 focus:outline-none focus:border-champagne-500 transition-all"
          />
        </div>
      </div>

      {/* ── Filter Chips ── */}
      <div className="flex gap-2 px-4 mt-3 overflow-x-auto no-scrollbar shrink-0 pb-1">
        {FILTER_TABS.map(tab => (
          <motion.button key={tab} onClick={() => setActiveFilter(tab)}
            whileTap={{ scale: 0.95 }}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-sans font-semibold transition-all"
            style={
              activeFilter === tab
                ? { background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37', boxShadow: '0 0 20px rgba(212,175,55,0.1)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#6B7280' }
            }>
            {tab === 'Favorites' && <Heart size={11} style={{ color: activeFilter === 'Favorites' ? '#D4AF37' : '#EF4444', fill: activeFilter === 'Favorites' ? '#D4AF37' : 'none' }} />}
            {tab}
          </motion.button>
        ))}
      </div>

      {/* ── Dish List ── */}
      <div className="flex-1 overflow-y-auto px-4 mt-4 space-y-3 pb-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Utensils size={36} className="mx-auto mb-3 opacity-20 text-neutral-500" />
              <p className="font-sans text-neutral-600 font-medium">No dishes found</p>
            </motion.div>
          )}
          {filtered.map((dish, index) => (
            <motion.div layout key={dish.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.04 }}
              className="flex gap-4 items-center cursor-pointer transition-all rounded-3xl p-4"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              whileHover={{ scale: 1.005, borderColor: 'rgba(212,175,55,0.15)' }}
            >
              {/* Dish Thumbnail */}
              <div onClick={() => handleDishClick(dish.id)}
                className="w-24 h-24 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {dish.cover ? (
                  <img src={dish.cover} alt={dish.name} className="w-full h-full object-cover" />
                ) : (
                  <Utensils size={26} className="text-neutral-700" />
                )}
                {dish.macros?.calories && (
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg"
                    style={{ background: 'rgba(251,146,60,0.2)', border: '1px solid rgba(251,146,60,0.3)' }}>
                    <Flame size={8} className="text-orange-400" />
                    <span className="text-[9px] font-sans font-bold text-orange-400">{dish.macros.calories}</span>
                  </div>
                )}
                {(dish.modelUrl || dish.model_url) && (
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-lg flex items-center gap-0.5"
                    style={{ background: 'rgba(212,175,55,0.9)', boxShadow: '0 0 10px rgba(212,175,55,0.4)' }}>
                    <Box size={9} style={{ color: '#0B0C10' }} />
                    <span className="text-[9px] font-sans font-black" style={{ color: '#0B0C10' }}>3D</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0" onClick={() => handleDishClick(dish.id)}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-serif font-bold text-base text-pearl leading-tight truncate pr-2">{dish.name}</h3>
                  <div className="flex flex-col items-end gap-1">
                    {dish.sizes?.length > 0 ? (
                      dish.sizes.map((s, idx) => (
                        <span key={idx} className="font-sans font-bold text-xs shrink-0 px-2 py-0.5 rounded-lg flex items-center gap-1"
                          style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                          <span className="opacity-70 text-[10px] uppercase tracking-wider">{s.size}:</span> ₹{Number(s.price).toFixed(2)}
                        </span>
                      ))
                    ) : (
                      <span className="font-sans font-bold text-sm shrink-0 px-2.5 py-1 rounded-xl"
                        style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                        ₹{Number(dish.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-neutral-600 font-sans line-clamp-1 mt-0.5 mb-2">{dish.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {dish.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(255,255,255,0.05)', color: '#9CA3AF', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {tag}
                    </span>
                  ))}
                  {dish.allergens?.length > 0 && (
                    <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                      ⚠ Allergens
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-center gap-2.5 shrink-0">
                <motion.button whileTap={{ scale: 1.4 }}
                  onClick={e => { e.stopPropagation(); toggleFavorite(dish.id); }}
                  className="p-2 rounded-full transition-all"
                  style={{ background: favorites.includes(dish.id) ? 'rgba(239,68,68,0.15)' : 'transparent' }}>
                  <Heart size={17} style={{
                    color: favorites.includes(dish.id) ? '#EF4444' : '#374151',
                    fill: favorites.includes(dish.id) ? '#EF4444' : 'none'
                  }} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.05 }}
                  onClick={e => { e.stopPropagation(); addToCart(dish); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center font-black text-lg transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37, #AA8C2C)',
                    color: '#0B0C10',
                    boxShadow: '0 0 15px rgba(212,175,55,0.3)'
                  }}>
                  +
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <BottomNav />
    </motion.div>
  );
}
