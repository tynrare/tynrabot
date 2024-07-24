const Fastify = require('fastify')
require('dotenv').config()

const app = Fastify({ logger: true })
app.register(require('../src/bot'))
app.register(require('../src/webhook'))
app.get('/',  (req, rep) => rep.send(
  'https://t.me/tynrabot\n' +
  'https://github.com/tynrare/tynrabot\n'
))

app.get("/ping", (request, reply) => {
	reply.send("pong");
});

module.exports = async (req, res) => {
  await app.ready();
  app.server.emit('request', req, res);
}
