// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./styles/Responsive.css";
import './index.css'
import App from './App.jsx'
import { Toaster } from 'react-hot-toast' // ✅ เพิ่ม

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <>
      <App />
      <Toaster position="top-right" reverseOrder={false} /> {/* ✅ เพิ่ม */}
    </>
  </StrictMode>,
)
