import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type {
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
  FeeDataKey,
} from '@shapeshiftoss/chain-adapters'
import { utils } from 'ethers'
import type { TransactionParams } from 'plugins/walletConnectToDapps/bridge/types'
import type { ConfirmData } from 'plugins/walletConnectToDapps/components/modal/callRequest/CallRequestCommon'
import { bnOrZero } from 'lib/bignumber/bignumber'

/**
 * Converts hex to utf8 string if it is valid bytes
 */
export const convertHexToUtf8 = (value: string) => {
  if (utils.isHexString(value)) {
    return utils.toUtf8String(value)
  }

  return value
}

export const convertNumberToHex = (value: number | string): string => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value
  return num.toString(16).toUpperCase()
}

export const convertHexToNumber = (value: string): number => parseInt(value, 16)

export const getFeesForTx = async (
  tx: TransactionParams,
  evmChainAdapter: EvmBaseAdapter<EvmChainId>,
  wcAccountId: AccountId,
) => {
  return await evmChainAdapter.getFeeData({
    to: tx.to,
    value: bnOrZero(tx.value).toFixed(0),
    chainSpecific: {
      from: fromAccountId(wcAccountId).account,
      contractData: tx.data,
    },
  })
}

export const getGasData = (approveData: ConfirmData, fees: FeeDataEstimate<EvmChainId>) => {
  const { speed, customFee } = approveData
  return speed === 'custom' && customFee?.baseFee && customFee?.baseFee
    ? {
        maxPriorityFeePerGas: convertNumberToHex(
          bnOrZero(customFee.priorityFee).times(1e9).toString(), // to wei
        ),
        maxFeePerGas: convertNumberToHex(
          bnOrZero(customFee.baseFee).times(1e9).toString(), // to wei
        ),
      }
    : {
        gasPrice: convertNumberToHex(fees[speed as FeeDataKey].chainSpecific.gasPrice),
      }
}
