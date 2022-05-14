import { Box } from '@chakra-ui/layout'
import { Link, SkeletonText, useColorModeValue } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'

type FoxTabProps = {
  assetIcon: string
  assetSymbol: string
  fiatAmount: string
  cryptoAmount: string
  isActive?: Boolean
}

export const Tab = ({
  assetIcon,
  assetSymbol,
  fiatAmount,
  cryptoAmount,
  isActive,
}: FoxTabProps) => {
  const bgHover = useColorModeValue('gray.100', 'gray.750')
  const handleClick = () => {}

  return (
    <Card
      onClick={handleClick}
      as={Link}
      bg={isActive ? bgHover : 'none'}
      _hover={{ textDecoration: 'none', bg: bgHover }}
      display='block'
      borderRadius='xl'
      borderColor={isActive ? 'primary' : bgHover}
      borderWidth={isActive ? '2px' : '1px'}
    >
      <Card.Body p={4}>
        <Box mb={6}>
          <AssetIcon src={assetIcon} boxSize='8' zIndex={2} />
        </Box>
        <SkeletonText isLoaded={true} noOfLines={2}>
          <Amount.Crypto
            color='inherit'
            value={cryptoAmount}
            symbol={assetSymbol}
            lineHeight={1.2}
            fontSize={'2xl'}
            fontWeight='semibold'
          />
          <Amount.Fiat color='gray.500' value={fiatAmount} lineHeight={1.2} />
        </SkeletonText>
      </Card.Body>
    </Card>
  )
}
