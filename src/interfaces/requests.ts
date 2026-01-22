import { StatusLocal } from "../entities/Local.entity";

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
  localId?: number;
  categoria?: string;
  contatoLocal?: string;
  nomeLocal?: string;
  endereco?: string;
  descricao?: string;
  tagsInvisiveis?: string;
  instagram?: string;
  ativo?: boolean;
  status?: StatusLocal;
  dados_atualizacao?: object | null;
  nomeResponsavel?: string;
  cpfResponsavel?: string;
  areasAtuacao?: string;
  latitude?: number;
  longitude?: number;
}
