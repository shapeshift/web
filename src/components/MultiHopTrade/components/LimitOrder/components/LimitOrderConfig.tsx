import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Stack,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { positiveOrZero } from '@shapeshiftoss/utils'
import { noop } from 'lodash'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'

// TODO: lol
const timePeriods = [
  '1 second',
  '2 seconds',
  '3 seconds',
  '4 seconds',
  '5 seconds',
  '6 seconds',
  '7 seconds',
  '8 seconds',
  '9 seconds',
  '10 seconds',
  '11 seconds',
  '12 seconds',
  '13 seconds',
  '14 seconds',
  '15 seconds',
  '16 seconds',
  '17 seconds',
  '18 seconds',
  '19 seconds',
  '20 seconds',
  '21 seconds',
  '22 seconds',
  '23 seconds',
]

const timePeriodRightIcon = <ChevronDownIcon />

type LimitOrderConfigProps = {
  buyAsset: Asset
  hasUserEnteredAmount: boolean
  isInputtingFiatSellAmount: boolean
  buyAmountAfterFeesCryptoPrecision: string | undefined
  buyAmountAfterFeesUserCurrency: string | undefined
}

export const LimitOrderConfig = ({
  buyAsset,
  hasUserEnteredAmount,
  isInputtingFiatSellAmount,
  buyAmountAfterFeesCryptoPrecision,
  buyAmountAfterFeesUserCurrency,
}: LimitOrderConfigProps) => {
  const cryptoAmount = hasUserEnteredAmount
    ? positiveOrZero(buyAmountAfterFeesCryptoPrecision).toFixed()
    : '0'

  const fiatAmount = hasUserEnteredAmount
    ? positiveOrZero(buyAmountAfterFeesUserCurrency).toFixed()
    : '0'

  const renderedChains = useMemo(() => {
    return timePeriods.map(timePeriod => {
      return (
        <MenuItemOption value={timePeriod} key={timePeriod}>
          <RawText>{timePeriod}</RawText>
        </MenuItemOption>
      )
    })
  }, [])

  const renderedBuyAmount = useMemo(() => {
    return isInputtingFiatSellAmount ? (
      <Amount.Crypto value={cryptoAmount} symbol={buyAsset.symbol} size='lg' fontSize='xl' />
    ) : (
      <Amount.Fiat value={fiatAmount} size='lg' fontSize='xl' />
    )
  }, [buyAsset.symbol, cryptoAmount, fiatAmount, isInputtingFiatSellAmount])

  const renderedAlternateBuyAmount = useMemo(() => {
    return !isInputtingFiatSellAmount ? (
      <Amount.Crypto
        value={cryptoAmount}
        symbol={buyAsset.symbol}
        prefix='≈'
        fontSize='sm'
        fontWeight='medium'
        textColor='text.subtle'
      />
    ) : (
      <Amount.Fiat
        value={fiatAmount}
        prefix='≈'
        fontSize='sm'
        fontWeight='medium'
        textColor='text.subtle'
      />
    )
  }, [buyAsset.symbol, cryptoAmount, fiatAmount, isInputtingFiatSellAmount])

  return (
    <Stack spacing={2} px={6}>
      <Flex justifyContent='space-between' alignItems='center'>
        <Text translation='limitOrder.whenPriceReaches' />
        <Flex justifyContent='space-between' alignItems='center'>
          <Text translation='limitOrder.expiry' mr={4} />
          <Menu isLazy>
            <MenuButton as={Button} rightIcon={timePeriodRightIcon}>
              <RawText>1 hour</RawText>
            </MenuButton>
            <MenuList zIndex='modal'>
              <MenuOptionGroup type='radio' value={'1 hour'} onChange={noop}>
                {renderedChains}
              </MenuOptionGroup>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
      {renderedBuyAmount}
      {renderedAlternateBuyAmount}
      <Flex justifyContent='space-between' my={4}>
        <Button variant='ghost' size='sm' isActive>
          Market
        </Button>
        <Button variant='ghost' size='sm'>
          1% ↑
        </Button>
        <Button variant='ghost' size='sm'>
          2% ↑
        </Button>
        <Button variant='ghost' size='sm'>
          5% ↑
        </Button>
        <Button variant='ghost' size='sm'>
          10% ↑
        </Button>
      </Flex>
    </Stack>
  )
}
