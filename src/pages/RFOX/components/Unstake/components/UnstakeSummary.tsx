import { Skeleton, Stack } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import {
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
import { fromBaseUnit } from 'lib/math'
import { formatDuration } from 'lib/utils/time'
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

  const stakeAmountToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.unstakeAmount' />
  }, [])

  const lockupPeriodToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.lockupPeriod' />
  }, [])

  const shareOfPoolToolTip = useCallback(() => {
    return <Text color='text.subtle' translation='RFOX.tooltips.shareOfPool' />
  }, [])

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

  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(stakingAssetAccountId).account,
    [stakingAssetAccountId],
  )

  // TODO(gomes): fix me both here and in staking, this should be the staking balance, not the hollistic balanceOf
  const { data: userBalanceOf, isSuccess: isUserBalanceOfSuccess } = useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'balanceOf',
    args: [getAddress(stakingAssetAccountAddress)],
    chainId: arbitrum.id,
    query: {
      select: data => fromBaseUnit(data.toString(), stakingAsset?.precision ?? 0),
      enabled: Boolean(stakingAsset),
    },
  })

  const { data: newContractBalanceOf, isSuccess: isNewContractBalanceOfSuccess } = useReadContract({
    abi: erc20ABI,
    // TODO(gomes): fixme, programmatic in the two places this is uses for unstaking, and in the two for staking
    address: getAddress(fromAssetId(foxOnArbitrumOneAssetId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(RFOX_PROXY_CONTRACT_ADDRESS)],
    chainId: arbitrum.id,
    query: {
      select: data =>
        bnOrZero(fromBaseUnit(data.toString(), stakingAsset?.precision ?? 0)).minus(
          amountCryptoPrecision,
        ),
    },
  })

  const newShareOfPoolPercentage = useMemo(
    () =>
      bnOrZero(userBalanceOf)
        .minus(amountCryptoPrecision ?? 0)
        .div(newContractBalanceOf ?? 0)
        .toFixed(4),
    [amountCryptoPrecision, newContractBalanceOf, userBalanceOf],
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
          <Skeleton isLoaded={isNewContractBalanceOfSuccess && isUserBalanceOfSuccess}>
            <Amount.Percent value={newShareOfPoolPercentage} />
          </Skeleton>
        </Row.Value>
      </Row>
    </Stack>
  )
}
