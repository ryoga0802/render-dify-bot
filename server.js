const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const bodyParser = require("body-parser");
const app = express();
const port = process.env.PORT || 3000;

// 👇 raw body を取得するためのミドルウェア
app.use(
  "/slack/events",
  bodyParser.raw({ type: "*/*" }) // ← これ重要！
);

// 👇署名検証（rawBodyで判定）
function verifySlackSignature(req) {
  const slackSignature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const rawBody = req.body.toString("utf8");

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    console.error("🕒 署名が古すぎます");
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET);
  hmac.update(sigBaseString);
  const mySignature = `v0=${hmac.digest("hex")}`;

  const isValid = crypto.timingSafeEqual(
    Buffer.from(mySignature, "utf8"),
    Buffer.from(slackSignature, "utf8")
  );

  if (!isValid) {
    console.error("🛑 署名検証に失敗しました");
  }

  return isValid;
}

// 👇Slackイベントハンドラ
app.post("/slack/events", async (req, res) => {
  res.status(200).send("OK");

  if (!verifySlackSignature(req)) {
    return;
  }

  // 👇 rawをJSONに戻す
  const body = JSON.parse(req.body.toString("utf8"));
  const event = body.event;

  if (event?.type === "app_mention") {
    const cleanedText = event.text.replace(/<@[^>]+>\s*/, "");
    const message = {
      channel: event.channel,
      text: `こんにちは！受信しました：「${cleanedText}」`,
    };

    await axios.post("https://slack.com/api/chat.postMessage", message, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Slackへの返信完了");
  }
});

app.listen(port, () => {
  console.log(`Bot is running on port ${port}`);
});