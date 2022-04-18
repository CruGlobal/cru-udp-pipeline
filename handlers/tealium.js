'use strict'
import rollbar from '../config/rollbar'

import DerivedEvent from '../models/derived-event'
import Event from '../models/event'
import uniqBy from 'lodash/uniqBy'
import bent from 'bent'
import retry from 'async-retry'
import { TealiumEvent, BQTealiumEvent } from '../models/tealium-event'

export const handler = async (lambdaEvent) => {
  if (typeof lambdaEvent.Records !== 'undefined') {
    // Debug
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(JSON.stringify(lambdaEvent.Records))
    }

    const validEvents = []
    // Iterate over each record
    lambdaEvent.Records.forEach((record) => {
      try {
        // Build an event object from each record, catch any resulting errors (InvalidEventError)
        validEvents.push(new Event(record))
      } catch (error) {
        if (process.env.LOG_LEVEL === 'debug' || !(error instanceof DerivedEvent.InvalidDerivedEventError)) {
          rollbar.error('Event.fromRecord(record) error', error, { record: record })
        }

        if (process.env.LOG_LEVEL === 'debug') {
          console.log('DerivedEvent Error: ', error.toString())
        }
      }
    })

    if (validEvents.length > 0) {
      try {
        // send uniquely valid events to Tealium event API
        const tealiumPOST = bent('https://collect.tealiumiq.com', 'POST')
        // const tealiumPOST = bent('https://webhook.site', 'POST')
        const requests = uniqBy(validEvents, 'event_id').map(event => retry(async bail => {
          const tealium = new TealiumEvent(event)
          const extraParams = {
            'cp.trace_id': tealium.dataLayer().tealium_trace_id
          }
          if (event.app_id === 'adobecampaign') {
            extraParams['cp.trace_id'] = 'MULvuyum'
          }
          return tealiumPOST(
            '/udp/main/2/i.gif',
            // '/6063fa3c-b827-493c-a66f-bfabb7c222f1',
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

export const bqHandler = async (rows) => {
  if (typeof rows !== 'undefined') {
    if (rows.length > 0) {
      try {
        // send uniquely valid events to Tealium event API
        const tealiumPOST = bent('https://collect.tealiumiq.com', 'POST')
        const requests = uniqBy(rows, 'user_id').map((row) =>
          retry(
            async (bail) => {
              const tealium = new BQTealiumEvent(row)
              const extraParams = {
                'cp.trace_id': tealium.dataLayer().tealium_trace_id
              }
              return tealiumPOST(
                '/udp/main/2/i.gif',
                { data: tealium.dataLayer(extraParams) }
                // tealium.headers({ Cookie: tealium.cookies() })
              )
            },
            { retries: 3 }
          )
        )
        await Promise.all(requests)
        return `Processed ${requests.length} events.`
      } catch (error) {
        await rollbar.error('Error sending user placement data to Tealium', error)
        return Promise.reject(error)
      }
    } else {
      return Promise.resolve('Nothing processed')
    }
  } else {
    return Promise.resolve('Nothing processed')
  }
}
