import type { FlexProps, ThemingProps } from '@chakra-ui/react'
import { Flex, useColorModeValue } from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'

export const PairIcons = ({
  icons,
  iconSize,
  iconBoxSize,
  ...styleProps
}: {
  icons: string[]
  iconBoxSize?: string
  iconSize?: ThemingProps<'Avatar'>['size']
} & FlexProps): JSX.Element => {
  const bg = useColorModeValue('gray.200', 'gray.700')
  return (
    <Flex flexDirection='row' alignItems='center' bg={bg} {...styleProps}>
      {icons.map((iconSrc, i) => (
        <AssetIcon
          key={iconSrc}
          src={iconSrc}
          boxSize={iconBoxSize}
          size={iconSize}
          ml={i === 0 ? '0' : '-2.5'}
        />
      ))}
    </Flex>
  )
}
