# new-web

## Run the dua reader

This is a dependency-free, browser-based preview. From the repository root:

```bash
python3 -m http.server 5173 --bind 0.0.0.0
```

Open `http://localhost:5173` locally. Reading history and imported chapters stay in browser local storage. The preview contains a few sample Qur'anic duas, not a verified transcription of *Mukhtasar Hizb ul Azam*. Use **Settings → Import chapters** to load Arabic and Urdu text checked against a trusted edition; the JSON template is downloadable there.

MetaGPT is installed in a local Python 3.11 virtual environment at `.venv/`.
The environment itself is intentionally not checked into Git.

## MetaGPT setup

To recreate the environment from the pinned upstream MetaGPT source revision:

```bash
python3.11 -m venv .venv
.venv/bin/python -m pip install -r requirements-metagpt.txt
.venv/bin/python -m pip install --no-deps \
  "git+https://github.com/geekan/MetaGPT.git@11cdf466d042aece04fc6cfd13b28e1a70341b1f"
.venv/bin/metagpt --help
```

`requirements-metagpt.txt` follows MetaGPT's runtime requirements, with two
compatibility adjustments for the current package index: `lancedb` is allowed
at `>=0.14.0` because the upstream `0.4.0` pin is no longer available there,
and Click is pinned to `8.1.7` for compatibility with MetaGPT's Typer `0.9.0`
CLI. The MetaGPT CLI has been verified with `--help`. Running an agent will
also require configuration for a supported LLM provider and its API credentials.
