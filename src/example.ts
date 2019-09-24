// app.ts
import Application from './application'
import { Context } from './context'

const app = new Application /*<{}>*/().use((ctx: Context<{ user: { id: string } }>, next) => {
  return next()
}) /*<{user:{id: string}}>*/

const router1 = app.createRouter('/route1')
router1
  // extend context again
  .use((ctx: Context<{ user: { id: string; name: string } }>, next) => {
    ctx.state.user.name = 'foo'
    console.log(ctx)
  })
  .get('/abc', ctx => {
    ctx.body = `hello, ${ctx.state.user.name}!`
  })
app.listen(3000)
