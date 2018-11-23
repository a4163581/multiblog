const V = require('./view')
const M = require('./model')
const logger = require('koa-logger')
const router = require('koa-router')()
const koaBody = require('koa-body')
const session = require('koa-session')

const Koa = require('koa')
const app = (module.exports = new Koa())

app.keys = ['some secret hurr']

const CONFIG = {
  key: 'koa:sess', /** (string) cookie key (default is koa:sess) */
  /** (number || 'session') maxAge in ms (default is 1 days) */
  /** 'session' will result in a cookie that expires when session/browser is closed */
  /** Warning: If a session cookie is stolen, this cookie will never expire */
  maxAge: 86400000,
  autoCommit: true, /** (boolean) automatically commit headers (default true) */
  overwrite: true, /** (boolean) can overwrite or not (default true) */
  httpOnly: true, /** (boolean) httpOnly or not (default true) */
  signed: true, /** (boolean) signed or not (default true) */
  rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. (default is false) */
  renew: false /** (boolean) renew session when session is nearly expired, so we can always keep user logged in. (default is false) */
}

app.use(logger())
app.use(koaBody())
app.use(session(CONFIG, app))

router
  .get('/', list)
  .get('/:user/posts', listpost)
  .get('/:user/post/new', add)
  .get('/:user/post/:id', show)
  .get('/signup', signup)
  .get('/login', login)
  .get('/:user/edit/:id', edit)
  .get('/:user/delete/:id', deletepost)
  .post('/:user/post', create)
  .post('/check', check)
  .post('/enter', enter)
  .post('/:user/modify/:id', modify)

app.use(router.routes())

// post

async function list (ctx) {
  const posts = M.list()
  const users = M.getuser()
  ctx.body = await V.list(posts, users, ctx.session.user)
}

async function listpost (ctx) {
  const user = ctx.params.user
  const posts = M.listpost(user)
  ctx.body = await V.listpost(posts, user)
}

async function add (ctx) {
  if (ctx.session.user !== ctx.params.user) {
    ctx.status = 401
    ctx.body = '<p>請先<a href="/login">登入</a></p>'
  } else {
    const user = ctx.params.user
    ctx.body = await V.new(user)
  }
}

async function show (ctx) {
  const id = ctx.params.id
  const user = ctx.params.user
  const post = M.get(id)
  if (!post) ctx.throw(404, 'invalid post id')
  ctx.body = await V.show(post, ctx.session.user, user)
}

async function create (ctx) {
  const post = ctx.request.body
  const user = ctx.params.user
  M.add(post, user)
  ctx.redirect(`/${user}/posts`)
}

// user

async function signup (ctx) {
  ctx.body = await V.signup()
}

async function check (ctx) {
  const user = ctx.request.body
  if (M.check(user)) {
    ctx.status = 401
    ctx.body = '<p>使用者已存在，請重新<a href="/signup">註冊</a></p>'
  } else {
    ctx.redirect('/login')
  }
}

async function login (ctx) {
  ctx.body = await V.login()
}

async function enter (ctx) {
  const user = ctx.request.body
  if (M.login(user)) {
    ctx.session.user = user.account
    ctx.redirect('/')
  } else {
    ctx.status = 401
    ctx.body = '<p>登入失敗，請重新<a href="/login">登入</a></p>'
  }
}

// modify

async function edit (ctx) {
  const id = ctx.params.id
  const post = M.get(id)
  ctx.body = await V.edit(post)
}

async function modify (ctx) {
  const post = ctx.request.body
  const user = ctx.params.user
  const id = ctx.params.id
  M.modify(post, id)
  ctx.redirect(`/${user}/post/${id}`)
}

// delete

async function deletepost (ctx) {
  const id = ctx.params.id
  const user = ctx.params.user
  M.delete(id)
  ctx.redirect(`/${user}/posts`)
}

if (!module.parent) {
  app.listen(3000)
  console.log('Server run at http://localhost:3000')
}
