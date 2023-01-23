/* eslint-disable no-unused-vars */
/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').serial;
const got = require('got');

const listen = require('test-listen');

const sinon = require('sinon');
const Source = require('../src/models/source');
const app = require('../src/index');
const User = require('../src/models/user');
const Reset = require('../src/models/reset');

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

  // User based on enviroment variables
  user = {
    username: process.env.TEST_USERNAME,
    password: process.env.TEST_PASSWORD,
    email: process.env.TEST_EMAIL,
  };
});

test.after.always((t) => {
  t.context.server.close();
});

test.beforeEach(() => {
  sinon.resetHistory();
  sinon.restore(); 
  sinon.reset(); 
});

// CREATE 
// test for creating successfully a new user is dismissed 

test('POST /users create user with wrong email format ', async (t) => {
  // Create an extended Got instance with the 'json' responseType
  const api = await t.context.got.extend({responseType: 'json'});
  // Create the request body with an invalid email
  const request = {username: 'creating_user', password: 'just_password', email: 'not_a_nice_email'};
  // Send a POST request to create the user
  const {body} = await api('users/create', {
    method: 'POST',
    json: request,
  }); 
  // Assert that the status code of the body is 400
  t.is(body.status, 400);
  t.is(body.message, 'Validation Error: email must be a valid email');
});  

test('POST /users create user with wrong password format ', async (t) => {
  // Create an extended Got instance with the 'json' responseType
  const api = await t.context.got.extend({responseType: 'json'});
  // Create the request body with a small password
  const request = {username: 'creating_user', password: '1', email: 'email@email.gr'};
  // Send a POST request to create the user
  const {body} = await api('users/create', {
    method: 'POST',
    json: request,
  }); 
  // Assert that the status code of the body is 400
  t.is(body.status, 400);
  t.is(body.message, 'Validation Error: password must be at least 5 characters');
});  
                 
test('POST /users create user that already exists - 409 ', async (t) => {
  // Create an extended Got instance with the 'json' responseType
  const api = await t.context.got.extend({responseType: 'json'});
  // Create the request body with a user that already exists
  const request = {username: user.username, password: user.password, email: user.email};
  // Send a POST request to create the user
  const {body} = await api('users/create', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the body is 409
  t.is(body.status, 409);
  t.is(body.message, 'Registration Error: A user with that e-mail or username already exists.');
}); 

test('POST /users authenticate user, user not found - 401', async (t) => {
  // Create an extended Got instance with the 'json' responseType
  const api = await t.context.got.extend({responseType: 'json'});
  // Just a random username and password for the request body
  const request = {username: 'usern', password: '56789'};
  // Send a POST request to authenticate the user
  const {body} = await api('users/authenticate', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the body is 401
  t.is(body.status, 401);
  t.is(body.message, 'Authentication Error: User not found.');
});

test('POST /users authentication password doesnot match -401', async (t) => {
  // Create an extended Got instance with the 'json' responseType
  const api = await t.context.got.extend({responseType: 'json'});
  // create the request body with a wrong password for the user
  const request = {username: user.username, password: 'random_password'};
  // Send a POST request to authenticate the user
  const {body} = await api('users/authenticate', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the body is 401
  t.is(body.status, 401);
  t.is(body.message, 'Authentication Error: Password does not match!');
});

test('POST /users user authenticated correctly', async (t) => {
  // Create an extended Got instance with the 'json' responseType
  const api = await t.context.got.extend({responseType: 'json'});
  // Create a request body with a user that exists
  const request = {username: user.username, password: user.password};
  // Send a POST request to authenticate the user
  const {body, statusCode} = await api('users/authenticate', {
    method: 'POST',
    json: request,
  });
  // Assert that the status code of the response is 200
  t.is(statusCode, 200);
  t.is(body.user.username, user.username);
  t.is(body.user.email, user.email);
}); 

test('POST /users reset password correctly', async (t) => {
  // Create an extended Got instance with the 'json' responseType
  const api = await t.context.got.extend({responseType: 'json'});
  // Create the request with a valid username
  const request = {username: user.username};
  // Send a POST request to reset the password
  const {body} = await api('users/resetpassword', {
    method: 'POST',
    json: request,
  });
  // Assert that the email was sent.
  t.is(body.ok, true);
  t.is(body.message, 'Forgot password e-mail sent.');
}); 

test('POST /users reset password user does not exist', async (t) => {
  // Create an extended Got instance with the 'json' responseType
  const api = await t.context.got.extend({responseType: 'json'});
  // Giving the name of a user that does'nt exist
  const request = {username: 'user_not_exist'};
  // Send a POST request to reset the password
  const {body} = await api('users/resetpassword', {
    method: 'POST',
    json: request,
  });
  // Assert that the user does not exist
  t.is(body.status, 404);
  t.is(body.message, 'Resource Error: User not found.');
});

test('POST /users changepassword  changes password correctly', async (t) => {
  // Generate a JWT for an authenticated user using the username
  const token = jwtSign({username: user.username});
 
  const api = await t.context.got.extend({responseType: 'json'});
  // Giving the same password, other way password would change everytime running the test.
  const request = {password: user.password};
  // Send a POST request to change the password
  const {body, statusCode} = await api(`users/changepassword?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that the password was changed.
  t.is(statusCode, 200);
  t.is(body.ok, true);
  t.is(body.message, 'Password was changed.'); 
});   

test('POST /users changepassword  user does not exist', async (t) => {
  // Creating a token for a user that doesn't exist
  const token = jwtSign({username: 'just_a_username'});
 
  const api = await t.context.got.extend({responseType: 'json'});
  // Create the request body with a random password
  const request = {password: 'password_for_user_does_not_exist'};
  // Send a POST request to change the password
  const {body} = await api(`users/changepassword?token=${token}`, {
    method: 'POST',
    json: request,
  });
  // Assert that user doesn't exist
  t.is(body.status, 404);
  t.is(body.message, 'Resource Error: User not found.'); 
});   

test('POST /users changepassword with reset scema and return -410', async (t) => {
  // Generate a JWT for an authenticated user using the username
  const token = jwtSign({username: user.username});
  const api = await t.context.got.extend({responseType: 'json'});
  // A random password as request 
  const request = {password: 'just_a_password'};
  // Drop reset schema in order to be null and fake the expiration
  await Reset.findOneAndRemove({username: user.username});
  // Send a POST request to change the password
  const {body} = await api(`users/changepassword?token=${token}`, {
    method: 'POST',
    json: request,
  });
 
  t.is(body.status, 410);
  t.is(body.message, 'Resource Error:Reset token has expired.'); 

  // Recreating the reset schema of the user
  await new Reset({
    username: user.username,
    token,
  }).save();
}); 
