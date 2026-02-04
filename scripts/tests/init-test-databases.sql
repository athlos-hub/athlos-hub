-- Script de inicialização dos databases de teste
-- Este script é executado automaticamente quando o container PostgreSQL inicia

-- Cria os databases para cada serviço
CREATE DATABASE auth_test;
CREATE DATABASE competitions_test;
CREATE DATABASE notifications_test;
CREATE DATABASE livestream_test;

-- Concede privilégios ao usuário postgres
GRANT ALL PRIVILEGES ON DATABASE auth_test TO postgres;
GRANT ALL PRIVILEGES ON DATABASE competitions_test TO postgres;
GRANT ALL PRIVILEGES ON DATABASE notifications_test TO postgres;
GRANT ALL PRIVILEGES ON DATABASE livestream_test TO postgres;

\echo 'Databases de teste criados com sucesso!'
