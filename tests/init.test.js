/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').default;
const got = require('got');
const listen = require('test-listen');
const Source = require('../src/models/source');
const app = require('../src/index');
const { jwtSign } = require('../src/utilities/authentication/helpers');

test.before(async (t) => {
  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
  t.context.got = got.extend({
    http2: true,
    throwHttpErrors: false,
    responseType: 'json',
    prefixUrl: t.context.prefixUrl,
  });
});

test.after.always((t) => {
  t.context.server.close();
});

// test('GET /statistics returns correct response and status code', async (t) => {
//   const { body, statusCode } = await t.context.got('general/statistics');
//   //t.is(body.sources, 1);
//   t.assert(body.success);
//   t.is(statusCode, 200);
// });

// test('GET /sources returns correct response and status code', async (t) => {
//   const token = jwtSign({ id: 1 });
//   const { statusCode } = await t.context.got(`sources/sources?token=${token}`);
//   t.is(statusCode, 200);
// });
test('GET /sources returns sources', async (t) => {
  const token = jwtSign({ id: 1});
  const  id = 1;
  console.warn('test id:', id);
  const owner = mongoose.Types.ObjectId(id);
  await Source.create({
    name: 'name',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: owner
  });
  const sources = await Source.find({ name: 'name' });
  console.warn(sources);
  console.warn('testHash:', owner);
  const { statusCode, body } = await t.context.got(
    `sources/sources?token=${token}`
  );
  console.warn(body, statusCode);

  t.is(statusCode, 200);
});
// test('GET /sources with invalid token returns 403 status code', async (t) => {
//   const token = '123';
//   const { statusCode } = await t.context.got(`sources/sources?token=${token}`);
//   t.is(statusCode, 403);
// });
// test('POST /create-source returns correct response and status code', async (t) => {
//   const token = jwtSign({ id: 1 });

//   const api = await t.context.got.extend({
//     responseType: 'json',
//   });

//   const body = new Source({ name: 'Name' });
//   const { statusCode } = await api(`sources/create-source?token=${token}`, {
//     method: 'POST',
//     json: body,
//   });
//   t.is(statusCode, 200);
// });
// test('POST /create-source with invalid token returns 403', async (t) => {
//   const token = '123';

//   const api = await t.context.got.extend({
//     responseType: 'json',
//   });

//   const body = new Source({ name: 'Name' });
//   const { statusCode } = await api(`sources/create-source?token=${token}`, {
//     method: 'POST',
//     json: body,
//   });
//   t.is(statusCode, 403);
// });
// test('POST /delete-source returns correct response and status code', async (t) => {
//   const token = jwtSign({ id: 1 });

//   const api = await t.context.got.extend({
//     responseType: 'json',
//   });

//   const body = { id: 0 };
//   const { statusCode } = await api(`sources/delete-source?token=${token}`, {
//     method: 'POST',
//     json: body,
//   });
//   t.is(statusCode, 200);
// });
// test('POST /delete-source with invalid token returns 403', async (t) => {
//   const token = '123';

//   const api = await t.context.got.extend({
//     responseType: 'json',
//   });

//   const body = { id: 1 };
//   const { statusCode } = await api(`sources/delete-source?token=${token}`, {
//     method: 'POST',
//     json: body,
//   });
//   t.is(statusCode, 403);
// });
