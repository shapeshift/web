import { forwardRef, MenuItemOption, MenuItemOptionProps, Stack } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'

type AccountChildRowProps = {
  title: string
  cryptoBalance: string
  symbol: string
} & MenuItemOptionProps

export const AccountChildOption = forwardRef<AccountChildRowProps, 'button'>(
  ({ title, cryptoBalance, symbol, children, ...props }, ref) => {
    const Component = (
      <MenuItemOption ref={ref} {...props}>
        <Stack direction='row' justifyContent='space-between'>
          <RawText>{title}</RawText>
          <Amount.Crypto value={cryptoBalance} symbol={symbol} />
        </Stack>
        {children}
      </MenuItemOption>
    )
    return Component
  },
)
AccountChildOption.id = 'MenuItemOption'
