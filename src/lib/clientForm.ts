import { countrySelectValue } from '@/lib/locale-data';

export type ClientFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  tax_id: string;
  street: string;
  street2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  status: string;
  next_follow_up_at: string;
  lead_source: string;
  next_action: string;
  estimated_value: string;
  currency: string;
  notes: string;
};

type ClientLike = {
  first_name?: string | null;
  last_name?: string | null;
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  tax_id?: string | null;
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  status?: string | null;
  next_follow_up_at?: string | null;
  lead_source?: string | null;
  next_action?: string | null;
  estimated_value?: number | null;
  currency?: string | null;
  notes?: string | null;
};

export function emptyClientFormValues(
  defaultCurrency = 'USD',
  defaultStatus = 'active',
): ClientFormValues {
  return {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    tax_id: '',
    street: '',
    street2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'none',
    status: defaultStatus,
    next_follow_up_at: '',
    lead_source: '',
    next_action: '',
    estimated_value: '',
    currency: defaultCurrency,
    notes: '',
  };
}

export function clientToFormValues(
  client: ClientLike,
  defaultCurrency = 'USD',
): ClientFormValues {
  const first =
    client.first_name ||
    (client.name ? client.name.split(' ')[0] : '') ||
    '';
  const last =
    client.last_name ||
    (client.name ? client.name.split(' ').slice(1).join(' ') : '') ||
    '';

  return {
    first_name: first,
    last_name: last,
    email: client.email || '',
    phone: client.phone || '',
    company: client.company || '',
    tax_id: client.tax_id || '',
    street: client.street || '',
    street2: client.street2 || '',
    city: client.city || '',
    state: client.state || '',
    postal_code: client.postal_code || '',
    country: client.country || 'none',
    status: client.status || 'active',
    next_follow_up_at: client.next_follow_up_at
      ? client.next_follow_up_at.slice(0, 10)
      : '',
    lead_source: client.lead_source || '',
    next_action: client.next_action || '',
    estimated_value:
      client.estimated_value != null ? String(client.estimated_value) : '',
    currency: client.currency || defaultCurrency,
    notes: client.notes || '',
  };
}

export function buildClientDbPayload(
  values: ClientFormValues,
  options: {
    phone: string;
    avatar_color: string;
    logo_url: string | null;
    user_id?: string;
  },
) {
  const firstName = values.first_name.trim();
  const lastName = values.last_name.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const nextFollowUpAt = values.next_follow_up_at
    ? new Date(values.next_follow_up_at).toISOString()
    : null;
  const estimatedValue = values.estimated_value.trim()
    ? Number(values.estimated_value)
    : null;

  return {
    name: fullName,
    first_name: firstName || null,
    last_name: lastName || null,
    email: values.email.trim() || null,
    phone: options.phone.trim() || null,
    company: values.company.trim() || null,
    tax_id: values.tax_id.trim() || null,
    street: values.street.trim() || null,
    street2: values.street2.trim() || null,
    city: values.city.trim() || null,
    state: values.state.trim() || null,
    postal_code: values.postal_code.trim() || null,
    country: values.country === 'none' ? null : values.country || null,
    avatar_color: options.avatar_color,
    logo_url: options.logo_url,
    status: values.status,
    notes: values.notes.trim() || null,
    lead_source: values.lead_source.trim() || null,
    next_action: values.next_action.trim() || null,
    next_follow_up_at: nextFollowUpAt,
    estimated_value: estimatedValue,
    currency: values.currency || 'USD',
    ...(options.user_id ? { user_id: options.user_id } : {}),
  };
}

export type ClientAddressFields = {
  street?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  address?: string | null;
};

/** Single-line address from structured client fields (falls back to legacy `address`). */
export function composeStructuredAddress(fields: ClientAddressFields): string | null {
  const line = [
    fields.street,
    fields.street2,
    fields.city,
    fields.state,
    fields.postal_code,
    fields.country,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
  return line || fields.address?.trim() || null;
}

/** Snapshot client fields onto a new contract row. */
export function contractClientSnapshotFromClient(
  client: ClientAddressFields & {
    name?: string | null;
    company?: string | null;
    company_name?: string | null;
    entity_type?: string | null;
    company_registration?: string | null;
    email?: string | null;
    phone?: string | null;
    tax_id?: string | null;
  },
) {
  const street = client.street?.trim() || null;
  const street2 = client.street2?.trim() || null;
  const city = client.city?.trim() || null;
  const state = client.state?.trim() || null;
  const postal_code = client.postal_code?.trim() || null;
  const country = client.country?.trim() || null;
  const company = client.company?.trim() || client.company_name?.trim() || null;
  return {
    client_name: client.name?.trim() || null,
    client_company: company,
    client_company_name: company,
    client_entity_type: client.entity_type === "company" ? "company" : "individual",
    client_company_registration: client.company_registration?.trim() || null,
    client_email: client.email?.trim() || null,
    client_phone: client.phone?.trim() || null,
    client_tax_id: client.tax_id?.trim() || null,
    client_street: street,
    client_street2: street2,
    client_city: city,
    client_state: state,
    client_zip: postal_code,
    client_country: country,
    client_address: composeStructuredAddress({
      street,
      street2,
      city,
      state,
      postal_code,
      country,
      address: client.address,
    }),
  };
}

/** Stable snapshot for dirty-checking (country normalized like the save payload). */
export function clientFormSnapshot(values: ClientFormValues) {
  return JSON.stringify({
    ...values,
    phone: values.phone.trim(),
    country: countrySelectValue(values.country === 'none' ? null : values.country),
    estimated_value: values.estimated_value.trim()
      ? Number(values.estimated_value)
      : null,
  });
}
