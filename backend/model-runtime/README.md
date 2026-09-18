# Isolated model-runtime environment

This directory owns only the local llama.cpp process. Select exactly one pinned
manifest after running the host probe:

- Ubuntu x86-64 without a working NVIDIA driver: `environment-linux-cpu.yml`;
- Ubuntu x86-64 with compatible NVIDIA/CUDA 13: `environment-linux-cuda.yml`;
- Apple-silicon macOS, including M4: `environment-macos-metal.yml`.

Create/update it with `conda env update --name alim-model-runtime --file
<manifest>`. Run lifecycle commands through that environment, for example:

```bash
conda run -n alim-model-runtime python backend/scripts/model_runtime.py check
conda run -n alim-model-runtime python backend/scripts/model_runtime.py start
conda run -n alim-model-runtime python backend/scripts/model_runtime.py health
conda run -n alim-model-runtime python backend/scripts/model_runtime.py stop
```

The controller uses Python's standard library and repository code; it does not
need FastAPI, Node or Supabase packages. Model weights and controller state stay
outside Git. CUDA and M4 manifests have deterministic fixture/static coverage,
but still require the manual physical-host smoke steps in the model handover.
