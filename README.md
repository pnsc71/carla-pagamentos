# Carla — Pagamentos

Uma pequena aplicação para gerir os pagamentos mensais das aulas presenciais. Visual claro, sem contas de utilizador, sem serviços externos e sem dependências de instalação.

Inclui os 16 nomes enviados: Benedita, Pilar, Mateus, Gabriel, Rita, Aida, Francisco, Constança, Jorge, Eva, Ema, Tomás, Beatriz, Leonor, Maria e Andreia. O pedido inicial referia 14 alunos; os dois nomes finais foram também incluídos. Podem arquivar-se nas definições. Não são guardados preços nem valores.

## Publicar no repositório carla-pagamentos

1. Coloca **o conteúdo desta pasta** na raiz do repositório, incluindo a pasta oculta `.github`. A estrutura deve ficar como o exemplo abaixo. No Finder, `⌘ ⇧ .` mostra as pastas ocultas.
2. Guarda os ficheiros na branch `main`.
3. No GitHub, abre **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Em **Actions**, abre **Publicar Carla no GitHub Pages**. Se necessário, escolhe **Run workflow → main → Run workflow**.
5. Quando terminar com sucesso, o endereço aparece em **Settings → Pages**, habitualmente `https://TEU-UTILIZADOR.github.io/carla-pagamentos/`.

```
carla-pagamentos/
  .github/workflows/pages.yml
  site/
    index.html
    app.mjs
    model.mjs
    storage.mjs
    styles.css
    sw.js
    manifest.webmanifest
    icons/
  tests/model.test.mjs
  README.md
  VERIFICACAO.md
```

O workflow verifica as regras de pagamentos/cópias e publica apenas a pasta `site`. Não é preciso instalar pacotes nem compilar. Se a branch principal tiver outro nome, altera `branches: [main]` no workflow. Não coloques os ficheiros JSON das cópias no repositório.

Documentação oficial: [Publicação com GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Usar no iPhone

1. Abre o endereço publicado no **Safari**, com internet.
2. Toca em **Partilhar → Adicionar ao ecrã principal** e confirma.
3. Abre o ícone **Carla** no ecrã principal. Nas definições, confirma «Pronto para usar sem internet neste dispositivo».
4. Toca num aluno: passa de vermelho «Por pagar» a verde «Pago», ouve-se um som sintetizado de caixa registadora e aparece **O TEU MARIDO PEDRO É UM GÉNIO! 😂**.
5. Para anular, toca novamente e confirma. Podes desligar o som nas definições.
6. Usa as setas para mudar de mês. Cada mês tem os seus pagamentos; os meses anteriores mantêm-se guardados. Um novo mês começa por pagar, sem apagar o anterior.

Os estados vermelho/verde também incluem texto, para não depender só da cor. A lista permite pesquisa e filtros. Nomes podem ser editados, acrescentados e arquivados nas definições.

## Dados e cópias de segurança

- Os pagamentos e as alterações aos alunos ficam em **IndexedDB neste dispositivo e neste endereço**. Não são enviados para o GitHub ou para qualquer servidor.
- Os nomes iniciais fazem parte dos ficheiros da aplicação e são visíveis a quem aceder ao código. Não são publicados pagamentos reais nem cópias de segurança.
- Cada alteração guarda atomicamente o novo estado e a versão anterior. Mantêm-se as **últimas 30 versões locais**, recuperáveis nas definições. São versões por alteração, não cópias diárias.
- Em **Definições → Guardar cópia de segurança**, exporta um ficheiro JSON com todos os alunos, meses, pagamentos e preferências. No iPhone, usa a folha de partilha para **Guardar em Ficheiros**, escolhendo **iCloud Drive** se quiseres uma cópia fora do telefone. O sistema pode apresentar opções diferentes conforme o navegador.
- Confirma sempre que o ficheiro ficou guardado. A aplicação regista a preparação/partilha da exportação; não consegue verificar o destino escolhido. Lembra-te de exportar pelo menos semanalmente e depois de alterações importantes.
- **Importar uma cópia** valida o ficheiro e pede confirmação antes de substituir o estado. Guarda automaticamente a versão anterior. A recuperação de versões locais também pede confirmação.
- Não há cópias automáticas para iCloud, nem sincronização entre dispositivos. Uma cópia exportada permite migrar para outro iPhone ou endereço.
- Limpar os dados do Safari, remover dados do site, mudar de domínio/utilizador GitHub ou perder o telefone pode eliminar ou tornar inacessíveis os dados locais. As versões locais partilham esse risco. Por isso, a exportação para Ficheiros/iCloud Drive é essencial.
- A aplicação pede armazenamento persistente quando suportado; a decisão pertence ao navegador. [Política de armazenamento do WebKit](https://webkit.org/blog/14403/updates-to-storage-policy/).
- O modo sem internet só fica disponível depois da primeira abertura com ligação. As cópias exportadas não são encriptadas pela aplicação; guarda-as num local privado.

## Atualizações

Altera os ficheiros, incrementa o nome `CACHE` em `site/sw.js` (por exemplo, `v1` para `v2`) e guarda na branch `main`. Depois da publicação, abre a aplicação com internet. Quando houver uma versão à espera, aparece **Atualizar aplicação** nas definições. A atualização dos ficheiros não apaga IndexedDB nem as cópias locais. Exporta uma cópia antes de atualizar.

## Verificação local

Com Node.js 22 ou superior:

```
node --test tests/*.test.mjs
```

Para pré-visualizar com Python 3:

```
python3 -m http.server 8765 --directory site
```

Abre `http://localhost:8765/`. Não abras `index.html` diretamente: IndexedDB e o modo sem internet devem ser usados através de HTTP local ou HTTPS publicado. A pré-visualização local tem dados separados dos dados do endereço GitHub Pages.
