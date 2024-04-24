declare module 'module-alias' {
  declare namespace register {}

  // Manually declaring this as @types/module-alias is several version behind and doesn't have this variant
  export function addAlias(alias: string, path: (path: string) => void): void
}
