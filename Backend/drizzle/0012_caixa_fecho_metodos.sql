ALTER TABLE "caixa_sessao" ADD COLUMN "saldos_por_metodo" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE caixa_sessao s
   SET saldos_por_metodo = (
       SELECT jsonb_agg(jsonb_build_object(
                  'metodo_pagamento', saldos.metodo_pagamento,
                  'saldo', saldos.saldo,
                  'conferido_no_fecho', saldos.metodo_pagamento = 'Dinheiro'
              ) ORDER BY saldos.metodo_pagamento = 'Dinheiro' DESC, saldos.metodo_pagamento)
         FROM (
             SELECT 'Dinheiro'::varchar AS metodo_pagamento,
                    coalesce(s.valor_esperado, s.saldo_inicial + coalesce(sum(
                        CASE WHEN m.tipo_movimento = 'Entrada' THEN m.valor ELSE -m.valor END
                    ), 0)::int) AS saldo
               FROM movimento_caixa m
              WHERE m.id_sessao = s.id
                AND m.estado = 'Ativo'
                AND m.metodo_pagamento = 'Dinheiro'
             UNION ALL
             SELECT m.metodo_pagamento,
                    sum(CASE WHEN m.tipo_movimento = 'Entrada' THEN m.valor ELSE -m.valor END)::int AS saldo
               FROM movimento_caixa m
              WHERE m.id_sessao = s.id
                AND m.estado = 'Ativo'
                AND m.metodo_pagamento <> 'Dinheiro'
              GROUP BY m.metodo_pagamento
         ) saldos
   )
 WHERE s.estado = 'Fechada';