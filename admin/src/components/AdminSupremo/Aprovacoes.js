import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardCheck, Check, X, Clock } from 'lucide-react';

const Aprovacoes = () => {
  const [aprovacoes, setAprovacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAprovacoes(); }, []);

  const loadAprovacoes = async () => {
    try {
      const res = await axios.get('/api/admin/aprovacoes');
      setAprovacoes(res.data || []);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const aprovar = async (id) => {
    try {
      await axios.post(`/api/admin/aprovacoes/${id}/aprovar`);
      loadAprovacoes();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro');
    }
  };

  const rejeitar = async (id) => {
    try {
      await axios.post(`/api/admin/aprovacoes/${id}/rejeitar`);
      loadAprovacoes();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro');
    }
  };

  const formatarData = (d) => d ? new Date(d).toLocaleString('pt-BR') : '--';

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  const pendentes = aprovacoes.filter(a => a.status === 'pendente');
  const resolvidas = aprovacoes.filter(a => a.status !== 'pendente');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <ClipboardCheck className="h-7 w-7 text-blue-600" />
        Aprovações
      </h1>

      {pendentes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Pendentes ({pendentes.length})</h2>
          {pendentes.map(a => (
            <div key={a.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{a.tipo}</p>
                  <p className="text-sm text-gray-600">{a.detalhes}</p>
                  <p className="text-xs text-gray-400 mt-1">Por: {a.solicitante_nome} • {formatarData(a.criado_em)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => aprovar(a.id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Check className="h-5 w-5" /></button>
                  <button onClick={() => rejeitar(a.id)} className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"><X className="h-5 w-5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendentes.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma aprovação pendente</p>
        </div>
      )}

      {resolvidas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Histórico</h2>
          {resolvidas.map(a => (
            <div key={a.id} className={`bg-white rounded-lg shadow p-4 border-l-4 ${a.status === 'aprovado' ? 'border-green-400' : 'border-red-400'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{a.tipo}</p>
                  <p className="text-sm text-gray-600">{a.detalhes}</p>
                  <p className="text-xs text-gray-400 mt-1">Por: {a.solicitante_nome} • {formatarData(a.criado_em)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${a.status === 'aprovado' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {a.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'} por {a.resolvido_por}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Aprovacoes;
