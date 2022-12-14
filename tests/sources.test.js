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
// GET SOURCE

test('GET /sources returns error when ecountering error', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({ id: user._id });
  // Create a new source
  await Source.create({
    name: 'name',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });
  const findStub = sinon
    .stub(Source, 'find')
    .throws(new Error('Something went wrong'));
  // Send a GET request to the /sources route with the token as a query parameter
  const { statusCode } = await t.context.got(`sources/sources?token=${token}`);
  // Assert that the status code of the response is 404
  t.is(statusCode, 404);

  findStub.restore();
});
test('GET /sources returns sources when provided a valid token', async (t) => {
    sinon.resetHistory();
    // Create a JWT with the user's ID
    const token = jwtSign({ id: user._id });
    // Create a new source
    await Source.create({
      name: 'name',
      type: 'type',
      url: 'url',
      login: 'login',
      passcode: '',
      vhost: '',
      owner: user._id,
    });
    // Send a GET request to the /sources route with the token as a query parameter
    const { statusCode } = await t.context.got(`sources/sources?token=${token}`);
    // Assert that the status code of the response is 200
    t.is(statusCode, 200);
  });
// CREATE SOURCE
test('POST /create-source with valid data and token returns status code 200', async (t) => {
  // Generate a valid JWT token
  const token = jwtSign({ id: 1 });

  // Initialize the API object with JSON response type
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  // Create the request body
  const body = new Source({ name: 'Name' });

  // Make the POST request to the /create-source endpoint
  const { statusCode } = await api(`sources/create-source?token=${token}`, {
    method: 'POST',
    json: body,
  });

  // Assert that the status code is 200
  t.is(statusCode, 200);
});

test('POST /create-source with duplicate name and valid token returns status code 409', async (t) => {
  // Generate a valid JWT token
  const token = jwtSign({ id: user._id });

  // Create a source with the name "name1"
  await Source.create({
    name: 'name1',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });

  // Initialize the API object with JSON response type
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  // Create the request body with the name "name1"
  const request = new Source({ name: 'name1' });

  // Make the POST request to the /create-source endpoint
  const { body } = await api(`sources/create-source?token=${token}`, {
    method: 'POST',
    json: request,
  });

  // Assert that the response status is 409
  t.is(body.status, 409);
});

test('POST /create-source with invalid token returns status code 403', async (t) => {
  // Generate an invalid JWT token
  const token = '123';

  // Initialize the API object with JSON response type
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  // Create the request body
  const body = new Source({ name: 'Name' });

  // Make the POST request to the /create-source endpoint
  const { statusCode } = await api(`sources/create-source?token=${token}`, {
    method: 'POST',
    json: body,
  });

  // Assert that the status code is 403
  t.is(statusCode, 403);
});
// CHNAGE SOURCE
test('POST /change-source returns correct response and status code for valid request and token', async (t) => {
  // Generate a JWT token for the user
  const token = jwtSign({ id: user._id });

  // Create a new source for the user
  const createdSource = await Source.create({
    name: 'name',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });

  // Initialize the API client
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  // Build the request body
  const request = {
    id: createdSource._id,
    name: 'new name',
    type: '0',
    url: '000',
    login: '',
    passcode: '',
    vhost: '',
  };

  // Make the POST request to change the source
  const { statusCode } = await api(`sources/change-source?token=${token}`, {
    method: 'POST',
    json: request,
  });

  // Assert that the request was successful
  t.is(statusCode, 200);
});

test('POST /change-source returns correct response and status code for duplicate name', async (t) => {
  const token = jwtSign({ id: user._id });
  const createdSource = await Source.create({
    name: 'name',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });
  await Source.create({
    name: 'name1',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  const request = {
    id: createdSource._id,
    name: 'name1',
    type: '0',
    url: '000',
    login: '',
    passcode: '',
    vhost: '',
  };
  const { body } = await api(`sources/change-source?token=${token}`, {
    method: 'POST',
    json: request,
  });
  t.is(body.status, 409);
});
test('POST /change-source returns correct response and status when source does not exist', async (t) => {
  // Generate a JWT for an authenticated user
  const token = jwtSign({ id: user._id });
  // Create an extended Got instance with the 'json' responseType
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  // Construct the request payload
  const request = {
    id: 'this id does not exist',
    name: 'name1',
    type: '0',
    url: '000',
    login: '',
    passcode: '',
    vhost: '',
  };
  // Make the POST request to the /change-source endpoint with the request payload and JWT
  const { body } = await api(`sources/change-source?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the response status is 409 and the body.status field is equal to 409
  t.is(body.status, 409);
});

test('POST /change-source with invalid token returns 403', async (t) => {
  // Create an invalid JWT
  const token = '123';
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({
    responseType: 'json',
  });
  // Create a request body with the source name to change
  const body = new Source({ name: 'Name' });
  // Send a POST request to the /change-source route with the token as a query parameter and the request body
  const { statusCode } = await api(`sources/change-source?token=${token}`, {
    method: 'POST',
    json: body,
  });
  // Assert that the status code of the response is 403
  t.is(statusCode, 403);
});
// DELETE SOURCE
test('POST /delete-source returns correct status code and response when provided a valid token', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({ id: user._id });
  // Create a new source
  await Source.create({
    name: 'name',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  // Create a request body with the source ID to delete
  const body = { id: 0 };
  // Send a POST request to the /delete-source route with the token as a query parameter and the request body
  const { statusCode } = await api(`sources/delete-source?token=${token}`, {
    method: 'POST',
    json: body,
  });
  // Assert that the status code of the response is 200
  t.is(statusCode, 200);
});

test('POST /delete-source returns status code 403 when provided an invalid token', async (t) => {
  // Create an invalid JWT
  const token = '123';
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  // Create a request body with the source ID to delete
  const body = { id: 1 };
  // Send a POST request to the /delete-source route with the token as a query parameter and the request body
  const { statusCode } = await api(`sources/delete-source?token=${token}`, {
    method: 'POST',
    json: body,
  });
  // Assert that the status code of the response is 403
  t.is(statusCode, 403);
});
// POST SOURCE
test('POST /source returns correct status code and response when source exists', async (t) => {
  // Create a new source
  await Source.create({
    name: 'name',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({
    responseType: 'json',
  });
  // Create a copy of the user object with the ID field renamed to match the request body format
  let requestedUser = { ...user };
  requestedUser.id = user._id;
  // Create the request body with the source name and user information
  const body = { name: 'name', owner: 'self', user: requestedUser };
  // Send a POST request to the /source route with the request body
  const { statusCode } = await api(`sources/source`, {
    method: 'POST',
    json: body,
  });
  // Assert that the status code of the response is 200
  t.is(statusCode, 200);
});

test('POST /source returns correct status code and response when source does not exist', async (t) => {
  // Create a new source
  await Source.create({
    name: 'name',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({
    responseType: 'json',
  });
  // Create a copy of the user object with the ID field renamed to match the request body format
  let requestedUser = { ...user };
  requestedUser.id = user._id;
  // Create the request body with a source name that does not exist and the user information
  const request = { name: 'name999', owner: 'self', user: requestedUser };
  // Send a POST request to the /source route with the request body
  const { body } = await api(`sources/source`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status field of the response body is 409
  t.is(body.status, 409);
});
// CHECK SOURCE
test('POST /check-source returns correct status code and response when source exists', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({ id: user._id });

  // Create a new source
  await Source.create({
    name: 'source2',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({
    responseType: 'json',
  });
  // Create the request body with the source names
  const body = ['source1', 'source2', 'source3'];
  // Send a POST request to the /source route with the request body
  const { statusCode } = await api(`sources/check-sources?token=${token}`, {
    method: 'POST',
    json: body,
  });
  // Assert that the status code of the response is 200
  t.is(statusCode, 200);
});
