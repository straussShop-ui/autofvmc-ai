import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './automation.css'
import './compatibility.css'
import './access.css'
import './help.css'
import './mcdean-theme.css'
import './firmware.css'
import './procedure.css'
import './holographic.css'
import './dark-theme.css'
import './dark-flow.css'
import './help-chat.css'
import './infralink.css'
import './controller-parameters.css'
import './network-cli.css'
import './premium.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
