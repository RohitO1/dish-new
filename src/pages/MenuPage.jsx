import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, Box, QrCode, Heart, Search, Flame, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

const FILTER_TABS = ['All', 'Vegan', 'High Protein', 'Low Calorie', 'Favorites'];

export default function MenuPage() {
  const navigate = useNavigate();
  const { activeRestId, dishes, setActiveDishId, restaurants, setActiveRestId, favorites, toggleFavorite, addToCart } = useAppContext();
  const { t } = useTranslation();
  const [search, setSearch]     = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    if (!activeRestId) navigate('/scanner', { replace: true });
  }, [activeRestId, navigate]);

  const restaurant = restaurants.find(r => r.id === activeRestId);
  const allDishes  = dishes.filter(d => d.restId === activeRestId);

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
      className="flex flex-col h-screen bg-neutral-950 text-white pb-24 overflow-hidden">

      {/* Hero Banner */}
      <div className="h-52 bg-cover bg-center relative rounded-b-[2.5rem] overflow-hidden shadow-2xl shrink-0"
        style={{ backgroundImage: `url(${restaurant?.cover})` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/50 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
          <div>
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
              className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-300 leading-tight">
              {restaurant?.name}
            </motion.h1>
            <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
              className="text-xs text-neutral-400 font-bold mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
              {allDishes.length} dishes available · AR Menu Active
            </motion.p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/health')}
              className="bg-emerald-600/80 backdrop-blur-md text-white p-3 rounded-full hover:bg-emerald-500/80 transition-colors shadow-lg">
              <Activity size={18} />
            </button>
            {/* Re-scan: keeps cart, orders, health data — only resets the active restaurant */}
            <button
              onClick={() => navigate('/scanner?rescan=true')}
              title="Scan a different restaurant"
              className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/20 transition-colors border border-white/10">
              <QrCode size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 mt-4 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search dishes..."
            className="w-full bg-neutral-900/80 border border-neutral-800 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-600 transition-colors placeholder:text-neutral-600" />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 px-4 mt-3 overflow-x-auto no-scrollbar shrink-0 pb-1">
        {FILTER_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveFilter(tab)}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all ${
              activeFilter === tab
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-700'
            }`}>
            {tab === 'Favorites' && <Heart size={11} className={activeFilter === 'Favorites' ? 'fill-white text-white' : 'text-red-400'} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Dish List */}
      <div className="flex-1 overflow-y-auto px-4 mt-3 space-y-3 pb-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-neutral-600">
              <Utensils size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No dishes found</p>
            </motion.div>
          )}
          {filtered.map((dish, index) => (
            <motion.div layout key={dish.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              className="bg-neutral-900/70 backdrop-blur-md border border-neutral-800 rounded-3xl p-4 flex gap-4 items-center cursor-pointer shadow-lg hover:border-neutral-700 hover:bg-neutral-900 transition-all"
            >
              {/* Dish Thumbnail */}
              <div onClick={() => handleDishClick(dish.id)}
                className="w-24 h-24 bg-neutral-800 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner group">
                <Utensils size={28} className="text-neutral-600 group-hover:text-neutral-400 transition-colors z-10" />
                {dish.macros?.calories && (
                  <div className="absolute top-1 left-1 bg-orange-500/20 border border-orange-500/30 rounded-lg px-1.5 py-0.5 flex items-center gap-0.5">
                    <Flame size={9} className="text-orange-400" />
                    <span className="text-[9px] font-black text-orange-400">{dish.macros.calories}</span>
                  </div>
                )}
                {dish.modelUrl && (
                  <div className="absolute bottom-1 right-1 bg-blue-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-0.5 z-10 shadow-[0_0_10px_rgba(37,99,235,0.6)] border border-white/20">
                    <Box size={10}/> 3D AR
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0" onClick={() => handleDishClick(dish.id)}>
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-base leading-tight truncate pr-2">{dish.name}</h3>
                  <span className="font-black text-blue-400 bg-blue-900/20 px-2.5 py-1 rounded-lg text-sm shrink-0">${Number(dish.price).toFixed(2)}</span>
                </div>
                <p className="text-xs text-neutral-500 line-clamp-1 mt-1 mb-2">{dish.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {dish.tags?.slice(0,2).map(tag => (
                    <span key={tag} className="text-[10px] font-bold bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-md">{tag}</span>
                  ))}
                  {dish.allergens?.length > 0 && (
                    <span className="text-[10px] font-bold bg-red-900/30 text-red-400 px-2 py-0.5 rounded-md">⚠ Allergens</span>
                  )}
                </div>
              </div>

              {/* Heart button + Quick Add */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <motion.button whileTap={{ scale: 1.4 }}
                  onClick={e => { e.stopPropagation(); toggleFavorite(dish.id); }}
                  className="p-2 rounded-full hover:bg-neutral-800 transition-colors">
                  <Heart size={18} className={favorites.includes(dish.id) ? 'text-red-500 fill-red-500' : 'text-neutral-600'} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}
                  onClick={e => { e.stopPropagation(); addToCart(dish); }}
                  className="w-8 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors shadow-lg shadow-blue-600/30">
                  <span className="text-lg leading-none font-black">+</span>
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
