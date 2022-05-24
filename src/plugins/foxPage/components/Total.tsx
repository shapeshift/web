import { Flex, Text } from '@chakra-ui/layout'
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
    <Flex
      p={4}
      flexDirection={{ base: 'row-reverse', md: 'column' }}
      alignItems={{ base: 'center', md: 'flex-start' }}
      justifyContent={{ base: 'space-between', md: 'flex-start' }}
    >
      <Flex mb={{ base: 0, md: 6 }} flexDirection='row'>
        {icons.map((icon, index) => (
          <AssetIcon
            key={icon}
            src={icon}
            boxSize='8'
            // zIndex should be decremental
            zIndex={icons.length - (index + 1)}
            ml={index > 0 ? '-3.5' : 0}
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
          lineHeight={'1.2'}
          fontSize={{ base: 'lg', md: '2xl' }}
        />
      </SkeletonText>
    </Flex>
  )
}
