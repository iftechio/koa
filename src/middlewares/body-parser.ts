import parse from 'co-body'
import { Context } from '../context'
import Request from '../request'

export interface BodyParserOpts {
  detectJSON?: Function
  onerror?: Function
  returnRawBody?: boolean
  enableTypes?: string[]
  extendTypes?: { [key: string]: string }
}

type Body = {
  body: any
  rawBody: string
}

export function BodyParser<S>(opts?: BodyParserOpts) {
  opts = opts || {}
  var detectJSON = opts.detectJSON
  var onerror = opts.onerror

  var enableTypes = opts.enableTypes || ['json', 'form']
  var enableForm = checkEnable(enableTypes, 'form')
  var enableJson = checkEnable(enableTypes, 'json')
  var enableText = checkEnable(enableTypes, 'text')

  opts.detectJSON = undefined
  opts.onerror = undefined

  // force co-body return raw body
  opts.returnRawBody = true

  // default json types
  var jsonTypes = [
    'application/json',
    'application/json-patch+json',
    'application/vnd.api+json',
    'application/csp-report',
  ]

  // default form types
  var formTypes = ['application/x-www-form-urlencoded']

  // default text types
  var textTypes = ['text/plain']

  var jsonOpts = formatOptions(opts, 'json')
  var formOpts = formatOptions(opts, 'form')
  var textOpts = formatOptions(opts, 'text')

  var extendTypes = opts.extendTypes || {}

  extendType(jsonTypes, extendTypes.json)
  extendType(formTypes, extendTypes.form)
  extendType(textTypes, extendTypes.text)
  return async function bodyParser(ctx: Context<S, Request & Body>, next: () => Promise<void>) {
    if (ctx.request.body !== undefined) return await next()
    if (ctx.disableBodyParser) return await next()
    try {
      const res = await parseBody(ctx)
      ctx.request.body = 'parsed' in res ? res.parsed : {}
      if (ctx.request.rawBody === undefined) ctx.request.rawBody = res.raw
    } catch (err) {
      if (onerror) {
        onerror(err, ctx)
      } else {
        throw err
      }
    }
    await next()
  }

  async function parseBody<S>(ctx: Context<S>) {
    if (enableJson && ((detectJSON && detectJSON(ctx)) || ctx.request.is(jsonTypes))) {
      return await parse.json(ctx as any, jsonOpts)
    }
    if (enableForm && ctx.request.is(formTypes)) {
      return await parse.form(ctx as any, formOpts)
    }
    if (enableText && ctx.request.is(textTypes)) {
      return (await parse.text(ctx as any, textOpts)) || ''
    }
    return {}
  }
}

function formatOptions(opts: BodyParserOpts, type: string) {
  var res: BodyParserOpts & { limit?: any } = {}
  let key: keyof BodyParserOpts
  for (key in opts) {
    res[key] = opts[key] as any
  }
  res.limit = opts[(type + 'Limit') as keyof BodyParserOpts]
  return res
}

function extendType(original: string[], extend: string | string[]) {
  if (extend) {
    if (!Array.isArray(extend)) {
      extend = [extend]
    }
    extend.forEach(function(extend) {
      original.push(extend)
    })
  }
}

function checkEnable(types: string[], type: string) {
  return types.includes(type)
}
