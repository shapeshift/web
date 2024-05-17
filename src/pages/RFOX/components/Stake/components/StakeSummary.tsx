import { Skeleton, Stack } from '@chakra-ui/react'
import {
  type AccountId,
  type AssetId,
  foxOnArbitrumOneAssetId,
  fromAccountId,
  fromAssetId,
} from '@shapeshiftoss/caip'
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
import { formatDuration } from 'lib/utils/time'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakeSummaryProps = {
  isLoading?: boolean
  assetId: AssetId
  stakingAmountCryptoPrecision: string
  stakingAssetAccountId: AccountId
}

export const StakeSummary: React.FC<StakeSummaryProps> = ({
  isLoading,
  stakingAmountCryptoPrecision,
  stakingAssetAccountId,
  assetId,
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const translate = useTranslate()

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(stakingAssetAccountId).account,
    [stakingAssetAccountId],
  )

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

  const { data: userBalanceOf, isSuccess: isUserBalanceOfSuccess } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'balanceOf',
    args: [getAddress(stakingAssetAccountAddress)],
    chainId: arbitrum.id,
    query: {
      select: data => data.toString(),
    },
  })

  const { data: contractBalanceOf, isSuccess: isContractBalanceOfSuccess } = useReadContract({
    abi: erc20ABI,
    address: getAddress(fromAssetId(foxOnArbitrumOneAssetId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(RFOX_PROXY_CONTRACT_ADDRESS)],
    chainId: arbitrum.id,
    query: {
      select: data => data.toString(),
    },
  })

  const shareOfPoolPercentage = useMemo(
    () =>
      bnOrZero(userBalanceOf)
        .div(contractBalanceOf ?? 0)
        .toFixed(4),
    [contractBalanceOf, userBalanceOf],
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
          <Skeleton isLoaded={isUserBalanceOfSuccess && isContractBalanceOfSuccess}>
            <Amount.Percent value={shareOfPoolPercentage} />
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}
