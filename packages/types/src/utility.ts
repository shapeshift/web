/**
 * Further reading on ideas behind these utility types
 *
 * See: https://stackoverflow.com/questions/55904032/how-to-get-optional-property-from-union
 */

/** Get specific type for key(K) in union(T) */
export type ValueOfUnion<T, K> = T extends unknown ? (K extends keyof T ? T[K] : undefined) : never

/** Get all keys in union(T) as union */
export type KeysOfUnion<T> = T extends unknown ? keyof T : never

/**
 * Create mapping of all keys in union(T) with proper type values
 *
 * _note: `| keyof T` index is simply to tell typescript that T is definitely a sub type of KeysOfUnion_
 */
export type UnionMapping<T> = {
  [K in KeysOfUnion<T> | keyof T]: ValueOfUnion<T, K>
}

/** Pick out the elements we know for sure and make everything else optional */
export type UnionMerge<T> = Pick<UnionMapping<T>, keyof T> & Partial<UnionMapping<T>>

/** Adds all possible values of union(T) as a nested object under a `chainSpecific` key */
export type ChainSpecific<T, M> = UnionMerge<
  T extends unknown ? (T extends keyof M ? { chainSpecific: M[T] } : undefined) : never
>

export type PartialRecord<K extends keyof any, V> = Partial<Record<K, V>>

export type NestedArray<T> = PartialRecord<keyof any, PartialRecord<keyof any, T[]>>

type Head<T extends string> = T extends `${infer First}.${string}` ? First : T

type Tail<T extends string> = T extends `${string}.${infer Rest}` ? Rest : never

// allows us to deeply pick types using dot notation
// e.g `DeepPick<MyType, 'fieldA' | 'FieldB.nestedField' | 'FieldB.otherNestedField'>`
export type DeepPick<T, K extends string> = T extends object
  ? {
      [P in Extract<Head<K>, keyof T>]: Tail<Extract<K, `${P}.${string}`>> extends never
        ? T[P]
        : DeepPick<T[P], Tail<Extract<K, `${P}.${string}`>>>
    }
  : T
