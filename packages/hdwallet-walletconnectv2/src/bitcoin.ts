import type {
  BTCAccountPath,
  BTCGetAccountPaths,
  BTCGetAddress,
  BTCInputScriptType,
  BTCSignedMessage,
  BTCSignedTx,
  BTCSignMessage,
  BTCSignTx,
  BTCVerifyMessage,
  PathDescription,
} from '@shapeshiftoss/hdwallet-core'
import { describeUTXOPath, slip44ByCoin } from '@shapeshiftoss/hdwallet-core'
import type EthereumProvider from '@walletconnect/ethereum-provider'

const BIP122_BITCOIN_MAINNET_CAIP2 = 'bip122:000000000019d6689c085ae165831e93'

export function describeBTCPath(
  path: number[],
  coin: string,
  scriptType: BTCInputScriptType,
): PathDescription {
  return describeUTXOPath(path, coin, scriptType)
}

export function btcGetAccountPaths(msg: BTCGetAccountPaths): BTCAccountPath[] {
  const slip44 = slip44ByCoin(msg.coin)
  if (slip44 === undefined) return []
  const bip44 = {
    coin: msg.coin,
    scriptType: 'p2pkh' as BTCInputScriptType,
    addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
  }
  const bip49 = {
    coin: msg.coin,
    scriptType: 'p2sh-p2wpkh' as BTCInputScriptType,
    addressNList: [0x80000000 + 49, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
  }
  const bip84 = {
    coin: msg.coin,
    scriptType: 'p2wpkh' as BTCInputScriptType,
    addressNList: [0x80000000 + 84, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
  }

  const paths: BTCAccountPath[] = []

  if (!msg.scriptType || msg.scriptType === ('p2wpkh' as BTCInputScriptType)) {
    paths.push(bip84)
  }
  if (!msg.scriptType || msg.scriptType === ('p2sh-p2wpkh' as BTCInputScriptType)) {
    paths.push(bip49)
  }
  if (!msg.scriptType || msg.scriptType === ('p2pkh' as BTCInputScriptType)) {
    paths.push(bip44)
  }

  return paths
}

export function btcNextAccountPath(msg: BTCAccountPath): BTCAccountPath | undefined {
  const dominated: Record<string, string> = {
    p2wpkh: 'p2sh-p2wpkh',
    'p2sh-p2wpkh': 'p2pkh',
  }
  const next = dominated[msg.scriptType]
  if (!next) return undefined

  const slip44 = slip44ByCoin(msg.coin)
  if (slip44 === undefined) return undefined

  const purpose = next === 'p2pkh' ? 44 : next === 'p2sh-p2wpkh' ? 49 : 84
  const accountIdx = msg.addressNList[2] & 0x7fffffff

  return {
    coin: msg.coin,
    scriptType: next as BTCInputScriptType,
    addressNList: [0x80000000 + purpose, 0x80000000 + slip44, 0x80000000 + accountIdx],
  }
}

export async function btcGetAddress(
  provider: EthereumProvider,
  _msg: BTCGetAddress,
): Promise<string | null> {
  try {
    const session = provider.session
    if (!session) return null

    const bip122Accounts = session.namespaces?.bip122?.accounts
    if (!bip122Accounts || bip122Accounts.length === 0) return null

    // CAIP-10 format: bip122:000000000019d6689c085ae165831e93:bc1q...
    const parts = bip122Accounts[0].split(':')
    return parts[2] ?? null
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function btcSignTx(
  provider: EthereumProvider,
  msg: BTCSignTx,
): Promise<BTCSignedTx | null> {
  try {
    const session = provider.session
    if (!session) return null

    const bip122Accounts = session.namespaces?.bip122?.accounts
    if (!bip122Accounts || bip122Accounts.length === 0) return null

    const account = bip122Accounts[0]

    // WC Bitcoin wallets use PSBT signing, not raw tx signing.
    // If the msg contains a psbt field, sign it directly. Otherwise, we can't
    // support raw inputs/outputs signing via WC - wallets expect PSBT format.
    const psbt = (msg as BTCSignTx & { psbt?: string }).psbt
    if (!psbt) return null

    const result = await provider.signer.request<{ psbt: string; txid?: string }>(
      {
        method: 'signPsbt',
        params: {
          account,
          psbt,
          signInputs: {},
          broadcast: true,
        },
      },
      BIP122_BITCOIN_MAINNET_CAIP2,
    )

    return {
      signatures: [],
      serializedTx: result.psbt,
    }
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function btcSignMessage(
  provider: EthereumProvider,
  msg: BTCSignMessage,
): Promise<BTCSignedMessage | null> {
  try {
    const session = provider.session
    if (!session) return null

    const bip122Accounts = session.namespaces?.bip122?.accounts
    if (!bip122Accounts || bip122Accounts.length === 0) return null

    const account = bip122Accounts[0]

    const result = await provider.signer.request<{ signature: string; address: string }>(
      {
        method: 'signMessage',
        params: {
          account,
          message: msg.message,
        },
      },
      BIP122_BITCOIN_MAINNET_CAIP2,
    )

    return {
      address: result.address,
      signature: result.signature,
    }
  } catch (error) {
    console.error(error)
    return null
  }
}

export async function btcVerifyMessage(
  _provider: EthereumProvider,
  _msg: BTCVerifyMessage,
): Promise<boolean | null> {
  return null
}
