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

app.addHook('preHandler', (req, res, done) => {

  // example logic for conditionally adding headers
  const allowedPaths = [ "/score" ];
  if (allowedPaths.includes(req.routerPath)) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST,GET");
    res.header("Access-Control-Allow-Headers",  "*");
  }

  const isPreflight = /options/i.test(req.method);
  if (isPreflight) {
    return res.send();
  }

  done();
})

module.exports = async (req, res) => {
  await app.ready();
  app.server.emit('request', req, res);
}
