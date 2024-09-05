import type { ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { KnownChainIds } from '@shapeshiftoss/types'
import EventEmitter from 'events'

export const emitter = new EventEmitter()

export type LedgerOpenAppEventArgs = {
  chainId: ChainId
  isSigning: boolean
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
    case KnownChainIds.ThorchainMainnet:
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
    case KnownChainIds.ThorchainMainnet:
      return 'Rune'
    case KnownChainIds.CosmosMainnet:
      return 'Atom'
    default:
      throw Error(`Unsupported chainId: ${chainId}`)
  }
}

export const verifyLedgerAppOpen = async (
  chainId: ChainId | KnownChainIds,
  wallet: HDWallet,
  isSigning: boolean,
) => {
  const coin = getCoin(chainId)
  const appName = getLedgerAppName(chainId)

  if (!isLedger(wallet)) return

  const isAppOpen = async () => {
    try {
      await wallet.validateCurrentApp(coin)
      return true
    } catch {
      return false
    }
  }

  if (await isAppOpen()) return

  let intervalId: NodeJS.Timer | undefined

  try {
    await new Promise<void>((resolve, reject) => {
      // emit event to trigger modal open
      const args: LedgerOpenAppEventArgs = { chainId, isSigning, reject }
      emitter.emit('LedgerOpenApp', args)

      // prompt user to open app on device
      wallet.openApp(appName)

      intervalId = setInterval(async () => {
        if (!(await isAppOpen())) return

        // emit event to trigger modal close
        emitter.emit('LedgerAppOpened')
        clearInterval(intervalId)
        resolve()
      }, 1000)
    })
  } catch {
    clearInterval(intervalId)
    throw new Error('Ledger app open cancelled')
  }
}
