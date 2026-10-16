import type { UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { parseResponse } from '../lib/api'
import { AFFILIATE_URL } from '../lib/constants'
import type { ActionMessage } from './useAffiliateActions'
import { AffiliateRoleSchema } from './useAffiliateConfig'

const AffiliateMemberSchema = z.object({
  walletAddress: z.string(),
  role: AffiliateRoleSchema,
  addedBy: z.string().nullable(),
  createdAt: z.string().datetime(),
})

const AffiliateMembersResponseSchema = z.object({ members: z.array(AffiliateMemberSchema) })

export type AffiliateMember = z.infer<typeof AffiliateMemberSchema>

interface UseAffiliateMembersArgs {
  affiliateAddress: string
  authHeaders: Record<string, string>
  setMessage: (message: ActionMessage | null) => void
}

interface UseAffiliateMembersReturn {
  query: UseQueryResult<AffiliateMember[], Error>
  isAdding: boolean
  isRemoving: boolean
  addMember: (walletAddress: string) => Promise<void>
  removeMember: (walletAddress: string) => Promise<void>
}

const membersQueryKey = (address: string): readonly unknown[] => ['affiliate', 'members', address]

const fetchMembers = async (
  url: string,
  method: 'GET' | 'POST' | 'DELETE',
  authHeaders: Record<string, string>,
  body?: unknown,
): Promise<AffiliateMember[]> => {
  const response = await fetch(url, {
    method,
    headers: { ...authHeaders, ...(body !== undefined && { 'Content-Type': 'application/json' }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  })
  const { members } = await parseResponse(response, AffiliateMembersResponseSchema)
  return members
}

export const useAffiliateMembers = ({
  affiliateAddress,
  authHeaders,
  setMessage,
}: UseAffiliateMembersArgs): UseAffiliateMembersReturn => {
  const queryClient = useQueryClient()
  const membersUrl = `${AFFILIATE_URL}/${encodeURIComponent(affiliateAddress)}/members`

  const query = useQuery({
    queryKey: membersQueryKey(affiliateAddress),
    queryFn: () => fetchMembers(membersUrl, 'GET', authHeaders),
    enabled: Boolean(authHeaders.Authorization),
  })

  const onError = (err: Error) => setMessage({ type: 'error', text: err.message })

  const addMutation = useMutation({
    mutationFn: (walletAddress: string) =>
      fetchMembers(membersUrl, 'POST', authHeaders, { walletAddress }),
    onSuccess: members => {
      queryClient.setQueryData(membersQueryKey(affiliateAddress), members)
      setMessage({ type: 'success', text: 'Admin added' })
    },
    onError,
  })

  const removeMutation = useMutation({
    mutationFn: (walletAddress: string) =>
      fetchMembers(`${membersUrl}/${encodeURIComponent(walletAddress)}`, 'DELETE', authHeaders),
    onSuccess: members => {
      queryClient.setQueryData(membersQueryKey(affiliateAddress), members)
      setMessage({ type: 'success', text: 'Admin removed' })
    },
    onError,
  })

  return {
    query,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    addMember: async walletAddress => {
      setMessage(null)
      await addMutation.mutateAsync(walletAddress)
    },
    removeMember: async walletAddress => {
      setMessage(null)
      await removeMutation.mutateAsync(walletAddress)
    },
  }
}
