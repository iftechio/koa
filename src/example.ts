// app.ts
import Application from './application'
import { Context } from './context'

// default type param is {} other than any, so it is extendable
const app = new Application /*<{}>*/().use((ctx: Context<{ user: { id: string } }>, next) => {
  return next()
}) /*<{user:{id: string}}>*/

const router1 = app.createRouter('/route1')
router1
  // when need to extend context type, declare only what you want to attach
  .use((ctx: Context<{ user: { name: string } }>, next) => {
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
