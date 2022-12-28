// /* eslint-disable import/no-unresolved */
// require('dotenv').config();

// const http = require('node:http');
// const test = require('ava').default;
// const got = require('got');
// const listen = require('test-listen');
// const app = require('../src/index');
// test.before(async (t) => {
//   t.context.server = http.createServer(app);
//   t.context.prefixUrl = await listen(t.context.server);
//   t.context.got = got.extend({
//     http2: true,
//     throwHttpErrors: false,
//     responseType: 'json',
//     prefixUrl: t.context.prefixUrl,
//   });
// });

// test.after.always((t) => {
//   t.context.server.close();
// });

