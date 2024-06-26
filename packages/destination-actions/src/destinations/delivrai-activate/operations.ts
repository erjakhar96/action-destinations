import { RequestClient, ExecuteInput } from '@segment/actions-core'
import { createHash } from 'crypto'
import type { Payload as s3Payload } from './audienceEnteredS3/generated-types'
import type { Payload as sftpPayload } from './audienceEnteredSftp/generated-types'

// Type definitions
export type RawData = {
  context?: {
    personas?: {
      computation_key?: string
      computation_class?: string
      computation_id?: string
    }
  }
}

export type ProcessDataInput<T extends s3Payload | sftpPayload> = {
  request: RequestClient
  payloads: T[]
  features?: Record<string, boolean>
  rawData?: RawData[]
}

export type ExecuteInputRaw<Settings, Payload, RawData, AudienceSettings = unknown> = ExecuteInput<
  Settings,
  Payload,
  AudienceSettings
> & { rawData?: RawData }

/*
Generates the delivrai ingestion file. Expected format:
delivrai_audience_key[1],identifier_data[0..n]
*/
function generateFile(payloads: s3Payload[] | sftpPayload[] , RawData : RawData[] | []) {
  // Using a Set to keep track of headers
  //console.log(RawData);
  const headers = new Set<string>()
  headers.add('email')
  RawData.forEach(obj => {
    Object.assign(obj, payloads[0]);
  });

  // Declare rows as an empty Buffer
  let rows = Buffer.from('')

  // Prepare data rows
  for (let i = 0; i < RawData.length; i++) {
    const payload = RawData[i]
    const row: string[] = [enquoteIdentifier(payload.email)]

    // Process unhashed_identifier_data first
    if (payload.unhashed_identifier_data) {
      for (const key in payload.unhashed_identifier_data) {
        if (Object.prototype.hasOwnProperty.call(payload.unhashed_identifier_data, key)) {
          headers.add(key)
          row.push(`"${hash(normalize(key, String(payload.unhashed_identifier_data[key])))}"`)
        }
      }
    }

    // Process identifier_data, skipping keys that have already been processed
    if (payload.identifier_data) {
      for (const key in payload.identifier_data) {
        if (Object.prototype.hasOwnProperty.call(payload.identifier_data, key) && !headers.has(key)) {
          headers.add(key)
          row.push(enquoteIdentifier(String(payload.identifier_data[key])))
        }
      }
    }
  //  console.log(rows);
    rows = Buffer.concat([rows, Buffer.from(row.join(payload.delimiter) + (i + 1 === RawData.length ? '' : '\n'))])
  }

  // Add headers to the beginning of the file contents
  rows = Buffer.concat([Buffer.from(Array.from(headers).join(RawData[0].delimiter) + '\n'), rows])

  const filename = RawData[0].filename
  return { filename, fileContents: rows }
}

/*
  To avoid collision with delimeters, we should surround identifiers with quotation marks.
  https://docs.delivr.ai

  Examples:
  LCD TV -> "LCD TV"
  LCD TV,50" -> "LCD TV,50"""
*/
function enquoteIdentifier(identifier: string) {
  return `"${String(identifier).replace(/"/g, '""')}"`
}

const hash = (value: string): string => {
  const hash = createHash('sha256')
  hash.update(value)
  return hash.digest('hex')
}

/*
  Identifiers need to be hashed according to delivrai spec's:
  https://docs.delivr.ai
*/
const normalize = (key: string, value: string): string => {
  switch (key) {
    case 'phone_number': {
      // Remove all country extensions, parentheses, and hyphens before hashing.
      // For example, if the input phone number is "+1 (555) 123-4567", convert that to "5551234567" before hashing.

      // This regex matches the country code in the first group, and captures the remaining digits.
      // because the captures are optional, the regex works correctly even if some parts of the phone number are missing.
      const phoneRegex = /(?:\+1)?\s*\(?\s*(\d+)\s*-?\)?\s*(\d+)\s*-?\s*(\d+)/
      const match = phoneRegex.exec(value)
      if (!match || match.length < 4) return value

      // Drop the ALL capture. Return the rest of captures joined together.
      return match.slice(1).join('')
    }

    case 'email': {
      return value.toLowerCase().trim()
    }
  }

  return value
}

export { generateFile, enquoteIdentifier, normalize }
