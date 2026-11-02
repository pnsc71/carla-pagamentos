# CARLA — Gestão de Pagamentos 2.0

Aplicação web instalável, com modo escuro permanente e dados guardados exclusivamente no navegador. Não contém uma lista de alunos, preços ou pagamentos reais. Numa instalação nova, importa uma cópia JSON ou o CSV de resumo da CARLA PRO.

## Utilização

- **Pagamentos:** três cartões de resumo com somas e três alunos por linha. Tocar num aluno marca pago; anular pede confirmação.
- **Registar aulas:** dois alunos por linha. Cada aula representa uma hora. Altera o número de aulas e escolhe Guardar aulas. O total apresentado acompanha a edição. Depois escolhe Marcar pago.
- Os registos já pagos ficam protegidos contra alterações às aulas e aos valores. Para corrigir, anula primeiro o pagamento.
- Os preços por aula são editáveis nas definições. Os meses com aulas já registadas mantêm o preço desse mês; a alteração do preço habitual aplica-se aos meses ainda sem registo.
- **Limpar pagamentos:** limpa apenas os estados do mês selecionado, após confirmação. Mantém aulas, alunos, preços e outros meses. A versão anterior é recuperável.
- Os alunos excluídos por nome no modelo permanecem arquivados, sem apagar o seu histórico.

## Importação CSV

Aceita o CSV de resumo exportado pela CARLA PRO com as colunas **Aluno, Total, Aulas, Estado**. Aceita vírgula ou ponto e vírgula como separador, valores entre aspas, vírgula decimal e BOM UTF-8. O ficheiro Numbers não é importado diretamente: utiliza o CSV original.

O CSV de resumo não identifica o mês. A aplicação exige escolher explicitamente o mês das aulas e apresenta uma confirmação antes de guardar. A data do nome do ficheiro indica a exportação, podendo ser diferente do mês das aulas.

O nome normalizado identifica o aluno, ignorando maiúsculas, acentos e espaços repetidos. Não são feitos cruzamentos aproximados entre nomes diferentes. Alunos repetidos no CSV ou nomes ambíguos na aplicação impedem a importação inteira. Alunos ausentes no CSV não são removidos. Alunos arquivados não são reativados automaticamente.

A reimportação substitui os números de aulas e valores dos registos ainda por pagar do mês selecionado; não os soma novamente. Um estado pendente nunca anula um pagamento existente. Um pagamento antigo sem aulas/valores recebe esses dados apenas na primeira importação desse mês, preservando a data original de pagamento. Um registo pago que já tenha aulas e valores mantém-se intacto.

O preço por aula resulta do total dividido pelo número de aulas, em cêntimos inteiros. Totais incompatíveis, estados desconhecidos e ficheiros malformados são rejeitados sem guardar alterações. Para zero aulas e zero total, mantém-se o preço existente; para um aluno novo sem aulas é necessário preencher o preço nas definições.

## Cópias e migração

A base mantém o nome `carla-pagamentos-v1` e a versão de esquema IndexedDB 1, com os mesmos armazéns `current` e `snapshots`. O **formato dos dados** passa a 2. A migração valida e converte o estado antigo, preservando identificadores, preferências e todas as datas de pagamento.

O novo estado, a versão anterior e uma cópia original protegida são guardados na mesma transação. Se a transação falhar, o estado anterior mantém-se. A cópia original anterior à migração fica na chave `recovery-before-v2`, fora da rotação das últimas 30 versões. Surge também em Recuperar uma versão local. A proteção por revisão evita que duas janelas sobrescrevam silenciosamente os dados uma da outra.

As cópias JSON dos formatos 1 e 2 são aceites. As exportações novas usam o formato 2. A importação JSON substitui o estado após confirmação e guarda a versão anterior. Guardar cópia de segurança usa a partilha quando disponível; Descarregar JSON diretamente oferece a alternativa de descarregamento. Confirmar o destino final continua a ser responsabilidade de quem guarda o ficheiro.

As versões locais não substituem uma cópia fora do navegador. Apagar os dados do site pode eliminar ambas. Não existe sincronização entre dispositivos. Ao atualizar, manter o mesmo endereço GitHub Pages e o ícone existente no iPhone.

## Testar localmente

Requer Node.js 22 e Python 3, já disponíveis no Mac utilizado nos testes.

```sh
node --test tests/*.test.mjs
python3 -m http.server 8876 --bind 127.0.0.1 --directory .
```

Abrir `http://127.0.0.1:8876/site/`. Os dados deste endereço são separados dos dados publicados. Para os testes de IndexedDB, abrir primeiro a aplicação e depois `http://127.0.0.1:8876/tests/browser.html`. O teste recusa alterar uma base que contenha alunos sem os identificadores fictícios `qa-`. Usa apenas um endereço local de teste.

## Publicação e recuperação

Nada nesta pasta publica por si só. O workflow só executa depois de uma alteração ser enviada ao GitHub ou ser iniciado manualmente no GitHub. Não enviar ficheiros antes de autorização.

1. No iPhone, exportar uma cópia JSON atual e confirmar que o ficheiro abre. Guardar uma segunda cópia fora do telefone.
2. Guardar o código da versão publicada e o identificador do commit anterior.
3. Rever a versão local, a importação e a recuperação. Fazer a verificação final no iPhone antes de substituir a versão principal, usando um ambiente de teste separado e a cópia exportada.
4. Com autorização, substituir apenas o código da aplicação e respetivos testes/documentação no mesmo repositório. Não enviar ficheiros de dados privados, pastas de segurança ou exportações.
5. O workflow testa o modelo e publica exclusivamente `site/`. Confirmar o sucesso antes de atualizar o iPhone.
6. No ícone já instalado, com ligação, escolher Definições → Atualizar aplicação. Confirmar o mês e os estados de pagamento e guardar uma cópia nova.
7. Se for necessário recuperar dados na versão 2, importar o JSON guardado ou recuperar uma versão local.

Para voltar ao código antigo, **não basta repor os ficheiros antigos**, pois o código antigo só lê dados do formato 1. Uma reversão exige uma reposição controlada do estado original do formato 1, além do código, pois a aplicação antiga não consegue abrir o estado v2 para apresentar o botão de importação. Não executar essa reversão sem preparar e testar o procedimento de reposição. Para recuperar dados nesta versão, usar a importação JSON ou as versões locais, já testadas. Guardar também o JSON v2 antes de qualquer recuo. Não apagar os dados do Safari como método de recuperação.

Os nomes presentes no histórico de commits do repositório antigo não desaparecem apenas por substituir a versão atual. Este pacote não acrescenta listas ou pagamentos privados; qualquer limpeza do histórico público anterior será tratada separadamente, apenas se autorizada.
