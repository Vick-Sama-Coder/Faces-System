DROP INDEX "movimento_caixa_referencia_unica";--> statement-breakpoint
ALTER TABLE "movimento_caixa" ADD COLUMN "metodo_pagamento" varchar(50) DEFAULT 'Dinheiro' NOT NULL;--> statement-breakpoint
UPDATE movimento_caixa m
   SET metodo_pagamento = d.metodo_pagamento
  FROM despesa d
 WHERE m.origem = 'Despesa'
   AND m.referencia_id = d.id
   AND d.metodo_pagamento IS NOT NULL;--> statement-breakpoint
WITH metodos_pagamento AS (
    SELECT
        m.id AS movimento_id,
        pp.metodo_pagamento,
        SUM(pp.valor)::int AS valor,
        ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY MIN(pp.id)) AS ordem
    FROM movimento_caixa m
    JOIN pagamento p
      ON p.id = m.referencia_id
     AND m.origem = 'Pagamento'
    JOIN pagamento_parcela pp ON pp.pagamento_id = p.id
    GROUP BY m.id, pp.metodo_pagamento
)
UPDATE movimento_caixa m
   SET metodo_pagamento = mp.metodo_pagamento,
       valor = mp.valor
  FROM metodos_pagamento mp
 WHERE mp.movimento_id = m.id
   AND mp.ordem = 1;--> statement-breakpoint
WITH metodos_pagamento AS (
    SELECT
        m.id AS movimento_id,
        pp.metodo_pagamento,
        SUM(pp.valor)::int AS valor,
        ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY MIN(pp.id)) AS ordem
    FROM movimento_caixa m
    JOIN pagamento p
      ON p.id = m.referencia_id
     AND m.origem = 'Pagamento'
    JOIN pagamento_parcela pp ON pp.pagamento_id = p.id
    GROUP BY m.id, pp.metodo_pagamento
)
INSERT INTO movimento_caixa (
    id_sessao, tipo_movimento, metodo_pagamento, valor, descricao,
    data_hora, origem, referencia_id, registado_por, estado
)
SELECT
    m.id_sessao, m.tipo_movimento, mp.metodo_pagamento, mp.valor, m.descricao,
    m.data_hora, m.origem, m.referencia_id, m.registado_por, m.estado
FROM movimento_caixa m
JOIN metodos_pagamento mp ON mp.movimento_id = m.id
WHERE mp.ordem > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "movimento_caixa_referencia_unica" ON "movimento_caixa" USING btree ("origem","referencia_id","metodo_pagamento") WHERE "movimento_caixa"."referencia_id" is not null;