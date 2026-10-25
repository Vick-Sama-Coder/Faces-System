import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import AssiduidadeController from '../controller/assiduidade.js';

const router = express.Router();

//Registo e correcao de assiduidade requerem "assiduidade:gerir"
router.get('/assiduidade', authenticate, authorizePermission('assiduidade:gerir'), AssiduidadeController.getAssiduidade);
router.post('/assiduidade', authenticate, authorizePermission('assiduidade:gerir'), AssiduidadeController.createAssiduidade);
router.put('/assiduidade/dia', authenticate, authorizePermission('assiduidade:gerir'), AssiduidadeController.registarDia);
router.put('/assiduidade/:id', authenticate, authorizePermission('assiduidade:gerir'), AssiduidadeController.updateAssiduidade);

export default router;
