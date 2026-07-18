import { txOddsCreateGuestSession } from '../../../utils/txodds'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store, private')
  setHeader(event, 'Pragma', 'no-cache')

  try {
    const guestJwt = await txOddsCreateGuestSession(useRuntimeConfig(event))
    return { guestJwt }
  } catch (error: any) {
    if (error?.statusCode) throw error

    throw createError({
      statusCode: 502,
      statusMessage: 'Unable to start a TxODDS guest session'
    })
  }
})
