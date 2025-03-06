// process.env is not properly typed but could be if we were using vite imports.meta. wen vite?
export type Csp = Record<string, (string | undefined)[]>
export type CspEntry = (string | undefined)[]
