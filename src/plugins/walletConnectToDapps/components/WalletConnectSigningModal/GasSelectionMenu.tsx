import type { ChainId } from '@shapeshiftoss/caip'
import { bnOrZero, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback, useEffect } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import { GasSelection } from '@/components/GasSelection'
import { useSimulateEvmTransaction } from '@/plugins/walletConnectToDapps/hooks/useSimulateEvmTransaction'
import type { CustomTransactionData, TransactionParams } from '@/plugins/walletConnectToDapps/types'

type GasSelectionMenuProps = {
  transaction: TransactionParams
  chainId: ChainId
}

export const GasSelectionMenu: FC<GasSelectionMenuProps> = ({ transaction, chainId }) => {
  const { setValue } = useFormContext<CustomTransactionData>()

  const { speed } = useWatch<CustomTransactionData>()
  const { gasLimit } = useWatch<CustomTransactionData>()
  const selectedSpeed = speed

  const { simulationQuery, gasFeeDataQuery, fee } = useSimulateEvmTransaction({
    transaction,
    chainId,
    speed: selectedSpeed,
  })

  // Ensure no failures by trusting too low gas limit e.g wc demo dApp enforces 21000 gas limit for ETH.ARB sends, but actual gas may be e.g 23322
  useEffect(() => {
    const maybeGasUsed = simulationQuery.data?.transaction?.gas_used
    if (!maybeGasUsed) return

    // Only update gasLimit if simulation shows we need MORE gas than currently set
    if (bnOrZero(maybeGasUsed).lte(gasLimit ?? 0)) return

    setValue('gasLimit', maybeGasUsed.toString())
  }, [simulationQuery.data?.transaction?.gas_used, setValue, gasLimit])

  const handleSpeedChange = useCallback(
    (newSpeed: FeeDataKey) => {
      setValue('speed', newSpeed)
    },
    [setValue],
  )

  if (!fee?.feeAsset) return null

  return (
    <GasSelection
      selectedSpeed={selectedSpeed ?? FeeDataKey.Fast}
      onSpeedChange={handleSpeedChange}
      feeAmount={fee.txFeeCryptoPrecision}
      feeSymbol={fee.feeAsset.symbol}
      fiatFee={fee.fiatFee}
      isLoading={gasFeeDataQuery.isLoading || simulationQuery.isLoading}
      showSimulationTooltip={true}
    />
  )
}
