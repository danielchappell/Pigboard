CREATE TABLE public.pigboard_schema_migrations (
  version integer PRIMARY KEY,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  catalog_checksum text NOT NULL CHECK (catalog_checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pigboard_team_authority (
  team_key text PRIMARY KEY CHECK (team_key = 'pilot'),
  generation bigint NOT NULL DEFAULT 0 CHECK (generation >= 0)
);

CREATE TABLE public.pigboard_principals (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  kind text NOT NULL CHECK (kind IN ('human', 'agent')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pigboard_credentials (
  id uuid PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES public.pigboard_principals(id),
  digest_version text NOT NULL CHECK (digest_version = 'sha256-v1'),
  digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
  issued_generation bigint NOT NULL CHECK (issued_generation > 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pigboard_grants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES public.pigboard_principals(id),
  role text NOT NULL CHECK (role IN ('owner', 'connection_admin')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (principal_id, role)
);

CREATE UNIQUE INDEX pigboard_one_active_owner
  ON public.pigboard_grants (role) WHERE role = 'owner' AND active;

CREATE TABLE public.pigboard_authority_events (
  generation bigint PRIMARY KEY CHECK (generation > 0),
  event_type text NOT NULL CHECK (event_type IN ('owner_bootstrapped', 'owner_recovered')),
  principal_id uuid NOT NULL REFERENCES public.pigboard_principals(id),
  previous_principal_id uuid REFERENCES public.pigboard_principals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.pigboard_team_authority (team_key, generation) VALUES ('pilot', 0);
