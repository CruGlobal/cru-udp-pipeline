import {
  get,
  isNil,
  omitBy,
  transform
} from 'lodash'

const BigQueryMapping = {
  id: ['_id'],
  network_userids: ['property_sets', 'network_userid_array'],
  sso_guid: ['secondary_ids', '5004'],
  gr_master_person_id: ['secondary_ids', '5002'],
  mcid: ['secondary_ids', '5136'],
  device_idfa: ['secondary_ids', '5099'],
  email_address: ['secondary_ids', '5242'],
  badges: ['badges'],
  audiences: ['audiences'],
  properties: ['properties']
}

const JSONAttributes = ['properties']

class Audience {
  constructor (data) {
    try {
      this.message = JSON.parse(Buffer.from(data, 'base64').toString('utf8'))
    } catch (e) {
      throw new InvalidAudienceError('Malformed audience message: ' + e.message)
    }
  }

  get bigQueryRow () {
    return omitBy({
      ...transform(BigQueryMapping, (result, path, key) => {
        const value = get(this.message, path, undefined)
        // console.log(`${key} (${JSON.stringify(path)}) = ${value}`)
        result[key] = JSONAttributes.includes(key) ? JSON.stringify(value) : value
      }, {})
    }, isNil)
  }
}

class InvalidAudienceError extends Error {}

Audience.InvalidAudienceError = InvalidAudienceError

export default Audience
