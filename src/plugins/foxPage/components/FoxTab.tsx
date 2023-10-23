import type { ResponsiveValue, TabProps } from '@chakra-ui/react'
import { Card, CardBody, Flex, SkeletonText, Tab, useColorModeValue } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'

type FoxTabProps = {
  assetIcon: string
  assetSymbol: string
  fiatAmount: string
  cryptoAmount: string
  onClick?: () => void
} & TabProps

const tabFocus = { borderWidth: '0' }
const tabBorderWidth = { base: 0, md: '1px' }
const cardBodyPx = { base: 6, md: 4 }
const cardFlexDirection: ResponsiveValue<Property.FlexDirection> = { base: 'row', md: 'column' }
const flexMb = { base: 0, md: 6 }
const flexMr = { base: 2, md: 0 }

export const FoxTab: React.FC<FoxTabProps> = ({
  assetIcon,
  assetSymbol,
  fiatAmount,
  cryptoAmount,
  onClick,
  ...props
}) => {
  const bgHover = useColorModeValue('gray.100', 'gray.750')

  const tabSelected = useMemo(
    () => ({
      bg: { base: 'none', md: bgHover },
      borderColor: 'primary',
      borderWidth: { base: 0, md: '2px' },
    }),
    [bgHover],
  )

  const tabHover = useMemo(
    () => ({ textDecoration: 'none', bg: { base: 'none', md: bgHover } }),
    [bgHover],
  )

  return (
    <Tab
      _selected={tabSelected}
      _focus={tabFocus}
      borderRadius='xl'
      borderColor={bgHover}
      borderWidth={tabBorderWidth}
      bg={'none'}
      _hover={tabHover}
      textAlign='left'
      p={0}
      onClick={onClick}
      {...props}
    >
      <Card display='block' bg='none' border='none' boxShadow='none' p={0} width='full'>
        <CardBody p={4} px={cardBodyPx} display='flex' flexDirection={cardFlexDirection}>
          <Flex mb={flexMb} mr={flexMr} alignItems='center'>
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
