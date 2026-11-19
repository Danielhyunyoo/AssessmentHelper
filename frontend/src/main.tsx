// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// CSS
import "./css/base.css";
import "./css/buttons.css";
import "./css/dashboard_cards.css";
import "./css/forms_input.css";
import "./css/modals_overlays.css";
import "./css/print.css";
import "./css/pages.css";

import "./css/components/calendar.css";
import "./css/components/dev_utilities.css";
import "./css/components/footer.css";
import "./css/components/header_nav.css";
import "./css/components/tables.css";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)