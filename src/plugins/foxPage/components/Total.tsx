import { Box, Flex, Text } from '@chakra-ui/layout'
import { SkeletonText } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'

type TotalProps = {
  icons: string[]
  fiatAmount: string
}

export const Total = ({ icons, fiatAmount }: TotalProps) => {
  const translate = useTranslate()

  return (
    <Box p={4}>
      <Flex mb={6} flexDirection='row'>
        {icons.map((icon, index) => (
          <AssetIcon
            key={icon}
            src={icon}
            boxSize='8'
            // zIndex should be the decremental
            zIndex={icons.length - (index + 1)}
            ml={index > 0 ? -3.5 : 0}
          />
        ))}
      </Flex>
      <SkeletonText isLoaded={true} noOfLines={2}>
        <Text color='gray.500' fontWeight='bold'>
          {translate('plugins.foxPage.totalFoxValue')}
        </Text>
        <Amount.Fiat
          color='inherit'
          value={fiatAmount}
          fontWeight='semibold'
          lineHeight={1.2}
          fontSize={'2xl'}
        />
      </SkeletonText>
    </Box>
  )
}
