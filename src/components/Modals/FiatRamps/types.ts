import type { ColorMode } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'

import type { FiatRampAction } from './FiatRampsCommon'

export type CreateUrlProps = {
  action: FiatRampAction
  assetId: AssetId | string
  address: string
  fiatCurrency: string
  fiatAmount?: string
  amountCryptoPrecision?: string
  walletAuth?: {
    signMessage: (message: string, address: string, chainId: string) => Promise<string>
    assertActive: () => void
  }
  options: {
    language: string
    mode: ColorMode
    currentUrl?: string
  }
}
