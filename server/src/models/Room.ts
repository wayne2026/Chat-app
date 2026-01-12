import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
    name: string;
    roomNumber: string;
    creator: mongoose.Types.ObjectId;
    members: mongoose.Types.ObjectId[];
    createdAt: Date;
}

const roomSchema = new Schema<IRoom>({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    roomNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const Room = mongoose.model<IRoom>('Room', roomSchema);
