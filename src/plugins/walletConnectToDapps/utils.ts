import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type {
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
  FeeDataKey,
} from '@shapeshiftoss/chain-adapters'
import type { EvmSupportedChainIds } from '@shapeshiftoss/swapper'
import { convertNumberToHex } from '@walletconnect/utils'
import type { TransactionParams } from 'plugins/walletConnectToDapps/bridge/types'
import type { ConfirmData } from 'plugins/walletConnectToDapps/components/modal/callRequest/CallRequestCommon'
import { bnOrZero } from 'lib/bignumber/bignumber'

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
      contractAddress: tx.to,
      contractData: tx.data,
    },
  })
}

export const getGasData = (
  approveData: ConfirmData,
  fees: FeeDataEstimate<EvmSupportedChainIds>,
) => {
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
