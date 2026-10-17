import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import PagamentoController from '../controller/pagamento.js';

const router = express.Router();

//Leitura para qualquer utilizador autenticado; registo/anulacao requerem permissao
router.get('/pagamentos', authenticate, PagamentoController.getPagamentos);
router.get('/pagamentos/:id', authenticate, PagamentoController.getPagamentoById);
router.post('/atendimentos/:id/pagamentos', authenticate, authorizePermission('pagamentos:registar'), PagamentoController.registrarPagamento);
router.get('/atendimentos/:id/pagamento', authenticate, PagamentoController.getPagamentoDoAtendimento);
router.post('/pagamentos/:id/anular', authenticate, authorizePermission('pagamentos:anular'), PagamentoController.anularPagamento);

export default router;
