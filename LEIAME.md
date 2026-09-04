# Fichamentos STF — PGE/AL

Aplicação estática. Sem framework, sem backend, sem instalação.

## Como abrir

**Duplo clique no `abrir.bat`.** Ele sobe um servidor local e abre o navegador.

Não adianta abrir o `index.html` com duplo clique: o navegador bloqueia a leitura da pasta
`dados/` quando a página vem de `file://`, e a aplicação não carrega. Precisa do servidor —
é o que o `.bat` faz. Requer Python 3 no Windows.

## Os arquivos

| | |
|---|---|
| `index.html`, `app.js`, `estilo.css` | a aplicação inteira |
| `dados/indice.json` | 660 KB, carregado na abertura: é o que alimenta filtros e busca |
| `dados/f/<id>.json` | uma ficha por julgado, 703 arquivos, carregados sob demanda |

## O que dá para fazer

**Filtrar** por disciplina, ano, faixa de informativo, situação (estudado ou não), tag,
relator, repercussão geral e busca livre. Os filtros se combinam. O botão *só com fichamento*
começa ligado — desligue para ver também os julgados que ainda não foram fichados, que aparecem
com o texto do Informativo.

**Estudar em fila.** Abrir qualquer julgado da lista já cria a fila com o resultado da busca:
o rodapé mostra *1 de 33* e os botões de navegação funcionam na hora, sem precisar clicar em
*Estudar* antes. São dois botões diferentes de propósito — **Próximo →** só avança, sem marcar
nada, para quando você está folheando; **Estudado ✓** marca e avança. **← Lista** volta ao
resultado com os filtros intactos; **Início** limpa a fila e volta ao começo. No computador,
setas ← → navegam e a tecla **E** marca; no celular, deslize para os lados. Clique em *Estudar*
para dar nome à fila e conseguir retomá-la depois.

**Marcar e etiquetar.** Cada ficha tem tags livres (com sugestão das que você já usou) e um
campo de anotação. O histórico registra cada vez que você estudou ou revisou.

**Conferir a fonte.** As abas *Fichamento · Informativo · Ementa* mostram o material bruto do
STF ao lado do fichamento. Nas citações, a cor da régua à esquerda diz a origem: azul para a
ementa, cinza para o informativo.

**Seguir precedentes.** No rodapé de cada ficha, os precedentes citados aparecem separados
entre os que estão na sua base (clicáveis, abrem a ficha) e os que ficaram de fora, para você
buscar no site do STF.

**Exportar em PDF.** O botão *Imprimir / PDF* abre antes uma tela de seleção com os julgados
da busca, todos marcados. Desmarque o que não quiser, ou use *Marcar todos* / *Desmarcar todos*,
e só então exporte — sai um documento contínuo, um julgado por página. No diálogo do navegador,
escolha *Salvar como PDF*. Acima de 60 selecionados ele avisa e leva os 60 primeiros.

Dentro de uma ficha, o botão **PDF desta ficha** exporta só aquele julgado, sem passar pela
seleção.

## Backup — leia isto

Suas marcações, tags, anotações, histórico e filas ficam no `localStorage` **deste navegador,
neste aparelho**. Não sobem para lugar nenhum. Isso quer dizer duas coisas:

- limpar dados de navegação apaga tudo, sem perguntar;
- o que você marca no computador não aparece sozinho no celular.

O botão **Backup** exporta um único arquivo JSON com tudo. Para levar de um aparelho a outro,
exporte num, mande para você mesma, importe no outro e escolha **Mesclar** — o histórico é
somado evento a evento, sem conflito. *Substituir* apaga o que estiver no aparelho de destino.

Exporte de vez em quando. O arquivo é pequeno, uns 100 a 300 KB no fim da preparação.

## Publicar para acessar do celular

Suba a pasta inteira num repositório do GitHub e ligue o GitHub Pages. São ~9 MB, bem abaixo
do limite. O repositório precisa ser público no plano gratuito — os fichamentos ficam visíveis
para quem tiver o link, mas **suas marcações não**, porque nunca saem do seu navegador.
