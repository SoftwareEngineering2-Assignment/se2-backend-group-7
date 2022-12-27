/* eslint-disable import/no-unresolved */
require('dotenv').config();



const http = require('node:http');
const test = require('ava').serial;
const got = require('got');
const listen = require('test-listen');
const app = require('../src/index');
const {jwtSign} = require('../src/utilities/authentication/helpers');
const {comparePassword} = require('../src/utilities/authentication/helpers');
const {passwordDigest} = require('../src/utilities/authentication/helpers');
const User = require('../src/models/user');
let user;
const sinon =  require('sinon');



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
  sinon.restore(); 
  sinon.reset(); 
});

test('GET /users returns correct response and status code', async (t) => {
    const token = jwtSign({id: user._id});
   // const cPW = comparePassword({dgrt,ptpr});
  //  const pD =  passwordDigest({dgrt,ptpr});
  //  const {statusCode} = await t.context.got(`users?token=${token}`);
  //  t.is(statusCode, 200);

  await User.create({
  email: 'email',
  username: 'username',
  password: 'password'
 });
 const findStub = sinon
    .stub(Source, 'find')
    .throws(new Error('Something went wrong'));
    const { statusCode } = await t.context.got(`sources/sources?token=${token}`);
    t.is(statusCode, 404);
    findStub.restore();
  });
 

                 //CREATE 
  test('POST /users create user that already exists - 409 ', async (t) => {
    const token = jwtSign({ id: user._id});
    
    await User.create({
      username:'usernameA',
      password: 'password',
      email: 'emailB',
    });
    const api = await t.context.got.extend({
     responseType:'json',
    });

    const request = new User({username: 'usernameA'});
    const {body} = await api(`users/create-users?token=${token}`,{
      method: 'POST',
      json: 'request',
    });

    t.is(body.status,409);
  });

  //  const body  = new User({ username:'Name'});
    //const { statusCode } = await api (`users/create-users?token=${token}`,{
     // method: 'POST',
      //json: body,
    //});
    //t.is(statusCode, 409);

    
   // await User.create({
   //   username: 'username',
   //   password: 'password',
   //   email: 'email',

   // });

  

