import {
  compact,
  forEach,
  head,
  includes,
  isNil,
  map,
  mapValues,
  omitBy,
  transform
} from 'lodash'
import Context from './context'

const DataLayerMapping = {
  // Snowplow: Tealium
  property_name: 'app_name',
  platform: 'platform',
  event: 'event_name',
  event_id: 'event_id',
  user_ipaddress: 'Client IP',
  // domain_userid: 'tealium_visitor_id', // tealium_visitor_id is handled in the identity section
  network_userid: 'tealium_thirdparty_visitor_id',
  geo_country: 'geo_country',
  geo_region: 'geo_region',
  geo_city: 'geo_city',
  geo_zipcode: 'geo_zipcode',
  geo_latitude: 'geo_latitude',
  geo_longitude: 'geo_longitude',
  geo_region_name: 'geo_region_name',
  page_url: 'Current URL',
  page_title: 'Page Title',
  page_referrer: 'Referring URL',
  page_urlpath: 'Pathname',
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
  useragent: 'user agent',
  br_name: 'br_name',
  br_family: 'br_family',
  br_version: 'br_version',
  br_type: 'br_type',
  br_lang: 'br_lang',
  os_name: 'os_name',
  os_family: 'os_family',
  os_manufacturer: 'os_manufacturer',
  os_timezone: 'os_timezone',
  dvce_type: 'device',
  dvce_ismobile: 'dvce_ismobile',
  geo_timezone: 'geo_timezone',
  domain_sessionid: 'tealium_session_id',
  true_tstamp: 'tealium_timestamp_epoch'
}
const uuidFields = ['sso_guid', 'gr_master_person_id']
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

class TealiumEvent {
  constructor (event) {
    this.event = event
    this.data = this.event.data
  }

  get dataLayer () {
    return omitBy({
      ...this.standardParameters,
      ...this.identityParameters,
      ...transform(DataLayerMapping, (result, value, key) => {
        result[value] = this.event.data[key]
      }, {}),
    }, isNil)
  }

  get identityParameters () {
    const context = this.event.contexts
    const identityParams = {}
    if (context instanceof Context) {
      if (context.hasSchema(Context.SCHEMA_MOBILE)) {
        const data = context.dataFor(Context.SCHEMA_MOBILE)
        // https://github.com/snowplow/iglu-central/blob/master/schemas/com.snowplowanalytics.snowplow/mobile_context/jsonschema/1-0-1
        identityParams.device_idfa = head(compact(map(['androidIdfa', 'appleIdfa', 'appleIdfv', 'openIdfa'], field => {
          return data[field]
        })))
      }

      if (context.hasSchema(Context.SCHEMA_IDS)) {
        const data = context.dataFor(Context.SCHEMA_IDS)
        forEach(['sso_guid', 'gr_master_person_id', 'mcid'], field => {
          if (typeof data[field] !== 'undefined' && data[field]) {
            identityParams[field] = this.fieldValue(data[field], field)
          }
        })
      }
    }
    // Set tealium_visitor_id to the domain_userid or device_idfa, whichever is first present.
    identityParams.tealium_visitor_id = head(compact([this.event.data.domain_userid, identityParams.device_idfa]))

    return identityParams
  }

  get standardParameters () {
    return {
      tealium_account: 'udp',
      tealium_profile: 'main',
      tealium_datasource: 'snowplow'
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
