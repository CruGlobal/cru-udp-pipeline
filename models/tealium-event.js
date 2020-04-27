import { isNil, mapValues, omitBy } from 'lodash'

const DataLayerMapping = {
  app_name: 'property_name',
  platform: 'platform',
  event_name: 'event',
  event_id: 'event_id',
  client_ip: 'user_ipaddress',
  domain_userid: 'tealium_visitor_id',
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

class TealiumEvent {
  constructor (event) {
    this.event = event
    this.data = this.event.data
  }

  get dataLayer () {
    return omitBy({
      ...this.standardParameters,
      ...mapValues(DataLayerMapping, (v, k) => {
        return this.event[v]
      })
    }, isNil)
  }

  get standardParameters () {
    return {
      tealium_account: '',
      tealium_profile: '',
      tealium_datasource: ''
    }
  }
}

export default TealiumEvent
