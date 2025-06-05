import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Server-side Supabase client with service role key (for admin operations)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Database types for type-safe queries
export type Database = {
  public: {
    Tables: {
      aircraft: {
        Row: {
          id: string;
          tail_number: string;
          make: string;
          model: string;
          serial_number: string;
          year_of_manufacture: number;
          total_aircraft_time: number;
          total_cycles: number;
          is_active: boolean;
          certificate_of_airworthiness: string | null;
          last_inspection_date: string;
          next_inspection_due: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tail_number: string;
          make: string;
          model: string;
          serial_number: string;
          year_of_manufacture: number;
          total_aircraft_time?: number;
          total_cycles?: number;
          is_active?: boolean;
          certificate_of_airworthiness?: string | null;
          last_inspection_date: string;
          next_inspection_due: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tail_number?: string;
          make?: string;
          model?: string;
          serial_number?: string;
          year_of_manufacture?: number;
          total_aircraft_time?: number;
          total_cycles?: number;
          is_active?: boolean;
          certificate_of_airworthiness?: string | null;
          last_inspection_date?: string;
          next_inspection_due?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      maintenance_intervals: {
        Row: {
          id: string;
          aircraft_id: string;
          interval_type: string;
          description: string;
          interval_hours: number | null;
          interval_cycles: number | null;
          interval_calendar: number | null;
          last_completed_at: string | null;
          last_completed_hours: number | null;
          next_due_at: string;
          next_due_hours: number;
          is_overdue: boolean;
          priority: string;
          estimated_downtime: number;
          estimated_cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          aircraft_id: string;
          interval_type: string;
          description: string;
          interval_hours?: number | null;
          interval_cycles?: number | null;
          interval_calendar?: number | null;
          last_completed_at?: string | null;
          last_completed_hours?: number | null;
          next_due_at: string;
          next_due_hours: number;
          is_overdue?: boolean;
          priority: string;
          estimated_downtime: number;
          estimated_cost: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          aircraft_id?: string;
          interval_type?: string;
          description?: string;
          interval_hours?: number | null;
          interval_cycles?: number | null;
          interval_calendar?: number | null;
          last_completed_at?: string | null;
          last_completed_hours?: number | null;
          next_due_at?: string;
          next_due_hours?: number;
          is_overdue?: boolean;
          priority?: string;
          estimated_downtime?: number;
          estimated_cost?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      work_orders: {
        Row: {
          id: string;
          aircraft_id: string;
          work_order_number: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          category: string;
          mechanic_assigned: string | null;
          inspector_assigned: string | null;
          estimated_hours: number;
          actual_hours: number | null;
          created_at: string;
          scheduled_start_date: string;
          actual_start_date: string | null;
          completed_date: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          aircraft_id: string;
          work_order_number: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          category: string;
          mechanic_assigned?: string | null;
          inspector_assigned?: string | null;
          estimated_hours: number;
          actual_hours?: number | null;
          created_at?: string;
          scheduled_start_date: string;
          actual_start_date?: string | null;
          completed_date?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          aircraft_id?: string;
          work_order_number?: string;
          title?: string;
          description?: string;
          status?: string;
          priority?: string;
          category?: string;
          mechanic_assigned?: string | null;
          inspector_assigned?: string | null;
          estimated_hours?: number;
          actual_hours?: number | null;
          created_at?: string;
          scheduled_start_date?: string;
          actual_start_date?: string | null;
          completed_date?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}; 