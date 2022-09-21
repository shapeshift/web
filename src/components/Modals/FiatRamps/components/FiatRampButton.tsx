import { ChevronRightIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'

import type { SupportedFiatRampConfig } from '../config'

type FiatRampButtonProps = {
  onClick: () => void
} & SupportedFiatRampConfig

export const FiatRampButton: React.FC<FiatRampButtonProps> = ({
  onClick,
  logo,
  label,
  info,
  tags,
}) => {
  const tagColor = useColorModeValue('gray.600', 'gray.400')
  return (
    <Button
      key={label}
      width='full'
      height='auto'
      justifyContent='space-between'
      variant='outline'
      fontWeight='normal'
      data-test={`fiat-ramp-${label}-button`}
      py={2}
      onClick={onClick}
      rightIcon={<ChevronRightIcon boxSize={4} />}
    >
      <Flex
        flex={1}
        flexDirection={['column', 'row']}
        justifyContent='space-between'
        alignItems={['baseline', 'center']}
        gap={['1em', 0]}
        width='100%'
      >
        <Flex flexDirection='row' justifyContent='center' alignItems='center'>
          <AssetIcon src={logo} boxSize='8' />
          <Box textAlign='left' ml={2}>
            <Text fontWeight='bold' translation={label} />
            <Text translation={info ?? ''} />
          </Box>
        </Flex>
        <Flex display={['none', 'flex']} gap={2}>
          {tags?.map(tag => (
            <Tag key={tag} colorScheme='gray' size='xs' py={1} px={2}>
              <Text
                color={tagColor}
                fontSize='12px'
                translation={tag}
                style={{ textTransform: 'uppercase' }}
              />
            </Tag>
          ))}
        </Flex>
      </Flex>
    </Button>
  )
}
