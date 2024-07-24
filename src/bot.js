const fastifyPlugin = require("fastify-plugin");
const { Telegraf } = require("telegraf");
const { message } = require("telegraf/filters");
const jws = require("jws");
const url = require('url')

function init_bot(app) {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  const games = {
    booling: (token) =>
      `https://witgs-threejs.netlify.app/?mode=prod&token=${token}&server=${process.env.VERCEL_URL}#splashscreen_bowling`,
    tapgame_a: (token) =>
      `https://witgs-threejs.netlify.app/?mode=prod&token=${token}&server=${process.env.VERCEL_URL}#minigame_a`,
  };

  bot.start((ctx) => ctx.reply("Welcome"));
  bot.help((ctx) => ctx.reply("Send me a sticker"));
  bot.on(message("sticker"), (ctx) => ctx.reply("👍"));
  bot.hears("hi", (ctx) => ctx.reply("Hey there"));

  const inlineAnswer = [];
  for (const k in games) {
    inlineAnswer.push({
      type: "game",
      id: k,
      game_short_name: k,
    });
  }

  bot.on("inline_query", async (ctx) => {
    const query = ctx.inlineQuery.query;
    return await ctx.answerInlineQuery(inlineAnswer);
  });

  bot.gameQuery((ctx) => {
    const game = ctx.callbackQuery.game_short_name;
    const token = jws.sign({
      header: { alg: "HS512" },
      payload: {
        game: game,
        user: ctx.from.id,
        imessage: ctx.callbackQuery.inline_message_id,
        message: (ctx.callbackQuery.message || {}).message_id,
        chat: (ctx.chat || {}).id,
      },
      secret: process.env.SIGN_SECRET,
    });
    const gamefunc = games[game];
    if (!gamefunc) {
        const err = `No game ${game} found`;
        console.error(err);
        throw new Error(err);
    }
    const gameurl = gamefunc(token)
    ctx.answerGameQuery(gameurl);
  });

  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  app.decorate("bot", bot);

  return bot;
}

function init_score(app, bot) {
  const check_token = (request, reply) => {
    const token = request.query.token;
    if (!jws.verify(token, "HS512", process.env.SIGN_SECRET)) {
      return reply.code(403).send("wrong token");
    }
    request.game_body = JSON.parse(jws.decode(token).payload);

    return null;
  };

  app.get("/score", (request, reply) => {
    if (check_token(request, reply)) {
      return;
    }

    const { user, imessage, chat, message } = request.game_body;
    bot.telegram
      .getGameHighScores(user, imessage, chat, message)
      .then((scores) => {
        reply.send(scores);
      })
      .catch((err) => {
        console.log(err);
        reply.code(500).send(err);
      });
  });
  app.post("/score", (request, reply) => {
    if (check_token(request, reply)) {
      return;
    }

    console.log(request.body);
    const scoreValue = parseInt(request.body.score ?? 0);
    if (scoreValue <= 0) {
      return reply.code(400).send("score can't be negative");
    }
    const { user, imessage, chat, message } = request.game_body;
    bot.telegram
      .setGameScore(user, scoreValue, imessage, chat, message, true)
      .then(() => {
        reply.send();
      })
      .catch((err) => {
        reply.code(err.code || 500).send(err);
      });
  });
  app.options("/score", (request, reply) => {
    reply.send();
  });
}

module.exports = fastifyPlugin(async (app) => {
  const bot = init_bot(app);
  init_score(app, bot);
});
