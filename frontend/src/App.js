import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { CreditCard, CheckCircle, Play as PlayIcon, Shield, Users, Star, Loader, MessageCircle, X, Send, Mic, MicOff, Paperclip, Play, Pause, FileText, Phone } from 'lucide-react';
import axios from 'axios';

function App() {
  const [landingConfig, setLandingConfig] = useState({
    enabled: true,
    mode: 'normal',
    promo_title: '',
    brand_text: 'Jellyfin Premium',
    logo_url: null,
    features: [],
    original_price: 29.9,
    promo_price: 19.9
  });
  const [landingLoading, setLandingLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewForm, setReviewForm] = useState({ name: '', message: '', stars: 5 });
  const [reviewSending, setReviewSending] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmacaoSenha: '',
    paymentType: 'trial'  // 'trial' ou 'full'
  });
  const [loading, setLoading] = useState(false);
  const [giftLoading, setGiftLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [giftCode, setGiftCode] = useState('');
  const [giftBuyEmail, setGiftBuyEmail] = useState('');
  const [giftQuantity, setGiftQuantity] = useState(5);
  const [nowTs, setNowTs] = useState(Date.now());

  // Chat de atendimento state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSessaoId, setChatSessaoId] = useState(null);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatEmail, setChatEmail] = useState('');
  const [chatNome, setChatNome] = useState('');
  const [chatStarted, setChatStarted] = useState(false);
  const [chatProtocolo, setChatProtocolo] = useState('');
  const [chatClientePodeLigar, setChatClientePodeLigar] = useState(false);
  const chatEndRef = useRef(null);
  const chatPollRef = useRef(null);
  const chatFileRef = useRef(null);
  const chatAudioRef = useRef(null);
  const [chatGravando, setChatGravando] = useState(false);
  const [chatRecorder, setChatRecorder] = useState(null);
  const [chatGravTempo, setChatGravTempo] = useState(0);
  const chatTimerRef = useRef(null);
  const [chatPlayingId, setChatPlayingId] = useState(null);

  useEffect(() => {
    const loadLanding = async () => {
      setLandingLoading(true);
      try {
        const res = await axios.get('/api/public/landing-config');
        setLandingConfig(res.data);
      } catch (e) {
        setLandingConfig({
          enabled: true,
          mode: 'normal',
          promo_title: '',
          brand_text: 'Jellyfin Premium',
          original_price: 29.9,
          promo_price: 19.9
        });
      } finally {
        setLandingLoading(false);
      }
    };

    loadLanding();
  }, []);

  useEffect(() => {
    const loadReviews = async () => {
      setReviewsLoading(true);
      try {
        const res = await axios.get('/api/public/reviews');
        const list = Array.isArray(res.data?.reviews) ? res.data.reviews : [];
        setReviews(list);
        setReviewIndex(0);
      } catch (e) {
        setReviews([]);
        setReviewIndex(0);
      } finally {
        setReviewsLoading(false);
      }
    };
    loadReviews();
  }, []);

  useEffect(() => {
    if (!Array.isArray(reviews) || reviews.length <= 1) return;
    const id = window.setInterval(() => {
      setReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [reviews]);

  const sendReview = async (e) => {
    e.preventDefault();
    const name = String(reviewForm.name || '').trim();
    const message = String(reviewForm.message || '').trim();
    const stars = Number(reviewForm.stars);
    if (!name || !message) return;
    setReviewSending(true);
    try {
      await axios.post('/api/public/reviews', { name, message, stars });
      setReviewForm({ name: '', message: '', stars: 5 });
      alert('Comentário enviado! Após aprovação, ele aparecerá no site.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao enviar comentário');
    } finally {
      setReviewSending(false);
    }
  };

  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Chat polling
  const pollChatMsgs = useCallback(async (sid) => {
    if (!sid) return;
    try {
      const res = await axios.get(`/api/chat/sessao/${sid}/mensagens`);
      setChatMsgs(Array.isArray(res.data) ? res.data : []);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (chatSessaoId) {
      pollChatMsgs(chatSessaoId);
      chatPollRef.current = setInterval(() => pollChatMsgs(chatSessaoId), 4000);
    }
    return () => clearInterval(chatPollRef.current);
  }, [chatSessaoId, pollChatMsgs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  const handleChatStart = async () => {
    if (!chatEmail.trim()) return;
    try {
      const res = await axios.post('/api/chat/iniciar', { email: chatEmail.trim(), nome: chatNome.trim() || 'Visitante' });
      setChatSessaoId(res.data.sessao_id);
      setChatProtocolo(res.data.protocolo || '');
      setChatClientePodeLigar(res.data.cliente_pode_ligar || false);
      setChatStarted(true);
    } catch (e) {
      alert(e.response?.data?.detail || 'Erro ao iniciar chat');
    }
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatSessaoId) return;
    setChatSending(true);
    try {
      await axios.post('/api/chat/mensagem', { sessao_id: chatSessaoId, mensagem: chatInput.trim(), remetente: 'cliente' });
      setChatInput('');
      await pollChatMsgs(chatSessaoId);
    } catch (err) { /* ignore */ }
    setChatSending(false);
  };

  const handleChatFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !chatSessaoId) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await axios.post(`/api/chat/upload?sessao_id=${chatSessaoId}&remetente=cliente`, fd);
      await pollChatMsgs(chatSessaoId);
    } catch (err) { alert('Erro ao enviar arquivo'); }
    e.target.value = '';
  };

  const chatIniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('file', blob, `audio_${Date.now()}.webm`);
        try {
          await axios.post(`/api/chat/upload?sessao_id=${chatSessaoId}&remetente=cliente`, fd);
          await pollChatMsgs(chatSessaoId);
        } catch (err) { alert('Erro ao enviar áudio'); }
      };
      setChatRecorder(recorder);
      recorder.start();
      setChatGravando(true);
      setChatGravTempo(0);
      chatTimerRef.current = setInterval(() => setChatGravTempo(t => t + 1), 1000);
    } catch (err) { alert('Não foi possível acessar o microfone'); }
  };

  const chatPararGravacao = () => {
    if (chatRecorder && chatRecorder.state !== 'inactive') chatRecorder.stop();
    setChatGravando(false);
    clearInterval(chatTimerRef.current);
  };

  const chatToggleAudio = (msgId, url) => {
    if (chatPlayingId === msgId) {
      chatAudioRef.current?.pause();
      setChatPlayingId(null);
    } else {
      if (chatAudioRef.current) chatAudioRef.current.pause();
      const audio = new Audio(url);
      audio.onended = () => setChatPlayingId(null);
      audio.play();
      chatAudioRef.current = audio;
      setChatPlayingId(msgId);
    }
  };

  const chatFormatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const formatBRL = (value) => {
    const n = Number(value);
    if (Number.isNaN(n)) return '0,00';
    return n.toFixed(2).replace('.', ',');
  };

  const priceDisplay = useMemo(() => {
    const original = Number(landingConfig.original_price);
    const promo = Number(landingConfig.promo_price);
    const promoEndAt = landingConfig.promo_end_at ? Date.parse(landingConfig.promo_end_at) : NaN;
    const promoIsValid = Number.isFinite(promoEndAt) ? promoEndAt > nowTs : true;
    const isPromo = landingConfig.mode === 'promo' && promoIsValid;
    return {
      isPromo,
      original,
      promo,
      current: isPromo ? promo : original,
      promoEndAt: Number.isFinite(promoEndAt) ? promoEndAt : null
    };
  }, [landingConfig, nowTs]);

  const defaultFeatures = useMemo(() => ([
    { title: 'Catálogo Completo', description: 'Acesso a milhares de filmes, séries e documentários' },
    { title: 'Alta Qualidade', description: 'Conteúdo em 4K HDR com áudio imersivo' },
    { title: 'Múltiplos Dispositivos', description: 'Assista onde e quando quiser' },
    { title: 'Sem Anúncios', description: 'Experiência de entretenimento contínua' },
    { title: 'TV ao Vivo', description: 'Canais ao vivo 24h' },
    { title: 'Downloads Offline', description: 'Leve seus conteúdos favoritos para qualquer lugar' }
  ]), []);

  const featuresToRender = useMemo(() => {
    const f = landingConfig.features;
    if (Array.isArray(f) && f.length > 0) return f;
    return defaultFeatures;
  }, [landingConfig.features, defaultFeatures]);

  const countdownText = useMemo(() => {
    if (!priceDisplay.isPromo) return '';
    if (!priceDisplay.promoEndAt) return '';
    const diff = Math.max(0, priceDisplay.promoEndAt - nowTs);
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return {
      days,
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds)
    };
  }, [priceDisplay.isPromo, priceDisplay.promoEndAt, nowTs]);

  const promoBannerTitle = useMemo(() => {
    const t = String(landingConfig.promo_title || '').trim();
    return t || 'Promoção';
  }, [landingConfig.promo_title]);

  const promoValidUntilText = useMemo(() => {
    if (!priceDisplay.promoEndAt) return '';
    try {
      return new Date(priceDisplay.promoEndAt).toLocaleString('pt-BR');
    } catch {
      return '';
    }
  }, [priceDisplay.promoEndAt]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e, paymentTypeOverride) => {
    e.preventDefault();
    const pt = paymentTypeOverride ?? formData.paymentType;
    setLoading(true);
    setError('');

    try {
      const payload = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        senha: formData.senha,
        confirmacao_senha: formData.confirmacaoSenha,
        payment_type: pt
      };
      
      const response = await axios.post('/api/registro', payload);
      
      // Redirecionar para página de pagamento do Mercado Pago
      window.location.href = response.data.payment_url;
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao processar cadastro');
    } finally {
      setLoading(false);
    }
  };

  const handleGiftRedeem = async () => {
    setGiftLoading(true);
    setError('');
    setSuccess(false);
    try {
      const payload = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        senha: formData.senha,
        confirmacao_senha: formData.confirmacaoSenha,
        giftcard_code: giftCode
      };
      await axios.post('/api/registro/giftcard', payload);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao resgatar GiftCard');
    } finally {
      setGiftLoading(false);
    }
  };

  const handleGiftBuy = async () => {
    setGiftLoading(true);
    setError('');
    setSuccess(false);
    try {
      const payload = {
        buyer_email: giftBuyEmail,
        quantity: Number(giftQuantity)
      };
      const response = await axios.post('/api/giftcards/checkout', payload);
      window.location.href = response.data.payment_url;
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar checkout de GiftCards');
    } finally {
      setGiftLoading(false);
    }
  };

  return (
    landingLoading ? (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-800 flex items-center justify-center">
        <div className="text-white flex items-center space-x-3">
          <Loader className="w-6 h-6 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    ) : !landingConfig.enabled ? (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="max-w-xl w-full text-center">
          <h1 className="text-4xl font-bold mb-3">404</h1>
          <p className="text-gray-300">Página de venda temporariamente indisponível.</p>
        </div>
      </div>
    ) : (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-800">
      {priceDisplay.isPromo && priceDisplay.promoEndAt && countdownText ? (
        <div className="bg-yellow-400 text-gray-950 border-b border-black/10">
          <div className="container mx-auto px-4 py-2">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
                <div className="font-extrabold tracking-tight">
                  {promoBannerTitle}
                </div>
                <div className="text-sm font-semibold">
                  Promoção válida até: <span className="font-bold">{promoValidUntilText}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="bg-white/70 rounded-md px-3 py-2 text-center min-w-[68px]">
                    <div className="text-xl font-extrabold leading-none">{countdownText.days}</div>
                    <div className="text-[11px] font-bold tracking-wider">DIAS</div>
                  </div>
                  <div className="bg-white/70 rounded-md px-3 py-2 text-center min-w-[68px]">
                    <div className="text-xl font-extrabold leading-none">{countdownText.hours}</div>
                    <div className="text-[11px] font-bold tracking-wider">HORAS</div>
                  </div>
                  <div className="bg-white/70 rounded-md px-3 py-2 text-center min-w-[68px]">
                    <div className="text-xl font-extrabold leading-none">{countdownText.minutes}</div>
                    <div className="text-[11px] font-bold tracking-wider">MINUTOS</div>
                  </div>
                  <div className="bg-white/70 rounded-md px-3 py-2 text-center min-w-[68px]">
                    <div className="text-xl font-extrabold leading-none">{countdownText.seconds}</div>
                    <div className="text-[11px] font-bold tracking-wider">SEGUNDOS</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {/* Header */}
      <header className="bg-black bg-opacity-20 backdrop-blur-md border-b border-white border-opacity-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {landingConfig.logo_url ? (
                <img src={landingConfig.logo_url} alt="Logo" className="h-8 w-8 object-contain" />
              ) : (
                <PlayIcon className="w-8 h-8 text-white" />
              )}
              <span className="text-2xl font-bold text-white">{landingConfig.brand_text || 'Jellyfin Premium'}</span>
            </div>
            <div className="flex items-center space-x-4 text-white">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Pagamento Seguro</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Acesso Ilimitado aos Melhores Filmes e Séries
            </h1>
            <p className="text-xl text-purple-100 mb-8">
              {landingConfig.mode === 'promo' && landingConfig.promo_title ? landingConfig.promo_title : 'Assine hoje e tenha acesso a milhares de conteúdos'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Features */}
            <div className="space-y-6">
              <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 border border-white border-opacity-20">
                <h2 className="text-2xl font-bold text-white mb-6">O que você recebe:</h2>
                
                <div className="space-y-4">
                  {featuresToRender.map((it, idx) => (
                    <div className="flex items-start space-x-3" key={`${it.title}-${idx}`}>
                      <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-white font-semibold">{it.title}</h3>
                        <p className="text-purple-100 text-sm">{it.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Proof */}
              <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 border border-white border-opacity-20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-5 h-5 text-yellow-400 ${i < Number(reviews?.[reviewIndex]?.stars || 5) ? 'fill-current' : ''}`} />
                    ))}
                  </div>
                  <span className="text-white font-semibold">Avaliações</span>
                </div>

                {reviewsLoading ? (
                  <p className="text-purple-100 text-sm">Carregando comentários...</p>
                ) : (Array.isArray(reviews) && reviews.length > 0) ? (
                  <div>
                    <p className="text-purple-100 text-sm mb-3">
                      "{reviews[reviewIndex]?.message}"
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-purple-200" />
                        <span className="text-purple-200 text-sm">{reviews[reviewIndex]?.name}</span>
                      </div>
                      <div className="flex gap-1">
                        {reviews.map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i === reviewIndex ? 'bg-white' : 'bg-white/40'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-purple-100 text-sm">Nenhum comentário aprovado ainda.</p>
                )}

                <form onSubmit={sendReview} className="mt-4 space-y-2">
                  <p className="text-white font-semibold">Deixe seu comentário</p>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-white/80 text-sm">Sua nota</label>
                    <select
                      value={reviewForm.stars}
                      onChange={(e) => setReviewForm({ ...reviewForm, stars: Number(e.target.value) })}
                      className="px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white"
                    >
                      <option value={5}>5</option>
                      <option value={4}>4</option>
                      <option value={3}>3</option>
                      <option value={2}>2</option>
                      <option value={1}>1</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/60"
                    placeholder="Seu nome"
                    maxLength={60}
                  />
                  <textarea
                    value={reviewForm.message}
                    onChange={(e) => setReviewForm({ ...reviewForm, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/60"
                    placeholder="Escreva seu comentário"
                    rows={3}
                    maxLength={400}
                  />
                  <button
                    type="submit"
                    disabled={reviewSending || !String(reviewForm.name || '').trim() || !String(reviewForm.message || '').trim()}
                    className="w-full bg-white text-purple-800 font-semibold py-2 px-3 rounded-lg hover:bg-purple-50 disabled:opacity-50"
                  >
                    {reviewSending ? 'Enviando...' : 'Enviar para aprovação'}
                  </button>
                </form>
              </div>
            </div>

            {/* Registration Form */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <CreditCard className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Comece Agora</h2>
                <p className="text-gray-600">Crie sua conta e assine em menos de 2 minutos</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-purple-800 font-semibold">Plano Mensal</p>
                    <p className="text-purple-600 text-sm">Acesso completo a todos os conteúdos</p>
                  </div>
                  <div className="text-right">
                    {priceDisplay.isPromo ? (
                      <div>
                        <p className="text-sm text-purple-600 line-through">R$ {formatBRL(priceDisplay.original)}</p>
                        <p className="text-2xl font-bold text-purple-800">R$ {formatBRL(priceDisplay.current)}</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-purple-800">R$ {formatBRL(priceDisplay.current)}</p>
                    )}
                    <p className="text-purple-600 text-sm">/mês</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-800 font-semibold">Teste 7 Dias</p>
                    <p className="text-green-600 text-sm">Apenas R$ 1,00 para validar cartão</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-800">R$ 1,00</p>
                    <p className="text-green-600 text-sm">/7 dias</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                  Cadastro realizado! Redirecionando para o pagamento...
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="João Silva"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="joao@exemplo.com"
                  />
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="(11) 98765-4321"
                  />
                </div>

                <div>
                  <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    id="senha"
                    name="senha"
                    value={formData.senha}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label htmlFor="confirmacaoSenha" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmação de Senha
                  </label>
                  <input
                    type="password"
                    id="confirmacaoSenha"
                    name="confirmacaoSenha"
                    value={formData.confirmacaoSenha}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="Repita sua senha"
                  />
                </div>

                <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'trial')}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Teste 7 Dias - R$ 1,00</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, 'full')}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Assinar - R$ 29,90</span>
                    </>
                  )}
                </button>
              </div>
              </form>

              <div className="mt-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-800 mb-2">Pagar com GiftCard</p>
                  <input
                    type="text"
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                    placeholder="Código do GiftCard"
                  />
                  <button
                    type="button"
                    onClick={handleGiftRedeem}
                    disabled={giftLoading || !giftCode || !formData.email || !formData.senha || !formData.nome || !formData.telefone || !formData.confirmacaoSenha}
                    className="mt-3 w-full bg-white border border-purple-300 text-purple-700 font-semibold py-3 px-6 rounded-lg hover:bg-purple-50 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {giftLoading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Processando...</span>
                      </>
                    ) : (
                      <span>Ativar com GiftCard</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-900 mb-2">Renovar Assinatura com GiftCard</p>
                  <p className="text-xs text-green-700 mb-3">Adicione +1 mês à sua assinatura atual.</p>
                  <div className="space-y-3">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      placeholder="Seu e-mail (usuário)"
                    />
                    <input
                      type="text"
                      value={giftCode}
                      onChange={(e) => setGiftCode(e.target.value)}
                      className="w-full px-4 py-3 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      placeholder="Código do GiftCard"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.email || !giftCode) return;
                        setGiftLoading(true);
                        setError('');
                        setSuccess(false);
                        try {
                          await axios.post('/api/renovar/giftcard', { email: formData.email, giftcard_code: giftCode });
                          setSuccess(true);
                          setGiftCode('');
                        } catch (err) {
                          setError(err.response?.data?.detail || 'Erro ao renovar com GiftCard');
                        } finally {
                          setGiftLoading(false);
                        }
                      }}
                      disabled={giftLoading || !formData.email || !giftCode}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {giftLoading ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin inline mr-2" />
                          Processando...
                        </>
                      ) : (
                        'Renovar Assinatura (+1 mês)'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-purple-900 mb-2">Comprar GiftCard para Revenda</p>
                  <p className="text-xs text-purple-700 mb-3">Metade do valor do produto. Quantidade mínima 5.</p>

                  <div className="space-y-3">
                    <input
                      type="email"
                      value={giftBuyEmail}
                      onChange={(e) => setGiftBuyEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      placeholder="Seu e-mail (comprador)"
                    />

                    <input
                      type="number"
                      min={5}
                      value={giftQuantity}
                      onChange={(e) => setGiftQuantity(e.target.value)}
                      className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      placeholder="Quantidade (mín. 5)"
                    />

                    <button
                      type="button"
                      onClick={handleGiftBuy}
                      disabled={giftLoading || !giftBuyEmail || Number(giftQuantity) < 5}
                      className="w-full bg-gradient-to-r from-purple-700 to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-800 hover:to-indigo-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {giftLoading ? 'Processando...' : 'Comprar GiftCards (Checkout)'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Pagamento processado por{' '}
                  <span className="font-semibold">Mercado Pago</span>
                </p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-gray-500">Pagamento 100% seguro</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Ao assinar, você concorda com nossos{' '}
                  <a href="#" className="text-purple-600 hover:underline">Termos de Serviço</a>{' '}
                  e{' '}
                  <a href="#" className="text-purple-600 hover:underline">Política de Privacidade</a>.
                  <br />
                  Cancelamento a qualquer momento. Sem taxas ocultas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black bg-opacity-20 backdrop-blur-md border-t border-white border-opacity-10 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">
            <p className="text-sm">© 2024 Jellyfin Premium. Todos os direitos reservados.</p>
            <div className="flex items-center justify-center space-x-4 mt-4">
              <a href="#" className="text-purple-200 hover:text-white transition-colors text-sm">
                Suporte
              </a>
              <span className="text-purple-300">•</span>
              <a href="#" className="text-purple-200 hover:text-white transition-colors text-sm">
                Termos
              </a>
              <span className="text-purple-300">•</span>
              <a href="#" className="text-purple-200 hover:text-white transition-colors text-sm">
                Privacidade
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen ? (
          <div className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 flex flex-col" style={{ height: '460px' }}>
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-semibold text-sm">Suporte ao Cliente</span>
                </div>
                <div className="flex items-center space-x-1">
                  {chatStarted && chatClientePodeLigar && (
                    <button onClick={() => alert('Ligação solicitada. Aguarde o atendente conectar.')} className="hover:bg-white/20 rounded-full p-1 transition-colors" title="Ligar para suporte">
                      <Phone className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setChatOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {chatStarted && chatProtocolo && (
                <p className="text-purple-200 text-[11px] mt-1 font-mono">Protocolo: {chatProtocolo}</p>
              )}
            </div>

            {!chatStarted ? (
              /* Chat Login Form */
              <div className="flex-1 flex flex-col justify-center p-6 space-y-4">
                <p className="text-gray-700 text-sm text-center">Inicie uma conversa com nosso suporte.</p>
                <input
                  type="text"
                  value={chatNome}
                  onChange={(e) => setChatNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Seu nome"
                />
                <input
                  type="email"
                  value={chatEmail}
                  onChange={(e) => setChatEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Seu e-mail"
                />
                <button
                  onClick={handleChatStart}
                  disabled={!chatEmail.trim()}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Iniciar Chat
                </button>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chatMsgs.length === 0 && (
                    <p className="text-gray-400 text-xs text-center mt-8">Envie uma mensagem para iniciar a conversa.</p>
                  )}
                  {chatMsgs.map((msg) => {
                    const isCliente = msg.remetente === 'cliente';
                    const isSistema = msg.remetente === 'sistema' || msg.tipo === 'system';
                    if (isSistema) {
                      return (
                        <div key={msg.id} className="flex justify-center my-1">
                          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1 rounded-full text-[11px]">{msg.mensagem}</div>
                        </div>
                      );
                    }
                    return (
                      <div key={msg.id} className={`flex ${isCliente ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${isCliente ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                          {!isCliente && <p className="text-xs font-semibold mb-0.5 text-purple-600">{msg.remetente_nome || 'Atendente'}{msg.remetente_cargo ? ` (${msg.remetente_cargo})` : ''}</p>}
                          {msg.tipo === 'audio' && msg.file_url ? (
                            <div className="flex items-center space-x-2">
                              <button onClick={() => chatToggleAudio(msg.id, msg.file_url)} className={`p-1 rounded-full ${isCliente ? 'hover:bg-purple-500' : 'hover:bg-gray-200'}`}>
                                {chatPlayingId === msg.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </button>
                              <div className="flex-1"><div className={`h-1 rounded-full ${isCliente ? 'bg-purple-400' : 'bg-gray-300'}`}><div className={`h-1 rounded-full w-1/2 ${isCliente ? 'bg-white' : 'bg-purple-500'}`} /></div></div>
                              <span className={`text-[10px] ${isCliente ? 'text-purple-200' : 'text-gray-500'}`}>Áudio</span>
                            </div>
                          ) : msg.tipo === 'image' && msg.file_url ? (
                            <img src={msg.file_url} alt={msg.file_name || 'Imagem'} className="max-w-full rounded max-h-32 object-cover cursor-pointer" onClick={() => window.open(msg.file_url, '_blank')} />
                          ) : msg.tipo === 'file' && msg.file_url ? (
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className={`flex items-center space-x-1 ${isCliente ? 'text-white underline' : 'text-purple-600 underline'}`}>
                              <FileText className="h-3 w-3" /><span>{msg.file_name || 'Arquivo'}</span>
                            </a>
                          ) : (
                            <p>{msg.mensagem}</p>
                          )}
                          <p className={`text-[10px] mt-1 ${isCliente ? 'text-purple-200' : 'text-gray-400'}`}>
                            {new Date(msg.data_criacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <input type="file" ref={chatFileRef} onChange={handleChatFileUpload} className="hidden" accept="image/*,audio/*,.pdf,.doc,.docx,.txt" />
                <div className="p-3 border-t border-gray-200">
                  {chatGravando ? (
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-700 font-medium text-xs">Gravando... {chatFormatTime(chatGravTempo)}</span>
                      </div>
                      <button onClick={chatPararGravacao} className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors">
                        <MicOff className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleChatSend} className="flex space-x-1">
                      <button type="button" onClick={() => chatFileRef.current?.click()} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Anexar arquivo">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={chatIniciarGravacao} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Gravar áudio">
                        <Mic className="w-4 h-4" />
                      </button>
                      <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Digite sua mensagem..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" disabled={chatSending} />
                      <button type="submit" disabled={chatSending || !chatInput.trim()} className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50">
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setChatOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            title="Chat de Suporte"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
    )
  );
}

export default App;
