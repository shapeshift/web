import { Button, Code, Heading, Spinner } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { bchChainId, btcChainId } from '@shapeshiftoss/caip'
import type { UtxoBaseAdapter, UtxoChainId } from '@shapeshiftoss/chain-adapters'
import {
  convertXpubVersion,
  toAddressNList,
  toRootDerivationPath,
} from '@shapeshiftoss/chain-adapters'
import { ChainAdapter as CosmosChainAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmossdk/cosmos'
import { ChainAdapter as OsmosisChainAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmossdk/osmosis'
import { ChainAdapter as THORChainChainAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmossdk/thorchain'
import { ChainAdapter as AvalancheChainAdapter } from '@shapeshiftoss/chain-adapters/dist/evm/avalanche'
import { ChainAdapter as EthereumChainAdapter } from '@shapeshiftoss/chain-adapters/dist/evm/ethereum'
import { ChainAdapter as BitcoinChainAdapter } from '@shapeshiftoss/chain-adapters/dist/utxo/bitcoin'
import { ChainAdapter as BitcoinCashChainAdapter } from '@shapeshiftoss/chain-adapters/dist/utxo/bitcoincash'
import { ChainAdapter as DogecoinChainAdapter } from '@shapeshiftoss/chain-adapters/dist/utxo/dogecoin'
import { ChainAdapter as LitecoinChainAdapter } from '@shapeshiftoss/chain-adapters/dist/utxo/litecoin'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { bip32ToAddressNList, BTCInputScriptType, supportsBTC } from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

const moduleLogger = logger.child({ module: 'Recovery' })

// we won't have more than 10 addresses with stuck funds, or we'd have heard about it more
const addressCount = 10
// we have users with stuck funds on these chains
const affectedChainsIds = [btcChainId, bchChainId]
// const stuckFundsAddress = 'bc1q9hz8dl4hhz6el7rgt25tu7rest4yacq4fwyknx'

const getDangerousPublicKey = async (
  wallet: HDWallet,
  bip44Params: BIP44Params,
  accountType: UtxoAccountType,
): Promise<string> => {
  const path = toRootDerivationPath(bip44Params)
  const publicKeys = await wallet.getPublicKeys([
    {
      coin: 'Bitcoin',
      addressNList: bip32ToAddressNList(path),
      curve: 'secp256k1',
      scriptType: recoveryAccountTypeToScriptType[accountType],
    },
  ])

  if (!publicKeys?.[0]) throw new Error("couldn't get public key")

  if (accountType) return convertXpubVersion(publicKeys[0].xpub, accountType)

  return publicKeys[0].xpub
}

const recoveryAccountTypeToScriptType: Record<UtxoAccountType, BTCInputScriptType> = Object.freeze({
  [UtxoAccountType.P2pkh]: BTCInputScriptType.SpendAddress,
  [UtxoAccountType.SegwitP2sh]: BTCInputScriptType.SpendP2SHWitness,
  [UtxoAccountType.SegwitNative]: BTCInputScriptType.SpendWitness,
})

type GetDangerousBIP44ParamsByChainId = () => GetDangerousBIP44ParamsByChainIdReturn
type GetDangerousBIP44ParamsByChainIdReturn = Record<KnownChainIds, BIP44Params[]>

const getDangerousBIP44ParamsByChainId: GetDangerousBIP44ParamsByChainId = () => {
  return {
    [KnownChainIds.EthereumMainnet]: [EthereumChainAdapter.defaultBIP44Params],
    [KnownChainIds.AvalancheMainnet]: [AvalancheChainAdapter.defaultBIP44Params],
    [KnownChainIds.ThorchainMainnet]: [THORChainChainAdapter.defaultBIP44Params],
    [KnownChainIds.CosmosMainnet]: [CosmosChainAdapter.defaultBIP44Params],
    [KnownChainIds.OsmosisMainnet]: [OsmosisChainAdapter.defaultBIP44Params],
    [KnownChainIds.BitcoinMainnet]: [
      { ...BitcoinChainAdapter.defaultBIP44Params, purpose: 84 },
      { ...BitcoinChainAdapter.defaultBIP44Params, purpose: 49 },
      { ...BitcoinChainAdapter.defaultBIP44Params, purpose: 44 },
    ],
    [KnownChainIds.BitcoinCashMainnet]: [
      { ...BitcoinCashChainAdapter.defaultBIP44Params, purpose: 84 },
      { ...BitcoinCashChainAdapter.defaultBIP44Params, purpose: 49 },
      { ...BitcoinCashChainAdapter.defaultBIP44Params, purpose: 44 },
    ],
    [KnownChainIds.LitecoinMainnet]: [
      { ...LitecoinChainAdapter.defaultBIP44Params, purpose: 84 },
      { ...LitecoinChainAdapter.defaultBIP44Params, purpose: 49 },
      { ...LitecoinChainAdapter.defaultBIP44Params, purpose: 44 },
    ],
    [KnownChainIds.DogecoinMainnet]: [
      { ...DogecoinChainAdapter.defaultBIP44Params, purpose: 84 },
      { ...DogecoinChainAdapter.defaultBIP44Params, purpose: 49 },
      { ...DogecoinChainAdapter.defaultBIP44Params, purpose: 44 },
    ],
  }
}

type GetDangerousAddressesArgs = {
  wallet: HDWallet
}

type GetDangerousAddresses = (
  args: GetDangerousAddressesArgs,
) => Promise<GetDangerousAddressesReturn>
type GetDangerousAddressesReturn = {
  input: {
    targetChainId: ChainId
    chainName: string
    bip44Params: BIP44Params
    accountType: UtxoAccountType | undefined
  }
  output: {
    pubkey: string
    addresses: string[]
  }
}[]

const getDangerousAddresses: GetDangerousAddresses = async ({ wallet }) => {
  const dangerousBip44ParamsByChainId = getDangerousBIP44ParamsByChainId()

  if (!supportsBTC(wallet)) {
    throw new Error(`Recovery: wallet does not support bitcoin`)
  }

  const chainAdapterManager = getChainAdapterManager()

  const result = []

  for (const affectedChainId of affectedChainsIds) {
    const maybeChainAdapter = chainAdapterManager.get(affectedChainId)
    if (!maybeChainAdapter) throw new Error(`Recovery: no chain adapter for ${affectedChainId}`)
    const adapter = maybeChainAdapter as unknown as UtxoBaseAdapter<UtxoChainId>
    const chainName = adapter.getName()
    for (const [bip44ParamChainName, wrongChainId] of Object.entries(KnownChainIds)) {
      const bip44ParamsArray = dangerousBip44ParamsByChainId[wrongChainId]
      for (const bip44Params of bip44ParamsArray) {
        // only segwit native produces bc1-prefixed addresses
        const accountType = UtxoAccountType.SegwitNative
        const publicKey = await getDangerousPublicKey(wallet, bip44Params, accountType)
        const addresses: string[] = []
        // generate addresses
        for (let index = 0; index < addressCount; index++) {
          // only segwit native produces bc1-prefixed addresses
          const scriptType = BTCInputScriptType.SpendWitness // segwit-native
          const address = await wallet.btcGetAddress({
            addressNList: toAddressNList({ ...bip44Params, index }),
            coin: 'Bitcoin', // only btc and bch affected
            scriptType,
            showDisplay: false,
          })
          if (!address) throw new Error('Recovery: no address available from wallet')
          addresses.push(address)
        }

        const data = {
          input: {
            targetChainId: affectedChainId,
            chainName,
            bip44ParamChainName,
            bip44Params,
            accountType,
          },
          output: {
            pubkey: publicKey,
            addresses,
          },
        }
        moduleLogger.info({ data }, 'data')
        result.push(data)
      }
    }
  }

  return result
}

export const Recovery = () => {
  const [copied, setCopied] = useState<boolean>(false)
  const [dangerousAddresses, setDangerousAddresses] = useState<GetDangerousAddressesReturn>([])
  const wallet = useWallet().state.wallet

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      setDangerousAddresses(await getDangerousAddresses({ wallet }))
    })()
  }, [wallet])

  const handleClick = useCallback(() => {
    ;(async () => {
      await navigator.clipboard.writeText(JSON.stringify(dangerousAddresses, null, 2))
      setCopied(true)
    })()
  }, [dangerousAddresses])

  const isLoading = !Boolean(dangerousAddresses.length)
  const isLocalhost = window.location.hostname === 'localhost'

  return (
    <>
      <Heading>
        <Text translation='Recovery' />
      </Heading>
      <Button
        color={copied ? 'green.500' : 'primary.500'}
        isLoading={isLoading}
        spinner={<Spinner size='md' />}
        onClick={handleClick}
        rightIcon={copied ? <FaCheck /> : undefined}
      >
        {copied ? 'Copied' : 'Copy to clipboard'}
      </Button>
      {isLocalhost && (
        <>
          <Code>{JSON.stringify(dangerousAddresses, null, 2)}</Code>
        </>
      )}
    </>
  )
}
