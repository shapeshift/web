import type { FlexProps, ThemingProps } from '@chakra-ui/react'
import { Avatar, Center, Flex } from '@chakra-ui/react'
import { useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'

const assetIconSx = { '--avatar-font-size': '85%', fontWeight: 'bold' }

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
  const firstIcon = icons[0]
  const remainingIcons = useMemo(() => {
    const iconsMinusFirst = icons.slice(1)
    if (iconsMinusFirst.length > 1) {
      return (
        <Center position='relative' overflow='hidden' borderRadius='full' ml='-2.5'>
          {iconsMinusFirst.map((iconSrc, index) => (
            <Avatar
              key={iconSrc}
              src={iconSrc}
              position='absolute'
              left={index * -3}
              top={index * -3}
              filter='blur(10px)'
            />
          ))}
          <Avatar
            bg='whiteAlpha.100'
            borderRadius='none'
            color='text.base'
            textShadow='sm'
            name={`+ ${iconsMinusFirst.length}`}
            boxSize={iconBoxSize}
            size={iconSize}
            sx={assetIconSx}
          />
        </Center>
      )
    }
    return iconsMinusFirst.map(iconSrc => (
      <AssetIcon ml='-2.5' key={iconSrc} src={iconSrc} boxSize={iconBoxSize} size={iconSize} />
    ))
  }, [iconBoxSize, iconSize, icons])
  return (
    <Flex flexDirection='row' alignItems='center' {...styleProps}>
      <AssetIcon src={firstIcon} boxSize={iconBoxSize} size={iconSize} />
      {remainingIcons}
    </Flex>
  )
}
