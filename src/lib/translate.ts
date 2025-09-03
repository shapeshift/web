import type { InterpolationOptions } from 'node-polyglot'

export type TranslateFunction = (phrase: string, options?: number | InterpolationOptions) => string
