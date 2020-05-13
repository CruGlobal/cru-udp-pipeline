'use strict'
import rollbar from '../config/rollbar'

import DerivedEvent from '../models/derived-event'
import Event from '../models/event'
import uniqBy from 'lodash/uniqBy'
import bent from 'bent'
import retry from 'async-retry'
import TealiumEvent from '../models/tealium-event'

export const handler = async (lambdaEvent) => {
  if (typeof lambdaEvent.Records !== 'undefined') {
    // Debug
    // console.log(JSON.stringify(lambdaEvent.Records))

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
      try {
        // send uniquely valid events to Tealium event API
        const tealiumPOST = bent('https://collect.tealiumiq.com', 'POST')
        const requests = uniqBy(validEvents, 'event_id').map(event => retry(async bail => {
          const extraParams = {
            // 'cp.trace_id': 'nrsSenhu'
          }
          const tealium = new TealiumEvent(event)
          return tealiumPOST(
            '/udp/main/2/i.gif',
            { data: tealium.dataLayer(extraParams) },
            tealium.headers({ Cookie: tealium.cookies() })
          )
        }, { retries: 3 }))
        await Promise.all(requests)
        return `Processed ${requests.length} events.`
      } catch (error) {
        await rollbar.error('Error sending event to Tealium', error)
        return Promise.reject(error)
      }
    } else {
      return Promise.resolve('Nothing processed')
    }
  } else {
    return Promise.resolve('Nothing processed')
  }
}
