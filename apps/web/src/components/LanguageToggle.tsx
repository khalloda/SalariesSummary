import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };
  
  return (
    <button
      onClick={toggleLanguage}
      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
    >
      {i18n.language === 'en' ? 'العربية' : 'English'}
    </button>
  );
}

