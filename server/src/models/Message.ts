import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    sender: mongoose.Types.ObjectId;
    senderUsername: string;
    content: string;
    room?: string; // For room messages
    recipient?: mongoose.Types.ObjectId; // For direct messages
    conversationId?: string; // Unique ID for DM conversations
    createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderUsername: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    room: {
        type: String
    },
    recipient: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    conversationId: {
        type: String,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for efficient queries
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
