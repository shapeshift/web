import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex, SimpleGrid, Skeleton, Stack, Tag } from '@chakra-ui/react'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { opportunityRowGrid } from 'components/EarnDashboard/components/ProviderDetails/OpportunityTableHeader'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

type EquityRowBaseProps = {
  label: string
  fiatAmount?: string
  cryptoBalancePrecision?: string
  symbol: string
  color?: string
  allocation?: string
  subText?: string
  icon?: string | JSX.Element
  apy?: string
  isLoading?: boolean
} & ButtonProps

type EquityRowProps = EquityRowBaseProps

export const EquityRowLoading = () => {
  return (
    <SimpleGrid py={4} px={4} gridTemplateColumns={opportunityRowGrid} alignItems='center'>
      <Flex flex={1} alignItems='flex-start' justifyContent='space-between' gap={4}>
        <LazyLoadAvatar />
        <Flex flexDir='column' flex={1} gap={1} textAlign='left'>
          <Skeleton>
            <RawText fontSize={{ base: 'xs', md: 'sm' }} lineHeight='shorter'>
              Assets
            </RawText>
          </Skeleton>
          <Flex alignItems='center' gap={1} flex={1}>
            <Flex flex={1} height='0.875rem' alignItems='center' gap={2}>
              <Skeleton height='4px' width='40%' />
            </Flex>
          </Flex>
        </Flex>
      </Flex>
      <Flex justifyContent='center' display={{ base: 'none', md: 'flex' }}></Flex>
      <Flex flex={1} flexDir='column' alignItems='flex-end' fontWeight='medium' gap={1}>
        <Skeleton>
          <Amount.Fiat
            fontSize={{ base: 'sm', md: 'md' }}
            color='chakra-body-text'
            value={'0.00'}
          />
        </Skeleton>
        <Skeleton>
          <Amount.Crypto
            value={'0.00'}
            symbol={'FOX'}
            fontSize={{ base: 'xs', md: 'sm' }}
            lineHeight={1}
          />
        </Skeleton>
      </Flex>
    </SimpleGrid>
  )
}

export const EquityRow: React.FC<EquityRowProps> = ({
  label,
  icon,
  fiatAmount,
  cryptoBalancePrecision,
  allocation,
  color,
  symbol,
  subText,
  apy,
  isLoading,
  ...rest
}) => {
  const labelJoined = useMemo(() => {
    const labelElement = <RawText>{label}</RawText>
    const subTextElement = <RawText>{subText}</RawText>
    const subTextParts = [labelElement, ...(subText ? [subTextElement] : [])]
    return subTextParts.map((element, index) => (
      <Flex key={`subtext-${index}`} alignItems='center' gap={1}>
        {element}
      </Flex>
    ))
  }, [label, subText])

  if (isLoading) return <EquityRowLoading />
  return (
    <Button
      height='auto'
      py={4}
      variant='ghost'
      justifyContent='flex-start'
      alignItems='center'
      display='grid'
      gridTemplateColumns={opportunityRowGrid}
      gap={4}
      {...rest}
    >
      <Flex flex={1} alignItems='flex-start' justifyContent='space-between' gap={4}>
        {typeof icon === 'string' ? <LazyLoadAvatar src={icon} /> : icon}
        <Flex flexDir='column' flex={1} gap={1} textAlign='left'>
          <Stack
            direction='row'
            display={{ base: 'none', md: 'flex' }}
            gap={1}
            color='chakra-body-text'
            fontSize={{ base: 'xs', md: 'sm' }}
            lineHeight='shorter'
            divider={<RawText> • </RawText>}
          >
            {labelJoined}
          </Stack>
          <RawText
            color='chakra-body-text'
            fontSize={{ base: 'sm', md: 'md' }}
            display={{ base: 'inline-block', md: 'none' }}
          >
            {label}
          </RawText>
          <Flex alignItems='center' gap={1} flex={1}>
            <Flex flex={1} height='0.875rem' alignItems='center' gap={2}>
              <Box
                height='4px'
                minWidth='4px'
                width={`${bnOrZero(allocation).toString()}%`}
                bgColor={color}
                borderRadius='lg'
              />
              <Amount.Percent
                display={{ base: 'none', md: 'inline-block' }}
                value={bnOrZero(allocation).times(0.01).toString()}
                fontSize='xs'
              />
            </Flex>
          </Flex>
        </Flex>
      </Flex>
      <Flex justifyContent='center' display={{ base: 'none', md: 'flex' }}>
        {apy && (
          <Tag colorScheme='green' size='sm'>
            <Amount.Percent value={apy} suffix='APY' />
          </Tag>
        )}
      </Flex>
      <Flex flex={1} flexDir='column' alignItems='flex-end' fontWeight='medium' gap={1}>
        <Amount.Fiat
          fontSize={{ base: 'sm', md: 'md' }}
          color='chakra-body-text'
          value={bnOrZero(fiatAmount).toString()}
        />
        <Amount.Crypto
          value={bnOrZero(cryptoBalancePrecision).toString()}
          symbol={symbol}
          fontSize={{ base: 'xs', md: 'sm' }}
          lineHeight={1}
        />
      </Flex>
    </Button>
  )
}
