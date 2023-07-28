import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type {
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
  FeeDataKey,
  GetFeeDataInput,
} from '@shapeshiftoss/chain-adapters'
import { utils } from 'ethers'
import type { TransactionParams } from 'plugins/walletConnectToDapps/v1/bridge/types'
import type { ConfirmData } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/CallRequestCommon'
import type {
  CosmosSignAminoCallRequestParams,
  CosmosSignDirectCallRequestParams,
  CustomTransactionData,
  EthSignParams,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import { bnOrZero } from 'lib/bignumber/bignumber'

/**
 * Converts hex to utf8 string if it is valid bytes
 */
export const maybeConvertHexEncodedMessageToUtf8 = (value: string) => {
  try {
    return utils.isHexString(value) ? utils.toUtf8String(value) : value
  } catch (e) {
    // use raw hex string if unable to convert to utf8 (ex. keccak256)
    return value
  }
}

export const convertNumberToHex = (value: number | string): string =>
  typeof value === 'number' ? utils.hexlify(value) : utils.hexlify(utils.hexlify(parseInt(value)))

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
export const getSignParamsMessage = (params: [string, string]) => {
  const message = params.filter(p => !utils.isAddress(p))[0]
  return maybeConvertHexEncodedMessageToUtf8(message)
}

export const extractConnectedAccounts = (session: WalletConnectState['session']): AccountId[] => {
  const namespaces = session?.namespaces ?? []
  const requiredNamespacesValues = Object.values(namespaces)
  return requiredNamespacesValues
    .map(v => v.accounts)
    .reduce(
      (acc, namespaceAccounts) => (acc && namespaceAccounts ? acc.concat(namespaceAccounts) : []),
      [],
    )
}

// Get our account from params by checking if the params string contains an account from our wallet
export const getWalletAccountFromEthParams = (
  accountIds: AccountId[],
  params: EthSignParams | TransactionParams[],
): AccountId => {
  const paramsString = params ? JSON.stringify(params).toLowerCase() : undefined
  return (
    accountIds.find(accountId =>
      paramsString?.includes(fromAccountId(accountId).account.toLowerCase()),
    ) || ''
  )
}

export const getWalletAccountFromCosmosParams = (
  accountIds: AccountId[],
  params: CosmosSignDirectCallRequestParams | CosmosSignAminoCallRequestParams,
): AccountId => {
  const paramsString = params ? params.signerAddress : undefined
  return (
    accountIds.find(accountId =>
      paramsString?.includes(fromAccountId(accountId).account.toLowerCase()),
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
