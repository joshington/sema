
import { Bot } from "grammy";
import { connectDB } from "../db/mongodb.js";
import { TelegramUser } from "../models/TelegramUser.js";

export function createBot(token: string) {
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    const from = ctx.from;
    const chat = ctx.chat;

    if (!from || !chat) return;

    await connectDB();

    await TelegramUser.findOneAndUpdate(
      { telegramId: String(from.id) },
      {
        telegramId: String(from.id),
        chatId: String(chat.id),
        firstName: from.first_name,
        username: from.username,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    await ctx.reply(
      `Hi ${from.first_name}! 👋 Welcome to Sema.\n\n` +
        "Learn a new language, one chat at a time.\n\n" +
        "Are you here as a parent or a learner?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "👨‍👩‍👧 I'm a parent", callback_data: "role:parent" },
              { text: "📚 I'm a learner", callback_data: "role:learner" },
            ],
          ],
        },
      }
    );
  });

  bot.callbackQuery(/^role:(parent|learner)$/, async (ctx) => {
    const role = ctx.match[1];

    await connectDB();

    await TelegramUser.findOneAndUpdate(
      { telegramId: String(ctx.from.id) },
      { role },
      { new: true }
    );

    await ctx.answerCallbackQuery();

    if (role === "parent") {
      await ctx.editMessageText(
        "Great! Let's set up your family learning account.\n\n" +
          "Next, you'll be able to add up to 3 children."
      );
    } else {
      await ctx.editMessageText(
        "Welcome, learner! 🎉\n\n" +
          "Your parent can help set up your learning profile."
      );
    }
  });

  bot.catch((error) => {
    console.error("Telegram bot error:", error);
  });

  return bot;
}