import { Box } from '@chakra-ui/layout'
import { SkeletonText, Tab, useColorModeValue } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'

type FoxTabProps = {
  assetIcon: string
  assetSymbol: string
  fiatAmount: string
  cryptoAmount: string
  isSelected?: boolean
}

export const FoxTab = ({
  assetIcon,
  assetSymbol,
  fiatAmount,
  cryptoAmount,
  isSelected,
}: FoxTabProps) => {
  const bgHover = useColorModeValue('gray.100', 'gray.750')

  return (
    <Tab
      _selected={{ bg: bgHover, borderColor: 'primary', borderWidth: '2px' }}
      borderRadius='xl'
      borderColor={bgHover}
      borderWidth={'1px'}
      bg={'none'}
      _hover={{ textDecoration: 'none', bg: bgHover }}
      textAlign='left'
      p={0}
      isSelected={isSelected}
    >
      <Card display='block' bg='none' border='none' boxShadow='none' p={0} width='full'>
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
    </Tab>
  )
}
