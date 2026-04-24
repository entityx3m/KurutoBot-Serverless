export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          discord_id: string;
          discord_name: string;
          main_account_tag: string | null;
          recruited_at: string | null;
          recruited_by: string | null;
          recruiter_name: string | null;
          clan: string | null;
          nickname: string | null;
          last_updated: string | null;
        };
        Insert: {
          discord_id: string;
          discord_name: string;
          main_account_tag?: string | null;
          recruited_at?: string | null;
          recruited_by?: string | null;
          recruiter_name?: string | null;
          clan?: string | null;
          nickname?: string | null;
          last_updated?: string | null;
        };
        Update: {
          discord_id?: string;
          discord_name?: string;
          main_account_tag?: string | null;
          recruited_at?: string | null;
          recruited_by?: string | null;
          recruiter_name?: string | null;
          clan?: string | null;
          nickname?: string | null;
          last_updated?: string | null;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          player_tag: string;
          discord_id: string | null;
          player_name: string;
          town_hall_level: number;
          exp_level: number;
          league_tier: Json | null;
          clan_info: Json | null;
          role: string | null;
          war_preference: string | null;
          is_main: boolean | null;
          linked_at: string | null;
          linked_by: string | null;
        };
        Insert: {
          player_tag: string;
          discord_id?: string | null;
          player_name: string;
          town_hall_level: number;
          exp_level: number;
          league_tier?: Json | null;
          clan_info?: Json | null;
          role?: string | null;
          war_preference?: string | null;
          is_main?: boolean | null;
          linked_at?: string | null;
          linked_by?: string | null;
        };
        Update: {
          player_tag?: string;
          discord_id?: string | null;
          player_name?: string;
          town_hall_level?: number;
          exp_level?: number;
          league_tier?: Json | null;
          clan_info?: Json | null;
          role?: string | null;
          war_preference?: string | null;
          is_main?: boolean | null;
          linked_at?: string | null;
          linked_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_discord_id_fkey";
            columns: ["discord_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["discord_id"];
          },
        ];
      };
      clans: {
        Row: {
          clan_tag: string;
          clan_name: string;
          abbreviation: string;
          category: string;
          clan_channel_id: string | null;
          clan_role_id: string | null;
          member_count: number;
          last_updated: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          clan_tag: string;
          clan_name: string;
          abbreviation: string;
          category: string;
          clan_channel_id?: string | null;
          clan_role_id?: string | null;
          member_count?: number;
          last_updated?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          clan_tag?: string;
          clan_name?: string;
          abbreviation?: string;
          category?: string;
          clan_channel_id?: string | null;
          clan_role_id?: string | null;
          member_count?: number;
          last_updated?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}