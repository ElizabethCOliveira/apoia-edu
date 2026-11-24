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

Acesse: https://apoia-edu.vercel.app

Na publicação Vercel, clique em **Experimentar demonstração** e selecione **Perfil Escola** ou **Perfil Professor(a)**. Não são necessárias credenciais.

**A publicação é exclusiva para avaliação, com dados fictícios e temporários.** 
### Exemplo pedagógico

**Situação:** trabalhar Ciências com uma estudante em alfabetização inicial, interessada em animais e que se beneficia de apoio visual.

- Selecione o perfil fictício de Sofia.
- Na área de atividades, indique Ciências e o tema Animais; selecione alfabetização inicial e os apoios pertinentes.
- Gere um exemplo, revise o conteúdo e exporte o material quando a opção estiver disponível.
- Registre participação, alcance do objetivo, nível de apoio e próximo passo.

**Resultado esperado:** visualizar o ciclo completo entre perfil, atividade e registro de aplicação. Os exemplos devem ser revisados antes de qualquer uso pedagógico real.

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

**Autoria:** Elizabeth da Conceição Oliveira, Nycollas Reydan Alves Peixoto, Jessica Lima de Carvalho Pastor
