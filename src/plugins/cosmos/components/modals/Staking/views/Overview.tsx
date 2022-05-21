import { Box, Center, Flex, Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter } from '@chakra-ui/react'
import { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { AssetClaimCard } from 'plugins/cosmos/components/AssetClaimCard/AssetClaimCard'
import { ClaimButton } from 'plugins/cosmos/components/ClaimButton/ClaimButton'
import { StakedRow } from 'plugins/cosmos/components/StakedRow/StakedRow'
import { UnbondingRow } from 'plugins/cosmos/components/UnbondingRow/UnbondingRow'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectHasActiveStakingOpportunity,
  selectMarketDataById,
  selectRewardsByValidator,
  selectTotalBondingsBalanceByAssetId,
  selectUnbondingEntriesByAccountSpecifier,
  selectValidatorByAddress,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { GetStartedManager } from './GetStarted/GetStartedManager'

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
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const validatorInfo = useAppSelector(state => selectValidatorByAddress(state, validatorAddress))
  const isLoaded = Boolean(validatorInfo)

  const totalBondings = useAppSelector(state =>
    selectTotalBondingsBalanceByAssetId(state, {
      accountSpecifier,
      validatorAddress,
      assetId: asset.assetId,
    }),
  )

  const hasActiveStaking = useAppSelector(state =>
    selectHasActiveStakingOpportunity(state, { accountSpecifier, assetId }),
  )

  const undelegationEntries = useAppSelector(state =>
    selectUnbondingEntriesByAccountSpecifier(state, {
      accountSpecifier,
      validatorAddress,
      assetId: asset.assetId,
    }),
  )

  const rewardsAmount = useAppSelector(state =>
    selectRewardsByValidator(state, {
      accountSpecifier,
      validatorAddress,
      assetId: asset.assetId,
    }),
  )

  // If it's loading, it will display the skeleton,
  // overwise if there are some undelegationEntries it will display it.
  const shouldDisplayUndelegationEntries = undelegationEntries?.length || !isLoaded

  const shouldDisplayGetStarted =
    !hasActiveStaking || !undelegationEntries?.length || bnOrZero(rewardsAmount).lte(0)

  if (!isLoaded) {
    return (
      <Center minW='350px' minH='350px'>
        <CircularProgress />
      </Center>
    )
  }

  return (
    <AnimatePresence exitBeforeEnter>
      {shouldDisplayGetStarted ? (
        <GetStartedManager assetId={assetId} />
      ) : (
        <>
          <ModalBody>
            <Flex
              direction='column'
              maxWidth='595px'
              alignItems='center'
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
            </Flex>
          </ModalBody>
          <ModalFooter flexDirection='column'>
            <Stack width='100%'>
              <Text translation={'defi.asdrsadfasdfrewards'} color='gray.500' />
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
            </Stack>
            {shouldDisplayUndelegationEntries && (
              <Stack width='full' mt={4}>
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
              </Stack>
            )}
          </ModalFooter>
        </>
      )}
    </AnimatePresence>
  )
}
