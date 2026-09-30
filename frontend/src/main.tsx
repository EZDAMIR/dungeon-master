import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './motion.css'
import './shared/languageSwitcher.css'
import './forms.css'
import { App } from './app/App.tsx'
import { getUiLanguage, setUiLanguage } from './store/uiLanguage'

setUiLanguage(getUiLanguage())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
