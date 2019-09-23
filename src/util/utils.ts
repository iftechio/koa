export function isJSON(body: any) {
  if (!body) return false
  if ('string' == typeof body) return false
  if ('function' == typeof body.pipe) return false
  if (Buffer.isBuffer(body)) return false
  return true
}

export function strEnum<T extends string>(strs: T[]) {
  return strs.reduce(
    (p, c) => {
      p[c] = c
      return p
    },
    {} as { [K in T]: K },
  )
}
