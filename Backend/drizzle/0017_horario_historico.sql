CREATE TABLE "horario_funcionario_historico" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "horario_funcionario_historico_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"funcionario_id" integer NOT NULL,
	"dia_semana" integer NOT NULL,
	"hora_entrada" time NOT NULL,
	"hora_saida" time NOT NULL,
	"estado" varchar(20) DEFAULT 'Ativo' NOT NULL,
	"substituido_em" timestamp DEFAULT now() NOT NULL,
	"substituido_por" integer,
	CONSTRAINT "horario_funcionario_historico_dia_semana_check" CHECK ("horario_funcionario_historico"."dia_semana" between 0 and 6)
);
--> statement-breakpoint
ALTER TABLE "horario_funcionario_historico" ADD CONSTRAINT "horario_funcionario_historico_funcionario_id_funcionario_id_fk" FOREIGN KEY ("funcionario_id") REFERENCES "public"."funcionario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "horario_funcionario_historico" ADD CONSTRAINT "horario_funcionario_historico_substituido_por_usuario_id_fk" FOREIGN KEY ("substituido_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "horario_funcionario_historico_funcionario_idx" ON "horario_funcionario_historico" USING btree ("funcionario_id");
