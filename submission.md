# VidyaSaathi: Devpost Submission Plan (Multimodal AI Hackathon 2026, Track D)

No code changes. This is a checklist plus copy-ready text. Work through it top to bottom.

---

## 0. What Devpost requires (all four, before the deadline)

| # | Requirement | Current status | Action |
|---|---|---|---|
| 1 | Project description on Devpost | Not written | Paste the text from Step 3 |
| 2 | Public GitHub repo with README (setup, prereqs, how to run) | Repo `github.com/Sagnik120/SHIKSHAK-AI`. The README covers setup well | Confirm the repo is **public** (Step 1) |
| 3 | Demo video, 3–10 min, **YouTube** (unlisted is OK, private is not), English | Video is only on **Google Drive**, which **does not meet the rule** | Upload to YouTube (Step 2) |
| 4 | Team: real full names, everyone has a Devpost account and is added | Sagnik Chandra and Shrusti Jain | Both need Devpost accounts. Send the invite (Step 4) |

---

## Step 1: GitHub (about 5 min)

1. Open https://github.com/Sagnik120/SHIKSHAK-AI in an **incognito window**. If you see a 404, the repo is private. Ask Sagnik to change it: Settings → General → Danger Zone → *Change visibility* → Public.
2. Check that no secrets are committed. `.env` should not be in the repo (only `.env.example`). If an API key was ever committed, **rotate the key** now. Don't try to rewrite history this late.
3. Note: your local working tree shows `VidyaSaathi_AI.pptx` deleted but not committed. That's fine. Leave it as it is, since you're not pushing.
4. Optional, only if a teammate is already pushing something: the README links the demo to Google Drive. Ideally it should point to the YouTube link too. It's not required, because Devpost has its own video field.

---

## Step 2: YouTube demo video (the biggest blocker, about 45–90 min)

### 2a. Create a YouTube channel (you already have a Google account)
1. Go to https://youtube.com and sign in with your Gmail.
2. Click your avatar (top right) → **Create a channel** → confirm the name → **Create channel**. A personal channel is fine.
3. Videos longer than 15 min need phone verification. Yours will be shorter, so you can skip this. To verify anyway: https://youtube.com/verify.

### 2b. Upload
1. Download the existing demo video from the Drive folder. Check that it's **3:00–10:00** long. If it's under 3 min, add a short architecture/eval section (see the script in 2d).
2. YouTube → **Create (camera icon) → Upload videos** → choose the file.
3. **Title:** `VidyaSaathi – Source-Grounded Adaptive AI Tutor | Multimodal AI Hackathon 2026 (Track D)`
4. **Description:** paste the short pitch from Step 3, plus the GitHub link and the live demo link.
5. **Audience:** choose *"No, it's not made for kids"*.
6. **Visibility:** choose **Unlisted** (never Private) → **Save**.
7. Copy the link (`https://youtu.be/...`). Open it in incognito to confirm it plays.
8. **Subtitles:** YouTube auto-generates English captions within about 1 hour. If the audio is Hindi or mixed, upload English subtitles: Studio → Subtitles → Add → *Upload file* or *Type manually*. I can write an `.srt` file if you give me the transcript.

### 2c. If you need to (re)record
- Use macOS's built-in recorder: **Cmd+Shift+5** → *Record Entire Screen* → Options → Microphone: MacBook mic. It saves a `.mov` file, which YouTube accepts directly.
- Run the app locally: `python run.py` (or follow the README quick start). Log in as `demo@vidyasaathi.in` / `DemoStudent@123`. Or use the live demo at https://shikshak-ai-ten.vercel.app/.

### 2d. Suggested 6–7 min script (mapped to the judging criteria)
| Time | Show | Say (and which criterion it hits) |
|---|---|---|
| 0:00–0:30 | Landing page | Problem: scattered material, ungrounded chatbots. One-line solution. |
| 0:30–1:30 | **Upload a PDF/PPTX** → processing → syllabus generated | Multimodal ingestion, topics/concepts. *(KB & Grounding, 20%)* |
| 1:30–2:45 | Ask a question → answer with **page citations**. Then ask something off-material → **refusal** | Source grounding and refusal. *(20%)* |
| 2:45–4:00 | Quiz/placement check → answer one wrong → feedback → **Report** page | Adaptive assessment, misconceptions. *(15%)* |
| 4:00–5:00 | **Progress** / skill map / **Refresh** (spaced review) | Learner model: per-concept mastery + spaced repetition. New-user placement check. *(20%)* |
| 5:00–5:45 | Avatar video lesson, **Hindi toggle**, voice | Optional enhancements: Indian language, audio. *(UX, 15%)* |
| 5:45–6:45 | README architecture diagram, `tests/eval/` folder, terminal running `pytest tests/eval` | Architecture and evaluation. **State honestly** what is and isn't measured. *(15% + 15%)* |
| 6:45–7:00 | Team names, links | — |

---

## Step 3: Devpost project page (about 30 min)

1. Go to https://devpost.com → sign up or log in with your **real full name**.
2. Open the Multimodal AI Hackathon 2026 page → **Enter a submission** (or *My projects → Edit*, if Sagnik already started one. **Only one person should create the project.**)
3. Fill in the fields:
   - **Project name:** VidyaSaathi
   - **Elevator pitch (≤200 chars):** *An AI tutor that turns your course PDFs and slides into a cited knowledge base, teaches via a bilingual video avatar, quizzes you, and tracks per-concept mastery with spaced review.*
   - **Track:** Track D: Personalized Tutoring & Adaptive Learning
   - **Built with (tags):** python, fastapi, next.js, react, typescript, google-gemini, bge-m3, chromadb, sqlite, edge-tts, docker
   - **"Try it out" links:** GitHub repo, live demo URL
   - **Video demo link:** your YouTube URL
   - **Image gallery:** 4–6 screenshots (upload, cited chat, quiz report, skill map, avatar lesson). The first image becomes the thumbnail.
4. **Story / description:** paste this and edit it to your liking:

```markdown
## Inspiration
Students learn from PDFs, slides and lectures scattered everywhere, and general chatbots answer
confidently from outside the course. We wanted a tutor that only teaches what your material says,
and that knows what *you* already understand.

## What it does
- **Ingest:** upload PDF, DOCX, PPTX, TXT or MD. VidyaSaathi builds a syllabus of topics and concepts.
- **Grounded tutoring:** hybrid RAG (BGE-M3 dense + sparse, reranking) answers with page-level
  citations. Weak matches are refused, not guessed.
- **Teaches on video:** an AI avatar delivers lessons with whiteboard slides, in English or Hindi (Edge-TTS).
- **Adaptive assessment:** placement check for new learners, quizzes graded with rubric-based
  evaluation, and misconception detection with a per-lesson report.
- **Learner model:** per-concept mastery updated after every answer, a skill map, and spaced review
  that brings fading concepts back.

## How we built it
FastAPI backend with a multi-agent pedagogical state machine (planner → teacher → evaluator),
Google Gemini LLM, BGE-M3 hybrid retrieval over ChromaDB, SQLite (WAL) for mastery, paths and
reviews, and a Next.js 16 / React 19 frontend. Dockerised; runs without API keys in fallback mode.

## Challenges
Keeping answers grounded while staying conversational; syncing avatar video, TTS and slides;
Hindi text shaping on rendered boards.

## Evaluation
Pytest-based eval suites: RAG groundedness, rubric scoring, and reranker recall/precision
(`tests/eval/`), plus end-to-end pipeline scripts.

## What's next
Lecture-video ingestion with timestamp citations, a RAGAS benchmark on a public course,
simulated-student runs to measure mastery gains, and a visual prerequisite map.
```

5. Click **Save** often. On the last page, tick the eligibility/rules boxes → **Submit**. A draft is **not** a submission.

---

## Step 4: Team (about 5 min)
1. Sagnik must have a Devpost account under the name **Sagnik Chandra**. Your account should be under your full real name (**Shrusti Jain**, or your full legal name).
2. Project page → **Edit → Team / Invite teammates** → enter their Devpost email → they **accept the invite from email**.
3. After they accept, check that both names show on the public project page.

## Step 5: Final check (about 10 min before the deadline)
- [ ] The YouTube link plays in incognito, is Unlisted, is 3–10 min, and has English captions
- [ ] The GitHub repo opens in incognito
- [ ] The live demo opens (cold start may be slow, so open it once to warm it up)
- [ ] Both teammates are listed
- [ ] Status shows **Submitted**, not Draft
- [ ] Take a screenshot of the submitted page as proof

---

## How I can help (just ask)
- **Video:** write a timed voice-over script or an English `.srt` subtitle file from your transcript; write the YouTube description.
- **Devpost:** tighten the description and pitch, or write image captions.
- **Docs:** write a short `ARCHITECTURE.md`, a "grounding method", or a "learner model" write-up that Track D lists as deliverables. I only need to read the code, so no code changes. You'd add it via the GitHub web UI only if you want to.
- **Eval:** run the existing `pytest tests/eval` locally and turn the output into an honest results table for the description/video.
- **Q&A prep:** likely judge questions and answers.

---

## Harsh review (judged against the Track D rubric)

1. **Wrong brief.** The README says the problem statement is *"Personalised AI Tutor for Learning AI"*, not Track D. Judges will notice that this was built for a different hackathon and re-targeted.
2. **No lecture-video ingestion.** Track D's first requirement is video + textbook + slides with **timestamp** citations. Only documents are supported, so a core requirement is missing.
3. **Image/diagram extraction is unclear.** I see no evidence of figure understanding from slides or PDFs (requirement 1d).
4. **No RAGAS/DeepEval/TruLens.** The eval is custom pytest rubrics. The 15% System Evaluation criterion asks for a standard framework plus faithfulness/relevancy/context precision/recall numbers. Neither is present.
5. **No simulated-student study.** There are no mastery-gain or question-repetition-rate results, so Personalization (20%) has no measured evidence.
6. **The learner model isn't named or justified.** Is it BKT, IRT or ad-hoc? Spaced review is good, but say what the math is.
7. **Question novelty and cross-model verification aren't shown** (requirement 3b).
8. **Strengths:** a polished UI, an avatar video tutor, Hindi support, citations with refusal, a strong README, Docker, a live deploy. UX and technical implementation will score well.
9. **Process risk:** the video is on Drive, not YouTube. That breaks the submission rules until fixed.
10. **Repo hygiene:** `.db` files, `chroma_db`, logs and `.pptx` files are committed, which looks rushed.

**Overall: 5.5 / 10.** It's an impressive product that answers a neighbouring question. Expect strong UX and engineering scores, weak System Evaluation and Personalization-evidence scores, and a partial Knowledge Base score. Be **honest in the video** about the gaps and frame them as "next steps". Judges reward honesty explicitly ("rigor and honesty of reported results").
