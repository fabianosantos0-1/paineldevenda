import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Gift, DollarSign, Package, CheckCircle, Clock, XCircle, RefreshCw, Plus, Trash2, ExternalLink } from 'lucide-react';

const GiftCardsRevenda = () => {
  const [activeTab, setActiveTab] = useState('precificacao');
  const [precificacao, setPrecificacao] = useState({
    valor_individual: '29.90',
    valor_lote_revenda: '89.70'
  });
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [novoLote, setNovoLote] = useState({
    quantidade: 4,
    revendedor_id: ''
  });
  const [revendedores, setRevendedores] = useState([]);
  const [novoRevendedor, setNovoRevendedor] = useState({ usuario: '', nome: '', email: '' });

  useEffect(() => {
    loadPrecificacao();
    loadLotes();
    loadRevendedores();
  }, []);

  const loadPrecificacao = async () => {
    try {
      const response = await axios.get('/api/admin/giftcards/precificacao');
      setPrecificacao(response.data);
    } catch (error) {
      console.error('Erro ao carregar precificação:', error);
    }
  };

  const excluirRevendedor = async (revendedorId) => {
    if (!revendedorId) return;
    const ok = window.confirm('Tem certeza que deseja excluir este revendedor?');
    if (!ok) return;
    setLoading(true);
    try {
      await axios.delete(`/api/admin/revendedores/${revendedorId}`);
      await loadRevendedores();
      alert('Revendedor excluído com sucesso!');
    } catch (error) {
      alert('Erro ao excluir revendedor: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const verificarPagamento = async (loteId) => {
    try {
      const response = await axios.get(`/api/admin/giftcards/lotes/${loteId}/verificar-pagamento`);
      alert(response.data.message);
      loadLotes();
    } catch (error) {
      alert('Erro ao verificar pagamento: ' + (error.response?.data?.detail || 'Erro interno'));
    }
  };

  const loadLotes = async () => {
    try {
      const response = await axios.get('/api/admin/giftcards/lotes');
      setLotes(response.data);
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
    }
  };

  const loadRevendedores = async () => {
    try {
      const response = await axios.get('/api/admin/revendedores');
      setRevendedores(response.data);
    } catch (error) {
      console.error('Erro ao carregar revendedores:', error);
    }
  };

  const criarRevendedor = async () => {
    const usuario = String(novoRevendedor.usuario || '').trim();
    const nome = String(novoRevendedor.nome || '').trim();
    const email = String(novoRevendedor.email || '').trim();
    if (!usuario) {
      alert('Informe o usuário do revendedor');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/admin/revendedores', { usuario, nome, email });
      setNovoRevendedor({ usuario: '', nome: '', email: '' });
      await loadRevendedores();
      alert('Revendedor criado com sucesso!');
    } catch (error) {
      alert('Erro ao criar revendedor: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const savePrecificacao = async () => {
    setLoading(true);
    try {
      await axios.post('/api/admin/giftcards/precificacao', {
        valor_individual: parseFloat(precificacao.valor_individual),
        valor_lote_revenda: parseFloat(precificacao.valor_lote_revenda)
      });
      alert('Precificação atualizada com sucesso!');
    } catch (error) {
      alert('Erro ao salvar precificação: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const gerarLote = async () => {
    if (!novoLote.quantidade || !novoLote.revendedor_id) {
      alert('Preencha quantidade e revendedor');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/admin/giftcards/gerar-lote', novoLote);
      
      // Gerar pagamento automaticamente
      const pagamentoResponse = await axios.post('/api/admin/giftcards/gerar-pagamento-lote', {
        lote_id: response.data.lote_id,
        valor: precificacao.valor_lote_revenda
      });

      alert('Lote gerado e pagamento criado com sucesso!');
      setNovoLote({ quantidade: 4, revendedor_id: '' });
      loadLotes();
    } catch (error) {
      alert('Erro ao gerar lote: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'pendente': 'bg-yellow-100 text-yellow-800',
      'aprovado': 'bg-green-100 text-green-800',
      'rejeitado': 'bg-red-100 text-red-800',
      'gerado': 'bg-blue-100 text-blue-800'
    };
    
    const icons = {
      'pendente': Clock,
      'aprovado': CheckCircle,
      'rejeitado': XCircle,
      'gerado': Package
    };
    
    const Icon = icons[status] || Clock;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const tabs = [
    { id: 'precificacao', name: 'Precificação Dinâmica', icon: DollarSign },
    { id: 'lotes', name: 'Gestão de Lotes', icon: Package },
    { id: 'pagamentos', name: 'Pagamentos de Revenda', icon: Gift }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gift Cards e Revenda</h1>
        <p className="text-gray-600">Gestão de Gift Cards e automação de revenda</p>
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

        <div className="p-6">
          {/* Precificação Dinâmica */}
          {activeTab === 'precificacao' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Precificação Dinâmica</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-md font-medium text-gray-800 mb-4">Configurar Valores</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor do Gift Card Individual (Cliente Final)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={precificacao.valor_individual}
                          onChange={(e) => setPrecificacao({...precificacao, valor_individual: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="29.90"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Valor para venda direta ao cliente final</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor do Lote de Revenda (Atacado)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={precificacao.valor_lote_revenda}
                          onChange={(e) => setPrecificacao({...precificacao, valor_lote_revenda: e.target.value})}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="89.70"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Valor para revendedores (mínimo 4 Gift Cards)</p>
                    </div>

                    <button
                      onClick={savePrecificacao}
                      disabled={loading}
                      className="w-full bg-primary-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Salvando...' : 'Salvar Precificação'}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-800 mb-4">Cálculo Automático</h3>
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Valor Individual</p>
                        <p className="text-lg font-bold text-gray-900">R$ {parseFloat(precificacao.valor_individual).toFixed(2)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Valor Lote (4x)</p>
                        <p className="text-lg font-bold text-gray-900">R$ {(parseFloat(precificacao.valor_individual) * 4).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-800 mb-2">Economia do Revendedor</p>
                      <p className="text-2xl font-bold text-green-900">
                        R$ {((parseFloat(precificacao.valor_individual) * 4) - parseFloat(precificacao.valor_lote_revenda)).toFixed(2)}
                      </p>
                      <p className="text-sm text-green-600 mt-1">
                        {(((parseFloat(precificacao.valor_individual) * 4) - parseFloat(precificacao.valor_lote_revenda)) / (parseFloat(precificacao.valor_individual) * 4) * 100).toFixed(1)}% de desconto
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-800 mb-2">Margem de Lucro</p>
                      <div className="space-y-1 text-sm text-blue-700">
                        <p><strong>Por Gift Card:</strong> R$ {(parseFloat(precificacao.valor_individual) - (parseFloat(precificacao.valor_lote_revenda) / 4)).toFixed(2)}</p>
                        <p><strong>Total do Lote:</strong> R$ {(parseFloat(precificacao.valor_individual) * 4 - parseFloat(precificacao.valor_lote_revenda)).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gestão de Lotes */}
          {activeTab === 'lotes' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Gestão de Lotes</h2>
                <button
                  onClick={loadLotes}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-1">
                  <h3 className="text-md font-medium text-gray-800 mb-4">Gerar Novo Lote</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Gift Cards</label>
                      <input
                        type="number"
                        min="4"
                        value={novoLote.quantidade}
                        onChange={(e) => setNovoLote({...novoLote, quantidade: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="4"
                      />
                      <p className="text-sm text-gray-500 mt-1">Mínimo: 4 Gift Cards</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Revendedor</label>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                        <div className="text-xs font-semibold text-gray-700 mb-2">Cadastrar revendedor</div>
                        <div className="grid grid-cols-1 gap-2">
                          <input
                            type="text"
                            value={novoRevendedor.usuario}
                            onChange={(e) => setNovoRevendedor({ ...novoRevendedor, usuario: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Usuário (ex: joao_revenda)"
                          />
                          <input
                            type="text"
                            value={novoRevendedor.nome}
                            onChange={(e) => setNovoRevendedor({ ...novoRevendedor, nome: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Nome (opcional)"
                          />
                          <input
                            type="email"
                            value={novoRevendedor.email}
                            onChange={(e) => setNovoRevendedor({ ...novoRevendedor, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Email (para receber os gift cards)"
                          />
                          <button
                            onClick={criarRevendedor}
                            disabled={loading}
                            className="w-full flex items-center justify-center bg-gray-800 text-white font-medium py-2 px-3 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {loading ? 'Criando...' : 'Criar Revendedor'}
                          </button>
                        </div>
                      </div>
                      <select
                        value={novoLote.revendedor_id}
                        onChange={(e) => setNovoLote({...novoLote, revendedor_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Selecione um revendedor</option>
                        {revendedores.map((revendedor) => (
                          <option key={revendedor.id} value={revendedor.id}>
                            {(revendedor.nome || revendedor.usuario)} ({Number(revendedor.qtd_giftcards || 0)} / R$ {Number(revendedor.total_gasto || 0).toFixed(2)})
                          </option>
                        ))}
                      </select>
                      {novoLote.revendedor_id && (
                        <button
                          type="button"
                          onClick={() => excluirRevendedor(novoLote.revendedor_id)}
                          disabled={loading}
                          className="mt-2 w-full flex items-center justify-center bg-red-600 text-white font-medium py-2 px-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir revendedor selecionado
                        </button>
                      )}
                    </div>

                    <button
                      onClick={gerarLote}
                      disabled={loading}
                      className="w-full bg-primary-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Gerando...' : 'Gerar Lote + Pagamento'}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <h3 className="text-md font-medium text-gray-800 mb-4">Lotes Gerados</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revendedor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qtd</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lotes.map((lote) => (
                          <tr key={lote.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              #{lote.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lote.revendedor_nome}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {lote.quantidade}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              R$ {lote.valor.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(lote.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(lote.data_criacao).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagamentos de Revenda */}
          {activeTab === 'pagamentos' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Pagamentos de Revenda</h2>
                <button
                  onClick={loadLotes}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="bg-yellow-100 rounded-lg p-3">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Pendentes</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {lotes.filter(lote => lote.status === 'pendente').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="bg-green-100 rounded-lg p-3">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Aprovados</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {lotes.filter(l => l.status === 'aprovado').length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <div className="bg-red-100 rounded-lg p-3">
                      <XCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Rejeitados</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {lotes.filter(lote => lote.status === 'rejeitado').length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lote ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revendedor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status Pagamento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preference ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Criação</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lotes
                      .filter(lote => lote.pagamento_url || lote.pagamento_mercadopago_preference_id)
                      .map((lote) => (
                        <tr key={lote.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{lote.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {lote.revendedor_nome}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            R$ {Number(lote.valor || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(lote.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {lote.pagamento_mercadopago_preference_id || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(lote.data_criacao).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              {lote.pagamento_url && (
                                <a
                                  href={lote.pagamento_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  Abrir
                                </a>
                              )}
                              <button
                                onClick={() => verificarPagamento(lote.id)}
                                className="inline-flex items-center px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Verificar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GiftCardsRevenda;
