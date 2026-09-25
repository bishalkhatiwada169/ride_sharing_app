-- Align currency columns with Hibernate VARCHAR mapping
ALTER TABLE fare_rules ALTER COLUMN currency TYPE VARCHAR(3);
ALTER TABLE fare_quotes ALTER COLUMN currency TYPE VARCHAR(3);
