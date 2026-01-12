export interface User {
    id: string;
    username: string;
    email: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface Message {
    id: string;
    sender: string;
    senderId: string;
    content: string;
    room: string;
    timestamp: Date;
    isStreaming?: boolean;
}

export interface ChatMessage {
    type: 'message' | 'join' | 'leave' | 'typing' | 'stop_typing' | 'error' | 'stream_start' | 'stream_chunk' | 'stream_end';
    content?: string;
    sender?: string;
    senderId?: string;
    room?: string;
    timestamp?: Date;
    messageId?: string;
}
