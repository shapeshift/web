import type { TabProps } from '@chakra-ui/react'
import { Card, CardBody, Flex, SkeletonText, Tab, useColorModeValue } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'

type FoxTabProps = {
  assetIcon: string
  assetSymbol: string
  fiatAmount: string
  cryptoAmount: string
  onClick?: () => void
} & TabProps

export const FoxTab: React.FC<FoxTabProps> = ({
  assetIcon,
  assetSymbol,
  fiatAmount,
  cryptoAmount,
  onClick,
  ...props
}) => {
  const bgHover = useColorModeValue('gray.100', 'gray.750')

  return (
    <Tab
      _selected={{
        bg: { base: 'none', md: bgHover },
        borderColor: 'primary',
        borderWidth: { base: 0, md: '2px' },
      }}
      _focus={{ borderWidth: '0' }}
      borderRadius='xl'
      borderColor={bgHover}
      borderWidth={{ base: 0, md: '1px' }}
      bg={'none'}
      _hover={{ textDecoration: 'none', bg: { base: 'none', md: bgHover } }}
      textAlign='left'
      p={0}
      onClick={onClick}
      {...props}
    >
      <Card display='block' bg='none' border='none' boxShadow='none' p={0} width='full'>
        <CardBody
          p={4}
          px={{ base: 6, md: 4 }}
          display='flex'
          flexDirection={{ base: 'row', md: 'column' }}
        >
          <Flex mb={{ base: 0, md: 6 }} mr={{ base: 2, md: 0 }} alignItems='center'>
            <AssetIcon src={assetIcon} boxSize='8' zIndex={2} />
          </Flex>
          <SkeletonText isLoaded={true} noOfLines={2}>
            <Amount.Crypto
              color='inherit'
              value={cryptoAmount}
              symbol={assetSymbol}
              lineHeight={'1.2'}
              fontSize={{ base: 'lg', md: '2xl' }}
              fontWeight='semibold'
              maximumFractionDigits={2}
            />
            <Amount.Fiat
              color='text.subtle'
              value={fiatAmount}
              lineHeight={'1.2'}
              maximumFractionDigits={2}
            />
          </SkeletonText>
        </CardBody>
      </Card>
    </Tab>
  )
}
