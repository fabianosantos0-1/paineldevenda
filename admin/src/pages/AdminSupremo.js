import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../components/AdminSupremo/Dashboard';
import Clientes from '../components/AdminSupremo/Clientes';
import Configuracoes from '../components/AdminSupremo/Configuracoes';
import ConfiguracoesSistema from '../components/AdminSupremo/ConfiguracoesSistema';
import EmailEditor from '../components/AdminSupremo/EmailEditor';
import Logs from '../components/AdminSupremo/Logs';
import Financeiro from '../components/AdminSupremo/Financeiro';
import GiftCardsRevenda from '../components/AdminSupremo/GiftCardsRevenda';
import GerenciadorBots from '../components/AdminSupremo/GerenciadorBots';
import ApiDocs from '../components/AdminSupremo/ApiDocs';
import GeradorGiftCard from '../components/AdminSupremo/GeradorGiftCard';
import ControleVenda from '../components/AdminSupremo/ControleVenda';
import ChatInterno from '../components/AdminSupremo/ChatInterno';
import ControlePonto from '../components/AdminSupremo/ControlePonto';
import Funcionarios from '../components/AdminSupremo/Funcionarios';
import Aprovacoes from '../components/AdminSupremo/Aprovacoes';
import ChatSuporte from '../components/Suporte/ChatSuporte';

const DashboardOrRedirect = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/admin-supremo' || location.pathname === '/admin-supremo/') {
      if (!hasPermission('dashboard')) {
        const redirectMap = [
          { perm: 'chat_interno', path: '/admin-supremo/chat-interno' },
          { perm: 'chat', path: '/admin-supremo/chat' },
          { perm: 'clientes', path: '/admin-supremo/clientes' },
          { perm: 'giftcards', path: '/admin-supremo/giftcards-revenda' },
          { perm: 'financeiro', path: '/admin-supremo/financeiro' },
          { perm: 'logs', path: '/admin-supremo/logs' },
        ];
        for (const { perm, path } of redirectMap) {
          if (hasPermission(perm)) {
            navigate(path, { replace: true });
            return;
          }
        }
      }
    }
  }, [hasPermission, navigate, location]);

  return <Dashboard />;
};

const AdminSupremo = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<DashboardOrRedirect />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/configuracoes" element={<Navigate to="/admin-supremo/configuracoes-sistema" replace />} />
        <Route path="/configuracoes-sistema" element={<ConfiguracoesSistema />} />
        <Route path="/email-editor" element={<EmailEditor />} />
        <Route path="/logs" element={<Logs />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/giftcards-revenda" element={<GiftCardsRevenda />} />
        <Route path="/gerenciador-bots" element={<GerenciadorBots />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/gerador-giftcard" element={<GeradorGiftCard />} />
        <Route path="/controle-venda" element={<ControleVenda />} />
        <Route path="/chat-interno" element={<ChatInterno />} />
        <Route path="/controle-ponto" element={<ControlePonto />} />
        <Route path="/funcionarios" element={<Funcionarios />} />
        <Route path="/aprovacoes" element={<Aprovacoes />} />
        <Route path="/chat-atendimento" element={<ChatSuporte />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminSupremo;
