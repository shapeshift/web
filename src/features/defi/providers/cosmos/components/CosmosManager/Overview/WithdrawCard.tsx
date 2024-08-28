import { Button, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import dayjs from 'dayjs'
import type {
  DefiParams,
  DefiQueryParams,
} from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { useMemo } from 'react'
import { FaArrowDown } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import {
  serializeUserStakingId,
  supportsUndelegations,
  toValidatorId,
} from 'state/slices/opportunitiesSlice/utils'
import { selectUserStakingOpportunityByUserStakingId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type WithdrawCardProps = {
  asset: Asset
  accountId?: AccountId | undefined
}

const buttonHover = { cursor: 'auto', borderRadius: 'auto', borderColor: 'auto' }
const buttonActive = { cursor: 'auto', borderRadius: 'auto', borderColor: 'auto' }
const buttonLeftIcon = (
  <IconCircle>
    <FaArrowDown />
  </IconCircle>
)

export const WithdrawCard = ({ asset, accountId: routeAccountId }: WithdrawCardProps) => {
  const { query } = useBrowserRouter<DefiQueryParams, DefiParams>()
  const { chainId, contractAddress: validatorAddress } = query

  const validatorId = toValidatorId({ chainId, account: validatorAddress })

  const opportunityDataFilter = useMemo(() => {
    if (!routeAccountId) return {}
    const userStakingId = serializeUserStakingId(routeAccountId, validatorId)
    return { userStakingId }
  }, [routeAccountId, validatorId])

  const opportunityData = useAppSelector(state =>
    selectUserStakingOpportunityByUserStakingId(state, opportunityDataFilter),
  )

  const undelegationEntries = useMemo(() => {
    if (!opportunityData) return []
    if (!supportsUndelegations(opportunityData)) return []

    return opportunityData.undelegations.filter(
      undelegation => dayjs().unix() < undelegation.completionTime,
    )
  }, [opportunityData])

  const hasUndelegations = Boolean(undelegationEntries?.length)

  const textColor = useColorModeValue('black', 'white')
  const pendingColor = useColorModeValue('yellow.500', 'yellow.200')

  const undelegationNodes = useMemo(() => {
    if (!hasUndelegations)
      return <Text color='text.subtle' translation='defi.modals.cosmosOverview.emptyWithdraws' />
    return undelegationEntries.map(({ undelegationAmountCryptoBaseUnit, completionTime }) => {
      return (
        <Button
          variant='input'
          _hover={buttonHover}
          _active={buttonActive}
          width='full'
          maxHeight='auto'
          height='auto'
          alignItems='center'
          justifyContent='flex-start'
          textAlign='left'
          py={2}
          leftIcon={buttonLeftIcon}
        >
          <Stack spacing={0}>
            <Text color={textColor} translation='common.withdrawal' />
            <Text
              color={pendingColor}
              fontWeight='normal'
              lineHeight='shorter'
              translation={'common.pending'}
            />
          </Stack>
          <Stack spacing={0} ml='auto' textAlign='right'>
            <Amount.Crypto
              color={textColor}
              value={bnOrZero(undelegationAmountCryptoBaseUnit)
                .div(bn(10).pow(asset.precision))
                .toString()}
              symbol={asset.symbol}
              maximumFractionDigits={asset.precision}
            />
            <Text
              fontWeight='normal'
              lineHeight='shorter'
              // we need to pass an arg here, so we need an anonymous function wrapper
              // eslint-disable-next-line react-memo/require-usememo
              translation={[
                'defi.modals.cosmosOverview.availableDate',
                { date: dayjs().to(dayjs.unix(completionTime)) },
              ]}
            />
          </Stack>
        </Button>
      )
    })
  }, [
    hasUndelegations,
    undelegationEntries,
    textColor,
    pendingColor,
    asset.precision,
    asset.symbol,
  ])

  return (
    <Stack px={8} py={6}>
      <Text fontWeight='medium' translation='defi.modals.cosmosOverview.withdrawals' />
      {undelegationNodes}
    </Stack>
  )
}
