import React, { useState, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import axios from 'axios';
import { MessageSquare, Users, Clock, TrendingUp } from 'lucide-react';

const DashboardSuporte = () => {
  const [stats, setStats] = useState({
    sessoesHoje: 0,
    sessoesAtivas: 0,
    mensagensHoje: 0,
    tempoMedioResposta: '2 min'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/admin/stats/suporte');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas do suporte:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Sessões Hoje',
      value: stats.sessoesHoje,
      icon: MessageSquare,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Sessões Ativas',
      value: stats.sessoesAtivas,
      icon: Users,
      color: 'bg-green-500',
      change: '+3',
      changeType: 'positive'
    },
    {
      title: 'Mensagens Hoje',
      value: stats.mensagensHoje,
      icon: MessageSquare,
      color: 'bg-purple-500',
      change: '+25%',
      changeType: 'positive'
    },
    {
      title: 'Tempo Médio Resposta',
      value: stats.tempoMedioResposta,
      icon: Clock,
      color: 'bg-yellow-500',
      change: '-30s',
      changeType: 'positive'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Suporte</h1>
        <p className="text-gray-600">Visão geral do atendimento</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs ontem</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <MessageSquare className="h-5 w-5 mr-2" />
            Ver Chat Ativo
          </button>
          <button className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Users className="h-5 w-5 mr-2" />
            Histórico de Atendimentos
          </button>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sessões Recentes</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-full p-2">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">joao@exemplo.com</p>
                <p className="text-sm text-gray-500">Problema com login</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-green-600 font-medium">Ativo</span>
              <p className="text-xs text-gray-500">Há 5 min</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center">
              <div className="bg-gray-100 rounded-full p-2">
                <Users className="h-4 w-4 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">maria@exemplo.com</p>
                <p className="text-sm text-gray-500">Dúvida sobre pagamento</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-600 font-medium">Encerrado</span>
              <p className="text-xs text-gray-500">Há 15 min</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
              <div className="bg-gray-100 rounded-full p-2">
                <Users className="h-4 w-4 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">pedro@exemplo.com</p>
                <p className="text-sm text-gray-500">Ajuda com Gift Card</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-600 font-medium">Encerrado</span>
              <p className="text-xs text-gray-500">Há 1 hora</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSuporte;
