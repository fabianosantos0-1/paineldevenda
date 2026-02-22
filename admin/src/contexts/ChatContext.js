import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [mensagens, setMensagens] = useState({});
  const [sessoesAtivas, setSessoesAtivas] = useState([]);
  const [sessaoAtual, setSessaoAtual] = useState(null);
  const pollingRef = useRef(null);

  const carregarSessoes = useCallback(async () => {
    try {
      const response = await axios.get('/api/admin/chat/sessoes');
      setSessoesAtivas(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      // silently fail - user might not be authenticated yet
    }
  }, []);

  const carregarMensagens = useCallback(async (sessaoId) => {
    try {
      const response = await axios.get(`/api/chat/sessao/${sessaoId}/mensagens`);
      setMensagens(prev => ({
        ...prev,
        [sessaoId]: Array.isArray(response.data) ? response.data : []
      }));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  }, []);

  // Poll for new sessions and messages every 5 seconds
  useEffect(() => {
    carregarSessoes();
    pollingRef.current = setInterval(() => {
      carregarSessoes();
      if (sessaoAtual) {
        carregarMensagens(sessaoAtual);
      }
    }, 5000);
    return () => clearInterval(pollingRef.current);
  }, [carregarSessoes, carregarMensagens, sessaoAtual]);

  const iniciarSessao = async (email, nome) => {
    try {
      const response = await axios.post('/api/chat/iniciar', { email, nome });
      const { sessao_id, cliente } = response.data;
      setSessaoAtual(sessao_id);
      carregarMensagens(sessao_id);
      return { success: true, sessao_id, cliente };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erro ao iniciar sessão'
      };
    }
  };

  const enviarMensagem = async (sessaoId, mensagem, remetente = 'atendente') => {
    try {
      if (remetente === 'atendente') {
        await axios.post('/api/admin/chat/enviar', { sessao_id: sessaoId, mensagem });
      } else {
        await axios.post('/api/chat/mensagem', { sessao_id: sessaoId, mensagem, remetente });
      }
      await carregarMensagens(sessaoId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erro ao enviar mensagem'
      };
    }
  };

  const atenderSessao = async (sessaoId) => {
    try {
      await axios.post(`/api/chat/atender/${sessaoId}`);
      setSessaoAtual(sessaoId);
      await carregarMensagens(sessaoId);
      await carregarSessoes();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erro ao atender sessão'
      };
    }
  };

  const encerrarSessao = async (sessaoId) => {
    try {
      await axios.post(`/api/admin/chat/encerrar/${sessaoId}`);
      setSessaoAtual(null);
      await carregarSessoes();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erro ao encerrar sessão'
      };
    }
  };

  const value = {
    mensagens,
    sessoesAtivas,
    sessaoAtual,
    setSessaoAtual,
    iniciarSessao,
    enviarMensagem,
    atenderSessao,
    encerrarSessao,
    carregarMensagens,
    carregarSessoes
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
