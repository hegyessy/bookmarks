import * as supabase from "supabase";

export class Database {
  #client: supabase.SupabaseClient;

  constructor(client?: supabase.SupabaseClient) {
    this.#client = client ?? supabase.createClient(
      Deno.env.get("SUPABASE_API_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
  }

  async getBookmarks() {
    const { data } = await this.#client.from("bookmark").select();
    return data;
  }
  
  async getCategories() {
    const { data } = await this.#client.from("category").select();
    return data;
  }

}
