import React from 'react';
import { NavLink } from 'react-router-dom';
import { Utensils, ShoppingCart, Receipt, Activity, Settings } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function BottomNav() {
  const { cart } = useAppContext();
  const { t } = useTranslation();

  const navItems = [
    { to: '/menu',    icon: Utensils,     label: t('nav.menu') },
    { to: '/cart',    icon: ShoppingCart, label: t('nav.cart'),   badge: cart.length > 0 ? cart.length : null },
    { to: '/orders',  icon: Receipt,      label: t('nav.orders') },
    { to: '/health',  icon: Activity,     label: t('nav.health', 'Health') },
    { to: '/settings', icon: Settings,    label: t('nav.settings', 'Settings') },
  ];

  return (
    <div className="fixed bottom-0 w-full bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-800/80 flex justify-around pt-3 pb-6 z-40 shadow-[0_-4px_30px_rgba(0,0,0,0.4)]">
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center relative transition-all duration-200 px-2 ${isActive ? 'text-blue-400' : 'text-neutral-600 hover:text-neutral-400'}`
          }
        >
          {({ isActive }) => (
            <>
              <motion.div whileTap={{ scale: 0.85 }} className="relative">
                {isActive && (
                  <motion.div layoutId="nav-pill"
                    className="absolute -inset-2 bg-blue-500/15 rounded-2xl border border-blue-500/20"
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                  />
                )}
                <item.icon size={22} className="relative z-10" />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white text-[9px] min-w-[16px] h-4 flex items-center justify-center rounded-full font-black px-1 shadow-lg shadow-blue-600/40">
                    {item.badge}
                  </span>
                )}
              </motion.div>
              <span className={`text-[10px] mt-1.5 font-bold tracking-wide transition-colors ${isActive ? 'text-blue-400' : 'text-neutral-600'}`}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
