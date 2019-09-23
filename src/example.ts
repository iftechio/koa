// app.ts
import Application from './application'
import { Context } from './context'

const app = new Application /*<{}>*/().use((ctx: Context<{ use: { id: string } }>, next) => {
  return next()
}) /*<{user:{}}>*/

const router1 = app.createRouter('/route1')
router1.get('/abc', (ctx: any) => {
  ctx.body = '/route1/abc'
})
app.listen(3000)
