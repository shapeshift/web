import type {
  BTCAccountPath,
  BTCGetAccountPaths,
  BTCGetAddress,
  BTCSignedMessage,
  BTCSignedTx,
  BTCSignMessage,
  BTCSignTx,
  BTCVerifyMessage,
  PathDescription,
} from '@shapeshiftoss/hdwallet-core'
import { BTCInputScriptType, describeUTXOPath, slip44ByCoin } from '@shapeshiftoss/hdwallet-core'
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
    scriptType: BTCInputScriptType.SpendAddress,
    addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
  }
  const bip49 = {
    coin: msg.coin,
    scriptType: BTCInputScriptType.SpendP2SHWitness,
    addressNList: [0x80000000 + 49, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
  }
  const bip84 = {
    coin: msg.coin,
    scriptType: BTCInputScriptType.SpendWitness,
    addressNList: [0x80000000 + 84, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
  }

  const paths: BTCAccountPath[] = []

  if (!msg.scriptType || msg.scriptType === BTCInputScriptType.SpendWitness) {
    paths.push(bip84)
  }
  if (!msg.scriptType || msg.scriptType === BTCInputScriptType.SpendP2SHWitness) {
    paths.push(bip49)
  }
  if (!msg.scriptType || msg.scriptType === BTCInputScriptType.SpendAddress) {
    paths.push(bip44)
  }

  return paths
}

export function btcNextAccountPath(msg: BTCAccountPath): BTCAccountPath | undefined {
  const dominated: Record<BTCInputScriptType, BTCInputScriptType | undefined> = {
    [BTCInputScriptType.SpendWitness]: BTCInputScriptType.SpendP2SHWitness,
    [BTCInputScriptType.SpendP2SHWitness]: BTCInputScriptType.SpendAddress,
    [BTCInputScriptType.SpendAddress]: undefined,
    [BTCInputScriptType.SpendMultisig]: undefined,
    [BTCInputScriptType.CashAddr]: undefined,
    [BTCInputScriptType.Bech32]: undefined,
    [BTCInputScriptType.External]: undefined,
  }
  const next = dominated[msg.scriptType]
  if (!next) return undefined

  const slip44 = slip44ByCoin(msg.coin)
  if (slip44 === undefined) return undefined

  let purpose: number
  switch (next) {
    case BTCInputScriptType.SpendAddress:
      purpose = 44
      break
    case BTCInputScriptType.SpendP2SHWitness:
      purpose = 49
      break
    default:
      purpose = 84
      break
  }

  const accountIdx = msg.addressNList[2] & 0x7fffffff

  return {
    coin: msg.coin,
    scriptType: next,
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
