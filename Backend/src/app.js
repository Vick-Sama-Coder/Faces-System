import express from 'express';
import cors from 'cors';
import dotnev from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js'
import funcionarioRoutes from './routes/funcionario.js'
import servicoRoutes from './routes/servico.js'
import categoriaRoutes from './routes/categoria.js'
import usuarioRoutes from './routes/usuario.js'
import perfilRoutes from './routes/perfil.js'
import clienteRoutes from './routes/cliente.js'
import atendimentoRoutes from './routes/atendimento.js'
import pagamentoRoutes from './routes/pagamento.js'
import comissaoRoutes from './routes/comissao.js'
import caixaRoutes from './routes/caixa.js'
import despesaRoutes from './routes/despesa.js'
import fidelizacaoRoutes from './routes/fidelizacao.js'
import horarioRoutes from './routes/horario.js'
import assiduidadeRoutes from './routes/assiduidade.js'
import salarioRoutes from './routes/salario.js'
import relatorioRoutes from './routes/relatorio.js'
import publicoRoutes from './routes/publico.js'
import auditoriaRoutes from './routes/auditoria.js'
import dashboardRoutes from './routes/dashboard.js'



//Carregando as variaveis de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)
dotnev.config({
  path: path.join(__dirname, '../.env')
});

const app = express();
//Normaliza a origem (o .env pode ter "/" final, senao o browser bloqueia o CORS)
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({
  origin: new URL(CLIENT_URL).origin,
  credentials: true,
}));

//adicionando middlewares globais
app.use(express.json()); //para ler json
app.use(cookieParser()); //transformar string cookies em objetos

app.use("/api/auth",authRoutes);
app.use("/api", funcionarioRoutes);
app.use("/api", servicoRoutes);
app.use("/api", categoriaRoutes);
app.use("/api", usuarioRoutes);
app.use("/api", perfilRoutes);
app.use("/api", clienteRoutes);
app.use("/api", atendimentoRoutes);
app.use("/api", pagamentoRoutes);
app.use("/api", comissaoRoutes);
app.use("/api", caixaRoutes);
app.use("/api", despesaRoutes);
app.use("/api", fidelizacaoRoutes);
app.use("/api", horarioRoutes);
app.use("/api", assiduidadeRoutes);
app.use("/api", salarioRoutes);
app.use("/api", relatorioRoutes);
app.use("/api", publicoRoutes);
app.use("/api", auditoriaRoutes);
app.use("/api", dashboardRoutes);

//404 em JSON (rotas de API inexistentes)
app.use((req, res) => {
  res.status(404).json({ message: "Rota nao encontrada" });
});

//traduz erros conhecidos do PostgreSQL para o status correto
const ERROS_CONHECIDOS = {
  "22P02": [400, "Valor ou identificador invalido"], // sintaxe invalida (ex.: id nao numerico)
  "23502": [400, "Campo obrigatorio em falta"],       // not null violado
  "23503": [409, "Operacao bloqueada: existem registos associados"], // foreign key
  "23505": [409, "Registo duplicado"],                // unique violado
  "23514": [400, "Valor fora do intervalo permitido"], // check violado
};

//handler de erros em JSON (sem stack em producao)
app.use((err, req, res, next) => {
  const conhecido = ERROS_CONHECIDOS[err.code];
  const status = err.status || (conhecido ? conhecido[0] : 500);
  const message = err.status ? err.message : (conhecido ? conhecido[1] : "Erro interno do servidor");

  if (status === 500) {
    console.error("Erro no servidor:", err.message);
  }

  res.status(status).json({ message });
});

export default app;
