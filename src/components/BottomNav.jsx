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
    { to: '/menu',     icon: Utensils,     label: t('nav.menu') },
    { to: '/cart',     icon: ShoppingCart, label: t('nav.cart'), badge: cart.length > 0 ? cart.length : null },
    { to: '/orders',   icon: Receipt,      label: t('nav.orders') },
    { to: '/health',   icon: Activity,     label: t('nav.health', 'Health') },
    { to: '/settings', icon: Settings,     label: t('nav.settings', 'Settings') },
  ];

  return (
    <div
      className="fixed bottom-0 w-full flex justify-around pt-3 pb-6 z-40"
      style={{
        background: 'rgba(11, 12, 16, 0.92)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(212,175,55,0.1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(212,175,55,0.05)'
      }}
    >
      {navItems.map((item) => (
        <NavLink key={item.to} to={item.to}
          className={() => 'flex flex-col items-center relative transition-all duration-200 px-2'}
        >
          {({ isActive }) => (
            <>
              <motion.div whileTap={{ scale: 0.8 }} className="relative">
                {isActive && (
                  <motion.div layoutId="nav-glow"
                    className="absolute -inset-2.5 rounded-2xl"
                    style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                  />
                )}
                <item.icon
                  size={22}
                  className="relative z-10 transition-colors"
                  style={{ color: isActive ? '#D4AF37' : '#4B5563' }}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full font-sans font-black text-[9px] px-1"
                    style={{ background: '#D4AF37', color: '#0B0C10', boxShadow: '0 0 10px rgba(212,175,55,0.5)' }}>
                    {item.badge}
                  </span>
                )}
              </motion.div>
              <span
                className="text-[10px] mt-1.5 font-sans font-semibold tracking-wide transition-colors"
                style={{ color: isActive ? '#D4AF37' : '#4B5563' }}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
