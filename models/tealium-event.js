import {
  compact,
  forEach,
  head,
  includes,
  isNil,
  map,
  mapValues,
  omitBy
} from 'lodash'
import Context from './context'

const DataLayerMapping = {
  app_name: 'property_name',
  platform: 'platform',
  event_name: 'event',
  event_id: 'event_id',
  client_ip: 'user_ipaddress',
  tealium_visitor_id: 'domain_userid',
  site_region: 'geo_region',
  customer_country: 'geo_country',
  customer_city: 'geo_city',
  customer_zip: 'geo_zipcode',
  'Current URL': 'page_url',
  'Page Title': 'page_title',
  'Referring URL': 'page_referrer',
  Pathname: 'page_urlpath',
  event_target: 'se_action',
  event_name: 'se_label',
  order_id: 'tr_orderid',
  order_total: 'tr_total',
  order_tax: 'tr_tax',
  order_shipping: 'tr_shipping',
  customer_city: 'tr_city',
  customer_state: 'tr_state',
  product_id: 'ti_sku',
  product_category: 'ti_category',
  product_unit_price: 'ti_price',
  product_quantity: 'ti_quantity',
  'user agent': 'useragent',
  os_name: 'os_name',
  model_name: 'os_family',
  device: 'dvce_type'
}
const uuidFields = ['network_userid', 'sso_guid', 'gr_master_person_id']
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
      ...mapValues(DataLayerMapping, (v, k) => {
        return this.event[v]
      })
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
  }

  fieldValue (value, field) {
    if (includes(uuidFields, field)) {
      return uuidPattern.test(value) ? value : /* istanbul ignore next */ undefined
    }
    return value
  }

  get standardParameters () {
    return {
      tealium_account: 'udp',
      tealium_profile: 'main',
      tealium_datasource: 'snowplow'
    }
  }
}

export default TealiumEvent
