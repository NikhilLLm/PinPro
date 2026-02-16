
import { Schema, model, models } from "mongoose";

export interface ChatHistory {
    user_id: string;
    role: "user" | "assistant";
    context: string;
    createdAt: Date;
    updatedAt: Date;
}


const chatHistorySchema = new Schema<ChatHistory>({
    user_id: { type: String, required: true },   //this must be from the user schema 
    role: { type: String, required: true },
    context: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

const ChatHistory = models?.ChatHistory || model<ChatHistory>("ChatHistory", chatHistorySchema)

export default ChatHistory