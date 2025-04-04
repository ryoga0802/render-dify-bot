/** @format */

require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Slack署名検証（timestamp検証付き）
function verifySlackSignature(req) {
  const slackSignature = req.headers["x-slack-signature"];
  const requestBody = JSON.stringify(req.body);
  const timestamp = req.headers["x-slack-request-timestamp"];

  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    console.error("🕒 署名が古すぎます");
    return false;
  }

  const sigBaseString = `v0:${timestamp}:${requestBody}`;
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

// メインのエンドポイント
app.post("/slack/events", (req, res) => {
  console.log("📥 Slackイベントを受信しました");

  // URL確認イベント（最初の1回だけ）
  if (req.body.type === "url_verification") {
    console.log("🌐 URL検証リクエスト");
    return res.send(req.body.challenge);
  }

  // まずすぐ200返す（再送対策）
  res.status(200).send("OK");

  // 検証（200返したあとにするのがコツ）
  if (!verifySlackSignature(req)) {
    console.log("🚫 無効な署名でした（でもSlackにはOK返してる）");
    return;
  }

  const event = req.body.event;

  if (event?.type === "app_mention") {
    console.log("🚀 メンションイベント検出");

    const cleanedText = event.text.replace(/<@[^>]+>\s*/, "");

    const message = {
      channel: event.channel,
      text: `こんにちは！受信しました：「${cleanedText}」`,
    };

    axios
      .post("https://slack.com/api/chat.postMessage", message, {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      })
      .then((response) => {
        console.log("✅ Slackへの返信成功:", response.data);
      })
      .catch((err) => {
        console.error("❌ Slackへの返信失敗:", err.response?.data || err.message);
      });
  } else {
    console.log("⚠️ 未対応のイベントタイプ:", event?.type);
  }
});

app.listen(port, () => {
  console.log(`Bot is running on port ${port}`);
});