# Fichamentos STF — PGE/AL

Aplicação estática para estudar fichamentos de julgados do STF publicados nos Informativos,
organizados por disciplina e ano, com fila de estudo, marcação, tags e exportação em PDF.

Site: `https://<seu-usuario>.github.io/<nome-do-repo>/`

## O que tem aqui

| | |
|---|---|
| `index.html`, `app.js`, `estilo.css` | a aplicação inteira, sem framework e sem backend |
| `dados/indice.json` | índice carregado na abertura — alimenta filtros e busca |
| `dados/f/<id>.json` | uma ficha por julgado, carregada sob demanda |
| `LEIAME.md` | manual de uso |

Base: Informativos 1102 a 1226 do STF, julgamentos de julho de 2023 em diante.
Fonte: API pública de jurisprudência do STF (`jurisprudencia.stf.jus.br`).

## Privacidade

O que você marca, etiqueta e anota fica no `localStorage` do seu navegador e **nunca sai do
aparelho** — não há servidor, não há conta, não há telemetria. Por isso o botão *Backup*
existe: é a única forma de levar seu estudo de um aparelho para outro, e de não perder tudo
se você limpar os dados de navegação.
