import type { ColorMode } from '@chakra-ui/system'
import type { AssetId } from '@shapeshiftoss/caip'

import type { FiatRampAction } from './FiatRampsCommon'

export type CreateUrlProps = {
  action: FiatRampAction
  assetId: AssetId | string
  address: string
  fiatCurrency: string
  options: {
    language: string
    mode: ColorMode
    currentUrl?: string
  }
}
