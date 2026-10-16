import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import ServicoController from '../controller/servico.js';



const router = express.Router();


//Rotas dos servicos (leitura para todos autenticados, escrita so Administrador)
router.get('/servicos', authenticate, ServicoController.getServicos);
router.get('/servicos/:id', authenticate, ServicoController.getServicoById);
router.post('/servicos', authenticate, authorize('Administrador'), ServicoController.createServico);
router.put('/servicos/:id', authenticate, authorize('Administrador'), ServicoController.updateServico);
router.delete('/servicos/:id', authenticate, authorize('Administrador'), ServicoController.deleteServico);

export default router;