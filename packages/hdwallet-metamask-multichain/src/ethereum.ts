import type { Address } from '@shapeshiftoss/hdwallet-core'
import * as core from '@shapeshiftoss/hdwallet-core'
import { errorCodes, ethErrors, serializeError } from 'eth-rpc-errors'
import { isHexString } from 'ethers/lib/utils'

const UNRECOGNIZED_CHAIN_ERROR_CODE = 4902

type ProviderError = { code: number; message: string }

const unwrapProviderError = (error: unknown): ProviderError => {
  const serializedError = serializeError(error)
  const originalError = (serializedError.data as { originalError?: ProviderError } | undefined)
    ?.originalError
  return originalError ?? serializedError
}

const toSwitchChainError = (providerError: ProviderError) =>
  providerError.code === errorCodes.provider.userRejectedRequest
    ? ethErrors.provider.userRejectedRequest()
    : providerError

// MetaMask grants dApp access per network, so an account can be unauthorized on a network the dApp was never granted
const requestWithPermissionRetry = async <T>(
  ethereum: any,
  args: { method: string; params: unknown[] },
): Promise<T> => {
  try {
    return await ethereum.request(args)
  } catch (error) {
    if (unwrapProviderError(error).code !== errorCodes.provider.unauthorized) throw error
    await ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] })
    return ethereum.request(args)
  }
}

export async function ethAddChain(
  ethereum: any,
  params: core.AddEthereumChainParameter,
): Promise<void> {
  await ethereum.request({ method: 'wallet_addEthereumChain', params: [params] })
}

export async function ethSwitchChain(
  ethereum: any,
  params: core.AddEthereumChainParameter,
): Promise<void> {
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: params.chainId }],
    })
  } catch (switchError) {
    const providerSwitchError = unwrapProviderError(switchError)
    const isChainMissing =
      providerSwitchError.code === UNRECOGNIZED_CHAIN_ERROR_CODE ||
      providerSwitchError.code === errorCodes.rpc.internal
    if (!isChainMissing) throw toSwitchChainError(providerSwitchError)

    try {
      await ethAddChain(ethereum, params)
    } catch (addChainError) {
      const providerAddChainError = unwrapProviderError(addChainError)
      // MetaMask throws this after successfully adding the chain: https://github.com/shapeshift/web/issues/9301#issuecomment-2790459115
      const isAddedDespiteError =
        providerAddChainError.code === errorCodes.rpc.internal &&
        providerAddChainError.message.includes('is not a function')
      if (isAddedDespiteError) return
      throw toSwitchChainError(providerAddChainError)
    }
  }
}

export async function ethVerifyMessage(
  _msg: core.ETHVerifyMessage,
  _ethereum: any,
): Promise<boolean | null> {
  console.error('Method ethVerifyMessage unsupported for MetaMask wallet!')
  return null
}

export function ethGetAccountPaths(msg: core.ETHGetAccountPath): core.ETHAccountPath[] {
  const slip44 = core.slip44ByCoin(msg.coin)
  if (slip44 === undefined) return []
  return [
    {
      addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0, 0],
      hardenedPath: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
      relPath: [0, 0],
      description: 'MetaMask(Shapeshift Multichain)',
    },
  ]
}

export async function ethSignTx(
  _msg: core.ETHSignTx,
  _ethereum: any,
  _from: string,
): Promise<core.ETHSignedTx | null> {
  console.error('Method ethSignTx unsupported for MetaMask wallet!')
  return null
}

export async function ethSendTx(
  msg: core.ETHSignTx,
  ethereum: any,
  from: string,
): Promise<core.ETHTxHash> {
  const utxBase = {
    from,
    to: msg.to,
    value: msg.value,
    data: msg.data,
    chainId: msg.chainId,
    nonce: msg.nonce,
    // MetaMask, like other Web3 libraries, derives its transaction schema from Ethereum's official JSON-RPC API specification
    // (https://github.com/ethereum/execution-apis/blob/d63d2a02bcd2a8cef54ae2fc5bbff8b4fac944eb/src/schemas/transaction.json).
    // That schema defines the use of the label `gas` to set the transaction's gas limit and not `gasLimit` as used in other
    // libraries and as stated in the official yellow paper (https://ethereum.github.io/yellowpaper/paper.pdf).
    gas: msg.gasLimit,
  }

  const utx = msg.maxFeePerGas
    ? {
        ...utxBase,
        maxFeePerGas: msg.maxFeePerGas,
        maxPriorityFeePerGas: msg.maxPriorityFeePerGas,
      }
    : { ...utxBase, gasPrice: msg.gasPrice }

  const hash = await requestWithPermissionRetry<string>(ethereum, {
    method: 'eth_sendTransaction',
    params: [utx],
  })

  return { hash }
}

export async function ethSignMessage(
  msg: core.ETHSignMessage,
  ethereum: any,
  address: string,
): Promise<core.ETHSignedMessage> {
  if (!isHexString(msg.message)) throw new Error('data is not an hex string')

  const signature = await requestWithPermissionRetry<string>(ethereum, {
    method: 'personal_sign',
    params: [msg.message, address],
  })

  return { address, signature }
}

export async function ethSignTypedData(
  msg: core.ETHSignTypedData,
  ethereum: any,
  address: string,
): Promise<core.ETHSignedMessage> {
  const signature = await requestWithPermissionRetry<string>(ethereum, {
    method: 'eth_signTypedData_v4',
    params: [address, JSON.stringify(msg.typedData)],
  })

  return { address, signature }
}

export async function ethGetAddress(ethereum: any): Promise<Address | null> {
  if (!(ethereum && ethereum.request)) {
    return null
  }
  try {
    const ethAccounts = await ethereum.request({
      method: 'eth_accounts',
    })
    return ethAccounts[0]
  } catch (error) {
    console.error(error)
    return null
  }
}
