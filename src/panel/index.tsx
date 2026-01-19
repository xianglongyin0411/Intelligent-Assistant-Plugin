import React from 'react';
import ReactDOM from 'react-dom';
import { AssistantPanel } from './AssistantPanel';
import './styles/global.css';

// Animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes blink {
        0%, 20% { opacity: 1; }
        40% { opacity: 0; }
        60% { opacity: 1; }
        80% { opacity: 0; }
        100% { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Wait for DOM to be ready before rendering
function renderApp() {
    const container = document.getElementById('root');
    if (!container) {
        console.error('Root element not found');
        return;
    }
    
    ReactDOM.render(
        React.createElement(
            React.StrictMode,
            null,
            React.createElement(AssistantPanel)
        ),
        container
    );
}

// Render immediately if DOM is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderApp);
} else {
    renderApp();
}
