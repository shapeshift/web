import type { OfflineAminoSigner, StdTx } from '@cosmjs/amino'
import type { SignerData } from '@cosmjs/stargate'
import type {
  CosmosAccountPath,
  CosmosGetAccountPaths,
  CosmosSignedTx,
  CosmosSignTx,
} from '@shapeshiftoss/hdwallet-core'
import { slip44ByCoin } from '@shapeshiftoss/hdwallet-core'
import { sign } from '@shapeshiftoss/proto-tx-builder'
import type EthereumProvider from '@walletconnect/ethereum-provider'

export { cosmosDescribePath } from '@shapeshiftoss/hdwallet-core'

const COSMOS_MAINNET_CAIP2 = 'cosmos:cosmoshub-4'

function getCosmosAddressFromSession(provider: EthereumProvider): string | null {
  const cosmosAccounts = provider.session?.namespaces?.cosmos?.accounts
  if (!cosmosAccounts || cosmosAccounts.length === 0) return null

  const caip10 = cosmosAccounts[0]
  const lastColonIndex = caip10.lastIndexOf(':')
  if (lastColonIndex === -1) return null
  return caip10.substring(lastColonIndex + 1) || null
}

export function cosmosGetAccountPaths(msg: CosmosGetAccountPaths): CosmosAccountPath[] {
  const slip44 = slip44ByCoin('Atom')
  if (slip44 === undefined) return []
  return [
    {
      addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0, 0],
    },
  ]
}

export function cosmosNextAccountPath(): CosmosAccountPath | undefined {
  return undefined
}

export async function cosmosGetAddress(provider: EthereumProvider): Promise<string | null> {
  return getCosmosAddressFromSession(provider)
}

export async function cosmosSignTx(
  provider: EthereumProvider,
  msg: CosmosSignTx,
): Promise<CosmosSignedTx | null> {
  const signerAddress = getCosmosAddressFromSession(provider)
  if (!signerAddress) return null

  const wcAccounts = await provider.signer.request<
    {
      algo: string
      address: string
      pubkey: string
    }[]
  >(
    {
      method: 'cosmos_getAccounts',
      params: {},
    },
    COSMOS_MAINNET_CAIP2,
  )

  if (!wcAccounts?.length) throw new Error('No cosmos accounts from WalletConnect')

  const { pubkey: pubkeyBase64, algo } = wcAccounts[0]
  const pubkey = new Uint8Array(Buffer.from(pubkeyBase64, 'base64'))

  const offlineSigner: OfflineAminoSigner = {
    async getAccounts() {
      return [{ address: signerAddress, algo: algo as 'secp256k1', pubkey }]
    },
    async signAmino(address, signDoc) {
      return provider.signer.request(
        {
          method: 'cosmos_signAmino',
          params: { signerAddress: address, signDoc },
        },
        COSMOS_MAINNET_CAIP2,
      )
    },
  }

  const signerData: SignerData = {
    sequence: Number(msg.sequence),
    accountNumber: Number(msg.account_number),
    chainId: msg.chain_id,
  }

  return sign(signerAddress, msg.tx as StdTx, offlineSigner, signerData, 'cosmos')
}
