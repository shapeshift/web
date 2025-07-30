import { Stack, Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { memo, useMemo } from 'react'
import { RiArrowRightDownFill, RiArrowRightUpFill } from 'react-icons/ri'

import { Amount } from '@/components/Amount/Amount'
import { Display } from '@/components/Display'
import { selectMarketDataUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const arrowUp = <RiArrowRightUpFill />
const arrowDown = <RiArrowRightDownFill />

type PriceCellProps = {
  assetId: string
}

export const PriceCell = memo<PriceCellProps>(({ assetId }) => {
  const marketDataUserCurrencyById = useAppSelector(selectMarketDataUserCurrency)
  const marketData = marketDataUserCurrencyById[assetId]

  const price = useMemo(() => {
    return marketData?.price ?? '0'
  }, [marketData])

  const changePercent24Hr = useMemo(() => {
    return marketData?.changePercent24Hr ?? '0'
  }, [marketData])

  const change = useMemo(() => {
    return bnOrZero(changePercent24Hr).times(0.01)
  }, [changePercent24Hr])

  const colorScheme = useMemo(() => {
    return change.isPositive() ? 'green' : 'red'
  }, [change])

  const icon = useMemo(() => {
    return change.isPositive() ? arrowUp : arrowDown
  }, [change])

  return (
    <Stack alignItems='flex-end'>
      <Amount.Fiat fontWeight='semibold' value={price} />
      <Display.Mobile>
        <Tag colorScheme={colorScheme} gap={1} size='sm'>
          {icon}
          <Amount.Percent value={change.abs().toString()} />
        </Tag>
      </Display.Mobile>
    </Stack>
  )
})
