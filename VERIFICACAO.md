# Verificação da entrega

Verificado em 23 de outubro de 2026.

## Concluído

- Cinco testes automatizados passaram: nomes sem valores; registar/anular sem misturar meses; exportar/importar preservando estado; rejeitar cópias inválidas; arquivar sem apagar histórico; calendário local.
- Sintaxe dos módulos JavaScript verificada.
- No navegador: registo de pagamento com mensagem surpresa; estado pago mantido depois de recarregar; confirmação ao anular; criação de versões automáticas; recuperação de uma versão local; mudança para um novo mês sem pagamentos.
- Interface verificada com largura de 390 px, sem deslocamento horizontal.
- O navegador confirmou que o modo sem internet ficou preparado pelo service worker. Depois de desligar o servidor local, a aplicação reabriu e manteve o pagamento registado.
- Os ficheiros de publicação usam caminhos relativos, compatíveis com o subdiretório `/carla-pagamentos/`.

## Verificação final no iPhone após publicação

Ainda não foi testado num iPhone físico nem publicado no GitHub Pages. Confirmar no telefone:

1. Adicionar ao ecrã principal pelo Safari.
2. Marcar e anular um pagamento de teste; ouvir o som com o volume ativo.
3. Fechar e reabrir para confirmar persistência.
4. Exportar uma cópia para Ficheiros/iCloud Drive e confirmar que existe.
5. Importar essa cópia e confirmar os nomes e estados.
6. Ativar modo de voo e reabrir pelo ícone, depois da preparação inicial com internet.

Os dados usados na pré-visualização não fazem parte dos ficheiros da aplicação. A versão publicada começa sem pagamentos registados.
