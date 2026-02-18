import ecc from '@bitcoinerlab/secp256k1'
import * as bitcoin from '@shapeshiftoss/bitcoinjs-lib'
import type {
  BTCAccountPath,
  BTCGetAccountPaths,
  BTCGetAddress,
  BTCSignedMessage,
  BTCSignedTx,
  BTCSignMessage,
  BTCSignTx,
  BTCVerifyMessage,
  BTCWallet,
  PathDescription,
} from '@shapeshiftoss/hdwallet-core'
import { BTCInputScriptType, describeUTXOPath, slip44ByCoin } from '@shapeshiftoss/hdwallet-core'
import type EthereumProvider from '@walletconnect/ethereum-provider'

const BIP122_BITCOIN_MAINNET_CAIP2 = 'bip122:000000000019d6689c085ae165831e93'

function extractAddressFromCaip10(caip10Account: string): string {
  const parts = caip10Account.split(':')
  return parts[parts.length - 1]
}

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

    return extractAddressFromCaip10(bip122Accounts[0])
  } catch (error) {
    console.error(error)
    return null
  }
}

function getNetwork(coin: string): bitcoin.networks.Network {
  switch (coin.toLowerCase()) {
    case 'bitcoin':
      return bitcoin.networks.bitcoin
    default:
      throw new Error(`Unsupported coin: ${coin}`)
  }
}

async function addInput(psbt: bitcoin.Psbt, input: BTCSignTx['inputs'][number]): Promise<void> {
  switch (input.scriptType) {
    case BTCInputScriptType.SpendWitness: {
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        nonWitnessUtxo: Buffer.from(input.hex, 'hex'),
        ...(input.sequence !== undefined && { sequence: input.sequence }),
      })
      break
    }
    default:
      throw new Error(`Unsupported script type: ${input.scriptType}`)
  }
}

async function addOutput(
  wallet: BTCWallet,
  psbt: bitcoin.Psbt,
  output: BTCSignTx['outputs'][number],
  coin: string,
): Promise<void> {
  if (!output.amount) throw new Error('Invalid output - missing amount.')

  const address = await (async () => {
    if (output.address) return output.address

    if (output.addressNList) {
      const outputAddress = await wallet.btcGetAddress({
        addressNList: output.addressNList,
        coin,
        showDisplay: false,
      })
      if (!outputAddress) throw new Error('Could not get address from wallet')
      return outputAddress
    }
  })()

  if (!address) throw new Error('Invalid output - no address')

  psbt.addOutput({ address, value: BigInt(output.amount) })
}

export async function btcSignTx(
  wallet: BTCWallet,
  provider: EthereumProvider,
  msg: BTCSignTx,
): Promise<BTCSignedTx | null> {
  try {
    bitcoin.initEccLib(ecc)

    const session = provider.session
    if (!session) return null

    const bip122Accounts = session.namespaces?.bip122?.accounts
    if (!bip122Accounts || bip122Accounts.length === 0) return null

    const address = extractAddressFromCaip10(bip122Accounts[0])

    const network = getNetwork(msg.coin)
    const psbt = new bitcoin.Psbt({ network })

    psbt.setVersion(msg.version ?? 2)
    if (msg.locktime) {
      psbt.setLocktime(msg.locktime)
    }

    for (const input of msg.inputs) {
      await addInput(psbt, input)
    }

    for (const output of msg.outputs) {
      await addOutput(wallet, psbt, output, msg.coin)
    }

    if (msg.opReturnData) {
      const data = Buffer.from(msg.opReturnData, 'utf-8')
      const embed = bitcoin.payments.embed({ data: [data] })
      const script = embed.output
      if (!script) throw new Error('unable to build OP_RETURN script')
      psbt.addOutput({ script, value: BigInt(0) })
    }

    const psbtBase64 = psbt.toBase64()

    const signInputs = msg.inputs.map((_input, index) => ({
      address,
      index,
      sighashTypes: [bitcoin.Transaction.SIGHASH_ALL],
    }))

    const result = await provider.signer.request<{ psbt: string; txid?: string }>(
      {
        method: 'signPsbt',
        params: {
          account: address,
          psbt: psbtBase64,
          signInputs,
          broadcast: false,
        },
      },
      BIP122_BITCOIN_MAINNET_CAIP2,
    )

    const signedPsbt = bitcoin.Psbt.fromBase64(result.psbt, { network })
    signedPsbt.finalizeAllInputs()
    const tx = signedPsbt.extractTransaction()

    const signatures = signedPsbt.data.inputs.map(input =>
      input.partialSig ? Buffer.from(input.partialSig[0].signature).toString('hex') : '',
    )

    return {
      signatures,
      serializedTx: tx.toHex(),
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

    const address = extractAddressFromCaip10(bip122Accounts[0])

    const result = await provider.signer.request<{ signature: string; address: string }>(
      {
        method: 'signMessage',
        params: {
          account: address,
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
