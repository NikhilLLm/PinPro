import mongoose, { Schema, Document } from 'mongoose';
import { LayoutDefinition } from '@/types/llm-json';

export interface ILayoutTemplate extends Document, Omit<LayoutDefinition, 'id'> {
    createdAt: Date;
    updatedAt: Date;
}

const LayoutZoneSchema = new Schema({
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    role: {
        type: String,
        enum: ['hook', 'subheading', 'body', 'tip', 'cta', 'label', 'step', 'column', 'center', 'annotation'],
        required: true
    },
    index: { type: Number }
}, { _id: false });

const LayoutTemplateSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    layoutType: {
        type: String,
        required: true,
        enum: ['classic', 'overlay', 'split', 'three_column', 'two_col_list', 'card_grid', 'step_grid', 'magazine', 'bottom_heavy', 'radial', 'annotated', 'custom']
    },
    columnCount: { type: Number, required: true },
    rowCount: { type: Number },

    // Dynamic zones
    zones: {
        type: Map,
        of: LayoutZoneSchema,
        required: true
    },

    // Role mapping
    roleMap: {
        type: Map,
        of: [String]
    },

    recommendedStyle: { type: String, required: true },
    niche_tags: [String],
    content_tags: [String],
    source_url: { type: String },
    discovered: { type: Boolean, default: false },
    times_used: { type: Number, default: 0 }
}, {
    timestamps: true
});

// Index for niche searches
LayoutTemplateSchema.index({ niche_tags: 1 });
LayoutTemplateSchema.index({ layoutType: 1 });

export default mongoose.models.LayoutTemplate || mongoose.model<ILayoutTemplate>('LayoutTemplate', LayoutTemplateSchema);
