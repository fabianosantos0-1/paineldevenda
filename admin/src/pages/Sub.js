import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import axios from 'axios';
import { ExternalLink, MessageSquare, Users, Gift, LogOut } from 'lucide-react';

const Sub = () => {
  const { admin, logout } = useAuth();
  const { iniciarSessao, sessaoAtual, setSessaoAtual } = useChat();
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    loadDashboardUrl();
  }, []);

  const loadDashboardUrl = async () => {
    try {
      const response = await axios.get('/api/admin/config/dashboard-url');
      setDashboardUrl(response.data.url || '#');
    } catch (error) {
      console.error('Erro ao carregar URL do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatInit = async () => {
    if (!sessaoAtual) {
      const result = await iniciarSessao(admin.email);
      if (result.success) {
        setChatOpen(true);
      }
    } else {
      setChatOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="bg-purple-600 rounded-lg p-2">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">Painel Revendedor</h1>
                <p className="text-sm text-gray-500">{admin?.usuario}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Bem-vindo, {admin?.usuario}!
          </h2>
          <p className="text-lg text-gray-600">
            Área exclusiva para revendedores Jellyfin
          </p>
        </div>

        {/* Dashboard Button */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 mb-6">
              <ExternalLink className="h-16 w-16 text-white mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Dashboard Principal</h3>
              <p className="text-purple-100">
                Acesse o painel completo de gestão
              </p>
            </div>
            
            <button
              onClick={() => window.open(dashboardUrl, '_blank')}
              disabled={loading || !dashboardUrl || dashboardUrl === '#'}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 px-8 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                'Carregando...'
              ) : (
                <>
                  <ExternalLink className="inline h-5 w-5 mr-2" />
                  Logar na Dashboard
                </>
              )}
            </button>
            
            {dashboardUrl === '#' && (
              <p className="mt-3 text-sm text-orange-600">
                URL do dashboard não configurada. Contate o administrador.
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 rounded-lg p-3">
                <Gift className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">Criar Gift Cards</h3>
                <p className="text-sm text-gray-600">Gere novos códigos para venda</p>
              </div>
            </div>
            <button className="w-full bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
              Criar Novos Gift Cards
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-lg p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">Meus Gift Cards</h3>
                <p className="text-sm text-gray-600">Visualize códigos gerados</p>
              </div>
            </div>
            <button className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              Ver Meus Gift Cards
            </button>
          </div>
        </div>

        {/* Support Chat */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-3">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">Chat de Suporte</h3>
                <p className="text-sm text-gray-600">Fale com nossa equipe</p>
              </div>
            </div>
            <button
              onClick={handleChatInit}
              className="bg-purple-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Abrir Chat
            </button>
          </div>
          
          {chatOpen && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">
                Chat aberto! Envie sua mensagem para o suporte.
              </p>
              <div className="bg-white rounded border border-gray-300 p-3 min-h-[100px]">
                <p className="text-sm text-gray-500">
                  Interface do chat será implementada aqui...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">25%</div>
            <p className="text-sm text-gray-600">Desconto em Gift Cards</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">4+</div>
            <p className="text-sm text-gray-600">Mínimo de Gift Cards</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
            <p className="text-sm text-gray-600">Suporte Online</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sub;
