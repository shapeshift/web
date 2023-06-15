import { fromAssetId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useState } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn } from 'lib/bignumber/bignumber'
import type { TradeQuote } from 'lib/swapper/api'
import { erc20AllowanceAbi } from 'lib/swapper/swappers/utils/abi/erc20Allowance-abi'
import { getERC20Allowance } from 'lib/swapper/swappers/utils/helpers/helpers'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'

const APPROVAL_CHECK_INTERVAL_MILLISECONDS = 10_000

export const useIsApprovalNeeded = (tradeQuoteStep: TradeQuote['steps'][number]) => {
  const [isApprovalNeeded, setIsApprovalNeeded] = useState(false)
  const poll = usePoll()
  const wallet = useWallet().state.wallet

  const checkApprovalNeeded = useCallback(async () => {
    const { sellAsset, accountNumber, allowanceContract } = tradeQuoteStep
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(sellAsset.chainId)

    if (!adapter) throw Error(`no chain adapter found for chain Id: ${sellAsset.chainId}`)
    if (!wallet) throw new Error('no wallet available')

    // No approval needed for selling a fee asset
    if (sellAsset.assetId === adapter.getFeeAssetId()) {
      return false
    }

    const from = await adapter.getAddress({
      wallet,
      accountNumber,
    })

    const { assetReference: sellAssetContractAddress } = fromAssetId(sellAsset.assetId)
    const web3 = getWeb3InstanceByChainId(sellAsset.chainId)

    const allowanceOnChainCryptoBaseUnit = await getERC20Allowance({
      web3,
      erc20AllowanceAbi,
      address: sellAssetContractAddress,
      spender: allowanceContract,
      from,
    })

    // TODO(woodenfurniture): This was pulled from the old implementation but we should check whether we should be
    // including protocol feess in the sell asset here
    return bn(allowanceOnChainCryptoBaseUnit).lt(tradeQuoteStep.sellAmountBeforeFeesCryptoBaseUnit)
  }, [tradeQuoteStep, wallet])

  useEffect(() => {
    poll({
      fn: async () => {
        const isApprovalNeeded = await checkApprovalNeeded()
        setIsApprovalNeeded(isApprovalNeeded)
      },
      validate: () => false,
      interval: APPROVAL_CHECK_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [checkApprovalNeeded, poll])

  return isApprovalNeeded
}
