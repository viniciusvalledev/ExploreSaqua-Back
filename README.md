O Backend do Projeto ExploreSaqua é uma API robusta desenvolvida para gerenciar o ecossistema de pontos turísticos e estabelecimentos comerciais de Saquarema. O sistema permite o cadastro de locais, gerenciamento de avaliações, fluxo de aprovação administrativa e geolocalização, servindo como a espinha dorsal do portal ExploreSaqua.

🚀 Tecnologias e Ferramentas
O projeto foi construído utilizando uma stack moderna e escalável:

Runtime: Node.js

Linguagem: TypeScript para tipagem estática e maior segurança de código

Framework Web: Express.js (v5.1.0)

ORM: Sequelize para modelagem e persistência de dados

Banco de Dados: MySQL

Processamento de Imagens: Sharp para compressão e otimização dinâmica

Segurança: Autenticação via JSON Web Token (JWT) e criptografia de senhas com BcryptJS

Upload de Arquivos: Multer para gerenciamento de multipart/form-data

🏗️ Arquitetura do Sistema
A aplicação segue o padrão de camadas (MVC/Service Pattern), garantindo separação de responsabilidades:

Entities (Models): Definição do esquema de dados utilizando Sequelize, incluindo validações de e-mail e tipos enumerados para controle de status (ex: PENDENTE_APROVACAO, ATIVO, REJEITADO).

Controllers: Responsáveis por interceptar as requisições HTTP e retornar as respostas ao cliente.

Services: Camada de lógica de negócio centralizada para manter os controllers enxutos e facilitar testes unitários.

Middlewares: Processamento de fluxos transversais como autenticação JWT, controle de permissões de administrador e compressão automática de imagens antes do armazenamento.

📋 Funcionalidades Principais
Gestão de Locais: CRUD completo de estabelecimentos com suporte a múltiplas imagens, logotipos e documentos obrigatórios (Alvará de Funcionamento e Vigilância Sanitária).

Fluxo de Aprovação: Sistema de status onde novos cadastros ou atualizações passam por revisão administrativa antes de serem publicados.

Geolocalização: Suporte a coordenadas de latitude e longitude para integração com mapas.

Sistema de Avaliações: Endpoints para que usuários avaliem e comentem sobre os locais listados.

Métricas: Registro e controle de visualizações por identificador único.

🔧 Configuração e Instalação
Pré-requisitos
Node.js instalado

Instância de banco de dados MySQL

Instalação
Clone o repositório: git clone https://github.com/viniciusvalledev/ExploreSaqua-Back.git

Instale as dependências: npm install

Configure as variáveis de ambiente no arquivo .env (baseado no database.ts):

DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT

Scripts Disponíveis
Desenvolvimento: npm run dev (utiliza ts-node-dev com auto-reload)

Build: npm run build (compila TypeScript para JavaScript)

Produção: npm start

🛡️ Segurança e Performance
Limitação de Payload: O servidor está configurado para aceitar requisições de até 50mb, permitindo o upload de imagens de alta resolução que são posteriormente otimizadas.

Static Assets: As imagens e documentos são servidos via /uploads de forma otimizada através de middleware estático do Express.

CORS: Configurado para permitir integrações seguras com o frontend.
