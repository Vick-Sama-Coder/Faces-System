-- Atendimento com varios clientes: cada linha de servico passa a indicar o
-- cliente a quem pertence. O cabecalho mantem cliente_id como cliente principal.
ALTER TABLE "atendimento_servico" ADD COLUMN "cliente_id" integer;--> statement-breakpoint
UPDATE "atendimento_servico" AS s
   SET "cliente_id" = a."cliente_id"
  FROM "atendimento" AS a
 WHERE a."id" = s."atendimento_id";--> statement-breakpoint
ALTER TABLE "atendimento_servico" ALTER COLUMN "cliente_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "atendimento_servico" ADD COLUMN "fidelizacao_selecionada" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "atendimento_servico" ADD CONSTRAINT "atendimento_servico_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "atendimento_servico_cliente_idx" ON "atendimento_servico" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "atendimento_servico_fidelizacao_unica" ON "atendimento_servico" USING btree ("atendimento_id","cliente_id") WHERE "atendimento_servico"."fidelizacao_selecionada" = true;
