import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DEFAULT_DATE_FORMAT, DEFAULT_TIME_FORMAT } from "@/lib/datetime";

type LocalePreferences = {
  dateFormat: string;
  timeFormat: string;
};

export function useLocalePreferences(): LocalePreferences {
  const { user } = useAuth();
  const [dateFormat, setDateFormat] = useState<string>(DEFAULT_DATE_FORMAT);
  const [timeFormat, setTimeFormat] = useState<string>(DEFAULT_TIME_FORMAT);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("date_format, time_format")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const prefs = data as { date_format?: string | null; time_format?: string | null } | null;
      setDateFormat(prefs?.date_format || DEFAULT_DATE_FORMAT);
      setTimeFormat(prefs?.time_format || DEFAULT_TIME_FORMAT);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { dateFormat, timeFormat };
}
