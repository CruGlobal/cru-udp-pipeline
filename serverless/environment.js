'use strict'

module.exports = () => {
  // Use dotenv to load local development overrides
  require('dotenv').config()
  return {
    ENVIRONMENT: process.env.ENVIRONMENT || 'development',
    ROLLBAR_ACCESS_TOKEN: process.env.ROLLBAR_ACCESS_TOKEN || '',
    LOG_LEVEL: process.env.LOG_LEVEL || 'error',
    TEALIUM_AUDIENCE_TOPIC: process.env.TEALIUM_AUDIENCE_TOPIC || '',
    SNOWPLOW_PIPELINE_TOPIC: process.env.SNOWPLOW_PIPELINE_TOPIC || '',
    BIGQUERY_PROJECT_ID: process.env.BIGQUERY_PROJECT_ID || '',
    BIGQUERY_DATASET: process.env.BIGQUERY_DATASET || '',
    BIGQUERY_TABLE: process.env.BIGQUERY_TABLE || ''
  }
}
