import { useDatabase } from '../../../utils/db'
import { serializeTestMarket, type TestMarketRow } from '../../../utils/testMarketData'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const result = await useDatabase(event).query<TestMarketRow>(
    `SELECT * FROM test_markets
     ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, betting_closes_at ASC, created_at DESC`
  )
  return { markets: result.rows.map(serializeTestMarket) }
})
