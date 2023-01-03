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
               //CREATE 

 test('POST /users create user with valid data - 200 ',async  (t) => {
    const token = jwtSign({ id: user._id});
    const api = await t.context.got.extend({
     responseType:'json',
    });
    let newUser={...user};
    newUser.id= user._id;
    const body = new User({username:'new_user', password:'new_password', email:'kostas@gmail.com'});
    const { statusCode } = await api(`users/create?token=${token}`, {
      method: 'POST',
      json: body,
    }); 
    console.log(body);
    t.is(statusCode,200);
    //t.is(token,newUser.id);
  });
               
  test('POST /users create user that already exists - 409 ',async  (t) => {
    
    const api = await t.context.got.extend({
     responseType:'json',
    });

    const request = new User({username: 'user',password:'password',email:'bill@gmail.com '});
    const {body} =await api(`users/create`,{
      method: 'POST',
      json: request,
    });
    t.is(body.status,409);
    t.is(body.message,'Registration Error: A user with that e-mail or username already exists.');
  });
  
  
  test('POST /users authendicate user, user not found - 401', async (t)=> {
    const api = await t.context.got.extend({
      responseType:'json',
    });
    const request = new User({username: 'usern',password: '56789'});
    const {body} = await api(`users/authenticate`,{
      method:'POST',
      json: request,
    });
    t.is(body.status,401);
    t.is(body.message, 'Authentication Error: User not found.');
  });
   test('POST /users authentication password doesnot match -401',async (t) =>{
    const api = await t.context.got.extend({
      responseType:'json',
    });

    const request = new User({username: 'new_user', password: '5566788'});
    const{body} = await api(`users/authenticate`,{
      method: 'POST',
      json: request,
    });
    //console.log(body);
    t.is(body.status,401);
   // t.is(body.message,'Authentication Error: Password does not match!');
   })
  
   test('POST /users authentication password is correct -200',async (t) =>{
   // const token = jwtSign({username:user.username, id: user._id, email:user.email });
    const token = jwtSign({id:1 });

    const api = await t.context.got.extend({
      responseType:'json',
    });
    const body = new User({username:'new_user', password: 'new_password', email:'kostas@gmail.com'});
    const{statusCode} = await api(`users/authenticate?token=${token}`,{
      method:'POST',
      json: body,
    });
    console.log(body);
    t.is(statusCode, 200); 
   });
   test('POST /users reset password -404',async (t) => {
    //const token = jwtSign({ id: user._id });
    const api = await t.context.got.extend({
      responseType:'json',
    });

    const request = new User({username:'new_user' , password:'89887' , email:'kostasPap@gmail.com'});
    const {body} = await api(`users/resetpassword`,{
      method: 'POST',
      json: request,
    });

   // console.log(body);
    t.is(body.status,404);
    t.is(body.message, 'Resource Error : User not found.');
      
   }); 

   test('POST /users change password -404',async (t) =>{
    const token = jwtSign({ id: user._id });
    const api = await t.context.got.extend ({
      responseType: 'json',
    });
    
    const request = new User({username:'new_user',password: '12345678',email: 'kostas@gmail.com'});
    const {body} = await api(`users/changepassword?token=${token}`,{
      method: 'POST',
      json: request,
    });
    //console.log(body);
    t.is(body.status,404);
    t.is(body.message, 'Resource Error: User not found.');
   });


   
  //  const body  = new User({ username:'usernameA'});
   // const { statusCode } = await api (`users/create-users?token=${token}`,{
     // method: 'POST',
      //json: body,
    //});
    //t.is(statusCode, 409);
