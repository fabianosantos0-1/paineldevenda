import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Book, Shield, ExternalLink, RefreshCw, Eye } from 'lucide-react';

const ApiDocs = () => {
  const [docsUrl, setDocsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApiDocs();
  }, []);

  const loadApiDocs = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Obter token temporário para docs
      const response = await axios.post('/api/admin/docs/token');
      const { token } = response.data;
      
      // Construir URL com token
      const baseUrl = window.location.origin.replace('3000', '8001');
      setDocsUrl(`${baseUrl}/docs?token=${token}`);
    } catch (error) {
      setError('Não foi possível carregar a documentação da API');
      console.error('Erro ao carregar docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshDocs = () => {
    loadApiDocs();
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documentação da API</h1>
            <p className="text-gray-600">Documentação segura da API (Acesso exclusivo Admin Supremo)</p>
          </div>
          <button
            onClick={refreshDocs}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <Shield className="h-6 w-6 text-yellow-600 mt-1 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Acesso Restrito e Seguro</h3>
            <div className="text-sm text-yellow-700 space-y-1">
              <p>• Esta documentação está protegida e só pode ser acessada por Admins Supremos</p>
              <p>• O link expira automaticamente após 1 hora por segurança</p>
              <p>• Não compartilhe este link com usuários não autorizados</p>
              <p>• A documentação pública em /docs foi desativada por segurança</p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando documentação segura...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-1">Erro de Acesso</h3>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={refreshDocs}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documentation Frame */}
      {!loading && !error && docsUrl && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Book className="h-5 w-5 text-gray-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Swagger UI</h2>
                <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Acesso Seguro
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.open(docsUrl, '_blank')}
                  className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir em Nova Aba
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(docsUrl)}
                  className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Copiar Link
                </button>
              </div>
            </div>
          </div>

          <div className="relative" style={{ height: '800px' }}>
            <iframe
              src={docsUrl}
              className="w-full h-full border-0"
              title="API Documentation"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              onLoad={() => setLoading(false)}
            />
            
            {/* Overlay para segurança */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 pointer-events-none">
              <div className="flex items-center text-xs text-gray-600">
                <Shield className="h-3 w-3 mr-1" />
                Acesso Seguro
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Access Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="bg-blue-100 rounded-lg p-2">
              <Book className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="ml-3 text-md font-semibold text-gray-900">Endpoints Principais</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <code className="bg-gray-100 px-1 rounded">/api/admin/login</code> - Autenticação</p>
            <p>• <code className="bg-gray-100 px-1 rounded">/api/admin/clientes</code> - Gestão de Clientes</p>
            <p>• <code className="bg-gray-100 px-1 rounded">/api/admin/config</code> - Configurações</p>
            <p>• <code className="bg-gray-100 px-1 rounded">/api/admin/financeiro</code> - Financeiro</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 rounded-lg p-2">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="ml-3 text-md font-semibold text-gray-900">Segurança</h3>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Tokens JWT obrigatórios</p>
            <p>• Validação de nível de acesso</p>
            <p>• Rate limiting ativo</p>
            <p>• Logs de auditoria</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="bg-purple-100 rounded-lg p-2">
              <ExternalLink className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="ml-3 text-md font-semibold text-gray-900">Links Rápidos</h3>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => window.open(`${window.location.origin.replace('3000', '8001')}/openapi.json?token=${docsUrl.split('token=')[1]}`, '_blank')}
              className="block w-full text-left text-sm text-primary-600 hover:text-primary-800 py-1"
            >
              → OpenAPI Schema
            </button>
            <button
              onClick={() => window.open(`${window.location.origin.replace('3000', '8001')}/redoc?token=${docsUrl.split('token=')[1]}`, '_blank')}
              className="block w-full text-left text-sm text-primary-600 hover:text-primary-800 py-1"
            >
              → ReDoc Documentation
            </button>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exemplos de Uso</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-2">Autenticação</h4>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300">
{`curl -X POST "${window.location.origin.replace('3000', '8001')}/api/admin/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "usuario": "adm_supremo",
    "senha": "adm_supremo"
  }'`}
              </pre>
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-800 mb-2">Listar Clientes</h4>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-300">
{`curl -X GET "${window.location.origin.replace('3000', '8001')}/api/admin/clientes" \\
  -H "Authorization: Bearer SEU_TOKEN_JWT"`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;
