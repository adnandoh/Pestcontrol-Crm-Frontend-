import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme'

// Global fix to prevent mouse wheel from changing input[type="number"]
document.addEventListener('wheel', function(event) {
  if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type === 'number') {
    event.preventDefault();
  }
}, { passive: false });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
