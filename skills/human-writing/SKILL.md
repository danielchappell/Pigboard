---
name: human-writing
description: Write or rewrite product documents, technical designs, RFCs, decision records, discovery notes, and PR descriptions in concise, natural language. Use when readers need simple sentences, plain words, and useful formatting.
metadata:
  source: Daniel Chappell
---

# Human Writing

Write the shortest document that lets the reader understand, decide, or act. Be ruthless about unnecessary content. Use simple sentences, everyday words, and useful bullets so a reader with ordinary reading skills and limited technical knowledge can follow it on the first read.

## Set the purpose

Identify the audience and the specific question, decision, or action the document serves. Unless a specialist audience is specified, assume limited technical knowledge.

Lead with the answer or decision. Follow requested depth and required formats, but keep each part concise.

## Cut aggressively

- Include a detail only if removing it would obscure the main point, lead to a wrong decision, or leave the reader unable to act correctly.
- State each point once. Remove background, history, examples, and qualifications that do not pass that test.
- Keep the main answer visible. Do not add sections just because the topic could support them.
- Do not restate the answer in an introduction, summary, and conclusion. End when the reader has what they need.
- For a broad topic, select the points that serve the requested purpose rather than covering everything you know.

Preserve accuracy and necessary limits in the fewest clear words. Cut whole low-value points before shortening sentences; never use jargon or dense sentences to save space.

## Write plainly

- Use short, complete sentences with one main idea each.
- Prefer familiar words, concrete nouns, and direct verbs. Rewrite difficult source wording instead of copying it.
- Avoid jargon. If a technical term is necessary, explain it in plain words when it first appears.
- Keep exact names for fields, APIs, products, and other things the reader must identify accurately.
- Keep each paragraph focused and connect related sentences naturally.
- Use a calm, conversational voice. Avoid slogans, empty praise, dramatic fragments, canned transitions, and forced contrasts such as “It is not just X. It is Y.”

## Make formatting useful

- Use bullets for related points that are easier to scan as a list.
- Use numbered steps when order matters.
- Use paragraphs for explanations that need connected reasoning.
- Add headings or tables only when they make the content easier to use. Keep lists short and use bold sparingly.

## Preserve meaning and voice

When editing, do not change facts, decisions, scope, or commitments. Preserve the writer's voice and point of view. Write in the user's perspective when asked. Do not invent details or restore deliberately removed content.

Keep facts distinct from assumptions, proposals, and unknowns when the difference affects the conclusion. State relevant source conflicts instead of silently resolving them.

Include technical detail only when requested or essential to the reader's task. Explain the main point directly; use supporting links for detail the reader need not read to understand it.

## Required fresh-reader review

For a new or substantially rewritten Story, product document, technical design, RFC, decision record or discovery report, review the complete draft with an independent reader before presenting it as ready. Include technical criteria, tables, examples and appendices, not only the opening. A small correction does not require a new full review unless it changes meaning or exposes a wider comprehension problem.

### Give the reader no project history

Use a fresh agent with no inherited conversation. Give it only the exact draft and the intended audience and purpose. Do not supply the author's explanation, expected interpretation, previous reviews or suspected defects. For a document that must stand alone, have it read that document alone; if a reading prerequisite is intentional, name it explicitly in the document and review that reading path.

Match the reader to the real audience. No project context does not mean no technical knowledge, and a developer's ability to reconstruct the design does not prove that a manager can understand the writing. If independent review is unavailable, report the check as incomplete rather than call self-review independent.

### Require evidence of understanding

The reader must cover every section and report:

- In its own words, what the reader can understand, decide or do. For a Story, what exists before and after, what this slice delivers, what comes later and why the prerequisite work is needed.
- Each undefined term, unexplained relationship, purpose or responsibility, missing transition and sentence that required guessing. Quote or locate the exact wording.
- What the draft explicitly says versus what the reader inferred from technical familiarity. List the inferred meanings even when they seem likely correct.
- Any place where it cannot explain why a field, component or step exists, or whether behavior already exists or is being added.
- Which sections it examined, with an examined/total count, and any parts it could not assess.

“I understand it,” a polished paraphrase, or a CLEAN verdict without that evidence is insufficient. Do not lead the reader toward agreement or treat absence of criticism as proof of clarity.

### Evaluate findings and revise

Read the actual feedback; do not rely on its headline verdict. Check every inference and question against the text and the audience's expected knowledge. If correct understanding requires unstated project facts or guessing, fix the explanation. If the reader misunderstood, find the wording that allowed that interpretation. If a finding is invalid, record the exact text that already resolves it and why the intended audience can understand it.

Preserve the full meaning and technical requirements. Add the shortest useful definition, relationship, example or reason; split unrelated ideas when needed. Do not hide confusion by deleting required contracts, adding jargon, or expanding product scope. If the answer requires an unresolved product decision or unavailable evidence, expose that specific gap rather than invent an explanation.

After changing a draft to address a reader's unclear meaning, missing context or incorrect interpretation, a different fresh agent must read the complete revised draft. Give that agent no inherited conversation, old draft or earlier feedback. Never reuse a reader from an earlier round: it now has context the intended reader will not have. This is mandatory for PR Stories as well as other substantial drafts. Making the requested fixes alone does not complete the check.

Keep the loop focused on comprehension. Classify every finding as a material understanding gap, an optional writing preference, a technical question requiring separate evidence, or a request outside the agreed scope. Fix material gaps with the shortest useful explanation. Do not add background merely to satisfy a reader's curiosity, duplicate whole linked contracts, or adopt new requirements. Record why rejected findings do not prevent the intended reader from understanding and acting. Before another pass, cut repetition introduced by the fixes.

Finish when a fresh reader has covered the whole current draft and no material comprehension gaps remain after author evaluation. A preference or scope request alone does not require another round. If successive rounds revisit the same point without improving understanding, inspect the underlying source or ask the precise missing question rather than keep expanding the text. Do not declare a pass to meet an iteration limit. Review remains incomplete while a real gap is unresolved.

Record the reviewed version, audience, coverage, findings and how they were addressed in the existing working notes. State review limits honestly: comprehension review does not establish technical correctness, product approval or implementation readiness. If the owner still finds a passage confusing, reopen it even when a reviewer passed it; the owner's difficulty is new evidence about the intended audience.

## Check before delivering

Make a final cutting pass. Delete every sentence or list item that adds no necessary information. Then check that the reader can understand and act without jargon, missing essential context, or changed meaning.

