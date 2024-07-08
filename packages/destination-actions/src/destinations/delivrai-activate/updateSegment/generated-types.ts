// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
  /**
   * Segment Audience Id (aud_...). Maps to "Id" of a Segment node in Delivr AI taxonomy
   */
  segment_audience_id: string
  /**
   * Segment Audience Key. Maps to the "Name" of the Segment node in Delivr AI taxonomy
   */
  segment_audience_key: string

  /**
   * If true, batch requests to Delivr AI. Delivr AI accepts batches of up to 1000 events. If false, send each event individually.
   */
  enable_batching?: boolean
  /**
   * Maximum number of events to include in each batch. Actual batch sizes may be lower.
   */
  batch_size?: number,

  /**
   * Email address of a user
   */
  email?: string

}


export interface TokenEndPointResponse{
  data : object,
}