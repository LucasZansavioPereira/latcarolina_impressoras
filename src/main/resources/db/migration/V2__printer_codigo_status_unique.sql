-- Remove the old single-column unique constraint on CODIGO if it exists.
-- H2 exposes it as a constraint, not as a standalone index.
ALTER TABLE PRINTERS DROP CONSTRAINT IF EXISTS UKDTAGT763ULUWKV08CIDT7BUJ5;
ALTER TABLE PRINTERS DROP CONSTRAINT IF EXISTS UKDTAGT763ULUWKV08CIDT7BUJ5_INDEX_3;
ALTER TABLE PRINTERS DROP CONSTRAINT IF EXISTS UK_PRINTERS_CODIGO;

-- Create the new composite unique constraint on (codigo, status).
ALTER TABLE PRINTERS ADD CONSTRAINT uk_printers_codigo_status UNIQUE (codigo, status);
