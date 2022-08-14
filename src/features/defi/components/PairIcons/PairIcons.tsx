import { Flex, useColorModeValue } from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'

export const PairIcons = ({
  icons,
  isSmall,
  unstyled,
  defaultSize,
}: {
  icons: Array<string>
  isSmall?: boolean
  unstyled?: boolean
  defaultSize?: boolean
}) => {
  const boxHeight = isSmall ? '38px' : '46px'
  const assetBoxSize = isSmall ? '5' : '6'
  const bg = useColorModeValue('gray.200', 'gray.700')
  const wrapperProps = unstyled ? {} : { bg, p: 1, borderRadius: 8, h: boxHeight }
  const iconProps = defaultSize ? {} : { boxSize: assetBoxSize }
  return (
    <Flex flexDirection='row' alignItems='center' {...wrapperProps}>
      {icons.map((iconSrc, i) => (
        <AssetIcon key={iconSrc} src={iconSrc} {...iconProps} ml={i === 0 ? '0' : '-2.5'} />
      ))}
    </Flex>
  )
}
