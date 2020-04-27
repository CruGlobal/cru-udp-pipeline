'use strict'
import rollbar from '../config/rollbar'
import DerivedEvent from '../models/derived-event'
import Event from '../models/event'
import uniqBy from 'lodash/uniqBy'
import bent from 'bent'
import retry from 'async-retry'
import TealiumEvent from '../models/tealium-event'

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
      // POST uniquely valid events to Tealium event API
      const tealium = bent('https://collect.tealiumiq.com', 'POST')
      const requests = uniqBy(validEvents, 'event_id').map(event => retry(async bail => {
        return tealium('/event', new TealiumEvent(event).dataLayer)
      }, { retries: 3 }))
      return Promise.all(requests)
    } else {
      return Promise.resolve('Nothing processed')
    }
  } else {
    return Promise.resolve('Nothing processed')
  }
}
