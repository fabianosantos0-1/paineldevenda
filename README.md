# Jellyfin Venda System v2.0

Sistema de vendas e gerenciamento para Jellyfin.

## Deploy

`ash
docker-compose up -d --build
`

## Configuração

Acesse o painel admin em /api/admin/login

## Endpoints

- POST /api/registro - Registrar novo cliente
- POST /api/registro/giftcard - Resgatar gift card
- POST /api/mp/webhook - Webhook Mercado Pago
- GET /api/admin/* - Endpoints administrativos
