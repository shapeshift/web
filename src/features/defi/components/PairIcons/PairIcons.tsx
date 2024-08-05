import type { AvatarProps, FlexProps } from '@chakra-ui/react'
import { Avatar, Center, Flex } from '@chakra-ui/react'
import { useMemo } from 'react'

const assetIconSx = { '--avatar-font-size': '85%', fontWeight: 'bold' }

export const PairIcons = ({
  icons,
  iconSize,
  iconBoxSize,
  showFirst,
  ...styleProps
}: {
  icons: string[]
  iconBoxSize?: AvatarProps['boxSize']
  iconSize?: AvatarProps['size']
  showFirst?: boolean
} & FlexProps): JSX.Element => {
  const firstIcon = icons[0]
  const remainingIcons = useMemo(() => {
    const iconsMinusFirst = icons.slice(showFirst ? 1 : 0)
    if (iconsMinusFirst.length > 1) {
      return (
        <Center
          position='relative'
          overflow='hidden'
          borderRadius='full'
          height='var(--avatar-size)'
          ml={showFirst ? '-2.5' : 0}
        >
          {iconsMinusFirst.map((iconSrc, index) => (
            <Avatar
              key={iconSrc}
              src={iconSrc}
              position='absolute'
              left={index * -3}
              top={index * -3}
              filter='blur(10px)'
              size={iconSize}
              boxSize={iconBoxSize}
            />
          ))}
          <Avatar
            bg='whiteAlpha.100'
            borderRadius='none'
            color='text.base'
            textShadow='sm'
            name={`${showFirst ? '+ ' : ''}${iconsMinusFirst.length}`}
            size={iconSize}
            sx={assetIconSx}
            boxSize={iconBoxSize}
          />
        </Center>
      )
    }
    return iconsMinusFirst.map(iconSrc => (
      <Avatar
        ml={showFirst ? '-2.5' : 0}
        key={iconSrc}
        src={iconSrc}
        size={iconSize}
        boxSize={iconBoxSize}
      />
    ))
  }, [iconBoxSize, iconSize, icons, showFirst])
  return (
    <Flex flexDirection='row' alignItems='center' {...styleProps}>
      {showFirst && <Avatar src={firstIcon} size={iconSize} boxSize={iconBoxSize} />}

      {remainingIcons}
    </Flex>
  )
}
