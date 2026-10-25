-- 0005_stock_controlo.sql: Adicionar campos de stock ao produto e criar tabela de movimentos

-- Adicionar campo unidade ao produto (ex.: 'un', 'kg', 'l', 'cx')
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "unidade" varchar(20) NOT NULL DEFAULT 'un';

-- Adicionar campo stock_minimo ao produto
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "stock_minimo" integer NOT NULL DEFAULT 0;

-- Tabela de movimentos de stock: registar todas as alterações de stock
-- tipo: 'entrada' (compra), 'saida' (consumo/pérdida), 'ajuste' (contagem física)
CREATE TABLE IF NOT EXISTS "movimento_estoque" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "produto_id" integer NOT NULL REFERENCES "produto"("id") ON DELETE CASCADE,
    "tipo" varchar(20) NOT NULL CHECK ("tipo" IN ('entrada', 'saida', 'ajuste')),
    "quantidade" integer NOT NULL CHECK ("quantidade" > 0),
    "motivo" varchar(100),
    "data_movimento" date NOT NULL DEFAULT current_date,
    "registado_por" integer REFERENCES "usuario"("id"),
    "despesa_id" integer REFERENCES "despesa"("id"),
    "created_at" timestamp NOT NULL DEFAULT now()
);

-- Índices para performance nas consultas de stock
CREATE INDEX IF NOT EXISTS "movimento_estoque_produto_idx" ON "movimento_estoque"("produto_id");
CREATE INDEX IF NOT EXISTS "movimento_estoque_tipo_idx" ON "movimento_estoque"("tipo");
CREATE INDEX IF NOT EXISTS "movimento_estoque_data_idx" ON "movimento_estoque"("data_movimento");
CREATE INDEX IF NOT EXISTS "movimento_estoque_despesa_idx" ON "movimento_estoque"("despesa_id");
