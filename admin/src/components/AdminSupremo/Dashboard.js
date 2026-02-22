import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, CreditCard, Gift, TrendingUp, Activity } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    usuariosAtivos: 0,
    totalGiftCards: 0,
    giftCardsUsados: 0,
    receitaMes: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setError(false);
    try {
      const [usuariosResponse, giftCardsResponse] = await Promise.all([
        axios.get('/api/admin/stats/usuarios'),
        axios.get('/api/admin/stats/giftcards')
      ]);

      setStats({
        totalUsuarios: usuariosResponse.data.total || 0,
        usuariosAtivos: usuariosResponse.data.ativos || 0,
        totalGiftCards: giftCardsResponse.data.total || 0,
        giftCardsUsados: giftCardsResponse.data.usados || 0,
        receitaMes: usuariosResponse.data.receitaMes || 0
      });
    } catch (err) {
      console.warn('Erro ao carregar stats:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats.totalUsuarios,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Usuários Ativos',
      value: stats.usuariosAtivos,
      icon: Activity,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Total Gift Cards',
      value: stats.totalGiftCards,
      icon: Gift,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'positive'
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${stats.receitaMes.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-yellow-500',
      change: '+15%',
      changeType: 'positive'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral do sistema</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`${card.color} rounded-lg p-3`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                {card.change && (
                  <p className={`text-sm ${card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {card.change}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {error && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>Aviso:</strong> Não foi possível carregar as estatísticas do backend. 
            Verifique se o servidor está rodando.
          </p>
        </div>
      )}
      
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Users className="h-5 w-5 mr-2" />
            Novo Usuário
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Gift className="h-5 w-5 mr-2" />
            Criar Gift Cards
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <CreditCard className="h-5 w-5 mr-2" />
            Ver Financeiro
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
