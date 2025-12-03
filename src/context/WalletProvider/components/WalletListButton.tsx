import { Avatar, Button, HStack, Icon, Spinner } from '@chakra-ui/react'
import { TbChevronRight, TbCircleCheckFilled } from 'react-icons/tb'

import { RawText } from '@/components/Text'

const arrowForwardIcon = <TbChevronRight />

type WalletListButtonProps = {
  name: string
  icon?: React.ReactElement
  src?: string
  onSelect: () => void
  isSelected?: boolean
  isDisabled?: boolean
  isLoading?: boolean
}

export const WalletListButton = ({
  name,
  icon,
  src,
  onSelect,
  isSelected,
  isDisabled,
  isLoading,
}: WalletListButtonProps) => {
  return (
    <Button
      variant='ghost'
      height='auto'
      py={2}
      px={2}
      justifyContent='space-between'
      size='lg'
      width='full'
      rightIcon={arrowForwardIcon}
      onClick={onSelect}
      isDisabled={isDisabled || isLoading}
      opacity={isSelected ? 1 : 0.7}
    >
      <HStack spacing={4}>
        <Avatar
          size='lg'
          bg='background.button.secondary.base'
          borderRadius='lg'
          fontSize='2xl'
          icon={isLoading ? <Spinner thickness='2px' speed='0.65s' boxSize='24px' /> : icon}
          src={src}
        />
        <RawText color='text.base'>{name}</RawText>
        {isSelected && <Icon as={TbCircleCheckFilled} color='green.500' />}
      </HStack>
    </Button>
  )
}
