# Diálogos sobre Economia Solidária (DES) – Painel

Painel público dos Agentes Populares de Economia Solidária: agendamento de encontros, indicadores e mapeamento de territórios no Distrito Federal.

Projeto ligado ao PICAPS, ao Radar de Territórios e ao CoLaboratório CTIS (Fiocruz Brasília).

## Páginas

- **Início**: atalhos para as outras páginas.
- **Agendamento de encontros**: calendário, próximo encontro e a lista de encontros com local, endereço, agente e contato.
- **Dashboard de indicadores**: agentes, qualificadas, inscritas, multiplicados e instituições parceiras.
- **Mapeamento de territórios**: participantes, territórios, locais visitados, ODS e mapa esquemático do DF.
- **Sobre os dados**: de onde vêm os números e como foram tratados.

## Como atualizar os dados

Os dados ficam na pasta `data/`:

| Arquivo | Conteúdo |
|---|---|
| `acoes.csv` | Respostas do Forms de agendamento, já padronizadas |
| `indicadores.csv` | Agentes, qualificadas, inscritas, multiplicados, participantes e locais visitados |
| `territorios.csv` | Posição aproximada de cada território no mapa |

Para atualizar, substitua o arquivo e faça um novo commit. O site muda sozinho em alguns minutos.

Em `acoes.csv`, a coluna `status` define o que entra no painel: só as linhas com `Válido` aparecem.

## Privacidade

Nomes, telefones e endereços aparecem com autorização dos agentes, para consulta pública do território. Este repositório é público: qualquer pessoa pode baixar os arquivos da pasta `data/`.

## Técnica

Site estático (HTML, CSS e JavaScript), sem servidor. Os gráficos usam [D3](https://d3js.org) (licença em `vendor/d3-LICENSE`).
