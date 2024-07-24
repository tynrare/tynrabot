require("dotenv").config();
const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const express = require("express");
const jws = require("jws");
const bodyParser = require('body-parser')

const games = {
  booling: (token) =>
    `https://witgs-threejs.netlify.app/?mode=prod&token=${token}#splashscreen_bowling`,
};

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.start((ctx) => ctx.reply("Welcome"));
bot.help((ctx) => ctx.reply("Send me a sticker"));
bot.on(message("sticker"), (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));

const inlineAnswer = [
];
for (const k in games) {
	inlineAnswer.push({
		type: "game",
		id: k,
		game_short_name: k
	});
}

bot.on("inline_query", async (ctx) => {
  const query = ctx.inlineQuery.query;
  return await ctx.answerInlineQuery(inlineAnswer);
});

bot.gameQuery((ctx) => {
	const game = games[ctx.callbackQuery.game_short_name];
	  const token = jws.sign({
    header: { alg: 'HS512' },
    payload: {
      game: game,
      user: ctx.from.id,
      imessage: ctx.callbackQuery.inline_message_id,
      message: (ctx.callbackQuery.message || {}).message_id,
      chat: (ctx.chat || {}).id
    },
    secret: process.env.SIGN_SECRET
  })
  ctx.answerGameQuery(games[game](token));
});

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Listening on port", PORT));
const score = app.route("/score");
score.all((req, res, next) => {
  const token = url.parse(req.headers.referer).query.slice(6)
  if (!jws.verify(token, 'HS512', process.env.SIGN_SECRET)) {
    res.statusCode = 403
    return res.end()
  }
  req.game_body = JSON.parse(jws.decode(token).payload)
  next()
})
score.all(bodyParser.json())
score.get((req, res) => {
  const { user, imessage, chat, message } = req.game_body
  bot.telegram.getGameHighScores(user, imessage, chat, message)
    .then((scores) => {
      res.setHeader('content-type', 'application/json')
      res.statusCode = 200
      res.end(JSON.stringify(scores, null, true))
    })
    .catch((err) => {
      console.log(err)
      res.statusCode = 500
      res.end()
    })
})
score.post((req, res) => {
  const scoreValue = parseInt(req.body.score)
  if (scoreValue <= 0) {
    res.statusCode = 400
    return res.end()
  }
  const { user, imessage, chat, message } = req.game_body
  telegram.setGameScore(user, scoreValue, imessage, chat, message, true)
    .then(() => {
      res.statusCode = 200
      res.end()
    })
    .catch((err) => {
      res.statusCode = err.code || 500
      res.end(err.description)
    })
})

async function main() {
  if (process.env.NODE_ENV === "production") {
    const domain = "example.com";
    app.use(await bot.createWebhook({ domain }));
  } else {
    bot.launch();
  }

  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main();
