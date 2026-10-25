CREATE TABLE "movimento_estoque" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "movimento_estoque_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"produto_id" integer NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"quantidade" integer NOT NULL,
	"motivo" varchar(100),
	"data_movimento" date DEFAULT current_date NOT NULL,
	"registado_por" integer,
	"despesa_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_produto_id_produto_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_registado_por_usuario_id_fk" FOREIGN KEY ("registado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimento_estoque" ADD CONSTRAINT "movimento_estoque_despesa_id_despesa_id_fk" FOREIGN KEY ("despesa_id") REFERENCES "public"."despesa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movimento_estoque_produto_idx" ON "movimento_estoque" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "movimento_estoque_tipo_idx" ON "movimento_estoque" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "movimento_estoque_data_idx" ON "movimento_estoque" USING btree ("data_movimento");--> statement-breakpoint
CREATE INDEX "movimento_estoque_despesa_idx" ON "movimento_estoque" USING btree ("despesa_id");