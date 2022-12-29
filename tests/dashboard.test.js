/* eslint-disable max-len */
/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').serial;
const got = require('got');
const listen = require('test-listen');
const sinon = require('sinon');
const Dashboard = require('../src/models/dashboard');
const Source = require('../src/models/source');
const app = require('../src/index');
const User = require('../src/models/user');
const {jwtSign} = require('../src/utilities/authentication/helpers');

let user;

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
 
// GET dashboards
test('GET /dashboards returns error when encountering error', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Create a new dashboard
  await Dashboard.create({
    name: 'name',
    layout: [],
    items: {},
    nextId: 1,
    owner: user._id,
  });
  const findStub = sinon
    .stub(Dashboard, 'find')
    .throws(new Error('Something went wrong'));
    // Send a GET request to the /dashboards route with the token as a query parameter
  const {statusCode} = await t.context.got(`dashboards/dashboards?token=${token}`);
  // Assert that the status code of the response is 404
  t.is(statusCode, 404);
  
  findStub.restore();
});

test('GET /Dashboards returns sources when provided a valid token', async (t) => {
  sinon.resetHistory();
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Create a new dashboard
  await Dashboard.create({
    name: 'name',
    layout: [],
    items: {},
    nextId: 1,
    owner: user._id,
  });
  // Send a GET request to the /dashboards route with the token as a query parameter
  const {body, statusCode} = await t.context.got(`dashboards/dashboards?token=${token}`);
  // Assert that the status code of the response is 200 and the test_dashboard has the name: name and 0 views

  t.is(body.dashboards[0].views, 0);
  t.is(body.dashboards[0].name, 'name');
  t.is(statusCode, 200);
});

// CREATE DASHBOARD
test('POST /create-dashboard with valid data and token returns status code 200', async (t) => {
  // Generate a valid JWT token
  const token = jwtSign({id: user._id});
  // Initialize the API object with JSON response type
  const api = await t.context.got.extend({responseType: 'json' });
  
  // Create the request body
  const body = new Dashboard({name: 'Test Create Dashboard'});
  
  // Make the POST request to the /create-dashboard endpoint
  const {statusCode} = await api(`dashboards/create-dashboard?token=${token}`, {
    method: 'POST',
    
    json: body,
  });
  
  // Assert that the status code is 200
  t.is(statusCode, 200);
});

test('POST /create-dashboard with duplicate name and valid token returns status code 409', async (t) => {
  // Generate a valid JWT token
  const token = jwtSign({id: user._id});
  
  // Create a Dashboard with the name "used_name"
  await Dashboard.create({
    name: 'used_name',
    layout: [],
    items: {},
    nextId: 1,
    owner: user._id,
  });
  
  // Initialize the API object with JSON response type
  const api = await t.context.got.extend({responseType: 'json' });
  
  // Create the request body with the name "used_name"
  const request = new Dashboard({name: 'used_name'});

  // Make the POST request to the /create-dashboard endpoint
  const {body} = await api(`dashboards/create-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });

  // Assert that the response status is 409
  t.is(body.status, 409);
});

test('POST /create-dashboard with invalid token returns status code 403', async (t) => {
  // Generate an invalid JWT token
  const token = '123';
  
  // Initialize the API object with JSON response type
  const api = await t.context.got.extend({responseType: 'json'});
  
  // Create the request body
  const body = new Dashboard({name: 'Name'});
  
  // Make the POST request to the /create-source endpoint
  const {statusCode} = await api(`dashboards/create-dashboard?token=${token}`, {
    method: 'POST',
    json: body,
  });
  
  // Assert that the status code is 403
  t.is(statusCode, 403);
});

// DELETE DASHBOARD

test('POST /delete-dashboard returns correct status code and response when provided a valid token', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Create a new dashboard
  const dashboardToDelete = await Dashboard.create({
    name: 'delete_test',
    owner: user._id,
  });
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({responseType: 'json'});
  
  // Create a request body with the dashboard ID to delete
  const requestBody = {id: dashboardToDelete._id};
  // Send a POST request to the /delete-dashboard route with the token as a query parameter and the request body
  const {statusCode} = await api(`dashboards/delete-dashboard?token=${token}`, {
    method: 'POST',
    json: requestBody,
  });

  // Assert that the status code of the response is 200
  t.is(statusCode, 200);
});

test('POST /delete-dashboard returns status code 409 when the dashboard does not exist when provided a valid token', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Create a new dashboard
  const dashboardToDelete = await Dashboard.create({
    name: 'test_to_be_deleted',
    owner: user._id,
  });
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({responseType: 'json'});
  
  // Create a request body with the dashboard ID to delete
  const requestBody = {id: dashboardToDelete._id};
  // Delete the dashboard
  await api(`dashboards/delete-dashboard?token=${token}`, {
    method: 'POST',
    json: requestBody,
  });

  // Try to delete the same dashboard(does not exist anymore)
  const {body} = await api(`dashboards/delete-dashboard?token=${token}`, {
    method: 'POST',
    json: requestBody,
  });
  
  // Assert that the status code of the response is 200
  t.is(body.status, 409);
});


test('POST /delete-dashboard returns status code 403 when provided an invalid token', async (t) => {
  // Create an invalid JWT
  const token = '123';
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({responseType: 'json' });

  // Create a request body with the dashboard ID to delete
  const body = {id: 1};
  // Send a POST request to the /delete-dashboard route with the token as a query parameter and the request body
  const {statusCode} = await api(`dashboards/delete-dashboard?token=${token}`, {
    method: 'POST',
    json: body,
  });
  // Assert that the status code of the response is 403
  t.is(statusCode, 403);
}); 
