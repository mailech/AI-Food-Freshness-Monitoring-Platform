# `data/`

## `data/sample/`

Procedurally generated sample food images plus a manifest, written by
`backend/app/sample_images.py`.

**These are synthetic renderings, not photographs.** They exist so that:

* `python -m app.seed` can run the *real* analysis pipeline and populate the
  dashboards with meaningful content, and
* a reviewer can exercise the analysis workflow immediately,

without this repository redistributing any third-party dataset. Every public
food-freshness dataset carries licence terms that make bundling it
inappropriate — see `ml/datasets/README.md`.

### Regenerate

```bash
cd backend
python -c "from app.sample_images import write_sample_library; print(write_sample_library())"
```

The output directory is `SAMPLE_DIR` (defaults to `data/sample`).

### Do not train on these

A model fitted to these images would learn the renderer, not food. They are for
demonstration and testing only. To train a real model, obtain a real dataset —
see `ml/datasets/README.md`.

## Using your own photographs

Drop any JPG/PNG anywhere and upload it through the UI (**Analyse Food**) or via
the API:

```bash
curl -X POST http://localhost:8000/api/v1/analysis/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/photo.jpg" \
  -F "batch_id=1" \
  -F "temperature_c=4.0" \
  -F "humidity_pct=88"
```

Well-lit, in-focus photographs that fill the frame with the food give the most
useful analysis. Blurry input measurably lowers the reported confidence — that is
intentional.
