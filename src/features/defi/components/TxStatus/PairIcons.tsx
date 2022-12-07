import { Flex } from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'

export const PairIcons = ({ icons }: { icons: string[] }) => {
  return (
    <Flex flexDirection='row' alignItems='center' p={1} borderRadius={8}>
      {icons.map((iconSrc, i) => (
        <AssetIcon key={iconSrc} src={iconSrc} boxSize='8' ml={i === 0 ? '0' : '-1.5'} />
      ))}
    </Flex>
  )
}
