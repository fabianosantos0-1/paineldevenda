import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Mail, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  MessageSquare,
  CreditCard,
  Gift,
  ClipboardCheck,
  UserCog,
  Clock
} from 'lucide-react';

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (admin?.tipo === 'admin') {
      axios.get('/api/admin/aprovacoes').then(res => {
        const pending = (res.data || []).filter(a => a.status === 'pendente');
        setPendingCount(pending.length);
      }).catch(() => {});
    }
  }, [admin]);

  const allNavigation = [
    { name: 'Dashboard', href: '/admin-supremo', icon: LayoutDashboard, perm: 'dashboard' },
    { name: 'Chat Atendimento', href: '/admin-supremo/chat-atendimento', icon: MessageSquare, perm: 'chat' },
    { name: 'Clientes', href: '/admin-supremo/clientes', icon: Users, perm: 'clientes' },
    { name: 'Financeiro', href: '/admin-supremo/financeiro', icon: CreditCard, perm: 'financeiro' },
    { name: 'Gift Cards', href: '/admin-supremo/giftcards-revenda', icon: Gift, perm: 'giftcards' },
    { name: 'Gerador Gift Cards', href: '/admin-supremo/gerador-giftcard', icon: Gift, perm: 'giftcards' },
    { name: 'Controle da Venda', href: '/admin-supremo/controle-venda', icon: CreditCard, perm: 'controle_venda' },
    { name: 'Sistema', href: '/admin-supremo/configuracoes-sistema', icon: Settings, perm: 'configuracoes' },
    { name: 'E-mail', href: '/admin-supremo/email-editor', icon: Mail, perm: 'email' },
    { name: 'Logs', href: '/admin-supremo/logs', icon: FileText, perm: 'logs' },
    { name: 'Chat Interno', href: '/admin-supremo/chat-interno', icon: MessageSquare, perm: 'chat_interno' },
    { name: 'Bots', href: '/admin-supremo/gerenciador-bots', icon: MessageSquare, perm: 'bots' },
    { name: 'Aprovações', href: '/admin-supremo/aprovacoes', icon: ClipboardCheck, perm: 'aprovacoes', badge: pendingCount },
    { name: 'Funcionários', href: '/admin-supremo/funcionarios', icon: UserCog, perm: 'funcionarios' },
    { name: 'Controle de Ponto', href: '/admin-supremo/controle-ponto', icon: Clock, perm: 'funcionarios' },
    { name: 'API Docs', href: '/admin-supremo/api-docs', icon: FileText, perm: 'dashboard' },
  ];

  const navigation = allNavigation.filter(item => hasPermission(item.perm));

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const userLabel = admin?.tipo === 'admin' ? 'Admin Supremo' : (admin?.cargo === 'gerente' ? 'Gerente' : 'Funcionário');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <h1 className="text-xl font-semibold text-gray-900">Painel Admin</h1>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                  {item.badge > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={logout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-semibold text-gray-900">Painel Admin</h1>
          </div>
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                  {item.badge > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{admin?.nome || admin?.usuario}</p>
                  <p className="text-xs font-medium text-gray-500">{userLabel}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="mt-3 flex items-center w-full px-2 py-1 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="lg:hidden">
          <div className="flex items-center justify-between h-16 px-4 bg-white border-b">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-gray-500" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Painel Admin</h1>
            <div className="w-6" />
          </div>
        </div>
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
