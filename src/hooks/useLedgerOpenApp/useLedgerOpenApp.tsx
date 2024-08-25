import type { ChainId } from '@shapeshiftoss/caip'
import type { slip44Table } from '@shapeshiftoss/hdwallet-core'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { KnownChainIds } from '@shapeshiftoss/types'
import { assertUnreachable } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

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

type UseLedgerOpenAppProps = {
  isSigning: boolean
}

/**
 * This hook provides a function that can be used to check if the Ledger app is open for the given chainId.
 *
 * If the app is not open, it will display a modal to prompt the user to open the app.
 *
 * The function will resolve when the app is open, or reject if the user cancels the request.
 */
export const useLedgerOpenApp = ({ isSigning }: UseLedgerOpenAppProps) => {
  const { close: closeModal, open: openModal } = useModal('ledgerOpenApp')

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

  const checkLedgerApp = useCallback(
    (chainId: ChainId) => {
      return new Promise<void>(async (resolve, reject) => {
        // If the user is not using a Ledger, resolve the promise immediately
        if (wallet && !isLedger(wallet)) {
          resolve()
          return
        }

        // If the ledger app is already open, resolve the promise immediately
        const isValidApp = await checkIsCorrectAppOpen(chainId)
        if (isValidApp) {
          resolve()
          return
        }

        // Poll the Ledger every second to see if the correct app is open
        const intervalId = setInterval(async () => {
          const isValidApp = await checkIsCorrectAppOpen(chainId)
          if (isValidApp) {
            closeModal()
            clearInterval(intervalId)
            resolve()
          }
        }, 1000)

        // Set a callback to reject the promise when the user cancels the request
        const onCancel = () => {
          closeModal()
          clearInterval(intervalId)
          reject()
        }

        // Display the request to open the Ledger app
        openModal({ chainId, onCancel, isSigning })
      })
    },
    [checkIsCorrectAppOpen, closeModal, openModal, wallet, isSigning],
  )

  return checkLedgerApp
}
