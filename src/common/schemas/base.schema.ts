import * as mongoose from 'mongoose';

export const BaseSchema = new mongoose.Schema(
  { deletedAt: { type: Date, default: null } },
  { timestamps: true },
);
