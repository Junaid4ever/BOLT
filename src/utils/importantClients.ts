const IMPORTANT_CLIENTS_KEY = 'important_clients';

export const getImportantClients = (): Set<string> => {
  try {
    const stored = localStorage.getItem(IMPORTANT_CLIENTS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

export const toggleImportantClient = (clientId: string): boolean => {
  const important = getImportantClients();
  if (important.has(clientId)) {
    important.delete(clientId);
  } else {
    important.add(clientId);
  }
  localStorage.setItem(IMPORTANT_CLIENTS_KEY, JSON.stringify([...important]));
  return important.has(clientId);
};

export const isClientImportant = (clientId: string): boolean => {
  return getImportantClients().has(clientId);
};
