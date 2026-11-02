# Verificação local — 2 de novembro de 2026

## Resultado

Implementação local concluída. Nenhuma alteração enviada ao GitHub e nenhuma modificação à CARLA PRO 4.0. O pacote de código não inclui as exportações reais nem a lista inicial de alunos da versão antiga.

## Testes realizados

- 11 testes automatizados do modelo: instalação vazia, migração, cópias antigas/novas, leitura de CSV, normalização de nomes, importação repetida, preservação de pagamentos, rejeição de ficheiros inválidos, cálculos em cêntimos, preços por mês e limpeza limitada ao mês escolhido. Todos passaram.
- 11 verificações de armazenamento no navegador integrado e no Safari do Mac: migração de um estado antigo, gravação da versão anterior, rotação de 30 versões, preservação adicional da cópia original, conflito entre revisões, ausência de gravação após erro, histórico, cópias JSON, limpeza e recuperação. Todas passaram.
- Ficheiros reais, apenas na pasta privada: migração do JSON com preservação exata dos identificadores e do mapa completo de pagamentos; importação do CSV de resumo em meses de teste; importação repetida sem duplicar; verificação independente das somas; exportação e leitura JSON sem perdas. Os ficheiros originais ficaram intactos.
- Interface: editar aulas atualiza imediatamente o total; Guardar aulas atualiza o resumo; Marcar pago atualiza o estado e apresenta a mensagem especial; cancelar Limpar pagamentos mantém os valores; confirmar a limpeza mantém aulas e preços; recuperar a versão anterior repõe os pagamentos.
- Importação pela interface: escolha explícita de mês, confirmação com resumo, preservação de um registo já pago e criação de um aluno novo de teste.
- Exportação: ficheiro JSON v2 descarregado pelo Safari para a pasta privada, aberto e validado; importado depois na interface do navegador integrado, repondo alunos e histórico.
- Atualização do service worker aplicada na interface sem perder dados.
- Modo offline: servidor local desligado. A aplicação voltou a abrir no navegador integrado e no Safari. No navegador integrado foram editadas aulas e marcado um pagamento sem servidor, seguidos de nova abertura, confirmando a persistência.
- Larguras 320 e 390: sem deslocação horizontal; três colunas em Pagamentos e duas em Registar aulas. Inspeção visual das duas vistas. Ausência do símbolo monetário nos textos visíveis.
- Verificação de sintaxe dos módulos de aplicação, modelo, armazenamento e service worker.

## Verificação ainda necessária antes da publicação principal

O iPhone físico não esteve ligado às ferramentas de teste. Ainda é necessário testar uma instalação separada de ensaio no iPhone: som em pagamentos repetidos, partilha para Ficheiros, recuperação do JSON e abertura pelo ícone sem ligação. A implementação do som mantém a correção da versão anterior, mas o resultado audível no telefone não foi verificado nesta sessão.

O mês do CSV de resumo tem de ser confirmado por quem o exportou. O nome do ficheiro contém a data da exportação, não a data das aulas. Os testes que o aplicaram a meses diferentes foram simulações isoladas, sem efeito nos pagamentos reais.

Não foi executada publicação nem reversão do código no endereço real. A recuperação de dados foi testada na versão 2. Repor o código antigo exige também repor um estado do formato 1; não deve ser feita uma reversão de código isolada.

## Atualização do logótipo

O utilizador confirmou que os testes efetuados estavam bem e pediu apenas a substituição do logótipo. A imagem fornecida foi aplicada ao cabeçalho, favicon e ícones de instalação, preservando a composição completa. Ícones PNG nos tamanhos 180, 192 e 512, atualização do cache offline e ZIP atualizados.

A pedido do utilizador, o logótipo do cabeçalho passou a circular, com contorno violeta. A atualização foi incluída no cache offline e no ZIP.
