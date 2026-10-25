import express from 'express';
import { authenticate, authorizePermission } from '../middlewares/auth.js';
import HorarioController from '../controller/horario.js';

const router = express.Router();

//Programacao do funcionario: leitura autenticada; escrita requer "horarios:gerir"
router.get('/funcionarios/:id/horarios', authenticate, HorarioController.getHorarios);
router.post('/funcionarios/:id/horarios', authenticate, authorizePermission('horarios:gerir'), HorarioController.createHorario);
router.put('/funcionarios/:id/horarios', authenticate, authorizePermission('horarios:gerir'), HorarioController.substituirHorarios);
router.put('/horarios/:id', authenticate, authorizePermission('horarios:gerir'), HorarioController.atualizarHorario);
router.delete('/horarios/:id', authenticate, authorizePermission('horarios:gerir'), HorarioController.deletarHorarioPorId);
//compatibilidade: apaga todos os turnos de um dia
router.delete('/funcionarios/:id/horarios/:dia_semana', authenticate, authorizePermission('horarios:gerir'), HorarioController.deletarHorario);

export default router;
