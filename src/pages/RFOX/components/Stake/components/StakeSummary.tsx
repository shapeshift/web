import { Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { arbitrum } from 'viem/chains'
import { useContractRead } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { formatDuration } from 'lib/utils/time'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakeSummaryProps = {
  isLoading?: boolean
  assetId: AssetId
  stakingAmountCryptoPrecision: string
}

export const StakeSummary: React.FC<StakeSummaryProps> = ({
  isLoading,
  stakingAmountCryptoPrecision,
  assetId,
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const translate = useTranslate()

  const { data: cooldownPeriod, isSuccess: isCooldownPeriodSuccess } = useContractRead({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    staleTime: Infinity,
    select: data => formatDuration(Number(data)),
  })

  const stakeAmountToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.stakeAmount' />
  }, [])

  const lockupPeriodToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.lockupPeriod' />
  }, [])

  const shareOfPoolToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.shareOfPool' />
  }, [])

  if (!asset) return null
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
        <Row.Label>{translate('RFOX.stakeAmount')}</Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto value={stakingAmountCryptoPrecision} symbol={asset.symbol} />
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
          <Skeleton isLoaded={!isLoading}>
            <Amount.Percent value='TODO' />
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}
