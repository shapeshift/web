import { Box, CardBody, Skeleton } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { useGetUnstakingRequestQuery } from 'pages/RFOX/hooks/useGetUnstakingRequestQuery'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimRow } from '../Claim/ClaimRow'
import type { RfoxClaimQuote } from '../Claim/types'
import { ClaimStatus } from '../Claim/types'

type ClaimsProps = {
  headerComponent: JSX.Element
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
  setConfirmedQuote: (quote: RfoxClaimQuote) => void
}

export const Claims = ({
  setConfirmedQuote,
  headerComponent,
  stakingAssetId,
  stakingAssetAccountId,
}: ClaimsProps) => {
  const translate = useTranslate()

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const stakingAssetAccountAddress = useMemo(
    () => (stakingAssetAccountId ? fromAccountId(stakingAssetAccountId).account : undefined),
    [stakingAssetAccountId],
  )

  const {
    data: unstakingRequestResponse,
    isLoading: isUnstakingRequestLoading,
    isPending: isUnstakingRequestPending,
    isPaused: isUnstakingRequestPaused,
    isSuccess: isUnstakingRequestSuccess,
  } = useGetUnstakingRequestQuery({ stakingAssetAccountAddress })

  const claims = useMemo(() => {
    if (!stakingAsset) return null

    if (isUnstakingRequestLoading || isUnstakingRequestPending || isUnstakingRequestPaused)
      return new Array(2).fill(null).map(() => <Skeleton height={16} my={2} />)

    if (!isUnstakingRequestSuccess) {
      return <Text color='text.subtle' translation='RFOX.errorFetchingClaims' />
    }

    if (!unstakingRequestResponse.length) {
      return <Text color='text.subtle' translation='RFOX.noClaimsAvailable' />
    }

    return (unstakingRequestResponse ?? []).map((unstakingRequest, index) => {
      const amountCryptoPrecision = fromBaseUnit(
        unstakingRequest.unstakingBalance.toString(),
        stakingAsset?.precision ?? 0,
      )
      const currentTimestampMs: number = Date.now()
      const unstakingTimestampMs: number = Number(unstakingRequest.cooldownExpiry) * 1000
      const isAvailable = currentTimestampMs >= unstakingTimestampMs
      const cooldownDeltaMs = unstakingTimestampMs - currentTimestampMs
      const cooldownPeriodHuman = dayjs(Date.now() + cooldownDeltaMs).fromNow()
      const status = isAvailable ? ClaimStatus.Available : ClaimStatus.CoolingDown
      return (
        <ClaimRow
          stakingAssetId={stakingAssetId}
          key={unstakingRequest.cooldownExpiry.toString()}
          amountCryptoPrecision={amountCryptoPrecision?.toString() ?? ''}
          status={status}
          setConfirmedQuote={setConfirmedQuote}
          cooldownPeriodHuman={cooldownPeriodHuman}
          index={index}
          actionDescription={translate('RFOX.unstakeFrom', {
            assetSymbol: stakingAsset.symbol,
          })}
        />
      )
    })
  }, [
    isUnstakingRequestLoading,
    isUnstakingRequestPaused,
    isUnstakingRequestPending,
    isUnstakingRequestSuccess,
    setConfirmedQuote,
    stakingAsset,
    stakingAssetId,
    translate,
    unstakingRequestResponse,
  ])

  if (!stakingAsset) return null

  return (
    <CardBody>
      {headerComponent}
      <Box>{claims}</Box>
    </CardBody>
  )
}
