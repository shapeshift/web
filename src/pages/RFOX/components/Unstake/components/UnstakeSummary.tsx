import { Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { type AssetId, fromAccountId } from '@shapeshiftoss/caip'
import { RFOX_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import { selectStakingBalance } from 'pages/RFOX/helpers'
import { useCooldownPeriodQuery } from 'pages/RFOX/hooks/useCooldownPeriodQuery'
import { useStakingBalanceOfQuery } from 'pages/RFOX/hooks/useStakingBalanceOfQuery'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UnstakeSummaryProps = {
  isLoading?: boolean
  amountCryptoPrecision: string
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId
}

export const UnstakeSummary: React.FC<UnstakeSummaryProps> = ({
  isLoading,
  amountCryptoPrecision,
  stakingAssetId,
  stakingAssetAccountId,
}) => {
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const translate = useTranslate()
  const amountCryptoBaseUnit = useMemo(
    () => toBaseUnit(amountCryptoPrecision, stakingAsset?.precision ?? 0),
    [amountCryptoPrecision, stakingAsset?.precision],
  )

  const stakeAmountToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.unstakeAmount' />
  }, [])

  const lockupPeriodToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.lockupPeriod' />
  }, [])

  const shareOfPoolToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.shareOfPool' />
  }, [])

  const { data: cooldownPeriod, isSuccess: isCooldownPeriodSuccess } = useCooldownPeriodQuery()
  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(stakingAssetAccountId).account,
    [stakingAssetAccountId],
  )

  const {
    data: userStakingBalanceOfCryptoBaseUnit,
    isSuccess: isUserStakingBalanceOfCryptoBaseUnitSuccess,
  } = useStakingInfoQuery({
    stakingAssetAccountAddress,
    select: selectStakingBalance,
  })

  const {
    data: newContractBalanceOfCryptoBaseUnit,
    isSuccess: isNewContractBalanceOfCryptoBaseUnitSuccess,
  } = useStakingBalanceOfQuery({
    stakingAssetId,
    stakingAssetAccountAddress: RFOX_PROXY_CONTRACT,
    select: data => data.toString(),
  })

  const newShareOfPoolPercentage = useMemo(
    () =>
      bnOrZero(userStakingBalanceOfCryptoBaseUnit)
        .minus(amountCryptoBaseUnit ?? 0)
        .div(newContractBalanceOfCryptoBaseUnit ?? 0)
        .toFixed(4),
    [amountCryptoBaseUnit, newContractBalanceOfCryptoBaseUnit, userStakingBalanceOfCryptoBaseUnit],
  )

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
          <Skeleton isLoaded={isCooldownPeriodSuccess}>{cooldownPeriod}</Skeleton>
        </Row.Value>
      </Row>
      <Row Tooltipbody={shareOfPoolToolTip}>
        <Row.Label>{translate('RFOX.shareOfPool')}</Row.Label>
        <Row.Value>
          <Skeleton
            isLoaded={
              isNewContractBalanceOfCryptoBaseUnitSuccess &&
              isUserStakingBalanceOfCryptoBaseUnitSuccess
            }
          >
            <Amount.Percent value={newShareOfPoolPercentage} />
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}
