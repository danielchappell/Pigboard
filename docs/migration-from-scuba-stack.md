# Migration From Scuba Stack

The move from Scuba Stack to this project was an architectural restart.
The Pigboard rebrand retains the boundaries below.

## Kept

- Engineering-principle skills
- Adversarial review discipline
- Worker role vocabulary
- Root-cause repair posture
- Small, verifiable work-unit bias

## Removed From The Default Model

- Mandatory chief-of-staff operating mode
- Team-manager hierarchy
- Local-only `.scuba/` control plane
- Default wide subagent fan-out
- Claude-specific Agent Teams assumptions
- Installed enforcement hooks as the primary safety mechanism

## Replaced With

- Provider-neutral worker role cards
- Internet-hosted queue items as the handoff object
- Adapter contract for project-management tools
- Lease-based claiming
- Optional GitHub Projects provisioning

## Rule

If a Scuba Stack asset assumes one live window, local transcript recovery, or a
standing manager layer, it must be rewritten before it enters Pigboard's default
surface.

