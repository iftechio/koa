import Routington from 'routington'
import * as http from 'http'
import Request from './request'
import Response from './response'
import Keygrip from 'keygrip'
import { Context } from './context'
import { EventEmitter } from 'events'
import Debug from 'debug'
import { logMethod } from './util/debug'
import { Stream } from 'stream'
import statuses from 'statuses'
import { isJSON, strEnum } from './util/utils'
import util from 'util'
import onFinished from 'on-finished'

const debug = Debug('koa:application')

const ROUTER = Symbol()
type HTTP_Methods = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const http_methods = strEnum(['get', 'post', 'put', 'patch', 'delete'])

// augment Routington fields
declare module 'routington' {
  export default interface Routington extends Handlers {
    [ROUTER]: Router
  }
  type Handlers = {
    [key in HTTP_Methods]: RoutherHandler<any>
  }
}

interface Router<S = {}> extends Routerhandles<S> {}
type Routerhandles<S> = {
  [key in keyof typeof http_methods]: (path: string, handler: RoutherHandler<S>) => void
}

class Router<S = {}> {
  paths: string[] = []
  constructor(public node: Routington, paths: string[]) {
    this.paths = [...paths] // clone
  }
  // use<SS extends S>(middleware: Middleware<SS>){
  //   this.middleware.push(middleware)
  //   return (this as unknown) as Router<SS>
  // }
  subRoute(prefix: string) {
    if (prefix.startsWith('/')) {
      prefix = prefix.slice(1)
    }
    const path = [...this.paths, prefix].join('/')
    debug('subRoute define', path)
    const [node] = this.node.define(path)
    const router = new Router<S>(this.node, [...this.paths, prefix])
    node[ROUTER] = router
    return router
  }
}

for (let method of Object.keys(http_methods)) {
  Object.defineProperty(Router.prototype, method, {
    value: function<S>(this: Router, path: string, handler: RoutherHandler<S>) {
      if (path.startsWith('/')) {
        path = path.slice(1)
      }
      path = [...this.paths, path].join('/')
      const [node] = this.node.define(path)
      debug('define %s %o', path, node)
      if (node[method.toUpperCase() as HTTP_Methods]) {
        throw new Error('already defined')
      }
      node[method.toUpperCase() as HTTP_Methods] = handler
    },
  })
}

type RoutherHandler<S> = (ctx: Context<S>) => void | Promise<void>
type Middleware<S> = (ctx: Context<S>, next: () => Promise<void>) => void | Promise<void>

@logMethod(debug)
class Application<S = {}> extends EventEmitter {
  rootRouter: Router<S>
  proxy: any
  subdomainOffset: any
  keys: string[] | Keygrip | undefined
  middleware: Middleware<any>[] = []
  silent?: boolean
  env: string

  async route(ctx: Context<S>): Promise<void> {
    const method = ctx.request.method as HTTP_Methods
    ;(() => {
      const path = ctx.path!.slice(1)
      const match = this.rootRouter.node.match(path)
      debug('match %s %s %o %o', method, path, match, this.rootRouter.node)

      if (!match) {
        return
      }

      if (match.node[method]) {
        match.node[method](ctx)
      }
    })()
    // 404
  }
  /**
   *
   * @param {object} [options] Application options
   * @param {string} [options.env='development'] Environment
   * @param {string[]} [options.keys] Signed cookie keys
   * @param {boolean} [options.proxy] Trust proxy headers
   * @param {number} [options.subdomainOffset] Subdomain offset
   *
   */
  constructor(
    options: {
      env?: string
      keys?: string[]
      proxy?: boolean
      subdomainOffset?: number
    } = {},
  ) {
    super()
    this.proxy = options.proxy || false
    this.subdomainOffset = options.subdomainOffset || 2
    this.env = options.env || process.env.NODE_ENV || 'development'
    if (options.keys) this.keys = options.keys

    this.rootRouter = new Router<S>(new Routington(), [])
  }
  async handleRequest(ctx: Context<S>) {
    ctx.res.statusCode = 404
    const dispatch = async (i: number) => {
      debug('dispatch', i, this.middleware.length)
      if (i >= this.middleware.length) {
        return this.route(ctx)
      }
      await this.middleware[i](ctx, dispatch.bind(null, i + 1))
    }

    const onerror = (err: Error | null) => ctx.onerror(err)
    onFinished(ctx.res, onerror)

    return dispatch(0)
      .then(() => this.respond(ctx))
      .catch(onerror)
  }
  respond(ctx: Context<S>) {
    // allow bypassing koa
    if (false === ctx.respond) return
    if (!ctx.writable) return

    const res = ctx.res
    let body = ctx.body
    const code = ctx.status

    // ignore body
    if (statuses.empty[code]) {
      // strip headers
      ctx.body = null
      return res.end()
    }

    if ('HEAD' == ctx.method) {
      if (!res.headersSent && isJSON(body)) {
        ctx.length = Buffer.byteLength(JSON.stringify(body))
      }
      return res.end()
    }

    // status body
    if (null == body) {
      if (ctx.req.httpVersionMajor >= 2) {
        body = String(code)
      } else {
        body = ctx.message || String(code)
      }
      if (!res.headersSent) {
        ctx.type = 'text'
        ctx.length = Buffer.byteLength(body)
      }
      return res.end(body)
    }

    // responses
    if (Buffer.isBuffer(body)) return res.end(body)
    if ('string' == typeof body) return res.end(body)
    if (body instanceof Stream) return body.pipe(res)

    // body: json
    body = JSON.stringify(body)
    if (!res.headersSent) {
      ctx.length = Buffer.byteLength(body)
    }
    res.end(body)
  }

  createRouter(prefix: string) {
    if (prefix.startsWith('/')) {
      prefix = prefix.slice(1)
    }
    const router = this.rootRouter.subRoute(prefix)
    return router
  }

  use<SS extends S>(middleware: Middleware<SS>): Application<SS> {
    if (typeof middleware !== 'function') throw new TypeError('middleware must be a function!')
    this.middleware.push(middleware)
    return (this as unknown) as Application<SS>
  }
  createContext(req: http.IncomingMessage, res: http.ServerResponse): Context<S> {
    const request = new Request(this, req, res)
    const response = new Response(this, req, res)
    const context = new Context<S>(this, request, response)
    request.ctx = context
    response.ctx = context
    request.response = response
    response.request = request

    return context
  }
  toJSON() {
    return { subdomainOffset: this.subdomainOffset, proxy: this.proxy, env: this.env }
  }
  inspect() {
    return this.toJSON()
  }
  [util.inspect.custom] = this.inspect

  /**
   * Default error handler.
   *
   * @param {Error} err
   * @api private
   */

  onerror(
    err: Error & {
      status?: number
      expose?: boolean
    },
  ) {
    if (!(err instanceof Error)) throw new TypeError(util.format('non-error thrown: %j', err))

    if (404 == err.status || err.expose) return
    if (this.silent) return

    const msg = err.stack || err.toString()
    console.error()
    console.error(msg.replace(/^/gm, '  '))
    console.error()
  }
  callback() {
    if (!this.listenerCount('error')) this.on('error', this.onerror)

    return (req: http.IncomingMessage, res: http.ServerResponse) => {
      const ctx = this.createContext(req, res)
      return this.handleRequest(ctx)
    }
  }
  listen(address: string | number) {
    const server: http.Server = http.createServer(this.callback())
    return address ? server.listen(address) : server.listen()
  }
}

export = Application
