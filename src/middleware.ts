import { Context } from './context'
import Request from './request'

export type Middleware<S extends {}, R extends Request> = (
  ctx: Context<S, R>,
  next: () => Promise<void>,
) => void | Promise<void>
