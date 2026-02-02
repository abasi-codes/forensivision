-- This file is executed when the PostgreSQL container starts
-- It runs the initial migration

\i /docker-entrypoint-initdb.d/migrations/001_initial_schema.sql
