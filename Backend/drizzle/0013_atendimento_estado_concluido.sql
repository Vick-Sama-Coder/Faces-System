ALTER TABLE "atendimento" ALTER COLUMN "estado" SET DEFAULT 'Concluido';--> statement-breakpoint
UPDATE "atendimento" SET "estado" = 'Concluido' WHERE "estado" NOT IN ('Concluido', 'Anulado');--> statement-breakpoint
ALTER TABLE "atendimento" ADD CONSTRAINT "atendimento_estado_check" CHECK ("atendimento"."estado" in ('Concluido', 'Anulado'));