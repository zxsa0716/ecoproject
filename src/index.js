import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // tailwind 설정된 파일
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
// PWA 활성화
serviceWorkerRegistration.register();