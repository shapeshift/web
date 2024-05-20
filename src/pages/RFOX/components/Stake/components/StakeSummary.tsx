import { Skeleton, Stack } from '@chakra-ui/react'
import { type AssetId, foxOnArbitrumOneAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { erc20ABI } from 'contracts/abis/ERC20ABI'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
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
  const stakingAsset = useAppSelector(state => selectAssetById(state, assetId))
  const translate = useTranslate()

  const { data: cooldownPeriod, isSuccess: isCooldownPeriodSuccess } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    query: {
      staleTime: Infinity,
      select: data => formatDuration(Number(data)),
    },
  })

  const { data: contractBalanceOf, isSuccess: isContractBalanceOfSuccess } = useReadContract({
    abi: erc20ABI,
    address: getAddress(fromAssetId(foxOnArbitrumOneAssetId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(RFOX_PROXY_CONTRACT_ADDRESS)],
    chainId: arbitrum.id,
    query: {
      select: data =>
        bnOrZero(fromBaseUnit(data.toString(), stakingAsset?.precision ?? 0)).plus(
          stakingAmountCryptoPrecision,
        ),
    },
  })

  const shareOfPoolPercentage = useMemo(
    () =>
      bnOrZero(stakingAmountCryptoPrecision)
        .div(contractBalanceOf ?? 0)
        .toFixed(4),
    [contractBalanceOf, stakingAmountCryptoPrecision],
  )

  const stakeAmountToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.stakeAmount' />
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
        <Row.Label>{translate('RFOX.stakeAmount')}</Row.Label>
        <Row.Value>
          <Skeleton isLoaded={!isLoading}>
            <Amount.Crypto value={stakingAmountCryptoPrecision} symbol={stakingAsset.symbol} />
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
          <Skeleton isLoaded={isContractBalanceOfSuccess}>
            <Amount.Percent value={shareOfPoolPercentage} />
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}
