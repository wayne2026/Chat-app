import React from 'react';
import { useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import { Chat } from './components/Chat';
import './App.css';

const App: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner-large"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return isAuthenticated ? <Chat /> : <Auth />;
};

export default App;
