REVOKE ALL ON public.pigboard_team_authority,
  public.pigboard_principals,
  public.pigboard_credentials,
  public.pigboard_grants,
  public.pigboard_authority_events,
  public.pigboard_schema_migrations
  FROM pigboard_app;

GRANT USAGE ON SCHEMA public TO pigboard_app;

GRANT SELECT (team_key, generation)
  ON public.pigboard_team_authority TO pigboard_app;
GRANT SELECT (id, name, kind)
  ON public.pigboard_principals TO pigboard_app;
GRANT SELECT (principal_id, digest_version, digest, issued_generation, active)
  ON public.pigboard_credentials TO pigboard_app;
GRANT SELECT (principal_id, role, active)
  ON public.pigboard_grants TO pigboard_app;
