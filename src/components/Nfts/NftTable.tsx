import { Wrap, WrapItem } from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import { useGetZapperNftUserTokensQuery } from 'state/apis/zapper/zapperApi'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { NftCard } from './NftCard'

export const NftTable = () => {
  const accountId = useAppSelector(s => selectFirstAccountIdByChainId(s, ethChainId)) ?? ''
  const { data } = useGetZapperNftUserTokensQuery({ accountId }, { skip: !accountId })

  if (!data) return null

  return (
    <Wrap spacing='30px'>
      {data.items.map(({ token }) => {
        return (
          <WrapItem key={token.id}>
            <NftCard {...token} />
          </WrapItem>
        )
      })}
    </Wrap>
  )
}
