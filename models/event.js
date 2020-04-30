'use strict'

import {
  isArray,
  isEmpty,
  startsWith
} from 'lodash'
import DerivedEvent from './derived-event'
import Url from 'url'
import { transform } from 'snowplow-analytics-sdk'

class Event {
  static get WEB_PAGE_CONTEXT () { return 'contexts_com_snowplowanalytics_snowplow_web_page_1' }

  static get SCREEN_VIEW_CONTEXT () { return 'unstruct_event_com_snowplowanalytics_snowplow_screen_view_1' }

  static get CONTENT_SCORING_CONTEXT () { return 'contexts_org_cru_content-scoring_1' }

  constructor (record) {
    let data
    try {
      data = transform(Buffer.from(record.kinesis.data, 'base64').toString('utf8'))
    } catch (e) {
      throw new InvalidEventError('Malformed kinesis event: ' + e.message)
    }

    this.event_id = data.event_id
    this.type = data.event_name

    // Will throw errors if event is not a valid DerivedEvent
    DerivedEvent.ensureValid(data)

    // Set web_id if present
    if (isArray(data[Event.WEB_PAGE_CONTEXT])) {
      this.web_id = data[Event.WEB_PAGE_CONTEXT][0].id
    }

    // Set URI from assorted even fields
    this.uri = uriFromEvent(data)

    // Set data
    this.data = data

    // Set raw Base64 data
    this.raw_data = record.kinesis.data
  }
}

/**
 * @param {object} data
 * @returns {String|NULL}
 */
function uriFromEvent (data) {
  let format
  // Use content-scoring.uri if present
  if (isArray(data[Event.CONTENT_SCORING_CONTEXT])) {
    try {
      const contentScoring = data[Event.CONTENT_SCORING_CONTEXT][0]
      const parsed = Url.parse(contentScoring.uri) // eslint-disable-line
      format = {
        protocol: parsed.protocol,
        slashes: true,
        hostname: parsed.hostname,
        pathname: parsed.pathname
      }
    } catch (e) {
      // TypeError - contentScoring.uri was not a string
      /* istanbul ignore next */
      return null
    }
  } else if (data.platform === 'mob') {
    // Fallback for mobile apps that don't use the content-scoring context
    let pathname = ''
    /* istanbul ignore else */
    if (isArray(data[Event.SCREEN_VIEW_CONTEXT])) {
      const screenView = data[Event.SCREEN_VIEW_CONTEXT][0]
      pathname = screenView.name.replace(/[^a-zA-Z0-9-_]/g, '')
    }
    format = {
      protocol: data.app_id,
      slashes: true,
      hostname: data.event_name,
      pathname: pathname
    }
  } else if (data.page_url) {
    try {
      const parsed = Url.parse(data.page_url) // eslint-disable-line
      format = {
        protocol: parsed.protocol,
        slashes: true,
        hostname: parsed.hostname,
        pathname: parsed.pathname
      }
    } catch (e) {
      // TypeError - page_url was not a string, will probably never hit this since base64 decode always produces strings
      /* istanbul ignore next */
      return null
    }
  }
  if (!isEmpty(format)) {
    const url = Url.format(format)
    if (startsWith(url, '///')) {
      return null
    }
    return url
  }
  return null
}

class InvalidEventError extends Error {}

Event.InvalidEventError = InvalidEventError

export default Event
