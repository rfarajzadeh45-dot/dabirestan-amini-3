CREATE SCHEMA IF NOT EXISTS backup_20261114;
REVOKE ALL ON SCHEMA backup_20261114 FROM PUBLIC, anon, authenticated;
CREATE TABLE backup_20261114.students AS SELECT * FROM public.students;
CREATE TABLE backup_20261114.attendance AS SELECT * FROM public.attendance;
CREATE TABLE backup_20261114.grades AS SELECT * FROM public.grades;
CREATE TABLE backup_20261114.notes AS SELECT * FROM public.notes;
CREATE TABLE backup_20261114.classes AS SELECT * FROM public.classes;