import { timeStamp } from "console";
import mongoose, { Schema, model, models } from "mongoose";



export const IMAGE_DIMENSIONS = {
    width: 1000,
    height: 1500,
} as const
export interface IImage {
    _id?: mongoose.Types.ObjectId;
    title: string;
    description: string;
    imageUrl: string;
    hashtags?: string[];
    transformation?: {
        height: number;
        width: number;
        quality?: number
    }
    createdAt?: Date;
    updatedAt?: Date
}



const imageSchema = new Schema<IImage>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    hashtags: { type: [String], default: [] },
    transformation: {
        height: { type: Number, default: IMAGE_DIMENSIONS.height },
        width: { type: Number, default: IMAGE_DIMENSIONS.width },
        quality: { type: Number, min: 1, max: 100 }

    }
}, { timestamps: true })

const Image = models?.Image || model<IImage>("Image", imageSchema);

export default Image