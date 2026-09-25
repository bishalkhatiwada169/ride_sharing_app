-- PostGIS location support (run against PostGIS-enabled Postgres, e.g. postgis/postgis Docker image)
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE driver_profiles
    ADD COLUMN IF NOT EXISTS current_location geography(Point, 4326);

CREATE INDEX IF NOT EXISTS ix_driver_location ON driver_profiles USING GIST (current_location);
