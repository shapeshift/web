import type { UseQueryResult } from '@tanstack/react-query'

/**
 * Merges react-query outputs into a into a single output. Use with `useQueries` and `combine`.
 *
 * @param queryOutputs The react-query `useQueries` outputs to merge.
 * @param combineResults The function to combine the result data of the queries.
 * @returns The merged react-query output.
 */
export const mergeQueryOutputs = <QueryOutputType, QueryErrorType, MergedOutputType>(
  queryOutputs: UseQueryResult<QueryOutputType, QueryErrorType>[],
  combineResults: (results: QueryOutputType[]) => MergedOutputType,
): UseQueryResult<MergedOutputType, QueryErrorType[]> => {
  const isLoading = queryOutputs.some(result => result.isLoading)
  const isPending = queryOutputs.some(result => result.isPending)
  const isError = queryOutputs.some(result => result.isError)
  const isLoadingError = queryOutputs.some(result => result.isLoadingError)
  const isRefetchError = queryOutputs.some(result => result.isRefetchError)
  const isSuccess = queryOutputs.every(result => result.isSuccess)

  const errors = queryOutputs.reduce<QueryErrorType[]>((a, v) => {
    if (v.error) {
      a.push(v.error)
    }

    return a
  }, [])

  const error = errors.length > 0 ? errors : null

  const status = (() => {
    if (isLoading || isPending) return 'loading'
    if (isError) return 'error'
    return 'success'
  })()

  if (isLoading || isPending) {
    return {
      data: undefined,
      error,
      isLoading,
      isPending,
      isError,
      isLoadingError,
      isRefetchError,
      isSuccess,
      status,
    } as UseQueryResult<MergedOutputType, QueryErrorType[]>
  }

  return {
    data: combineResults(queryOutputs.map(result => result.data as QueryOutputType)),
    error,
    isLoading,
    isPending,
    isError,
    isLoadingError,
    isRefetchError,
    isSuccess,
    status,
  } as UseQueryResult<MergedOutputType, QueryErrorType[]>
}
