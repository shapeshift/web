import { Button, ModalBody, ModalFooter, ModalHeader, Tag, Wrap } from '@chakra-ui/react'
import { RawText, Text } from 'components/Text'

import { useNativeTestPhrase } from '../../hooks/useNativeTestPhrase/useNativeTestPhrase'

const ordinalSuffix = (n: number) => {
  return ['st', 'nd', 'rd'][((((n + 90) % 100) - 10) % 10) - 1] || 'th'
}

export const NativeTestPhrase = () => {
  const {
    shuffledRandomWords,
    shuffledWords,
    testCount,
    setTestWord,
    invalid,
    testWord,
    handleNext,
    invalidTries
  } = useNativeTestPhrase()

  return !shuffledWords.length ? null : (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.nativeTestPhrase.header'} />
      </ModalHeader>
      <ModalBody>
        <RawText>
          <Text as='span' translation={'walletProvider.shapeShift.nativeTestPhrase.body'} />{' '}
          <Tag colorScheme='green'>
            {`${shuffledWords[testCount - 1][0]}${ordinalSuffix(shuffledWords[testCount - 1][0])}`}
            <Text
              as='span'
              ml={1}
              translation={'walletProvider.shapeShift.nativeTestPhrase.body2'}
            />
          </Tag>{' '}
          <Text as='span' translation={'walletProvider.shapeShift.nativeTestPhrase.body3'} />
        </RawText>
        <Wrap mt={12} mb={6}>
          {shuffledRandomWords &&
            shuffledRandomWords.map((word: string) => (
              <Button
                key={word}
                flex='1'
                minW='30%'
                variant='ghost-filled'
                colorScheme={invalid && invalidTries.includes(word) ? 'gray' : 'blue'}
                isDisabled={invalid && invalidTries.includes(word)}
                onClick={() => setTestWord(word)}
                isActive={testWord === word}
              >
                {word}
              </Button>
            ))}
        </Wrap>
      </ModalBody>
      <ModalFooter>
        <Button colorScheme='blue' size='lg' isDisabled={!testWord} onClick={handleNext}>
          <Text translation={'walletProvider.shapeShift.nativeTestPhrase.button'} />
        </Button>
      </ModalFooter>
    </>
  )
}
