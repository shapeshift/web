import { Button, type GridProps, SimpleGrid, Stack } from '@chakra-ui/react'
import { btcAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Main } from 'components/Layout/Main'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'

import { LendingHeader } from './components/LendingHeader'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: 'repeat(4, 1fr)',
}

export const YourLoans = () => {
  const translate = useTranslate()
  const lendingHeader = useMemo(() => <LendingHeader />, [])
  return (
    <Main headerComponent={lendingHeader}>
      <Stack>
        <SimpleGrid
          gridTemplateColumns={lendingRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
        >
          <Text translation='lending.pool' />
          <HelperTooltip label={translate('lending.outstandingDebt')}>
            <Text translation='lending.outstandingDebt' textAlign='right' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.collateralValue')}>
            <Text translation='lending.collateralValue' textAlign='right' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.repaymentLock')}>
            <Text translation='lending.repaymentLock' textAlign='right' />
          </HelperTooltip>
        </SimpleGrid>
        <Stack mx={-4}>
          <Button
            variant='ghost'
            display='grid'
            gridTemplateColumns={lendingRowGrid}
            columnGap={4}
            alignItems='center'
            textAlign='left'
            py={4}
            width='full'
            height='auto'
            color='text.base'
          >
            <AssetCell assetId={btcAssetId} />
            <Stack spacing={0}>
              <Amount.Crypto value='14820' symbol='TOR' />
              <Amount.Fiat value='14820' fontSize='sm' color='text.subtle' />
            </Stack>
            <Stack spacing={0}>
              <Amount.Crypto value='1.0' symbol='BTC' />
              <Amount.Fiat value='29640' fontSize='sm' color='text.subtle' />
            </Stack>
            <RawText>30 days</RawText>
          </Button>
        </Stack>
      </Stack>
    </Main>
  )
}
