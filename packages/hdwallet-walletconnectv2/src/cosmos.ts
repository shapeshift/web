import type { OfflineAminoSigner, StdTx } from '@cosmjs/amino'
import type { SignerData } from '@cosmjs/stargate'
import type {
  CosmosAccountPath,
  CosmosGetAccountPaths,
  CosmosGetAddress,
  CosmosSignedTx,
  CosmosSignTx,
  PathDescription,
} from '@shapeshiftoss/hdwallet-core'
import { cosmosDescribePath, slip44ByCoin } from '@shapeshiftoss/hdwallet-core'
import { sign } from '@shapeshiftoss/proto-tx-builder'
import type EthereumProvider from '@walletconnect/ethereum-provider'

const COSMOS_MAINNET_CAIP2 = 'cosmos:cosmoshub-4'

export function describeCosmosPath(path: number[]): PathDescription {
  return cosmosDescribePath(path)
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

export function cosmosNextAccountPath(_msg: CosmosAccountPath): CosmosAccountPath | undefined {
  return undefined
}

export async function cosmosGetAddress(
  provider: EthereumProvider,
  _msg: CosmosGetAddress,
): Promise<string | null> {
  try {
    const session = provider.session
    if (!session) return null

    const cosmosAccounts = session.namespaces?.cosmos?.accounts
    if (!cosmosAccounts || cosmosAccounts.length === 0) return null

    // CAIP-10 format: cosmos:cosmoshub-4:cosmos1abc...
    const parts = cosmosAccounts[0].split(':')
    return parts[2] ?? null
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function cosmosSignTx(
  provider: EthereumProvider,
  msg: CosmosSignTx,
): Promise<CosmosSignedTx | null> {
  try {
    const session = provider.session
    if (!session) return null

    const cosmosAccounts = session.namespaces?.cosmos?.accounts
    if (!cosmosAccounts || cosmosAccounts.length === 0) return null

    const signerAddress = cosmosAccounts[0].split(':')[2]
    if (!signerAddress) return null

    // Get accounts from WC to obtain the pubkey (needed for proto-tx-builder)
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

    // Create an OfflineAminoSigner backed by WalletConnect
    const offlineSigner: OfflineAminoSigner = {
      async getAccounts() {
        return [{ address: signerAddress, algo: algo as 'secp256k1', pubkey }]
      },
      async signAmino(_signerAddress, signDoc) {
        return provider.signer.request(
          {
            method: 'cosmos_signAmino',
            params: { signerAddress: _signerAddress, signDoc },
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

    return await sign(signerAddress, msg.tx as StdTx, offlineSigner, signerData, 'cosmos')
  } catch (error) {
    console.error(error)
    return null
  }
}
