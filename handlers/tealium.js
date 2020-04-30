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
      // const tealiumPOST = bent('https://collect.tealiumiq.com', 'POST')
      // const webhookGET = bent('https://webhook.site', 'GET', 200)
      const requests = uniqBy(validEvents, 'event_id').map(event => retry(async bail => {
        const extraParams = {
          // 'cp.trace_id': 'iNdLkvqJ'
        }
        const dataLayer = new TealiumEvent(event).dataLayer(TealiumEvent.GET, extraParams)
        return tealiumGET(`/vdata/i.gif?${stringify(dataLayer)}`)
        // const response = await webhookGET(`/6063fa3c-b827-493c-a66f-bfabb7c222f1?${stringify(dataLayer)}`)
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
