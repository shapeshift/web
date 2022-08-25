import { Avatar, AvatarProps, Button, ButtonProps, Flex, ListItem, Stack } from '@chakra-ui/react'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'

type ChildAssetRowProps = {
  icon: AvatarProps
  title: string
  subtitle: string
  fiatBalance: string
  cryptoBalance: string
  symbol: string
} & ButtonProps

export const ChildAssetRow: React.FC<ChildAssetRowProps> = ({
  icon,
  title,
  subtitle,
  fiatBalance,
  cryptoBalance,
  symbol,
  ...rest
}) => {
  return (
    <ListItem>
      <Button
        variant='ghost'
        py={4}
        width='full'
        height='auto'
        iconSpacing={4}
        leftIcon={<Avatar size='sm' {...icon} />}
        {...rest}
      >
        <Stack alignItems='flex-start' spacing={0} flex={1}>
          <RawText color='var(--chakra-colors-chakra-body-text)'>{title}</RawText>
          <RawText fontSize='sm' color='gray.500'>
            {subtitle}
          </RawText>
        </Stack>
        <Flex flex={1} justifyContent='flex-end'>
          <Amount.Crypto value={cryptoBalance} symbol={symbol} />
        </Flex>
        <Flex flex={1} justifyContent='flex-end'>
          <Amount.Fiat value={fiatBalance} />
        </Flex>
      </Button>
    </ListItem>
  )
}
