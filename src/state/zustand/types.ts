// https://github.com/pmndrs/zustand/blob/main/docs/guides/auto-generating-selectors.md
export type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

// https://github.com/pmndrs/zustand/blob/main/src/vanilla.ts#L1
export type SetStoreAction<T> = {
  (
    partial:
      | T
      | Partial<T>
      | {
          (state: T): T | Partial<T>
        },
    replace?: boolean | undefined,
    action?: string,
  ): void
}
