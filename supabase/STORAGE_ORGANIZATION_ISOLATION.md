# TFIVE PRO — Storage por organização (proposta de rollout)

## Estado

Este material é uma preparação de implementação. O SQL em `storage_org_isolation_draft.sql` **não é uma migration ativa e não foi executado**. O Supabase é compartilhado pelo preview e pela produção; executar DDL nele afetaria ambos.

## Padrão de caminhos

- `organization-assets/{organization_uuid}/{filename}`
- `student-avatars/{organization_uuid}/{student_uuid}/{filename}`
- `assessment-photos/{organization_uuid}/{student_uuid}/{assessment_uuid}/{filename}`

O primeiro segmento é sempre o UUID da organização. IDs legados de aluno não podem ser usados como segundo segmento: é necessário resolver o UUID real da tabela `students`.

## Serviço adicionado

`src/services/organizationStorageService.ts` fornece:
- upload com validação de MIME e tamanho;
- caminhos com UUID da organização autenticada;
- referências persistíveis `storage://bucket/path`;
- URLs assinadas de curta duração;
- exclusão limitada à organização autenticada;
- conversão controlada de data URL legado para Blob.

O serviço ainda não está conectado aos formulários/repositórios existentes. Isso é intencional: os campos atuais armazenam data URLs e os componentes esperam URLs prontas. Ligar o upload antes de implementar resolução de referências assinadas e migração dos dados quebraria imagens existentes.

## Pré-requisitos antes de ativar o SQL

1. Inventariar todos os objetos atuais nos três buckets e exportar a lista de paths.
2. Confirmar o UUID de organização e, para fotos de alunos/avaliações, o UUID real do aluno e da avaliação.
3. Copiar objetos legados para os novos paths sem apagar os originais.
4. Atualizar os campos `students.photo_url`, `assessments.photos` e `assessments.original_image_url` (se existir) para armazenar referências `storage://...`.
5. Implementar resolução de referências para URLs assinadas em todos os componentes e relatórios/exportações.
6. Fazer backup e validar em projeto Supabase de staging isolado.
7. Somente depois, executar a migration em janela aprovada; não executar diretamente no Supabase compartilhado preview/produção sem autorização.

## Pontos de atenção

- `storage://` é um identificador interno, não uma URL navegável. O cliente deve obter URL assinada por meio do serviço.
- URLs assinadas expiram; nunca persistir a URL assinada no banco.
- Não usar `upsert: true` sem as permissões INSERT, SELECT e UPDATE necessárias. O serviço usa nomes únicos e `upsert: false`.
- A política de leitura de aluno pressupõe que `public.is_authorized_student(organization_id, student_id)` seja a fonte correta de autorização do modo aluno.
- O SQL é um rascunho para revisão, não uma instrução de execução. Revisar também o nome/assinatura das funções e as políticas efetivas no ambiente de destino.
