import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import { Save, Eye, Upload, X, FileText, Image, Video, Music, File } from 'lucide-react';

const getAttachmentIcon = (type) => {
  if (!type) return File;
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Video;
  if (type.startsWith('audio/')) return Music;
  if (type === 'application/pdf') return FileText;
  return File;
};

const EmailEditor = () => {
  const [activeTab, setActiveTab] = useState('welcome');
  const [emailContent, setEmailContent] = useState('');
  const [subject, setSubject] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignContent, setCampaignContent] = useState('');
  const [waWelcomeMessage, setWaWelcomeMessage] = useState('');
  const [waCampaignMessage, setWaCampaignMessage] = useState('');
  const [waConfig, setWaConfig] = useState({ enabled: false, base_url: '', api_key: '', instance: '' });
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientTags, setClientTags] = useState([]);
  const [sendMode, setSendMode] = useState('all');
  const [selectedEmails, setSelectedEmails] = useState({});
  const [selectedTag, setSelectedTag] = useState('atraso');
  const [sending, setSending] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [tagEdit, setTagEdit] = useState({});
  const [config, setConfig] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: ''
  });

  // Funções auxiliares para anexos (placeholder)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (type.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    if (type.startsWith('audio/')) return <Music className="h-5 w-5 text-green-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  useEffect(() => {
    loadEmailConfig();
    loadEmailTemplate();
    loadEmailCampaignTemplate();
    loadWaConfig();
    loadWaTemplates();
    loadClients();
    loadTags();
  }, []);

  const loadEmailCampaignTemplate = async () => {
    try {
      const response = await axios.get('/api/admin/email-campaign-template');
      setCampaignSubject(response.data.subject || '');
      setCampaignContent(response.data.content || '');
    } catch (error) {
      setCampaignSubject('');
      setCampaignContent('');
    }
  };

  const saveEmailCampaignTemplate = async () => {
    setLoading(true);
    try {
      await axios.post('/api/admin/email-campaign-template', {
        subject: campaignSubject,
        content: campaignContent
      });
      alert('Template de campanha salvo com sucesso!');
    } catch (error) {
      alert('Erro ao salvar template de campanha: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const loadWaConfig = async () => {
    try {
      const res = await axios.get('/api/admin/config/whatsapp');
      setWaConfig({
        enabled: !!res.data?.enabled,
        base_url: res.data?.base_url || '',
        api_key: '',
        instance: res.data?.instance || ''
      });
    } catch {
      setWaConfig({ enabled: false, base_url: '', api_key: '', instance: '' });
    }
  };

  const saveWaConfig = async () => {
    setLoading(true);
    try {
      await axios.post('/api/admin/config/whatsapp', waConfig);
      alert('Configuração do WhatsApp salva!');
      await loadWaConfig();
    } catch (error) {
      alert('Erro ao salvar WhatsApp: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const loadWaTemplates = async () => {
    try {
      const w = await axios.get('/api/admin/whatsapp-welcome-template');
      setWaWelcomeMessage(w.data?.message || '');
    } catch {
      setWaWelcomeMessage('');
    }
    try {
      const c = await axios.get('/api/admin/whatsapp-campaign-template');
      setWaCampaignMessage(c.data?.message || '');
    } catch {
      setWaCampaignMessage('');
    }
  };

  const saveWaWelcomeTemplate = async () => {
    setLoading(true);
    try {
      await axios.post('/api/admin/whatsapp-welcome-template', { message: waWelcomeMessage });
      alert('Mensagem de boas-vindas do WhatsApp salva!');
    } catch (error) {
      alert('Erro ao salvar: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const saveWaCampaignTemplate = async () => {
    setLoading(true);
    try {
      await axios.post('/api/admin/whatsapp-campaign-template', { message: waCampaignMessage });
      alert('Mensagem de campanha do WhatsApp salva!');
    } catch (error) {
      alert('Erro ao salvar: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const res = await axios.get('/api/admin/clients');
      setClients(Array.isArray(res.data?.clients) ? res.data.clients : []);
    } catch (e) {
      setClients([]);
    }
  };

  const sendWaBlast = async () => {
    setSending(true);
    try {
      const payload = {
        mode: sendMode,
        tag: sendMode === 'tag' ? selectedTag : null,
        selected_emails: sendMode === 'selected' ? Object.keys(selectedEmails).filter((e) => selectedEmails[e]) : null,
        message: waCampaignMessage
      };
      const res = await axios.post('/api/admin/whatsapp/blast', payload);
      alert(`WhatsApp concluído. Enviados: ${res.data?.sent ?? 0} | Falhas: ${res.data?.failed ?? 0}`);
    } catch (error) {
      alert('Erro WhatsApp: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setSending(false);
    }
  };

  const loadTags = async () => {
    try {
      const res = await axios.get('/api/admin/client-tags');
      setClientTags(Array.isArray(res.data?.tags) ? res.data.tags : ['atraso']);
    } catch (e) {
      setClientTags(['atraso']);
    }
  };

  const toggleSelected = (email) => {
    setSelectedEmails((prev) => ({ ...prev, [email]: !prev[email] }));
  };

  const sendBlast = async () => {
    setSending(true);
    try {
      const payload = {
        mode: sendMode,
        tag: sendMode === 'tag' ? selectedTag : null,
        selected_emails: sendMode === 'selected' ? Object.keys(selectedEmails).filter((e) => selectedEmails[e]) : null,
        subject: campaignSubject,
        content: campaignContent
      };
      const res = await axios.post('/api/admin/email/blast', payload);
      alert(`Disparo concluído. Enviados: ${res.data?.sent ?? 0} | Falhas: ${res.data?.failed ?? 0}`);
    } catch (error) {
      alert('Erro ao disparar: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setSending(false);
    }
  };

  const saveClientTags = async (email) => {
    try {
      const tagsText = String(tagEdit[email] || '').trim();
      const tags = tagsText ? tagsText.split(',').map((t) => t.trim()).filter(Boolean) : [];
      await axios.post('/api/admin/client-tags', { email, tags });
      await loadClients();
      await loadTags();
      alert('Tags salvas!');
    } catch (error) {
      alert('Erro ao salvar tags: ' + (error.response?.data?.detail || 'Erro interno'));
    }
  };

  const filteredClients = clients.filter((c) => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return true;
    return String(c.nome || '').toLowerCase().includes(q) || String(c.email || '').toLowerCase().includes(q);
  });

  const loadEmailConfig = async () => {
    try {
      const response = await axios.get('/api/admin/config/email');
      setConfig(response.data);
    } catch (error) {
      console.error('Erro ao carregar configuração de e-mail:', error);
    }
  };

  const loadEmailTemplate = async () => {
    try {
      const response = await axios.get('/api/admin/email-template');
      setSubject(response.data.subject || '');
      setEmailContent(response.data.content || '');
    } catch (error) {
      console.error('Erro ao carregar template de e-mail:', error);
    }
  };

  const saveEmailConfig = async () => {
    setLoading(true);
    try {
      await axios.post('/api/admin/config/email', config);
      alert('Configuração de e-mail salva com sucesso!');
    } catch (error) {
      alert('Erro ao salvar configuração: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  const saveEmailTemplate = async () => {
    setLoading(true);
    try {
      await axios.post('/api/admin/email-template', {
        subject,
        content: emailContent
      });
      alert('Template de e-mail salvo com sucesso!');
    } catch (error) {
      alert('Erro ao salvar template: ' + (error.response?.data?.detail || 'Erro interno'));
    } finally {
      setLoading(false);
    }
  };

  
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Editor de E-mail Automático</h1>
        <p className="text-gray-600">Configure o e-mail enviado após a compra</p>
      </div>

      <div className="mb-6 flex gap-3">
        <button onClick={() => setActiveTab('welcome')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'welcome' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Boas-vindas</button>
        <button onClick={() => setActiveTab('campaign')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'campaign' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Campanhas</button>
        <button onClick={() => setActiveTab('whatsapp')} className={`px-4 py-2 rounded-lg font-medium ${activeTab === 'whatsapp' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}>WhatsApp</button>
      </div>

      {activeTab === 'welcome' ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuração SMTP */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuração SMTP</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Servidor SMTP</label>
                <input
                  type="text"
                  value={config.smtp_host}
                  onChange={(e) => setConfig({...config, smtp_host: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="smtp.gmail.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Porta</label>
                <input
                  type="number"
                  value={config.smtp_port}
                  onChange={(e) => setConfig({...config, smtp_port: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="587"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
                <input
                  type="email"
                  value={config.smtp_user}
                  onChange={(e) => setConfig({...config, smtp_user: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="seuemail@gmail.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha/App Password</label>
                <input
                  type="password"
                  value={config.smtp_password}
                  onChange={(e) => setConfig({...config, smtp_password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="senha_ou_app_password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail Remetente</label>
                <input
                  type="email"
                  value={config.from_email}
                  onChange={(e) => setConfig({...config, from_email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="noreply@seusite.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Remetente</label>
                <input
                  type="text"
                  value={config.from_name}
                  onChange={(e) => setConfig({...config, from_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Seu Nome"
                />
              </div>
              
              <button
                onClick={saveEmailConfig}
                disabled={loading}
                className="w-full bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>
          </div>
        </div>

        {/* Editor de E-mail (boas-vindas) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Template do E-mail</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    previewMode 
                      ? 'bg-gray-200 text-gray-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {previewMode ? 'Editar' : 'Visualizar'}
                </button>
                <button
                  onClick={saveEmailTemplate}
                  disabled={loading}
                  className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Salvar Template
                </button>
              </div>
            </div>

            {/* Assunto */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assunto do E-mail</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Bem-vindo ao Jellyfin Premium!"
              />
            </div>

            {/* Anexos */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Anexos</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Clique para anexar arquivos</span>
                  <span className="text-xs text-gray-500 mt-1">Imagens, vídeos, áudios, PDFs</span>
                </label>
              </div>
              
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((attachment) => {
                    const Icon = getAttachmentIcon(attachment.type);
                    return (
                      <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-sm text-gray-700">{attachment.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({(attachment.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Editor ou Preview */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {previewMode ? (
                <div className="p-4 bg-white">
                  <div className="border-b pb-2 mb-4">
                    <strong>Assunto:</strong> {subject}
                  </div>
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: emailContent }}
                  />
                </div>
              ) : (
                <ReactQuill
                  theme="snow"
                  value={emailContent}
                  onChange={setEmailContent}
                  modules={quillModules}
                  placeholder="Digite o conteúdo do e-mail aqui..."
                  style={{ minHeight: '300px' }}
                />
              )}
            </div>

            {/* Variáveis disponíveis */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Variáveis disponíveis:</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                <code>{`{{nome}}`}</code> - Nome do cliente
                <code>{`{{email}}`}</code> - E-mail do cliente
                <code>{`{{telefone}}`}</code> - Telefone do cliente
                <code>{`{{senha}}`}</code> - Senha do cliente
                <code>{`{{data_expiracao}}`}</code> - Data de expiração
                <code>{`{{plano}}`}</code> - Tipo do plano
                <code>{`{{valor}}`}</code> - Valor pago
              </div>
            </div>

            {/* Anexos */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Anexos</h3>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Arraste arquivos para cá ou clique para selecionar
                </p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 cursor-pointer"
                >
                  Selecionar Arquivos
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Arquivos anexados:</h4>
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      ) : null}

      {activeTab === 'campaign' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuração SMTP</h2>
              <p className="text-sm text-gray-600 mb-4">Usa a mesma configuração do e-mail de boas-vindas.</p>
              <button onClick={saveEmailConfig} disabled={loading} className="w-full bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar Configuração'}</button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Template da Campanha</h2>
                <button onClick={saveEmailCampaignTemplate} disabled={loading} className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
                  <Save className="h-4 w-4 mr-1" />
                  Salvar Campanha
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                <input value={campaignSubject} onChange={(e) => setCampaignSubject(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <ReactQuill theme="snow" value={campaignContent} onChange={setCampaignContent} modules={quillModules} style={{ minHeight: '260px' }} />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Disparar Campanha (E-mail)</h2>
              <p className="text-sm text-gray-600 mb-3">Selecione clientes 1 a 1, todos ou por tag (ex: atraso).</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modo de envio</label>
                  <select value={sendMode} onChange={(e) => setSendMode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="all">Todos (ativos)</option>
                    <option value="selected">Selecionar clientes</option>
                    <option value="tag">Por tag</option>
                  </select>
                </div>
                {sendMode === 'tag' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
                    <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      {clientTags.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  </div>
                ) : null}
                {sendMode === 'selected' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                    <input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="nome ou email" />
                  </div>
                ) : null}
              </div>

              {sendMode === 'selected' ? (
                <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                  <div className="p-3 border-b bg-gray-50 text-sm font-medium text-gray-700">Selecione os clientes</div>
                  {filteredClients.map((c) => (
                    <div key={c.email} className="p-3 border-b last:border-b-0">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={!!selectedEmails[c.email]} onChange={() => toggleSelected(c.email)} />
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{c.nome} <span className="font-normal text-gray-500">({c.email})</span></div>
                          <div className="text-xs text-gray-600">Tags: {(Array.isArray(c.tags) ? c.tags : []).join(', ') || '-'}</div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-4">
                <button onClick={sendBlast} disabled={sending} className="bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50">
                  {sending ? 'Enviando...' : 'Disparar E-mail'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'whatsapp' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuração Evolution API</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={waConfig.enabled} onChange={(e) => setWaConfig({ ...waConfig, enabled: e.target.checked })} />
                  Habilitar WhatsApp
                </label>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                  <input value={waConfig.base_url} onChange={(e) => setWaConfig({ ...waConfig, base_url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="https://SEU-EVOLUTION" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instance</label>
                  <input value={waConfig.instance} onChange={(e) => setWaConfig({ ...waConfig, instance: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="minha-instancia" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input value={waConfig.api_key} onChange={(e) => setWaConfig({ ...waConfig, api_key: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="apikey" />
                </div>
                <button onClick={saveWaConfig} disabled={loading} className="w-full bg-primary-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar WhatsApp'}</button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Mensagem de Boas-vindas (WhatsApp)</h2>
                <button onClick={saveWaWelcomeTemplate} disabled={loading} className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </button>
              </div>
              <textarea value={waWelcomeMessage} onChange={(e) => setWaWelcomeMessage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={5} />
              <p className="text-xs text-gray-500 mt-2">Variáveis: {`{{nome}}`}, {`{{email}}`}, {`{{telefone}}`}, {`{{senha}}`}, {`{{data_expiracao}}`}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Campanha (WhatsApp)</h2>
                <button onClick={saveWaCampaignTemplate} disabled={loading} className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </button>
              </div>
              <textarea value={waCampaignMessage} onChange={(e) => setWaCampaignMessage(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={6} />

              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modo de envio</label>
                    <select value={sendMode} onChange={(e) => setSendMode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="all">Todos (ativos)</option>
                      <option value="selected">Selecionar clientes</option>
                      <option value="tag">Por tag</option>
                    </select>
                  </div>

                  {sendMode === 'tag' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tag</label>
                      <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        {clientTags.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                    </div>
                  ) : null}

                  {sendMode === 'selected' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                      <input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="nome ou email" />
                    </div>
                  ) : null}
                </div>

                {sendMode === 'selected' ? (
                  <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto mb-4">
                    <div className="p-3 border-b bg-gray-50 text-sm font-medium text-gray-700">Selecione os clientes</div>
                    {filteredClients.map((c) => (
                      <div key={c.email} className="p-3 border-b last:border-b-0">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={!!selectedEmails[c.email]} onChange={() => toggleSelected(c.email)} />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{c.nome} <span className="font-normal text-gray-500">({c.email})</span></div>
                            <div className="text-xs text-gray-600">Telefone: {c.telefone || '-'}</div>
                            <div className="text-xs text-gray-600">Tags: {(Array.isArray(c.tags) ? c.tags : []).join(', ') || '-'}</div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <button onClick={sendWaBlast} disabled={sending} className="bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {sending ? 'Enviando...' : 'Disparar WhatsApp'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default EmailEditor;
