const fastifyPlugin = require('fastify-plugin')

module.exports = fastifyPlugin(async (app) => {
    if (process.env.VERCEL_URL) {
        const webhook = await app.bot.createWebhook({ domain: process.env.VERCEL_URL })
        const webhookPath = `/telegraf/${app.bot.secretPathComponent()}`
        app.post(webhookPath, (req, rep) => webhook(req.raw, rep.raw))
    } else {
        app.bot.launch();
    }
})
