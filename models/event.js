'use strict'

const {
  isArray,
  isEmpty,
  startsWith
} = require('lodash')
const DerivedEvent = require('./derived-event')
const Url = require('url')
const { transform } = require('snowplow-analytics-sdk')

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
    // Use event_name for the event type (page_view, page_ping, link_click, screen_view...)
    this.type = data.event_name
    this.collector_tstamp = data.collector_tstamp
    this.derived_tstamp = data.derived_tstamp

    // Will throw errors if event is not a valid DerivedEvent
    DerivedEvent.ensureValid(data)

    // Set web_id if present
    if (isArray(data[Event.WEB_PAGE_CONTEXT])) {
      this.web_id = data[Event.WEB_PAGE_CONTEXT][0].id
    }

    // Set URI from assorted even fields
    this.uri = uriFromEvent(data)

    // Set raw Base64 data
    this.data = record.kinesis.data
  }
}

/**
 * @param {Event} event
 * @returns {String|NULL}
 */
function uriFromEvent (event) {
  let format
  // Use content-scoring.uri if present
  if (isArray(event[Event.CONTENT_SCORING_CONTEXT])) {
    try {
      const contentScoring = event[Event.CONTENT_SCORING_CONTEXT][0]
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
  } else if (event.platform === 'mob') {
    // Fallback for mobile apps that don't use the content-scoring context
    let pathname = ''
    /* istanbul ignore else */
    if (isArray(event[Event.SCREEN_VIEW_CONTEXT])) {
      const data = event[Event.SCREEN_VIEW_CONTEXT][0]
      pathname = data.name.replace(/[^a-zA-Z0-9-_]/g, '')
    }
    format = {
      protocol: event.app_id,
      slashes: true,
      hostname: event.event_name,
      pathname: pathname
    }
  } else if (event.page_url) {
    try {
      const parsed = Url.parse(event.page_url) // eslint-disable-line
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
