import { Button, Input, ModalBody, ModalHeader, SimpleGrid } from '@chakra-ui/react'
import { CircleIcon } from 'components/Icons/Circle'
import { RawText } from 'components/Text'
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
      <ModalHeader>Enter Your Pin</ModalHeader>
      <ModalBody>
        <RawText color='gray.500'>
          Use PIN layout shown on your device to find the location to press on this pin pad.
        </RawText>
        <SimpleGrid columns={3} spacing={6} my={6} maxWidth='250px' ml='auto' mr='auto'>
          {pinNumbers.map(number => (
            <Button key={number} size='lg' p={8} onClick={() => handlePinPress(number)}>
              <CircleIcon boxSize={4} />
            </Button>
          ))}
        </SimpleGrid>
        <Input type='password' ref={pinFieldRef} size='lg' variant='filled' mb={6} />
        <Button isFullWidth size='lg' colorScheme='blue'>
          Unlock
        </Button>
      </ModalBody>
    </>
  )
}
