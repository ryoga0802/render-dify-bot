/** @format */

require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

function verifySlackSignature(req) {
  const slackSignature = req.headers["x-slack-signature"];
  const requestBody = JSON.stringify(req.body);
  const timestamp = req.headers["x-slack-request-timestamp"];
  const sigBaseString = `v0:${timestamp}:${requestBody}`;
  const hmac = crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET);
  hmac.update(sigBaseString);
  const mySignature = `v0=${hmac.digest("hex")}`;
  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(slackSignature)
  );
}

app.post("/slack/events", async (req, res) => {
  console.log("📥 Slackイベントを受信しました");
  console.log("🔍 リクエスト内容:", JSON.stringify(req.body, null, 2));

  if (!verifySlackSignature(req)) {
    console.error("🛑 署名検証に失敗しました");
    return res.status(400).send("Invalid signature");
  }

  if (req.body.type === "url_verification") {
    return res.send(req.body.challenge);
  }

  const event = req.body.event;
  console.log("🧩 eventオブジェクト:", event);
  console.log("📎 event.type:", event?.type);

  if (event && event.type === "app_mention") {
    console.log("🚀 app_mention を検出！");

    try {
      // メンション除去：「<@Uxxxxxxx> あああ」→「あああ」
      const cleanedText = event.text.replace(/<@[^>]+>\s*/, "");

      const message = {
        channel: event.channel,
        text: `こんにちは！受信しました：「${cleanedText}」`,
      };

      console.log("📤 Slackへ送信開始");

      const response = await axios.post("https://slack.com/api/chat.postMessage", message, {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      console.log("✅ Slackへの返信に成功！レスポンス:", response.data);
    } catch (err) {
      console.error("❌ Slackへの返信に失敗：", err.response?.data || err.message);
      console.error("🐞 フルエラー詳細：", JSON.stringify(err, null, 2));
    }

    return res.status(200).send("OK");
  }

  return res.status(200).send("No action");
});

app.listen(port, () => {
  console.log(`Bot is running on port ${port}`);
});