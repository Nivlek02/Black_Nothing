export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agenda_tasks: {
        Row: {
          color: string
          completed: boolean
          created_at: string
          date: string
          description: string | null
          end_time: string
          id: string
          notified: boolean
          reminder_minutes: number
          start_time: string
          title: string
        }
        Insert: {
          color?: string
          completed?: boolean
          created_at?: string
          date: string
          description?: string | null
          end_time: string
          id?: string
          notified?: boolean
          reminder_minutes?: number
          start_time: string
          title: string
        }
        Update: {
          color?: string
          completed?: boolean
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string
          id?: string
          notified?: boolean
          reminder_minutes?: number
          start_time?: string
          title?: string
        }
        Relationships: []
      }
      atm_withdrawals: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          source: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          source?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "atm_withdrawals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          created_at: string
          id: string
          initial_balance: number
          name: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          initial_balance?: number
          name: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          initial_balance?: number
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      bank_transfers: {
        Row: {
          id: string
          from_account_id: string
          to_account_id: string
          amount: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          from_account_id: string
          to_account_id: string
          amount: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          from_account_id?: string
          to_account_id?: string
          amount?: number
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          transaction_type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          id: string
          notes: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          debt_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          created_at: string
          due_date: string
          id: string
          name: string
          notes: string | null
          remaining_amount: number
          start_date: string
          status: string
          total_amount: number
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          name: string
          notes?: string | null
          remaining_amount: number
          start_date: string
          status?: string
          total_amount: number
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          notes?: string | null
          remaining_amount?: number
          start_date?: string
          status?: string
          total_amount?: number
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_type: string
          id: string
          payment_method: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string
          created_at?: string
          description?: string | null
          expense_type?: string
          id?: string
          payment_method?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_type?: string
          id?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          payment_method: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          requirement_id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          requirement_id: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          requirement_id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_attachments_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "pm_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_requirements: {
        Row: {
          areas: string | null
          business_goal: string | null
          client: string | null
          complexity: string | null
          created_at: string
          dependencies: string | null
          description: string | null
          id: string
          impact: string | null
          name: string
          observations: string | null
          priority: Database["public"]["Enums"]["pm_priority"]
          request_date: string
          risks: string | null
          status: Database["public"]["Enums"]["pm_status"]
          updated_at: string
        }
        Insert: {
          areas?: string | null
          business_goal?: string | null
          client?: string | null
          complexity?: string | null
          created_at?: string
          dependencies?: string | null
          description?: string | null
          id?: string
          impact?: string | null
          name: string
          observations?: string | null
          priority?: Database["public"]["Enums"]["pm_priority"]
          request_date?: string
          risks?: string | null
          status?: Database["public"]["Enums"]["pm_status"]
          updated_at?: string
        }
        Update: {
          areas?: string | null
          business_goal?: string | null
          client?: string | null
          complexity?: string | null
          created_at?: string
          dependencies?: string | null
          description?: string | null
          id?: string
          impact?: string | null
          name?: string
          observations?: string | null
          priority?: Database["public"]["Enums"]["pm_priority"]
          request_date?: string
          risks?: string | null
          status?: Database["public"]["Enums"]["pm_status"]
          updated_at?: string
        }
        Relationships: []
      }
      pm_tasks: {
        Row: {
          assignee: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          kind: Database["public"]["Enums"]["pm_task_kind"]
          parent_id: string | null
          priority: Database["public"]["Enums"]["pm_priority"]
          requirement_id: string
          sort_order: number
          status: Database["public"]["Enums"]["pm_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          kind: Database["public"]["Enums"]["pm_task_kind"]
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["pm_priority"]
          requirement_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["pm_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["pm_task_kind"]
          parent_id?: string | null
          priority?: Database["public"]["Enums"]["pm_priority"]
          requirement_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["pm_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pm_tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "pm_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pm_tasks_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "pm_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      life_areas: {
        Row: {
          id: string
          name: string
          color: string
          weight: number
          order: number
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          color?: string
          weight?: number
          order?: number
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          weight?: number
          order?: number
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      life_ratings: {
        Row: {
          id: string
          area_id: string
          score: number
          date: string
          source: string
          note: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          area_id: string
          score: number
          date?: string
          source?: string
          note?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          area_id?: string
          score?: number
          date?: string
          source?: string
          note?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_ratings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      life_goals: {
        Row: {
          id: string
          area_id: string
          title: string
          status: string
          impact: number
          target_date: string | null
          created_at: string
          completed_at: string | null
          user_id: string | null
          updated_at: string
        }
        Insert: {
          id: string
          area_id: string
          title: string
          status?: string
          impact?: number
          target_date?: string | null
          created_at?: string
          completed_at?: string | null
          user_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          area_id?: string
          title?: string
          status?: string
          impact?: number
          target_date?: string | null
          created_at?: string
          completed_at?: string | null
          user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_goals_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      life_subtasks: {
        Row: {
          id: string
          goal_id: string
          title: string
          done: boolean
          created_at: string
          user_id: string | null
        }
        Insert: {
          id: string
          goal_id: string
          title: string
          done?: boolean
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          goal_id?: string
          title?: string
          done?: boolean
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "life_subtasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "life_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      life_habits: {
        Row: {
          id: string
          area_id: string
          title: string
          cadence: string
          target_per_week: number | null
          positive: boolean
          created_at: string
          archived: boolean
          user_id: string | null
          updated_at: string
        }
        Insert: {
          id: string
          area_id: string
          title: string
          cadence?: string
          target_per_week?: number | null
          positive?: boolean
          created_at?: string
          archived?: boolean
          user_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          area_id?: string
          title?: string
          cadence?: string
          target_per_week?: number | null
          positive?: boolean
          created_at?: string
          archived?: boolean
          user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "life_habits_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "life_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      life_habit_logs: {
        Row: {
          id: string
          habit_id: string
          date: string
          done: boolean
          created_at: string
          user_id: string | null
        }
        Insert: {
          id: string
          habit_id: string
          date: string
          done?: boolean
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          habit_id?: string
          date?: string
          done?: boolean
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "life_habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "life_habits"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys_auth: string
          keys_p256dh: string
          reminder_minutes: number
          timezone: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys_auth: string
          keys_p256dh: string
          reminder_minutes?: number
          timezone?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys_auth?: string
          keys_p256dh?: string
          reminder_minutes?: number
          timezone?: string
        }
        Relationships: []
      }
      savings: {
        Row: {
          created_at: string
          current_amount: number
          id: string
          name: string
          notes: string | null
          target_amount: number
        }
        Insert: {
          created_at?: string
          current_amount?: number
          id?: string
          name: string
          notes?: string | null
          target_amount?: number
        }
        Update: {
          created_at?: string
          current_amount?: number
          id?: string
          name?: string
          notes?: string | null
          target_amount?: number
        }
        Relationships: []
      }
      savings_movements: {
        Row: {
          amount: number
          created_at: string
          id: string
          movement_type: string
          notes: string | null
          savings_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          movement_type?: string
          notes?: string | null
          savings_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          movement_type?: string
          notes?: string | null
          savings_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_movements_savings_id_fkey"
            columns: ["savings_id"]
            isOneToOne: false
            referencedRelation: "savings"
            referencedColumns: ["id"]
          },
        ]
      }
      special_dates: {
        Row: {
          color: string
          created_at: string
          date: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          date: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          date?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      upcoming_payments: {
        Row: {
          amount: number
          category: string
          created_at: string
          due_date: string
          frequency: string
          id: string
          is_paid: boolean
          name: string
          notes: string | null
          recurrence_end: string | null
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          due_date: string
          frequency?: string
          id?: string
          is_paid?: boolean
          name: string
          notes?: string | null
          recurrence_end?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          due_date?: string
          frequency?: string
          id?: string
          is_paid?: boolean
          name?: string
          notes?: string | null
          recurrence_end?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      pm_priority: "alta" | "media" | "baja"
      pm_status:
        | "pendiente"
        | "en_analisis"
        | "listo_dev"
        | "en_desarrollo"
        | "en_qa"
        | "en_revision"
        | "aprobado"
        | "desplegado"
        | "cancelado"
      pm_task_kind: "epic" | "story" | "task" | "subtask"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      pm_priority: ["alta", "media", "baja"],
      pm_status: [
        "pendiente",
        "en_analisis",
        "listo_dev",
        "en_desarrollo",
        "en_qa",
        "en_revision",
        "aprobado",
        "desplegado",
        "cancelado",
      ],
      pm_task_kind: ["epic", "story", "task", "subtask"],
    },
  },
} as const
