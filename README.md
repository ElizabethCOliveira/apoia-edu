# ApoIA.Edu — Ferramentas de IA para a Educação Inclusiva

**Do planejamento à atividade em sala: um histórico pedagógico que acompanha o estudante.**

Protótipo desenvolvido por Elizabeth da Conceição Oliveira, Nycollas Reydan Alves Peixoto e Jessica Lima de Carvalho Pastor, para apoiar professores e escolas no atendimento a estudantes da Educação Especial. Preparado para avaliação no Hack Brasil.

## O problema

A inclusão escolar exige que os professores elaborem atividades acessíveis, planejamentos individualizados, avaliações e documentos pedagógicos, como o Estudo de Caso, o Plano Educacional Individualizado (PEI) e o Plano de Atendimento Educacional Especializado (PAEE).

Entretanto, esses processos demandam tempo, conhecimento especializado e organização de informações que, muitas vezes, permanecem dispersas em documentos impressos, planilhas, pastas digitais e diferentes sistemas.

Imagine um professor que atua em dez turmas e possui três estudantes da Educação Especial em cada uma delas. São 30 estudantes com diferentes potencialidades, interesses, barreiras de aprendizagem e necessidades de apoio, que podem demandar estratégias e atividades personalizadas.

Além da sobrecarga docente, existem outros desafios:

Fragmentação das informações: documentos, atividades, avaliações e registros pedagógicos armazenados em diferentes locais.

Desconexão entre planejamento e prática: objetivos estabelecidos no PEI e apoios previstos no PAEE nem sempre estão diretamente relacionados às atividades realizadas em sala de aula.

Dificuldade de personalização: atividades elaboradas com base apenas no diagnóstico, sem considerar as características individuais do estudante.

Limitações no acompanhamento da aprendizagem: ausência de registros estruturados sobre participação, alcance dos objetivos, recursos utilizados e níveis de apoio.

Retrabalho documental: preenchimento manual e repetitivo de informações em diferentes documentos pedagógicos.

Descontinuidade entre escolas: quando um estudante muda de instituição, seu histórico pedagógico nem sempre acompanha a transferência, levando a nova equipe a repetir entrevistas, observações, avaliações e processos de elaboração documental.

Dificuldade de colaboração: ausência de um ambiente integrado que permita aos profissionais compartilhar informações e acompanhar o estudante, respeitando suas responsabilidades e permissões de acesso.

Esses desafios comprometem o tempo disponível para o trabalho pedagógico, dificultam a continuidade das estratégias de ensino e podem prejudicar a qualidade da inclusão escolar.

Portanto, o problema não está apenas na produção de materiais acessíveis, mas na ausência de uma gestão pedagógica integrada, capaz de conectar o planejamento, a prática em sala de aula, o acompanhamento da aprendizagem e a continuidade do histórico do estudante ao longo de sua trajetória escolar.

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

# Guia de Demonstração — ApoIA.Edu
## Ferramentas de Inteligência Artificial para a Educação Inclusiva

Seja bem-vindo à demonstração do ApoIA.Edu!

Mais do que uma ferramenta de geração de atividades e documentos com inteligência artificial, o ApoIA é uma plataforma integrada de gestão pedagógica para a Educação Especial, que conecta professores, escolas, planejamento individualizado e acompanhamento da aprendizagem.

Este guia apresenta um roteiro para explorar as funcionalidades e os principais diferenciais da solução.

**Tempo estimado de exploração: 15 a 20 minutos.**

---

## 1. Acesse a demonstração — sem necessidade de cadastro

**Link de acesso:** https://apoia-edu.vercel.app/

1. Acesse a plataforma pelo link acima.
2. Entre no ambiente de demonstração.
3. Explore o painel inicial e as funcionalidades disponíveis.
4. Conheça os cenários fictícios previamente cadastrados.

O ambiente demonstrativo disponibiliza estudantes, documentos, atividades, registros pedagógicos e uma solicitação de transferência escolar.

**Diferencial demonstrado:** acesso simplificado para experimentação da plataforma, sem necessidade de cadastro ou utilização de dados reais de estudantes.

---

## 2. Conheça o perfil pedagógico do estudante

**Diferencial: personalização além do diagnóstico**

1. Acesse a área de estudantes.
2. Selecione um dos estudantes fictícios cadastrados.
3. Explore as informações que compõem seu perfil pedagógico.
4. Observe como a plataforma considera:

- Potencialidades e habilidades;
- Interesses pessoais;
- Formas de comunicação;
- Barreiras de aprendizagem;
- Necessidades de apoio;
- Recursos de acessibilidade;
- Estratégias pedagógicas que funcionam.

### Experimente

Compare dois perfis de estudantes e observe como suas características individuais podem orientar diferentes estratégias de ensino, mesmo quando apresentam o mesmo diagnóstico.

**Por que isso é importante?**

Estudantes com a mesma deficiência podem apresentar necessidades, interesses e habilidades diferentes. O ApoIA considera a individualidade de cada estudante para apoiar decisões pedagógicas mais adequadas.

---

## 3. Explore a documentação pedagógica

**Diferencial: centralização e integração do planejamento**

Selecione um estudante fictício e acesse seus documentos pedagógicos.

### Estudo de Caso

Observe a organização das informações relacionadas ao histórico, às potencialidades, às barreiras de aprendizagem e às necessidades educacionais do estudante.

### PAEE — Plano de Atendimento Educacional Especializado

Explore os recursos, apoios, estratégias de acessibilidade e objetivos do atendimento especializado.

### PEI — Plano Educacional Individualizado

Identifique os objetivos de aprendizagem, as estratégias pedagógicas e as metas individualizadas.

### Plano de Aula

Explore a elaboração de um planejamento que considere o conteúdo curricular e as necessidades de participação do estudante.

**Por que isso é importante?**

Os documentos deixam de ser arquivos isolados e passam a integrar um ambiente de planejamento pedagógico centrado no estudante.

---

## 4. Aproveite os modelos de documentos da escola

**Diferencial: aproveitamento de modelos institucionais**

Sabemos que diferentes redes de ensino e instituições podem utilizar modelos próprios de documentação pedagógica.

1. Acesse a funcionalidade de importação de documentos.
2. Selecione um arquivo fictício nos formatos DOCX, XLSX ou PDF.
3. Explore o processamento das informações pela plataforma.
4. Observe como os dados podem ser aproveitados nos fluxos de elaboração documental.
5. Nos formatos e fluxos compatíveis, experimente o preenchimento de modelos editáveis.

### Experimente

Utilize um modelo de PEI ou PAEE sem dados pessoais e verifique como suas informações podem ser aproveitadas pela plataforma.

**Por que isso é importante?**

A escola não precisa necessariamente abandonar seus modelos de trabalho. O ApoIA busca aproveitar os documentos existentes, reduzir a transcrição manual e facilitar a organização das informações pedagógicas.

---

## 5. Gere uma atividade conectada ao planejamento

**Diferencial: planejamento conectado à prática**

Este é um dos principais diferenciais do ApoIA.

1. Selecione um estudante.
2. Consulte um objetivo de aprendizagem registrado no PEI.
3. Consulte os apoios e recursos previstos no PAEE.
4. Acesse a ferramenta de geração de atividades.
5. Informe o conteúdo curricular desejado.
6. Utilize as referências ao objetivo do PEI e aos apoios do PAEE.
7. Solicite a geração da atividade pela inteligência artificial.
8. Analise o resultado apresentado.

### Sugestão de teste

- **Componente curricular:** Ciências.
- **Conteúdo:** animais vertebrados.
- **Objetivo do PEI:** reconhecer e identificar animais por meio de imagens.
- **Apoios do PAEE:** comunicação visual, instruções curtas e mediação pedagógica.
- **Formato:** atividade impressa com apoio de imagens.

### O que a banca deve observar

A atividade pode ser relacionada ao planejamento individualizado do estudante, considerando tanto os objetivos de aprendizagem quanto os apoios necessários para sua participação.

**Por que isso é importante?**

O ApoIA conecta a documentação pedagógica à prática em sala de aula, evitando que o PEI e o PAEE sejam utilizados apenas como instrumentos burocráticos.

---

## 6. Registre evidências da aprendizagem

**Diferencial: acompanhamento pedagógico baseado em evidências**

Após a geração de uma atividade, simule sua aplicação em sala de aula.

1. Acesse a área de acompanhamento ou registros pedagógicos.
2. Selecione o estudante e a atividade correspondente.
3. Registre informações sobre sua participação.
4. Informe o alcance do objetivo de aprendizagem.
5. Indique o nível de apoio necessário.
6. Registre os recursos utilizados.
7. Defina o próximo passo pedagógico.

### Sugestão de registro

- **Participação:** participou da atividade proposta.
- **Alcance do objetivo:** identificou três dos cinco animais apresentados.
- **Nível de apoio:** mediação parcial.
- **Recurso utilizado:** cartões com imagens.
- **Próximo passo:** ampliar a identificação dos animais e introduzir atividades de classificação.

### O que a banca deve observar

O registro não se limita a uma nota ou descrição genérica. Ele permite documentar como o estudante participou, quais estratégias foram utilizadas e quais ações podem orientar o próximo planejamento.

**Por que isso é importante?**

O professor pode tomar decisões pedagógicas com base nas evidências observadas durante a aplicação das atividades.

O planejamento torna-se um processo contínuo:

**Planejar → Aplicar → Registrar → Avaliar → Replanejar.**

---

## 7. Explore a revisão humana e o histórico de versões

**Diferencial: inteligência artificial com supervisão profissional**

1. Acesse um documento pedagógico.
2. Observe seu estado de revisão.
3. Consulte as minutas, fontes identificadas e eventuais pendências.
4. Analise as informações geradas pela inteligência artificial.
5. Explore os recursos de edição e revisão.
6. Consulte o histórico de versões disponível.

### O que a banca deve observar

- Identificação de documentos em elaboração;
- Pendências que necessitam de atenção;
- Identificação das fontes utilizadas;
- Estado de revisão;
- Histórico de versões.

**Por que isso é importante?**

A inteligência artificial auxilia na elaboração dos documentos, mas a responsabilidade pela análise e validação permanece com os profissionais da educação.

O ApoIA foi pensado para apoiar o professor, e não para substituí-lo.

---

## 8. Simule a transferência de um estudante entre escolas

**Diferencial: continuidade do histórico pedagógico**

Este é um dos diferenciais centrais da plataforma.

Imagine que um estudante da Educação Especial seja transferido para outra instituição de ensino. Em muitos casos, a nova equipe precisa reconstruir seu histórico pedagógico, realizar novas observações e elaborar novamente documentos que já existiam.

O ApoIA propõe um fluxo organizado para a continuidade dessas informações.

### Experimente uma transferência recebida

1. Acesse o ambiente demonstrativo com perfil de Escola.
2. Localize a área de transferências.
3. Abra a solicitação de transferência fictícia previamente cadastrada.
4. Observe as informações da solicitação.
5. Conheça o funcionamento do código de transferência.
6. Explore as opções de aprovação ou recusa.
7. Simule a aprovação da solicitação.
8. Verifique os documentos, atividades e registros associados à transferência.

### O que pode acompanhar o estudante

- Perfil pedagógico;
- Estudo de Caso;
- PAEE;
- PEI;
- Atividades pedagógicas;
- Registros de aprendizagem;
- Histórico de acompanhamento.

### O que a banca deve observar

A transferência não envolve apenas o cadastro do estudante, mas também a possibilidade de continuidade de seu histórico pedagógico, mediante autorização e controle de acesso.

**Por que isso é importante?**

O estudante muda de escola, mas sua trajetória de aprendizagem não precisa começar do zero.

A proposta reduz o retrabalho das equipes escolares e favorece a continuidade das estratégias pedagógicas que já demonstraram resultados.

---

## 9. Explore a colaboração entre Escola e Professor

**Diferencial: colaboração com controle de permissões**

A plataforma foi pensada para atender diferentes profissionais envolvidos na Educação Especial, respeitando suas responsabilidades e permissões.

### Perfil Escola

Explore as funcionalidades relacionadas a:

- Gestão dos estudantes;
- Organização da documentação;
- Vínculos entre professores e estudantes;
- Solicitações de transferência;
- Gerenciamento e revogação de acessos.

### Perfil Professor

Explore as funcionalidades relacionadas a:

- Acesso aos estudantes vinculados;
- Elaboração de atividades acessíveis;
- Consulta e elaboração de documentos pedagógicos;
- Registros de aprendizagem;
- Planejamento e acompanhamento pedagógico.

### Experimente

Alterne entre os perfis demonstrativos de Escola e Professor e observe as diferenças de acesso e responsabilidades.

Explore também os recursos de vínculo com estudantes e revogação de acesso.

**Por que isso é importante?**

A inclusão escolar é um trabalho coletivo. O ApoIA organiza a colaboração entre os profissionais, considerando a necessidade de proteger as informações dos estudantes.

---

## 10. Conheça o ecossistema integrado ApoIA

Ao finalizar a demonstração, observe como as funcionalidades se relacionam ao longo da trajetória pedagógica:

1. Conhecer o estudante e suas necessidades individuais.
2. Elaborar ou aproveitar a documentação existente.
3. Definir objetivos e estratégias pedagógicas.
4. Gerar atividades conectadas ao planejamento.
5. Registrar evidências da aprendizagem.
6. Revisar e aperfeiçoar as estratégias utilizadas.
7. Compartilhar responsabilidades entre profissionais autorizados.
8. Promover a continuidade das informações entre instituições.

O diferencial do ApoIA está na integração dessas etapas em uma única plataforma.

Não se trata apenas de gerar atividades ou documentos com inteligência artificial, mas de conectar o planejamento à prática pedagógica e acompanhar a trajetória de aprendizagem do estudante.

---

## Considerações sobre a versão demonstrativa

Esta versão foi disponibilizada para avaliação do projeto no Hack Brasil.

- Utilize exclusivamente dados fictícios.
- Os registros realizados na demonstração podem ser temporários.
- Algumas funcionalidades podem depender da configuração e disponibilidade dos serviços de inteligência artificial.
- A persistência institucional dos dados deve contar com infraestrutura adequada de armazenamento, segurança e controle de acesso.
- Os conteúdos produzidos pela IA devem ser revisados e validados pelos profissionais da educação.

---

## Nosso propósito

Reduzir o trabalho burocrático dos professores, fortalecer o planejamento pedagógico individualizado e promover a continuidade da aprendizagem dos estudantes da Educação Especial.

**O estudante pode mudar de turma, de professor ou de escola. Sua história de aprendizagem não precisa recomeçar.**

**ApoIA.Edu — Tecnologia a serviço de uma educação verdadeiramente inclusiva.**


**Demonstração:** https://apoia-edu.vercel.app/


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
