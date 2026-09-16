import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initTextSize } from './lib/textSize'

// Before the first render, so nobody sees a flash of the default size and
// then a jump -- and so it is already right on the very first screen.
initTextSize()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
