import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Globe, CreditCard, Shield, Key, RefreshCw } from 'lucide-react';

const ConfiguracoesSistema = () => {
  const [activeTab, setActiveTab] = useState('jellyfin');
  const [config, setConfig] = useState({
    jellyfin_url: '',
    jellyfin_api_key: '',
    mercadopago_access_token: '',
    mercadopago_webhook_secret: '',
    preco_mensal: '29.90',
    dias_validade_assinatura: '30',
    dias_validade_giftcard: '30'
  });
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/admin/config/sistema/all');
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
        case 'jellyfin':
          endpoint = '/api/admin/config/sistema/jellyfin';
          data = { 
            url: config.jellyfin_url,
            api_key: config.jellyfin_api_key
          };
          break;
        case 'mercadopago':
          endpoint = '/api/admin/config/sistema/mercadopago';
          data = { 
            access_token: config.mercadopago_access_token,
            webhook_secret: config.mercadopago_webhook_secret
          };
          break;
        case 'assinatura':
          endpoint = '/api/admin/config/sistema/assinatura';
          data = { 
            preco_mensal: parseFloat(config.preco_mensal),
            dias_validade_assinatura: parseInt(config.dias_validade_assinatura),
            dias_validade_giftcard: parseInt(config.dias_validade_giftcard)
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

  const toggleSecret = (field) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const tabs = [
    { id: 'jellyfin', name: 'Jellyfin', icon: Shield },
    { id: 'mercadopago', name: 'Mercado Pago', icon: CreditCard },
    { id: 'assinatura', name: 'Assinatura', icon: Globe }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
        <p className="text-gray-600">Parâmetros cruciais do sistema</p>
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
          {/* Jellyfin Config */}
          {activeTab === 'jellyfin' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Credenciais do Jellyfin</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JELLYFIN_URL
                  </label>
                  <input
                    type="url"
                    value={config.jellyfin_url}
                    onChange={(e) => setConfig({...config, jellyfin_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://seu-jellyfin.com"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    URL completa do servidor Jellyfin
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    JELLYFIN_API_KEY
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets.jellyfin_api_key ? 'text' : 'password'}
                      value={config.jellyfin_api_key}
                      onChange={(e) => setConfig({...config, jellyfin_api_key: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('jellyfin_api_key')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Chave de API do Jellyfin para gerenciamento de usuários
                  </p>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={() => saveConfig('jellyfin')}
                    disabled={loading}
                    className="bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar Configuração'}
                  </button>
                  <button
                    onClick={loadConfig}
                    className="bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recarregar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mercado Pago Config */}
          {activeTab === 'mercadopago' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Credenciais Mercado Pago</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    MERCADO_PAGO_ACCESS_TOKEN
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets.mercadopago_access_token ? 'text' : 'password'}
                      value={config.mercadopago_access_token}
                      onChange={(e) => setConfig({...config, mercadopago_access_token: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="APP_USR-xxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('mercadopago_access_token')}
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
                    MERCADO_PAGO_WEBHOOK_SECRET
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets.mercadopago_webhook_secret ? 'text' : 'password'}
                      value={config.mercadopago_webhook_secret}
                      onChange={(e) => setConfig({...config, mercadopago_webhook_secret: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="xxxxxxxxxxxxxxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecret('mercadopago_webhook_secret')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Chave secreta para validação de webhooks
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Modo:</strong> {config.mercadopago_access_token?.startsWith('TEST-') ? 'Sandbox (Testes)' : 'Produção'}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Tokens começando com "TEST-" são para ambiente de testes
                  </p>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={() => saveConfig('mercadopago')}
                    disabled={loading}
                    className="bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar Configuração'}
                  </button>
                  <button
                    onClick={loadConfig}
                    className="bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recarregar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assinatura Config */}
          {activeTab === 'assinatura' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Parâmetros de Assinatura</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PRECO_MENSAL (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.preco_mensal}
                    onChange={(e) => setConfig({...config, preco_mensal: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="29.90"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Valor da assinatura mensal para clientes finais
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DIAS_VALIDADE_ASSINATURA
                  </label>
                  <input
                    type="number"
                    value={config.dias_validade_assinatura}
                    onChange={(e) => setConfig({...config, dias_validade_assinatura: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="30"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Dias de validade da assinatura após pagamento
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DIAS_VALIDADE_GIFTCARD
                  </label>
                  <input
                    type="number"
                    value={config.dias_validade_giftcard}
                    onChange={(e) => setConfig({...config, dias_validade_giftcard: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="30"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Dias de validade ao ativar usando Gift Card
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2">Cálculo Automático</h3>
                  <div className="space-y-1 text-sm text-green-700">
                    <p><strong>Valor diário:</strong> R$ {(parseFloat(config.preco_mensal) / parseInt(config.dias_validade_assinatura)).toFixed(2)}</p>
                    <p><strong>Valor anual:</strong> R$ {(parseFloat(config.preco_mensal) * 12).toFixed(2)}</p>
                    <p><strong>Gift Card Revendedor:</strong> R$ {(parseFloat(config.preco_mensal) * 0.25).toFixed(2)} (25% de desconto)</p>
                  </div>
                </div>

                <div className="flex space-x-2 pt-4">
                  <button
                    onClick={() => saveConfig('assinatura')}
                    disabled={loading}
                    className="bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar Configuração'}
                  </button>
                  <button
                    onClick={loadConfig}
                    className="bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recarregar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfiguracoesSistema;
