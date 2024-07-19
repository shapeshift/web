import type { ChainId } from '@shapeshiftoss/caip'
import type { slip44Table } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertUnreachable } from 'lib/utils'

type LedgerOpenAppProps = {
  chainId: ChainId
  onReady: (() => void) | undefined
}

type Slip44Key = keyof typeof slip44Table

export const getSlip44KeyFromChainId = (chainId: ChainId): Slip44Key | undefined => {
  const knownChainId = chainId as KnownChainIds
  switch (knownChainId) {
    // UTXO chains
    case KnownChainIds.BitcoinMainnet:
      return 'Bitcoin'
    case KnownChainIds.DogecoinMainnet:
      return 'Dogecoin'
    case KnownChainIds.BitcoinCashMainnet:
      return 'BitcoinCash'
    case KnownChainIds.LitecoinMainnet:
      return 'Litecoin'
    // EVM chains
    case KnownChainIds.EthereumMainnet:
      return 'Ethereum'
    case KnownChainIds.AvalancheMainnet:
      return 'Avalanche'
    case KnownChainIds.OptimismMainnet:
      return 'Optimism'
    case KnownChainIds.BnbSmartChainMainnet:
      return 'BnbSmartChain'
    case KnownChainIds.PolygonMainnet:
      return 'Polygon'
    case KnownChainIds.GnosisMainnet:
      return 'Gnosis'
    case KnownChainIds.ArbitrumMainnet:
      return 'Arbitrum'
    case KnownChainIds.ArbitrumNovaMainnet:
      return 'ArbitrumNova'
    case KnownChainIds.BaseMainnet:
      return 'Base'
    // Cosmos chains
    case KnownChainIds.ThorchainMainnet:
      return 'Rune'
    case KnownChainIds.CosmosMainnet:
      return 'Atom'
    default:
      assertUnreachable(knownChainId)
  }
}

export const useWaitForLedgerApp = ({ chainId, onReady }: LedgerOpenAppProps) => {
  const wallet = useWallet().state.wallet

  const checkIsCorrectAppOpen = useCallback(async () => {
    const slip44Key = getSlip44KeyFromChainId(chainId)

    const ledgerWallet = wallet && isLedger(wallet) ? wallet : undefined
    if (!ledgerWallet || !slip44Key) return false
    try {
      await ledgerWallet.validateCurrentApp(slip44Key)
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }, [chainId, wallet])

  useEffect(() => {
    // Don't start polling until the onReady callback is set
    if (!onReady) return

    // Poll the Ledger every second to see if the correct app is open
    const intervalId = setInterval(async () => {
      const isValidApp = await checkIsCorrectAppOpen()
      if (isValidApp) {
        clearInterval(intervalId)
        onReady()
      }
    }, 1000)

    return () => clearInterval(intervalId) // Clean up on component unmount
  }, [checkIsCorrectAppOpen, onReady])
}

export const useCheckLedgerApp = () => {
  const wallet = useWallet().state.wallet

  const checkIsCorrectAppOpen = useCallback(
    async (chainId: ChainId) => {
      const slip44Key = getSlip44KeyFromChainId(chainId)

      const ledgerWallet = wallet && isLedger(wallet) ? wallet : undefined
      if (!ledgerWallet || !slip44Key) return false
      try {
        await ledgerWallet.validateCurrentApp(slip44Key)
        return true
      } catch (error) {
        console.error(error)
        return false
      }
    },
    [wallet],
  )

  return checkIsCorrectAppOpen
}
