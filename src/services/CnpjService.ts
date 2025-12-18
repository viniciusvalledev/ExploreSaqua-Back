import axios from "axios";

interface BrasilApiData {
  municipio: string;
  uf: string;
  situacao_cadastral: string;
}

class CnpjService {
  // API Primária: BrasilAPI (Sem limites, mas lenta para novos CNPJs)
  private apiURL = "https://brasilapi.com.br/api/cnpj/v1/";

  // API Secundária: CNPJ.ws (3 consultas/minuto, mas muito rápida para novos cadastros)
  private fallbackURL = "https://publica.cnpj.ws/cnpj/";

  public async consultarCnpj(cnpj: string): Promise<BrasilApiData> {
    const cnpjLimpo = cnpj.replace(/\D/g, "");

    console.log(`[CnpjService] Iniciando consulta. CNPJ: "${cnpjLimpo}"`);

    try {
      // --- TENTATIVA 1: BRASIL API ---
      console.log("[CnpjService] Tentando BrasilAPI (Primária)...");
      const response = await axios.get<BrasilApiData>(
        `${this.apiURL}${cnpjLimpo}`
      );
      return response.data;
    } catch (error: any) {
      console.warn(`[CnpjService] Falha na BrasilAPI. Tentando CNPJ.ws...`);

      try {
        // --- TENTATIVA 2: CNPJ.ws (Fallback) ---
        const response = await axios.get(`${this.fallbackURL}${cnpjLimpo}`);
        const data = response.data;

        console.log(
          "[CnpjService] Sucesso no CNPJ.ws. Dados brutos:",
          JSON.stringify({
            razao: data.razao_social,
            simples: data.simples,
            porte: data.porte,
            natureza: data.natureza_juridica,
          })
        );

        let isMei = data.simples?.mei === "S" || data.simples?.optante === true;

        if (!isMei && data.simples === null) {
          const idNatureza = data.natureza_juridica?.id?.toString();
          const idPorte = data.porte?.id?.toString();

          if (idNatureza === "2135" && idPorte === "01") {
            console.warn(
              "[CnpjService] AVISO: Dados do Simples/MEI indisponíveis (null). Inferindo MEI por Natureza(2135) + Porte(01)."
            );
            isMei = true;
          }
        }

        const dadosMapeados: BrasilApiData = {
          municipio: data.estabelecimento?.cidade?.nome,
          uf: data.estabelecimento?.estado?.sigla,
          situacao_cadastral:
            data.estabelecimento?.situacao_cadastral?.toUpperCase() ||
            "DESCONHECIDA",
        };

        return dadosMapeados;
      } catch (fallbackError: any) {
        let mensagem = "Não foi possível validar este CNPJ. ";

        if (axios.isAxiosError(fallbackError)) {
          if (fallbackError.response?.status === 429) {
            mensagem += "Muitas consultas em pouco tempo. Aguarde 1 minuto.";
          } else if (fallbackError.response?.status === 404) {
            mensagem +=
              "CNPJ não encontrado em nenhuma base pública, pode haver um atraso de até 30 dias em novos registros.";
          } else {
            mensagem += "Erro de conexão com os serviços de validação.";
          }
        }

        console.error("[CnpjService] Erro fatal:", fallbackError.message);
        throw new Error(mensagem);
      }
    }
  }
}

export default new CnpjService();
