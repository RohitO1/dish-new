import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Camera, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';

export default function VendorOnboardingPage() {
  const navigate = useNavigate();
  const { user, restaurants, addRestaurant, setActiveRestId, supabaseUser, isInitializing } = useAppContext();
  
  const [name, setName] = useState('');
  const [cover, setCover] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isInitializing) return;
    
    if (!supabaseUser) {
      navigate('/vendor-auth', { replace: true });
      return;
    }

    // Check if user already has a restaurant — handle both camelCase (local) and snake_case (Supabase)
    if (user && restaurants && restaurants.length > 0) {
      const uid = user.uid || user.phone;
      const existing = restaurants.find(r => 
        r.vendor_id === uid || r.vendorId === uid
      );
      if (existing) {
        setActiveRestId(existing.id);
        navigate('/vendor', { replace: true });
      }
    }
  }, [user, restaurants, navigate, setActiveRestId]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setCover(reader.result);
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    // Use a default cover if they didn't upload one
    const finalCover = cover || 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80';
    
    const newId = await addRestaurant({ name, cover: finalCover });
    
    if (newId) {
      setActiveRestId(newId);
      navigate('/vendor');
    } else {
      setLoading(false);
      alert("Failed to create restaurant. Please check your Supabase connection.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-[2.5rem] p-8 shadow-2xl">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <Store size={32} className="text-white" />
        </div>
        
        <h1 className="text-3xl font-black mb-2">Create Restaurant</h1>
        <p className="text-neutral-400 text-sm mb-8">Set up your digital presence to generate menus and QR codes instantly.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">Restaurant Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Quantum Cafe"
              className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-4 py-4 focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-neutral-300 mb-2">Cover Image</label>
            <div className="relative">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full bg-neutral-800/80 border border-neutral-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
              />
            </div>
          </div>
          
          {preview && (
            <div className="w-full h-32 rounded-xl bg-cover bg-center border border-neutral-700 mt-2 opacity-80" style={{ backgroundImage: `url(${preview})` }}></div>
          )}
          
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>Launch Digital Portal <ArrowRight size={18} /></>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
