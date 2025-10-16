import type { AvatarProps, FlexProps } from '@chakra-ui/react'
import { Avatar, Box, Center, Flex, HStack } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useMemo } from 'react'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { TooltipWithTouch } from '@/components/TooltipWithTouch'
import { imageLongPressSx } from '@/constants/longPress'

const assetIconSx = { '--avatar-font-size': '85%', fontWeight: 'bold', ...imageLongPressSx }

// Clip paths for combined mode - vertical split
const leftHalfClipPath = 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)'
const rightHalfClipPath = 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)'

const getRandomPosition = (length: number) => {
  const angle = Math.random() * 2 * Math.PI
  const centerX = 50
  const centerY = 50
  const maxRadius = 50
  const distance = Math.random() * maxRadius
  const left = centerX + distance * Math.cos(angle)
  const top = centerY + distance * Math.sin(angle)
  const zIndex = Math.floor(Math.random() * length)
  return { left, top, zIndex }
}

export const PairIcons = ({
  icons,
  iconSize,
  iconBoxSize,
  ...styleProps
}: {
  icons: string[] | undefined
  iconBoxSize?: AvatarProps['boxSize']
  iconSize?: AvatarProps['size']
} & FlexProps): JSX.Element | null => {
  // Three or more icons - blurred with count and tooltip
  const tooltipContent = useMemo(
    () =>
      icons && icons.length > 2 ? (
        <HStack spacing={2} p={1}>
          {icons.map(iconSrc => (
            <LazyLoadAvatar key={iconSrc} src={iconSrc} size='xs' boxSize='24px' />
          ))}
        </HStack>
      ) : null,
    [icons],
  )

  if (!icons?.length) return null

  // Single icon
  if (icons.length === 1) {
    return (
      <Flex display='inline-flex' flexDirection='row' alignItems='center' {...styleProps}>
        <LazyLoadAvatar src={icons[0]} size={iconSize} boxSize={iconBoxSize} />
      </Flex>
    )
  }

  // Two icons - split view
  if (icons.length === 2) {
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

  return (
    <Flex display='inline-flex' flexDirection='row' alignItems='center' {...styleProps}>
      <TooltipWithTouch label={tooltipContent} placement='top'>
        <Center
          position='relative'
          overflow='hidden'
          borderRadius='full'
          bg='background.surface.base'
          height='var(--avatar-size)'
        >
          {icons.map(iconSrc => {
            const { left, top, zIndex } = getRandomPosition(icons.length)
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
            name={`${icons.length}`}
            size={iconSize}
            sx={assetIconSx}
            boxSize={iconBoxSize}
            zIndex={icons.length}
          />
        </Center>
      </TooltipWithTouch>
    </Flex>
  )
}
