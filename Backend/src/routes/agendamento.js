import express from 'express';
import { authenticate, authorize, authorizePermission } from '../middlewares/auth.js';
import AgendamentoController from '../controller/agendamento.js';

const router = express.Router();

// Leitura para qualquer utilizador autenticado. A criacao e exclusiva do
// Administrador; o consumo segue as permissoes normais de atendimento.
router.get('/agendamentos', authenticate, AgendamentoController.getAgendamentos);
router.get('/agendamentos/:id', authenticate, AgendamentoController.getAgendamentoById);
router.post('/agendamentos', authenticate, authorize('Administrador'), AgendamentoController.createAgendamento);

// Pagamentos do agendamento (receita reconhecida no momento do pagamento).
router.post('/agendamentos/:id/pagamentos', authenticate, authorizePermission('pagamentos:registar'), AgendamentoController.registrarPagamento);
router.get('/agendamentos/:id/pagamento', authenticate, AgendamentoController.getPagamentoDoAgendamento);

// Execucao do saldo: qualquer utilizador que possa registar atendimentos.
router.post('/agendamentos/:id/consumir', authenticate, authorizePermission('atendimentos:escrever'), AgendamentoController.consumir);

// Cancelamento com reembolso: exige permissao financeira ou de anulacao.
router.post(
    '/agendamentos/:id/cancelar',
    authenticate,
    authorizePermission('atendimentos:anular', 'pagamentos:anular'),
    AgendamentoController.cancelar
);

export default router;
