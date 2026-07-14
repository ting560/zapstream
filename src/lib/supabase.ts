import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function mockQuery() {
  return new Proxy({} as any, {
    get(_t: any, p: string) {
      if (p === "then") return (resolve: Function) => resolve({ data: [], error: null, count: 0 });
      if (["select", "insert", "delete", "order", "gte", "neq", "range", "limit", "single"].includes(p)) {
        return () => mockQuery();
      }
      return () => mockQuery();
    },
  });
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : new Proxy({} as any, {
      get(_target: any, prop: string) {
        if (prop === "from") return () => mockQuery();
        return () => mockQuery();
      },
    });
