
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
  // Streaming-related fields
  stream_key?: string;
  stream_url?: string;
  orientation?: 'landscape' | 'portrait';
  privacy?: 'public' | 'private' | 'practice';
  moderators?: string[];
  session_type?: 'free' | 'paid';
  price?: number;
  session_participants?: Array<{
    id: string;
    user_id: string;
    has_completed: boolean;
    rating: number | null;
    tip_amount: number | null;
    payment_method: string;
    payment_status: string;
    payment_confirmed_at: string | null;
    payment_confirmed_by: string | null;
    payment_notes: string | null;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  }>;
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
