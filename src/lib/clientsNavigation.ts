export type ClientsViewMode = 'grid' | 'list' | 'board';

export type ClientsNavState = {
  clientsReturnTo: string;
  clientsViewMode: ClientsViewMode;
};

/** List path for the current clients index route (CRM, all, or active). */
export function getClientsReturnPath(pathname: string): string {
  if (pathname === '/clients/active') return '/clients/active';
  if (pathname === '/clients/list') return '/clients/list';
  return '/clients';
}

export function buildClientsNavState(
  pathname: string,
  viewMode: ClientsViewMode,
): ClientsNavState {
  return {
    clientsReturnTo: getClientsReturnPath(pathname),
    clientsViewMode: viewMode,
  };
}

export function readClientsNavState(state: unknown): ClientsNavState | null {
  if (!state || typeof state !== 'object') return null;
  const s = state as Partial<ClientsNavState>;
  if (typeof s.clientsReturnTo !== 'string' || !s.clientsReturnTo.startsWith('/clients')) {
    return null;
  }
  const mode = s.clientsViewMode;
  if (mode !== 'grid' && mode !== 'list' && mode !== 'board') return null;
  return { clientsReturnTo: s.clientsReturnTo, clientsViewMode: mode };
}

/** True for `/clients/:id` detail pages (not list/active index routes). */
export function isClientDetailPath(pathname: string): boolean {
  if (!pathname.startsWith('/clients/')) return false;
  if (pathname === '/clients/list' || pathname === '/clients/active') return false;
  return pathname.length > '/clients/'.length;
}
