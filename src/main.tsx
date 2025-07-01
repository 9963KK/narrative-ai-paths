import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 添加Buffer polyfill支持
import { Buffer } from 'buffer'
window.global = window.global ?? window
window.Buffer = window.Buffer ?? Buffer

createRoot(document.getElementById("root")!).render(<App />);
