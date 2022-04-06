import { Box, Flex } from '@chakra-ui/layout'
import { Text as CText } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card, CardProps } from 'components/Card/Card'

type AssetHoldingsCardProps = {
  assetSymbol: string
  assetIcon: string
  cryptoAmountAvailable: string
  fiatAmountAvailable: string
} & CardProps

export const AssetHoldingsCard = ({
  assetSymbol,
  assetIcon,
  cryptoAmountAvailable,
  fiatAmountAvailable,
  ...styleProps
}: AssetHoldingsCardProps) => {
  const translate = useTranslate()

  return (
    <Card size='sm' width='full' variant='group' {...styleProps}>
      <Card.Body>
        <Flex alignItems='center'>
          <AssetIcon src={assetIcon} boxSize='40px' />
          <Box ml={2}>
            <CText fontWeight='bold' lineHeight='1' mb={1}>
              {assetSymbol}
            </CText>
            <CText color='gray.500' lineHeight='1'>
              <Amount.Crypto
                color='gray.500'
                lineHeight='1'
                symbol={assetSymbol}
                value={cryptoAmountAvailable}
                suffix={translate('common.available')}
              />
            </CText>
          </Box>
        </Flex>
      </Card.Body>
    </Card>
  )
}
