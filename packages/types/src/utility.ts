/**
 * Further reading on ideas behind these utility types
 *
 * See: https://stackoverflow.com/questions/55904032/how-to-get-optional-property-from-union
 */

/** Get specific type for key(K) in union(T) */
type ValueOfUnion<T, K> = T extends unknown ? (K extends keyof T ? T[K] : undefined) : never

/** Get all keys in union(T) as union */
type KeysOfUnion<T> = T extends unknown ? keyof T : never

/**
 * Create mapping of all keys in union(T) with proper type values
 *
 * _note: `| keyof T` index is simply to tell typescript that T is definitely a sub type of KeysOfUnion_
 */
type UnionMapping<T> = {
  [K in KeysOfUnion<T> | keyof T]: ValueOfUnion<T, K>
}

/** Pick out the elements we know for sure and make everything else optional */
type UnionMerge<T> = Pick<UnionMapping<T>, keyof T> & Partial<UnionMapping<T>>

/** Adds all possible values of union(T) as a nested object under a `chainSpecific` key */
export type ChainSpecific<T, M> = UnionMerge<
  T extends unknown ? (T extends keyof M ? { chainSpecific: M[T] } : undefined) : never
>

/** Adds all possible values of union(T1) as a nested object under a `chainSpecific` && union(T2) as a nested object under a `swapperSpecific` key */
export type ChainAndSwapperSpecific<T1, M1, T2, M2> = UnionMerge<
  T1 extends unknown ? (T1 extends keyof M1 ? { chainSpecific: M1[T1] } : undefined) : never
> &
  UnionMerge<
    T2 extends unknown ? (T2 extends keyof M2 ? { swapperSpecific: M2[T2] } : undefined) : never
  >
