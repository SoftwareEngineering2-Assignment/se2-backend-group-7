/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').serial;
const got = require('got');
const listen = require('test-listen');
const Source = require('../src/models/source');
const app = require('../src/index');
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
});

test.after.always((t) => {
  t.context.server.close();
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
  findStub.restore();
});

// GET TEST-URL
test('GET /test-url returns correct status code', async (t) => {
  const { body, statusCode } = await t.context.got(
    'general/test-url?url=https://www.google.gr'
  );
  // Assert that the status code of the response is 200
  t.is(statusCode, 200);
});
// GET TEST-URL ERROR
test('GET /test-url Returns 500 status and active: false on error', async (t, done) => {
  // Create a stub for the got.get method
  const gotStub = sinon
    .stub(got, 'get')
    .throws(new Error('Something went wrong'));
  // Make the got.get stub reject with an error
  const { body, statusCode } = await t.context.got(
    'general/test-url?url=http://thisurldoesnotexist'
  );

  t.is(body.status, 500);
  t.is(body.active, false);
  sinon.restore();
});
// GET TEST-URL-REQUEST GET
test('GET /test-url-request Sends GET request and returns response', async (t) => {
  // Send an HTTP GET request to the /test-url-request route
  const { statusCode } = await t.context.got.get(
    'general/test-url-request?url=https://www.google.gr&type=GET'
  );

  // Check that the status code of the response is 200
  t.is(statusCode, 200);
});
// GET TEST-URL-REQUEST POST
test('GET /test-url-request Sends POST request and returns response', async (t) => {
  // Send an HTTP GET request to the /test-url-request route
  const { statusCode } = await t.context.got.get(
    'general/test-url-request?url=https://www.google.gr&type=POST'
  );

  // Check that the status code of the response is 200
  t.is(statusCode, 200);
});
// GET TEST-URL-REQUEST PUT
test('GET /test-url-request Sends PUT request and returns response', async (t) => {
  // Send an HTTP GET request to the /test-url-request route
  const { statusCode } = await t.context.got.get(
    'general/test-url-request?url=https://www.google.gr&type=PUT'
  );

  // Check that the status code of the response is 200
  t.is(statusCode, 200);
});
// GET TEST-URL-REQUEST INVALID
test('GET /test-url-request Sends invalid request and returns response', async (t) => {
  // Send an HTTP GET request to the /test-url-request route
  const { body } = await t.context.got.get(
    'general/test-url-request?url=https://www.google.gr'
  );

  // Check that the status code of the response is 500
  t.is(body.status, 500);
});