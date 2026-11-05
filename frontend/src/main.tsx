// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// CSS
import "./css/base.css";
import "./css/buttons.css";
import "./css/calendar.css";
import "./css/dashboard_cards.css";
import "./css/dev_utilities.css";
import "./css/footer.css";
import "./css/forms_input.css";
import "./css/header_nav.css";
import "./css/modals_overlays.css";
import "./css/pages.css";
import "./css/tables.css";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)