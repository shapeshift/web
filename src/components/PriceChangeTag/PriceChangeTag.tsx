import { Tag, TagLeftIcon } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useMemo } from 'react'
import { RiArrowLeftDownLine, RiArrowRightUpLine } from 'react-icons/ri'

import { Amount } from '@/components/Amount/Amount'

type PriceChangeTagProps = {
  changePercent24Hr?: number
}

export const PriceChangeTag = ({ changePercent24Hr }: PriceChangeTagProps) => {
  const changePercentTagColorsScheme = useMemo(() => {
    if (bnOrZero(changePercent24Hr).gt(0)) {
      return 'green'
    }

    if (bnOrZero(changePercent24Hr).lt(0)) {
      return 'red'
    }

    return 'gray'
  }, [changePercent24Hr])

  if (changePercent24Hr === undefined) return null

  return (
    <Tag colorScheme={changePercentTagColorsScheme} width='max-content' px={1} size='sm'>
      {changePercentTagColorsScheme !== 'gray' ? (
        <TagLeftIcon
          as={changePercentTagColorsScheme === 'green' ? RiArrowRightUpLine : RiArrowLeftDownLine}
          me={1}
        />
      ) : null}
      <Amount.Percent value={bnOrZero(changePercent24Hr).times('0.01').toString()} fontSize='xs' />
    </Tag>
  )
}
