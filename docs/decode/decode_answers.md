# Code Kernel '26 · Decode answers: Team Binary Brains (VidyaSaathi)

---

### 1. What is your proposed solution, and how does it solve the adaptive learning problem?

VidyaSaathi ("learning companion") is a web and mobile platform for Classes 6 to 10 that turns a student's own board syllabus (CBSE or ICSE) into a personal learning path, and keeps adjusting that path as the student learns.

The core problem is that a whole class moves at one pace, and gaps only show up at the chapter-end test, after the class has moved on. We move the check from the end of the chapter into the lesson itself:

- **Learn:** short video lessons (avatar teacher + visual boards) pause at checkpoints to ask a question. A right answer moves the lesson deeper; a wrong one re-explains it more simply with a new example. Doubts can be asked at any point and are answered at the student's class level.
- **Solve:** practice is generated for the concepts the student is weakest in, along with class-specific simulations and quick topic games.
- **Test:** teachers set MCQ/MSQ class tests. Each result becomes a topic-wise report, and the student's path updates on its own.

So a fast learner skips what they already know and goes deeper, while a struggling student gets simpler explanations and an automatic recap of the earlier concept they missed. The teacher sees both, with reasons, and decides when to step in.

---

### 2. How will your system identify each student's strengths, weaknesses, and learning gaps, and adapt the content, difficulty, and pace for them?

**Finding where the student stands.** Every student has a learner model with a mastery score for each concept in their syllabus. Five signals feed it:

1. A ~6-question adaptive placement check on day one
2. Checkpoint answers inside lessons
3. Practice and class-test scores, tagged by concept
4. Doubts asked (which topic, how often)
5. Activity (streaks, days away, syllabus coverage)

- **Strengths:** concepts with high, stable mastery.
- **Weaknesses:** concepts with low or falling mastery.
- **Gaps:** cases where the weak spot is actually an earlier prerequisite. Struggling with linear equations in Class 9 may really be a problem with integers from Class 7.

**Adapting to it:**

- **Content (what's next):** known topics are skipped. When a gap is found, a short recap of the prerequisite is inserted into the path automatically.
- **Difficulty:** each lesson runs at a level from 1 to 5. Two right answers in a row step it up; a miss steps it down. The level carries into the next lesson.
- **Explanation style:** a wrong checkpoint triggers a ladder: re-explain with a new Indian example → rebuild from the prerequisite → hand to the teacher.
- **Pace:** students who are ahead get stretch questions and move on sooner. Students who struggle get more practice before the next topic. Spaced review brings back concepts just before they're likely to be forgotten.

Every change is written to a "Why?" log in plain words, for example *"You missed the checkpoint on equivalent fractions, so I explained it with rotis and lowered the level to 2."*

---

### 3. Which algorithms or models are you planning to use? Explain what each one does and why you chose it.

We prefer simple, explainable methods for decisions about a child, and use LLMs only where language is involved.

| Purpose | Method | What it does | Why we chose it |
|---|---|---|---|
| Placement | Short adaptive test (up/down item selection) | Picks the next question based on the last answer, to find the starting level in ~6 questions | Far shorter than a full diagnostic; students don't drop off |
| Mastery tracking | Weighted moving average per concept (a lightweight form of knowledge tracing) | Updates each concept's mastery after every graded answer, with recent answers weighted more | Works from the first day with very little data; easy to explain to teachers. Can be upgraded to Bayesian Knowledge Tracing once pilot data exists |
| Difficulty adjustment | Staircase rule (2 right → up, 1 wrong → down, levels 1–5) | Keeps questions in the "just hard enough" zone | A proven method from testing research; predictable, with no cold-start problem |
| Gap detection | Prerequisite graph over the syllabus + backward search | When a concept is weak, walks back through its prerequisites to the weakest one and schedules a recap | Matches how concepts build up from Class 6 to 10; the graph comes from textbook order, so it's board-correct |
| Next-step recommendation | Ranking over the path (order + mastery + reviews due) | Chooses what to show next: the next topic, a recap or a due review | Transparent, and always stays inside the student's own syllabus |
| Retention | Spaced repetition (expanding intervals 2 → 5 → 12 → 30 → 60 days; reset on a miss) | Brings back mastered concepts before they fade | Well-established memory research; cheap to compute |
| Answer evaluation | MCQ/MSQ auto-marking + LLM rubric grading for short answers + a misconception taxonomy | Grades answers and labels the likely misconception, such as "adds denominators" | Turns a wrong answer into a reason, which is what drives re-explanation |
| Content grounding | RAG with BGE-M3 (dense + sparse) search, RRF fusion and a cross-encoder reranker over syllabus content | Fetches the right part of the syllabus before any explanation is written | BGE-M3 is multilingual (Hindi + English); grounding keeps answers on-syllabus and refuses off-topic ones |
| Explanations and questions | Google Gemini (Flash) through a multi-agent tutor, with an offline template-based fallback | Writes lesson scripts, re-explanations and practice questions at the right level | Fast and low-cost, with good Hindi; the fallback means learning never stops |
| Doubt routing | Intent classification (meaning / why / how / example / numerical, including Hinglish keywords) | Decides how a doubt should be answered | Lets the tutor shape the answer correctly from the first try |
| Teacher focus score | Transparent weighted rules (test average, open doubts, inactivity, weak subjects) → 0–100 | Ranks which students need attention now, with reasons | A teacher must be able to explain every flag to a parent, so a black-box model doesn't fit here |

---

### 4. How will your solution help teachers monitor and guide students without replacing them?

The AI does the noticing and gives the first answer. The teacher makes the decisions and does the teaching.

- **Focus list:** each teacher sees their class sorted by who needs attention now, with plain reasons ("test average 38%, 3 doubts waiting, inactive 9 days"). In a class of 40+, the first five minutes go to the right students.
- **Doubt inbox:** if a student is still confused after 3 AI tries, the doubt goes to *their own* subject teacher with the full conversation and lesson context. The teacher replies by text, notes, a short recorded video (auto-deleted after 7 days) or by scheduling a live class.
- **Tests and reports:** teachers create MCQ/MSQ tests for their class and see topic-wise results showing who is doing well, who is falling behind and on which topic. That tells them what to re-teach in the next period.
- **Fits the school structure:** subject teachers and class teachers are set per board and class, and students are auto-assigned evenly. Class teachers get a weekly cross-subject view.
- **Explainable:** the "Why?" log and the rule-based focus score mean the teacher can see and override every automatic decision.

The design goal is to bring students back to their school teacher rather than to a coaching app.

---

### 5. How will it work for Indian students with different languages, syllabus, and limited internet access?

**Syllabus.** CBSE (NCERT 2025-26 books) and ICSE (CISCE syllabus in Selina/Concise textbook order) for Classes 6–10 are mapped chapter by chapter, about 560 chapters and 1,580 topics. The student picks their board and class at sign-up, and everything (path, lessons, doubts, tests) stays inside that syllabus. State boards can be added using the same format.

**Language.** The full interface, lessons and voice are in English and Hindi. Doubts can be typed in Hinglish ("ye kyun hota hai?"). Explanations use everyday Indian examples such as cricket, kirana shops, trains, rotis and the monsoon. The multilingual embedding model and TTS make it straightforward to add more Indian languages.

**Limited internet and devices:**

- Phone-first: a light web app plus an Android/iOS app. Several student profiles can share one family phone.
- Low data: the Hindi pack loads only when chosen; lessons fall back to text + boards when video can't stream; lessons resume exactly where they stopped after a dropped connection.
- Works without the cloud AI: a built-in offline teacher builds explanations from lesson notes if the AI service or network is unavailable.
- Low-cost hosting: the whole stack runs on a single small server or school machine with Docker.
- Students with no device can use the same lessons in class on a projector or in the school lab, led by the teacher.

---

### 6. Which tech stack are you using for frontend, backend, database, and AI/ML, and why? Briefly describe how you'll structure your data.

| Layer | Stack | Why |
|---|---|---|
| Frontend | Next.js + React + TypeScript + Tailwind (web); Expo React Native (Android/iOS) | One shared design and API for web and mobile; fast on low-end phones |
| Backend | Python, FastAPI, WebSockets | Python fits the AI/ML work; WebSockets stream lessons and checkpoints in real time |
| Database | SQLite (WAL) for pilots → PostgreSQL at scale; ChromaDB as the vector store | Zero-setup for a school pilot, with a clean path to scale |
| AI/ML | Google Gemini (Flash), multi-agent tutor on a 7-step loop, BGE-M3 + cross-encoder reranker, Edge-TTS (English/Hindi), FFmpeg for lesson video | Good quality per rupee, multilingual, and every part has an offline fallback |
| DevOps | Docker, pytest unit/integration/eval suites | Repeatable deploys and measurable AI quality |

**Data structure (main tables):**

- **users:** id, role (student / teacher / admin), board, class, language, verified email
- **teacher_assignments:** teacher, board, class, subject, is_class_teacher
- **syllabus:** board → class → subject → chapter → topic, with an order index and prerequisite links (this is the path and the prerequisite graph)
- **questions:** topic, concept tags, type (MCQ / MSQ / short answer), difficulty 1–5, answer key, misconception tags
- **attempts:** student, question, answer, score, time taken, difficulty at the time
- **mastery:** student, concept, mastery score, last seen, review interval, next review date
- **lessons / sessions:** student, topic, current step of the loop, difficulty level, Why? log
- **doubts:** thread (student, topic, lesson), messages, number of AI tries, escalated-to teacher, teacher reply
- **tests / test_attempts:** teacher, class, subject, questions; per-student scores by topic
- **notifications:** user, type, link, read status

`mastery` is the single source of truth for adaptation. The student path, the teacher's focus list and the reports all read from it.

---

### 7. How will you test that your recommendations are accurate, and how will you keep student data secure?

**Testing accuracy:**

- **Offline evaluation:** a labelled set of questions per topic (correct answers, common wrong answers and their misconceptions) to measure grading accuracy and misconception detection. Target: ≥ 85% agreement with teacher marking.
- **Grounding checks:** automated eval suites measure whether retrieved syllabus passages actually support each answer (groundedness) and how well the reranker ranks the right passages (recall/precision). Off-syllabus questions must be refused.
- **Gap detection vs teachers:** for pilot students, compare the gaps the system flags with the teacher's own judgement.
- **Pilot outcome:** 1–2 schools, Classes 7 and 9, 6 weeks, with the same pre-test and post-test. Targets: +15% mastery on pilot topics, gaps caught within 7 days, 60%+ of doubts resolved without escalation, and under 10 minutes of teacher time per day.
- **Simulated students:** scripted learners (always right, always wrong, mixed) check that difficulty and path changes behave as designed before real students use it.

**Data security and privacy:**

- Short-lived JWT access tokens with rotating HTTP-only refresh tokens, bcrypt-hashed passwords, OTP email verification, login lockout and rate limiting.
- Role-based access: students see only their own data and class-only leaderboards; teachers see only students they are assigned to.
- Minimal data: no phone number or address is needed. Names and contact details are never sent to the AI model; only the question and lesson context are.
- Teacher videos are auto-deleted after 7 days; HTTPS everywhere; database encryption at rest in production.
- Designed for India's DPDP Act 2023: verifiable parental consent for under-18 users, no ads or behavioural tracking, and data export/deletion on request.
