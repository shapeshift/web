import { Box, Flex, Stack } from '@chakra-ui/layout'
import { ModalBody, ModalFooter, Skeleton } from '@chakra-ui/react'
import { AccountId, AssetId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { AssetClaimCard } from 'plugins/cosmos/components/AssetClaimCard/AssetClaimCard'
import { ClaimButton } from 'plugins/cosmos/components/ClaimButton/ClaimButton'
import { StakedRow } from 'plugins/cosmos/components/StakedRow/StakedRow'
import { UnbondingRow } from 'plugins/cosmos/components/UnbondingRow/UnbondingRow'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectAssetById,
  selectMarketDataById,
  selectRewardsByValidator,
  selectTotalBondingsBalanceByAssetId,
  selectUnbondingEntriesByAccountSpecifier,
  selectValidatorByAddress,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <ModalBody>
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
        </Flex>
      </ModalBody>
      <ModalFooter flexDirection='column'>
        <Skeleton isLoaded={isLoaded} width='100%' justifyContent='space-between'>
          <Stack width='100%'>
            <Text translation={'defi.rewards'} color='gray.500' />
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
        </Skeleton>
        {shouldDisplayUndelegationEntries && (
          <Skeleton isLoaded={isLoaded} width='100%' minHeight='68px' mt={4}>
            <Stack width='full'>
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
          </Skeleton>
        )}
      </ModalFooter>
    </AnimatePresence>
  )
}
