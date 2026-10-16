import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core/wallet'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { useCallback, useMemo, useRef } from 'react'
import { stringToHex } from 'viem'

import type { OnramperWalletAuth } from './walletAuth'
import { OnramperCheckoutError } from './walletAuth'

import { assertGetEvmChainAdapter } from '@/lib/utils/evm'

export const useOnramperWalletAuth = (
  wallet: HDWallet | null,
  accountMetadata: AccountMetadata | undefined,
): OnramperWalletAuth => {
  const current = useRef({ wallet, accountMetadata })
  current.current = { wallet, accountMetadata }

  const assertActive = useCallback(() => {
    if (current.current.wallet !== wallet || current.current.accountMetadata !== accountMetadata)
      throw new OnramperCheckoutError('fiatRamps.onramperWalletChanged')
  }, [wallet, accountMetadata])

  const signMessage = useCallback(
    async (message: string, address: string, chainId: string): Promise<string> => {
      assertActive()
      if (!wallet || !supportsETH(wallet) || !accountMetadata)
        throw new OnramperCheckoutError('fiatRamps.onramperWalletUnsupported')
      const adapter = assertGetEvmChainAdapter(chainId)
      const walletAddress = await adapter.getAddress({
        wallet,
        accountNumber: accountMetadata.bip44Params.accountNumber,
      })
      if (walletAddress.toLowerCase() !== address.toLowerCase())
        throw new OnramperCheckoutError('fiatRamps.onramperWalletMismatch')
      const addressNList = toAddressNList(adapter.getBip44Params(accountMetadata.bip44Params))
      const signature = await adapter.signMessage({
        wallet,
        messageToSign: { addressNList, message: stringToHex(message) },
      })
      assertActive()
      return signature
    },
    [wallet, accountMetadata, assertActive],
  )

  return useMemo(() => ({ signMessage, assertActive }), [signMessage, assertActive])
}
