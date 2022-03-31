import { Box, Flex } from '@chakra-ui/layout'
import { Skeleton } from '@chakra-ui/react'
import { CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { AssetClaimCard } from 'plugins/cosmos/components/AssetClaimCard/AssetClaimCard'
import { ClaimButton } from 'plugins/cosmos/components/ClaimButton/ClaimButton'
import { StakedRow } from 'plugins/cosmos/components/StakedRow/StakedRow'
import { UnbondingRow } from 'plugins/cosmos/components/UnbondingRow/UnbondingRow'
import { useEffect } from 'react'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import {
  ASSET_ID_TO_DENOM,
  selectRewardsAmountByDenom,
  selectStakingDataStatus,
  selectTotalBondingsBalanceByAccountSpecifier,
  selectUnbondingEntriesByAccountSpecifier
} from 'state/slices/stakingDataSlice/selectors'
import { stakingDataApi } from 'state/slices/stakingDataSlice/stakingDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

type StakedProps = {
  assetId: CAIP19
  accountSpecifier: CAIP10
}

const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'

export const Overview = ({ assetId, accountSpecifier }: StakedProps) => {
  const stakingDataStatus = useAppSelector(selectStakingDataStatus)
  const isLoaded = stakingDataStatus === 'loaded'
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const dispatch = useAppDispatch()

  useEffect(() => {
    ;(async () => {
      if (!accountSpecifier.length || isLoaded) return

      dispatch(
        stakingDataApi.endpoints.getStakingData.initiate(
          { accountSpecifier },
          { forceRefetch: true }
        )
      )
    })()
  }, [accountSpecifier, isLoaded, dispatch])

  const totalBondings = useAppSelector(state =>
    selectTotalBondingsBalanceByAccountSpecifier(
      state,
      accountSpecifier,
      SHAPESHIFT_VALIDATOR_ADDRESS, // TODO(gomes): Pass this from `<StakingOpportunitiesRow />` with modal state
      ASSET_ID_TO_DENOM[asset.caip19]
    )
  )
  const undelegationEntries = useAppSelector(state =>
    selectUnbondingEntriesByAccountSpecifier(state, accountSpecifier, SHAPESHIFT_VALIDATOR_ADDRESS)
  )

  const rewardsAmount = useAppSelector(state =>
    selectRewardsAmountByDenom(
      state,
      accountSpecifier,
      SHAPESHIFT_VALIDATOR_ADDRESS,
      ASSET_ID_TO_DENOM[asset.caip19]
    )
  )

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Box p='22px'>
        <Flex
          direction='column'
          maxWidth='595px'
          alignItems='center'
          justifyContent='space-between'
        >
          <Skeleton
            isLoaded={Boolean(isLoaded && accountSpecifier)}
            width='100%'
            minHeight='48px'
            mb='30px'
            justifyContent='space-between'
          >
            <StakedRow
              assetSymbol={asset.symbol}
              fiatRate={bnOrZero(marketData.price)}
              cryptoStakedAmount={bnOrZero(totalBondings).div(`1e+${asset.precision}`)}
              apr={bnOrZero('0.12')}
            />
          </Skeleton>
          <Skeleton isLoaded={isLoaded} width='100%' mb='40px' justifyContent='space-between'>
            <Box width='100%'>
              <Text translation={'defi.rewards'} mb='12px' color='gray.500' />
              <AssetClaimCard
                assetSymbol={asset.symbol}
                assetName={asset.name}
                cryptoRewardsAmount={bnOrZero(rewardsAmount).div(`1e+${asset.precision}`)}
                fiatRate={bnOrZero(marketData.price)}
                renderButton={() => <ClaimButton assetId={assetId} />}
              />
            </Box>
          </Skeleton>
          <Skeleton isLoaded={isLoaded} width='100%' minHeight='68px' mb='20px'>
            <Text translation={'defi.unstaking'} color='gray.500' />
            <Box width='100%'>
              {undelegationEntries.map((undelegation, i) => (
                <UnbondingRow
                  key={i}
                  assetSymbol={asset.symbol}
                  fiatRate={bnOrZero(marketData.price)}
                  cryptoUnbondedAmount={bnOrZero(undelegation.amount).div(`1e+${asset.precision}`)}
                  unbondingEnd={undelegation.completionTime}
                />
              ))}
            </Box>
          </Skeleton>
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
