# Workflow: /startcycle

## Trigger
```
/startcycle [optional: focus area e.g. "backend only" | "frontend only" | "full"]
```

## Purpose
Orchestrate the full development pipeline: spec → backend → frontend → audit → deploy.

---

## Pipeline

### Stage 1: Specification (@pm)
**Invoke**: `@pm` using skill `.agents/skills/write_specs.md`

Actions:
1. Read `prd.md` and `spec.md`.
2. Generate `production_artifacts/Technical_Specification.md`.
3. **HALT** — wait for user to say "Approved".
4. If user adds comments, revise and ask again (loop until "Approved").

---

### Stage 2: Backend Implementation (@backend)
**Invoke**: `@backend` using skill `.agents/skills/generate_backend.md`

Precondition: `production_artifacts/Technical_Specification.md` exists.

Actions:
1. Read the approved spec.
2. Generate all files under `app_build/backend/`.
3. Notify completion.

*Skip this stage if user specified "frontend only".*

---

### Stage 3: Frontend Implementation (@frontend)
**Invoke**: `@frontend` using skill `.agents/skills/generate_frontend.md`

Precondition: `production_artifacts/Technical_Specification.md` exists.

Actions:
1. Read the approved spec.
2. Generate all files under `app_build/frontend/`.
3. Notify completion.

*Skip this stage if user specified "backend only".*

---

### Stage 4: QA Audit (@qa)
**Invoke**: `@qa` using skill `.agents/skills/audit_code.md`

Actions:
1. Read spec and all generated code.
2. Run the full checklist.
3. Fix all ❌ issues in-place.
4. Output completed checklist with all ✅.

---

### Stage 5: Deployment (@devops)
**Invoke**: `@devops` using skill `.agents/skills/deploy_app.md`

Actions:
1. Install dependencies.
2. Start local dev servers (backend :8080, frontend :5173).
3. Ensure `Dockerfile` exists in `app_build/backend/`.
4. Ensure `firebase.json` exists in `app_build/frontend/`.
5. Report URLs and next deploy commands.

---

## Completion Message
After all stages finish:
> "Pipeline complete.
> - Spec:     production_artifacts/Technical_Specification.md
> - Code:     app_build/ （Go + embed.FS + React）
> - Local:    http://localhost:8080 (API) | http://localhost:5173 (Frontend dev)
> - Deploy（1コマンド）:
>     cd app_build/frontend && npm run build
>     cd app_build && gcloud run deploy ice-cream-sandwich --source . --region=asia-northeast1 --allow-unauthenticated --timeout=300 --set-secrets=..."
