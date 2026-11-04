
import mongoose, { Schema } from "mongoose";

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
  },
  { timestamps: true }
);

export const TelegramUser =
  mongoose.models.TelegramUser ||
  mongoose.model("TelegramUser", TelegramUserSchema);