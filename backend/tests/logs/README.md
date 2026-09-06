# Run logs

A markdown summary is written here after every `pytest` run: what ran, how it
came out, and anything worth a second look. The intent is to be able to check
a past result without re-running anything.

The logs themselves are gitignored -- they are a record of *your* runs on
*your* machine, and they would otherwise churn on every commit. This README
is the only tracked file in the directory.

Naming: `YYYY-MM-DD_HHMMSS.md`, with `_live` appended for runs that made real
API calls. Delete them freely; the next run makes another.
