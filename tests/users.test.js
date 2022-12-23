/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').default;
const got = require('got');
const listen = require('test-listen');

const app = require('../src/index');
//const {jwtSign} = require('../src/utilities/authentication/helpers');
const {comparePassword} = require('../src/utilities/authentication/helpers');
const {passwordDigest} = require('../src/utilities/authentication/helpers');


test.before(async (t) => {
  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
  t.context.got = got.extend({http2: true, throwHttpErrors: false, responseType: 'json', prefixUrl: t.context.prefixUrl});
});

test.after.always((t) => {
  t.context.server.close();
});


test('GET /users returns correct response and status code', async (t) => {
   // const token = jwtSign({id: 1});
   
    const cPW = comparePassword({dgrt,ptpr});
    const pD =  passwordDigest({dgrt,ptpr});
    const {statusCode} = await t.context.got(`users?token=${token}`);
    t.is(statusCode, 200);
  });
  
  