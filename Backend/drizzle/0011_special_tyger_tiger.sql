CREATE TABLE "log_operacoes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "log_operacoes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"data_hora" timestamp DEFAULT now() NOT NULL,
	"tipo_operacao" varchar(50) NOT NULL,
	"modulo" varchar(50) NOT NULL,
	"descricao" text,
	"duracao_ms" integer NOT NULL,
	"status_codigo" integer,
	"sucesso" boolean DEFAULT true NOT NULL,
	"request_id" varchar(100),
	"referencia_generica" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "log_seguranca" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "log_seguranca_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"data_hora" timestamp DEFAULT now() NOT NULL,
	"tipo_evento" varchar(50) NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"motivo" varchar(255),
	"sucesso" boolean DEFAULT true NOT NULL,
	"referencia_generica" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "log_tecnico" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "log_tecnico_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"data_hora" timestamp DEFAULT now() NOT NULL,
	"nivel" varchar(20) NOT NULL,
	"modulo" varchar(50) NOT NULL,
	"mensagem" text NOT NULL,
	"detalhes" jsonb,
	"duracao_ms" integer,
	"request_id" varchar(100)
);
--> statement-breakpoint
CREATE INDEX "log_operacoes_data_idx" ON "log_operacoes" USING btree ("data_hora");--> statement-breakpoint
CREATE INDEX "log_operacoes_tipo_idx" ON "log_operacoes" USING btree ("tipo_operacao");--> statement-breakpoint
CREATE INDEX "log_operacoes_modulo_idx" ON "log_operacoes" USING btree ("modulo");--> statement-breakpoint
CREATE INDEX "log_operacoes_duracao_idx" ON "log_operacoes" USING btree ("duracao_ms");--> statement-breakpoint
CREATE INDEX "log_operacoes_referencia_idx" ON "log_operacoes" USING btree ("referencia_generica");--> statement-breakpoint
CREATE INDEX "log_seguranca_data_idx" ON "log_seguranca" USING btree ("data_hora");--> statement-breakpoint
CREATE INDEX "log_seguranca_tipo_idx" ON "log_seguranca" USING btree ("tipo_evento");--> statement-breakpoint
CREATE INDEX "log_seguranca_referencia_idx" ON "log_seguranca" USING btree ("referencia_generica");--> statement-breakpoint
CREATE INDEX "log_tecnico_data_idx" ON "log_tecnico" USING btree ("data_hora");--> statement-breakpoint
CREATE INDEX "log_tecnico_modulo_idx" ON "log_tecnico" USING btree ("modulo");--> statement-breakpoint
CREATE INDEX "log_tecnico_nivel_idx" ON "log_tecnico" USING btree ("nivel");