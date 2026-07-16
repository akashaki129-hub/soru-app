export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      chef_enrollments: {
        Row: {
          comments: string | null;
          created_at: string;
          email: string;
          id: string;
          name: string;
          phone: string;
          role: Database["public"]["Enums"]["chef_role"];
        };
        Insert: {
          comments?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          name: string;
          phone: string;
          role: Database["public"]["Enums"]["chef_role"];
        };
        Update: {
          comments?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          phone?: string;
          role?: Database["public"]["Enums"]["chef_role"];
        };
        Relationships: [];
      };
      customer_enrollments: {
        Row: {
          comments: string | null;
          created_at: string;
          email: string;
          id: string;
          name: string;
          phone: string;
          preferred_service: string;
        };
        Insert: {
          comments?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          name: string;
          phone: string;
          preferred_service: string;
        };
        Update: {
          comments?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          phone?: string;
          preferred_service?: string;
        };
        Relationships: [];
      };
      market_research_responses: {
        Row: {
          audience: string;
          chef_start_timeline: string | null;
          chef_support_needs: string[];
          city: string;
          client_submission_id: string;
          comments: string | null;
          contact: string | null;
          created_at: string;
          customer_monthly_budget: string | null;
          customer_order_frequency: string | null;
          full_name: string | null;
          id: string;
          source: string;
          statements: string[];
        };
        Insert: {
          audience: string;
          chef_start_timeline?: string | null;
          chef_support_needs?: string[];
          city: string;
          client_submission_id: string;
          comments?: string | null;
          contact: string;
          created_at?: string;
          customer_monthly_budget?: string | null;
          customer_order_frequency?: string | null;
          full_name: string;
          id?: string;
          source?: string;
          statements: string[];
        };
        Update: {
          audience?: string;
          chef_start_timeline?: string | null;
          chef_support_needs?: string[];
          city?: string;
          client_submission_id?: string;
          comments?: string | null;
          contact?: string | null;
          created_at?: string;
          customer_monthly_budget?: string | null;
          customer_order_frequency?: string | null;
          full_name?: string | null;
          id?: string;
          source?: string;
          statements?: string[];
        };
        Relationships: [];
      };
      notification_events: {
        Row: {
          attempts: number;
          created_at: string;
          dedupe_key: string;
          email_status: string;
          event_type: string;
          id: string;
          last_error: string | null;
          next_attempt_at: string;
          payload: Json;
          processed_at: string | null;
          record_id: string | null;
          whatsapp_status: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          dedupe_key: string;
          email_status?: string;
          event_type: string;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload: Json;
          processed_at?: string | null;
          record_id?: string | null;
          whatsapp_status?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          dedupe_key?: string;
          email_status?: string;
          event_type?: string;
          id?: string;
          last_error?: string | null;
          next_attempt_at?: string;
          payload?: Json;
          processed_at?: string | null;
          record_id?: string | null;
          whatsapp_status?: string;
        };
        Relationships: [];
      };
      site_visits: {
        Row: {
          id: string;
          path: string;
          referrer_host: string | null;
          session_id: string;
          visited_at: string;
          visitor_id: string;
        };
        Insert: {
          id?: string;
          path: string;
          referrer_host?: string | null;
          session_id: string;
          visited_at?: string;
          visitor_id: string;
        };
        Update: {
          id?: string;
          path?: string;
          referrer_host?: string | null;
          session_id?: string;
          visited_at?: string;
          visitor_id?: string;
        };
        Relationships: [];
      };
      waitlist_entries: {
        Row: {
          city: string;
          comments: string | null;
          created_at: string;
          email: string;
          id: string;
          name: string;
          phone: string;
          role: string;
        };
        Insert: {
          city: string;
          comments?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          name: string;
          phone: string;
          role: string;
        };
        Update: {
          city?: string;
          comments?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          phone?: string;
          role?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      chef_role: "chef" | "homemaker" | "culinary_student" | "professional_chef" | "freelancer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      chef_role: ["chef", "homemaker", "culinary_student", "professional_chef", "freelancer"],
    },
  },
} as const;
