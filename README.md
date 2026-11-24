# ApoIA.Edu — Ferramentas de IA para a Educação Inclusiva

**Do planejamento à atividade em sala: um histórico pedagógico que acompanha o estudante.**

Protótipo da LumiNext Tech, desenvolvido por Elizabeth da Conceição Oliveira para apoiar professores e escolas no atendimento a estudantes da Educação Especial. Preparado para avaliação no Hack Brasil.

## O problema

Informações sobre o estudante frequentemente ficam distribuídas entre arquivos, formulários e registros de diferentes professores. Elaborar Estudo de Caso, PAEE, PEI e atividades em ferramentas separadas exige repetir informações e dificulta relacionar o planejamento àquilo que foi aplicado em sala.

Quando o estudante muda de escola, a falta de continuidade desse histórico pode levar a novas entrevistas e reconstrução de documentos. O ApoIA busca reduzir esse retrabalho e preservar o contexto pedagógico para a equipe que dará continuidade ao atendimento.

## A solução

Um ambiente que conecta **perfil do estudante → Estudo de Caso → PAEE → PEI → atividades e planos de aula → registros de aplicação → acompanhamento e revisão**.

A escola organiza estudantes, professores e permissões. O professor consulta as informações às quais tem acesso, elabora materiais, revisa as sugestões e registra o que ocorreu na aplicação. A IA apoia o trabalho; a decisão pedagógica permanece com o educador.

## Diferenciais presentes no código

| Diferencial | Como aparece no projeto | Valor para a escola |
| --- | --- | --- |
| Planejamento conectado à prática | Atividades podem referenciar o objetivo do PEI e os apoios do PAEE | Permite relacionar uma atividade ao planejamento individual |
| Continuidade entre escolas | Fluxo de solicitação, código de transferência, aprovação ou recusa; transferência de documentos, atividades e registros | Evita reconstruir o histórico a cada mudança de escola |
| Acompanhamento com evidências | Registros de participação, alcance do objetivo, nível de apoio, recurso utilizado e próximo passo | Permite analisar a aplicação e orientar o próximo planejamento |
| Personalização além do diagnóstico | Perfil com potencialidades, interesses, comunicação, barreiras e estratégias que funcionam | Apoia decisões baseadas nas características do estudante |
| Aproveitamento de modelos da escola | Importação e processamento de DOCX, XLSX e PDF; preenchimento de modelos editáveis nos fluxos compatíveis | Reduz a transcrição manual e favorece continuidade documental |
| Revisão humana e histórico de versões | Minutas, identificação de fontes, pendências e estado de revisão | Mantém a equipe responsável pela validação do conteúdo |
| Colaboração com permissões | Perfis Escola e Professor, vínculos com estudantes e revogação de acesso | Organiza a atuação de diferentes profissionais |
| Demonstração sem cadastro | Cenários fictícios com documentos, atividades e uma transferência recebida | A banca pode explorar a ideia sem cadastrar dados reais |

A preservação de formatação depende do modelo importado; não se promete compatibilidade perfeita com qualquer documento. O histórico permanente depende da infraestrutura de armazenamento e de backups, não apenas da interface.

## Demonstração para a banca

Na publicação Vercel, clique em **Experimentar demonstração** e selecione **Perfil Escola** ou **Perfil Professor(a)**. Não são necessárias credenciais.

**A publicação é exclusiva para avaliação, com dados fictícios e temporários.** Contas reais, rotas administrativas e chamadas externas de IA estão desativadas. As alterações ficam na memória da instância do servidor e podem ser reiniciadas quando ela reinicia, muda de instância, expira a sessão ou atinge seu limite. Não há promessa de persistência ou de sincronização entre instâncias nesta versão.

A geração demonstrativa usa exemplos e processamento estruturado local. A integração Gemini existe no código, mas **não está ativa na demonstração publicada**. Não confundir exemplos locais com resultados de uma chamada de IA ao vivo.

### Roteiro sugerido de 3 minutos

1. **0:00–0:30 — Problema e perfil:** entre como Escola, abra um estudante fictício e mostre potencialidades, interesses e barreiras.
2. **0:30–1:15 — Planejamento integrado:** consulte Estudo de Caso, PAEE e PEI disponíveis; mostre a relação de uma atividade com o objetivo pedagógico.
3. **1:15–2:00 — Aplicação e acompanhamento:** explore atividades, exporte um DOCX e consulte os registros de participação e apoio.
4. **2:00–2:40 — Continuidade escolar:** na gestão da escola, consulte a transferência recebida com código **TRF-DEMO2026**; confirme a inclusão. A estudante fictícia Beatriz passa a constar com o histórico encaminhado.
5. **2:40–3:00 — Colaboração:** alterne para Professor(a), mostrando que a visualização depende dos vínculos atribuídos.

Os controles podem estar distribuídos entre as abas do estudante e a gestão da escola. Para recomeçar, encerre a demonstração e abra uma nova sessão.

### Exemplo pedagógico

**Situação:** trabalhar Ciências com uma estudante em alfabetização inicial, interessada em animais e que se beneficia de apoio visual.

- Selecione o perfil fictício de Sofia.
- Na área de atividades, indique Ciências e o tema Animais; selecione alfabetização inicial e os apoios pertinentes.
- Gere um exemplo, revise o conteúdo e exporte o material quando a opção estiver disponível.
- Registre participação, alcance do objetivo, nível de apoio e próximo passo.

**Resultado esperado:** visualizar o ciclo completo entre perfil, atividade e registro de aplicação. Os exemplos devem ser revisados antes de qualquer uso pedagógico real.

## Como executar localmente

### Pré-requisitos

- **Node.js 24.x** e npm.
- Git, para clonar o repositório. Por ser privado, é necessário acesso autorizado.
- Para a versão local completa: diretório gravável para SQLite, uploads e documentos gerados.
- Chave Gemini apenas se desejar testar chamadas externas de IA. Nunca coloque a chave no frontend ou no GitHub.

```bash
git clone https://github.com/ElizabethCOliveira/apoia-edu.git
cd apoia-edu
npm ci
```

Copie `.env.example` para `.env`:

```bash
# Linux/macOS
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

As dependências nativas de SQLite podem exigir ferramentas de compilação se não houver binário pré-compilado para seu sistema.

### Iniciar em desenvolvimento

```bash
npm run dev
```

Abra **http://localhost:3000** e clique em **Experimentar demonstração**. A demonstração não exige configurar Gemini nem criar administradora.

### Compilar e iniciar em produção local

```bash
npm run lint
npm run build
npm start
```

`npm run preview` serve somente o frontend; ele não substitui o servidor completo e não oferece as rotas `/api`.

### Configurações opcionais da versão local

| Variável | Finalidade |
| --- | --- |
| `GEMINI_API_KEY` | Habilita a integração externa quando o fluxo e as permissões também a autorizam |
| `APP_URL` | Endereço da aplicação para links internos |
| `PORT` | Porta do servidor; padrão 3000 |
| `STORAGE_ROOT` | Diretório de SQLite e arquivos; padrão `storage` |
| `LUMINEXT_ADMIN_EMAIL` | E-mail da primeira administradora |
| `LUMINEXT_ADMIN_PASSWORD` | Senha inicial forte, configurada somente no ambiente do servidor |
| `LUMINEXT_ADMIN_NAME` | Nome da administradora |
| `VITE_PUBLIC_DEMO` | `true` para mostrar o aviso de demonstração e desativar o envio do formulário de login/cadastro na interface |

Para testar contas locais, configure as três variáveis `LUMINEXT_ADMIN_*` e execute `npm run admin:init`. Não use credenciais de exemplo em produção. A criação de usuários e liberação de acesso ficam na administração. A recuperação automática de senha por e-mail ainda precisa ser implementada; o retorno de códigos de teste fica bloqueado em produção.

## Publicação na Vercel

- Frontend React/Vite em `dist`.
- Função Express em `api/index.ts`, encaminhada pelas regras de `vercel.json`.
- A função da publicação permite apenas demonstração e modelos de exemplo; as rotas de contas reais são bloqueadas no servidor, independentemente da interface.
- Arquivos auxiliares usam `/tmp` e são temporários. O banco e os documentos enviados no ZIP original **não integram o repositório nem o deploy**.
- O build deve receber `VITE_PUBLIC_DEMO=true`.
- O acesso externo pode exigir login da Vercel enquanto a proteção do projeto estiver ativa.

**Para uso permanente em escolas:** migrar ou hospedar o banco em infraestrutura persistente, configurar armazenamento privado de arquivos, backups, recuperação de conta, limites de uso e validação de segurança e acessibilidade. Não utilizar esta demonstração como arquivo oficial de estudantes.

## Tecnologias e organização

React 19, TypeScript, Vite, Tailwind CSS, Node.js, Express, SQLite (`better-sqlite3`), integração Google Gemini, DOCX, ExcelJS e bibliotecas de extração de documentos.

| Caminho | Responsabilidade |
| --- | --- |
| `src/App.tsx` e `src/components/` | Interface e fluxos pedagógicos |
| `server/routes.ts` | API do protótipo |
| `server/aiEngine.ts` | Geração de conteúdos e integração com IA |
| `server/docEngine.ts` | Extração, modelos e exportação |
| `server/auth.ts` e `server/db.ts` | Autenticação, permissões e banco |
| `server/demo.ts` | Cenários fictícios e sessões de demonstração |
| `server.ts` | Servidor local completo |
| `api/index.ts` | Entrada restrita à demonstração para a Vercel |

## Estágio e limites

Protótipo funcional em validação. Foram implementados os fluxos descritos acima, mas sua existência no código não constitui validação pedagógica, certificação de segurança ou garantia de conformidade legal. A versão publicada usa exemplos fictícios; o uso real exige validação pela equipe e infraestrutura apropriada.

**Impacto esperado:** reduzir tarefas repetitivas, facilitar materiais acessíveis e manter a continuidade do planejamento e acompanhamento. Não foram atribuídos percentuais de economia ou resultados de aprendizagem ainda não medidos nesta plataforma.

**Autoria:** Elizabeth da Conceição Oliveira · LumiNext Tech.
