
import "dotenv/config";
import Fastify from "fastify";
import { connectDB } from "./db/mongodb.js";
import { createBot } from "./bot/bot.js";

const app = Fastify({ logger: true });

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing");
}

const bot = createBot(token);

app.get("/health", async () => {
  return { status: "ok", service: "sema-api" };
});


async function start() {
  await connectDB();

  await app.listen({
    port: Number(process.env.PORT) || 3000,
    host: "0.0.0.0",
  });

  bot.start({
    onStart: (botInfo) => {
      console.log(`Sema bot running as @${botInfo.username}`);
    },
  }).catch((error) => {
    app.log.error(error, "Telegram polling failed");
  });
}



start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});