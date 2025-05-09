import { Alert, AlertTitle, Button, Stack } from '@chakra-ui/react'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { useTCYClaims } from '../queries/useTcyClaims'

import { AssetIcon } from '@/components/AssetIcon'

const margin = { base: 4, md: 0 }

export const TCYCta = () => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const claimsQuery = useTCYClaims('all')
  const hasClaims = useMemo(() => claimsQuery.some(query => query.data.length), [claimsQuery])

  const handleClick = useCallback(() => {
    navigate('/tcy')
  }, [navigate])

  if (!hasClaims) return null

  return (
    <Alert status='info' m={margin} width='auto'>
      <AssetIcon assetId={tcyAssetId} />
      <Stack spacing={0} ml={4}>
        <AlertTitle>{translate('TCY.cta.title')}</AlertTitle>
      </Stack>
      <Button ml='auto' flexShrink={0} onClick={handleClick}>
        {translate('TCY.cta.button')}
      </Button>
    </Alert>
  )
}
