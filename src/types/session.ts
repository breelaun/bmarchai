
export interface SessionWithVendor {
  id: string;
  name: string;
  description: string | null;
  start_time: string;
  duration: string;
  max_participants: number;
  completed_at: string | null;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  recording_id: string | null;
  vendor_profiles: Array<{
    business_name: string;
    profiles: Array<{
      username: string;
    }>;
  }>;
  // New streaming-related fields
  stream_key?: string;
  stream_url?: string;
  orientation?: 'landscape' | 'portrait';
  privacy?: 'public' | 'private' | 'practice';
  moderators?: string[];
  products?: Array<{
    id: string;
    name: string;
    price: number;
    variants?: Array<{
      size?: string;
      color?: string;
      quantity: number;
      price?: number;
    }>;
  }>;
  auction_items?: Array<{
    id: string;
    name: string;
    starting_bid: number;
    current_bid?: number;
    bidder_id?: string;
    end_time?: string;
  }>;
}

// Alias for backward compatibility with existing components
export type Session = SessionWithVendor;
