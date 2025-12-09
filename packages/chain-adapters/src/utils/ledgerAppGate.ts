import type { ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { KnownChainIds } from '@shapeshiftoss/types'
import { EventEmitter } from 'node:events'

import { ChainAdapterError } from '../error/ErrorHandler'

export const emitter = new EventEmitter()

export type LedgerOpenAppEventArgs = {
  chainId: ChainId
  reject: (reason?: any) => void
}

export const getLedgerAppName = (chainId: ChainId | KnownChainIds | undefined) => {
  switch (chainId as KnownChainIds) {
    case KnownChainIds.ArbitrumMainnet:
    case KnownChainIds.AvalancheMainnet:
    case KnownChainIds.ArbitrumNovaMainnet:
    case KnownChainIds.BaseMainnet:
    case KnownChainIds.BnbSmartChainMainnet:
    case KnownChainIds.EthereumMainnet:
    case KnownChainIds.GnosisMainnet:
    case KnownChainIds.MonadMainnet:
    case KnownChainIds.OptimismMainnet:
    case KnownChainIds.PolygonMainnet:
      return 'Ethereum'
    case KnownChainIds.BitcoinCashMainnet:
      return 'Bitcoin Cash'
    case KnownChainIds.BitcoinMainnet:
      return 'Bitcoin'
    case KnownChainIds.CosmosMainnet:
      return 'Cosmos'
    case KnownChainIds.DogecoinMainnet:
      return 'Dogecoin'
    case KnownChainIds.LitecoinMainnet:
      return 'Litecoin'
    case KnownChainIds.ZcashMainnet:
      return 'Zcash'
    case KnownChainIds.SolanaMainnet:
      return 'Solana'
    case KnownChainIds.ThorchainMainnet:
    case KnownChainIds.MayachainMainnet:
      return 'THORChain'
    default:
      throw Error(`Unsupported chainId: ${chainId}`)
  }
}

const getCoin = (chainId: ChainId | KnownChainIds) => {
  switch (chainId as KnownChainIds) {
    case KnownChainIds.BitcoinMainnet:
      return 'Bitcoin'
    case KnownChainIds.DogecoinMainnet:
      return 'Dogecoin'
    case KnownChainIds.BitcoinCashMainnet:
      return 'BitcoinCash'
    case KnownChainIds.LitecoinMainnet:
      return 'Litecoin'
    case KnownChainIds.ZcashMainnet:
      return 'Zcash'
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
    case KnownChainIds.MonadMainnet:
      return 'Monad'
    case KnownChainIds.ThorchainMainnet:
      return 'Rune'
    case KnownChainIds.MayachainMainnet:
      return 'Mayachain'
    case KnownChainIds.CosmosMainnet:
      return 'Atom'
    case KnownChainIds.SolanaMainnet:
      return 'Solana'
    default:
      throw Error(`Unsupported chainId: ${chainId}`)
  }
}

export const verifyLedgerAppOpen = async (chainId: ChainId | KnownChainIds, wallet: HDWallet) => {
  const coin = getCoin(chainId)
  const appName = getLedgerAppName(chainId)

  console.log(`[Ledger App Gate] Verifying ${appName} app for chain ${chainId}, coin: ${coin}`)

  if (!isLedger(wallet)) return

  const isAppOpen = async () => {
    try {
      console.log(`[Ledger App Gate] Checking if ${coin} app is open...`)
      await wallet.validateCurrentApp(coin)
      console.log(`[Ledger App Gate] ✅ ${coin} app is open`)
      return true
    } catch (err) {
      console.log(`[Ledger App Gate] ❌ ${coin} app NOT open:`, err)
      return false
    }
  }

  const appAlreadyOpen = await isAppOpen()
  console.log(`[Ledger App Gate] App already open: ${appAlreadyOpen}`)
  if (appAlreadyOpen) return

  let intervalId: NodeJS.Timeout | undefined
  let attempts = 0

  try {
    console.log(`[Ledger App Gate] Waiting for ${appName} app to open...`)

    await new Promise<void>((resolve, reject) => {
      // emit event to trigger modal open
      const args: LedgerOpenAppEventArgs = { chainId, reject }
      console.log(`[Ledger App Gate] Emitting LedgerOpenApp event`)
      emitter.emit('LedgerOpenApp', args)

      // prompt user to open app on device
      console.log(`[Ledger App Gate] Calling wallet.openApp("${appName}")`)
      wallet.openApp(appName)

      intervalId = setInterval(async () => {
        attempts++
        console.log(`[Ledger App Gate] Check attempt ${attempts}...`)

        if (!(await isAppOpen())) {
          console.log(`[Ledger App Gate] App still not open (attempt ${attempts})`)
          return
        }

        // emit event to trigger modal close
        console.log(`[Ledger App Gate] ✅ App opened! Emitting LedgerAppOpened event`)
        emitter.emit('LedgerAppOpened')
        clearInterval(intervalId)
        resolve()
      }, 1000)
    })
  } catch (err) {
    console.log(`[Ledger App Gate] Error or cancelled:`, err)
    clearInterval(intervalId)
    throw new ChainAdapterError('Ledger app open cancelled', {
      translation: 'chainAdapters.errors.ledgerAppOpenCancelled',
    })
  }
}
