import type { AvatarProps, FlexProps } from '@chakra-ui/react'
import { Avatar, Center, SkeletonCircle } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'

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
  shouldLazyLoad,
  ...styleProps
}: {
  icons: string[]
  iconBoxSize?: AvatarProps['boxSize']
  iconSize?: AvatarProps['size']
  showFirst?: boolean
  shouldLazyLoad?: boolean
} & FlexProps): JSX.Element => {
  const firstIcon = icons[0]
  const [imagesLoaded, setImagesLoaded] = useState(icons.map(() => !shouldLazyLoad))

  const areImagesLoaded = useMemo(
    () => !imagesLoaded.some(imageLoaded => imageLoaded === false) || !shouldLazyLoad,
    [imagesLoaded, shouldLazyLoad],
  )

  const handleImageLoaded = useCallback(
    (imageIndex: number) => {
      if (areImagesLoaded) return
      setImagesLoaded(prevImagesLoaded => {
        const newImagesLoaded = [...prevImagesLoaded]
        newImagesLoaded[imageIndex] = true
        return newImagesLoaded
      })
    },

    [areImagesLoaded],
  )

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
          {iconsMinusFirst.map((iconSrc, i) => {
            const { left, top, zIndex } = getRandomPosition(iconsMinusFirst.length)

            return (
              <Avatar
                key={iconSrc}
                src={iconSrc}
                position='absolute'
                loading={shouldLazyLoad ? 'lazy' : undefined}
                // we need to pass an arg here, so we need an anonymous function wrapper
                // eslint-disable-next-line react-memo/require-usememo
                onLoad={() => handleImageLoaded(i + 1)}
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
    return iconsMinusFirst.map((iconSrc, i) => (
      <Avatar
        loading={shouldLazyLoad ? 'lazy' : undefined}
        // we need to pass an arg here, so we need an anonymous function wrapper
        // eslint-disable-next-line react-memo/require-usememo
        onLoad={() => handleImageLoaded(i + 1)}
        ml={showFirst ? '-2.5' : 0}
        key={iconSrc}
        src={iconSrc}
        size={iconSize}
        boxSize={iconBoxSize}
      />
    ))
  }, [iconBoxSize, iconSize, icons, showFirst, shouldLazyLoad, handleImageLoaded])

  return (
    <SkeletonCircle
      isLoaded={areImagesLoaded}
      display='inline-flex'
      flexDirection='row'
      alignItems='center'
      width='auto'
      height='auto'
      {...styleProps}
    >
      {showFirst && (
        <Avatar
          loading={shouldLazyLoad ? 'lazy' : undefined}
          // we need to pass an arg here, so we need an anonymous function wrapper
          // eslint-disable-next-line react-memo/require-usememo
          onLoad={() => handleImageLoaded(0)}
          src={firstIcon}
          size={iconSize}
          boxSize={iconBoxSize}
        />
      )}

      {remainingIcons}
    </SkeletonCircle>
  )
}
