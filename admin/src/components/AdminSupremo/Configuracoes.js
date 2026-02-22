import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Globe, CreditCard, Shield, Key } from 'lucide-react';

const Configuracoes = () => {
  const [config, setConfig] = useState({
    dashboard_url: '',
    mercadopago_token: '',
    mercadopago_modo: 'sandbox',
    jellyfin_url: '',
    jellyfin_api_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/admin/config/all');
      setConfig(response.data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveConfig = async (section) => {
    setLoading(true);
    try {
      let endpoint = '';
      let data = {};

      switch (section) {
        case 'dashboard':
          endpoint = '/api/admin/config/dashboard';
          data = { url: config.dashboard_url };
          break;
        case 'mercadopago':
          endpoint = '/api/admin/config/mercadopago';
          data = { 
            access_token: config.mercadopago_token,
            modo: config.mercadopago_modo
          };
          break;
        case 'jellyfin':
          endpoint = '/api/admin/config/jellyfin';
          data = { 
            url: config.jellyfin_url,
            api_key: config.jellyfin_api_key
          };
          break;
      }

      await axios.post(endpoint, data);
      alert('Configuração salva com sucesso!');
    } catch (error) {
      alert('Erro ao salvar configuração: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: Globe },
    { id: 'mercadopago', name: 'Mercado Pago', icon: CreditCard },
    { id: 'jellyfin', name: 'Jellyfin', icon: Shield }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
        <p className="text-gray-600">Gerencie as configurações globais da plataforma</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Dashboard Config */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Dashboard</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL do Dashboard
                  </label>
                  <input
                    type="url"
                    value={config.dashboard_url}
                    onChange={(e) => setConfig({...config, dashboard_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://dashboard.seusite.com"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    URL para onde os revendedores serão redirecionados
                  </p>
                </div>
                <button
                  onClick={() => saveConfig('dashboard')}
                  disabled={loading}
                  className="bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </div>
          )}

          {/* Mercado Pago Config */}
          {activeTab === 'mercadopago' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Mercado Pago</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={config.mercadopago_token ? 'password' : 'text'}
                      value={config.mercadopago_token}
                      onChange={(e) => setConfig({...config, mercadopago_token: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="TEST-xxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.querySelector('input[type="password"], input[type="text"]');
                        input.type = input.type === 'password' ? 'text' : 'password';
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Token de acesso da API do Mercado Pago
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modo de Operação
                  </label>
                  <select
                    value={config.mercadopago_modo}
                    onChange={(e) => setConfig({...config, mercadopago_modo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="sandbox">Sandbox (Testes)</option>
                    <option value="production">Produção</option>
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    Sandbox para testes, Produção para pagamentos reais
                  </p>
                </div>

                <button
                  onClick={() => saveConfig('mercadopago')}
                  disabled={loading}
                  className="bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </div>
          )}

          {/* Jellyfin Config */}
          {activeTab === 'jellyfin' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Jellyfin</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL do Servidor Jellyfin
                  </label>
                  <input
                    type="url"
                    value={config.jellyfin_url}
                    onChange={(e) => setConfig({...config, jellyfin_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="http://localhost:8096"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    URL completa do servidor Jellyfin
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={config.jellyfin_api_key ? 'password' : 'text'}
                      value={config.jellyfin_api_key}
                      onChange={(e) => setConfig({...config, jellyfin_api_key: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.querySelectorAll('input[type="password"], input[type="text"]')[1];
                        input.type = input.type === 'password' ? 'text' : 'password';
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Chave de API do Jellyfin para gerenciamento de usuários
                  </p>
                </div>

                <button
                  onClick={() => saveConfig('jellyfin')}
                  disabled={loading}
                  className="bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
