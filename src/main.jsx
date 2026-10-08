import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';

import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

import ErrorBoundary from './components/ErrorBoundary';

import './styles/variables.css';
import './styles/globals.css';
import './styles/components.css';
import './styles/home.css';
import './styles/pages.css';
import './styles/dashboard.css';
import './styles/student.css';
import './styles/manage.css';
import './styles/mobile-fixes.css';
import './styles/experience.css';

ReactDOM.createRoot(
  document.getElementById('root')
).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
