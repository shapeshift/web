import { Box, Flex } from '@chakra-ui/layout'
import { Text as CText } from '@chakra-ui/react'
import osmosis from 'assets/osmosis.svg'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'

type AssetHoldingsCardProps = {
  assetSymbol: string
  assetName: string
  cryptoAmountAvailable: string
  fiatAmountAvailable: string
}

export const AssetHoldingsCard = ({
  assetSymbol,
  assetName,
  cryptoAmountAvailable,
  fiatAmountAvailable
}: AssetHoldingsCardProps) => (
  <Card size='sm' py='8px' width='full' variant='group' my={6}>
    <Card.Body>
      <Flex alignItems='center'>
        <AssetIcon src={osmosis} boxSize='40px' />
        <Box ml={2}>
          <CText fontWeight='bold' lineHeight='1' mb={1}>
            {assetSymbol}
          </CText>
          <CText color='gray.500' lineHeight='1'>
            {assetName}
          </CText>
        </Box>
        <Box ml='auto' textAlign='right'>
          <Amount.Fiat fontWeight='medium' lineHeight='1' mb={1} value={fiatAmountAvailable} />
          <Amount.Crypto
            color='gray.500'
            lineHeight='1'
            symbol={assetSymbol}
            value={cryptoAmountAvailable}
          />
        </Box>
      </Flex>
    </Card.Body>
  </Card>
)
