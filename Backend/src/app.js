import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import { codigoPostgres } from './utils/erro.js';
import idempotencia from './middlewares/idempotencia.js';
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
import movimentoEstoqueRoutes from "./routes/movimento_estoque.js";
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
dotenv.config({
  path: path.join(__dirname, '../.env')
});

const app = express();
app.set('trust proxy', 1);

// CLIENT_URL aceita uma lista separada por virgulas. Isso permite manter o
// dominio de producao e, temporariamente, um URL de preview do Vercel.
function normalizarOrigens(valor) {
  return String(valor || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      try {
        return new URL(item).origin;
      } catch {
        console.warn('[cors] CLIENT_URL invalido, ignorado:', item);
        return null;
      }
    })
    .filter(Boolean);
}

const CLIENT_ORIGINS = normalizarOrigens(
  process.env.CLIENT_URL || 'https://faces-system.vercel.app/'
);
const ORIGENS_UNICAS = [...new Set(CLIENT_ORIGINS)];

app.use(cors({
  origin(origin, callback) {
    // Pedidos sem Origin (curl, health checks, same-origin) sao permitidos.
    if (!origin) return callback(null, true);
    if (ORIGENS_UNICAS.includes(origin)) return callback(null, true);

    // Nao lancar erro: apenas nao devolver cabecalhos CORS. O browser bloqueia
    // a leitura, mas o backend continua a responder normalmente.
    return callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400
}));
console.log('CLIENT_URL carregado:', ORIGENS_UNICAS.join(', ') || '(nenhum)');

//adicionando middlewares globais
app.use(express.json()); //para ler json
app.use(cookieParser()); //transformar string cookies em objetos

// Dados autenticados da API nunca devem ser guardados pelo browser, pelo CDN
// do Render ou por um proxy externo (ex.: rewrites do Vercel).
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(idempotencia); //respostas idempotentes para a fila offline

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
app.use("/api", movimentoEstoqueRoutes);
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
  const codigo = codigoPostgres(err);
  const conhecido = ERROS_CONHECIDOS[codigo];
  const status = err.status || (conhecido ? conhecido[0] : 500);
  const message = err.status ? err.message : (conhecido ? conhecido[1] : "Erro interno do servidor");

  if (status === 500) {
    console.error("Erro no servidor:", err.cause?.message || err.message);
  }

  const resposta = { message };
  if (err.field) resposta.field = err.field;

  res.status(status).json(resposta);
});

export default app;
