/* eslint-disable import/no-unresolved */
require('dotenv').config();

const http = require('node:http');
const test = require('ava').default;
const got = require('got');
const listen = require('test-listen');
const Source = require('../src/models/source');
const app = require('../src/index');
const User = require('../src/models/user');
const { jwtSign } = require('../src/utilities/authentication/helpers');
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

test('GET /statistics returns correct response and status code', async (t) => {
  const { body, statusCode } = await t.context.got('general/statistics');
  //t.is(body.sources, 1);
  t.assert(body.success);
  t.is(statusCode, 200);
});

test('GET /sources returns correct response and status code', async (t) => {
  const token = jwtSign({ id: 1 });
  const { statusCode } = await t.context.got(`sources/sources?token=${token}`);
  t.is(statusCode, 200);
});
test('GET /sources returns sources', async (t) => {
  const token = jwtSign({ id: user._id });
  await Source.create({
    name: 'name',
    type: 'type',
    url: 'url',
    login: 'login',
    passcode: '',
    vhost: '',
    owner: user._id,
  });
  const { statusCode } = await t.context.got(`sources/sources?token=${token}`);
  t.is(statusCode, 200);
});
test('GET /sources with invalid token returns 403 status code', async (t) => {
  const token = '123';
  const { statusCode } = await t.context.got(`sources/sources?token=${token}`);
  t.is(statusCode, 403);
});
test('POST /create-source returns correct response and status code', async (t) => {
  const token = jwtSign({ id: 1 });

  const api = await t.context.got.extend({
    responseType: 'json',
  });

  const body = new Source({ name: 'Name' });
  const { statusCode } = await api(`sources/create-source?token=${token}`, {
    method: 'POST',
    json: body,
  });
  t.is(statusCode, 200);
});
test('POST /create-source returns correct response and status code when duplicate', async (t) => {
  const token = jwtSign({ id: user._id });
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

  const request = new Source({ name: 'name1' });
  const { body } = await api(`sources/create-source?token=${token}`, {
    method: 'POST',
    json: request,
  });
  t.is(body.status, 409);
});
test('POST /create-source with invalid token returns 403', async (t) => {
  const token = '123';

  const api = await t.context.got.extend({
    responseType: 'json',
  });

  const body = new Source({ name: 'Name' });
  const { statusCode } = await api(`sources/create-source?token=${token}`, {
    method: 'POST',
    json: body,
  });
  t.is(statusCode, 403);
});
test('POST /change-source returns correct response and status code', async (t) => {
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
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  const request = {
    id: createdSource._id,
    name: 'new name',
    type: '0',
    url: '000',
    login: '',
    passcode: '',
    vhost: '',
  };
  const { statusCode } = await api(`sources/change-source?token=${token}`, {
    method: 'POST',
    json: request,
  });
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
  const token = jwtSign({ id: user._id });
  const api = await t.context.got.extend({
    responseType: 'json',
  });

  const request = {
    id: 'this id does not exist',
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
test('POST /change-source with invalid token returns 403', async (t) => {
  const token = '123';

  const api = await t.context.got.extend({
    responseType: 'json',
  });

  const body = new Source({ name: 'Name' });
  const { statusCode } = await api(`sources/change-source?token=${token}`, {
    method: 'POST',
    json: body,
  });
  t.is(statusCode, 403);
});
test('POST /delete-source returns correct response and status code', async (t) => {
  const token = jwtSign({ id: user._id });
  await Source.create({
    name: 'name',
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

  const body = { id: 0 };
  const { statusCode } = await api(`sources/delete-source?token=${token}`, {
    method: 'POST',
    json: body,
  });
  t.is(statusCode, 200);
});
test('POST /delete-source with invalid token returns 403', async (t) => {
  const token = '123';

  const api = await t.context.got.extend({
    responseType: 'json',
  });

  const body = { id: 1 };
  const { statusCode } = await api(`sources/delete-source?token=${token}`, {
    method: 'POST',
    json: body,
  });
  t.is(statusCode, 403);
});
test('POST /source returns correct response and status code', async (t) => {
  await Source.create({
    name: 'name',
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
  let requestedUser = { ...user };
  requestedUser.id = user._id;
  const body = { name: 'name', owner: 'self', user: requestedUser };
  const { statusCode } = await api(`sources/source`, {
    method: 'POST',
    json: body,
  });
  t.is(statusCode, 200);
});
test('POST /source returns correct response and status code when source does not exist', async (t) => {
  await Source.create({
    name: 'name',
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
  let requestedUser = { ...user };
  requestedUser.id = user._id;
  const request = { name: 'name999', owner: 'self', user: requestedUser };
  const { body } = await api(`sources/source`, {
    method: 'POST',
    json: request,
  });
  t.is(body.status, 409);
});
