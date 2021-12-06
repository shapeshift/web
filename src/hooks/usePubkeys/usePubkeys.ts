import { CAIP2, caip2, caip19 } from '@shapeshiftoss/caip'
import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams
} from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList, supportsBTC, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import isEqual from 'lodash/isEqual'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ReduxState } from 'state/reducer'
import { selectAssetsById } from 'state/slices/assetsSlice/assetsSlice'

type Pubkeys = { [k: CAIP2]: string }
type UsePubkeys = () => Pubkeys

export const usePubkeys: UsePubkeys = () => {
  const [pubkeys, setPubkeys] = useState<Pubkeys>({})
  const chainAdapter = useChainAdapters()
  const {
    state: { wallet, walletInfo }
  } = useWallet()

  const accountTypes = useSelector((state: ReduxState) => state.preferences.accountTypes)
  const assetsById = useSelector(selectAssetsById)

  const getPubkeys = useCallback(async () => {
    if (!wallet) return
    const supportedAdapters = chainAdapter.getSupportedAdapters()
    const acc: Pubkeys = {}

    for (const getAdapter of supportedAdapters) {
      const adapter = getAdapter()
      const chain = adapter.getType()
      const network = NetworkTypes.MAINNET

      let pubkey
      switch (chain) {
        case ChainTypes.Ethereum: {
          if (!supportsETH(wallet)) continue
          pubkey = await adapter.getAddress({ wallet })
          break
        }
        case ChainTypes.Bitcoin: {
          if (!supportsBTC(wallet)) continue
          const accountType = accountTypes[chain]
          const CAIP19 = caip19.toCAIP19({ chain, network })
          const bitcoin = assetsById[CAIP19]

          if (!bitcoin) continue
          const accountParams = utxoAccountParams(bitcoin, accountType, 0)
          const { bip32Params, scriptType } = accountParams
          const pubkeys = await wallet.getPublicKeys([
            {
              coin: adapter.getType(),
              addressNList: bip32ToAddressNList(toRootDerivationPath(bip32Params)),
              curve: 'secp256k1',
              scriptType
            }
          ])
          if (!pubkeys?.[0]?.xpub) {
            throw new Error(`usePubkeys: error getting bitcoin xpub`)
          }
          pubkey = convertXpubVersion(pubkeys[0].xpub, accountType)
          break
        }
        default:
          break
      }

      if (!pubkey) continue
      const CAIP2 = caip2.toCAIP2({ chain, network })
      acc[CAIP2] = pubkey
    }
    if (!isEqual(pubkeys, acc)) setPubkeys(acc)
  }, [walletInfo?.deviceId, assetsById])

  useEffect(() => {
    if (!wallet) return
    if (isEmpty(assetsById)) return
    getPubkeys()
  }, [walletInfo?.deviceId, assetsById])

  return pubkeys
}
