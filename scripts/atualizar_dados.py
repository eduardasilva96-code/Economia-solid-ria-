"""
Converte o Excel de respostas do Forms (forms/respostas.xlsx) em data/acoes.csv,
o arquivo que o painel lê.

O que este script faz com as respostas:
  - marca respostas de teste ("teste", "g", "t"...) e datas impossíveis (antes de 2024);
  - padroniza nomes dos agentes (maiúsculas/minúsculas), telefones, CEPs e territórios;
  - converte horários digitados à mão ("19:00hrs", "13hoo", "8h") em hora;
  - calcula turno, duração, ciclo, dia da semana e antecedência do agendamento.

Uso: python scripts/atualizar_dados.py forms/respostas.xlsx data/acoes.csv
"""
import csv
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict

import pandas as pd

# ---------------------------------------------------------------- ajustes
# Edite estas listas quando aparecer um caso novo.

# Grafias de território trocadas pelo nome padronizado.
DE_PARA_TERRITORIOS = {
    "Itapõa": "Itapoã",
    "Santa Luzia - Estrutural": "Estrutural",
}

# Instituições parceiras: chave em minúsculas, sem acento -> nome exibido.
DE_PARA_INSTITUICOES = {
    "fiocruz": "Fiocruz",
    "picaps": "Fiocruz/PICAPS",
    "casa nordestina": "Casa Nordestina",
}
# Instituições cujo texto começa assim viram "Coletivo local".
INSTITUICOES_COLETIVO_LOCAL = ("cabana",)

# Respostas de teste: nome do agente igual a uma destas palavras (sem acento, minúsculas).
NOMES_DE_TESTE = {"teste", "test", "tees", "testt", "testee"}
# Textos de instituição que indicam teste (letras soltas digitadas).
INSTITUICOES_DE_TESTE = {"klkwdh", "jkhc"}

# Registros a excluir à mão: um ID do Forms por linha em forms/excluir.txt.
ARQUIVO_EXCLUIR = os.path.join(os.path.dirname(__file__), "..", "forms", "excluir.txt")

PRIMEIRO_ANO = 2024
DDD_PADRAO = "61"

# ---------------------------------------------------------------- utilitários
DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
MINUSCULAS = {"da", "de", "do", "das", "dos", "e"}


def sem_acento(s):
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s).strip()


def limpa(s):
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return ""
    s = str(s).replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


def nome_bonito(s):
    palavras = limpa(s).lower().split(" ")
    return " ".join(p if (p in MINUSCULAS and i > 0) else p[:1].upper() + p[1:] for i, p in enumerate(palavras))


def hora(s):
    s = limpa(s).lower()
    m = re.match(r"^(\d{1,2})\s*(?:[:h]\s*(\d{0,2}))?", s)
    if not m:
        return None
    h = int(m.group(1))
    mi = int(m.group(2)) if m.group(2) and m.group(2).isdigit() else 0
    if h > 23 or mi > 59:
        return None
    return h + mi / 60


def telefone(s):
    d = re.sub(r"\D", "", limpa(s))
    if d.startswith("55") and len(d) in (12, 13):
        d = d[2:]
    if len(d) == 11:
        return f"({d[:2]}) {d[2:7]}-{d[7:]}"
    if len(d) == 10:
        return f"({d[:2]}) {d[2:6]}-{d[6:]}"
    if len(d) == 9:
        return f"({DDD_PADRAO}) {d[:5]}-{d[5:]}"
    if len(d) == 8:
        return f"({DDD_PADRAO}) {d[:4]}-{d[4:]}"
    return limpa(s)


def cep(s):
    d = re.sub(r"\D", "", limpa(s))
    return f"{d[:5]}-{d[5:]}" if len(d) == 8 else limpa(s)


def instituicao(s):
    s = limpa(s)
    if not s:
        return ""
    k = sem_acento(s)
    if k in DE_PARA_INSTITUICOES:
        return DE_PARA_INSTITUICOES[k]
    if k.startswith(INSTITUICOES_COLETIVO_LOCAL):
        return "Coletivo local"
    return s


def coluna(df, *palavras):
    """Acha a coluna do Forms cujo título contém todas as palavras (sem acento)."""
    for c in df.columns:
        t = sem_acento(c)
        if all(p in t for p in palavras):
            return c
    raise SystemExit(f"Coluna não encontrada no Excel: {' + '.join(palavras)}. Colunas: {list(df.columns)}")


def ciclo(ano):
    return "2024–25" if ano in (2024, 2025) else str(ano)


# ---------------------------------------------------------------- principal
def main(entrada, saida):
    df = pd.read_excel(entrada)
    c_id = next((c for c in df.columns if sem_acento(c) == "id"), df.columns[0])
    c_envio = coluna(df, "hora de inicio")
    c_nome = coluna(df, "nome e sobrenome")
    c_contato = coluna(df, "contato")
    c_data = coluna(df, "data")
    c_ini = coluna(df, "horario de inicio")
    c_fim = coluna(df, "horario previsto")
    c_terr = coluna(df, "territorio")
    c_local = coluna(df, "nome do local")
    c_cep = coluna(df, "cep")
    c_end = coluna(df, "endereco")
    c_parc = coluna(df, "houve alguma")
    c_inst = coluna(df, "qual instituicao")

    excluir = set()
    if os.path.exists(ARQUIVO_EXCLUIR):
        with open(ARQUIVO_EXCLUIR, encoding="utf-8") as f:
            excluir = {l.strip() for l in f if l.strip() and not l.startswith("#")}

    df = df.sort_values(c_envio)
    envio = pd.to_datetime(df[c_envio], errors="coerce")
    data = pd.to_datetime(df[c_data], errors="coerce", dayfirst=True)

    # nome exibido de cada agente: a grafia mais usada
    contagem = defaultdict(Counter)
    for n in df[c_nome]:
        if limpa(n):
            contagem[sem_acento(n)][nome_bonito(n)] += 1
    nome_exibido = {k: c.most_common(1)[0][0] for k, c in contagem.items()}

    linhas = []
    for i, r in df.iterrows():
        nome_k = sem_acento(r[c_nome])
        teste = (
            nome_k in NOMES_DE_TESTE
            or len(nome_k) <= 2
            or "teste" in nome_k
            or sem_acento(r[c_inst]) in INSTITUICOES_DE_TESTE
            or len(limpa(r[c_local])) == 1
            or sem_acento(r[c_local]) == "teste"
            or str(r[c_id]) in excluir
        )
        d = data[i]
        data_ok = pd.notna(d) and d.year >= PRIMEIRO_ANO
        status = "Teste" if teste else ("Válido" if data_ok else "Data inválida")

        hi, hf = hora(r[c_ini]), hora(r[c_fim])
        if hi is not None and hf is not None and hf < hi and hf + 12 > hi:
            hf += 12
        dur = round(hf - hi, 2) if hi is not None and hf is not None else None
        turno = "" if hi is None else ("Manhã" if hi < 12 else ("Tarde" if hi < 18 else "Noite"))
        livre = not (re.match(r"^\d{1,2}:\d{2}$", limpa(r[c_ini])) and re.match(r"^\d{1,2}:\d{2}$", limpa(r[c_fim])))

        terr_inf = limpa(r[c_terr])
        terr = DE_PARA_TERRITORIOS.get(terr_inf, terr_inf)
        parceria = limpa(r[c_parc]) or "Campo não existia"

        linhas.append({
            "registro": r[c_id],
            "enviado_em": envio[i].strftime("%Y-%m-%d") if pd.notna(envio[i]) else "",
            "data_atividade": d.strftime("%Y-%m-%d") if pd.notna(d) else "",
            "mes": d.strftime("%Y-%m") if pd.notna(d) else "",
            "ciclo": ciclo(d.year) if data_ok else "",
            "dia_semana": DIAS[d.dayofweek] if pd.notna(d) else "",
            "territorio_informado": str(r[c_terr]) if pd.notna(r[c_terr]) else "",
            "territorio": terr,
            "turno": turno,
            "hora_inicio": round(hi, 2) if hi is not None else "",
            "duracao_h": dur if dur is not None else "",
            "parceria": parceria,
            "instituicao": instituicao(r[c_inst]) if not teste else "",
            "pesquisador": "" if teste else nome_exibido.get(nome_k, ""),
            "status": status,
            "horario_texto_livre": "Sim" if livre else "Não",
            "antecedencia_dias": (d.normalize() - envio[i].normalize()).days if pd.notna(d) and pd.notna(envio[i]) else "",
            "contato": "" if teste else telefone(r[c_contato]),
            "local": "" if teste else limpa(r[c_local]),
            "endereco": "" if teste else limpa(r[c_end]),
            "cep": "" if teste else cep(r[c_cep]),
        })

    with open(saida, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0].keys()))
        w.writeheader()
        w.writerows(linhas)

    st = Counter(l["status"] for l in linhas)
    print(f"{len(linhas)} respostas -> {st['Válido']} válidas, {st['Teste']} testes, {st['Data inválida']} datas inválidas")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "forms/respostas.xlsx",
         sys.argv[2] if len(sys.argv) > 2 else "data/acoes.csv")
