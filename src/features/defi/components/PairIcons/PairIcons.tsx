import { Flex, useColorModeValue } from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'

export const PairIcons = ({ icons, isSmall }: { icons: Array<string>; isSmall?: boolean }) => {
  const boxHeight = isSmall ? '38px' : '46px'
  const assetBoxSize = isSmall ? '5' : '6'
  const bg = useColorModeValue('gray.200', 'gray.700')
  return (
    <Flex flexDirection='row' alignItems='center' bg={bg} p={1} borderRadius={8} h={boxHeight}>
      {icons.map((iconSrc, i) => (
        <AssetIcon key={iconSrc} src={iconSrc} boxSize={assetBoxSize} ml={i === 0 ? '0' : '-2.5'} />
      ))}
    </Flex>
  )
}
