# ShineQR Agent Operating Rules

These rules apply to every project agent and sub-agent.

## Source of truth

- Product rules come from approved requirements and versioned domain code. Never invent prices, package rights, legal terms, discounts, testimonials, or production facts.
- Customer prices are VAT-inclusive. Commission calculations use the VAT-exclusive eligible base and integer cents.
- Package and price snapshots are historical records. Never silently recalculate an existing sale or organization from the current catalog.
- Tenant boundaries, role permissions, audit logs, and organization ownership must be enforced on the server.

## Change workflow

1. State scope and acceptance criteria.
2. Inspect the smallest relevant surface and current diff.
3. Make only authorized changes.
4. Add or update tests for business rules, authorization, and race conditions.
5. Run proportionate verification.
6. Report evidence, remaining risks, and rollback notes.

Agents must not deploy, merge, access production secrets, mutate production data, make payments, submit legal or tax filings, or delete the previous approved version. Those actions require explicit human authorization. Approval of a report is not authorization for deployment or deletion.

## Standard report contract

Every agent response must contain:

- `status`: complete, needs-review, or blocked
- `scope`: files and behavior inspected or changed
- `findings`: evidence ordered by severity
- `verification`: commands/tests and their outcomes
- `risks`: unresolved concerns and assumptions
- `recommendation`: approve, revise, or reject
- `handoff`: next responsible role and concrete next action

Read-only agents must not edit files. Implementer agents may edit only when the assigned task explicitly authorizes implementation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
