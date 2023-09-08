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

// allows use to mark a property of an object as non-nullable
export type RequireFields<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? NonNullable<T[P]> : T[P]
}
