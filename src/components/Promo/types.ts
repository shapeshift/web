import type Polyglot from 'node-polyglot'

export type PromoItem = {
  id: string
  title: string | [string, number | Polyglot.InterpolationOptions]
  body: string | [string, number | Polyglot.InterpolationOptions]
  cta: string | [string, number | Polyglot.InterpolationOptions]
  href: string
  startDate: string
  endDate: string
  image?: string
  colorScheme?: string
  walletRequired: boolean
  rightElement?: JSX.Element
  isExternal?: boolean
}
