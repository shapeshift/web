import { Box, Flex } from '@chakra-ui/layout'
import { Skeleton } from '@chakra-ui/react'
import { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { AssetClaimCard } from 'plugins/cosmos/components/AssetClaimCard/AssetClaimCard'
import { ClaimButton } from 'plugins/cosmos/components/ClaimButton/ClaimButton'
import { StakedRow } from 'plugins/cosmos/components/StakedRow/StakedRow'
import { UnbondingRow } from 'plugins/cosmos/components/UnbondingRow/UnbondingRow'
import { useEffect } from 'react'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import {
  selectAllUnbondingsEntriesByAssetIdAndValidator,
  selectRewardsAmountByAssetId,
  selectSingleValidator,
  selectStakingDataIsLoaded,
  selectTotalBondingsBalanceByAssetId,
} from 'state/slices/stakingDataSlice/selectors'
import { stakingDataApi } from 'state/slices/stakingDataSlice/stakingDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

type StakedProps = {
  assetId: AssetId
  validatorAddress: string
  accountSpecifier: AccountId
}

export const Overview: React.FC<StakedProps> = ({
  assetId,
  validatorAddress,
  accountSpecifier,
}) => {
  const isLoaded = useAppSelector(selectStakingDataIsLoaded)
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const dispatch = useAppDispatch()

  useEffect(() => {
    ;(async () => {
      if (!accountSpecifier.length || isLoaded) return

      dispatch(
        stakingDataApi.endpoints.getStakingData.initiate(
          { accountSpecifier },
          { forceRefetch: true },
        ),
      )
    })()
  }, [accountSpecifier, isLoaded, dispatch])

  const validatorInfo = useAppSelector(state =>
    selectSingleValidator(state, accountSpecifier, validatorAddress),
  )

  const totalBondings = useAppSelector(state =>
    selectTotalBondingsBalanceByAssetId(state, accountSpecifier, validatorAddress, asset.caip19),
  )
  const undelegationEntries = useAppSelector(state =>
    selectAllUnbondingsEntriesByAssetIdAndValidator(
      state,
      accountSpecifier,
      validatorAddress,
      asset.caip19,
    ),
  )

  const rewardsAmount = useAppSelector(state =>
    selectRewardsAmountByAssetId(state, accountSpecifier, validatorAddress, asset.caip19),
  )

  // If it's loading, it will display the skeleton,
  // overwise if there are some undelegationEntries it will display it.
  const shouldDisplayUndelegationEntries = undelegationEntries?.length || !isLoaded

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
              assetIcon={asset.icon}
              fiatRate={bnOrZero(marketData.price)}
              cryptoStakedAmount={bnOrZero(totalBondings)
                .div(`1e+${asset.precision}`)
                .decimalPlaces(asset.precision)}
              apr={bnOrZero(validatorInfo?.apr)}
            />
          </Skeleton>
          <Skeleton isLoaded={isLoaded} width='100%' mb='40px' justifyContent='space-between'>
            <Box width='100%'>
              <Text translation={'defi.rewards'} mb='12px' color='gray.500' />
              <AssetClaimCard
                assetSymbol={asset.symbol}
                assetIcon={asset.icon}
                cryptoRewardsAmount={bnOrZero(rewardsAmount)
                  .div(`1e+${asset.precision}`)
                  .decimalPlaces(asset.precision)}
                fiatRate={bnOrZero(marketData.price)}
                renderButton={() => (
                  <ClaimButton
                    assetId={assetId}
                    validatorAddress={validatorAddress}
                    // We're getting fractions of uatom as rewards, but at protocol-level, it is actually impossible to claim these
                    // Any amount that's less than 1 uatom effectively means no rewards
                    isDisabled={bnOrZero(rewardsAmount).lt(1)}
                  />
                )}
              />
            </Box>
          </Skeleton>
          {shouldDisplayUndelegationEntries && (
            <Skeleton isLoaded={isLoaded} width='100%' minHeight='68px' mb='20px'>
              <>
                <Text translation={'defi.unstaking'} color='gray.500' />
                <Box width='100%'>
                  {undelegationEntries?.map((undelegation, i) => (
                    <UnbondingRow
                      key={i}
                      assetSymbol={asset.symbol}
                      fiatRate={bnOrZero(marketData.price)}
                      cryptoUnbondedAmount={bnOrZero(undelegation.amount).div(
                        `1e+${asset.precision}`,
                      )}
                      unbondingEnd={undelegation.completionTime}
                    />
                  ))}
                </Box>
              </>
            </Skeleton>
          )}
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
