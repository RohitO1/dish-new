import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../locales/i18n';
import { auth, db, appId, signInAnonymously, signInWithCustomToken, onAuthStateChanged, collection, onSnapshot, addDoc, updateDoc, doc, INITIAL_DISHES, INITIAL_RESTAURANTS } from '../services/firebase';

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Core State
  const [user, setUser] = useState(null); 
  const [activeRestId, setActiveRestId] = useState(null); // null = must scan QR first
  const [activeDishId, setActiveDishId] = useState(null);
  
  // Data State
  const [restaurants, setRestaurants] = useState(INITIAL_RESTAURANTS);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [dishes, setDishes] = useState(INITIAL_DISHES); 
  const [notification, setNotification] = useState(null);
  const [vendorTab, setVendorTab] = useState('orders');
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('3dish_favorites') || '[]'); } catch { return []; }
  });
  const [nutritionHistory, setNutritionHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('3dish_nutrition_history') || '[]'); } catch { return []; }
  });
  const [userPreferences, setUserPreferences] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('3dish_preferences')) || {
        language: 'en',
        goals: { calories: 2000, protein: 150, carbs: 250, fat: 65 }
      };
    } catch { 
      return { language: 'en', goals: { calories: 2000, protein: 150, carbs: 250, fat: 65 } }; 
    }
  });

  const updatePreferences = (newPrefs) => {
    setUserPreferences(prev => {
      const updated = { ...prev, ...newPrefs };
      localStorage.setItem('3dish_preferences', JSON.stringify(updated));
      return updated;
    });
  };

  // 1. Auth Init
  useEffect(() => {
    if (!auth) { 
      setIsInitializing(false); 
      return; 
    }
    const initAuth = async () => {
      try {
        if (typeof window !== 'undefined' && window.__initial_auth_token) {
          await signInWithCustomToken(auth, window.__initial_auth_token);
        } else { 
          await signInAnonymously(auth); 
        }
      } catch (err) { console.error("Auth error:", err); }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      // If a Firebase user is already signed in with email (returning vendor), restore their session
      if (u && u.email && !user) {
        setUser(prev => prev || { 
          email: u.email, 
          uid: u.uid, 
          displayName: u.displayName, 
          role: 'vendor' 
        });
      }
      setIsInitializing(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync language on mount
  useEffect(() => {
    if (userPreferences?.language) {
      i18n.changeLanguage(userPreferences.language);
    }
  }, [userPreferences.language]);

  // 2. Real-time Sync
  useEffect(() => {
    if (!firebaseUser || !db) return;
    
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
    const unsubOrders = onSnapshot(ordersRef, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
      setOrders(fetchedOrders);
    });

    const dishesRef = collection(db, 'artifacts', appId, 'public', 'data', 'dishes');
    const unsubDishes = onSnapshot(dishesRef, (snapshot) => {
      if (!snapshot.empty) {
        setDishes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });

    const restRef = collection(db, 'artifacts', appId, 'public', 'data', 'restaurants');
    const unsubRest = onSnapshot(restRef, (snapshot) => {
      if (!snapshot.empty) {
        setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    });
    
    return () => { 
      unsubOrders(); 
      unsubDishes(); 
      unsubRest();
    };
  }, [firebaseUser]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const addToCart = (dish) => {
    setCart([...cart, { ...dish, cartId: Date.now() }]);
    showNotification('Added to cart');
  };

  const toggleFavorite = (dishId) => {
    setFavorites(prev => {
      const next = prev.includes(dishId) ? prev.filter(id => id !== dishId) : [...prev, dishId];
      localStorage.setItem('3dish_favorites', JSON.stringify(next));
      return next;
    });
  };

  const saveNutritionRecord = (items, restName) => {
    const macros = items.reduce((acc, item) => {
      if (item.macros) {
        acc.calories += parseInt(item.macros.calories) || 0;
        acc.protein  += parseInt(item.macros.protein)  || 0;
        acc.carbs    += parseInt(item.macros.carbs)    || 0;
        acc.fat      += parseInt(item.macros.fat)      || 0;
      }
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const record = {
      date: new Date().toISOString(),
      restName,
      items: items.map(i => i.name),
      macros,
    };
    setNutritionHistory(prev => {
      const next = [record, ...prev].slice(0, 30); // keep last 30
      localStorage.setItem('3dish_nutrition_history', JSON.stringify(next));
      return next;
    });
  };

  const placeOrder = async (orderData) => {
    if (!firebaseUser && auth) {
      showNotification("Cloud connection required.");
      return false;
    }
    
    const rest = restaurants.find(r => r.id === activeRestId);
    const taxRate = rest?.taxRate !== undefined ? rest.taxRate / 100 : 0.08;

    const newOrder = {
      userId: user?.uid || user?.phone || 'anonymous',
      restId: activeRestId,
      items: cart,
      total: cart.reduce((sum, item) => sum + Number(item.price), 0) * (1 + taxRate),
      timestamp: new Date().toISOString(),
      ...orderData
    };

    try {
      if (db) {
        const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'orders');
        await addDoc(ordersRef, newOrder);
      } else {
        // Mock DB update if no firebase config
        setOrders(prev => [{id: Date.now().toString(), ...newOrder}, ...prev]);
      }
      setCart([]);
      const restName = restaurants.find(r => r.id === activeRestId)?.name || 'Restaurant';
      saveNutritionRecord(cart, restName);
      showNotification('Order successfully transmitted!');
      return true;
    } catch (error) { 
      showNotification('Failed to transmit order.');
      return false;
    }
  };

  const addRestaurant = async (restData) => {
    if (!firebaseUser && auth) return null;
    
    const newRest = {
      vendorId: user?.uid || user?.phone || 'anonymous',
      ...restData
    };

    try {
      if (db) {
        const restRef = collection(db, 'artifacts', appId, 'public', 'data', 'restaurants');
        const docRef = await addDoc(restRef, newRest);
        return docRef.id;
      } else {
        const mockId = 'rest-' + Date.now();
        setRestaurants(prev => [...prev, { id: mockId, ...newRest }]);
        return mockId;
      }
    } catch (error) {
      showNotification('Failed to create restaurant.');
      return null;
    }
  };

  const updateRestaurant = async (restId, updateData) => {
    if (!firebaseUser && auth) return;
    try {
      if (db) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'restaurants', restId);
        await updateDoc(docRef, updateData);
      } else {
        setRestaurants(prev => prev.map(r => r.id === restId ? { ...r, ...updateData } : r));
      }
      showNotification('Settings updated successfully!');
    } catch (error) {
      showNotification('Failed to update settings.');
    }
  };

  const addDish = async (dishData) => {
    if (!firebaseUser && auth) return null;
    try {
      if (db) {
        const dishesRef = collection(db, 'artifacts', appId, 'public', 'data', 'dishes');
        const docRef = await addDoc(dishesRef, dishData);
        return docRef.id;
      } else {
        const mockId = 'dish-' + Date.now();
        setDishes(prev => [...prev, { id: mockId, ...dishData }]);
        return mockId;
      }
    } catch (error) {
      showNotification('Failed to save dish.');
      return null;
    }
  };

  const updateDish = async (dishId, updates) => {
    if (!firebaseUser && auth) return;
    try {
      if (db) {
        const dishRef = doc(db, 'artifacts', appId, 'public', 'data', 'dishes', dishId);
        await updateDoc(dishRef, updates);
      } else {
        setDishes(prev => prev.map(d => d.id === dishId ? { ...d, ...updates } : d));
      }
      showNotification('Dish updated successfully.');
    } catch (error) {
      showNotification('Failed to update dish.');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (!firebaseUser && auth) return;
    try {
      if (db) {
        const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'orders', orderId);
        await updateDoc(orderRef, { status: newStatus });
      } else {
        setOrders(prev => prev.map(o => o.id === orderId ? {...o, status: newStatus} : o));
      }
      showNotification(`Order moved to: ${newStatus}`);
    } catch (error) { 
      showNotification('Failed to update status.'); 
    }
  };

  const value = {
    firebaseUser,
    isInitializing,
    user, setUser,
    activeRestId, setActiveRestId,
    activeDishId, setActiveDishId,
    restaurants, setRestaurants, addRestaurant, updateRestaurant,
    cart, setCart,
    orders, setOrders,
    dishes, setDishes, addDish, updateDish,
    notification, showNotification,
    vendorTab, setVendorTab,
    addToCart,
    placeOrder,
    updateOrderStatus,
    favorites, toggleFavorite,
    nutritionHistory, saveNutritionRecord,
    userPreferences, updatePreferences,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
