const BRANCH_TO_MODE = {
  beard: 'develop',
  juice: 'develop',
  wood: 'develop',
  gome: 'develop',
  neo: 'develop',
  arkeo: 'develop',
  yeet: 'develop',
  develop: 'develop',
  release: 'app',
  main: 'app',
  private: 'private',
}

export const determineMode = () => {
  const branch = process.env.CURRENT_BRANCH_NAME
  if (branch && BRANCH_TO_MODE[branch]) {
    console.log(`Using branch ${branch} to determine environment ${BRANCH_TO_MODE[branch]}`)
    return BRANCH_TO_MODE[branch]
  }

  return 'dev'
}
