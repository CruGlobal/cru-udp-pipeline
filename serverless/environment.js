'use strict'

module.exports = () => {
  // Use dotenv to load local development overrides
  require('dotenv').config()
  return {
    ENVIRONMENT: process.env.ENVIRONMENT || 'development',
    ROLLBAR_ACCESS_TOKEN: process.env.ROLLBAR_ACCESS_TOKEN || '',
    UDP_EVENTS_SQS_QUEUE_URL: process.env.UDP_EVENTS_SQS_QUEUE_URL || '',
    UDP_EVENTS_SQS_QUEUE_ARN: process.env.UDP_EVENTS_SQS_QUEUE_ARN || '',
    SNOWPLOW_KINESIS_ENRICH_ARN: process.env.SNOWPLOW_KINESIS_ENRICH_ARN || ''
  }
}
