import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Flame, Droplets, Leaf, Activity, Calendar, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import BottomNav from '../components/BottomNav';

function MacroRing({ value, max, color, label, unit }) {
  const pct  = Math.min(1, (value || 0) / max);
  const r    = 28;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#262626" strokeWidth="6" />
          <motion.circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - pct) }} transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-black text-white">{Math.round(pct * 100)}%</span>
        </div>
      </div>
      <span className="text-xs font-black mt-1" style={{ color }}>{value || 0}{unit}</span>
      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

export default function HealthDashboardPage() {
  const navigate = useNavigate();
  const { nutritionHistory, userPreferences } = useAppContext();
  const DAILY_GOALS = userPreferences?.goals || { calories: 2000, protein: 150, carbs: 250, fat: 65 };

  const today     = new Date().toDateString();
  const todayRecs = nutritionHistory.filter(r => new Date(r.date).toDateString() === today);
  const todayTotals = todayRecs.reduce((acc, r) => {
    acc.calories += r.macros.calories;
    acc.protein  += r.macros.protein;
    acc.carbs    += r.macros.carbs;
    acc.fat      += r.macros.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const weeklyAvg = nutritionHistory.length > 0
    ? Math.round(nutritionHistory.reduce((s, r) => s + r.macros.calories, 0) / nutritionHistory.length)
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="flex flex-col h-screen bg-neutral-950 text-white overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-14 pb-5">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center hover:bg-neutral-700 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black">Health Dashboard</h1>
          <p className="text-neutral-400 text-sm">Track your daily nutrition</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-28 space-y-6">

        {/* Today Goals */}
        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-800/30 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-lg">Today's Intake</h2>
            <span className="text-xs bg-blue-600/30 text-blue-300 font-bold px-3 py-1 rounded-full border border-blue-600/30">
              {todayRecs.length} meal{todayRecs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <MacroRing value={todayTotals.calories} max={DAILY_GOALS.calories} color="#f97316" label="Cals"   unit="kcal" />
            <MacroRing value={todayTotals.protein}  max={DAILY_GOALS.protein}  color="#3b82f6" label="Prot"   unit="g" />
            <MacroRing value={todayTotals.carbs}    max={DAILY_GOALS.carbs}    color="#10b981" label="Carbs"  unit="g" />
            <MacroRing value={todayTotals.fat}      max={DAILY_GOALS.fat}      color="#f59e0b" label="Fat"    unit="g" />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <Activity size={20} className="text-emerald-500 mb-2" />
            <p className="text-2xl font-black text-emerald-400">{weeklyAvg}</p>
            <p className="text-xs text-neutral-500 font-bold mt-1">Avg Daily Calories</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <Calendar size={20} className="text-purple-400 mb-2" />
            <p className="text-2xl font-black text-purple-400">{nutritionHistory.length}</p>
            <p className="text-xs text-neutral-500 font-bold mt-1">Total Meals Tracked</p>
          </div>
        </div>

        {/* Meal History */}
        <div>
          <h2 className="font-black text-lg mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-400" /> Meal History
          </h2>
          {nutritionHistory.length === 0 ? (
            <div className="text-center py-12 text-neutral-600">
              <Flame size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold">No meals tracked yet.</p>
              <p className="text-sm mt-1">Place an order to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nutritionHistory.map((rec, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-black text-sm">{rec.restName}</p>
                      <p className="text-xs text-neutral-500 font-medium">{new Date(rec.date).toLocaleString()}</p>
                    </div>
                    <span className="text-orange-400 font-black text-sm bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                      {rec.macros.calories} kcal
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mb-3">{rec.items.join(' · ')}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-500/10 rounded-xl p-2"><span className="text-blue-400 font-black text-sm block">{rec.macros.protein}g</span><span className="text-[10px] text-neutral-600">Protein</span></div>
                    <div className="bg-emerald-500/10 rounded-xl p-2"><span className="text-emerald-400 font-black text-sm block">{rec.macros.carbs}g</span><span className="text-[10px] text-neutral-600">Carbs</span></div>
                    <div className="bg-amber-500/10 rounded-xl p-2"><span className="text-amber-400 font-black text-sm block">{rec.macros.fat}g</span><span className="text-[10px] text-neutral-600">Fat</span></div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </motion.div>
  );
}
