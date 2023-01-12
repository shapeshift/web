import { isIOS } from 'react-device-detect'

import { PromoCard } from './PromoCard'
import type { PromoItem } from './types'

const promoData: PromoItem[] = []

export const IOSPromoCards = () => {
  return isIOS ? <PromoCard data={promoData} /> : null
}
