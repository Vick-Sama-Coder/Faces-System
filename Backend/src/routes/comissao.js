import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import ComissaoController from '../controller/comissao.js';

const router = express.Router();

//Lista geral de comissoes (relatorios) e comissoes por funcionario (proprio ou relatorios)
router.get('/comissoes', authenticate, authorizePermission('relatorios:ler'), ComissaoController.getComissoes);
router.get('/funcionarios/:id/comissoes', authenticate, ComissaoController.getComissoesFuncionario);

export default router;
