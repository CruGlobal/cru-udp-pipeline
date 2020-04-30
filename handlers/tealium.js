'use strict'
import rollbar from '../config/rollbar'
import DerivedEvent from '../models/derived-event'
import Event from '../models/event'
import uniqBy from 'lodash/uniqBy'
import bent from 'bent'
import retry from 'async-retry'
import TealiumEvent from '../models/tealium-event'
import { stringify } from 'querystring'

export const handler = async (lambdaEvent) => {
  // Make sure we have event records
  if (typeof lambdaEvent.Records !== 'undefined') {
    const validEvents = []
    // Iterate over each record
    lambdaEvent.Records.forEach((record) => {
      try {
        // Build an event object from each record, catch any resulting errors (InvalidEventError)
        validEvents.push(new Event(record))
      } catch (error) {
        if (!(error instanceof DerivedEvent.InvalidDerivedEventError)) {
          rollbar.error('Event.fromRecord(record) error', error, { record: record })
        }
      }
    })

    if (validEvents.length > 0) {
      // send uniquely valid events to Tealium event API
      const tealiumGET = bent('https://collect-us-east-1.tealiumiq.com', 'GET')
      const requests = uniqBy(validEvents, 'event_id').map(event => retry(async bail => {
        const extraParams = {
          // 'cp.trace_id': 'iNdLkvqJ'
        }
        const tealium = new TealiumEvent(event)
        return tealiumGET(
          `/vdata/i.gif?${stringify(tealium.dataLayer(TealiumEvent.GET, extraParams))}`,
          undefined,
          tealium.headers()
        )
      }, { retries: 3 }))
      try {
        await Promise.all(requests)
      } catch (e) {
        throw new Error(`Error processing: ${JSON.stringify(e)}`)
      }
      return `Processed ${requests.length} events.`
    } else {
      return Promise.resolve('Nothing processed')
    }
  } else {
    return Promise.resolve('Nothing processed')
  }
}
