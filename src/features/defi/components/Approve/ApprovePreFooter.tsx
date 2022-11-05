import { Alert, AlertDescription, AlertIcon, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import type { InterpolationOptions } from 'node-polyglot'
import { useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

export const ApprovePreFooter = ({
  action,
  feeAsset,
  estimatedGasCrypto,
}: {
  action: DefiAction.Deposit | DefiAction.Withdraw
  estimatedGasCrypto?: string
  feeAsset: Asset
}) => {
  const translate = useTranslate()

  const alertTextColor = useColorModeValue('blue.800', 'white')
  const hasEnoughBalanceForGas = useMemo(
    () => canCoverTxFees(feeAsset, estimatedGasCrypto),
    [feeAsset, estimatedGasCrypto],
  )

  const feeTranslation = useMemo(
    () =>
      translate(
        action === DefiAction.Deposit ? 'modals.approve.depositFee' : 'modals.withdraw.withdrawFee',
      ),
    [action, translate],
  )

  const notEnoughGasTranslation: [string, InterpolationOptions] = useMemo(
    () =>
      action === DefiAction.Deposit
        ? ['modals.confirm.notEnoughGas', { assetSymbol: feeAsset.symbol }]
        : ['modals.withdraw.notEnoughGas', { assetSymbol: feeAsset.symbol }],
    [action, feeAsset.symbol],
  )

  return (
    <>
      <Alert status='info' borderRadius='lg' color='blue.500'>
        <FaGasPump />
        <AlertDescription textAlign='left' ml={3} color={alertTextColor}>
          {feeTranslation}
        </AlertDescription>
      </Alert>
      {!hasEnoughBalanceForGas && (
        <Alert status='error' borderRadius='lg'>
          <AlertIcon />
          <Text translation={notEnoughGasTranslation} />
        </Alert>
      )}
    </>
  )
}
