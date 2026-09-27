-- Run only as pigboard_owner in the dedicated Pigboard production branch.
-- Setup fails if a previous fixture remains; inspect and clean it up first.
BEGIN;
CREATE TABLE public.pigboard_runtime_role_probe (
  id bigint PRIMARY KEY,
  marker text NOT NULL
);
REVOKE ALL ON TABLE public.pigboard_runtime_role_probe FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO pigboard_app;
GRANT SELECT, INSERT ON TABLE public.pigboard_runtime_role_probe TO pigboard_app;
COMMIT;

-- Cleanup after recording the live preflight result, run separately as owner:
-- DROP TABLE public.pigboard_runtime_role_probe;
