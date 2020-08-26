import Audience from './models/audience'
import { BigQuery } from '@google-cloud/bigquery'
import { handler } from './handlers/tealium'
import rollbar from './config/rollbar'

export async function audience (pubSubMessage, context) {
  try {
    const bigquery = new BigQuery({ projectId: process.env.BIGQUERY_PROJECT_ID })
    const row = new Audience(pubSubMessage.data).bigQueryRow
    console.log(JSON.stringify(row))
    await bigquery.dataset(process.env.BIGQUERY_DATASET)
      .table(process.env.BIGQUERY_TABLE)
      .insert([{
        ...row,
        created_at: bigquery.timestamp(new Date())
      }])
    return 'Success'
  } catch (error) {
    await rollbar.error(error.toString(), error)
    return Promise.reject(error)
  }
}

export async function tealium (pubSubMessage, context) {
  try {
    await handler({ Records: [{ kinesis: { data: pubSubMessage.data } }] })
  } catch (error) {
    return Promise.reject(error)
  }
}

export async function placement (httpTrigger) {
  console.log('--==[[ HERE ]]==--')
  return 'Done'
}
