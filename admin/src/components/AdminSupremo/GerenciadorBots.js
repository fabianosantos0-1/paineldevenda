import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Play, Pause, Square, Terminal, RefreshCw, Eye, Plus, Pencil, Trash2 } from 'lucide-react';

const GerenciadorBots = () => {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [loading, setLoading] = useState({});
  const [pageLoading, setPageLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [newBot, setNewBot] = useState({
    id: '',
    nome: '',
    descricao: '',
    code: 'import time\n\nprint("Bot iniciado")\nwhile True:\n    print("tick")\n    time.sleep(5)\n'
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editBot, setEditBot] = useState({ id: '', nome: '', descricao: '', code: '' });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    setPageLoading(true);
    try {
      const res = await axios.get('/api/admin/bots');
      const list = Array.isArray(res.data?.bots) ? res.data.bots : [];
      setBots(list.map(b => ({ ...b, logs: [] })));
      setSelectedBot(null);
      await loadBotsStatus(list);
    } catch (error) {
      console.error('Erro ao carregar bots:', error);
      setBots([]);
      setSelectedBot(null);
    } finally {
      setPageLoading(false);
    }
  };

  const openEdit = async (botId) => {
    setEditOpen(true);
    setEditLoading(true);
    try {
      const res = await axios.get(`/api/admin/bots/${botId}`);
      setEditBot({
        id: res.data?.id || botId,
        nome: res.data?.nome || '',
        descricao: res.data?.descricao || '',
        code: res.data?.code || ''
      });
    } catch (error) {
      alert('Erro ao carregar bot: ' + (error.response?.data?.detail || 'Erro interno'));
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      await axios.post(`/api/admin/bots/${editBot.id}`, {
        nome: editBot.nome,
        descricao: editBot.descricao,
        code: editBot.code
      });
      setEditOpen(false);
      await init();
    } catch (error) {
      alert('Erro ao salvar bot: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setEditSaving(false);
    }
  };

  const deleteBot = async (botId) => {
    const ok = window.confirm('Tem certeza que deseja excluir este bot?');
    if (!ok) return;
    setLoading(prev => ({ ...prev, [botId]: true }));
    try {
      await axios.delete(`/api/admin/bots/${botId}`);
      if (selectedBot?.id === botId) setSelectedBot(null);
      await init();
    } catch (error) {
      alert('Erro ao excluir bot: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(prev => ({ ...prev, [botId]: false }));
    }
  };

  const loadBotsStatus = async (botsOverride) => {
    try {
      const response = await axios.get('/api/admin/bots/status');
      setBots(prev => (botsOverride || prev).map(bot => ({
        ...bot,
        status: response.data[bot.id] || 'parado'
      })));
    } catch (error) {
      console.error('Erro ao carregar status dos bots:', error);
    }
  };

  const canCreateBot = useMemo(() => {
    const id = String(newBot.id || '').trim();
    const code = String(newBot.code || '').trim();
    return id.length > 0 && code.length > 0;
  }, [newBot.id, newBot.code]);

  const createBot = async () => {
    if (!canCreateBot) return;
    setCreateSaving(true);
    try {
      const payload = {
        id: String(newBot.id || '').trim(),
        nome: String(newBot.nome || '').trim() || String(newBot.id || '').trim(),
        descricao: String(newBot.descricao || '').trim(),
        code: String(newBot.code || '')
      };
      await axios.post('/api/admin/bots', payload);
      setCreateOpen(false);
      setNewBot({
        id: '',
        nome: '',
        descricao: '',
        code: 'import time\n\nprint("Bot iniciado")\nwhile True:\n    print("tick")\n    time.sleep(5)\n'
      });
      await init();
    } catch (error) {
      alert('Erro ao criar bot: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setCreateSaving(false);
    }
  };

  const startBot = async (botId) => {
    setLoading(prev => ({ ...prev, [botId]: true }));
    try {
      await axios.post(`/api/admin/bots/${botId}/start`);
      setBots(prev => prev.map(bot => 
        bot.id === botId ? { ...bot, status: 'rodando' } : bot
      ));
      await loadBotsStatus();
    } catch (error) {
      alert('Erro ao iniciar bot: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(prev => ({ ...prev, [botId]: false }));
    }
  };

  const stopBot = async (botId) => {
    setLoading(prev => ({ ...prev, [botId]: true }));
    try {
      await axios.post(`/api/admin/bots/${botId}/stop`);
      setBots(prev => prev.map(bot => 
        bot.id === botId ? { ...bot, status: 'parado' } : bot
      ));
      await loadBotsStatus();
    } catch (error) {
      alert('Erro ao parar bot: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(prev => ({ ...prev, [botId]: false }));
    }
  };

  const loadBotLogs = async (botId) => {
    try {
      const response = await axios.get(`/api/admin/bots/${botId}/logs`);
      setBots(prev => prev.map(bot => 
        bot.id === botId ? { ...bot, logs: response.data } : bot
      ));
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  useEffect(() => {
    if (!selectedBot) return;
    const id = window.setInterval(() => {
      loadBotLogs(selectedBot.id);
    }, 2000);
    return () => window.clearInterval(id);
  }, [selectedBot]);

  const getStatusBadge = (status) => {
    const styles = {
      'rodando': 'bg-green-100 text-green-800',
      'parado': 'bg-gray-100 text-gray-800',
      'erro': 'bg-red-100 text-red-800',
      'iniciando': 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.parado}`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${
          status === 'rodando' ? 'bg-green-500' : 
          status === 'erro' ? 'bg-red-500' : 
          status === 'iniciando' ? 'bg-yellow-500' : 'bg-gray-500'
        }`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'rodando':
        return <Play className="h-4 w-4 text-green-600" />;
      case 'parado':
        return <Square className="h-4 w-4 text-gray-600" />;
      case 'erro':
        return <Terminal className="h-4 w-4 text-red-600" />;
      default:
        return <Pause className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciador de Bots</h1>
            <p className="text-gray-600">Controle e monitoramento de scripts Python</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar novo bot
            </button>
            <button
              onClick={() => loadBotsStatus()}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Status
            </button>
          </div>
        </div>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Criar novo bot (Python)</h2>
              <button
                onClick={() => setCreateOpen(false)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                <input
                  value={newBot.id}
                  onChange={(e) => setNewBot({ ...newBot, id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="ex: meu_bot"
                />
                <p className="text-xs text-gray-500 mt-1">Use letras, números, _ ou -</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  value={newBot.nome}
                  onChange={(e) => setNewBot({ ...newBot, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Nome do bot"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  value={newBot.descricao}
                  onChange={(e) => setNewBot({ ...newBot, descricao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="O que ele faz"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código Python</label>
              <textarea
                value={newBot.code}
                onChange={(e) => setNewBot({ ...newBot, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                rows={14}
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                disabled={createSaving}
              >
                Cancelar
              </button>
              <button
                onClick={createBot}
                disabled={!canCreateBot || createSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createSaving ? 'Salvando...' : 'Salvar bot'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Editar bot: {editBot.id}</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                disabled={editSaving}
              >
                Fechar
              </button>
            </div>

            {editLoading ? (
              <div className="text-gray-600">Carregando...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      value={editBot.nome}
                      onChange={(e) => setEditBot({ ...editBot, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <input
                      value={editBot.descricao}
                      onChange={(e) => setEditBot({ ...editBot, descricao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código Python</label>
                  <textarea
                    value={editBot.code}
                    onChange={(e) => setEditBot({ ...editBot, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    rows={14}
                  />
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setEditOpen(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    disabled={editSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={editSaving || !String(editBot.code || '').trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {editSaving ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lista de Bots */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bots Disponíveis</h2>
          <div className="space-y-4">
            {pageLoading ? (
              <div className="bg-white rounded-lg shadow p-6 text-gray-600">Carregando bots...</div>
            ) : bots.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-gray-600">Nenhum bot criado. Clique em “Criar novo bot”.</div>
            ) : bots.map((bot) => (
              <div key={bot.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-primary-100 rounded-lg p-2">
                      <Bot className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-md font-semibold text-gray-900">{bot.nome}</h3>
                      <p className="text-sm text-gray-500">{bot.descricao}</p>
                      <p className="text-xs text-gray-400 mt-1">Arquivo: {bot.arquivo}</p>
                    </div>
                  </div>
                  {getStatusBadge(bot.status)}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {bot.status === 'rodando' ? (
                      <button
                        onClick={() => stopBot(bot.id)}
                        disabled={loading[bot.id]}
                        className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <Square className="h-4 w-4 mr-2" />
                        {loading[bot.id] ? 'Parando...' : 'Parar'}
                      </button>
                    ) : (
                      <button
                        onClick={() => startBot(bot.id)}
                        disabled={loading[bot.id]}
                        className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {loading[bot.id] ? 'Iniciando...' : 'Iniciar'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setSelectedBot(bot);
                        if (!bot.logs.length) {
                          loadBotLogs(bot.id);
                        }
                      }}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Logs
                    </button>

                    <button
                      onClick={() => openEdit(bot.id)}
                      className="flex items-center px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </button>

                    <button
                      onClick={() => deleteBot(bot.id)}
                      disabled={loading[bot.id]}
                      className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </button>
                  </div>
                  
                  <div className="flex items-center">
                    {getStatusIcon(bot.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logs do Bot Selecionado */}
        <div>
          {selectedBot ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Logs - {selectedBot.nome}</h2>
                  <p className="text-sm text-gray-500">Arquivo: {selectedBot.arquivo}</p>
                </div>
                <button
                  onClick={() => loadBotLogs(selectedBot.id)}
                  className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
                <div className="space-y-2">
                  {selectedBot.logs.length > 0 ? (
                    selectedBot.logs.map((log, index) => (
                      <div key={index} className="font-mono text-sm">
                        <span className="text-gray-400">
                          [{new Date(log.timestamp).toLocaleString('pt-BR')}]
                        </span>
                        <span className={`ml-2 ${
                          log.level === 'ERROR' ? 'text-red-400' :
                          log.level === 'WARNING' ? 'text-yellow-400' :
                          log.level === 'INFO' ? 'text-green-400' :
                          'text-gray-300'
                        }`}>
                          [{log.level}]
                        </span>
                        <span className="text-gray-300 ml-2">{log.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      <Terminal className="h-8 w-8 mx-auto mb-2" />
                      <p>Nenhum log disponível</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {selectedBot.status === 'rodando' ? 'Bot está rodando sem logs recentes' : 'Inicie o bot para ver logs'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => {
                    const logsText = selectedBot.logs.map(log => 
                      `[${new Date(log.timestamp).toLocaleString('pt-BR')}] [${log.level}] ${log.message}`
                    ).join('\n');
                    
                    const blob = new Blob([logsText], { type: 'text/plain' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedBot.id}_logs_${new Date().toISOString().split('T')[0]}.txt`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  Exportar Logs
                </button>
                
                <button
                  onClick={() => setSelectedBot(null)}
                  className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum Bot Selecionado</h3>
              <p className="text-gray-500">
                Clique em "Ver Logs" em um dos bots para visualizar os logs em tempo real
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-lg p-3">
              <Play className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rodando</p>
              <p className="text-2xl font-bold text-gray-900">
                {bots.filter(b => b.status === 'rodando').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-gray-100 rounded-lg p-3">
              <Square className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Parados</p>
              <p className="text-2xl font-bold text-gray-900">
                {bots.filter(b => b.status === 'parado').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-lg p-3">
              <Terminal className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Com Erro</p>
              <p className="text-2xl font-bold text-gray-900">
                {bots.filter(b => b.status === 'erro').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{bots.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GerenciadorBots;
