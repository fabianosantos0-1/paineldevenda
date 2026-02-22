import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SuporteLayout from '../layouts/SuporteLayout';
import ChatSuporte from '../components/Suporte/ChatSuporte';
import DashboardSuporte from '../components/Suporte/DashboardSuporte';

const Suporte = () => {
  return (
    <SuporteLayout>
      <Routes>
        <Route path="/" element={<DashboardSuporte />} />
        <Route path="/chat" element={<ChatSuporte />} />
      </Routes>
    </SuporteLayout>
  );
};

export default Suporte;
