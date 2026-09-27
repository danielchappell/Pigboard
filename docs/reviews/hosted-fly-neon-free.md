# D3 Fly + Neon Free design review

27 September 2026. This is independent **design** evidence for the
[selected Free design](../designs/hosted-fly-neon-free.md), not a deployment,
delivery-plan, committed-code or live-acceptance verdict. The prior
[Launch design review](hosted-fly-neon-launch.md) remains historical for its
exact artifact. The owner chose a dedicated Pigboard Neon Free project with its
short measured restore history and kept the separately approved 90-day
minimal post-terminal metadata lifetime.

## First round — NOT CLEAN

Selected-design SHA-256:
`ff4c320b0a42b5ceebaa073755a80d724468f5399532b3ad1a87e4dc82481de3`.
Neither reviewer edited files or provisioned resources.

| Reviewer | Coverage and second sweep | Finding and verdict |
| --- | --- | --- |
| Product/experience | 10/10 agreed requirements, 9/9 requested artifact/context files and 6/6 contract groups; second sweep traced capture, recovery and the five-Story sequence. | **P2, in scope; NOT CLEAN.** The design required class-specific audience, retention and deletion before capture, but scheduled the decision only with S29–S31. S26 can store provider output, S05 copied source/requests/credentials, and S06 publication evidence before then. |
| Technical/security | 10/10 requirement groups, 7/7 requested files and 4/4 contracts; second sweep covered the Free-specific design lines, quota math, root pin, effect admission and recovery. | **CLEAN for this draft.** No separate unresolved technical finding; live limits and grants remain unverified. |

Both reviewers independently assessed the seven principles. Product review:
Intuitive—ordinary actions stay familiar; Discoverable—human setup and agent
errors are specified; Delightful—shared inspection avoids laptop setup but
wake/quarantine are visible; Token saver—bounded status identifies omissions;
Secure—the late data-policy gate is a concrete gap; Agents are equal—scoped
noninteractive paths exist; Dependable—short history and quota failures are
honest, but capture could precede policy. Technical review: Intuitive—normal
actions and quarantine are distinct; Discoverable—setup and blocked reasons
are staged; Delightful—sleep and control-read delays are disclosed; Token
saver—bounded inspection preserves uncertainty; Secure—org/SQL/root/control
grants and fence are staged; Agents are equal—scoped commands and recovery
CLI are noninteractive; Dependable—failed transactions and uncertain effects
do not repeat blindly. The author accepted the product finding as real and
in scope.

## Second round — CLEAN for the exact selected design

Both fresh Sol reviewers independently examined SHA-256
`24c9b461146ab1ebe209623759326ad09edfaabe07fd4b86ac85e1c0d2b89ccb`.
The design now puts each data-class policy before the Story that first stores
it, with a move-earlier rule and separate 90-day minimal S04 metadata policy.
The active queue, D3 Task and affected Story criteria reflect those gates.
Neither reviewer edited files or provisioned resources.

| Reviewer | Coverage and second sweep | Independent seven-principle assessment | Verdict |
| --- | --- | --- | --- |
| Product/experience | 14/14 agreed requirements, 66/66 selected-design lines, 9/9 relevant files and 4/4 inherited contract groups; second sweep traced first capture in S04/S26/S05/S06 through S29–S31, A1, Free quota and wake behavior. | Intuitive: human actions stay familiar and agent scopes remain explicit. Discoverable: human prerequisites and structured agent blocked states are named. Delightful: useful early Stories do not wait for later restore controls, and sleep is disclosed. Token saver: bounded results identify omissions. Secure: class policies precede capture and historical grants cannot become current authority. Agents are equal: scoped noninteractive commands and recovery observation are specified. Dependable: quota failure and uncertain sends close effects; the short restore claim remains a live gate. | **CLEAN** |
| Technical/security | 66/66 selected-design lines, 7/7 supporting files, 13/13 requirement groups and 5/5 authority/interface contracts; second sweep followed S04→S26→S05→S06→S08→S29–S31→A1, authority changes, credentials and first capture. | Intuitive: normal human actions and scoped agent commands remain. Discoverable: setup, recovery and agent outage/omission states are explicit. Delightful: sleeping DB saves cost while bounded wake/control failures are visible. Token saver: relevant status comes first without hiding uncertainty. Secure: dedicated org/SQL, root pin, live authority, read-only manifest and provider fence are distinct; live grants remain open. Agents are equal: noninteractive inspection/recovery with role checks. Dependable: no blind resend, quota/manifest failures close effects, and recovery is limited to measured within-project history. | **CLEAN** |

This review does not establish a Pigboard Neon organization or project,
actual SQL isolation, Free quota headroom, a configured restore window, or a
working restore drill. Those are staged D3/S08/S29–S31/A1 checks. The changed
delivery plan requires its own independent review.
