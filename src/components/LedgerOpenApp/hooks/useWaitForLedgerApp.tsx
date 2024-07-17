import type { ChainId } from '@shapeshiftoss/caip'
import {
  arbitrumChainId,
  arbitrumNovaChainId,
  avalancheChainId,
  baseChainId,
  bchChainId,
  binanceChainId,
  bscChainId,
  btcChainId,
  cosmosChainId,
  dogeChainId,
  ethChainId,
  gnosisChainId,
  ltcChainId,
  optimismChainId,
  polygonChainId,
  thorchainChainId,
} from '@shapeshiftoss/caip'
import type { slip44Table } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback, useEffect } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

type LedgerOpenAppProps = {
  chainId: ChainId
  onReady: () => void
}

type Slip44Key = keyof typeof slip44Table

const getSlip44KeyFromChainId = (chainId: ChainId): Slip44Key | undefined => {
  switch (chainId) {
    // UTXO chains
    case btcChainId:
      return 'Bitcoin'
    case dogeChainId:
      return 'Dogecoin'
    case bchChainId:
      return 'BitcoinCash'
    case ltcChainId:
      return 'Litecoin'
    // EVM chains
    case ethChainId:
      return 'Ethereum'
    case avalancheChainId:
      return 'Avalanche'
    case optimismChainId:
      return 'Optimism'
    case bscChainId:
      return 'BnbSmartChain'
    case polygonChainId:
      return 'Polygon'
    case gnosisChainId:
      return 'Gnosis'
    case arbitrumChainId:
      return 'Arbitrum'
    case arbitrumNovaChainId:
      return 'ArbitrumNova'
    case baseChainId:
      return 'Base'
    // Cosmos chains
    case thorchainChainId:
      return 'Rune'
    case cosmosChainId:
      return 'Atom'
    case binanceChainId:
      return 'Binance'
    default:
      return undefined
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
