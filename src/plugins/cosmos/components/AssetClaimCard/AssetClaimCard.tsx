import { Box, Flex } from '@chakra-ui/layout'
import { Text as CText } from '@chakra-ui/react'
import BigNumber from 'bignumber.js'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card, CardProps } from 'components/Card/Card'

type AssetClaimCardProps = {
  assetSymbol: string
  assetIcon: string
  cryptoRewardsAmount: BigNumber
  fiatRate: BigNumber
  renderButton?: () => JSX.Element
} & CardProps

export const AssetClaimCard = ({
  assetSymbol,
  assetIcon,
  cryptoRewardsAmount,
  fiatRate,
  renderButton,
  ...styleProps
}: AssetClaimCardProps) => (
  <Card size='sm' width='full' variant='group' {...styleProps}>
    <Card.Body p='10px'>
      <Flex justifyContent='space-between' alignItems='center'>
        <Flex alignItems='center'>
          <AssetIcon src={assetIcon} boxSize='40px' />
          <Box ml={2}>
            <CText fontWeight='bold' lineHeight='1' mb={1}>
              {assetSymbol}
            </CText>
            <CText
              color='gray.500'
              lineHeight='1'
              display='flex'
              alignItems='center'
              fontSize='14px'
            >
              <Amount.Crypto
                mr='4px'
                color='gray.500'
                lineHeight='1'
                symbol={assetSymbol}
                value={cryptoRewardsAmount.toPrecision()}
              />
              (
              <Amount.Fiat
                color='gray.500'
                lineHeight='1'
                value={cryptoRewardsAmount.times(fiatRate).toPrecision()}
              />
              )
            </CText>
          </Box>
        </Flex>
        {renderButton && renderButton()}
      </Flex>
    </Card.Body>
  </Card>
)
