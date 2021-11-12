import { Main } from 'components/Layout/Main'
import { StakingVaults as Vaults } from 'components/StakingVaults/StakingVaults'

export const StakingVaults = () => {
  return (
    <Main>
      <Vaults isLoaded={true} showAll />
    </Main>
  )
}
