export type AnyFunction = (...args: any[]) => any
export type Nullable<T> = T | null
export type Identity<T> = (args: T) => T

interface Flavoring<FlavorT> {
  _type?: FlavorT
}

export type Nominal<T, FlavorT> = T & Flavoring<FlavorT>
