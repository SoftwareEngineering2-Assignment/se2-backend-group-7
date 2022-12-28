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
// GET STATISTICS
test('GET /statistics returns correct response and status code', async (t) => {
  const { body, statusCode } = await t.context.got('general/statistics');
    // Assert that the request is successful from body
  t.assert(body.success);
    // Assert that the status code of the response is 200
  t.is(statusCode, 200);
});
// GET STATISTICS ERROR
test('GET /statistics returns correct response and status code for error', async (t) => {
  const findStub = sinon
  .stub(Source, 'countDocuments')
  .throws(new Error('Something went wrong'));
  // Send a GET request to the /sources route with the token as a query parameter
  const { body, statusCode } = await t.context.got('general/statistics');
  // Assert that the status code of the response is 404
  t.is(statusCode, 404);
  ;
  findStub.restore();
});

// GET TEST-URL
test('GET /test-url returns correct status code', async (t) => {
  const { body, statusCode } = await t.context.got('general/test-url');
    // Assert that the status code of the response is 200
  t.is(statusCode, 200);
});

// GET TEST-URL ERROR
test('GET /test-url returns correct status code for error', async (t) => {
  const findStub = sinon
  .stub(Source, 'countDocuments')
  .throws(new Error('Something went wrong'));
  // Send a GET request to the /sources route with the token as a query parameter
  const { body, statusCode } = await t.context.got('general/test-url');
  // Assert that the status code of the response is 404
  t.is(statusCode, 404);
  ;
  findStub.restore();
});