import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/components/RequireAuth";

/** All barbers owned by the signed-in shop (one shop -> many barbers). */
export function useMyBarbers() {
  const user = useAuthUser();
  return useQuery({
    queryKey: ["my_barbers", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("shop_id", user.id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}
