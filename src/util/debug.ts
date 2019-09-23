import { Debugger } from 'debug'

export function logMethod(debug: Debugger): Function {
  return function(ctor: Function) {
    for (let e of Object.getOwnPropertyNames(ctor.prototype)) {
      if (typeof ctor.prototype[e] === 'function') {
        const origin = ctor.prototype[e]
        ctor.prototype[e] = function(...args: any) {
          debug(e)
          return origin.apply(this, args)
        }
      }
    }
    return ctor
  }
}
