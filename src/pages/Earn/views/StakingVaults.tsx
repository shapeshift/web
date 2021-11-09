import { Main } from 'components/Layout/Main'
import { StakingVaults as Vaults } from 'pages/Assets/AssetCards/StakingVaults/StakingVaults'

export const StakingVaults = () => {
  return (
    <Main>
      <Vaults isLoaded={true} showAll />
    </Main>
  )
}
