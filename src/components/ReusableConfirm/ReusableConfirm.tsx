import { Button, Card, CardBody, CardFooter, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { InterpolationOptions } from 'node-polyglot'
import type { JSX, PropsWithChildren, ReactNode } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Row } from '@/components/Row/Row'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText, Text } from '@/components/Text'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ReusableConfirmProps = {
  feeAssetId?: AssetId
  assetId: AssetId
  headerText: string
  cryptoAmount: string
  cryptoSymbol: string
  fiatAmount: string
  confirmText: string
  feeAmountFiat: string | undefined
  dustAmountUserCurrency?: string
  isDisabled: boolean
  isLoading: boolean
  isError?: boolean
  headerLeftComponent?: ReactNode
  headerRightComponent?: ReactNode
  amountFooterComponent?: ReactNode
  onConfirm: () => void
  confirmAlert?: JSX.Element | null
} & PropsWithChildren

export const ReusableConfirm = ({
  feeAssetId,
  assetId,
  headerText,
  cryptoAmount,
  cryptoSymbol,
  fiatAmount,
  feeAmountFiat,
  dustAmountUserCurrency,
  confirmText,
  isDisabled,
  isLoading,
  isError,
  headerLeftComponent,
  headerRightComponent,
  amountFooterComponent,
  onConfirm,
  confirmAlert,
  children,
}: ReusableConfirmProps) => {
  const translate = useTranslate()

  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  const dustAmountTooltipTranslation: [string, InterpolationOptions] = useMemo(() => {
    return ['TCY.claimConfirm.dustAmountTooltip', { symbol: feeAsset?.symbol ?? '' }]
  }, [feeAsset?.symbol])

  const dustAmountTooltipBody = useCallback(
    () => <Text translation={dustAmountTooltipTranslation} />,
    [dustAmountTooltipTranslation],
  )

  const networkFeeTooltipTranslation: [string, InterpolationOptions] = useMemo(() => {
    return ['TCY.claimConfirm.networkFeeTooltip', { symbol: feeAsset?.symbol ?? '' }]
  }, [feeAsset?.symbol])

  const networkFeeTooltipBody = useCallback(
    () => <Text translation={networkFeeTooltipTranslation} />,
    [networkFeeTooltipTranslation],
  )

  return (
    <SlideTransition>
      <DialogHeader>
        {headerLeftComponent && <DialogHeader.Left>{headerLeftComponent}</DialogHeader.Left>}
        <DialogHeader.Middle>
          <RawText>{headerText}</RawText>
        </DialogHeader.Middle>
        {headerRightComponent && <DialogHeader.Right>{headerRightComponent}</DialogHeader.Right>}
      </DialogHeader>
      <Stack spacing={4}>
        <Card mx={4}>
          <CardBody textAlign='center' py={8}>
            <AssetIcon assetId={assetId} />
            <Amount.Crypto
              fontWeight='bold'
              value={cryptoAmount}
              mt={4}
              symbol={cryptoSymbol}
              color='text.base'
              fontSize='lg'
            />
            <Amount.Fiat fontSize='sm' value={fiatAmount} color='text.subtle' />
          </CardBody>
          {amountFooterComponent}
        </Card>
        {children && <CardBody>{children}</CardBody>}
        <CardFooter
          flexDir='column'
          gap={4}
          pb={4}
          px={4}
          bg='background.surface.raised.accent'
          borderBottomRadius='lg'
        >
          <Row px={2} fontSize='sm' Tooltipbody={networkFeeTooltipBody}>
            <Row.Label>{translate('TCY.claimConfirm.networkFee')}</Row.Label>
            <Row.Value>
              <Skeleton isLoaded={!!feeAmountFiat}>
                <Amount.Fiat value={feeAmountFiat} />
              </Skeleton>
            </Row.Value>
          </Row>
          {dustAmountUserCurrency && (
            <Row px={2} fontSize='sm' Tooltipbody={dustAmountTooltipBody}>
              <Row.Label>{translate('common.dustAmount')}</Row.Label>
              <Row.Value>
                <Amount.Fiat value={dustAmountUserCurrency} />
              </Row.Value>
            </Row>
          )}
          {confirmAlert ? confirmAlert : null}
          <Button
            size='lg'
            colorScheme={isError ? 'red' : 'blue'}
            onClick={onConfirm}
            isDisabled={isDisabled}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </CardFooter>
      </Stack>
    </SlideTransition>
  )
}
