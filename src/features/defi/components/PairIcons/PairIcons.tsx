import type { AvatarProps, FlexProps } from '@chakra-ui/react'
import { Avatar, Center, Flex } from '@chakra-ui/react'
import { useMemo } from 'react'

const assetIconSx = { '--avatar-font-size': '85%', fontWeight: 'bold' }

const getRandomPosition = (length: number) => {
  const angle = Math.random() * 2 * Math.PI

  // Define the center and radius in percentages
  const centerX = 50 // 50% to center horizontally
  const centerY = 50 // 50% to center vertically

  // Randomize the distance from the center
  const maxRadius = 50 // Maximum distance from the center in percentage
  const distance = Math.random() * maxRadius

  // Calculate the position in percentages
  const left = centerX + distance * Math.cos(angle)
  const top = centerY + distance * Math.sin(angle)

  // Generate a random zIndex value
  const zIndex = Math.floor(Math.random() * length)
  return { left, top, zIndex }
}

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
          bg='background.surface.base'
          height='var(--avatar-size)'
          ml={showFirst ? '-2.5' : 0}
        >
          {iconsMinusFirst.map(iconSrc => {
            const { left, top, zIndex } = getRandomPosition(iconsMinusFirst.length)
            return (
              <Avatar
                key={iconSrc}
                src={iconSrc}
                position='absolute'
                left={`${left}%`}
                top={`${top}%`}
                size={iconSize}
                filter='blur(10px)'
                boxSize={iconBoxSize}
                transform='translate(-50%, -50%)'
                zIndex={zIndex}
              />
            )
          })}
          <Avatar
            bg='whiteAlpha.100'
            borderRadius='none'
            color='text.base'
            textShadow='sm'
            name={`${showFirst ? '+ ' : ''}${iconsMinusFirst.length}`}
            size={iconSize}
            sx={assetIconSx}
            boxSize={iconBoxSize}
            zIndex={iconsMinusFirst.length}
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
    <Flex display='inline-flex' flexDirection='row' alignItems='center' {...styleProps}>
      {showFirst && <Avatar src={firstIcon} size={iconSize} boxSize={iconBoxSize} />}

      {remainingIcons}
    </Flex>
  )
}
