export type PromoItem = {
  id: string
  title: string
  body: string
  cta: string
  href: string
  startDate: string
  endDate: string
  image?: string
  colorScheme?: string
  walletRequired: boolean
  rightElement?: JSX.Element
  isExternal?: boolean
}
