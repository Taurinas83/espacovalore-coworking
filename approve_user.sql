-- Script para aprovar seu próprio usuário
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, vamos ver o status atual do seu perfil:
SELECT id, email, full_name, is_approved, is_admin 
FROM profiles 
WHERE email = 'tiagotaurian@gmail.com';

-- 2. Aprovar o usuário e torná-lo admin
UPDATE profiles 
SET is_approved = true, 
    is_admin = true 
WHERE email = 'tiagotaurian@gmail.com';

-- 3. Verificar que foi atualizado:
SELECT id, email, full_name, is_approved, is_admin 
FROM profiles 
WHERE email = 'tiagotaurian@gmail.com';
