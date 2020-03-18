// app.ts
import { Application } from './application'
import { Context } from './context'
import { BodyParser } from './middlewares/body-parser'

// default type param is {} other than any, so it is extendable
const app = new Application /*<{}>*/().use(async (ctx: Context<{ user: { id: string } }>, next) => {
  // get user from db
  // ctx.state.user = await getUser()
  return next()
})

const router1 = app
  .use(BodyParser()) // apply body parser to attach body field to ctx.request
  .createRouter('/route1')
router1
  // when need to extend context type, declare only what you want to attach
  .use<{ user: { name: string } }>((ctx, next) => {
    console.log(ctx.request.body) // access request body
    ctx.state.user.name = 'foo'
    return next()
  })
  // context type is by default according to last middleware
  .use((ctx, next) => {
    // ctx has a default type
    ctx.state.user.id = 'id'
    ctx.state.user.name = 'name'
    return next()
  })
  .get('/abc', ctx => {
    console.log(ctx.state.user.id)
    ctx.body = `hello, ${ctx.state.user.name}!`
  })
app.listen(3000)
