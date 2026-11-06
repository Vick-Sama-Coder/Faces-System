CREATE TABLE "assiduidade_ausencia" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "assiduidade_ausencia_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"assiduidade_id" integer NOT NULL,
	"hora_inicio" time NOT NULL,
	"hora_fim" time NOT NULL,
	"motivo" varchar(255),
	"registado_por" integer,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "assiduidade_ausencia_intervalo_check" CHECK ("assiduidade_ausencia"."hora_fim" > "assiduidade_ausencia"."hora_inicio")
);
--> statement-breakpoint
ALTER TABLE "assiduidade_ausencia" ADD CONSTRAINT "assiduidade_ausencia_assiduidade_id_assiduidade_id_fk" FOREIGN KEY ("assiduidade_id") REFERENCES "public"."assiduidade"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assiduidade_ausencia" ADD CONSTRAINT "assiduidade_ausencia_registado_por_usuario_id_fk" FOREIGN KEY ("registado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assiduidade_ausencia_assiduidade_idx" ON "assiduidade_ausencia" USING btree ("assiduidade_id");