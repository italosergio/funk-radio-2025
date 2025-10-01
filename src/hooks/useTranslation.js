import { useState } from 'react'
import { translations } from '../i18n/translations.js'

export const useTranslation = () => {
  const [language, setLanguage] = useState('pt-BR')
  
  const t = (key) => {
    return translations[language][key] || key
  }
  
  const changeLanguage = (lang) => {
    setLanguage(lang)
  }
  
  return { t, language, changeLanguage }
}