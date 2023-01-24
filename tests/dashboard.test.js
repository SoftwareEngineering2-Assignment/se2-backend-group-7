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
  const api = await t.context.got.extend({responseType: 'json'});
  
  // Create the request body
  const body = {name: 'Test Create Dashboard'};

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
  const api = await t.context.got.extend({responseType: 'json'});
  
  // Create the request body with the name "used_name"
  const request = {name: 'used_name'};

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
  const body = {name: 'Name'};
  
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
  
  // Assert that the status code of the response is 409
  t.is(body.status, 409);
});

test('POST /delete-dashboard returns status code 403 when provided an invalid token', async (t) => {
  // Create an invalid JWT
  const token = '123';
  // Create an instance of the `got` library with JSON response type
  const api = await t.context.got.extend({responseType: 'json'});

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
 
// GET DASHBOARD
test('GET /dashboard returns correct status code and response when dashboard exists', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Create a Dashboard with the name "name_dashboard"
  const dashboardToRetrieve = await Dashboard.create({
    name: 'name_dashboard',
    layout: [{
      i: '1', x: 6, y: 3, w: 6, h: 4, minW: 1, minH: 1
    }],
    items: {1: {type: 'iframe', name: 'Iframe', url: 'https://www.thmmy.gr/smf/'}},
    nextId: 2,
    owner: user._id,
  });

  // Create a new source for the user with the name "name_source"
  await Source.create({
    name: 'name_source',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });
 
  // Send a GET request to the /dashboards route with the token and id as query parameters
  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${token}&id=${dashboardToRetrieve._id}`);
  
  // Assert that the status code of the response is 200
  t.is(body.dashboard.name, 'name_dashboard');
  t.is(body.sources[0], 'name_source');
  t.is(statusCode, 200);
});

test('GET /dashboard returns 409 status code and error message when dashboard does not exists', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // A valid id that does not corresponds to a dashboard of this user
  const falseId = '000000000000000000000000';
  // Send a GET request to the /dashboards route with the token and id as query parameters
  const {body} = await t.context.got(`dashboards/dashboard?token=${token}&id=${falseId}`);
  
  // Assert that the status is 409 and shows the right message
  t.is(body.status, 409);
  t.is(body.message, 'The selected dashboard has not been found.');
});

test('GET /dashboard with invalid user token', async (t) => {
  // Generate an invalid JWT token
  const token = '123';
  // Just a valid dashboard id 
  const dashboardId = '100000000000000000000001';
  // Send a GET request to the /dashboards route with the token and id as query parameters
  const {body, statusCode} = await t.context.got(`dashboards/dashboard?token=${token}&id=${dashboardId}`);
  
  // Assert that the status code of the response is 403
  t.is(statusCode, 403);
  t.is(body.message, 'Authorization Error: Failed to verify token.');
}); 

// SAVE DASHBOARD
test('POST /save-dashboard returns correct response and status code for valid request and token', async (t) => {
  // Generate a JWT token for the user
  const token = jwtSign({id: user._id});

  // Create a new empty dashboard for the user
  const emptyDashboard = await Dashboard.create({
    name: 'name',
    owner: user._id,
  });

  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});

  // Build the request body
  const request = {
    id: emptyDashboard._id,
    layout: [{
      i: '1', x: 6, y: 3, w: 6, h: 4, minW: 1, minH: 1
    },
    {
      i: '2', x: 19, y: 7, w: 5, h: 4, minW: 1, minH: 1
    },
    {
      i: '3', x: 4, y: 8, w: 5, h: 4, minW: 1, minH: 1
    }],
    items: {
      1: {type: 'iframe', name: 'Iframe', url: 'https://www.thmmy.gr/smf/'},
      2: {
        type: 'logs', name: 'Logs', source: 'Select source', topic: '', variable: '', maxMessages: -1, colorKeys: [], colorValues: []
      },
      3: {
        type: 'gauge', name: 'Gauge', source: 'Select source', topic: '', variable: '', minValue: 0, maxValue: 100, leftColor: '#7ABF43', rightColor: '#DE162F', levels: 20, hideText: false, unit: 'm/s'
      }
    },
    nextId: '4',
  };

  // Make the POST request to save dashboard
  const {body, statusCode} = await api(`dashboards/save-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the request was successful
  t.is(body.success, true);
  t.is(statusCode, 200);
});

test('POST /save-dashboard returns 409 when false dashboard id is provided', async (t) => {
  // Generate a JWT token for the user
  const token = jwtSign({id: user._id});

  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});

  // Build the request body for a dashboard that doesn't exist
  const request = {
    id: '100000000000000000000001',
    layout: [{
      i: '1', x: 6, y: 3, w: 6, h: 4, minW: 1, minH: 1
    }],
    items: {1: {type: 'iframe', name: 'Iframe', url: 'https://www.thmmy.gr/smf/'}},
    nextId: '2',
  };

  // Make the POST request to save dashboard
  const {body} = await api(`dashboards/save-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status is 409 and the dashboard has not been found.
  t.is(body.status, 409);
  t.is(body.message, 'The selected dashboard has not been found.');
});

test('POST /save-dashboard returns 403 when false user token is provided', async (t) => {
  // Generate an invalid JWT token 
  const token = '123';

  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});

  // Build the request body for a dashboard 
  const request = {
    id: '000000000000000000000000',
    layout: [{
      i: '1', x: 6, y: 3, w: 6, h: 4, minW: 1, minH: 1
    }],
    items: {1: {type: 'iframe', name: 'Iframe', url: 'https://www.thmmy.gr/smf/'}},
    nextId: '2',
  };

  // Make the POST request to save dashboard
  const {body, statusCode} = await api(`dashboards/save-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 403
  t.is(statusCode, 403);
  t.is(body.message, 'Authorization Error: Failed to verify token.');
}); 

// CLONE DASHBOARD

test('POST /clone-dashboard returns correct status code when token and name are valid', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Create a new empty dashboard for the user
  const DashboardToClone = await Dashboard.create({
    name: 'original_dashboard',
    layout: [{
      i: '1', x: 6, y: 3, w: 6, h: 4, minW: 1, minH: 1
    }],
    items: {1: {type: 'iframe', name: 'Iframe', url: 'https://www.thmmy.gr/smf/'}},
    nextId: '2',
    owner: user._id,
  });
  // Build the request body for the cloned dashboard 
  const request = {
    dashboardId: DashboardToClone._id,
    name: 'clone_dashboard' 
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to clone dashboard
  const {body, statusCode} = await api(`dashboards/clone-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the dashboard was clones successfully and the response code is 200
  t.is(body.success, true);
  t.is(statusCode, 200);
});

test('POST /clone-dashboard returns 409 when the name already exists', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Create a new empty dashboard for the user
  const DashboardToClone = await Dashboard.create({
    name: 'same_name',
    layout: [{
      i: '1', x: 6, y: 3, w: 6, h: 4, minW: 1, minH: 1
    }],
    items: {1: {type: 'iframe', name: 'Iframe', url: 'https://www.thmmy.gr/smf/'}},
    nextId: '2',
    owner: user._id,
  });
  // Build the request body for the cloned dashboard, given the same name as the original 
  const request = {
    dashboardId: DashboardToClone._id,
    name: 'same_name' 
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to clone dashboard
  const {body} = await api(`dashboards/clone-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status is 409.  
  t.is(body.status, 409);
  t.is(body.message, 'A dashboard with that name already exists.');
});

test('POST /clone-dashboard returns 403 status code when token is invalid', async (t) => {
  // Create an ivalid 
  const token = 123;
  // Create a new dashboard for the user
  const DashboardToClone = await Dashboard.create({
    name: 'original_dashboard',
    layout: [{
      i: '1', x: 6, y: 3, w: 6, h: 4, minW: 1, minH: 1
    }],
    items: {1: {type: 'iframe', name: 'Iframe', url: 'https://www.thmmy.gr/smf/'}},
    nextId: '2',
    owner: user._id,
  });
  // Build the request body for the cloned dashboard 
  const request = {
    dashboardId: DashboardToClone._id,
    name: 'clone_dashboard' 
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to clone dashboard
  const {body, statusCode} = await api(`dashboards/clone-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 403
  t.is(statusCode, 403);
  t.is(body.message, 'Authorization Error: Failed to verify token.');
});
 
// CHECK PASSWORD NEEDED
test('POST /check-password-needed user and owner of dashboard have the same id', async (t) => {
  // Dashboard to check 
  const checkDashboard = await Dashboard.create({
    name: 'check_dashboard',
    password: 'hellothere',
    shared: true,
    owner: user._id,
  });

  // Build the request body for the dashboard 
  const request = {
    user,
    dashboardId: checkDashboard._id,
    
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to check if password is needed
  const {body, statusCode} = await api('dashboards/check-password-needed', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200 and owner is the user, so it returns and the dashboard
  t.is(body.owner, 'self');
  t.is(body.dashboard.name, 'check_dashboard');
  t.is(statusCode, 200);
});
 
test('POST /check-password-needed user is not the owner and dashboard is not shared', async (t) => {
  // Dashboard to check 
  const checkDashboard = await Dashboard.create({
    name: 'check_dashboard',
    password: 'hellothere',
    shared: false,
    // Owner is not the user
    owner: user._id,
  });
  // The user that is not the owner.
  const testUser = await User.create({
    username: 'test user',
    password: 'test password',
    email: 'testemail',
  });
  // Build the request body for the dashboard.
  const request = {
    user: testUser,
    dashboardId: checkDashboard._id,
    
  };
  // Initialize the API client.
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to check if password is needed.
  const {body, statusCode} = await api('dashboards/check-password-needed', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200, owner is empty string, and the shared status is false.
  // So it does not return the dashboard.
  t.is(body.owner, '');
  t.is(body.shared, false);
  t.is(statusCode, 200);
  // Delete the test user.
  User.findByIdAndDelete(testUser._id);
});

test('POST /check-password-needed user is not the owner and dashboard is shared and has no password', async (t) => {
  // Dashboard to check, by default password is null.
  const checkDashboard = await Dashboard.create({
    name: 'check_dashboard',
    shared: true,
    // Owner is not the user.
    owner: user._id,
  });
  // The user that is not the owner.
  const testUser = await User.create({
    username: 'test user',
    password: 'test password',
    email: 'testemail',
  });
  // Build the request body for the dashboard. 
  const request = {
    user: testUser,
    dashboardId: checkDashboard._id,
    
  };
  // Initialize the API client.
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to check if password is needed
  const {body, statusCode} = await api('dashboards/check-password-needed', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200, owner is not the user, dashboard is shared, a password is not required
  // So it returns the dashboard.
  t.is(body.owner, `${user._id}`);
  t.is(body.passwordNeeded, false);
  t.is(body.shared, true);
  t.is(body.dashboard.name, 'check_dashboard');
  t.is(statusCode, 200);

  // Delete the test user.
  User.findByIdAndDelete(testUser._id);
});

test('POST /check-password-needed user is not the owner and dashboard is shared and has  password', async (t) => {
  // Dashboard to check
  const checkDashboard = await Dashboard.create({
    name: 'check_dashboard',
    password: '123456789',
    shared: true,
    // Owner is not the user
    owner: user._id,
  });
  // The user that is not the owner
  const testUser = await User.create({
    username: 'test user',
    password: 'test password',
    email: 'testemail',
  });
  // Build the request body for the dashboard 
  const request = {
    user: testUser,
    dashboardId: checkDashboard._id,
    
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to check if password is needed
  const {body, statusCode} = await api('dashboards/check-password-needed', {
    method: 'POST',
    json: request,
  });

  // Assert that the status code of the response is 200, owner is empty string, a password is required
  // and the shared status is true. So it does not return the dashboard.
  t.is(body.owner, '');
  t.is(body.passwordNeeded, true);
  t.is(body.shared, true);
  t.is(statusCode, 200);

  // Delete the test user
  User.findByIdAndDelete(testUser._id);
});

test('POST /check-password-needed and dashboard does not exist', async (t) => {
  // Build the request body for the dashboard 
  const request = {
    user,
    dashboardId: 123,
    
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to check if password is needed
  const {body} = await api('dashboards/check-password-needed', {
    method: 'POST',
    json: request,
  });
  // Assert that the status of the response is 409
  t.is(body.status, 409);
  t.is(body.message, 'The specified dashboard has not been found.');
});

// CHECK PASSWORD
test('POST /check-password dashboard exists and password is correct', async (t) => {
  // Dashboard to check 
  const checkDashboard = await Dashboard.create({
    name: 'dash_check_password',
    password: 'correct_password',
    owner: user._id,
  });

  // Build the request body for the dashboard 
  const request = {
    dashboardId: checkDashboard._id,
    password: 'correct_password'
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to check dashboards password
  const {body, statusCode} = await api('dashboards/check-password', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200 and the password given was correct
  t.is(body.success, true);
  t.is(body.correctPassword, true);
  t.is(body.owner, `${user._id}`);
  t.is(body.dashboard.name, 'dash_check_password');
  t.is(statusCode, 200);
});

test('POST /check-password dashboard exists and password is wrong', async (t) => {
  // Dashboard to check 
  const checkDashboard = await Dashboard.create({
    name: 'dash_check_password',
    password: 'correct_password',
    owner: user._id,
  });

  // Build the request body for the dashboard with a wrong password
  const request = {
    dashboardId: checkDashboard._id,
    password: 'wrong_password'
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to check dashboards password
  const {body, statusCode} = await api('dashboards/check-password', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200 and a wrong password was given
  t.is(body.success, true);
  t.is(body.correctPassword, false);
  t.is(statusCode, 200);
});

test('POST /check-password when dashboard does not exist', async (t) => {
  // Build the request body for the dashboard that doesn't exist
  const request = {
    dashboardId: 123,
    password: 'something'
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to check dashboards password
  const {body} = await api('dashboards/check-password', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 409
  t.is(body.status, 409);
  t.is(body.message, 'The specified dashboard has not been found.'); 
});

// SHARE DASHBOARD
test('POST /share-dashboard change shared status from true to false when dashboard exists', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Dashboard to change share status 
  const checkDashboard = await Dashboard.create({
    name: 'shared_true_dashboard',
    shared: true,
    owner: user._id,
  });
  // Build the request body for the dashboard 
  const request = {dashboardId: checkDashboard._id};
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to change share status of the dashboard
  const {body, statusCode} = await api(`dashboards/share-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200 and the share status is false
  t.is(body.success, true);
  t.is(body.shared, false);
  t.is(statusCode, 200);
});

test('POST /share-dashboard change shared status from false to true when dashboard exists', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Dashboard to change share status 
  const checkDashboard = await Dashboard.create({
    name: 'shared_false_dashboard',
    shared: false,
    owner: user._id,
  });
  // Build the request body for the dashboard 
  const request = {dashboardId: checkDashboard._id};
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to change share status of the dashboard
  const {body, statusCode} = await api(`dashboards/share-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200 and the share status is true
  t.is(body.success, true);
  t.is(body.shared, true);
  t.is(statusCode, 200);
});

test('POST /share-dashboard  when dashboard does not exist', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  
  // Build the request body for a dashboard that doesn't exist 
  const request = {dashboardId: 123};
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to change share status of the dashboard
  const {body} = await api(`dashboards/share-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 409 
  t.is(body.status, 409);
  t.is(body.message, 'The specified dashboard has not been found.');
});

test('POST /share-dashboard  when user does not exist', async (t) => {
  // Create a JWT with the user's ID
  const token = '123';

  // Dashboard to change share status 
  const checkDashboard = await Dashboard.create({
    name: 'not user dashboard',
    shared: false,
    owner: user._id,
  });
  // Build the request body for the dashboard 
  const request = {dashboardId: checkDashboard._id};
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to change share status of the dashboard.
  const {body, statusCode} = await api(`dashboards/share-dashboard?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 403
  t.is(statusCode, 403);
  t.is(body.message, 'Authorization Error: Failed to verify token.');
});

// CHANGE PASSWORD
test('POST /change-password of dashboard that exists with valid user token ', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Dashboard to change password
  const checkDashboard = await Dashboard.create({
    name: 'change_password_dashboard',
    password: 'old_password',
    shared: true,
    owner: user._id,
  });
  // Build the request body for the dashboard 
  const request = {
    dashboardId: checkDashboard._id,
    password: 'new_password'
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to change password of the dashboard
  const {body, statusCode} = await api(`dashboards/change-password?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200 and the success flag is true
  t.is(body.success, true);
  t.is(statusCode, 200);
});

test('POST /change-password of dashboard that exists with no password with valid user token ', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  // Dashboard to change password
  const checkDashboard = await Dashboard.create({
    name: 'null_password_dashboard',
    owner: user._id,
  });
  // Build the request body for the dashboard 
  const request = {
    dashboardId: checkDashboard._id,
    password: 'just_a_password'
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to change password of the dashboard
  const {body, statusCode} = await api(`dashboards/change-password?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200 and the success flag is true
  t.is(body.success, true);
  t.is(statusCode, 200);
});

test('POST /change-password of dashboard that does not exist with valid user token ', async (t) => {
  // Create a JWT with the user's ID
  const token = jwtSign({id: user._id});
  
  // Build the request body for the dashboard 
  const request = {
    dashboardId: 123,
    password: 'new_password'
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to change password of the dashboard
  const {body} = await api(`dashboards/change-password?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 409 
  t.is(body.status, 409);
  t.is(body.message, 'The specified dashboard has not been found.');
});

test('POST /change-password with wrong user token provided ', async (t) => {
  // Create a JWT with the user's ID
  const token = '123';
  // Dashboard to change password
  const checkDashboard = await Dashboard.create({
    name: 'a_dashboard',
    owner: user._id,
  });
  // Build the request body for the dashboard 
  const request = {
    dashboardId: checkDashboard._id,
    password: 'another_password'
  };
  // Initialize the API client
  const api = await t.context.got.extend({responseType: 'json'});
  // Make the POST request to change password of the dashboard
  const {body, statusCode} = await api(`dashboards/change-password?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 403
  t.is(statusCode, 403);
  t.is(body.message, 'Authorization Error: Failed to verify token.');
}); 
