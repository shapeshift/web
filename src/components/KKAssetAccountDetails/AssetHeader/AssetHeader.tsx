import { Box, Flex, Heading } from '@chakra-ui/react'
import { Button } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'

import { AssetIcon } from './AssetIcon'

type AssetHeaderProps = {
  asset: Asset
}

export const AssetHeader: React.FC<AssetHeaderProps> = ({ asset }) => {
  const chainId = asset.chainId
  const { name, symbol } = asset || {}

  if (!chainId) return null

  return (
    <Flex alignItems='center' flexDir={{ base: 'column', lg: 'row' }} flex={1} py={4}>
      <Flex alignItems='left' flexDir={{ base: 'row', lg: 'column' }}>
        <Flex alignItems='center' mr='auto'>
          <AssetIcon asset={asset} boxSize='40px' />
          <Box ml={3} textAlign='left'>
            <Heading fontSize='2xl' lineHeight='shorter'>
              {name} {`(${symbol})`}
            </Heading>
          </Box>
        </Flex>
        <Button>VOTE</Button>
      </Flex>
    </Flex>
  )
}
