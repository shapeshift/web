import { Flex, useColorModeValue } from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText } from 'components/Text'

export const TradeAssetSelect = () => {
  const hoverBg = useColorModeValue('gray.100', 'gray.750')
  const handleChange = () => {
    return null
  }
  return (
    <Card bg='gray.850' flex={1}>
      <Card.Body
        display='flex'
        gap={1}
        flexDir='column'
        _hover={{ bg: hoverBg }}
        cursor='pointer'
        borderTopRadius='xl'
        py={2}
        px={4}
      >
        <RawText fontSize='xs'>From</RawText>
        <Flex gap={2} alignItems='center'>
          <AssetIcon assetId={ethAssetId} size='sm' />
          <Flex flexDir='column' fontWeight='medium'>
            <RawText lineHeight='shorter'>ETH</RawText>
            <RawText fontSize='xs' color='gray.500' lineHeight='shorter'>
              on Ethereum
            </RawText>
          </Flex>
        </Flex>
      </Card.Body>
      <Card.Footer p={0} borderTopWidth={1} borderColor='gray.750'>
        <AccountDropdown
          assetId={ethAssetId}
          onChange={handleChange}
          buttonProps={{ width: 'full' }}
          showLabel={false}
        />
      </Card.Footer>
    </Card>
  )
}
