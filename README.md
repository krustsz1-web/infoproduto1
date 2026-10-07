# Mãe com Direito

Portal de triagem e atendimento para salário-maternidade.

## O que já está funcionando

- Landing page e triagem
- Cadastro e login com Supabase Auth
- Área autenticada da cliente
- Atendimento individual por caso
- Checklist de documentos
- Upload de PDF, JPG e PNG em storage privado
- Chat persistente com atualização em tempo real
- Painel administrativo
- Alteração de status e histórico
- Notificações internas no banco
- Solicitação de encerramento da conta
- RLS para restringir dados e documentos
- Aviso para nunca solicitar senha do gov.br

## Primeiro acesso administrativo

1. Cadastre a conta que será usada pelo advogado normalmente pela tela "Criar conta".
2. Depois que a conta existir, promova o usuário na tabela `user_roles` do banco, usando o UUID do usuário:

```sql
insert into public.user_roles (user_id, role)
values ('UUID_DO_USUARIO', 'admin');
```

A aplicação reconhece os papéis `admin` e `lawyer` como acesso ao painel.

## Banco e segurança

O projeto utiliza Supabase Auth, PostgreSQL e Storage privado. As tabelas de atendimento usam Row Level Security. Os arquivos são armazenados no bucket privado `case-documents` e acessados por URLs assinadas temporárias.

O sistema não foi criado para armazenar senha do gov.br.

## Publicação

O repositório está ligado ao Vercel. Cada alteração na branch `main` gera uma nova publicação.
