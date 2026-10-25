import express from 'express';
import { authenticate, authorize, authorizePermission } from '../middlewares/auth.js';
import FidelizacaoController from '../controller/fidelizacao.js';

const router = express.Router();

//Progresso do cartao (qualquer utilizador autenticado) e correcao autorizada
router.get('/clientes/:id/fidelizacao', authenticate, FidelizacaoController.getFidelizacao);
router.post('/clientes/:id/fidelizacao/correcao', authenticate, authorizePermission('fidelizacao:corrigir'), FidelizacaoController.corrigirFidelizacao);

//Preenchimento manual de cartoes fisicos: exclusivo do Administrador
router.post('/clientes/:id/fidelizacao/marcas', authenticate, authorize('Administrador'), FidelizacaoController.marcarFidelizacaoManual);
router.delete('/clientes/:id/fidelizacao/marcas/:movimentoId', authenticate, authorize('Administrador'), FidelizacaoController.removerMarcaFidelizacao);
router.post('/clientes/:id/fidelizacao/beneficios/utilizar', authenticate, authorize('Administrador'), FidelizacaoController.utilizarBeneficioFidelizacaoManual);

export default router;
