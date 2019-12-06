'use strict'
import rollbar from '../config/rollbar'
import { SQS } from 'aws-sdk'
import uniqBy from 'lodash/uniqBy'
import DerivedEvent from '../models/derived-event'
import Event from '../models/event'

export const handler = rollbar.lambdaHandler((lambdaEvent, lambdaContext, lambdaCallback) => {
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
      const sqs = new SQS({ apiVersion: '2012-11-05', region: 'us-east-1' })
      const entries = uniqBy(validEvents, 'event_id').map((event) => ({
        Id: event.event_id,
        MessageBody: event.data
      }))

      sqs.sendMessageBatch({
        QueueUrl: process.env.UDP_EVENTS_SQS_QUEUE_URL,
        Entries: entries
      }, (err, data) => {
        if (err) {
          rollbar.error('sqs.sendMessageBatch() error', err)
        }
        lambdaCallback(null, data)
      })
    } else {
      lambdaCallback(null, 'Nothing processed')
    }
  } else {
    lambdaCallback(null, 'Nothing processed')
  }
})
