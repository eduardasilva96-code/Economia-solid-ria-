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

A planilha do painel é gerada automaticamente a partir do Excel do Forms:

1. No Forms, abra **Respostas → Abrir no Excel** (ou baixe as respostas) e salve o arquivo como `respostas.xlsx`.
2. Aqui no GitHub, entre na pasta `forms/`, clique em **Add file → Upload files**, envie o `respostas.xlsx` (substituindo o anterior) e clique em **Commit changes**.
3. A automação **Atualizar dados do painel** (aba **Actions**) roda sozinha. Ela padroniza as respostas, grava `data/acoes.csv` e o site atualiza em alguns minutos.

O que a automação faz com as respostas:

- tira do painel as respostas de teste (nome ou local com “teste”, letras soltas) e as datas anteriores a 2024;
- padroniza nomes dos agentes, telefones, CEPs e nomes de território (ex.: “Itapõa” → “Itapoã”);
- converte horários digitados à mão (“19:00hrs”, “13hoo”, “8h”) e calcula turno, duração e ciclo.

Para esconder uma resposta que o filtro não pegou, coloque o ID dela (coluna “ID” do Excel) em `forms/excluir.txt`, um por linha. As regras de padronização ficam no começo de `scripts/atualizar_dados.py`.

Outros arquivos da pasta `data/`:

| Arquivo | Conteúdo | Como atualizar |
|---|---|---|
| `acoes.csv` | Encontros, já padronizados | Automático (não edite à mão) |
| `indicadores.csv` | Agentes, qualificadas, inscritas, multiplicados, participantes e locais visitados | Edite os números direto no arquivo |
| `territorios.csv` | Posição aproximada de cada território no mapa e lado do rótulo | Inclua uma linha para cada território novo |

## Privacidade

Nomes, telefones e endereços aparecem com autorização dos agentes, para consulta pública do território. Este repositório é público: qualquer pessoa pode baixar os arquivos da pasta `data/`.

## Técnica

Site estático (HTML, CSS e JavaScript), sem servidor. Os gráficos usam [D3](https://d3js.org) (licença em `vendor/d3-LICENSE`).
