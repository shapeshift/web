import { useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'

export const useYieldColors = () => {
  const cardBg = useColorModeValue('white', 'gray.800')
  const cardBgAlt = useColorModeValue('gray.50', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const borderColorAlt = useColorModeValue('gray.200', 'gray.700')
  const borderColorSubtle = useColorModeValue('gray.100', 'whiteAlpha.100')
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50')
  const hoverBgAlt = useColorModeValue('gray.50', 'gray.750')
  const activeBg = useColorModeValue('gray.100', 'gray.700')
  const subtleTextColor = useColorModeValue('gray.600', 'gray.400')
  const textColor = useColorModeValue('gray.900', 'white')
  const hoverBorderColor = useColorModeValue('blue.500', 'blue.400')
  const cardShadow = useColorModeValue('sm', 'none')
  const cardHoverShadow = useColorModeValue('lg', 'lg')
  const dividerColor = useColorModeValue('gray.200', 'whiteAlpha.100')

  const blueBadgeBg = useColorModeValue('blue.50', 'blue.900')
  const blueBadgeColor = useColorModeValue('blue.600', 'blue.200')
  const blueBadgeColorAlt = useColorModeValue('blue.700', 'blue.200')

  const enteringBg = useColorModeValue('yellow.50', 'yellow.900')
  const enteringBorderColor = useColorModeValue('yellow.300', 'yellow.700')
  const enteringTextColor = useColorModeValue('yellow.700', 'yellow.300')

  const exitingBg = useColorModeValue('orange.50', 'orange.900')
  const exitingBorderColor = useColorModeValue('orange.300', 'orange.700')
  const exitingTextColor = useColorModeValue('orange.700', 'orange.300')
  const exitingValueColor = useColorModeValue('orange.800', 'orange.200')

  const withdrawableBg = useColorModeValue('green.50', 'green.900')
  const withdrawableBorderColor = useColorModeValue('green.300', 'green.700')
  const withdrawableTextColor = useColorModeValue('green.700', 'green.300')

  const claimableBg = useColorModeValue('purple.50', 'purple.900')
  const claimableBorderColor = useColorModeValue('purple.300', 'purple.700')
  const claimableTextColor = useColorModeValue('purple.700', 'purple.300')
  const claimableValueColor = useColorModeValue('purple.800', 'purple.200')

  return useMemo(
    () => ({
      cardBg,
      cardBgAlt,
      borderColor,
      borderColorAlt,
      borderColorSubtle,
      hoverBg,
      hoverBgAlt,
      activeBg,
      subtleTextColor,
      textColor,
      hoverBorderColor,
      cardShadow,
      cardHoverShadow,
      dividerColor,
      blueBadgeBg,
      blueBadgeColor,
      blueBadgeColorAlt,
      enteringBg,
      enteringBorderColor,
      enteringTextColor,
      exitingBg,
      exitingBorderColor,
      exitingTextColor,
      exitingValueColor,
      withdrawableBg,
      withdrawableBorderColor,
      withdrawableTextColor,
      claimableBg,
      claimableBorderColor,
      claimableTextColor,
      claimableValueColor,
    }),
    [
      cardBg,
      cardBgAlt,
      borderColor,
      borderColorAlt,
      borderColorSubtle,
      hoverBg,
      hoverBgAlt,
      activeBg,
      subtleTextColor,
      textColor,
      hoverBorderColor,
      cardShadow,
      cardHoverShadow,
      dividerColor,
      blueBadgeBg,
      blueBadgeColor,
      blueBadgeColorAlt,
      enteringBg,
      enteringBorderColor,
      enteringTextColor,
      exitingBg,
      exitingBorderColor,
      exitingTextColor,
      exitingValueColor,
      withdrawableBg,
      withdrawableBorderColor,
      withdrawableTextColor,
      claimableBg,
      claimableBorderColor,
      claimableTextColor,
      claimableValueColor,
    ],
  )
}
