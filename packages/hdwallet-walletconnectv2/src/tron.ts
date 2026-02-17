import type {
  PathDescription,
  TronAccountPath,
  TronGetAccountPaths,
  TronGetAddress,
  TronSignedTx,
  TronSignTx,
} from '@shapeshiftoss/hdwallet-core'
import { slip44ByCoin, tronDescribePath } from '@shapeshiftoss/hdwallet-core'
import type EthereumProvider from '@walletconnect/ethereum-provider'

const TRON_MAINNET_CAIP2 = 'tron:0x2b6653dc'

export function describeTronPath(path: number[]): PathDescription {
  return tronDescribePath(path)
}

export function tronWcGetAccountPaths(msg: TronGetAccountPaths): TronAccountPath[] {
  const slip44 = slip44ByCoin('Tron')
  if (slip44 === undefined) return []
  return [
    {
      addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0, 0],
    },
  ]
}

export function tronNextAccountPath(_msg: TronAccountPath): TronAccountPath | undefined {
  return undefined
}

export async function tronGetAddress(
  provider: EthereumProvider,
  _msg: TronGetAddress,
): Promise<string | null> {
  try {
    const session = provider.session
    if (!session) return null

    const tronAccounts = session.namespaces?.tron?.accounts
    if (!tronAccounts || tronAccounts.length === 0) return null

    // CAIP-10 format: tron:0x2b6653dc:T...
    const parts = tronAccounts[0].split(':')
    return parts[2] ?? null
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function tronSignTx(
  provider: EthereumProvider,
  msg: TronSignTx,
): Promise<TronSignedTx | null> {
  try {
    const session = provider.session
    if (!session) return null

    const tronAccounts = session.namespaces?.tron?.accounts
    if (!tronAccounts || tronAccounts.length === 0) return null

    const signerAddress = tronAccounts[0].split(':')[2]
    if (!signerAddress) return null

    const result = await provider.signer.request<{ signature: string }>(
      {
        method: 'tron_signTransaction',
        params: {
          address: signerAddress,
          transaction: {
            rawDataHex: msg.rawDataHex,
          },
        },
      },
      TRON_MAINNET_CAIP2,
    )

    if (!result?.signature) return null

    return {
      serialized: msg.rawDataHex + result.signature,
      signature: result.signature,
    }
  } catch (error) {
    console.error(error)
    return null
  }
}
