CREATE TABLE "agendamento" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agendamento_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cliente_id" integer NOT NULL,
	"estado" varchar(20) DEFAULT 'Aberto' NOT NULL,
	"valor_total" integer DEFAULT 0 NOT NULL,
	"observacoes" varchar(255),
	"registado_por" integer,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"motivo_anulacao" varchar(255),
	CONSTRAINT "agendamento_estado_check" CHECK ("agendamento"."estado" in ('Aberto', 'Concluido', 'Anulado')),
	CONSTRAINT "agendamento_valor_total_check" CHECK ("agendamento"."valor_total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "agendamento_reembolso" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agendamento_reembolso_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"agendamento_id" integer NOT NULL,
	"valor" integer NOT NULL,
	"metodo_pagamento" varchar(50) NOT NULL,
	"motivo" varchar(255) NOT NULL,
	"registado_por" integer,
	"data_hora" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agendamento_reembolso_valor_check" CHECK ("agendamento_reembolso"."valor" > 0)
);
--> statement-breakpoint
CREATE TABLE "agendamento_servico" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "agendamento_servico_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"agendamento_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"servico_id" integer NOT NULL,
	"modalidade_id" integer,
	"modalidade_nome" varchar(100),
	"tipo_servico" varchar(20) DEFAULT 'Servico' NOT NULL,
	"preco_unitario" integer NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL,
	"quantidade_consumida" integer DEFAULT 0 NOT NULL,
	"quantidade_cancelada" integer DEFAULT 0 NOT NULL,
	"registado_por" integer,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agendamento_servico_preco_check" CHECK ("agendamento_servico"."preco_unitario" > 0),
	CONSTRAINT "agendamento_servico_quantidade_check" CHECK ("agendamento_servico"."quantidade" > 0),
	CONSTRAINT "agendamento_servico_consumida_check" CHECK ("agendamento_servico"."quantidade_consumida" >= 0),
	CONSTRAINT "agendamento_servico_cancelada_check" CHECK ("agendamento_servico"."quantidade_cancelada" >= 0),
	CONSTRAINT "agendamento_servico_saldo_check" CHECK ("agendamento_servico"."quantidade_consumida" + "agendamento_servico"."quantidade_cancelada" <= "agendamento_servico"."quantidade"),
	CONSTRAINT "agendamento_servico_tipo_check" CHECK ("agendamento_servico"."tipo_servico" in ('Servico', 'Aplicacao'))
);
--> statement-breakpoint
ALTER TABLE "pagamento" ALTER COLUMN "atendimento_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "atendimento_servico" ADD COLUMN "agendamento_servico_id" integer;--> statement-breakpoint
ALTER TABLE "pagamento" ADD COLUMN "agendamento_id" integer;--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento" ADD CONSTRAINT "agendamento_registado_por_usuario_id_fk" FOREIGN KEY ("registado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_reembolso" ADD CONSTRAINT "agendamento_reembolso_agendamento_id_agendamento_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_reembolso" ADD CONSTRAINT "agendamento_reembolso_registado_por_usuario_id_fk" FOREIGN KEY ("registado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_servico" ADD CONSTRAINT "agendamento_servico_agendamento_id_agendamento_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_servico" ADD CONSTRAINT "agendamento_servico_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_servico" ADD CONSTRAINT "agendamento_servico_servico_id_servico_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_servico" ADD CONSTRAINT "agendamento_servico_modalidade_id_servico_modalidade_id_fk" FOREIGN KEY ("modalidade_id") REFERENCES "public"."servico_modalidade"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_servico" ADD CONSTRAINT "agendamento_servico_registado_por_usuario_id_fk" FOREIGN KEY ("registado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agendamento_cliente_idx" ON "agendamento" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "agendamento_estado_idx" ON "agendamento" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "agendamento_reembolso_agendamento_idx" ON "agendamento_reembolso" USING btree ("agendamento_id");--> statement-breakpoint
CREATE INDEX "agendamento_servico_agendamento_idx" ON "agendamento_servico" USING btree ("agendamento_id");--> statement-breakpoint
CREATE INDEX "agendamento_servico_servico_idx" ON "agendamento_servico" USING btree ("servico_id");--> statement-breakpoint
ALTER TABLE "atendimento_servico" ADD CONSTRAINT "atendimento_servico_agendamento_servico_id_agendamento_servico_id_fk" FOREIGN KEY ("agendamento_servico_id") REFERENCES "public"."agendamento_servico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_agendamento_id_agendamento_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "atendimento_servico_agendamento_idx" ON "atendimento_servico" USING btree ("agendamento_servico_id");--> statement-breakpoint
CREATE INDEX "pagamento_atendimento_idx" ON "pagamento" USING btree ("atendimento_id");--> statement-breakpoint
CREATE INDEX "pagamento_agendamento_idx" ON "pagamento" USING btree ("agendamento_id");--> statement-breakpoint
ALTER TABLE "pagamento" ADD CONSTRAINT "pagamento_dono_check" CHECK (("pagamento"."atendimento_id" is not null and "pagamento"."agendamento_id" is null)
            or ("pagamento"."atendimento_id" is null and "pagamento"."agendamento_id" is not null));