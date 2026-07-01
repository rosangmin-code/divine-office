# Pre-merge static-analysis gate for the divineoffice repo.
#
# `pair-cowork merge-worktree` runs `make check-all-lints` before merging a
# worktree branch into the trunk. This file provides that target so the merge
# gate has a real rule to invoke (previously: "No rule to make target
# 'check-all-lints'", which blocked every cross-GOAL merge). It aggregates the
# repo's static gates and exits 0 only when every sub-check passes; any
# regression returns non-zero and blocks the merge.
#
# ESLint is scoped to the source trees (src e2e scripts) on purpose. A bare
# `eslint` from the repo root walks the Next.js build output under .next/ and
# — critically for cowork — the sibling worktree checkouts under
# .claude/worktrees/*/, each of which carries its own src/ copy and .next/
# bundle. The flat config only ignores the root-level .next/, so the nested
# worktree artifacts are linted too, which is slow enough to time the gate
# out. Scoping to the first-party source dirs keeps the gate fast
# (~25s total here) and deterministic, and the flat config's own ignores
# (scripts/**/*.js, public/**) still apply within the scoped paths.

.PHONY: check-all-lints lint typecheck traceability phrase-coverage hymn-phrase-merge

# Aggregate gate invoked by the pre-merge hook. Fail-fast: the first failing
# sub-check stops the run and propagates its non-zero exit status.
#
# NFR-009m INTEGRATION NOTE: `hymn-phrase-merge` is intentionally NOT yet a
# dependency of check-all-lints. The guard is currently RED by design — it
# flags the X.897 orphan (hymn 21, "Их Эзэнийг") to prove detection works,
# and goes green only once GOAL #4's X.897 fix (dvo-sol, WI #18) merges and
# the orphan disappears. Adding it here now would red the shared pre-merge
# gate and deadlock every worktree merge — including the X.897 fix itself.
# The leader appends `hymn-phrase-merge` to the recipe below AT INTEGRATION,
# after WI #18 lands on trunk. Until then, run it standalone:
#   make hymn-phrase-merge   (or)   npm run verify:hymn-phrase-merge
check-all-lints: lint typecheck traceability phrase-coverage
	@echo "check-all-lints: ALL GREEN"

# ESLint — scoped to first-party source (see header note).
lint:
	@echo "==> lint: eslint src e2e scripts"
	npm run lint -- src e2e scripts

# TypeScript — type-only check, no emit.
typecheck:
	@echo "==> typecheck: tsc --noEmit"
	npx tsc --noEmit

# Traceability matrix drift guard (@fr tag <-> docs/traceability-matrix.md).
traceability:
	@echo "==> traceability: npm run traceability:check"
	npm run traceability:check

# FR-161 phrase-coverage data integrity guard.
phrase-coverage:
	@echo "==> phrase-coverage: npm run verify:phrase-coverage:check"
	npm run verify:phrase-coverage:check

# NFR-009m hymn phrase-merge correctness guard (МАГТУУ orphan detection).
# Standalone until WI #18 (X.897 fix) merges — see check-all-lints note above.
hymn-phrase-merge:
	@echo "==> hymn-phrase-merge: npm run verify:hymn-phrase-merge"
	npm run verify:hymn-phrase-merge
