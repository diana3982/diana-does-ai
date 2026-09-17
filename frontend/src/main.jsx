import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { boldText } from './lib/boldText'
import { textSize } from './lib/textSize'

// Before the first render, so nobody sees a flash of the defaults and then
// a jump -- and so both are already right on the very first screen.
textSize.init()
boldText.init()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
