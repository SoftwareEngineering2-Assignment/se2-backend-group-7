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

  user = await User.create({
    username: 'user',
    password: 'password',
    email: 'bill@gmail.com ',
  });
});

test.after.always((t) => {
  t.context.server.close();
  User.findByIdAndDelete(user._id);
});

test.beforeEach(() => {
  sinon.resetHistory();
  sinon.restore(); 
  sinon.reset(); 
});
// CREATE 

test('POST /users create user with valid data - 200 ', async (t) => {
  // const token = jwtSign({ id: 1});
  const api = await t.context.got.extend({responseType: 'json', });
  // let newUser={...user};
  // newUser.id= user._id;
  const body = new User({username: 'new_user893', password: 'new_password89', email: 'kostas89@gmail.com'});
  const {statusCode} = await api('users/create', {
    method: 'POST',
    json: body,
  }); 
  console.log(body);
  t.is(statusCode, 200);

  // t.is(token,newUser.id);
});
               
test('POST /users create user that already exists - 409 ', async (t) => {
  const api = await t.context.got.extend({responseType: 'json', });

  const request = new User({username: 'user', password: 'password', email: 'bill@gmail.com '});
  const {body} = await api('users/create', {
    method: 'POST',
    json: request,
  });
  t.is(body.status, 409);
  t.is(body.message, 'Registration Error: A user with that e-mail or username already exists.');
});
  
test('POST /users authendicate user, user not found - 401', async (t) => {
  const api = await t.context.got.extend({responseType: 'json', });
  const request = new User({username: 'usern', password: '56789'});
  const {body} = await api('users/authenticate', {
    method: 'POST',
    json: request,
  });
  t.is(body.status, 401);
  t.is(body.message, 'Authentication Error: User not found.');
});
test('POST /users authentication password doesnot match -401', async (t) => {
  const api = await t.context.got.extend({responseType: 'json', });

  const request = new User({username: 'new_user', password: '5566788'});
  const {body} = await api('users/authenticate', {
    method: 'POST',
    json: request,
  });
    // console.log(body);
  t.is(body.status, 401);
  // t.is(body.message,'Authentication Error: Password does not match!');
});
  
test('POST /users authentication password is correct -200', async (t) => {
  // const token = jwtSign({username:user.username, id: user._id, email:user.email });
  const token = jwtSign({id: 1});

  const api = await t.context.got.extend({responseType: 'json', });
  const body = new User({username: 'new_user', password: 'new_password', email: 'kostas@gmail.com'});
  const {statusCode} = await api(`users/authenticate?token=${token}`, {
    method: 'POST',
    json: body,
  });
  console.log(body);
  t.is(statusCode, 200); 
}); 

test('POST /users reset password correct', async (t) => {
  const api = await t.context.got.extend({responseType: 'json',});

  const request = {username: 'user'};
  const {body} = await api('users/resetpassword', {
    method: 'POST',
    json: request,
  });

  t.is(body.ok, true);
  t.is(body.message, 'Forgot password e-mail sent.');
}); 

test('POST /users reset password user does not exist', async (t) => {
  const api = await t.context.got.extend({responseType: 'json',});
  // Giving the name of a user that does'nt exist
  const request = {username: 'user_not_exist'};
  const {body} = await api('users/resetpassword', {
    method: 'POST',
    json: request,
  });

  t.is(body.status, 404);
  t.is(body.message, 'Resource Error: User not found.');
});

/* DOES NOT WORK PROPERLY
test('POST /users changepassword  and return -410', async (t) => {
  // Creating a new user το drop reset schema
  const testUser = await User.create({
    username: 'user_test',
    password: 'password_test',
    email: 'email',
  });
  const token = jwtSign({username: testUser.username});
 
  const api = await t.context.got.extend({responseType: 'json'});
  const request = {password: 'new_password'};
  // Drop reset in order to be null and return 410
  //await Reset.findOneAndRemove({username: testUser.username});
  const {body} = await api(`users/changepassword?token=${token}`, {
    method: 'POST',
    json: request,
  });
  console.log(body);
  t.is(body.status, 410);
  t.is(body.message, 'Resource Error: Reset token has expired.'); 
});    */

test('POST /users changepassword  changes password correctly', async (t) => {
  const token = jwtSign({username: user.username});
 
  const api = await t.context.got.extend({responseType: 'json'});
  const request = {password: 'new_password'};
  
  const {body, statusCode} = await api(`users/changepassword?token=${token}`, {
    method: 'POST',
    json: request,
  });
 
  t.is(statusCode, 200);
  t.is(body.ok, true);
  t.is(body.message, 'Password was changed.'); 
});   

test('POST /users changepassword  user does not exist', async (t) => {
  // Creating a token for a user that doesn't exist
  const token = jwtSign({username: 'just_a_username'});
 
  const api = await t.context.got.extend({responseType: 'json'});
  const request = {password: 'new_password'};
  // Making the call
  const {body} = await api(`users/changepassword?token=${token}`, {
    method: 'POST',
    json: request,
  });
 
  t.is(body.status, 404);
  t.is(body.message, 'Resource Error: User not found.'); 
});   
//  const body  = new User({ username:'usernameA'});
// const { statusCode } = await api (`users/create-users?token=${token}`,{
// method: 'POST',
// json: body,
// });
// t.is(statusCode, 409);

test('POST /users changepassword with reset scema and return -410', async (t) => {
  const token = jwtSign({username: user.username});
  const api = await t.context.got.extend({responseType: 'json'});
  const request = {password: 'new_password'};
  // Drop reset schema in order to be null and fake the expiration
  await Reset.findOneAndRemove({username: user.username});

  const {body} = await api(`users/changepassword?token=${token}`, {
    method: 'POST',
    json: request,
  });
 
  t.is(body.status, 410);
  t.is(body.message,'Resource Error:Reset token has expired.'); 


  
  // Recreating the reset schema of the user
  await new Reset({
    username: user.username,
    token,
  }).save();
});    