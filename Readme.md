Typed Koa with built-in router

```ts
const app = new Koa /*<{}>*/().use(
  (ctx: Context<{ user: { id: string } }>, next) => {
    ctx.state.user.id = "id";
    return next();
  }
); /*<{user:{id: string}}>*/

const router1 = app.createRouter("/route1");
router1
  // extend context again
  .use((ctx: Context<{ user: { id: string; name: string } }>, next) => {
    ctx.state.user.name = "username";
    console.log(ctx);
  })
  .get("/abc", ctx => {
    ctx.body = `hello, ${ctx.state.user.name}!`;
  });
app.listen(3000);
```
