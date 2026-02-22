import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Gift, Plus, RefreshCw, Download, CheckCircle, XCircle, Clock } from 'lucide-react';

const GeradorGiftCard = () => {
  const [formData, setFormData] = useState({
    quantidade: 1,
    valor: '29.90',
    descricao: ''
  });
  const [loading, setLoading] = useState(false);
  const [giftCards, setGiftCards] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    redeemed: 0,
    invalid: 0
  });

  useEffect(() => {
    loadGiftCards();
    loadStats();
  }, []);

  const loadGiftCards = async () => {
    try {
      const response = await axios.get('/api/admin/giftcards/listar');
      setGiftCards(response.data);
    } catch (error) {
      console.warn('Erro ao carregar gift cards:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/admin/giftcards/stats');
      setStats(response.data);
    } catch (error) {
      console.warn('Erro ao carregar stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.quantidade || !formData.valor || !formData.descricao) {
      alert('Preencha todos os campos');
      return;
    }

    if (formData.quantidade < 1 || formData.quantidade > 100) {
      alert('Quantidade deve estar entre 1 e 100');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/admin/giftcards/gerar-manual', formData);
      
      alert(response.data.message);
      setFormData({
        quantidade: 1,
        valor: '29.90',
        descricao: ''
      });
      
      loadGiftCards();
      loadStats();
    } catch (error) {
      alert('Erro ao gerar Gift Cards: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidar = async (code) => {
    if (!window.confirm(`Tem certeza que deseja invalidar o Gift Card ${code}?`)) {
      return;
    }

    try {
      await axios.post(`/api/admin/giftcards/${code}/invalidar`);
      alert('Gift Card invalidado com sucesso');
      loadGiftCards();
      loadStats();
    } catch (error) {
      alert('Erro ao invalidar Gift Card: ' + (error.response?.data?.detail || 'Erro interno'));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'new': 'bg-green-100 text-green-800',
      'used': 'bg-blue-100 text-blue-800',
      'invalid': 'bg-red-100 text-red-800'
    };
    
    const icons = {
      'new': CheckCircle,
      'used': Gift,
      'invalid': XCircle
    };
    
    const Icon = icons[status] || Clock;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status === 'new' ? 'Novo' : 
         status === 'used' ? 'Resgatado' : 
         status === 'invalid' ? 'Invalidado' : status}
      </span>
    );
  };

  const exportarGiftCards = () => {
    const csvContent = [
      ['Código', 'Valor', 'Status', 'Data Criação', 'Data Resgate'],
      ...giftCards.map(card => [
        card.code,
        card.value.toFixed(2),
        card.status,
        new Date(card.created_at).toLocaleString('pt-BR'),
        card.redeemed_at ? new Date(card.redeemed_at).toLocaleString('pt-BR') : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gift_cards_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerador de Gift Cards</h1>
        <p className="text-gray-600 mt-1">Crie Gift Cards manualmente para seus clientes</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <Gift className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-lg p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Novos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <Gift className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resgatados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.redeemed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-lg p-3">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Invalidados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.invalid}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Geração */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Gerar Novos Gift Cards</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.quantidade}
                onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="1-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({...formData, valor: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="29.90"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Gift Cards promocionais"
                required
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Gerar Gift Cards</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => loadGiftCards()}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Atualizar</span>
            </button>
            <button
              type="button"
              onClick={exportarGiftCards}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </form>
      </div>


      {/* Lista de Gift Cards */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Gift Cards Gerados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Criação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {giftCards.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {card.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {card.value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(card.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(card.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {card.status === 'new' && (
                      <button
                        onClick={() => handleInvalidar(card.code)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Invalidar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GeradorGiftCard;
