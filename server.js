require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // サーバー関連
    GatewayIntentBits.GuildMessages, // チャンネル内メッセージ
    GatewayIntentBits.MessageContent, // メッセージ本文を読む
    GatewayIntentBits.DirectMessages // DMのメッセージも拾う
  ],
});

client.once("ready", () => {
  console.log(`🤖 Discord Bot起動完了！ログイン中: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  // Bot自身や他のBotは無視
  if (message.author.bot) return;

  // 画像＋テキスト or どちらかだけ
  const text = message.content.trim();
  const hasImage = message.attachments.size > 0;

  console.log("🟦 質問を受信");
  console.log("👤 ユーザーID:", message.author.id);
  console.log("📝 内容:", text || "(テキストなし)");
  console.log("🖼 添付画像:", hasImage ? message.attachments.first().url : "なし");

  // テスト返信
  await message.reply("こんにちは！質問を受け取りました 🙌");
});

client.login(process.env.DISCORD_BOT_TOKEN);