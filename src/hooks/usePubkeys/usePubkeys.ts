import { CAIP2, caip2, caip19 } from '@shapeshiftoss/caip'
import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams
} from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList, supportsBTC, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ReduxState } from 'state/reducer'
import { selectAssetIds, selectAssetsById } from 'state/slices/assetsSlice/assetsSlice'

export type Pubkeys = { [k: CAIP2]: string }
type UsePubkeys = () => Pubkeys

export const usePubkeys: UsePubkeys = () => {
  const [pubkeys, setPubkeys] = useState<Pubkeys>({})
  const chainAdapter = useChainAdapters()
  const {
    state: { wallet, walletInfo }
  } = useWallet()

  const accountTypes = useSelector((state: ReduxState) => state.preferences.accountTypes)
  const assetsById = useSelector(selectAssetsById)
  const assetIds = useSelector(selectAssetIds)

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
          const { bip44Params, scriptType } = accountParams
          const pubkeys = await wallet.getPublicKeys([
            {
              coin: adapter.getType(),
              addressNList: bip32ToAddressNList(toRootDerivationPath(bip44Params)),
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
    setPubkeys(acc)
    // this is called by the effect below with the right logic to only call once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId, assetsById])

  useEffect(() => {
    if (!wallet || !walletInfo?.deviceId) return
    if (!assetIds?.length) return
    getPubkeys()
    // once the asset ids are loaded, the asset data we need is in the store
    // the asset data may change as we lazily load descriptions later,
    // so don't include the assetsById as a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId, assetIds])

  return pubkeys
}
