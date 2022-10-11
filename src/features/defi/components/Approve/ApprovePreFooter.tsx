import { Alert, AlertDescription, AlertIcon, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import { bnOrZero } from '@shapeshiftoss/investor-yearn/dist/utils/bignumber'
import { DefiAction } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import type { InterpolationOptions } from 'node-polyglot'
import { useMemo } from 'react'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { selectPortfolioCryptoHumanBalanceByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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

  const feeAssetBalance = useAppSelector(state =>
    selectPortfolioCryptoHumanBalanceByAssetId(state, { assetId: feeAsset?.assetId ?? '' }),
  )

  const alertText = useColorModeValue('blue.800', 'white')
  const hasEnoughBalanceForGas = useMemo(
    () =>
      bnOrZero(feeAssetBalance)
        .minus(bnOrZero(estimatedGasCrypto).div(`1e+${feeAsset.precision}`))
        .gte(0),
    [feeAsset.precision, feeAssetBalance, estimatedGasCrypto],
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
        <AlertDescription textAlign='left' ml={3} color={alertText}>
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
