import { fetchFilterClasses } from './filters'
import { FetchFilterClient } from './globals'

export async function setupFetchFilters() {
  const client = await FetchFilterClient.active
  await Promise.all(fetchFilterClasses.map(x => client.installFilter(x)))
  await client.ready
}
