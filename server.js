require('dotenv').config(); // ← .env 読み込み

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Slack署名検証（セキュリティ用）
function verifySlackSignature(req) {
  const slackSignature = req.headers['x-slack-signature'];
  const requestBody = JSON.stringify(req.body);
  const timestamp = req.headers['x-slack-request-timestamp'];
  const sigBaseString = `v0:${timestamp}:${requestBody}`;
  const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET);
  hmac.update(sigBaseString);
  const mySignature = `v0=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature));
}

// Slackイベント受信エンドポイント
app.post('/slack/events', async (req, res) => {
  if (!verifySlackSignature(req)) {
    return res.status(400).send('Invalid signature');
  }

  const event = req.body.event;

  // SlackのURL確認用イベント
  if (req.body.type === 'url_verification') {
    return res.send(req.body.challenge);
  }

  // メンションイベントが来たら返信（テスト用）
  if (event && event.type === 'app_mention') {
    const message = {
      channel: event.channel,
      text: `こんにちは！受信しました：${event.text}`,
    };

    await axios.post('https://slack.com/api/chat.postMessage', message, {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    return res.status(200).send('OK');
  }

  res.status(200).send('No action');
});

app.listen(port, () => {
  console.log(`Bot is running on port ${port}`);
});