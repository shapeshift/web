import { CheckCircleIcon } from '@chakra-ui/icons'
import type { GridProps } from '@chakra-ui/react'
import { Button, Flex, SimpleGrid, Stack, Tag, TagLeftIcon } from '@chakra-ui/react'
import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useRouteMatch } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Main } from 'components/Layout/Main'
import { AssetCell } from 'components/StakingVaults/Cells'
import { RawText, Text } from 'components/Text'

import { LendingHeader } from './components/LendingHeader'

export const lendingRowGrid: GridProps['gridTemplateColumns'] = {
  base: 'minmax(150px, 1fr) repeat(1, minmax(40px, max-content))',
  md: '200px repeat(5, 1fr)',
}

export const AvailablePools = () => {
  const translate = useTranslate()
  const history = useHistory()
  const { path } = useRouteMatch()
  const handlePoolClick = useCallback(
    (id: string) => {
      history.push(`${path}/pool/${id}`)
    },
    [history, path],
  )
  const headerComponent = useMemo(() => <LendingHeader />, [])
  return (
    <Main headerComponent={headerComponent}>
      <Stack>
        <SimpleGrid
          gridTemplateColumns={lendingRowGrid}
          columnGap={4}
          color='text.subtle'
          fontWeight='bold'
          fontSize='sm'
        >
          <Text translation='lending.pool' />
          <HelperTooltip label={translate('lending.poolDepth')}>
            <Text translation='lending.poolDepth' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.totalDebtBalance')}>
            <Text translation='lending.totalDebtBalance' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.totalCollateral')}>
            <Text translation='lending.totalCollateral' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.estCollateralizationRatio')}>
            <Text translation='lending.estCollateralizationRatio' />
          </HelperTooltip>
          <HelperTooltip label={translate('lending.totalBorrowers')}>
            <Text translation='lending.totalBorrowers' />
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
            // eslint-disable-next-line react-memo/require-usememo
            onClick={() => handlePoolClick(btcAssetId)}
          >
            <AssetCell assetId={btcAssetId} />
            <Flex>
              <Tag colorScheme='green'>
                <TagLeftIcon as={CheckCircleIcon} />
                Healthy
              </Tag>
            </Flex>
            <Amount.Fiat value='680516.92' />
            <Amount.Crypto value='64.59' symbol='BTC' />
            <Amount.Percent value='2.9' />
            <RawText>123</RawText>
          </Button>
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
            // eslint-disable-next-line react-memo/require-usememo
            onClick={() => handlePoolClick(ethAssetId)}
          >
            <AssetCell assetId={ethAssetId} />
            <Flex>
              <Tag colorScheme='green'>
                <TagLeftIcon as={CheckCircleIcon} />
                Healthy
              </Tag>
            </Flex>
            <Amount.Fiat value='335217.33' />
            <Amount.Crypto value='496.29' symbol='ETH' />
            <Amount.Percent value='2.9' />
            <RawText>123</RawText>
          </Button>
        </Stack>
      </Stack>
    </Main>
  )
}
