import { txOddsOpenStream } from '../../../utils/txodds'
import { once } from 'node:events'

export default defineEventHandler(async (event) => {
  const controller = new AbortController()
  event.node.req.on('close', () => controller.abort())

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  }
  const response = event.node.res
  response.writeHead(200, headers)
  response.write(': connected\n\n')

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  try {
    const upstream = await txOddsOpenStream(
      useRuntimeConfig(event),
      '/api/odds/stream',
      controller.signal
    )
    reader = upstream.body!.getReader()

    while (!controller.signal.aborted) {
      const { value, done } = await reader.read()
      if (done) break
      if (!response.write(Buffer.from(value))) await once(response, 'drain')
    }
  } catch (error: any) {
    if (!controller.signal.aborted && !response.writableEnded) {
      response.write(`event: stream-error\ndata: ${JSON.stringify({
        message: error?.statusMessage || 'TxODDS stream connection failed'
      })}\n\n`)
    }
  } finally {
    reader?.releaseLock()
    if (!response.writableEnded) response.end()
  }
})
