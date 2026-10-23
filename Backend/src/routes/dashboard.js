import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import DashboardController from '../controller/dashboard.js';

const router = express.Router();

//O dashboard e a pagina inicial de qualquer utilizador autenticado.
router.get('/dashboard', authenticate, DashboardController.getDashboard);

export default router;
