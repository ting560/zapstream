import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : new Proxy({} as any, {
      get(_target, prop) {
        if (prop === "from") return () => new Proxy({} as any, {
          get(_t, p) {
            if (["select", "insert", "delete", "order", "gte", "neq", "range"].includes(p as string)) {
              if (p === "select") return (s?: string, opts?: any) => Promise.resolve({ data: [], error: null, count: 0 });
              if (p === "insert") return (v: any, opts?: any) => Promise.resolve({ error: null, data: null });
              if (p === "delete") return () => new Proxy({} as any, {
                get(_t2, p2) { if (p2 === "neq") return () => Promise.resolve({ error: null, data: null }); return () => Promise.resolve({ error: null }); }
              });
              if (p === "order") return () => ({ range: () => Promise.resolve({ data: [], error: null }) });
              if (p === "range") return () => Promise.resolve({ data: [], error: null });
              return () => Promise.resolve({ data: [], error: null });
            }
            return () => Promise.resolve({ data: [], error: null });
          }
        });
        return () => ({ data: [], error: null });
      }
    });
