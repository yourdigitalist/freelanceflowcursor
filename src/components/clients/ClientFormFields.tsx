import { ClientLogoEditor } from '@/components/clients/ClientLogoEditor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CLIENT_CRM_STAGES } from '@/lib/clientCrmStages';
import type { ClientFormValues } from '@/lib/clientForm';
import { currencies, countryOptions } from '@/lib/locale-data';

type ClientFormFieldsProps = {
  values: ClientFormValues;
  onChange: (patch: Partial<ClientFormValues>) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  logoPreviewUrl: string | null;
  onLogoPreviewChange: (url: string | null) => void;
  selectedAvatarColor: string;
  onSelectedAvatarColorChange: (color: string) => void;
  logoFileInputRef: React.RefObject<HTMLInputElement | null>;
  fallbackName: string;
  profileCurrency?: string;
  fieldIdPrefix?: string;
};

export function ClientFormFields({
  values,
  onChange,
  phone,
  onPhoneChange,
  logoPreviewUrl,
  onLogoPreviewChange,
  selectedAvatarColor,
  onSelectedAvatarColorChange,
  logoFileInputRef,
  fallbackName,
  profileCurrency = 'USD',
  fieldIdPrefix = 'client',
}: ClientFormFieldsProps) {
  const id = (name: string) => `${fieldIdPrefix}-${name}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id('first_name')}>First Name *</Label>
          <Input
            id={id('first_name')}
            value={values.first_name}
            onChange={(e) => onChange({ first_name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('last_name')}>Last Name *</Label>
          <Input
            id={id('last_name')}
            value={values.last_name}
            onChange={(e) => onChange({ last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id('email')}>Email *</Label>
          <Input
            id={id('email')}
            type="email"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('company')}>Company</Label>
          <Input
            id={id('company')}
            value={values.company}
            onChange={(e) => onChange({ company: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('phone')}>Phone</Label>
        <PhoneInput
          id={id('phone')}
          value={phone}
          onChange={onPhoneChange}
          placeholder="Phone number"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('tax_id')}>Tax Identification Number</Label>
        <Input
          id={id('tax_id')}
          value={values.tax_id}
          onChange={(e) => onChange({ tax_id: e.target.value })}
          placeholder="Tax ID / VAT number"
        />
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          value={values.street}
          onChange={(e) => onChange({ street: e.target.value })}
          placeholder="Street"
        />
      </div>
      <Input
        value={values.street2}
        onChange={(e) => onChange({ street2: e.target.value })}
        placeholder="Street 2"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          value={values.city}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder="City"
        />
        <Input
          value={values.state}
          onChange={(e) => onChange({ state: e.target.value })}
          placeholder="State/Province"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          value={values.postal_code}
          onChange={(e) => onChange({ postal_code: e.target.value })}
          placeholder="ZIP/Postal Code"
        />
        <Select
          value={values.country || 'none'}
          onValueChange={(value) => onChange({ country: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No country</SelectItem>
            {countryOptions.map((country) => (
              <SelectItem key={country.value} value={country.value}>
                {country.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('status')}>Status</Label>
        <Select value={values.status} onValueChange={(value) => onChange({ status: value })}>
          <SelectTrigger id={id('status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_CRM_STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id('next_follow_up_at')}>Next follow-up</Label>
          <Input
            id={id('next_follow_up_at')}
            type="date"
            value={values.next_follow_up_at}
            onChange={(e) => onChange({ next_follow_up_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('lead_source')}>Lead source</Label>
          <Input
            id={id('lead_source')}
            placeholder="e.g. Referral, Website, Upwork"
            value={values.lead_source}
            onChange={(e) => onChange({ lead_source: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('next_action')}>Next action</Label>
        <Input
          id={id('next_action')}
          placeholder="e.g. Send proposal, Follow up on invoice"
          value={values.next_action}
          onChange={(e) => onChange({ next_action: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id('estimated_value')}>Estimated value</Label>
          <Input
            id={id('estimated_value')}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={values.estimated_value}
            onChange={(e) => onChange({ estimated_value: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('currency')}>Currency</Label>
          <Select
            value={values.currency || profileCurrency}
            onValueChange={(value) => onChange({ currency: value })}
          >
            <SelectTrigger id={id('currency')}>
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.value} value={currency.value}>
                  {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ClientLogoEditor
        previewUrl={logoPreviewUrl}
        onPreviewChange={onLogoPreviewChange}
        selectedColor={selectedAvatarColor}
        onSelectedColorChange={onSelectedAvatarColorChange}
        fallbackName={fallbackName}
        fileInputRef={logoFileInputRef}
      />

      <div className="space-y-2">
        <Label htmlFor={id('notes')}>Notes</Label>
        <Textarea
          id={id('notes')}
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          placeholder="Internal notes about this client..."
        />
      </div>
    </div>
  );
}
