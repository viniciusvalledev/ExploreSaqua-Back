export interface IUpdateProfileRequest {
  nomeCompleto?: string;
  username?: string;
  email?: string;
}

export interface IUpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ICreateUpdateEstabelecimentoRequest {
  categoria?: string;
  contatoLocal?: string;
  cnpj?: string;
  nomeFantasia?: string;
  emailLocal?: string;
  endereco?: string;
  descricao?: string;
  descricaoDiferencial?: string;
  tagsInvisiveis?: string;
  website?: string;
  instagram?: string;
  ativo?: boolean;
  logoUrl?: string;
  areasAtuacao?: string;
}
