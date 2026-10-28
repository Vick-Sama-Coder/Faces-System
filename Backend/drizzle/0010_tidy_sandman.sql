CREATE TABLE "requisicao_idempotencia" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "requisicao_idempotencia_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"chave" varchar(120) NOT NULL,
	"metodo" varchar(10) NOT NULL,
	"caminho" varchar(500) NOT NULL,
	"id_utilizador" integer,
	"estado" varchar(20) DEFAULT 'em_processamento' NOT NULL,
	"status_code" integer,
	"resposta" jsonb,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "requisicao_idempotencia_chave_uidx" ON "requisicao_idempotencia" USING btree ("chave");--> statement-breakpoint
CREATE INDEX "requisicao_idempotencia_criado_idx" ON "requisicao_idempotencia" USING btree ("criado_em");