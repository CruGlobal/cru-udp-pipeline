'use strict'

module.exports = () => {
  // Use dotenv to load local development overrides
  require('dotenv').config()
  return {
    ENVIRONMENT: process.env['ENVIRONMENT'] || 'development',
    SQS_CRU_EVENTS_ARN: process.env['SQS_CRU_EVENTS_ARN'] || '',
    KINESIS_SNOWPLOW_ENRICH_ARN: process.env['KINESIS_SNOWPLOW_ENRICH_ARN'] || ''
  }
}
