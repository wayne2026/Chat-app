import React, { useState, useEffect } from 'react';
import './Sidebar.css';

interface Room {
    _id: string;
    name: string;
    roomNumber: string;
}

interface Conversation {
    conversationId: string;
    otherUser: {
        id: string;
        username: string;
        email: string;
    };
}

interface ActiveChat {
    type: 'room' | 'dm';
    id: string;
    name: string;
    roomNumber?: string;
    recipientId?: string;
}

interface SidebarProps {
    token: string;
    activeChat: ActiveChat | null;
    onChatSelect: (chat: ActiveChat) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ token, activeChat, onChatSelect }) => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [showCreateRoom, setShowCreateRoom] = useState(false);
    const [showStartDM, setShowStartDM] = useState(false);
    const [showJoinRoom, setShowJoinRoom] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [roomNumber, setRoomNumber] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchChatList();
    }, []);

    const fetchChatList = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/messages/getChatList', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (res.ok) {
                const data = await res.json();
                setRooms(data.rooms);
                setConversations(data.conversations);
            }
        } catch (error) {
            console.error('Failed to fetch chat list:', error);
        }
    };

    const handleCreateRoom = async () => {
        if (!roomName.trim()) return;

        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/rooms/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, name: roomName.trim() })
            });

            const data = await res.json();
            if (res.ok) {
                setRooms(prev => [data.room, ...prev]);
                onChatSelect({
                    type: 'room',
                    id: data.room._id,
                    name: data.room.name,
                    roomNumber: data.room.roomNumber
                });
                setShowCreateRoom(false);
                setRoomName('');
            } else {
                setError(data.message);
            }
        } catch (error) {
            setError('Failed to create room');
        }
    };

    const handleJoinRoom = async () => {
        if (!roomNumber.trim()) return;

        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/rooms/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, roomNumber: roomNumber.trim() })
            });

            const data = await res.json();
            if (res.ok) {
                const existingRoom = rooms.find(r => r._id === data.room._id);
                if (!existingRoom) {
                    setRooms(prev => [data.room, ...prev]);
                }
                onChatSelect({
                    type: 'room',
                    id: data.room._id,
                    name: data.room.name,
                    roomNumber: data.room.roomNumber
                });
                setShowJoinRoom(false);
                setRoomNumber('');
            } else {
                setError(data.message);
            }
        } catch (error) {
            setError('Failed to join room');
        }
    };

    const handleStartDM = async () => {
        if (!recipientEmail.trim()) return;

        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/conversations/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, recipientEmail: recipientEmail.trim() })
            });

            const data = await res.json();
            if (res.ok) {
                onChatSelect({
                    type: 'dm',
                    id: data.conversation.conversationId,
                    name: data.conversation.recipientUsername,
                    recipientId: data.conversation.recipientId
                });
                setShowStartDM(false);
                setRecipientEmail('');
                fetchChatList(); // Refresh list
            } else {
                setError(data.message);
            }
        } catch (error) {
            setError('Failed to start conversation');
        }
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2>Chats</h2>
                <div className="new-chat-buttons">
                    <button className="new-chat-btn" onClick={() => setShowCreateRoom(true)}>
                        + Room
                    </button>
                    <button className="new-chat-btn" onClick={() => setShowJoinRoom(true)}>
                        Join
                    </button>
                    <button className="new-chat-btn" onClick={() => setShowStartDM(true)}>
                        + DM
                    </button>
                </div>
            </div>

            <div className="sidebar-content">
                {/* Rooms Section */}
                <div className="chat-section">
                    <div className="section-title">Rooms</div>
                    {rooms.length === 0 ? (
                        <div className="empty-state">No rooms yet</div>
                    ) : (
                        rooms.map(room => (
                            <div
                                key={room._id}
                                className={`chat-item ${activeChat?.type === 'room' && activeChat.id === room._id ? 'active' : ''}`}
                                onClick={() => onChatSelect({
                                    type: 'room',
                                    id: room._id,
                                    name: room.name,
                                    roomNumber: room.roomNumber
                                })}
                            >
                                <div className="chat-item-name">{room.name}</div>
                                <div className="chat-item-info">#{room.roomNumber}</div>
                            </div>
                        ))
                    )}
                </div>

                {/* Direct Messages Section */}
                <div className="chat-section">
                    <div className="section-title">Direct Messages</div>
                    {conversations.length === 0 ? (
                        <div className="empty-state">No conversations yet</div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.conversationId}
                                className={`chat-item ${activeChat?.type === 'dm' && activeChat.id === conv.conversationId ? 'active' : ''}`}
                                onClick={() => onChatSelect({
                                    type: 'dm',
                                    id: conv.conversationId,
                                    name: conv.otherUser.username,
                                    recipientId: conv.otherUser.id
                                })}
                            >
                                <div className="chat-item-name">{conv.otherUser.username}</div>
                                <div className="chat-item-info">{conv.otherUser.email}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Room Modal */}
            {showCreateRoom && (
                <div className="modal-overlay" onClick={() => setShowCreateRoom(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Create New Room</h3>
                        {error && <div className="error-message">{error}</div>}
                        <input
                            type="text"
                            className="modal-input"
                            placeholder="Room name..."
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            
                        />
                        <div className="modal-buttons">
                            <button className="modal-btn cancel" onClick={() => {
                                setShowCreateRoom(false);
                                setRoomName('');
                                setError('');
                            }}>
                                Cancel
                            </button>
                            <button
                                className="modal-btn confirm"
                                onClick={handleCreateRoom}
                                disabled={!roomName.trim()}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join Room Modal */}
            {showJoinRoom && (
                <div className="modal-overlay" onClick={() => setShowJoinRoom(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Join Room</h3>
                        {error && <div className="error-message">{error}</div>}
                        <input
                            type="text"
                            className="modal-input"
                            placeholder="Room number..."
                            value={roomNumber}
                            onChange={(e) => setRoomNumber(e.target.value.toUpperCase())}
                            
                        />
                        <div className="modal-buttons">
                            <button className="modal-btn cancel" onClick={() => {
                                setShowJoinRoom(false);
                                setRoomNumber('');
                                setError('');
                            }}>
                                Cancel
                            </button>
                            <button
                                className="modal-btn confirm"
                                onClick={handleJoinRoom}
                                disabled={!roomNumber.trim()}
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Start DM Modal */}
            {showStartDM && (
                <div className="modal-overlay" onClick={() => setShowStartDM(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Start Direct Message</h3>
                        {error && <div className="error-message">{error}</div>}
                        <input
                            type="email"
                            className="modal-input"
                            placeholder="User's email..."
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            
                        />
                        <div className="modal-buttons">
                            <button className="modal-btn cancel" onClick={() => {
                                setShowStartDM(false);
                                setRecipientEmail('');
                                setError('');
                            }}>
                                Cancel
                            </button>
                            <button
                                className="modal-btn confirm"
                                onClick={handleStartDM}
                                disabled={!recipientEmail.trim()}
                            >
                                Start
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
