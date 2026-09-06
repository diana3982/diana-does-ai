# Tests

```bash
pip install -r requirements.txt -r requirements-dev.txt
cd backend && pytest              # free, offline, deterministic
```

The ordinary suite never calls the Anthropic API. `fake_model` (see
`conftest.py`) stands in for the client and dispatches on model name the way
the real code does -- haiku gets JSON back, opus gets prose -- so the
endpoint tests exercise the full Flask path without spending anything.

`isolated_data` is **autouse**: every test is pointed at a temp directory
before it runs, so nothing here can read or write a real `character.json` or
`quirks.json`. That protection applies to tests written later by someone who
never read this file, which is the point of making it autouse rather than a
fixture you remember to request.

## Live tests

```bash
cd backend && COLUMBA_LIVE=1 pytest tests/test_live.py
```

Skipped unless you ask for them. They cover the one thing a fake client
cannot: that the prompts we send still come back in the shape we parse. The
bug where extraction silently returned nothing for a whole build -- the model
fencing its JSON in ```` ```json ```` -- lived exactly there.

`MAX_CALLS` in that file is **enforced by a wrapper around the client**, not
just documented. An accidental loop spends real money, so the counter fails
the run rather than trusting the tests to behave.
