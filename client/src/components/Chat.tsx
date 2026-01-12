import React, { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import './Chat.css';

interface Message {
    _id: string;
    sender: string;
    senderUsername: string;
    content: string;
    room?: string;
    conversationId?: string;
    createdAt: string;
}

interface ActiveChat {
    type: 'room' | 'dm';
    id: string;
    name: string;
    roomNumber?: string;
    recipientId?: string;
}

export const Chat: React.FC = () => {
    const { token, logout, isAuthenticated } = useAuth();
    const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
    const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Fetch current user info on mount
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch('https://chat-api-5ogk.onrender.com/api/messages/getChatMessages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, room: 'temp' })
                });

                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data.user);
                } else if (res.status === 401) {
                    logout();
                }
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };

        if (isAuthenticated && !currentUser) {
            fetchUser();
        }
    }, [isAuthenticated]);

    // Fetch messages when activeChat changes
    useEffect(() => {
        const fetchMessages = async () => {
            if (!activeChat) return;

            try {
                const body: any = { token };
                if (activeChat.type === 'room') {
                    body.room = activeChat.id;
                } else {
                    body.conversationId = activeChat.id;
                }

                const res = await fetch('https://chat-api-5ogk.onrender.com/api/messages/getChatMessages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    const data = await res.json();
                    setMessages(data.messages);
                }
            } catch (error) {
                console.error('Failed to fetch messages:', error);
            }
        };

        fetchMessages();
    }, [activeChat]);

    // WebSocket connection
    useEffect(() => {
        if (!token || !currentUser) return;

        const ws = new WebSocket(`wss://chat-api-5ogk.onrender.com/ws?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);

            // Switch to active chat on connection
            if (activeChat) {
                ws.send(JSON.stringify({
                    type: 'switch_chat',
                    room: activeChat.type === 'room' ? activeChat.id : undefined,
                    conversationId: activeChat.type === 'dm' ? activeChat.id : undefined
                }));
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'message') {
                // Add new message directly
                const newMessage: Message = {
                    _id: data.messageId,
                    sender: data.senderId,
                    senderUsername: data.sender,
                    content: data.content,
                    createdAt: data.timestamp
                };
                setMessages(prev => [...prev, newMessage]);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
        };

        return () => {
            ws.close();
        };
    }, [token, currentUser]);

    // Switch chat when activeChat changes
    useEffect(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeChat) {
            wsRef.current.send(JSON.stringify({
                type: 'switch_chat',
                room: activeChat.type === 'room' ? activeChat.id : undefined,
                conversationId: activeChat.type === 'dm' ? activeChat.id : undefined
            }));
        }
    }, [activeChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !wsRef.current || !currentUser || !activeChat) return;

        // Add own message immediately
        const newMessage: Message = {
            _id: Date.now().toString(),
            sender: currentUser.id,
            senderUsername: currentUser.username,
            content: inputValue.trim(),
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMessage]);

        const messageData: any = {
            type: 'message',
            content: inputValue.trim()
        };

        if (activeChat.type === 'dm') {
            messageData.recipientId = activeChat.recipientId;
        }

        wsRef.current.send(JSON.stringify(messageData));

        setInputValue('');
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderMessage = (message: Message, index: number) => {
        const isOwnMessage = currentUser && message.sender === currentUser.id;

        return (
            <div
                key={message._id || index}
                className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
            >
                <div className="message-content">
                    {!isOwnMessage && <div className="message-sender">{message.senderUsername}</div>}
                    <div className="message-bubble">
                        <p>{message.content}</p>
                    </div>
                    <div className="message-time">{formatTime(message.createdAt)}</div>
                </div>
            </div>
        );
    };

    if (!currentUser) {
        return (
            <div className="loading-container">
                <div className="loading-spinner-large"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="chat-container">
            <Sidebar token={token!} activeChat={activeChat} onChatSelect={setActiveChat} />

            <div className="chat-main">
                {/* Header */}
                <header className="chat-header">
                    <div className="header-left">
                        <div className="header-info">
                            <h1>{activeChat ? activeChat.name : 'Select a chat'}</h1>
                            {activeChat && activeChat.type === 'room' && (
                                <span className="room-number">#{activeChat.roomNumber}</span>
                            )}
                            <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                                <span className="status-dot"></span>
                                {isConnected ? 'Connected' : 'Reconnecting...'}
                            </span>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="user-info">
                            <span className="user-avatar">{currentUser.username.charAt(0).toUpperCase()}</span>
                            <span className="user-name">{currentUser.username}</span>
                        </div>
                        <button onClick={logout} className="logout-button">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Messages */}
                {!activeChat ? (
                    <main className="chat-messages">
                        <div className="empty-state">
                            <div className="empty-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </div>
                            <h2>Welcome to Chat App</h2>
                            <p>Select a room or start a direct message to begin chatting</p>
                        </div>
                    </main>
                ) : (
                    <>
                        <main className="chat-messages">
                            {messages.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                    </div>
                                    <h2>No messages yet</h2>
                                    <p>Start the conversation by sending a message!</p>
                                </div>
                            ) : (
                                <div className="messages-list">
                                    {messages.map(renderMessage)}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </main>

                        {/* Input */}
                        <footer className="chat-input">
                            <form onSubmit={handleSubmit}>
                                <div className="input-wrapper">
                                    <textarea
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message..."
                                        rows={1}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputValue.trim() || !isConnected}
                                        className="send-button"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                    </button>
                                </div>
                            </form>
                        </footer>
                    </>
                )}
            </div>
        </div>
    );
};
