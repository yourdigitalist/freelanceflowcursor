import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, ChevronDown } from 'lucide-react';
import {
  currencies,
  currencyDisplayFormats,
  numberFormats,
  dateFormats,
  timeFormats,
  timezones,
  getBrowserTimezone,
  getBrowserCountry,
  countryToCurrency,
  countryToNumberFormat,
} from '@/lib/locale-data';

interface LocaleProfile {
  currency: string | null;
  currency_display: string | null;
  date_format: string | null;
  time_format: string | null;
  timezone: string | null;
}

export default function LocaleSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [currency, setCurrency] = useState('USD');
  const [currencyDisplay, setCurrencyDisplay] = useState('symbol');
  const [numberFormat, setNumberFormat] = useState('1,234.56');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12h');
  const [timezone, setTimezone] = useState('UTC');
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency, currency_display, date_format, time_format, timezone')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCurrency(data.currency || getDefaultCurrency());
        setCurrencyDisplay(data.currency_display || 'symbol');
        setDateFormat(data.date_format || 'MM/DD/YYYY');
        setTimeFormat(data.time_format || '12h');
        setTimezone(data.timezone || getBrowserTimezone());
      } else {
        // Auto-detect settings for new users
        autoDetectSettings();
      }
    } catch (error) {
      console.error('Error fetching locale settings:', error);
      autoDetectSettings();
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCurrency = (): string => {
    const country = getBrowserCountry();
    if (country && countryToCurrency[country]) {
      return countryToCurrency[country];
    }
    return 'USD';
  };

  const autoDetectSettings = () => {
    const country = getBrowserCountry();
    
    // Set currency based on detected country
    if (country && countryToCurrency[country]) {
      setCurrency(countryToCurrency[country]);
    }
    
    // Set number format based on detected country
    if (country && countryToNumberFormat[country]) {
      setNumberFormat(countryToNumberFormat[country]);
    }
    
    // Set timezone from browser
    setTimezone(getBrowserTimezone());
    
    // Set date/time format based on region
    if (country === 'US') {
      setDateFormat('MM/DD/YYYY');
      setTimeFormat('12h');
    } else if (['GB', 'AU', 'NZ', 'IN'].includes(country || '')) {
      setDateFormat('DD/MM/YYYY');
      setTimeFormat('24h');
    } else {
      setDateFormat('DD/MM/YYYY');
      setTimeFormat('24h');
    }
  };

  const handleDetectSettings = () => {
    autoDetectSettings();
    toast({ title: 'Settings detected from your browser' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          currency,
          currency_display: currencyDisplay,
          date_format: dateFormat,
          time_format: timeFormat,
          timezone,
        })
        .eq('user_id', user!.id);

      if (error) throw error;
      toast({ title: 'Locale settings saved successfully' });
    } catch (error: any) {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Auto-detect button */}
      <Card className="border-0 shadow-sm bg-secondary/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Auto-detect settings</p>
                <p className="text-sm text-muted-foreground">
                  Detect timezone and regional settings from your browser
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={handleDetectSettings}>
              Detect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>Configure how currency values are displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[300px]">
                    {currencies.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency_display">Display Format</Label>
              <Select value={currencyDisplay} onValueChange={setCurrencyDisplay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyDisplayFormats.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="number_format">Number Format</Label>
            <Select value={numberFormat} onValueChange={setNumberFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {numberFormats.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines how numbers like 1,000.00 or 1.000,00 are displayed
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
          <CardDescription>Set your preferred date and time formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_format">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time_format">Time Format</Label>
              <Select value={timeFormat} onValueChange={setTimeFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeFormats.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {timezones.find((tz) => tz.value === timezone)?.label ?? timezone}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search timezone..." />
                  <CommandList>
                    <CommandEmpty>No timezone found.</CommandEmpty>
                    {timezones.map((tz) => (
                      <CommandItem
                        key={tz.value}
                        value={`${tz.label} ${tz.value} ${tz.offset}`}
                        onSelect={() => {
                          setTimezone(tz.value);
                          setTimezoneOpen(false);
                        }}
                      >
                        <span className="truncate">{tz.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{tz.offset}</span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}
