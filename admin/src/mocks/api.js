// Mock API para testes offline
export const mockStats = {
  totalUsuarios: 150,
  usuariosAtivos: 89,
  totalGiftCards: 450,
  giftCardsUsados: 312,
  receitaMes: 8750.50
};

export const mockGiftCards = [
  {
    id: 1,
    code: 'GIFT-ABC123',
    value: 29.90,
    status: 'new',
    created_at: '2024-01-15T10:30:00Z',
    batch_id: 1
  },
  {
    id: 2,
    code: 'GIFT-DEF456',
    value: 49.90,
    status: 'used',
    created_at: '2024-01-14T15:20:00Z',
    batch_id: 1
  }
];

export const mockClientes = [
  {
    id: 1,
    email: 'cliente1@example.com',
    nome: 'Cliente Teste 1',
    status: 'active',
    plano: 'mensal',
    data_criacao: '2024-01-10T08:00:00Z'
  }
];
