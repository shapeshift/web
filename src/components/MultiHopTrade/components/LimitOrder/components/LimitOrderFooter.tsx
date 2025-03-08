import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
} from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'

import { Text } from '@/components/Text'
import { useActions } from '@/hooks/useActions'
import { assertUnreachable } from '@/lib/utils'
import { ExpiryOption } from '@/state/slices/limitOrderInputSlice/constants'
import { limitOrderInput } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'
import { selectExpiry } from '@/state/slices/limitOrderInputSlice/selectors'
import { useAppSelector } from '@/state/store'

const EXPIRY_OPTIONS = [
  ExpiryOption.OneHour,
  ExpiryOption.OneDay,
  ExpiryOption.ThreeDays,
  ExpiryOption.SevenDays,
  ExpiryOption.TwentyEightDays,
] as const

const chevronDownIcon = <ChevronDownIcon />

const getExpiryOptionTranslation = (expiryOption: ExpiryOption) => {
  switch (expiryOption) {
    case ExpiryOption.OneHour:
      return `limitOrder.expiryOption.${expiryOption}`
    case ExpiryOption.OneDay:
      return `limitOrder.expiryOption.${expiryOption}`
    case ExpiryOption.ThreeDays:
      return `limitOrder.expiryOption.${expiryOption}`
    case ExpiryOption.SevenDays:
      return `limitOrder.expiryOption.${expiryOption}`
    case ExpiryOption.TwentyEightDays:
      return `limitOrder.expiryOption.${expiryOption}`
    default:
      assertUnreachable(expiryOption)
  }
}

export const LimitOrderFooter = () => {
  const expiry = useAppSelector(selectExpiry)
  const { setExpiry } = useActions(limitOrderInput.actions)

  const expiryOptions = useMemo(() => {
    return EXPIRY_OPTIONS.map(expiryOption => {
      return (
        <MenuItemOption value={expiryOption} key={expiryOption}>
          <Text translation={getExpiryOptionTranslation(expiryOption)} />
        </MenuItemOption>
      )
    })
  }, [])

  const expiryOptionTranslation = useMemo(() => {
    return getExpiryOptionTranslation(expiry)
  }, [expiry])

  const handleChangeExpiryOption = useCallback(
    (newExpiry: string | string[]) => {
      setExpiry(newExpiry as ExpiryOption)
    },
    [setExpiry],
  )

  return (
    <Flex justifyContent='space-between' alignItems='center' width='full' mb={4}>
      <Text translation='limitOrder.expiry' />
      <Menu isLazy>
        <MenuButton as={Button} rightIcon={chevronDownIcon} size='sm'>
          <Text translation={expiryOptionTranslation} />
        </MenuButton>
        <MenuList zIndex='modal'>
          <MenuOptionGroup type='radio' value={expiry} onChange={handleChangeExpiryOption}>
            {expiryOptions}
          </MenuOptionGroup>
        </MenuList>
      </Menu>
    </Flex>
  )
}
