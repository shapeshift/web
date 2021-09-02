import { Button, Input, ModalBody, ModalHeader, SimpleGrid } from '@chakra-ui/react'
import { CircleIcon } from 'components/Icons/Circle'
import { Text } from 'components/Text'
import React, { useRef } from 'react'

export const PinModal = () => {
  const pinFieldRef = useRef<HTMLInputElement | null>(null)

  const handlePinPress = (value: number) => {
    if (pinFieldRef?.current) {
      pinFieldRef.current.value += value.toString()
    }
  }

  const pinNumbers = [7, 8, 9, 4, 5, 6, 1, 2, 3]

  return (
    <>
      <ModalHeader>
        <Text translation={'wProvider.keepKey.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'wProvider.keepKey.body'} />
        <SimpleGrid columns={3} spacing={6} my={6} maxWidth='250px' ml='auto' mr='auto'>
          {pinNumbers.map(number => (
            <Button size='lg' p={8} onClick={() => handlePinPress(number)}>
              <CircleIcon boxSize={4} />
            </Button>
          ))}
        </SimpleGrid>
        <Input type='password' ref={pinFieldRef} size='lg' variant='filled' mb={6} />
        <Button isFullWidth size='lg' colorScheme='blue'>
          <Text translation={'wProvider.keepKey.button'} />
        </Button>
      </ModalBody>
    </>
  )
}
