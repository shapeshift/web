import type { AvatarProps, FlexProps } from '@chakra-ui/react'
import { Avatar, Box, Center, Flex } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useMemo } from 'react'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { imageLongPressSx } from '@/constants/longPress'

const assetIconSx = { '--avatar-font-size': '85%', fontWeight: 'bold', ...imageLongPressSx }

// Clip paths for combined mode - diagonal split from bottom left to top right
const leftHalfClipPath = 'polygon(0% 0%, 100% 0%, 0% 100%)'
const rightHalfClipPath = 'polygon(100% 0%, 100% 100%, 0% 100%)'

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
  displayMode = 'combined',
  ...styleProps
}: {
  icons: string[] | undefined
  iconBoxSize?: AvatarProps['boxSize']
  iconSize?: AvatarProps['size']
  showFirst?: boolean
  displayMode?: 'side-by-side' | 'combined'
} & FlexProps): JSX.Element | null => {
  const firstIcon = useMemo(() => {
    if (!icons?.length) return

    return icons[0]
  }, [icons])

  const remainingIcons = useMemo(() => {
    if (!icons?.length) return

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
              <LazyLoadAvatar
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
      <LazyLoadAvatar
        ml={showFirst ? '-2.5' : 0}
        key={iconSrc}
        src={iconSrc}
        size={iconSize}
        boxSize={iconBoxSize}
      />
    ))
  }, [iconBoxSize, iconSize, icons, showFirst])

  if (!icons?.length) return null

  // Combined mode for exactly 2 icons
  if (displayMode === 'combined' && icons.length === 2) {
    return (
      <Flex display='inline-flex' flexDirection='row' alignItems='center' {...styleProps}>
        <Box position='relative'>
          <LazyLoadAvatar
            src={icons[0]}
            size={iconSize}
            boxSize={iconBoxSize}
            clipPath={leftHalfClipPath}
          />
          <LazyLoadAvatar
            src={icons[1]}
            size={iconSize}
            boxSize={iconBoxSize}
            clipPath={rightHalfClipPath}
            position='absolute'
            left={0}
            top={0}
          />
        </Box>
      </Flex>
    )
  }

  // Default side-by-side mode
  return (
    <Flex display='inline-flex' flexDirection='row' alignItems='center' {...styleProps}>
      {showFirst && <LazyLoadAvatar src={firstIcon} size={iconSize} boxSize={iconBoxSize} />}

      {remainingIcons}
    </Flex>
  )
}
