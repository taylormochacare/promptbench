-- Align grants with the immutability contract (Greptile P1 on PR #12).
-- #1 granted blanket select/insert/update/delete; that contradicts
-- "prompt_versions are immutable" and "prompt_runs are written once".
--
-- What stays writable is exactly what the design says is mutable:
--   prompt_versions.message  — commit messages are backfillable (§6.4)
--   prompt_runs.starred/is_best — footer actions; is_best flips via the
--     invoker-rights set_best_run(), which needs the column grant
-- INSERT stays on both: commit_prompt_version() and the run writer are
-- security invoker, so the caller's own privileges do the work.
-- FK cascades (page deletion) are referential actions and don't consult
-- these grants — deleting a page still removes its versions and runs.

revoke update, delete on prompt_versions from authenticated;
grant update (message) on prompt_versions to authenticated;

revoke update, delete on prompt_runs from authenticated;
grant update (starred, is_best) on prompt_runs to authenticated;
