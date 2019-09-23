declare class Delegate {
  method(name: string): this
  access(name: string): this
  getter(name: string): this
}

declare function delegate(proto: object, target: string): Delegate
export = delegate
