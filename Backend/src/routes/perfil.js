import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import PerfilController from '../controller/perfil.js';

const router = express.Router();

//Perfis e permissoes: requer "contas:gerir"
router.get('/perfis', authenticate, authorizePermission('contas:gerir'), PerfilController.getPerfis);
router.get('/perfis/:id', authenticate, authorizePermission('contas:gerir'), PerfilController.getPerfilById);
router.post('/perfis', authenticate, authorizePermission('contas:gerir'), PerfilController.createPerfil);
router.put('/perfis/:id', authenticate, authorizePermission('contas:gerir'), PerfilController.updatePerfil);
router.put('/perfis/:id/permissoes', authenticate, authorizePermission('contas:gerir'), PerfilController.updatePermissoesPerfil);

//catalogo de permissoes existentes
router.get('/permissoes', authenticate, authorizePermission('contas:gerir'), PerfilController.getPermissoesCatalogo);

export default router;
