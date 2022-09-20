import { Flex } from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'

export const PairIcons = ({ icons }: { icons: string[] }) => {
  return (
    <Flex flexDirection='row' alignItems='center'>
      {icons.map((iconSrc, i) => (
        <AssetIcon key={iconSrc} src={iconSrc} boxSize='14' ml={i === 0 ? '0' : '-2.5'} />
      ))}
    </Flex>
  )
}
