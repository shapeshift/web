import { Flex, Skeleton, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'

type PositionItemProps = {
  translation: string
  asset?: Asset
  amountCryptoBaseUnit?: string
  amountFiat?: string
  text?: string
}

export const PositionItem = ({
  translation,
  asset,
  text,
  amountCryptoBaseUnit,
  amountFiat,
}: PositionItemProps) => {
  return (
    <Stack spacing={0} flex={1} flexDir={'column'}>
      <Text fontSize='sm' color='text.subtle' fontWeight='medium' translation={translation} />
      <Skeleton isLoaded={true}>
        <Flex alignItems='center' gap={2}>
          {asset && amountCryptoBaseUnit && (
            <Amount.Crypto
              fontSize='xl'
              value={amountCryptoBaseUnit}
              symbol={asset?.symbol}
              fontWeight='medium'
            />
          )}
          {text && <Text fontSize='xl' fontWeight='medium' translation={text} />}
        </Flex>
      </Skeleton>

      {amountFiat && (
        <Skeleton isLoaded={true}>
          <Amount.Fiat fontSize='xs' value={amountFiat} color='text.subtle' />
        </Skeleton>
      )}
    </Stack>
  )
}
