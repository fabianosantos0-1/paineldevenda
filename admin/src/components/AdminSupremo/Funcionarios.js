import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCog, Plus, Edit, Trash2, Shield, ShieldCheck, X } from 'lucide-react';

const PERMISSOES_DISPONIVEIS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'giftcards', label: 'Gift Cards' },
  { id: 'controle_venda', label: 'Controle de Venda' },
  { id: 'configuracoes', label: 'Configurações' },
  { id: 'email', label: 'E-mail' },
  { id: 'logs', label: 'Logs' },
  { id: 'chat', label: 'Chat Atendimento' },
  { id: 'chat_interno', label: 'Chat Interno' },
  { id: 'bots', label: 'Bots' },
  { id: 'aprovacoes', label: 'Aprovações' },
  { id: 'funcionarios', label: 'Funcionários' },
];

const Funcionarios = () => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({
    nome: '', usuario: '', senha: '', email: '', cargo: 'funcionario', permissoes: [], ativo: true
  });

  useEffect(() => { loadFuncionarios(); }, []);

  const loadFuncionarios = async () => {
    try {
      const res = await axios.get('/api/admin/funcionarios');
      setFuncionarios(res.data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirCriar = () => {
    setEditando(null);
    setForm({ nome: '', usuario: '', senha: '', email: '', cargo: 'funcionario', permissoes: [], ativo: true });
    setShowModal(true);
  };

  const abrirEditar = (func) => {
    setEditando(func);
    setForm({ nome: func.nome, usuario: func.usuario, senha: '', email: func.email || '', cargo: func.cargo, permissoes: func.permissoes || [], ativo: func.ativo });
    setShowModal(true);
  };

  const salvar = async () => {
    try {
      if (editando) {
        await axios.put(`/api/admin/funcionarios/${editando.id}`, form);
      } else {
        await axios.post('/api/admin/funcionarios', form);
      }
      setShowModal(false);
      loadFuncionarios();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar');
    }
  };

  const deletar = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este funcionário?')) return;
    try {
      await axios.delete(`/api/admin/funcionarios/${id}`);
      loadFuncionarios();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir');
    }
  };

  const togglePermissao = (perm) => {
    setForm(prev => ({
      ...prev,
      permissoes: prev.permissoes.includes(perm)
        ? prev.permissoes.filter(p => p !== perm)
        : [...prev.permissoes, perm]
    }));
  };

  const selecionarTodas = () => {
    setForm(prev => ({ ...prev, permissoes: PERMISSOES_DISPONIVEIS.map(p => p.id) }));
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCog className="h-7 w-7 text-blue-600" />
            Funcionários
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os funcionários e suas permissões</p>
        </div>
        <button onClick={abrirCriar} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Novo Funcionário
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissões</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {funcionarios.length === 0 ? (
              <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400">Nenhum funcionário cadastrado</td></tr>
            ) : funcionarios.map(func => (
              <tr key={func.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{func.nome?.charAt(0)}</span>
                    </div>
                    <span className="font-medium text-gray-900">{func.nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">@{func.usuario}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${func.cargo === 'gerente' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {func.cargo === 'gerente' ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {func.cargo === 'gerente' ? 'Gerente' : 'Funcionário'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{(func.permissoes || []).length} permissões</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${func.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {func.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button onClick={() => abrirEditar(func)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => deletar(func.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">{editando ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                <input type="text" value={form.usuario} onChange={e => setForm({...form, usuario: e.target.value})} disabled={!!editando} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{editando ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}</label>
                <input type="password" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                <select value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="funcionario">Funcionário</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm({...form, ativo: e.target.checked})} className="rounded" />
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">Ativo</label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Permissões</label>
                  <button type="button" onClick={selecionarTodas} className="text-xs text-blue-600 hover:underline">Selecionar todas</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSOES_DISPONIVEIS.map(perm => (
                    <label key={perm.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${form.permissoes.includes(perm.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <input type="checkbox" checked={form.permissoes.includes(perm.id)} onChange={() => togglePermissao(perm.id)} className="rounded text-blue-600" />
                      <span className="text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={salvar} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Funcionarios;
