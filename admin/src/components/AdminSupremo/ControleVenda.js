import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ControleVenda = () => {
  const isoToDatetimeLocal = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [config, setConfig] = useState({
    enabled: true,
    mode: 'normal',
    promo_title: '',
    promo_end_at: '',
    brand_text: 'Jellyfin Premium',
    logo_url: null,
    features: [],
    original_price: 29.9,
    promo_price: 19.9
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviews, setReviews] = useState({ pending: [], approved: [] });

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/landing-config');
      setConfig({
        ...res.data,
        promo_end_at: isoToDatetimeLocal(res.data?.promo_end_at),
        brand_text: res.data?.brand_text || 'Jellyfin Premium',
        logo_url: res.data?.logo_url || null,
        features: Array.isArray(res.data?.features) ? res.data.features : []
      });
    } catch (e) {
      alert('Erro ao carregar configuração: ' + (e.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }

  };

  const addFeature = () => {
    const features = Array.isArray(config.features) ? [...config.features] : [];
    features.push({ title: '', description: '' });
    setConfig({ ...config, features });
  };

  const removeFeature = (idx) => {
    const features = Array.isArray(config.features) ? [...config.features] : [];
    features.splice(idx, 1);
    setConfig({ ...config, features });
  };

  const updateFeature = (idx, patch) => {
    const features = Array.isArray(config.features) ? [...config.features] : [];
    features[idx] = { ...(features[idx] || { title: '', description: '' }), ...patch };
    setConfig({ ...config, features });
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await axios.post('/api/admin/landing-logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const logoUrl = res.data?.logo_url;
      if (logoUrl) {
        setConfig({ ...config, logo_url: logoUrl });
        alert('Logo enviada! Clique em Salvar para aplicar na landing-config.');
      } else {
        alert('Upload feito, mas backend não retornou logo_url');
      }
    } catch (e) {
      alert('Erro ao enviar logo: ' + (e.response?.data?.detail || 'Erro interno'));
    } finally {
      setLogoUploading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const res = await axios.get('/api/admin/reviews');
      setReviews({
        pending: Array.isArray(res.data?.pending) ? res.data.pending : [],
        approved: Array.isArray(res.data?.approved) ? res.data.approved : []
      });
    } catch (e) {
      setReviews({ pending: [], approved: [] });
    } finally {
      setReviewsLoading(false);
    }
  };

  const approveReview = async (id) => {
    try {
      await axios.post(`/api/admin/reviews/${id}/approve`);
      await loadReviews();
    } catch (e) {
      alert('Erro ao aprovar: ' + (e.response?.data?.detail || 'Erro interno'));
    }
  };

  const rejectReview = async (id) => {
    try {
      await axios.post(`/api/admin/reviews/${id}/reject`);
      await loadReviews();
    } catch (e) {
      alert('Erro ao rejeitar: ' + (e.response?.data?.detail || 'Erro interno'));
    }
  };

  const deleteApprovedReview = async (id) => {
    try {
      await axios.post(`/api/admin/reviews/${id}/delete`);
      await loadReviews();
    } catch (e) {
      alert('Erro ao remover: ' + (e.response?.data?.detail || 'Erro interno'));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      let promoEndRaw = (config.promo_end_at || '').trim();
      if (promoEndRaw && promoEndRaw.length === 10) {
        promoEndRaw = `${promoEndRaw}T23:59`;
      }

      let promoEndIso = null;
      if (promoEndRaw) {
        const d = new Date(promoEndRaw);
        if (Number.isNaN(d.getTime())) {
          alert('Validade da promoção inválida. Selecione data e hora.');
          setSaving(false);
          return;
        }
        promoEndIso = d.toISOString();
      }

      const payload = {
        enabled: !!config.enabled,
        mode: config.mode,
        promo_title: config.promo_title,
        promo_end_at: promoEndIso,
        brand_text: config.brand_text,
        logo_url: config.logo_url || null,
        features: Array.isArray(config.features) ? config.features : [],
        original_price: Number(config.original_price),
        promo_price: Number(config.promo_price)
      };
      const res = await axios.post('/api/admin/landing-config', payload);
      setConfig({
        ...res.data,
        promo_end_at: isoToDatetimeLocal(res.data?.promo_end_at),
        brand_text: res.data?.brand_text || 'Jellyfin Premium',
        logo_url: res.data?.logo_url || null,
        features: Array.isArray(res.data?.features) ? res.data.features : []
      });
      alert('Salvo com sucesso!');
    } catch (e) {
      alert('Erro ao salvar: ' + (e.response?.data?.detail || 'Erro interno'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Controle da Página de Venda</h1>
        <p className="text-gray-600 mt-1">Ative/desative a landing page e configure promoções</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Página de venda</p>
            <p className="text-xs text-gray-500">Quando desativada, a venda exibe 404</p>
          </div>
          <button
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            className={`px-4 py-2 rounded-lg font-medium ${config.enabled ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            {config.enabled ? 'Ativa' : 'Desativada'}
          </button>
        </div>

        <div className="border-t pt-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Modo da página</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfig({ ...config, mode: 'normal' })}
              className={`px-4 py-2 rounded-lg font-medium ${config.mode === 'normal' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Normal
            </button>
            <button
              onClick={() => setConfig({ ...config, mode: 'promo' })}
              className={`px-4 py-2 rounded-lg font-medium ${config.mode === 'promo' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Promoção
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título da promoção</label>
            <input
              type="text"
              value={config.promo_title || ''}
              onChange={(e) => setConfig({ ...config, promo_title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ex: Promoção de Carnaval"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texto ao lado da logo</label>
            <input
              type="text"
              value={config.brand_text || ''}
              onChange={(e) => setConfig({ ...config, brand_text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ex: Jellyfin Premium"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validade da promoção</label>
            <input
              type="datetime-local"
              value={config.promo_end_at || ''}
              onChange={(e) => setConfig({ ...config, promo_end_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preço original (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={config.original_price}
              onChange={(e) => setConfig({ ...config, original_price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preço promocional (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={config.promo_price}
              onChange={(e) => setConfig({ ...config, promo_price: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Logo da página de vendas</p>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadLogo(e.target.files?.[0])}
              className="block"
              disabled={logoUploading}
            />
            {config.logo_url ? (
              <div className="text-xs text-gray-600 break-all">Atual: {config.logo_url}</div>
            ) : (
              <div className="text-xs text-gray-500">Nenhuma logo configurada</div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">O que você recebe (itens)</p>
            <button
              onClick={addFeature}
              className="bg-gray-200 text-gray-800 font-medium py-2 px-3 rounded-lg hover:bg-gray-300"
            >
              Adicionar item
            </button>
          </div>

          <div className="space-y-3">
            {(Array.isArray(config.features) ? config.features : []).map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-4">
                  <input
                    type="text"
                    value={it?.title || ''}
                    onChange={(e) => updateFeature(idx, { title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Título"
                  />
                </div>
                <div className="md:col-span-7">
                  <input
                    type="text"
                    value={it?.description || ''}
                    onChange={(e) => updateFeature(idx, { description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Descrição"
                  />
                </div>
                <div className="md:col-span-1">
                  <button
                    onClick={() => removeFeature(idx)}
                    className="w-full bg-red-100 text-red-700 font-medium py-2 px-3 rounded-lg hover:bg-red-200"
                  >
                    X
                  </button>
                </div>
              </div>
            ))}
            {(Array.isArray(config.features) ? config.features : []).length === 0 ? (
              <div className="text-sm text-gray-500">Nenhum item. Clique em “Adicionar item”.</div>
            ) : null}
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Comentários (moderação)</p>
            <button
              onClick={loadReviews}
              className="bg-gray-200 text-gray-800 font-medium py-2 px-3 rounded-lg hover:bg-gray-300"
              disabled={reviewsLoading}
            >
              {reviewsLoading ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-3">Pendentes</p>
              {(Array.isArray(reviews.pending) ? reviews.pending : []).length === 0 ? (
                <div className="text-sm text-gray-500">Nenhum comentário pendente.</div>
              ) : (
                <div className="space-y-3">
                  {reviews.pending.map((r) => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                        <div className="flex gap-2">
                          <button onClick={() => approveReview(r.id)} className="bg-green-600 text-white text-sm font-medium py-1 px-3 rounded-lg">Aprovar</button>
                          <button onClick={() => rejectReview(r.id)} className="bg-red-600 text-white text-sm font-medium py-1 px-3 rounded-lg">Rejeitar</button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 mt-2">{r.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-800 mb-3">Aprovados</p>
              {(Array.isArray(reviews.approved) ? reviews.approved : []).length === 0 ? (
                <div className="text-sm text-gray-500">Nenhum comentário aprovado.</div>
              ) : (
                <div className="space-y-3">
                  {reviews.approved.map((r) => (
                    <div key={r.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-900">{r.name}</div>
                        <button onClick={() => deleteApprovedReview(r.id)} className="bg-gray-200 text-gray-800 text-sm font-medium py-1 px-3 rounded-lg">Remover</button>
                      </div>
                      <div className="text-sm text-gray-700 mt-2">{r.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={loadConfig}
            className="bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700"
          >
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControleVenda;
