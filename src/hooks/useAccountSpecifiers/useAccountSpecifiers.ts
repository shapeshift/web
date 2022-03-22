import { AssetNamespace, AssetReference, CAIP2, caip2, caip19 } from '@shapeshiftoss/caip'
import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams
} from '@shapeshiftoss/chain-adapters'
import {
  bip32ToAddressNList,
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsOsmosis
} from '@shapeshiftoss/hdwallet-core'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { supportedAccountTypes } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectAssetIds, selectAssets } from 'state/slices/selectors'

// the value is an xpub/ypub/zpub, or eth pubkey, used to query unchained
export type AccountSpecifierMap = { [k: CAIP2]: string }
type UseAccountSpecifiers = () => {
  accountSpecifiers: AccountSpecifierMap[]
  getAccountSpecifiersByChainId(chainId: CAIP2): AccountSpecifierMap[]
}

export const useAccountSpecifiers: UseAccountSpecifiers = () => {
  const [accountSpecifiers, setAccountSpecifiers] = useState<AccountSpecifierMap[]>([])
  const [loading, setLoading] = useState(false)
  const chainAdapter = useChainAdapters()
  // Needed to trigger if we add new chain adapters from a plugin
  const numSupportedChains = chainAdapter.getSupportedChains().length
  const {
    state: { wallet, walletInfo }
  } = useWallet()

  const assetsById = useSelector(selectAssets)
  const assetIds = useSelector(selectAssetIds)
  const deviceId = useMemo(() => walletInfo?.deviceId, [walletInfo?.deviceId])

  // @TODO: This needs to go into global state and convert this hook into a selector
  const getAccountSpecifiers = async () => {
    if (!wallet) return
    try {
      setLoading(true)
      const supportedChains = chainAdapter.getSupportedChains()
      const acc: AccountSpecifierMap[] = []

      for (const chain of supportedChains) {
        const adapter = chainAdapter.byChain(chain)

        switch (chain) {
          // TODO: Handle Cosmos ChainType here
          case ChainTypes.Ethereum: {
            if (!supportsETH(wallet)) continue
            const pubkey = await adapter.getAddress({ wallet })
            if (!pubkey) continue
            const CAIP2 = caip2.toCAIP2({ chain, network: NetworkTypes.MAINNET })
            acc.push({ [CAIP2]: pubkey })
            break
          }
          case ChainTypes.Bitcoin: {
            if (!supportsBTC(wallet)) continue
            const CAIP19 = caip19.toCAIP19({
              chain,
              network: NetworkTypes.MAINNET,
              assetNamespace: AssetNamespace.Slip44,
              assetReference: AssetReference.Bitcoin
            })
            const bitcoin = assetsById[CAIP19]

            if (!bitcoin) continue
            for (const accountType of supportedAccountTypes.bitcoin) {
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
              const pubkey = convertXpubVersion(pubkeys[0].xpub, accountType)

              if (!pubkey) continue
              const CAIP2 = caip2.toCAIP2({ chain, network: NetworkTypes.MAINNET })
              acc.push({ [CAIP2]: pubkey })
            }
            break
          }
          case ChainTypes.Cosmos: {
            if (!supportsCosmos(wallet)) continue
            const pubkey = await adapter.getAddress({ wallet })
            if (!pubkey) continue
            const CAIP2 = caip2.toCAIP2({ chain, network: NetworkTypes.COSMOSHUB_MAINNET })
            acc.push({ [CAIP2]: pubkey })
            break
          }
          case ChainTypes.Osmosis: {
            if (!supportsOsmosis(wallet)) continue
            const pubkey = await adapter.getAddress({ wallet })
            if (!pubkey) continue
            const CAIP2 = caip2.toCAIP2({ chain, network: NetworkTypes.OSMOSIS_MAINNET })
            acc.push({ [CAIP2]: pubkey })
            break
          }
          default:
            break
        }
      }
      setAccountSpecifiers(acc)
    } catch (e) {
      console.error('useAccountSpecifiers:getAccountSpecifiers:Error', e)
    } finally {
      setLoading(false)
    }
  }

  const getAccountSpecifiersByChainId = useCallback(
    (chainId: CAIP2): AccountSpecifierMap[] => {
      return accountSpecifiers.reduce<AccountSpecifierMap[]>((acc, cur) => {
        const [_chainId, accountSpecifier] = Object.entries(cur)[0]
        if (_chainId !== chainId) return acc
        return acc.concat({ [chainId]: accountSpecifier })
      }, [])
    },
    [accountSpecifiers]
  )

  useEffect(() => {
    if (!(wallet && deviceId && assetIds.length)) return

    if (loading) return // we're already iterating and fetching accounts
    getAccountSpecifiers().catch((e: unknown) =>
      console.error('useAccountSpecifiers:getAccountSpecifiers:Error', e)
    )
    // getAccountSpecifiers and loading causes furious renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, assetIds, numSupportedChains, wallet])

  return { accountSpecifiers, getAccountSpecifiersByChainId }
}
