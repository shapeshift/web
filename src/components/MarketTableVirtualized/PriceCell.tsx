import { Stack, Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { memo } from 'react'
import { RiArrowRightDownFill, RiArrowRightUpFill } from 'react-icons/ri'

import { Amount } from '@/components/Amount/Amount'
import { Display } from '@/components/Display'
import { selectMarketDataUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const arrowUp = <RiArrowRightDownFill />
const arrowDown = <RiArrowRightUpFill />

type PriceCellProps = {
  assetId: string
}

export const PriceCell = memo<PriceCellProps>(({ assetId }) => {
  const marketDataUserCurrencyById = useAppSelector(selectMarketDataUserCurrency)
  const marketData = marketDataUserCurrencyById[assetId]
  const price = marketData?.price ?? '0'
  const changePercent24Hr = marketData?.changePercent24Hr ?? '0'

  const change = bnOrZero(changePercent24Hr).times(0.01)
  const colorScheme = change.isPositive() ? 'green' : 'red'
  const icon = change.isPositive() ? arrowUp : arrowDown

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
