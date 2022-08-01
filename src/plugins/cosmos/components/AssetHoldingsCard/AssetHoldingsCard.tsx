import { Box, Flex } from '@chakra-ui/layout'
import { Asset } from '@shapeshiftoss/asset-service'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card, CardProps } from 'components/Card/Card'
import { RawText } from 'components/Text'

type AssetHoldingsCardProps = {
  asset: Asset
  cryptoAmountAvailable: string
  fiatAmountAvailable: string
} & CardProps

export const AssetHoldingsCard = ({
  asset,
  cryptoAmountAvailable,
  fiatAmountAvailable,
  ...styleProps
}: AssetHoldingsCardProps) => {
  return (
    <Card size='sm' width='full' variant='group' {...styleProps}>
      <Card.Body>
        <Flex alignItems='center'>
          <AssetIcon src={asset.icon} boxSize='40px' />
          <Box ml={2}>
            <RawText fontWeight='bold' lineHeight='1' mb={1}>
              {asset.name}
            </RawText>
            <RawText color='gray.500' lineHeight='1'>
              {asset.symbol}
            </RawText>
          </Box>
          <Box ml='auto' textAlign='right'>
            <Amount.Fiat fontWeight='bold' lineHeight='1' mb={1} value={fiatAmountAvailable} />
            <Amount.Crypto
              color='gray.500'
              lineHeight='1'
              symbol={asset.symbol}
              value={cryptoAmountAvailable}
            />
          </Box>
        </Flex>
      </Card.Body>
    </Card>
  )
}
