
import mongoose, { Schema } from "mongoose";




const ChildSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    language: {
      type: String,
      enum: ["Kiswahili", "French", "German"],
      required: true,
    },
  },
  { _id: false }
);

const TelegramUserSchema = new Schema(
  {
    telegramId: {
      type: String,
      required: true,
      unique: true,
    },
    chatId: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
    },
    role: {
      type: String,
      enum: ["parent", "learner", "unknown"],
      default: "unknown",
    },
    onboardingStep: {
      type: String,
      default: "start",
    },
    parentName: String,
    childCount: Number,
    pendingChildName: String,
    pendingChildAge: Number,
    children: {
      type: [ChildSchema],
      default: [],
    },
    trialStartedAt: Date,
    trialEndsAt: Date,
  },
  { timestamps: true }
);

export const TelegramUser =
  mongoose.models.TelegramUser ||
  mongoose.model("TelegramUser", TelegramUserSchema);