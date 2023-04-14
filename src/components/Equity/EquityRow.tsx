import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex, Stack, Tag } from '@chakra-ui/react'
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
} & ButtonProps

type EquityRowProps = EquityRowBaseProps

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
