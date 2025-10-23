import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Button,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
} from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'

import { Row } from '@/components/Row/Row'
import { Text } from '@/components/Text'
import { useModalChildZIndex } from '@/context/ModalStackProvider'
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

const menuButtonSx = {
  svg: {
    color: 'text.subtle',
    mb: '-3px',
  },
  '&:hover': {
    opacity: 0.7,
  },
}

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
  const modalChildZIndex = useModalChildZIndex()
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
      if (typeof newExpiry !== 'string') throw new Error('Invalid expiry option')

      setExpiry(newExpiry as ExpiryOption)
    },
    [setExpiry],
  )

  return (
    <Row alignItems='center' fontSize='sm' fontWeight='medium'>
      <Row.Label>
        <Text translation='limitOrder.expiry' />
      </Row.Label>
      <Row.Value>
        <Menu isLazy>
          <MenuButton
            as={Button}
            rightIcon={chevronDownIcon}
            size='sm'
            variant='unstyled'
            display='flex'
            alignItems='center'
            sx={menuButtonSx}
          >
            <Text translation={expiryOptionTranslation} />
          </MenuButton>
          <MenuList zIndex={modalChildZIndex}>
            <MenuOptionGroup type='radio' value={expiry} onChange={handleChangeExpiryOption}>
              {expiryOptions}
            </MenuOptionGroup>
          </MenuList>
        </Menu>
      </Row.Value>
    </Row>
  )
}
