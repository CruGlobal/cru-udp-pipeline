import Audience from './models/audience'
import { BigQuery } from '@google-cloud/bigquery'
import { handler, bqHandler } from './handlers/tealium'
import rollbar from './config/rollbar'

export async function audience (pubSubMessage, context) {
  try {
    const bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID
    })
    const row = new Audience(pubSubMessage.data).bigQueryRow
    console.log(JSON.stringify(row))
    await bigquery
      .dataset(process.env.BIGQUERY_DATASET)
      .table(process.env.BIGQUERY_TABLE)
      .insert([
        {
          ...row,
          created_at: bigquery.timestamp(new Date())
        }
      ])
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

export async function placement (req, res) {
  const query = 'SELECT * FROM `derived.user_placement_identified` WHERE placement_updated_dt >= TIMESTAMP_SUB(current_timestamp, INTERVAL 1 DAY)'
  const options = {
    query: query,
    location: 'US'
  }
  try {
    const bigquery = new BigQuery()
    const [job] = await bigquery.createQueryJob(options)
    console.log(`Job ${job.id} started.`)
    async function manualPaginationCallback (err, rows, nextQuery, apiResponse) {
      await bqHandler(rows)
      if (nextQuery) {
        // More results exist.
        job.getQueryResults(nextQuery, manualPaginationCallback)
      }
    }

    job.getQueryResults(
      {
        maxResults: 100,
        autoPaginate: false
      },
      manualPaginationCallback
    )

    await res.send('Success')
    return 'Success'
  } catch (error) {
    await rollbar.error(error.toString(), error)
    return Promise.reject(error)
  }
}
