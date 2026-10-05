ALTER TABLE public.pigboard_authority_events
  DROP CONSTRAINT pigboard_authority_events_event_type_check;
ALTER TABLE public.pigboard_authority_events
  ADD CONSTRAINT pigboard_authority_events_event_type_check
  CHECK (event_type IN ('owner_bootstrapped', 'owner_recovered',
    'agent_enrolled', 'agent_revoked'));

CREATE UNIQUE INDEX pigboard_credential_digest_permanent
  ON public.pigboard_credentials (digest_version, digest);
