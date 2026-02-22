import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, Send, Users, Search, Mic, MicOff, Paperclip, Phone, PhoneOff, Video, Play, Pause, FileText, Image, X } from 'lucide-react';

const ChatInterno = () => {
  const { admin } = useAuth();
  const [mensagens, setMensagens] = useState([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [funcionarios, setFuncionarios] = useState([]);
  const [destinatarioSelecionado, setDestinatarioSelecionado] = useState(null);
  const [busca, setBusca] = useState('');
  const [modoGrupo, setModoGrupo] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Audio recording
  const [gravando, setGravando] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const timerRef = useRef(null);

  // Audio playback
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // Group cover
  const [groupCoverUrl, setGroupCoverUrl] = useState(null);

  // Calls
  const [currentCall, setCurrentCall] = useState(null);
  const [activeCalls, setActiveCalls] = useState([]);

  useEffect(() => {
    loadFuncionarios();
    loadGroupCover();
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (destinatarioSelecionado) {
      loadMensagens();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(loadMensagens, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [destinatarioSelecionado]);

  useEffect(() => { scrollToBottom(); }, [mensagens]);

  const loadActiveCalls = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/chat-interno/chamadas/ativas');
      setActiveCalls(Array.isArray(res.data) ? res.data : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadActiveCalls();
    const iv = setInterval(loadActiveCalls, 8000);
    return () => clearInterval(iv);
  }, [loadActiveCalls]);

  const connectWebSocket = () => {
    try {
      const token = localStorage.getItem('adminToken');
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/chat-interno?token=${token}`;
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'nova_mensagem') {
          setMensagens(prev => [...prev, data]);
        }
        if (data.type === 'chamada_iniciada' || data.type === 'chamada_encerrada') {
          loadActiveCalls();
        }
      };
      ws.onerror = () => {};
      ws.onclose = () => { setTimeout(connectWebSocket, 5000); };
      wsRef.current = ws;
    } catch (e) { console.error('WS error:', e); }
  };

  const loadFuncionarios = async () => {
    try {
      const res = await axios.get('/api/admin/funcionarios');
      const allFuncs = res.data || [];
      setFuncionarios(allFuncs.filter(f => f.ativo && f.id !== admin?.id));
    } catch {
      setFuncionarios([{ id: 'admin_supremo', nome: 'Admin Supremo', usuario: 'admin' }]);
    }
  };

  const loadMensagens = async () => {
    if (!destinatarioSelecionado) return;
    try {
      const res = await axios.get(`/api/admin/chat-interno/mensagens/${destinatarioSelecionado.id}`);
      setMensagens(res.data || []);
    } catch { /* ignore */ }
  };

  const loadGroupCover = async () => {
    try {
      const res = await axios.get('/api/admin/chat-interno/cover', { responseType: 'blob' });
      setGroupCoverUrl(URL.createObjectURL(res.data));
    } catch { setGroupCoverUrl(null); }
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !destinatarioSelecionado) return;
    try {
      await axios.post('/api/admin/chat-interno/enviar', {
        para: modoGrupo && destinatarioSelecionado.id === 'todos' ? 'todos' : destinatarioSelecionado.id,
        mensagem: novaMensagem.trim(),
      });
      setNovaMensagem('');
      loadMensagens();
    } catch (err) { alert('Erro ao enviar: ' + (err.response?.data?.detail || 'Erro')); }
  };

  // Audio recording
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (!destinatarioSelecionado) return;
        const fd = new FormData();
        fd.append('file', blob, `audio_${Date.now()}.webm`);
        const para = modoGrupo && destinatarioSelecionado.id === 'todos' ? 'todos' : destinatarioSelecionado.id;
        try {
          await axios.post(`/api/admin/chat-interno/upload?para=${para}`, fd);
          loadMensagens();
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

  // File upload
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !destinatarioSelecionado) return;
    const fd = new FormData();
    fd.append('file', file);
    const para = modoGrupo && destinatarioSelecionado.id === 'todos' ? 'todos' : destinatarioSelecionado.id;
    try {
      await axios.post(`/api/admin/chat-interno/upload?para=${para}`, fd);
      loadMensagens();
    } catch { alert('Erro ao enviar arquivo'); }
    e.target.value = '';
  };

  // Cover image upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await axios.post('/api/admin/chat-interno/cover', fd);
      loadGroupCover();
      alert('Imagem de capa atualizada!');
    } catch (err) { alert('Erro: ' + (err.response?.data?.detail || 'Erro ao enviar capa')); }
    e.target.value = '';
  };

  // Audio playback
  const toggleAudio = (msgId, url) => {
    if (playingId === msgId) { audioRef.current?.pause(); setPlayingId(null); }
    else {
      if (audioRef.current) audioRef.current.pause();
      const a = new Audio(url); a.onended = () => setPlayingId(null); a.play();
      audioRef.current = a; setPlayingId(msgId);
    }
  };

  // Calls
  const handleIniciarChamada = async (tipo = 'individual') => {
    if (!destinatarioSelecionado) return;
    try {
      const res = await axios.post('/api/admin/chat-interno/chamada/iniciar', {
        para: destinatarioSelecionado.id,
        tipo,
      });
      setCurrentCall(res.data);
      loadMensagens();
      loadActiveCalls();
    } catch (err) { alert('Erro: ' + (err.response?.data?.detail || 'Erro')); }
  };

  const handleEncerrarChamada = async () => {
    if (!currentCall) return;
    try {
      await axios.post('/api/admin/chat-interno/chamada/encerrar', { call_id: currentCall.call_id });
      loadActiveCalls();
      loadMensagens();
    } catch { /* ignore */ }
    setCurrentCall(null);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const funcionariosFiltrados = funcionarios.filter(f =>
    f.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    f.usuario?.toLowerCase().includes(busca.toLowerCase())
  );

  const formatarHora = (dataStr) => {
    if (!dataStr) return '';
    return new Date(dataStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    const hoje = new Date();
    const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
    if (data.toDateString() === hoje.toDateString()) return 'Hoje';
    if (data.toDateString() === ontem.toDateString()) return 'Ontem';
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const myId = admin?.id;

  const renderMensagem = (msg, idx) => {
    const ehMinha = String(msg.de) === String(myId);
    const isSistema = msg.de === 'sistema' || msg.tipo === 'system';
    const mostrarData = idx === 0 || formatarData(msg.data_criacao) !== formatarData(mensagens[idx - 1]?.data_criacao);

    return (
      <React.Fragment key={msg.id || idx}>
        {mostrarData && (
          <div className="flex justify-center my-4">
            <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">{formatarData(msg.data_criacao)}</span>
          </div>
        )}
        {isSistema ? (
          <div className="flex justify-center my-2">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-1.5 rounded-full text-xs font-medium">{msg.mensagem}</div>
          </div>
        ) : (
          <div className={`flex ${ehMinha ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md px-4 py-2 rounded-2xl shadow-sm ${ehMinha ? 'bg-blue-500 text-white rounded-br-md' : 'bg-white text-gray-900 rounded-bl-md'}`}>
              {!ehMinha && msg.de_nome && <p className="text-xs font-semibold text-blue-600 mb-1">{msg.de_nome}</p>}
              {msg.tipo === 'audio' && msg.file_url ? (
                <div className="flex items-center space-x-2">
                  <button onClick={() => toggleAudio(msg.id, msg.file_url)} className={`p-1 rounded-full ${ehMinha ? 'hover:bg-blue-400' : 'hover:bg-gray-100'}`}>
                    {playingId === msg.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <div className="flex-1"><div className={`h-1 rounded-full ${ehMinha ? 'bg-blue-400' : 'bg-gray-300'}`}><div className={`h-1 rounded-full w-1/2 ${ehMinha ? 'bg-white' : 'bg-blue-500'}`} /></div></div>
                  <span className={`text-xs ${ehMinha ? 'text-blue-200' : 'text-gray-500'}`}>Áudio</span>
                </div>
              ) : msg.tipo === 'image' && msg.file_url ? (
                <img src={msg.file_url} alt={msg.file_name || 'Imagem'} className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer" onClick={() => window.open(msg.file_url, '_blank')} />
              ) : msg.tipo === 'file' && msg.file_url ? (
                <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center space-x-2 ${ehMinha ? 'text-white underline' : 'text-blue-600 underline'}`}>
                  <FileText className="h-4 w-4" /><span className="text-sm">{msg.file_name || 'Arquivo'}</span>
                </a>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{msg.mensagem}</p>
              )}
              <div className={`flex justify-end mt-1 ${ehMinha ? 'text-blue-100' : 'text-gray-400'}`}>
                <span className="text-[10px]">{formatarHora(msg.data_criacao)}</span>
              </div>
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="h-[calc(100vh-120px)] flex bg-gray-50 rounded-lg overflow-hidden shadow">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Chat Interno
            </h2>
            <button onClick={() => setModoGrupo(!modoGrupo)}
              className={`p-2 rounded-lg transition-colors ${modoGrupo ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Modo grupo">
              <Users className="h-5 w-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          {activeCalls.length > 0 && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
              <span className="text-red-700 text-xs font-medium">{activeCalls.length} chamada(s) ativa(s)</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {modoGrupo && (
            <div onClick={() => setDestinatarioSelecionado({ id: 'todos', nome: 'Grupo Geral', usuario: 'todos' })}
              className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${destinatarioSelecionado?.id === 'todos' ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                {groupCoverUrl ? (
                  <img src={groupCoverUrl} alt="Grupo" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Grupo Geral</p>
                  <p className="text-xs text-gray-500">Todos</p>
                </div>
                {admin?.tipo === 'admin' && (
                  <>
                    <input type="file" ref={coverInputRef} onChange={handleCoverUpload} className="hidden" accept="image/*" />
                    <button onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }} className="p-1 text-gray-400 hover:text-blue-600" title="Alterar capa do grupo">
                      <Image className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          {admin?.tipo === 'funcionario' && (
            <div onClick={() => setDestinatarioSelecionado({ id: 'admin_supremo', nome: 'Admin Supremo', usuario: 'admin' })}
              className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${destinatarioSelecionado?.id === 'admin_supremo' ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">A</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div><p className="font-semibold text-gray-900">Admin Supremo</p><p className="text-xs text-gray-500">Administrador</p></div>
              </div>
            </div>
          )}
          {funcionariosFiltrados.map((func) => (
            <div key={func.id} onClick={() => setDestinatarioSelecionado(func)}
              className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${destinatarioSelecionado?.id === func.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">{func.nome?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{func.nome}</p>
                  <p className="text-xs text-gray-500 truncate">@{func.usuario}</p>
                </div>
              </div>
            </div>
          ))}
          {funcionariosFiltrados.length === 0 && !modoGrupo && admin?.tipo !== 'funcionario' && (
            <div className="p-8 text-center text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum funcionário</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {destinatarioSelecionado ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                    {destinatarioSelecionado.id === 'todos' && groupCoverUrl ? (
                      <img src={groupCoverUrl} alt="Grupo" className="w-full h-full object-cover" />
                    ) : destinatarioSelecionado.id === 'todos' ? (
                      <Users className="h-5 w-5 text-white" />
                    ) : (
                      <span className="text-white font-bold">{destinatarioSelecionado.nome?.charAt(0)?.toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{destinatarioSelecionado.nome}</p>
                    <p className="text-xs text-green-600">Online</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {!currentCall ? (
                    <>
                      <button onClick={() => handleIniciarChamada('individual')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Ligação individual"><Phone className="h-4 w-4" /></button>
                      {destinatarioSelecionado.id === 'todos' && (
                        <button onClick={() => handleIniciarChamada('grupo')} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="Chamada em grupo"><Video className="h-4 w-4" /></button>
                      )}
                    </>
                  ) : (
                    <button onClick={handleEncerrarChamada} className="p-2 text-red-600 hover:bg-red-50 rounded-lg animate-pulse" title="Encerrar chamada"><PhoneOff className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
              {currentCall && (
                <div className="mt-2 flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-700 text-xs font-medium">Chamada {currentCall.tipo} em andamento</span>
                  <button onClick={handleEncerrarChamada} className="ml-auto text-red-600 text-xs underline">Encerrar</button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {mensagens.map((msg, idx) => renderMensagem(msg, idx))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              {gravando ? (
                <div className="flex items-center space-x-3">
                  <div className="flex-1 flex items-center space-x-2 bg-red-50 border border-red-200 rounded-full px-4 py-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-700 font-medium text-sm">Gravando... {formatTime(tempoGravacao)}</span>
                  </div>
                  <button onClick={pararGravacao} className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700"><MicOff className="h-5 w-5" /></button>
                </div>
              ) : (
                <form onSubmit={handleEnviar} className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,audio/*,.pdf,.doc,.docx,.txt" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Anexar arquivo"><Paperclip className="h-5 w-5" /></button>
                  <button type="button" onClick={iniciarGravacao} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="Gravar áudio"><Mic className="h-5 w-5" /></button>
                  <input type="text" value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <button type="submit" disabled={!novaMensagem.trim()}
                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Selecione uma conversa</p>
              <p className="text-gray-400 text-sm mt-1">Escolha um funcionário para conversar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterno;
