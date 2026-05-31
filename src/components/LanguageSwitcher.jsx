import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex gap-2">
      <button 
        onClick={() => changeLanguage('en')} 
        className={`px-2 py-1 text-xs rounded-md ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
      >
        EN
      </button>
      <button 
        onClick={() => changeLanguage('es')} 
        className={`px-2 py-1 text-xs rounded-md ${i18n.language === 'es' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
      >
        ES
      </button>
      <button 
        onClick={() => changeLanguage('hi')} 
        className={`px-2 py-1 text-xs rounded-md ${i18n.language === 'hi' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
      >
        HI
      </button>
    </div>
  );
}
