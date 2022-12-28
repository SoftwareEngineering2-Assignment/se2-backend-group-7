/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').serial;
const got = require('got');
const listen = require('test-listen');
const Source = require('../src/models/source');
const app = require('../src/index');
const User = require('../src/models/user');
const { jwtSign } = require('../src/utilities/authentication/helpers');
let user;
const sinon = require('sinon');

test.before(async (t) => {
  t.context.server = http.createServer(app);
  t.context.prefixUrl = await listen(t.context.server);
  t.context.got = got.extend({
    http2: true,
    throwHttpErrors: false,
    responseType: 'json',
    prefixUrl: t.context.prefixUrl,
  });
  user = await User.create({
    username: 'user',
    password: 'password',
    email: 'email',
  });
});

test.after.always((t) => {
  t.context.server.close();
  User.findByIdAndDelete(user._id);
});
test.beforeEach(() => {
  sinon.resetHistory();
  sinon.restore(); // the clears the sandbox of all created fakes, stubs, etc
  sinon.reset(); // resets fakes in the "new"/restored sandbox
});
