import type { Location } from 'history'

export type RightPanelContentProps = {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void
  location: Location
}
