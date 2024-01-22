import type { ButtonProps } from '@chakra-ui/react'
import { Box, Button, Flex, SimpleGrid, Skeleton, Stack, Tag } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { opportunityRowGrid } from 'components/EarnDashboard/components/ProviderDetails/OpportunityTableHeader'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { accountIdToLabel, isUtxoAccountId } from 'state/slices/portfolioSlice/utils'

type EquityRowBaseProps = {
  label: string
  fiatAmount?: string
  cryptoBalancePrecision?: string
  symbol: string
  color?: string
  totalFiatBalance?: string
  subText?: string
  icon?: string | JSX.Element
  apy?: string
  isLoading?: boolean
  accountId?: AccountId
} & ButtonProps

type EquityRowProps = EquityRowBaseProps

const fontSizeMdSm = { base: 'xs', md: 'sm' }
const fontSizeMdMd = { base: 'sm', md: 'md' }
const displayMdFlex = { base: 'none', md: 'flex' }
const displayMdNone = { base: 'inline-block', md: 'none' }
const displayMdInlineBlock = { base: 'none', md: 'inline-block' }
const tagMlMd4 = { base: 2, md: 4 }

const divider = <RawText> • </RawText>

export const EquityRowLoading = () => {
  return (
    <SimpleGrid py={4} px={4} gridTemplateColumns={opportunityRowGrid} alignItems='center'>
      <Flex flex={1} alignItems='flex-start' justifyContent='space-between' gap={4}>
        <LazyLoadAvatar />
        <Flex flexDir='column' flex={1} gap={1} textAlign='left'>
          <Skeleton>
            <RawText fontSize={fontSizeMdSm} lineHeight='shorter'>
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
      <Flex justifyContent='center' display={displayMdFlex}></Flex>
      <Flex flex={1} flexDir='column' alignItems='flex-end' fontWeight='medium' gap={1}>
        <Skeleton>
          <Amount.Fiat fontSize={fontSizeMdMd} color='chakra-body-text' value={'0.00'} />
        </Skeleton>
        <Skeleton>
          <Amount.Crypto value={'0.00'} symbol={'FOX'} fontSize={fontSizeMdSm} lineHeight={1} />
        </Skeleton>
      </Flex>
    </SimpleGrid>
  )
}

export const EquityRow: React.FC<EquityRowProps> = ({
  label,
  icon,
  fiatAmount,
  totalFiatBalance,
  cryptoBalancePrecision,
  color,
  symbol,
  subText,
  apy,
  isLoading,
  accountId,
  ...rest
}) => {
  const allocation = bnOrZero(fiatAmount).div(bnOrZero(totalFiatBalance)).times(100).toString()

  const isUtxoAccount = useMemo(() => accountId && isUtxoAccountId(accountId), [accountId])
  const subtitle = useMemo(
    () => (accountId && isUtxoAccount ? accountIdToLabel(accountId) : null),
    [isUtxoAccount, accountId],
  )

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
          <Flex flex={1} alignItems='center' gap={2}>
            <Stack
              direction='row'
              display={displayMdFlex}
              gap={1}
              color='chakra-body-text'
              fontSize={fontSizeMdSm}
              lineHeight='shorter'
            >
              <RawText>{label}</RawText>
              {subText && divider}
              {subText && <RawText>{subText}</RawText>}
              <Tag
                whiteSpace='nowrap'
                colorScheme='blue'
                fontSize='x-small'
                fontWeight='bold'
                minHeight='auto'
                py={1}
                alignSelf='center'
                ml={tagMlMd4}
              >
                {subtitle}
              </Tag>
            </Stack>
            <RawText color='chakra-body-text' fontSize={fontSizeMdMd} display={displayMdNone}>
              {label}
            </RawText>
          </Flex>
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
                display={displayMdInlineBlock}
                value={bnOrZero(allocation).times(0.01).toString()}
                fontSize='xs'
              />
            </Flex>
          </Flex>
        </Flex>
      </Flex>
      <Flex justifyContent='center' display={displayMdFlex}>
        {apy && (
          <Tag colorScheme='green' size='sm'>
            <Amount.Percent value={apy} suffix='APY' />
          </Tag>
        )}
      </Flex>
      <Flex flex={1} flexDir='column' alignItems='flex-end' fontWeight='medium' gap={1}>
        <Amount.Fiat
          fontSize={fontSizeMdMd}
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
