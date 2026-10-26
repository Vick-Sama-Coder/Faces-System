-- 0007: reconciliar a base Neon com o schema Drizzle atual.
-- A base aplicou uma versao antiga das migracoes 0005/0006 antes de os
-- ficheiros atuais serem consolidados. O historico Drizzle ficou marcado como
-- atualizado, mas faltavam colunas e tabelas do catalogo. Este SQL repete a
-- reconciliacao de forma idempotente, sem destruir dados existentes.
--
-- Efeitos: idade do cliente, tipo/aplicacoes de servico, modalidades,
-- aplicacoes, descontos e colunas de stock em atendimento_servico.

-- ---------------------------------------------------------------------------
-- Cliente: idade declarada (opcional)
-- ---------------------------------------------------------------------------
ALTER TABLE "cliente" ADD COLUMN IF NOT EXISTS "idade" integer;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'cliente_idade_check'
          AND conrelid = 'public.cliente'::regclass
    ) THEN
        ALTER TABLE "cliente" ADD CONSTRAINT "cliente_idade_check"
            CHECK ("idade" IS NULL OR ("idade" >= 0 AND "idade" <= 120));
    END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Servico: tipo Servico/Aplicacao e permissoes de aplicacao
-- ---------------------------------------------------------------------------
ALTER TABLE "servico" ADD COLUMN IF NOT EXISTS "tipo_servico" varchar(20) NOT NULL DEFAULT 'Servico';--> statement-breakpoint
ALTER TABLE "servico" ADD COLUMN IF NOT EXISTS "permite_aplicacoes" boolean NOT NULL DEFAULT false;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'servico_tipo_servico_check'
          AND conrelid = 'public.servico'::regclass
    ) THEN
        ALTER TABLE "servico" ADD CONSTRAINT "servico_tipo_servico_check"
            CHECK ("tipo_servico" in ('Servico', 'Aplicacao'));
    END IF;
END $$;--> statement-breakpoint
-- O schema atual permite servicos gratuitos (valor >= 0).
ALTER TABLE "servico" DROP CONSTRAINT IF EXISTS "servico_valor_check";--> statement-breakpoint
ALTER TABLE "servico" ADD CONSTRAINT "servico_valor_check" CHECK ("valor" >= 0);--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Produto: unidade e stock minimo (controlo de stock)
-- ---------------------------------------------------------------------------
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "unidade" varchar(20) NOT NULL DEFAULT 'un';--> statement-breakpoint
ALTER TABLE "produto" ADD COLUMN IF NOT EXISTS "stock_minimo" integer NOT NULL DEFAULT 0;--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'produto_stock_minimo_check'
          AND conrelid = 'public.produto'::regclass
    ) THEN
        ALTER TABLE "produto" ADD CONSTRAINT "produto_stock_minimo_check"
            CHECK ("stock_minimo" >= 0);
    END IF;
END $$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Modalidades de preco por servico
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "servico_modalidade" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "servico_modalidade_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
    "servico_id" integer NOT NULL,
    "nome" varchar(100) NOT NULL,
    "faixa_etaria" varchar(20) DEFAULT 'Geral' NOT NULL,
    "valor" integer NOT NULL,
    "ordem" integer DEFAULT 0 NOT NULL,
    "estado" varchar(20) DEFAULT 'Ativo' NOT NULL,
    "data_criacao" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "servico_modalidade_servico_id_servico_id_fk" FOREIGN KEY ("servico_id") REFERENCES "servico"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "servico_modalidade_valor_check" CHECK ("valor" >= 0),
    CONSTRAINT "servico_modalidade_faixa_check" CHECK ("faixa_etaria" in ('Geral', 'Adulto', 'Crianca'))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "servico_modalidade_servico_idx" ON "servico_modalidade" USING btree ("servico_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "servico_modalidade_nome_ativo_unico" ON "servico_modalidade" USING btree ("servico_id", lower("nome")) WHERE "servico_modalidade"."estado" = 'Ativo';--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Aplicacoes permitidas por servico principal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "servico_aplicacao" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "servico_aplicacao_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
    "servico_id" integer NOT NULL,
    "aplicacao_id" integer NOT NULL,
    "data_criacao" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "servico_aplicacao_servico_id_servico_id_fk" FOREIGN KEY ("servico_id") REFERENCES "servico"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "servico_aplicacao_aplicacao_id_servico_id_fk" FOREIGN KEY ("aplicacao_id") REFERENCES "servico"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "servico_aplicacao_distintos_check" CHECK ("servico_id" <> "aplicacao_id")
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "servico_aplicacao_unica" ON "servico_aplicacao" USING btree ("servico_id", "aplicacao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "servico_aplicacao_servico_idx" ON "servico_aplicacao" USING btree ("servico_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "servico_aplicacao_aplicacao_idx" ON "servico_aplicacao" USING btree ("aplicacao_id");--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Linhas de atendimento: modalidade, tipo e ligacao ao servico principal
-- ---------------------------------------------------------------------------
ALTER TABLE "atendimento_servico" ADD COLUMN IF NOT EXISTS "servico_principal_id" integer;--> statement-breakpoint
ALTER TABLE "atendimento_servico" ADD COLUMN IF NOT EXISTS "modalidade_id" integer;--> statement-breakpoint
ALTER TABLE "atendimento_servico" ADD COLUMN IF NOT EXISTS "modalidade_nome" varchar(100);--> statement-breakpoint
ALTER TABLE "atendimento_servico" ADD COLUMN IF NOT EXISTS "tipo_servico" varchar(20) NOT NULL DEFAULT 'Servico';--> statement-breakpoint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'atendimento_servico_servico_principal_id_atendimento_servico_id_fk'
          AND conrelid = 'public.atendimento_servico'::regclass
    ) THEN
        ALTER TABLE "atendimento_servico" ADD CONSTRAINT "atendimento_servico_servico_principal_id_atendimento_servico_id_fk"
            FOREIGN KEY ("servico_principal_id") REFERENCES "atendimento_servico"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'atendimento_servico_modalidade_id_servico_modalidade_id_fk'
          AND conrelid = 'public.atendimento_servico'::regclass
    ) THEN
        ALTER TABLE "atendimento_servico" ADD CONSTRAINT "atendimento_servico_modalidade_id_servico_modalidade_id_fk"
            FOREIGN KEY ("modalidade_id") REFERENCES "servico_modalidade"("id") ON DELETE no action ON UPDATE no action;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'atendimento_servico_tipo_check'
          AND conrelid = 'public.atendimento_servico'::regclass
    ) THEN
        ALTER TABLE "atendimento_servico" ADD CONSTRAINT "atendimento_servico_tipo_check"
            CHECK ("tipo_servico" in ('Servico', 'Aplicacao'));
    END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimento_servico_atendimento_idx" ON "atendimento_servico" USING btree ("atendimento_id");--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Historico de descontos aplicados ao atendimento
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "desconto_atendimento" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "desconto_atendimento_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
    "atendimento_id" integer NOT NULL,
    "atendimento_servico_id" integer NOT NULL,
    "escopo" varchar(20) DEFAULT 'Servico' NOT NULL,
    "tipo" varchar(20) NOT NULL,
    "percentagem" numeric(5, 2),
    "valor_bruto" integer NOT NULL,
    "valor_desconto" integer NOT NULL,
    "valor_final" integer NOT NULL,
    "aplicado_por" integer,
    "criado_em" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "desconto_atendimento_atendimento_id_atendimento_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "atendimento"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "desconto_atendimento_atendimento_servico_id_atendimento_servico_id_fk" FOREIGN KEY ("atendimento_servico_id") REFERENCES "atendimento_servico"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "desconto_atendimento_aplicado_por_usuario_id_fk" FOREIGN KEY ("aplicado_por") REFERENCES "usuario"("id") ON DELETE no action ON UPDATE no action,
    CONSTRAINT "desconto_atendimento_tipo_check" CHECK ("tipo" in ('Percentagem', 'Valor')),
    CONSTRAINT "desconto_atendimento_escopo_check" CHECK ("escopo" in ('Servico', 'Atendimento')),
    CONSTRAINT "desconto_atendimento_valor_check" CHECK ("valor_desconto" >= 0),
    CONSTRAINT "desconto_atendimento_bruto_check" CHECK ("valor_bruto" >= 0),
    CONSTRAINT "desconto_atendimento_final_check" CHECK ("valor_final" >= 0),
    CONSTRAINT "desconto_atendimento_percentagem_check" CHECK ("percentagem" IS NULL OR ("percentagem" >= 0 AND "percentagem" <= 100))
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desconto_atendimento_atendimento_idx" ON "desconto_atendimento" USING btree ("atendimento_id");
