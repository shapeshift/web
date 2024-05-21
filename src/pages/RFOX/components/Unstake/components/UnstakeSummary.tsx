import { Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UnstakeSummaryProps = {
  isLoading?: boolean
  amountCryptoPrecision: string
  stakingAssetId: AssetId
}

export const UnstakeSummary: React.FC<UnstakeSummaryProps> = ({
  isLoading,
  amountCryptoPrecision,
  stakingAssetId,
}) => {
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const translate = useTranslate()

  const stakeAmountToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.unstakeAmount' />
  }, [])

  const lockupPeriodToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.lockupPeriod' />
  }, [])

  const shareOfPoolToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.shareOfPool' />
  }, [])

  if (!stakingAsset) return null
  return (
    <Stack
      fontSize='sm'
      px={6}
      spacing={4}
      fontWeight='medium'
      mb={4}
      pt={4}
      borderTopWidth={1}
      borderColor='border.base'
    >
      <Text translation='RFOX.stakingDetails' fontWeight='bold' />
      <Row Tooltipbody={stakeAmountToolTip}>
        <Row.Label>{translate('RFOX.unstakeAmount')}</Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto value={amountCryptoPrecision} symbol={stakingAsset.symbol} />
          </Skeleton>
        </Row.Value>
      </Row>
      <Row Tooltipbody={lockupPeriodToolTip}>
        <Row.Label>{translate('RFOX.lockupPeriod')}</Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!isLoading}>28 days</Skeleton>
        </Row.Value>
      </Row>
      <Row Tooltipbody={shareOfPoolToolTip}>
        <Row.Label>{translate('RFOX.shareOfPool')}</Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Percent value='0.02' />
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}
