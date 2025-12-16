import type { ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { KnownChainIds } from '@shapeshiftoss/types'
import { EventEmitter } from 'node:events'

import { ChainAdapterError } from '../error/ErrorHandler'
import { isEvmChainId } from '../evm/EvmBaseAdapter'

export const emitter = new EventEmitter()

export type LedgerOpenAppEventArgs = {
  chainId: ChainId
  reject: (reason?: any) => void
}

export const getLedgerAppName = (chainId: ChainId | KnownChainIds | undefined) => {
  // All EVM chains use the Ethereum Ledger app
  if (chainId && isEvmChainId(chainId)) return 'Ethereum'

  switch (chainId as KnownChainIds) {
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
    case KnownChainIds.SuiMainnet:
      return 'Sui'
    case KnownChainIds.ThorchainMainnet:
    case KnownChainIds.MayachainMainnet:
      return 'THORChain'
    case KnownChainIds.TronMainnet:
      return 'Tron'
    default:
      throw Error(`Unsupported chainId: ${chainId}`)
  }
}

const getCoin = (chainId: ChainId | KnownChainIds) => {
  // All EVM chains use the Ethereum Ledger app
  if (isEvmChainId(chainId)) return 'Ethereum'

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
    case KnownChainIds.ThorchainMainnet:
      return 'Rune'
    case KnownChainIds.MayachainMainnet:
      return 'Mayachain'
    case KnownChainIds.CosmosMainnet:
      return 'Atom'
    case KnownChainIds.SolanaMainnet:
      return 'Solana'
    case KnownChainIds.SuiMainnet:
      return 'Sui'
    case KnownChainIds.TronMainnet:
      return 'Tron'
    default:
      throw Error(`Unsupported chainId: ${chainId}`)
  }
}

export const verifyLedgerAppOpen = async (chainId: ChainId | KnownChainIds, wallet: HDWallet) => {
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

  let intervalId: NodeJS.Timeout | undefined

  try {
    await new Promise<void>((resolve, reject) => {
      // emit event to trigger modal open
      const args: LedgerOpenAppEventArgs = { chainId, reject }
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
    throw new ChainAdapterError('Ledger app open cancelled', {
      translation: 'chainAdapters.errors.ledgerAppOpenCancelled',
    })
  }
}
