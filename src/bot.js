const fastifyPlugin = require('fastify-plugin')
const { Telegraf } = require('telegraf')
const { message } = require("telegraf/filters");
const jws = require("jws");


module.exports = fastifyPlugin(async (app) => {
    const bot = new Telegraf(process.env.BOT_TOKEN)

    const games = {
    booling: (token) =>
        `https://witgs-threejs.netlify.app/?mode=prod&token=${token}#splashscreen_bowling`,
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
    const game = games[ctx.callbackQuery.game_short_name];
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
    ctx.answerGameQuery(games[game](token));
    });

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'))
    process.once('SIGTERM', () => bot.stop('SIGTERM'))

    app.decorate('bot', bot)
})
