declare module 'routington' {
  export default class Routington {
    name: string
    regex: string
    child: { [key: string]: Routington }
    children: Routington[]

    define(route: string): Routington[]
    match(url: string): { param: { id: string }; node: Routington } | null
    static parse(str: string): { name: string; string: {}; regex: string }
  }
}
