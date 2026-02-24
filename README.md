📍 ExploreSaqua - Backend
API REST robusta desenvolvida para o portal ExploreSaqua, responsável por centralizar o gerenciamento de pontos turísticos, comércios e serviços de Saquarema. O sistema conta com fluxos de aprovação administrativa, geolocalização e processamento inteligente de mídia.

🛠️ Tecnologias Principais
 - Core: Node.js com TypeScript para desenvolvimento orientado a tipos.

 - Framework: Express.js para roteamento e middlewares.

 - Banco de Dados: MySQL gerenciado via ORM Sequelize.

 - Manipulação de Imagem: Sharp para compressão automática de uploads.

 - Segurança: Autenticação JWT e criptografia BcryptJS.

🚀 Funcionalidades
 - Gestão de Estabelecimentos: Cadastro detalhado incluindo categorias, contatos e geolocalização.

 - Fluxo de Aprovação: Status dinâmicos para novos locais (PENDENTE_APROVACAO, ATIVO, REJEITADO).

 - Sistema de Upload: Gerenciamento de documentos obrigatórios como Alvará de Funcionamento e Vigilância Sanitária via Multer.

 - Otimização de Mídia: Middleware para compressão automática de fotos enviadas pelos usuários.

 - Métricas: Registro de visualizações por estabelecimento.

📂 Estrutura de Pastas
  Plaintext
   src/
     ├── config/      # Configuração de banco de dados (Sequelize) 
     ├── controllers/ # Lógica de controle das requisições
     ├── entities/    # Modelagem de dados e esquemas
     ├── middlewares/ # Filtros de segurança e processamento
     ├── routes/      # Definição dos endpoints da API
     └── services/    # Camada de regras de negócio
⚙️ Instalação e Execução
Clone o projeto:

Bash
  git clone https://github.com/viniciusvalledev/ExploreSaqua-Back.git
  Instale as dependências:

  Bash
  npm install
  Configure o .env:
  Crie um arquivo .env na raiz seguindo os parâmetros definidos em src/config/database.ts:

Snippet de código
  DB_NAME=nome_do_banco
  DB_USER=seu_usuario
  DB_PASSWORD=sua_senha
  DB_HOST=localhost
Inicie em modo de desenvolvimento:

Bash
  npm run dev


⚠️ Licença e Direitos Autorais
ESTE É UM SOFTWARE PROPRIETÁRIO.

Todo o conteúdo deste repositório, incluindo código-fonte, documentação e ativos, é protegido por leis de direitos autorais.

Uso Proibido: Não é permitida a cópia, modificação, distribuição ou sublicenciamento deste código para qualquer finalidade sem autorização prévia e expressa do detentor dos direitos.

Todos os direitos reservados.
