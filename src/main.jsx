import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
<<<<<<< Updated upstream
import './index.css'
=======
//import './index.css'
import "./styles.css"
//import App from './Appv0.jsx'
>>>>>>> Stashed changes
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
