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
