import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import RelatorioController from '../controller/relatorio.js';

const router = express.Router();

//Relatorios operacionais e financeiros (requer "relatorios:ler")
router.get('/relatorios/resumo', authenticate, authorizePermission('relatorios:ler'), RelatorioController.resumo);
router.get('/relatorios/caixa', authenticate, authorizePermission('relatorios:ler'), RelatorioController.caixa);
router.get('/relatorios/servicos', authenticate, authorizePermission('relatorios:ler'), RelatorioController.servicos);
router.get('/relatorios/funcionarios', authenticate, authorizePermission('relatorios:ler'), RelatorioController.funcionarios);
router.get('/relatorios/assiduidade', authenticate, authorizePermission('relatorios:ler'), RelatorioController.assiduidade);
router.get('/relatorios/clientes', authenticate, authorizePermission('relatorios:ler'), RelatorioController.clientes);
router.get('/relatorios/fidelizacao', authenticate, authorizePermission('relatorios:ler'), RelatorioController.fidelizacao);
router.get('/relatorios/anulacoes', authenticate, authorizePermission('relatorios:ler'), RelatorioController.anulacoes);
router.get('/relatorios/movimentos', authenticate, authorizePermission('relatorios:ler'), RelatorioController.movimentos);

export default router;
