import { Box, Flex } from '@chakra-ui/layout'
import { ModalCloseButton } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { ClaimButton } from 'plugins/cosmos/components/ClaimButton/ClaimButton'
import { OverviewHeader } from 'plugins/cosmos/components/OverviewHeader/OverviewHeader'
import { RewardsRow } from 'plugins/cosmos/components/RewardsRow/RewardsRow'
import { StakedRow } from 'plugins/cosmos/components/StakedRow/StakedRow'
import { StakingButtons } from 'plugins/cosmos/components/StakingButtons/StakingButtons'
import { UnbondingRow } from 'plugins/cosmos/components/UnbondingRow/UnbondingRow'
import { bnOrZero } from 'lib/bignumber/bignumber'

type StakedProps = {
  assetId: CAIP19
}

// TODO: Wire up the whole component with staked data
export const Overview = ({ assetId }: StakedProps) => {
  // TODO: wire me up, parentheses are nice but let's get asset name from selectAssetNameById instead of this
  const asset = (_ => ({
    name: 'Osmosis',
    symbol: 'OSMO'
  }))(assetId) as Asset
  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Box pt='38px' pb='70px' px='34px'>
        <ModalCloseButton borderRadius='full' />
        <Flex
          direction='column'
          maxWidth='595px'
          alignItems='center'
          justifyContent='space-between'
        >
          <OverviewHeader assetName={asset.name} mb='35px' />
          <StakedRow
            mb='10px'
            assetSymbol={asset.symbol}
            fiatRate={bnOrZero('8.47')}
            cryptoStakedAmount={bnOrZero('708.00')}
            apr={bnOrZero('0.12')}
          />
          <StakingButtons assetId={assetId} />
          <Box width='100%' mt='20px'>
            {
              /* TODO: use real unbonds data */
              new Array(2).fill(undefined).map((_, i) => (
                <UnbondingRow
                  key={i}
                  assetSymbol={asset.symbol}
                  fiatRate={bnOrZero('8.47')}
                  cryptoUnbondedAmount={bnOrZero('420.65')}
                  unbondingEnd={1646762306}
                />
              ))
            }
          </Box>
          <RewardsRow
            mb='20px'
            mt='25px'
            assetSymbol={asset.symbol}
            fiatRate={bnOrZero('8.47')}
            cryptoRewardsAmount={bnOrZero('23.24')}
          />
          <ClaimButton assetId={assetId} />
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
