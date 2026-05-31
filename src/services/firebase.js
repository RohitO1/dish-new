import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';

let app, auth, db, appId;

try {
  // Use standard Vite env variables first, fallback to window variables if hosted
  const envConfig = import.meta.env.VITE_FIREBASE_API_KEY ? {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  } : null;

  const firebaseConfig = envConfig || (typeof window !== 'undefined' && window.__firebase_config 
    ? JSON.parse(window.__firebase_config) 
    : {});
  
  if (Object.keys(firebaseConfig).length > 0) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    appId = typeof window !== 'undefined' && window.__app_id ? window.__app_id : 'default-app-id';
  } else {
    console.warn("No Firebase config provided. Mocking Firebase.");
  }
} catch (error) {
  console.warn("Firebase initialization skipped or failed. Using local mode.");
}

// --- MOCK DATA FOR THE APP ---
export const INITIAL_RESTAURANTS = [
  {
    id: 'rest-001',
    name: 'CyberBite Bistro',
    cover: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
    vendorId: 'vendor-001'
  }
];

export const INITIAL_DISHES = [
  {
    id: 'dish-001',
    restId: 'rest-001',
    name: 'Truffle Glazed Burger',
    price: 18.99,
    description: 'A futuristic take on the classic burger with truffle infusion.',
    tags: ['High Protein', 'Bestseller'],
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', 
    macros: { protein: '35g', carbs: '45g', fat: '22g', calories: 540 },
    micros: { iron: '15%', calcium: '10%', vitC: '5%', vitA: '20%' },
    ingredients: ['Wagyu Beef Patty', 'Truffle Aioli', 'Brioche Bun']
  },
  {
    id: 'dish-002',
    restId: 'rest-001',
    name: 'Quantum Matcha Bowl',
    price: 12.50,
    description: 'Antioxidant-rich smoothie bowl topped with exotic fruits.',
    tags: ['Vegan', 'Low Calorie'],
    modelUrl: 'https://modelviewer.dev/shared-assets/models/shiba.glb',
    macros: { protein: '12g', carbs: '65g', fat: '8g', calories: 320 },
    micros: { iron: '25%', calcium: '30%', vitC: '110%', vitA: '40%' },
    ingredients: ['Ceremonial Matcha', 'Almond Milk', 'Dragonfruit']
  }
];

export { auth, db, appId, signInAnonymously, signInWithCustomToken, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, collection, onSnapshot, addDoc, updateDoc, doc };
