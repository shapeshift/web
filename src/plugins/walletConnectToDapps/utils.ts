import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type {
  EvmBaseAdapter,
  FeeDataEstimate,
  FeeDataKey,
  GetFeeDataInput,
} from '@shapeshiftoss/chain-adapters'
import type { EvmChainId } from '@shapeshiftoss/types'
import type { SessionTypes } from '@walletconnect/types'
import type {
  ConfirmData,
  CosmosSignAminoCallRequestParams,
  CosmosSignDirectCallRequestParams,
  CustomTransactionData,
  EthSignParams,
  TransactionParams,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/types'
import { hexToString, isAddress, isHex, toHex } from 'viem'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'

/**
 * Converts hex to utf8 string if it is valid bytes
 */
export const maybeConvertHexEncodedMessageToUtf8 = (value: string) => {
  try {
    return isHex(value) ? hexToString(value) : value
  } catch (e) {
    // use raw hex string if unable to convert to utf8 (ex. keccak256)
    return value
  }
}

export const convertNumberToHex = (value: number | string): string =>
  typeof value === 'number' ? toHex(value) : toHex(parseInt(value))

export const convertHexToNumber = (value: string): number => parseInt(value, 16)

export const getFeesForTx = async (
  tx: TransactionParams,
  evmChainAdapter: EvmBaseAdapter<EvmChainId>,
  wcAccountId: AccountId,
) => {
  const getFeeDataInput: GetFeeDataInput<EvmChainId> = {
    to: tx.to,
    value: bnOrZero(tx.value).toFixed(0),
    chainSpecific: {
      from: fromAccountId(wcAccountId).account,
      data: tx.data,
    },
  }
  return await evmChainAdapter.getFeeData(getFeeDataInput)
}

export const getGasData = (
  customTransactionData: ConfirmData | CustomTransactionData,
  fees: FeeDataEstimate<EvmChainId>,
) => {
  const { speed, customFee } = customTransactionData
  return speed === 'custom' &&
    bnOrZero(customFee?.baseFee).gt(0) &&
    bnOrZero(customFee?.priorityFee).gt(0)
    ? {
        maxPriorityFeePerGas: convertNumberToHex(
          bnOrZero(customFee!.priorityFee).times(1e9).toString(), // to wei
        ),
        maxFeePerGas: convertNumberToHex(
          bnOrZero(customFee!.baseFee).times(1e9).toString(), // to wei
        ),
      }
    : {
        gasPrice: convertNumberToHex(fees[speed as FeeDataKey].chainSpecific.gasPrice),
      }
}

/**
 * Gets message from various signing request methods by filtering out
 * a value that is not an address (thus is a message).
 * If it is a hex string, it gets converted to utf8 string
 */
export const getSignParamsMessage = (params: [string, string], toUtf8: boolean) => {
  const message = params.filter(p => !isAddress(p))[0]
  return toUtf8 ? maybeConvertHexEncodedMessageToUtf8(message) : message
}

export const extractConnectedAccounts = (session: SessionTypes.Struct): AccountId[] => {
  const namespaces = session?.namespaces ?? []
  const requiredNamespacesValues = Object.values(namespaces)
  return requiredNamespacesValues.map(v => v.accounts).flat()
}

export const extractAllConnectedAccounts = (
  sessionsByTopic: WalletConnectState['sessionsByTopic'],
): AccountId[] => {
  return Array.from(
    new Set(
      Object.values(sessionsByTopic)
        .map(session => {
          if (!session) return undefined
          return extractConnectedAccounts(session)
        })
        .flat()
        .filter(isSome),
    ),
  )
}

// Get our account from params by checking if the params string contains an account from our wallet
export const getWalletAccountFromEthParams = (
  accountIds: AccountId[],
  params: EthSignParams | TransactionParams[],
): AccountId => {
  const paramsString = params ? JSON.stringify(params).toLowerCase() : undefined
  return (
    accountIds.find(
      accountId => paramsString?.includes(fromAccountId(accountId).account.toLowerCase()),
    ) || ''
  )
}

export const getWalletAccountFromCosmosParams = (
  accountIds: AccountId[],
  params: CosmosSignDirectCallRequestParams | CosmosSignAminoCallRequestParams,
): AccountId => {
  const paramsString = params ? params.signerAddress : undefined
  return (
    accountIds.find(
      accountId => paramsString?.includes(fromAccountId(accountId).account.toLowerCase()),
    ) || ''
  )
}

/**
 * Get our address from params checking if params string contains one
 * of our wallet addresses
 */
export const getWalletAddressFromEthSignParams = (
  accountIds: AccountId[],
  params: EthSignParams,
): string => {
  const addresses = accountIds.map(accountId => fromAccountId(accountId).account)
  const paramsString = params ? JSON.stringify(params).toLowerCase() : undefined
  return addresses.find(address => paramsString?.includes(address.toLowerCase())) || ''
}
