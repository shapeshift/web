import { Alert, AlertDescription, AlertIcon, useColorModeValue } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { canCoverTxFees } from 'features/defi/helpers/utils'
import type { InterpolationOptions } from 'node-polyglot'
import { useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { isSome } from 'lib/utils'

export const ApprovePreFooter = ({
  action,
  feeAsset,
  estimatedGasCryptoPrecision,
  accountId,
}: {
  accountId: AccountId | undefined
  action: DefiAction.Deposit | DefiAction.Withdraw
  estimatedGasCryptoPrecision: string | undefined
  feeAsset: Asset
}) => {
  const translate = useTranslate()

  const alertTextColor = useColorModeValue('blue.800', 'white')
  const hasEnoughBalanceForGas = useMemo(
    () =>
      isSome(estimatedGasCryptoPrecision) &&
      isSome(accountId) &&
      canCoverTxFees({
        feeAsset,
        estimatedGasCryptoPrecision,
        accountId,
      }),
    [estimatedGasCryptoPrecision, accountId, feeAsset],
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

  if (!accountId) return null

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
