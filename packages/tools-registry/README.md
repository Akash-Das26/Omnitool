# @omnitool/tools-registry

Single source of tool metadata. `data/registry.seed.json` holds structural facts
(id, name, category, flags, accepts, produces, tier, phase). `description` is
intentionally empty: write Omnitool's own copy.

`src/index.ts` validates the seed with Valibot at import time and derives
`TOOLS`, `CATEGORIES`, lookup and search helpers. `produces` and some missing
`accepts` were added provisionally in P1 and need owner review.
