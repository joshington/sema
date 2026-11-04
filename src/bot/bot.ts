
import { Bot, InlineKeyboard } from "grammy";
import { connectDB } from "../db/mongodb.js";
import { TelegramUser } from "../models/TelegramUser.js";

const languages = ["Kiswahili", "French", "German"] as const;

export function createBot(token: string) {
  const bot = new Bot(token);

  // Start / restart the bot
  bot.command("start", async (ctx) => {
    await connectDB();

    const from = ctx.from;
    const chat = ctx.chat;

    if (!from || !chat) return;

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
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    const keyboard = new InlineKeyboard()
      .text("👨‍👩‍👧 I'm a parent", "role:parent")
      .row()
      .text("📚 I'm a learner", "role:learner");

    await ctx.reply(
      "👋 Welcome to Sema!\n\n" +
        "Learn a new language, one chat at a time.\n\n" +
        "Are you here as a parent or a learner?",
      { reply_markup: keyboard }
    );
  });

  // Parent / learner selection
  bot.callbackQuery(/^role:(parent|learner)$/, async (ctx) => {
    await ctx.answerCallbackQuery();

    try {
      await connectDB();

      const role = ctx.match[1];

      const user = await TelegramUser.findOneAndUpdate(
        { telegramId: String(ctx.from.id) },
        {
          role,
          onboardingStep: role === "parent" ? "parent_name" : "learner_info",
        },
        { returnDocument: "after" }
      );

      if (!user) {
        await ctx.reply("Please send /start first.");
        return;
      }

      if (role === "parent") {
        await ctx.reply(
          "Great! Let's set up your family account. 👨‍👩‍👧‍👦\n\n" +
            "What is your name?"
        );
      } else {
        await ctx.reply(
          "Welcome, learner! 🎉\n\n" +
            "Please ask your parent to set up your learning profile."
        );
      }
    } catch (error) {
      console.error("Role selection error:", error);
      await ctx.reply("Something went wrong. Please try /start again.");
    }
  });

  // Number of children
  bot.callbackQuery(/^children:(\d)$/, async (ctx) => {
    await ctx.answerCallbackQuery();

    try {
      await connectDB();

      const count = Number(ctx.match[1]);

      if (count < 1 || count > 3) {
        await ctx.reply("Please choose between 1 and 3 children.");
        return;
      }

      await TelegramUser.findOneAndUpdate(
        { telegramId: String(ctx.from.id) },
        {
          childCount: count,
          children: [],
          onboardingStep: "child_name",
        }
      );

      await ctx.reply(
        "Let's add your first child.\n\nWhat is your child's name?"
      );
    } catch (error) {
      console.error("Child count error:", error);
      await ctx.reply("Something went wrong. Please try again.");
    }
  });

  // Language selection for the current child
  bot.callbackQuery(/^language:(Kiswahili|French|German)$/, async (ctx) => {
    await ctx.answerCallbackQuery();

    try {
      await connectDB();

      const language = ctx.match[1];

      const user = await TelegramUser.findOne({
        telegramId: String(ctx.from.id),
      });

      if (!user || user.onboardingStep !== "child_language") {
        await ctx.reply("Please complete the previous step first.");
        return;
      }

      user.children.push({
        name: user.pendingChildName,
        age: user.pendingChildAge,
        language,
      });

      delete user.pendingChildName;
      delete user.pendingChildAge;

      if (user.children.length < (user.childCount ?? 1)) {
        user.onboardingStep = "child_name";
        await user.save();

        await ctx.reply(
          `✅ Child added!\n\nLet's add child ${user.children.length + 1}.\n\nWhat is their name?`
        );
      } else {
        user.onboardingStep = "completed";
        user.trialStartedAt = new Date();
        user.trialEndsAt = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        await user.save();

        await ctx.reply(
          "🎉 Your Sema family account is ready!\n\n" +
            user.children
              .map(
                (child: { name: string; age: number; language: string }) =>
                  `👤 ${child.name}, age ${child.age}\n🌍 ${child.language}`
              )
              .join("\n\n") +
            "\n\nYour 7-day free trial has started!\n\n" +
            "We'll help your children learn a new language, one chat at a time."
        );
      }
    } catch (error) {
      console.error("Language selection error:", error);
      await ctx.reply("Something went wrong. Please try again.");
    }
  });

  // Handle text answers according to onboarding step
  bot.on("message:text", async (ctx) => {
    try {
      await connectDB();

      const user = await TelegramUser.findOne({
        telegramId: String(ctx.from.id),
      });

      if (!user) {
        await ctx.reply("Please send /start to begin.");
        return;
      }

      const text = ctx.message.text.trim();

      if (user.onboardingStep === "parent_name") {
        user.parentName = text;
        user.onboardingStep = "child_count";
        await user.save();

        const keyboard = new InlineKeyboard()
          .text("1 child", "children:1")
          .text("2 children", "children:2")
          .text("3 children", "children:3");

        await ctx.reply(
          `Nice to meet you, ${text}!\n\nHow many children would you like to enroll?`,
          { reply_markup: keyboard }
        );
      } else if (user.onboardingStep === "child_name") {
        user.pendingChildName = text;
        user.onboardingStep = "child_age";
        await user.save();

        await ctx.reply(`How old is ${text}? Please enter their age.`);
      } else if (user.onboardingStep === "child_age") {
        const age = Number(text);

        if (!Number.isInteger(age) || age < 3 || age > 18) {
          await ctx.reply("Please enter a valid age between 3 and 18.");
          return;
        }

        user.pendingChildAge = age;
        user.onboardingStep = "child_language";
        await user.save();

        const keyboard = new InlineKeyboard()
          .text("Kiswahili", "language:Kiswahili")
          .row()
          .text("French", "language:French")
          .row()
          .text("German", "language:German");

        await ctx.reply(
          `Which language would you like ${user.pendingChildName} to learn?`,
          { reply_markup: keyboard }
        );
      } else if (user.onboardingStep === "completed") {
        await ctx.reply(
          "Your family account is set up! Lessons will be available soon. 🎉"
        );
      }
    } catch (error) {
      console.error("Onboarding message error:", error);
      await ctx.reply("Something went wrong. Please try again.");
    }
  });

  bot.catch((error) => {
    console.error("Telegram bot error:", error);
  });

  return bot;
}