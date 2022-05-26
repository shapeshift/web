import { locales } from './constants'

export const getLocaleLabel = (key: string): string => locales.find(l => l.key === key)?.label ?? ''
