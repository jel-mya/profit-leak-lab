# Action review download format

New downloads identify themselves as `profitleaklab-action-review`, schema version 1. Earlier downloads have no schema version; do not assume they contain reporting history or the current review target.

The top-level review context includes currency, as-of date, target margin, export timestamp and demo/private-session mode. `exportedAt` is the device's UTC timestamp, not a trusted server audit timestamp. Mode distinguishes fictional demonstration data from a private session; it does not certify data accuracy.

`actions` retains the tracked records and original source context. Source investigation amounts use integer minor currency units, not whole dollars. `importHistory` describes applied source reporting periods by section and version; it contains metadata, not raw imported rows. A tracked action's original review date and target may differ from the current top-level settings.

The file records user-entered notes and statuses. Neither a closed action nor a source record disappearing establishes recovery. Downloads remain local and can contain private financial details; never commit them or treat them as anonymised. No restore/import parser for these action downloads is implemented.

Optional `actions[].recovery` holds a user-reported recovery amount in minor units, currency, date and evidence. It is independent of source investigation amounts and action status. Session edits replace the entry; this field is not an immutable audit trail and is not independently verified. Zero with an explanation may correct a mistaken claim. No automatic recovery total or currency conversion is supplied.
