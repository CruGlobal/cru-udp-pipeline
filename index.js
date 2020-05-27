import { handler } from './handlers/tealium'

export async function tealium (data) {
  try {
    await handler({ Records: [{ kinesis: { data: data.data } }] })
  } catch (e) {
    console.error(e.message)
  }
}
