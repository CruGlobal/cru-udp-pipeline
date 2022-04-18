import Audience from './models/audience'
import { BigQuery } from '@google-cloud/bigquery'
import { handler, bqHandler } from './handlers/tealium'
import rollbar from './config/rollbar'
import { S3 } from 'aws-sdk'

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

export async function acs (pubSubMessage, context) {
  const s3 = new S3({
    region: 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    apiVersion: '2006-03-01'
  })

  try {
    await s3.getObject(
      { Bucket: process.env.S3_BUCKET, Key: 'adobeftp/Tealium/tealium_to_acs.csv' },
      async (err, data) => {
        if (data) {
          const csvData = new Audience(pubSubMessage.data).acsCsv(data.Body.toString())
          await s3.upload(
            {
              Bucket: process.env.S3_BUCKET,
              Key: 'adobeftp/Tealium/tealium_to_acs.csv',
              Body: csvData
            },
            (err, data) => {
              if (err) throw err
              console.log(`File uploaded successfully to ${data.Location}`)
            }
          )
          // If the specific error code is 'NoSuchKey', file does not exist. So let's create it.
        } else if (err && err.code === 'NoSuchKey') {
          const csvData = new Audience(pubSubMessage.data).acsCsv()
          await s3.upload(
            {
              Bucket: process.env.S3_BUCKET,
              Key: 'adobeftp/Tealium/tealium_to_acs.csv',
              Body: csvData
            },
            (err, data) => {
              if (err) throw err
              console.log(`File uploaded successfully to ${data.Location}`)
            }
          )
        } else {
          throw err
        }
      }
    )
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
  const query = 'SELECT * FROM `derived.user_placement_identified_tealium` WHERE placement_updated_at >= TIMESTAMP_SUB(current_timestamp, INTERVAL 1 DAY)'
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
