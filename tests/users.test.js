/* eslint-disable import/no-unresolved */
require('dotenv').config();


//const {env} = require('../src/tests/.env');
const http = require('node:http');
const test = require('ava').serial;
const got = require('got');

const listen = require('test-listen');

const Source = require('../src/models/source');



const app = require('../src/index');
const User = require('../src/models/user');

//const {comparePassword} = require('../src/utilities/authentication/helpers');
//const {passwordDigest} = require('../src/utilities/authentication/helpers');
//const User = require('../src/models/user');
const { jwtSign } = require('../src/utilities/authentication/helpers');

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

  user = await  User.create({
    username: 'user',
    password: 'password',
    email: 'email',
  });
});




test.after.always((t) => {
  t.context.server.close();

  User.findByIdAndDelete(user._id);

});
est.beforeEach(() => {
  sinon.resetHistory();
  sinon.restore(); 
  sinon.reset(); 
});

                 //CREATE 
  test('POST /users create user that already exists - 409 ',async  (t) => {
    const token = jwtSign({ id: user._id});

    await   User.create({
        username:'user',
        password: 'password',
        email: 'email',
    });


    const api = await t.context.got.extend({
     responseType:'json',
    });

    const request = new User({username: 'user'});
    const {body} =await  api(`users/create-user?token=${token}`,{
      method: 'POST',
      json: request,

    });

    //t.is(body.status,409);
    t.is(body.message,'Registration Error: A user with that e-mail or username already exists.');
  });

 


  //  const body  = new User({ username:'usernameA'});
   // const { statusCode } = await api (`users/create-users?token=${token}`,{
     // method: 'POST',
      //json: body,
    //});
    //t.is(statusCode, 409);



    

  

