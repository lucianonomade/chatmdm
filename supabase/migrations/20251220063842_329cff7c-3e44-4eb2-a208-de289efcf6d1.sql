-- Adicionar coluna trial_started_at na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN trial_started_at timestamp with time zone DEFAULT now();

-- Adicionar coluna trial_expired para marcar quando o trial está expirado
ALTER TABLE public.profiles 
ADD COLUMN trial_expired boolean DEFAULT false;

-- Atualizar usuários existentes com a data atual
UPDATE public.profiles SET trial_started_at = now() WHERE trial_started_at IS NULL;