import delegate from 'delegates'
import Cookies from 'cookies'
import { IncomingMessage, ServerResponse } from 'http'
import createError from 'http-errors'
import statuses from 'statuses'
import util from 'util'
import httpAssert from 'http-assert'

import Request from './request'
import Response from './response'
import Application from './application'

const COOKIES = Symbol()

export class Context<S = {}> {
  req: IncomingMessage
  res: ServerResponse;
  [COOKIES]: Cookies
  originalUrl: string
  state: S = {} as any
  respond?: boolean

  constructor(public app: Application, public request: Request, public response: Response) {
    this.req = request.req
    this.res = response.res
    this.originalUrl = request.originalUrl
  }

  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure,
      })
    }
    return this[COOKIES]
  }

  set cookies(_cookies) {
    this[COOKIES] = _cookies
  }

  throw(...args: any) {
    throw createError(...args)
  }
  assert = httpAssert
  onerror(
    err:
      | Error & {
          headerSent?: boolean
          headers?: { [key: string]: string }
          status?: number
          code?: string
          expose?: boolean
        }
      | null,
  ) {
    // don't do anything if there is no error.
    // this allows you to pass `this.onerror`
    // to node-style callbacks.
    if (null == err) return

    if (!(err instanceof Error)) err = new Error(util.format('non-error thrown: %j', err))

    let headerSent = false
    if (this.headerSent || !this.writable) {
      headerSent = err.headerSent = true
    }

    // delegate
    this.app.emit('error', err, this)

    // nothing we can do here other
    // than delegate to the app-level
    // handler and log.
    if (headerSent) {
      return
    }

    const { res } = this

    // first unset all headers
    /* istanbul ignore else */
    if (typeof res.getHeaderNames === 'function') {
      res.getHeaderNames().forEach(name => res.removeHeader(name))
    } else {
      ;(res as any)._headers = {} // Node < 7.7
    }

    // then set those specified
    this.set(err.headers || {})

    // force text/plain
    this.type = 'text'

    // ENOENT support
    if ('ENOENT' == err.code) err.status = 404

    // default to 500
    if ('number' != typeof err.status || !statuses[err.status]) err.status = 500

    // respond
    const code = statuses[err.status]
    const msg = err.expose ? err.message : code
    this.status = err.status
    this.length = Buffer.byteLength(msg!)
    res.end(msg)
  }
  inspect() {
    return this.toJSON()
  }
  [util.inspect.custom] = this.inspect

  /**
   * Return JSON representation.
   *
   * Here we explicitly invoke .toJSON() on each
   * object, as iteration will otherwise fail due
   * to the getters and cause utilities such as
   * clone() to fail.
   *
   * @return {Object}
   * @api public
   */

  toJSON() {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket>',
    }
  }
}

export interface Context extends Delegate {}
type Delegate = Pick<
  Response,
  | 'attachment'
  | 'redirect'
  | 'remove'
  | 'vary'
  | 'set'
  | 'append'
  | 'flushHeaders'
  | 'status'
  | 'message'
  | 'body'
  | 'length'
  | 'type'
  | 'lastModified'
  | 'etag'
  | 'headerSent'
  | 'writable'
> &
  Pick<
    Request,
    | 'acceptsLanguages'
    | 'acceptsEncodings'
    | 'acceptsCharsets'
    | 'accepts'
    | 'get'
    | 'is'
    | 'querystring'
    | 'idempotent'
    | 'socket'
    | 'search'
    | 'method'
    | 'query'
    | 'path'
    | 'url'
    | 'accept'
    | 'origin'
    | 'href'
    | 'subdomains'
    | 'protocol'
    | 'host'
    | 'hostname'
    | 'URL'
    | 'header'
    | 'headers'
    | 'secure'
    | 'stale'
    | 'fresh'
    | 'ips'
    | 'ip'
  >

// /**
//  * Response delegation.
//  */

delegate(Context.prototype, 'response')
  .method('attachment')
  .method('redirect')
  .method('remove')
  .method('vary')
  .method('set')
  .method('append')
  .method('flushHeaders')
  .access('status')
  .access('message')
  .access('body')
  .access('length')
  .access('type')
  .access('lastModified')
  .access('etag')
  .getter('headerSent')
  .getter('writable')

/**
 * Request delegation.
 */

delegate(Context.prototype, 'request')
  .method('acceptsLanguages')
  .method('acceptsEncodings')
  .method('acceptsCharsets')
  .method('accepts')
  .method('get')
  .method('is')
  .access('querystring')
  .access('idempotent')
  .access('socket')
  .access('search')
  .access('method')
  .access('query')
  .access('path')
  .access('url')
  .access('accept')
  .getter('origin')
  .getter('href')
  .getter('subdomains')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('URL')
  .getter('header')
  .getter('headers')
  .getter('secure')
  .getter('stale')
  .getter('fresh')
  .getter('ips')
  .getter('ip')
