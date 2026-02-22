import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, Calendar, User, Download, Filter, TrendingUp, Award } from 'lucide-react';

const ControlePonto = () => {
  const [registros, setRegistros] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [filtroFuncionario, setFiltroFuncionario] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => { loadData(); }, [filtroFuncionario, filtroPeriodo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [regRes, funcRes] = await Promise.all([
        axios.get('/api/admin/ponto/registros', {
          params: { funcionario_id: filtroFuncionario !== 'todos' ? filtroFuncionario : undefined, periodo: filtroPeriodo }
        }),
        axios.get('/api/admin/funcionarios')
      ]);
      setRegistros(regRes.data || []);
      setFuncionarios(funcRes.data || []);
      calcularStats(regRes.data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const calcularStats = (regs) => {
    const s = {};
    regs.forEach(reg => {
      if (!s[reg.funcionario_id]) {
        s[reg.funcionario_id] = { nome: reg.funcionario_nome, totalHoras: 0, totalDias: 0, mediaHorasDia: 0 };
      }
      if (reg.duracao_minutos) {
        s[reg.funcionario_id].totalHoras += reg.duracao_minutos / 60;
        s[reg.funcionario_id].totalDias += 1;
      }
    });
    Object.keys(s).forEach(id => {
      s[id].mediaHorasDia = s[id].totalDias > 0 ? s[id].totalHoras / s[id].totalDias : 0;
    });
    setStats(s);
  };

  const formatarDuracao = (min) => {
    if (!min) return '--';
    return `${Math.floor(min / 60)}h ${Math.floor(min % 60)}m`;
  };

  const formatarDataHora = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--';

  const exportarCSV = () => {
    const csv = [
      ['Funcionário', 'Login', 'Logout', 'Duração', 'Status'],
      ...registros.map(r => [
        r.funcionario_nome,
        formatarDataHora(r.login_em),
        r.logout_em ? formatarDataHora(r.logout_em) : 'Em andamento',
        formatarDuracao(r.duracao_minutos),
        r.logout_em ? 'Completo' : 'Ativo'
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ponto_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sel = filtroFuncionario !== 'todos' ? stats[filtroFuncionario] : null;

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-7 w-7 text-blue-600" /> Controle de Ponto
          </h1>
          <p className="text-sm text-gray-500 mt-1">Registro de horários dos funcionários</p>
        </div>
        <button onClick={exportarCSV} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select value={filtroFuncionario} onChange={e => setFiltroFuncionario(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="todos">Todos os funcionários</option>
            {funcionarios.filter(f => f.ativo).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="hoje">Hoje</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mês</option>
            <option value="todos">Todos</option>
          </select>
        </div>
      </div>

      {sel && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <Clock className="h-8 w-8 opacity-80 mb-2" />
            <p className="text-sm opacity-90">Total de Horas</p>
            <p className="text-3xl font-bold">{sel.totalHoras.toFixed(1)}h</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <Calendar className="h-8 w-8 opacity-80 mb-2" />
            <p className="text-sm opacity-90">Dias Trabalhados</p>
            <p className="text-3xl font-bold">{sel.totalDias}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <Award className="h-8 w-8 opacity-80 mb-2" />
            <p className="text-sm opacity-90">Média Horas/Dia</p>
            <p className="text-3xl font-bold">{sel.mediaHorasDia.toFixed(1)}h</p>
          </div>
        </div>
      )}

      {filtroFuncionario === 'todos' && Object.keys(stats).length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold text-gray-900">Resumo por Funcionário</h3></div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funcionário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Horas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dias</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Média/Dia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.values(stats).map((s, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{s.nome}</td>
                  <td className="px-6 py-4 font-semibold">{s.totalHoras.toFixed(1)}h</td>
                  <td className="px-6 py-4">{s.totalDias}</td>
                  <td className="px-6 py-4">{s.mediaHorasDia.toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-semibold text-gray-900">Registros Detalhados</h3></div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funcionário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logout</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duração</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {registros.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Nenhum registro</p>
              </td></tr>
            ) : registros.map(reg => (
              <tr key={reg.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{reg.funcionario_nome}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatarDataHora(reg.login_em)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {reg.logout_em ? formatarDataHora(reg.logout_em) : (
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Em andamento
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-semibold">{formatarDuracao(reg.duracao_minutos)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${reg.logout_em ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
                    {reg.logout_em ? 'Completo' : 'Ativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ControlePonto;
