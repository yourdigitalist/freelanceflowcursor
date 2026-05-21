export const CLIENT_CRM_STAGES = [
  { value: 'lead_new', label: 'New lead' },
  { value: 'lead_contacted', label: 'Contacted' },
  { value: 'lead_qualified', label: 'Qualified' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'closed_lost', label: 'Closed lost' },
] as const;

export function getClientStageLabel(value: string | null | undefined): string {
  const v = value || 'active';
  return CLIENT_CRM_STAGES.find((s) => s.value === v)?.label || v;
}
