// Sessões mock reutilizáveis
export const sessions = {
  unauthenticated: null,

  admin: {
    user: { id: 'admin-1', name: 'Admin', email: 'admin@arena.com', role: 'ADMIN' as const },
  },

  manager: {
    user: { id: 'manager-1', name: 'Manager', email: 'manager@arena.com', role: 'MANAGER' as const },
  },

  client: {
    user: { id: 'client-1', name: 'Cliente A', email: 'clienta@email.com', role: 'CLIENT' as const },
  },

  otherClient: {
    user: { id: 'client-2', name: 'Cliente B', email: 'clientb@email.com', role: 'CLIENT' as const },
  },
}

// Cria um Request JSON com método e body
export function jsonReq(url: string, method: string, body: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Cria um GET Request
export function getReq(url: string): Request {
  return new Request(`http://localhost${url}`)
}

// Extrai JSON da resposta
export async function json(res: Response) {
  return res.json()
}
