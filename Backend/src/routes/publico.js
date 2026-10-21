import express from 'express';
import PublicoController from '../controller/publico.js';

const router = express.Router();

//Catalogo publico (RF22/RN22/RNF11): sem autenticacao; so servicos ativos
router.get('/public/servicos', PublicoController.getServicosPublicos);
router.get('/public/servicos/:id', PublicoController.getServicoPublicoById);

export default router;
