import {
  compact,
  forEach,
  head,
  includes,
  isArray,
  isNil,
  map,
  omitBy,
  transform,
  mapValues
} from 'lodash'

const DataLayerMapping = {
  // snowplow: tealium
  // The tealium side of the mapping can be multiple attributes in tealium that will
  // be set to the same value
  property_name: 'app_name',
  platform: 'platform',
  event: 'event_name',
  event_id: 'event_id',
  user_ipaddress: 'client_ip',
  geo_country: 'geo_country',
  geo_region: 'geo_region',
  geo_city: 'geo_city',
  geo_zipcode: 'geo_zipcode',
  geo_latitude: 'geo_latitude',
  geo_longitude: 'geo_longitude',
  geo_region_name: 'geo_region_name',
  page_url: ['page_url', 'dom.url'],
  page_urlhost: ['page_urlhost', 'dom.domain'],
  page_title: ['page_title', 'dom.title'],
  page_referrer: ['page_referrer', 'dom.referrer'],
  page_urlpath: ['page_urlpath', 'dom.pathname'],
  page_urlquery: ['page_urlquery', 'dom.query_string'],
  page_urlfragment: ['page_urlfragment', 'dom.hash'],
  mkt_medium: 'mkt_medium',
  mkt_source: 'mkt_source',
  mkt_term: 'mkt_term',
  mkt_content: 'mkt_content',
  mkt_campaign: 'mkt_campaign',
  se_category: 'se_category',
  se_action: 'se_action',
  se_label: 'se_label',
  se_property: 'se_property',
  se_value: 'se_value',
  tr_orderid: 'order_id',
  tr_total: 'order_total',
  tr_tax: 'order_tax',
  tr_shipping: 'order_shipping',
  tr_city: 'customer_city',
  tr_state: 'customer_state',
  tr_country: 'tr_country',
  ti_sku: 'product_id',
  ti_name: 'product_name',
  ti_category: 'product_category',
  ti_price: 'product_unit_price',
  ti_quantity: 'product_quantity',
  useragent: 'user_agent',
  br_name: 'br_name',
  br_family: 'br_family',
  br_version: 'br_version',
  br_type: 'br_type',
  br_lang: 'br_lang',
  br_viewheight: [undefined, 'dom.viewport_height'],
  br_viewwidth: [undefined, 'dom.viewport_width'],
  os_name: 'os_name',
  os_family: 'os_family',
  os_manufacturer: 'os_manufacturer',
  os_timezone: 'os_timezone',
  dvce_type: 'device',
  dvce_ismobile: 'dvce_ismobile',
  geo_timezone: 'geo_timezone',
  domain_sessionidx: 'tealium_session_number',
  domain_sessionid: 'tealium_session_id',
  true_tstamp: 'tealium_timestamp_epoch'
}
const HeaderMapping = {
  // snowplow: HTTP Header
  useragent: 'User-Agent'
}
const uuidFields = ['sso_guid', 'gr_master_person_id']
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const punycode = require('punycode')

class TealiumEvent {
  static get MOBILE_CONTEXT () { return 'contexts_com_snowplowanalytics_snowplow_mobile_context_1' }

  static get IDS_CONTEXT () { return 'contexts_org_cru_ids_1' }

  constructor (event) {
    this.event = event
    this.data = this.event.data
  }

  dataLayer (extra = {}) {
    return omitBy({
      scored_uri: this.event.uri,
      ...this.standardParameters,
      ...this.identityParameters,
      ...transform(DataLayerMapping, (result, value, key) => {
        if (isArray(value)) {
          value.forEach(tealium_key => {
            result[tealium_key] = this.event.data[key]
          })
        } else {
          result[value] = this.event.data[key]
        }
      }, {}),
      ...extra
    }, isNil)
  }

  headers (extra = {}) {
    return mapValues(omitBy({
      ...transform(HeaderMapping, (result, value, key) => {
        result[value] = this.event.data[key]
      }, {}),
      ...extra
    }, isNil), value => punycode.toASCII(value))
  }

  cookies () {
    return `TAPID=udp/main>${this.event.data['network_userid']}|`
  }

  get identityParameters () {
    const identityParams = {}

    if (isArray(this.event.data[TealiumEvent.MOBILE_CONTEXT])) {
      const mobile = this.event.data[TealiumEvent.MOBILE_CONTEXT][0]
      identityParams.device_idfa = head(compact(map(['androidIdfa', 'appleIdfa', 'appleIdfv', 'openIdfa'], field => {
        return mobile[field]
      })))
    }

    if (isArray(this.event.data[TealiumEvent.IDS_CONTEXT])) {
      const ids = this.event.data[TealiumEvent.IDS_CONTEXT][0]
      forEach(['sso_guid', 'gr_master_person_id', 'mcid'], field => {
        if (typeof ids[field] !== 'undefined' && ids[field]) {
          identityParams[field] = this.fieldValue(ids[field], field)
        }
      })
    }

    // Set tealium_visitor_id to the domain_userid or device_idfa, whichever is first present.
    identityParams.tealium_visitor_id = head(compact([this.event.data.domain_userid, identityParams.device_idfa]))
    identityParams.tealium_vid = identityParams.tealium_visitor_id

    return identityParams
  }

  get standardParameters () {
    return {
      tealium_account: 'udp',
      tealium_profile: 'main',
      tealium_datasource: '95baw3'
    }
  }

  fieldValue (value, field) {
    if (includes(uuidFields, field)) {
      return uuidPattern.test(value) ? value : /* istanbul ignore next */ undefined
    }
    return value
  }
}

export default TealiumEvent
