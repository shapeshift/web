import { Button, Card, CardBody, CardHeader, Heading, HStack, Input } from '@chakra-ui/react'
import { FaPlus } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

type CreateCodeCardProps = {
  newCodeInput: string
  isCreating: boolean
  onInputChange: (value: string) => void
  onGenerateRandom: () => void
  onCreate: () => void
}

export const CreateCodeCard = ({
  newCodeInput,
  isCreating,
  onInputChange,
  onGenerateRandom,
  onCreate,
}: CreateCodeCardProps) => {
  const translate = useTranslate()

  return (
    <Card
      bg='background.surface.raised.base'
      borderRadius='xl'
      borderTop='1px solid'
      borderColor='gray.700'
      py={2}
    >
      <CardHeader>
        <Heading size='md'>{translate('referral.createNewCode')}</Heading>
      </CardHeader>
      <CardBody>
        <HStack>
          <Input
            value={newCodeInput}
            onChange={e => onInputChange(e.target.value.toUpperCase())}
            placeholder={translate('referral.enterCodeOrLeaveEmpty')}
            maxLength={20}
            bg='background.surface.raised.base'
            border='none'
          />
          <Button
            onClick={onGenerateRandom}
            leftIcon={<FaPlus />}
            variant='outline'
            flexShrink={0}
            borderRadius='full'
            border='1px solid'
            borderColor='gray.700'
            backgroundColor='background.surface.raised.base'
          >
            {translate('referral.random')}
          </Button>
          <Button
            onClick={onCreate}
            colorScheme='blue'
            isLoading={isCreating}
            flexShrink={0}
            borderRadius='full'
          >
            {translate('referral.create')}
          </Button>
        </HStack>
      </CardBody>
    </Card>
  )
}
