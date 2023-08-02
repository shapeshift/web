export type AnyFunction = (...args: any[]) => any
export type Nullable<T> = T | null

interface Flavoring<FlavorT> {
  _type?: FlavorT
}

export type Nominal<T, FlavorT> = T & Flavoring<FlavorT>
