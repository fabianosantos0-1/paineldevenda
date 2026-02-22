import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, QrCode, CreditCard, TrendingUp, TrendingDown, RefreshCw, Download } from 'lucide-react';

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recebimentos, setRecebimentos] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [pixData, setPixData] = useState({ valor: '', descricao: '' });
  const [cartaoData, setCartaoData] = useState({ valor: '' });
  const [pixQrCode, setPixQrCode] = useState(null);
  const [cartaoVirtual, setCartaoVirtual] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFinanceiroData();
  }, []);

  const loadFinanceiroData = async () => {
    try {
      const [recebimentosRes, pagamentosRes] = await Promise.all([
        axios.get('/api/admin/financeiro/recebimentos'),
        axios.get('/api/admin/financeiro/pagamentos')
      ]);
      setRecebimentos(recebimentosRes.data);
      setPagamentos(pagamentosRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    }
  };

  const gerarPix = async () => {
    if (!pixData.valor || !pixData.descricao) {
      alert('Preencha valor e descrição');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/admin/financeiro/gerar-pix', {
        valor: parseFloat(pixData.valor),
        descricao: pixData.descricao
      });
      setPixQrCode(response.data);
    } catch (error) {
      alert('Erro ao gerar PIX: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const gerarCartaoVirtual = async () => {
    if (!cartaoData.valor) {
      alert('Preencha o valor do cartão');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/admin/financeiro/gerar-cartao', {
        valor: parseFloat(cartaoData.valor)
      });
      setCartaoVirtual(response.data);
    } catch (error) {
      alert('Erro ao gerar cartão virtual: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const totalRecebimentos = recebimentos.reduce((sum, item) => sum + item.valor, 0);
  const totalPagamentos = pagamentos.reduce((sum, item) => sum + item.valor, 0);
  const saldo = totalRecebimentos - totalPagamentos;

  const tabs = [
    { id: 'dashboard', name: 'Visão Geral', icon: TrendingUp },
    { id: 'pix', name: 'Gerar PIX', icon: QrCode },
    { id: 'cartao', name: 'Cartão Virtual', icon: CreditCard }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-gray-600">Gestão financeira e pagamentos</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-lg p-3">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Recebido</p>
              <p className="text-2xl font-bold text-gray-900">R$ {totalRecebimentos.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-lg p-3">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pago</p>
              <p className="text-2xl font-bold text-gray-900">R$ {totalPagamentos.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`rounded-lg p-3 ${saldo >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <DollarSign className={`h-6 w-6 ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Saldo</p>
              <p className="text-2xl font-bold text-gray-900">R$ {saldo.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
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

        <div className="p-6">
          {/* Dashboard Financeiro */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Histórico Financeiro</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={loadFinanceiroData}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </button>
                  <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </button>
                </div>
              </div>

              {/* Recebimentos */}
              <div className="mb-8">
                <h3 className="text-md font-semibold text-gray-800 mb-4">Recebimentos</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recebimentos.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.descricao}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {item.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                            +R$ {item.valor.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagamentos */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-4">Pagamentos</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pagamentos.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(item.data).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.descricao}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {item.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 text-right">
                            -R$ {item.valor.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Gerador de PIX */}
          {activeTab === 'pix' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Gerador de PIX Dinâmico</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={pixData.valor}
                        onChange={(e) => setPixData({...pixData, valor: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="29.90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                      <input
                        type="text"
                        value={pixData.descricao}
                        onChange={(e) => setPixData({...pixData, descricao: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Pagamento Jellyfin Premium"
                      />
                    </div>
                    <button
                      onClick={gerarPix}
                      disabled={loading}
                      className="w-full bg-green-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Gerando...' : 'Gerar PIX'}
                    </button>
                  </div>
                </div>

                <div>
                  {pixQrCode && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-md font-semibold text-gray-900 mb-4">PIX Gerado</h3>
                      <div className="text-center mb-4">
                        <img src={pixQrCode.qr_code} alt="QR Code PIX" className="mx-auto mb-4" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Copia e Cola</label>
                        <div className="flex">
                          <input
                            type="text"
                            value={pixQrCode.copia_e_cola}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-100"
                          />
                          <button
                            onClick={() => navigator.clipboard.writeText(pixQrCode.copia_e_cola)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-r-lg hover:bg-primary-700 transition-colors"
                          >
                            Copiar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Gerador de Cartão Virtual */}
          {activeTab === 'cartao' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Gerador de Cartão Virtual</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor Pré-pago (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cartaoData.valor}
                        onChange={(e) => setCartaoData({...cartaoData, valor: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="100.00"
                      />
                    </div>
                    <button
                      onClick={gerarCartaoVirtual}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Gerando...' : 'Gerar Cartão Virtual'}
                    </button>
                  </div>
                </div>

                <div>
                  {cartaoVirtual && (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-md font-semibold text-gray-900 mb-4">Cartão Virtual Gerado</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Número do Cartão</label>
                          <input
                            type="text"
                            value={cartaoVirtual.numero}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Validade</label>
                            <input
                              type="text"
                              value={cartaoVirtual.validade}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">CVV</label>
                            <input
                              type="text"
                              value={cartaoVirtual.cvv}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 font-mono"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Titular</label>
                          <input
                            type="text"
                            value={cartaoVirtual.titular}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          />
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-800">
                            <strong>Importante:</strong> Salve os dados do cartão em local seguro. 
                            O cartão é válido apenas para compras online.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Financeiro;
