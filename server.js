require("dotenv").config();

const { Client, GatewayIntentBits, Partials, Events } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages // ← DMに反応するために必須
  ],
  partials: [Partials.Channel] // ← DMチャンネルは"partial"だからこれも必要！
});

client.once(Events.ClientReady, () => {
  console.log(`🤖 Discord Bot起動完了！ログイン中: ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Bot自身の発言には反応しない
  if (message.author.bot) return;

  console.log("📥 メッセージ受信");
  console.log(`👤 From: ${message.author.tag}`);
  console.log(`📄 内容: ${message.content}`);
  console.log(`📍 チャンネルタイプ: ${message.channel.type}`);

  try {
    await message.reply("こんにちは！質問を受け取りました 🙌");
    console.log("✅ 返信完了");
  } catch (err) {
    console.error("❌ 返信エラー:", err);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);