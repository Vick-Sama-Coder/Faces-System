import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import CaixaController from '../controller/caixa.js';

const router = express.Router();

//Operacao do caixa requer as permissoes respetivas
router.post('/caixa/abrir', authenticate, authorizePermission('caixa:operar'), CaixaController.abrirCaixa);
router.get('/caixa/atual', authenticate, authorizePermission('caixa:operar'), CaixaController.getCaixaAtual);
router.post('/caixa/levantamento', authenticate, authorizePermission('caixa:levantar'), CaixaController.registarLevantamento);
router.get('/caixa/movimentos', authenticate, authorizePermission('caixa:operar'), CaixaController.getMovimentos);
router.post('/caixa/fechar', authenticate, authorizePermission('caixa:fechar'), CaixaController.fecharCaixa);
router.get('/caixa/fechos', authenticate, authorizePermission('relatorios:ler'), CaixaController.getFechos);

export default router;
