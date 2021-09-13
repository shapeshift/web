import { Flex, Stack } from '@chakra-ui/react'
import { Page } from 'components/Layout/Page'
import { AssetMarketData } from 'hooks/useAsset/useAsset'

import { AssetHeader } from './AssetHeader'
import { AssetHistory } from './AssetHistory'
type AssetDetailProps = {
  asset: AssetMarketData
}

export const AssetDetails = ({ asset }: AssetDetailProps) => (
  <Page style={{ width: '100%' }}>
    <Flex flexGrow={1} zIndex={2} flexDir={{ base: 'column', lg: 'row' }}>
      <Stack
        spacing='1.5rem'
        maxWidth={{ base: 'auto', lg: '50rem' }}
        flexBasis='50rem'
        p={{ base: 0, lg: 4 }}
        mx={{ base: 0, lg: 'auto' }}
      >
        <AssetHeader asset={asset} />
        <AssetHistory asset={asset} />
      </Stack>
    </Flex>
  </Page>
)
