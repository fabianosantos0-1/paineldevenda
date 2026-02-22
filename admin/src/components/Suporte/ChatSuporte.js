import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Send, User, MessageCircle, Search, Mic, MicOff, Paperclip, Phone, PhoneOff, Video, UserPlus, XCircle, FileText, Play, Pause, X, Shield, ShieldOff, Settings, PhoneCall } from 'lucide-react';

const ChatSuporte = () => {
  const { sessoesAtivas, mensagens, enviarMensagem, atenderSessao, carregarMensagens, encerrarSessao, carregarSessoes } = useChat();
  const { admin } = useAuth();
  const [sessaoSelecionada, setSessaoSelecionada] = useState(null);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Audio recording
  const [gravando, setGravando] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const timerRef = useRef(null);

  // Audio playback
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioPlayerRef = useRef(null);

  // Account creation modal
  const [showCriarConta, setShowCriarConta] = useState(false);
  const [contaForm, setContaForm] = useState({ nome: '', email: '', senha: '', telefone: '' });
  const [contaLoading, setContaLoading] = useState(false);

  // Active calls
  const [activeCalls, setActiveCalls] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const callRecorderRef = useRef(null);
  const callStreamRef = useRef(null);

  // Tabs: chat, calls, recordings, config
  const [activeTab, setActiveTab] = useState('chat');

  // Recordings
  const [recordings, setRecordings] = useState([]);
  const [recPlayingId, setRecPlayingId] = useState(null);
  const recAudioRef = useRef(null);

  // Chat config
  const [chatConfig, setChatConfig] = useState({ cliente_pode_ligar: false, admin_cargo_display: 'Supervisor' });

  const loadActiveCalls = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/chat/chamadas/ativas');
      setActiveCalls(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  }, []);

  const loadRecordings = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/chat/gravacoes');
      setRecordings(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  }, []);

  const loadChatConfig = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/chat/config');
      setChatConfig(res.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { carregarSessoes(); loadActiveCalls(); loadChatConfig(); }, [carregarSessoes, loadActiveCalls, loadChatConfig]);

  useEffect(() => {
    const iv = setInterval(() => { loadActiveCalls(); }, 8000);
    return () => clearInterval(iv);
  }, [loadActiveCalls]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens, sessaoSelecionada]);

  useEffect(() => {
    if (showCriarConta && sessaoSelecionada) {
      setContaForm(prev => ({ ...prev, nome: sessaoSelecionada.cliente_nome || '', email: sessaoSelecionada.cliente_email || '' }));
    }
  }, [showCriarConta, sessaoSelecionada]);

  useEffect(() => {
    if (activeTab === 'recordings') loadRecordings();
  }, [activeTab, loadRecordings]);

  const handleAtenderSessao = async (sessao) => {
    setLoading(true);
    const result = await atenderSessao(sessao.sessao_id);
    if (result.success) setSessaoSelecionada(sessao);
    setLoading(false);
  };

  const handleEncerrar = async () => {
    if (!sessaoSelecionada) return;
    if (!window.confirm('Encerrar esta sessão de chat?')) return;
    await encerrarSessao(sessaoSelecionada.sessao_id);
    setSessaoSelecionada(null);
  };

  const handleEnviarMensagem = async (e) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !sessaoSelecionada) return;
    const result = await enviarMensagem(sessaoSelecionada.sessao_id, novaMensagem, 'atendente');
    if (result.success) setNovaMensagem('');
  };

  // Block / Unblock
  const handleBloquear = async () => {
    if (!sessaoSelecionada) return;
    const motivo = window.prompt('Motivo do bloqueio (opcional):') || '';
    try {
      await axios.post('/api/admin/chat/bloquear', { email: sessaoSelecionada.cliente_email, motivo, sessao_id: sessaoSelecionada.sessao_id });
      alert('Cliente bloqueado.');
      carregarSessoes();
    } catch (err) { alert('Erro: ' + (err.response?.data?.detail || 'Erro')); }
  };

  const handleDesbloquear = async () => {
    if (!sessaoSelecionada) return;
    try {
      await axios.post('/api/admin/chat/desbloquear', { email: sessaoSelecionada.cliente_email });
      alert('Cliente desbloqueado.');
      carregarSessoes();
    } catch (err) { alert('Erro: ' + (err.response?.data?.detail || 'Erro')); }
  };

  // Call initiation with recording
  const handleIniciarChamada = async (tipo = 'individual') => {
    if (!sessaoSelecionada) return;
    try {
      const res = await axios.post('/api/admin/chat/chamada/iniciar', { sessao_id: sessaoSelecionada.sessao_id, tipo });
      const call = res.data;
      setCurrentCall(call);
      await carregarMensagens(sessaoSelecionada.sessao_id);
      loadActiveCalls();
      // Start recording audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        callStreamRef.current = stream;
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        const chunks = [];
        recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const fd = new FormData();
          fd.append('file', blob, `gravacao_${call.call_id}.webm`);
          try {
            await axios.post(`/api/admin/chat/gravacao/upload?call_id=${call.call_id}`, fd);
          } catch { /* ignore */ }
        };
        recorder.start();
        callRecorderRef.current = recorder;
      } catch { /* mic not available */ }
    } catch (err) { alert('Erro ao iniciar chamada: ' + (err.response?.data?.detail || 'Erro')); }
  };

  const handleEncerrarChamada = async () => {
    if (!currentCall) return;
    // Stop recording
    if (callRecorderRef.current && callRecorderRef.current.state !== 'inactive') {
      callRecorderRef.current.stop();
    }
    try {
      await axios.post('/api/admin/chat/chamada/encerrar', { call_id: currentCall.call_id });
      if (sessaoSelecionada) await carregarMensagens(sessaoSelecionada.sessao_id);
      loadActiveCalls();
    } catch { /* ignore */ }
    setCurrentCall(null);
  };

  // Audio recording (chat message)
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (!sessaoSelecionada) return;
        const fd = new FormData();
        fd.append('file', blob, `audio_${Date.now()}.webm`);
        try {
          await axios.post(`/api/chat/upload?sessao_id=${sessaoSelecionada.sessao_id}&remetente=atendente`, fd);
          await carregarMensagens(sessaoSelecionada.sessao_id);
        } catch { alert('Erro ao enviar áudio'); }
      };
      setMediaRecorder(recorder);
      recorder.start();
      setGravando(true);
      setTempoGravacao(0);
      timerRef.current = setInterval(() => setTempoGravacao(t => t + 1), 1000);
    } catch { alert('Não foi possível acessar o microfone'); }
  };

  const pararGravacao = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    setGravando(false);
    clearInterval(timerRef.current);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !sessaoSelecionada) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await axios.post(`/api/chat/upload?sessao_id=${sessaoSelecionada.sessao_id}&remetente=atendente`, fd);
      await carregarMensagens(sessaoSelecionada.sessao_id);
    } catch { alert('Erro ao enviar arquivo'); }
    e.target.value = '';
  };

  const toggleAudio = (msgId, url) => {
    if (playingAudioId === msgId) { audioPlayerRef.current?.pause(); setPlayingAudioId(null); }
    else {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const a = new Audio(url); a.onended = () => setPlayingAudioId(null); a.play();
      audioPlayerRef.current = a; setPlayingAudioId(msgId);
    }
  };

  const toggleRecAudio = (callId, url) => {
    if (recPlayingId === callId) { recAudioRef.current?.pause(); setRecPlayingId(null); }
    else {
      if (recAudioRef.current) recAudioRef.current.pause();
      const a = new Audio(url); a.onended = () => setRecPlayingId(null); a.play();
      recAudioRef.current = a; setRecPlayingId(callId);
    }
  };

  const handleCriarConta = async (e) => {
    e.preventDefault();
    if (!contaForm.nome || !contaForm.email || !contaForm.senha) return;
    setContaLoading(true);
    try {
      await axios.post('/api/admin/chat/criar-conta', { ...contaForm, sessao_id: sessaoSelecionada?.sessao_id || '' });
      alert('Conta criada com sucesso!');
      setShowCriarConta(false);
      setContaForm({ nome: '', email: '', senha: '', telefone: '' });
      if (sessaoSelecionada) await carregarMensagens(sessaoSelecionada.sessao_id);
    } catch (err) { alert('Erro: ' + (err.response?.data?.detail || 'Erro ao criar conta')); }
    setContaLoading(false);
  };

  const handleSaveConfig = async () => {
    try {
      const res = await axios.post('/api/admin/chat/config', chatConfig);
      setChatConfig(res.data);
      alert('Configurações salvas!');
    } catch { alert('Erro ao salvar configurações'); }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const sessoesFiltradas = sessoesAtivas.filter(sessao => {
    const matchesBusca = !busca || sessao.cliente_email?.toLowerCase().includes(busca.toLowerCase()) || sessao.cliente_nome?.toLowerCase().includes(busca.toLowerCase()) || sessao.protocolo?.toLowerCase().includes(busca.toLowerCase());
    const matchesFiltro = filtro === 'todas' || (filtro === 'ativas' && sessao.status === 'ativa') || (filtro === 'minha' && sessao.atendente_id === admin?.id);
    return matchesBusca && matchesFiltro;
  });

  const renderMensagem = (msg) => {
    const isAtendente = msg.remetente === 'atendente';
    const isSistema = msg.remetente === 'sistema' || msg.tipo === 'system';
    if (isSistema) {
      return (<div key={msg.id} className="flex justify-center my-2"><div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-full text-xs font-medium">{msg.mensagem}</div></div>);
    }
    return (
      <div key={msg.id} className={`flex ${isAtendente ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isAtendente ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
          {isAtendente && msg.remetente_cargo && (
            <p className={`text-xs font-semibold mb-0.5 ${isAtendente ? 'text-blue-200' : 'text-blue-600'}`}>{msg.remetente_nome} ({msg.remetente_cargo})</p>
          )}
          {!isAtendente && <p className="text-xs font-semibold mb-0.5 text-purple-600">{msg.remetente_nome || 'Cliente'}</p>}
          {msg.tipo === 'audio' && msg.file_url ? (
            <div className="flex items-center space-x-2">
              <button onClick={() => toggleAudio(msg.id, msg.file_url)} className={`p-1 rounded-full ${isAtendente ? 'hover:bg-blue-500' : 'hover:bg-gray-200'}`}>
                {playingAudioId === msg.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <div className="flex-1"><div className={`h-1 rounded-full ${isAtendente ? 'bg-blue-400' : 'bg-gray-300'}`}><div className={`h-1 rounded-full w-1/2 ${isAtendente ? 'bg-white' : 'bg-blue-500'}`} /></div></div>
              <span className={`text-xs ${isAtendente ? 'text-blue-200' : 'text-gray-500'}`}>Áudio</span>
            </div>
          ) : msg.tipo === 'image' && msg.file_url ? (
            <img src={msg.file_url} alt={msg.file_name || 'Imagem'} className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer" onClick={() => window.open(msg.file_url, '_blank')} />
          ) : msg.tipo === 'file' && msg.file_url ? (
            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center space-x-2 ${isAtendente ? 'text-white underline' : 'text-blue-600 underline'}`}>
              <FileText className="h-4 w-4" /><span className="text-sm">{msg.file_name || 'Arquivo'}</span>
            </a>
          ) : (<p className="text-sm">{msg.mensagem}</p>)}
          <p className={`text-xs mt-1 ${isAtendente ? 'text-blue-100' : 'text-gray-500'}`}>{new Date(msg.data_criacao).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Top tabs */}
      <div className="flex space-x-1 mb-2">
        {[{k:'chat',l:'Chat'},{k:'calls',l:`Chamadas Ativas (${activeCalls.length})`},{k:'recordings',l:'Gravações'},{k:'config',l:'Configurações'}].map(t => (
          <button key={t.k} onClick={() => setActiveTab(t.k)} className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === t.k ? 'bg-white text-blue-600 shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t.l}</button>
        ))}
      </div>

      {/* TAB: Chat */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-lg shadow" style={{ height: 'calc(100% - 44px)' }}>
          <div className="flex h-full">
            {/* Sessions list */}
            <div className="w-80 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Sessões</h2>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Buscar cliente ou protocolo..." value={busca} onChange={(e) => setBusca(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                  </div>
                  <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="todas">Todas</option><option value="ativas">Ativas</option><option value="minha">Minhas</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sessoesFiltradas.length === 0 ? (
                  <div className="p-4 text-center text-gray-500"><MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" /><p>Nenhuma sessão</p></div>
                ) : sessoesFiltradas.map((sessao) => (
                  <div key={sessao.sessao_id} onClick={() => handleAtenderSessao(sessao)}
                    className={`p-3 cursor-pointer border-b border-gray-100 transition-colors ${sessaoSelecionada?.sessao_id === sessao.sessao_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1 min-w-0">
                        <div className={`rounded-full p-2 ${sessao.bloqueado ? 'bg-red-200' : 'bg-gray-200'}`}><User className="h-4 w-4 text-gray-600" /></div>
                        <div className="ml-2 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{sessao.cliente_nome || 'Cliente'}</p>
                          <p className="text-xs text-gray-500 truncate">{sessao.cliente_email}</p>
                          <p className="text-xs text-indigo-600 font-mono mt-0.5">{sessao.protocolo || ''}</p>
                          {sessao.atendente_nome && <p className="text-xs text-green-600 mt-0.5">{sessao.atendente_nome} ({sessao.atendente_cargo || ''})</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end ml-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${sessao.status === 'ativa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {sessao.status === 'ativa' ? 'Ativo' : 'Encerrado'}
                        </span>
                        {sessao.bloqueado && <span className="text-[10px] text-red-600 font-medium mt-0.5">Bloqueado</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              {sessaoSelecionada ? (
                <>
                  {/* Header */}
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="bg-blue-600 rounded-full p-2"><User className="h-4 w-4 text-white" /></div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{sessaoSelecionada.cliente_nome || 'Cliente'}</p>
                          <p className="text-xs text-gray-500">{sessaoSelecionada.cliente_email}</p>
                          <p className="text-xs text-indigo-600 font-mono font-semibold">{sessaoSelecionada.protocolo || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button onClick={() => setShowCriarConta(true)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Criar conta"><UserPlus className="h-4 w-4" /></button>
                        {!currentCall ? (
                          <button onClick={() => handleIniciarChamada('individual')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Ligar (com gravação)"><Phone className="h-4 w-4" /></button>
                        ) : (
                          <button onClick={handleEncerrarChamada} className="p-2 text-red-600 hover:bg-red-50 rounded-lg animate-pulse" title="Encerrar chamada"><PhoneOff className="h-4 w-4" /></button>
                        )}
                        <button onClick={() => handleIniciarChamada('grupo')} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Chamada em grupo"><Video className="h-4 w-4" /></button>
                        {sessaoSelecionada.bloqueado ? (
                          <button onClick={handleDesbloquear} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Desbloquear cliente"><ShieldOff className="h-4 w-4" /></button>
                        ) : (
                          <button onClick={handleBloquear} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg" title="Bloquear cliente"><Shield className="h-4 w-4" /></button>
                        )}
                        {sessaoSelecionada.status === 'ativa' && (
                          <button onClick={handleEncerrar} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Encerrar sessão"><XCircle className="h-4 w-4" /></button>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${sessaoSelecionada.status === 'ativa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {sessaoSelecionada.status === 'ativa' ? 'Ativa' : 'Encerrada'}
                        </span>
                      </div>
                    </div>
                    {currentCall && (
                      <div className="mt-2 flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-700 text-xs font-medium">Chamada {currentCall.tipo} em andamento — Gravação ativa</span>
                        <button onClick={handleEncerrarChamada} className="ml-auto text-red-600 text-xs underline">Encerrar</button>
                      </div>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {(mensagens[sessaoSelecionada.sessao_id] || []).map(renderMensagem)}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  {sessaoSelecionada.status === 'ativa' && (
                    <div className="p-3 border-t border-gray-200">
                      {gravando ? (
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-700 font-medium text-sm">Gravando... {formatTime(tempoGravacao)}</span>
                          </div>
                          <button onClick={pararGravacao} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"><MicOff className="h-5 w-5" /></button>
                        </div>
                      ) : (
                        <form onSubmit={handleEnviarMensagem} className="flex space-x-2">
                          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,audio/*,.pdf,.doc,.docx,.txt" />
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Anexar"><Paperclip className="h-5 w-5" /></button>
                          <button type="button" onClick={iniciarGravacao} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Gravar áudio"><Mic className="h-5 w-5" /></button>
                          <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} placeholder="Digite sua mensagem..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={loading} />
                          <button type="submit" disabled={loading || !novaMensagem.trim()} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"><Send className="h-5 w-5" /></button>
                        </form>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center"><MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Selecione uma sessão para começar</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Active Calls */}
      {activeTab === 'calls' && (
        <div className="bg-white rounded-lg shadow p-6" style={{ height: 'calc(100% - 44px)', overflowY: 'auto' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><PhoneCall className="h-5 w-5 mr-2 text-blue-600" />Chamadas Ativas</h2>
          {activeCalls.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma chamada ativa no momento.</p>
          ) : (
            <div className="space-y-3">
              {activeCalls.map(call => (
                <div key={call.call_id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{call.cliente_nome} — <span className="text-indigo-600 font-mono text-sm">{call.protocolo}</span></p>
                    <p className="text-sm text-gray-500">Tipo: {call.tipo} | Iniciado por: {call.iniciado_por}</p>
                    <p className="text-xs text-gray-400">{new Date(call.data_inicio).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {call.gravacao_ativa && <span className="flex items-center text-red-600 text-xs"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />Gravando</span>}
                    <button onClick={async () => { await axios.post('/api/admin/chat/chamada/encerrar', { call_id: call.call_id }); loadActiveCalls(); }}
                      className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Encerrar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Recordings */}
      {activeTab === 'recordings' && (
        <div className="bg-white rounded-lg shadow p-6" style={{ height: 'calc(100% - 44px)', overflowY: 'auto' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gravações de Chamadas</h2>
          {recordings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma gravação disponível.</p>
          ) : (
            <div className="space-y-3">
              {recordings.map(rec => (
                <div key={rec.call_id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{rec.cliente_nome} — <span className="text-indigo-600 font-mono text-sm">{rec.protocolo}</span></p>
                    <p className="text-sm text-gray-500">Tipo: {rec.tipo} | Por: {rec.iniciado_por}</p>
                    <p className="text-xs text-gray-400">{new Date(rec.data_inicio).toLocaleString('pt-BR')} {rec.data_fim ? `→ ${new Date(rec.data_fim).toLocaleString('pt-BR')}` : ''}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => toggleRecAudio(rec.call_id, rec.gravacao_url)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      {recPlayingId === rec.call_id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                    <a href={rec.gravacao_url} download className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Download</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Config */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-lg shadow p-6" style={{ height: 'calc(100% - 44px)', overflowY: 'auto' }}>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center"><Settings className="h-5 w-5 mr-2 text-gray-600" />Configurações do Chat</h2>
          <div className="space-y-6 max-w-lg">
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" checked={chatConfig.cliente_pode_ligar} onChange={(e) => setChatConfig({ ...chatConfig, cliente_pode_ligar: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Cliente pode ligar</p>
                  <p className="text-sm text-gray-500">Quando ativado, o cliente verá um botão de ligação no chat.</p>
                </div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo exibido (Admin Supremo)</label>
              <input type="text" value={chatConfig.admin_cargo_display} onChange={(e) => setChatConfig({ ...chatConfig, admin_cargo_display: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Supervisor, Gerente, Diretor..." />
              <p className="text-xs text-gray-500 mt-1">Este cargo aparecerá no lugar de "Admin Supremo" nas mensagens do chat.</p>
            </div>
            <button onClick={handleSaveConfig} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Salvar Configurações</button>
          </div>
        </div>
      )}

      {/* Modal Criar Conta */}
      {showCriarConta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Criar Conta para Cliente</h3>
              <button onClick={() => setShowCriarConta(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCriarConta} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={contaForm.nome} onChange={(e) => setContaForm({ ...contaForm, nome: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input type="email" value={contaForm.email} onChange={(e) => setContaForm({ ...contaForm, email: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input type="text" value={contaForm.senha} onChange={(e) => setContaForm({ ...contaForm, senha: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Senha do cliente" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input type="tel" value={contaForm.telefone} onChange={(e) => setContaForm({ ...contaForm, telefone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" /></div>
              <div className="flex space-x-3 pt-2">
                <button type="button" onClick={() => setShowCriarConta(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={contaLoading} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{contaLoading ? 'Criando...' : 'Criar Conta'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSuporte;
