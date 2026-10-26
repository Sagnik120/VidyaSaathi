/** Shapes returned by the FastAPI backend. Shared by web and (later) mobile. */

export type Level = "beginner" | "intermediate" | "advanced";

export interface User {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  role: "student" | "admin" | string;
  is_verified: boolean;
  preferred_language: string;
  preferred_level: Level | string;
  preferred_style?: string | null;
  default_time_budget_min: number;
  grade?: string | null;
  board?: string | null;
  avatar_color: string;
  avatar_url?: string | null;
  avatar_choice?: string | null;
  mentor_name?: string | null;
  mentor_email?: string | null;
  mentor_teacher_id?: string | null;
  teaching?: Array<{ board: "CBSE" | "ICSE"; grade: string; subject: string }>;
  class_teacher_of?: string[];
  created_at: string;
  last_login_at?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export type LessonStatus = "created" | "planned" | "in_progress" | "completed" | "escalated" | "abandoned";

export interface Escalation {
  id: string;
  lesson_id: string;
  node_id: string;
  concept: string;
  status: "open" | "continued" | "resolved" | "skipped" | "closed";
  reason?: string | null;
  resolution?: string | null;
  mentor_notified: boolean;
  opened_at: string;
  continued_at?: string | null;
  closed_at?: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  source: "topic" | "document";
  topic?: string | null;
  status: LessonStatus;
  level: Level;
  language: string;
  node_count: number;
  nodes_completed: number;
  progress_pct: number;
  score_pct: number | null;
  watch_minutes: number;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  escalation: Escalation | null;
  needs_review: Array<{ node_id: string; concept: string }>;
  relearning?: string | null;
  skill_concept_id?: string | null;
  syllabus_topic_id?: string | null;
  subject?: string | null;
  skill_goal_id?: string | null;
  difficulty?: number | null;
  difficulty_log?: Array<{ from: number; to: number; reason: string; at: string }>;
  review_pending: boolean;
  to_review: number;
}

export interface QA {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  expected_concept: string | null;
  raw_answer: string | null;
  correct: boolean | null;
  partial_credit: number;
  feedback_text: string | null;
  misconception_tag?: string | null;
  adaptation_action?: string | null;
  asked_at: string;
}

export interface Citation {
  source_title?: string;
  excerpt?: string;
  section_title?: string | null;
  page_or_slide?: number | null;
  chunk_count?: number;
  risk_level?: string;
}

export interface LessonNode {
  node_id: string;
  position: number;
  concept: string;
  depth: string;
  est_minutes: number;
  status: string;
  attempts: number;
  mastery_score: number;
  times_reexplained: number;
  script_text: string | null;
  notes: { key_points?: string[]; example?: string | null } | null;
  video_url: string | null;
  captions_url: string | null;
  duration_sec: number;
  citation: Citation | null;
  review_note: string | null;
  checkpoints: Array<{ index: number; at_sec: number }>;
  interactions: QA[];
}

export interface LessonDetail extends Lesson {
  nodes: LessonNode[];
  report: {
    score_pct: number;
    strong_areas: string[];
    weak_areas: string[];
    recommended_next: string[];
    narrative_feedback: string;
    created_at: string;
  } | null;
  escalations: Escalation[];
  constraints: { level: string; language: string; time_budget_min: number; style?: string | null };
}

export interface LessonList {
  lessons: Lesson[];
  count: number;
  total: number;
  offset: number;
  has_more: boolean;
}

export interface Dashboard {
  learner: { full_name: string; initials: string; avatar_color: string; member_since: string };
  stats: {
    lessons_started: number;
    lessons_completed: number;
    lessons_in_progress: number;
    lessons_paused?: number;
    average_score_pct: number;
    accuracy_pct: number;
    total_questions: number;
    correct_questions: number;
    learning_minutes: number;
    streak_days: number;
    longest_streak: number;
    concepts_mastered: number;
    concepts_to_review: number;
  };
  strong_concepts: string[];
  weak_concepts: string[];
  resume_lesson: Lesson | null;
  needs_attention: Array<{
    kind: "paused" | "review";
    lesson_id: string;
    lesson_title: string;
    concept: string;
    node_id?: string;
    since?: string;
  }>;
  recent_lessons: Lesson[];
  score_trend: Array<{ lesson_id: string; score_pct: number; date: string }>;
  activity_calendar: Array<{ date: string; count: number }>;
}

export interface Analytics {
  accuracy_trend: Array<{ date: string; accuracy_pct: number; questions: number }>;
  concept_strength: Array<{ concept: string; mastery_pct: number; attempts: number; reexplains: number }>;
  weakest: Array<{ concept: string; mastery_pct: number }>;
  strongest: Array<{ concept: string; mastery_pct: number }>;
  misconceptions: Array<{ tag: string; count: number }>;
  time_on_task: Array<{ date: string; minutes: number }>;
  response_time: { average_sec: number; samples: number };
  totals: { lessons: number; completed: number; questions: number; correct: number; learning_minutes: number };
}

export interface DocumentInfo {
  document_id: string;
  filename: string;
  size_bytes: number;
  status: string;
  chunk_count: number;
  chapters: string[];
  key_terms: string[];
  created_at?: string;
}

export interface PracticeQuestion {
  interaction_id: string;
  node_id: string;
  concept: string;
  question_text: string;
  type: string;
  options: string[];
  your_lesson_answer: string | null;
  lesson_correct: boolean | null;
  needs_practice: boolean;
  /** Practice Lab: freshly generated for a weak spot, at this level. */
  generated?: boolean;
  difficulty?: number | null;
  target?: string | null;
  last_practice: { correct: boolean; answer: string; answered_at: string } | null;
}
export interface PracticeSet { lesson_id: string; title: string; questions: PracticeQuestion[] }
export interface PracticeResult { correct: boolean; feedback_text: string; model_answer: string }

export interface SavedNote {
  node_id: string; concept: string; depth?: string; est_minutes?: number; status?: string;
  key_points: string[]; example?: string | null; script_text?: string | null; citation?: Citation | null;
}

/* -- live classroom protocol (WebSocket) ----------------------------------- */

export interface Checkpoint { index: number; at_sec: number }

export interface VideoSegment {
  node_id: string;
  title: string;
  script_text: string;
  video_url: string | null;
  captions_url?: string | null;
  duration_sec: number;
  checkpoints?: Checkpoint[];
  passed?: number[];
  replay?: boolean;
}

export interface InteractionEvent {
  interaction_id: string;
  node_id: string;
  checkpoint_index?: number;
  question_text: string;
  type: string;
  options: string[];
}

export interface EvaluationEvent {
  interaction_id?: string;
  node_id: string;
  correct: boolean;
  partial_credit: number;
  feedback_text: string;
  misconception_tag?: string | null;
}

export interface ProgressNode {
  node_id: string;
  concept: string;
  status: string;
  mastery_score: number;
  attempts: number;
  checkpoint_question: boolean;
  video_url: string | null;
}

/* -- admin ----------------------------------------------------------------- */

export interface AdminOverview {
  learners: number;
  active_today: number;
  lessons: number;
  completed: number;
  live_now: number;
  open_escalations: number;
  questions_answered: number;
  accuracy_pct: number;
  avg_score_pct: number;
  escalations_total: number;
  funnel: { concepts_checked: number; first_time: number; rescued: number; still_stuck: number; needed_human: number };
  daily: Array<{ date: string; lessons: number; questions: number; learners: number; right: number; wrong: number; rescued: number; escalations: number; completed: number; started: number }>;
}
export interface AdminLive {
  sessions: Array<{
    lesson_id: string; title: string; learner: string; concept: string | null;
    fsm_state: string; progress_pct: number; connected_for_sec: number;
  }>;
}
export interface AdminEscalations {
  escalations: Array<Escalation & {
    learner: string; learner_email: string; lesson_title: string;
    last_question?: string | null; last_answer?: string | null; wrong_answers: number;
    minutes_open: number; needs_mentor: boolean; learner_moved_on: boolean;
  }>;
  counts: Record<string, number>;
}
export interface AdminStaff {
  staff: Array<Pick<User, "id" | "full_name" | "email" | "avatar_color" | "avatar_url"> & { role: "admin" | "teacher"; created_at: string }>;
}
export interface AdminInsights {
  hardest_concepts: Array<{ concept: string; attempts: number; accuracy_pct: number; learners: number }>;
  missed_questions: Array<{ question: string; concept: string; asked: number; wrong_pct: number }>;
  misconceptions: Array<{ tag: string; count: number }>;
  attempts_to_mastery: number;
  adaptation_mix: Record<string, number>;
}
export interface AdminQuality {
  grounding: Record<string, number>;
  llm: { live: boolean; model: string; cooldown_active: boolean; cooldown_remaining_sec: number };
  script_words_vs_target: number | null;
  explanations: number;
  questions_by_type: Record<string, number>;
}
export interface AdminPipeline {
  renders: { total: number; avg_video_sec: number; failed: number };
  memory_mb: number | null;
  uptime_sec: number;
  events_last_hour: Record<string, number>;
  reconnects_today: number;
}
export interface AdminLearners {
  learners: Array<{
    id: string; full_name: string; email: string; avatar_color: string; avatar_url?: string | null;
    lessons: number; completed: number; accuracy_pct: number; last_active: string | null; open_escalations: number;
  }>;
}
export interface AdminLearnerDetail {
  learner: AdminLearners["learners"][number] & { grade?: string | null; created_at: string };
  lessons: Lesson[];
  strong_concepts: string[];
  weak_concepts: string[];
  escalations: Escalation[];
  practice_attempts: number;
}

/* -- learner journey ---------------------------------------------------- */

export interface JourneyDay { date: string; answers: number; correct: number; videos: number; practice: number; started: number; completed: number; minutes: number }
export interface Badge { id: string; group: string; tier: number; threshold: number; value: number; earned: boolean; earned_at: string | null }
export interface Journey {
  today: string;
  days: JourneyDay[];
  streak: { current: number; longest: number; active_days: number; last_active: string | null };
  level: { xp: number; level: number; floor: number; next: number; title: string };
  totals: { answers: number; correct: number; lessons_started: number; lessons_completed: number; concepts_mastered: number; practice: number; minutes: number; videos: number; documents: number; best_right_in_a_row: number };
  understanding: { concepts_checked: number; first_try: number; rescued: number; still_stuck: number };
  mastery: { mastered: number; watched: number; learning: number; to_review: number; not_started: number };
  concepts: Array<{ concept: string; mastery_pct: number; attempts: number; reexplains: number; status: string }>;
  weekday: number[];
  hours: number[];
  badges: Badge[];
  months: Array<{ month: string; active_days: number; earned: boolean; needed: number }>;
}

export interface SkillConcept {
  id: string;
  title: string;
  track: string;
  prereqs: string[];
  custom: boolean;
  mastery?: { score: number | null; attempts: number; state: "mastered" | "practice" | "started" } | null;
}
export interface SkillStep {
  id: string; title: string; track: string;
  state: "new" | "practice" | "started" | "recap";
  reason: string; blocked_by: string[]; next?: boolean;
}
export type JourneyStep = Omit<SkillStep, "state"> & {
  state: SkillStep["state"] | "done";
  score?: number | null;
  lesson_id?: string | null;
  lesson_status?: string | null;
  review_due?: boolean;
};
export interface Placement { known: string[]; difficulty: number; known_upto: string | null; at: string }
export interface PlacementAnswer { id: string; choice: number }
export type PlacementStep =
  | { done: false; next: { id: string; question: string; options: string[]; number: number; of: number } }
  | { done: true; known_upto: string | null; correct: number; asked: number };
export interface SkillMap {
  placement: Placement | null;
  tracks: Array<{ id: string; title: string }>;
  concepts: SkillConcept[];
  goal: string | null;
  goal_title: string | null;
  route: SkillStep[];
  journey: JourneyStep[];
  scope_total: number;
  scope_done: number;
  mastered_count: number;
}

export interface WhyEntry {
  at: string | null;
  kind: string;
  node_id: string | null;
  concept: string | null;
  params: Record<string, unknown> & { [k: string]: any };
}

export interface ReviewDue { id: string; title: string; lesson_id: string; days_since: number; overdue_days: number; interval: number; in_progress: boolean }
export interface ReviewSet { id: string; title: string; questions: Array<{ id: string; question_text: string; type: string; options: string[]; answered: boolean }> }
export interface ReviewResult { correct: boolean; feedback_text: string; model_answer: string; finished: boolean; passed?: boolean; next_in_days?: number }

/* -- board syllabus, doubts, tests, games, notifications ------------------ */

export type Board = "CBSE" | "ICSE";
export type TopicState = "not_started" | "started" | "completed";

export interface SyllabusTopic {
  id: string;
  number: string;
  title: string;
  state: TopicState;
  score: number | null;
  lesson_id: string | null;
  lesson_status: LessonStatus | null;
  completed_at: string | null;
}
export interface SyllabusChapter { id: string; number: number; title: string; topics: SyllabusTopic[]; done: number; total: number; state: TopicState }
export interface SyllabusSubject {
  revise?: Array<{ id: string; title: string; chapter: string; reason: "doubt" | "low_score"; score: number | null }>;
  avg_score?: number | null; suggested_level?: "beginner" | "intermediate" | "advanced";
  id: string; name: string; chapters: SyllabusChapter[]; done: number; total: number; pct: number; started: boolean;
  next: { id: string; title: string; chapter: string } | null;
}
export interface SyllabusPath { board: Board | null; grade: string | null; configured: boolean; subjects: SyllabusSubject[]; done?: number; total?: number; pct?: number }
export interface BoardsInfo { boards: Board[]; grades: string[]; subjects: Record<string, Record<string, string[]>> }

export interface Person { id: string; full_name: string; initials: string; avatar_color: string; email?: string; board?: string | null; grade?: string | null }

export interface AgentStep { agent: string; did: string }
export interface DoubtMessage {
  id: string; role: "student" | "ai" | "teacher" | "system"; kind: "text" | "notes" | "video" | "live"; body: string;
  sender_id: string | null; attachment_name: string | null; has_attachment: boolean; expired: boolean;
  expires_at: string | null; scheduled_at: string | null; meeting_url: string | null; created_at: string;
  meta: { attempt?: number; kind?: string; engine?: string; check?: string; check_answer?: string; trace?: AgentStep[]; max_tries?: number; duration_min?: number; escalated_to?: string; confused?: boolean };
}
export type DoubtStatus = "open" | "escalated" | "answered" | "resolved";
export interface DoubtThread {
  id: string; kind: "doubt" | "chat"; subject: string | null; topic: string | null; lesson_id: string | null;
  question: string | null; chapter: string | null; board: string | null; grade: string | null;
  escalated_at: string | null; resolved_at: string | null;
  status: DoubtStatus; ai_attempts: number; max_ai_tries: number; student: Person | null; teacher: Person | null;
  created_at: string; updated_at: string; last: DoubtMessage | null; messages?: DoubtMessage[];
}

export interface MyTeachers { mentor: Person | null; subjects: Array<{ subject: string; teacher: Person | null }> }

export interface TestQuestion { id: string; text: string; type: "mcq" | "msq"; options: string[]; answer?: number[]; topic: string; marks: number }
export interface ClassTest {
  id: string; board: Board; grade: string; subject: string; title: string; duration_min: number; due_at: string | null; created_at: string;
  question_count: number; max_score: number; questions?: TestQuestion[]; teacher: { id: string; full_name: string } | null;
  attempt: { score: number; max_score: number; pct: number; submitted_at: string } | null;
  attempts?: number; avg_pct?: number | null;
}
export interface LeaderRow {
  rank: number; id: string; full_name: string; initials: string; avatar_color: string; me: boolean;
  pct?: number | null; points?: number; score?: number; max_score?: number; time_taken_sec?: number;
  games?: number; stars?: number; tier?: "Bronze" | "Silver" | "Gold" | "Diamond"; accuracy?: number | null; tests_taken?: number;
}
export interface StudentTestReport {
  test: ClassTest; class: { attempts: number; avg_pct: number; top_pct: number; distribution: number[] };
  rank: number; of: number; percentile: number; time_taken_sec: number;
  questions: Array<{ id: string; text: string; type: "mcq" | "msq"; options: string[]; answer: number[]; picked: number[]; marks: number; got: number; correct: boolean; topic: string }>;
  topics: Array<{ topic: string; pct: number }>; weak_topics: string[]; strong_topics: string[];
}
export interface TeacherTestReport {
  test: ClassTest; class: { attempts: number; avg_pct: number; top_pct: number; distribution: number[] };
  questions: Array<{ id: string; text: string; topic: string; correct_pct: number; common_wrong: Array<[string, number]> }>;
  students: Array<LeaderRow & { weak_topics: string[]; strong_topics: string[]; wrong: string[] }>;
  not_attempted: string[]; topics: Array<{ topic: string; pct: number }>; needs_help: Array<LeaderRow>;
}

export interface SubjectProgress { done: number; total: number; pct: number; avg_score: number | null; next: string | null; chapters: Array<{ title: string; done: number; total: number }> }
export interface TeacherStudent extends Person {
  subjects: string[]; is_mentor: boolean; progress: Record<string, SubjectProgress>; overall_pct: number;
  test_avg: number | null; tests_taken: number; open_doubts: number; doubts_total: number; last_login_at: string | null;
  focus_score: number; focus_level: "high" | "medium" | "low"; focus_reasons: string[];
}
export interface Teaching { board: Board; grade: string; subject: string }
export interface TeacherStudents {
  total: number; summary: { total: number; high: number; medium: number; avg_progress: number; open_doubts: number };
  students: TeacherStudent[]; classes: string[]; subjects: string[]; teaching: Teaching[]; class_teacher_of: string[] }
export interface TeacherStudentDetail {
  student: TeacherStudent; path: SyllabusPath;
  tests: Array<{ test_id: string; title: string; subject: string; score: number; max_score: number; pct: number; submitted_at: string }>;
  games: Array<{ subject: string; points: number; accuracy: number | null }>;
  doubts: Array<{ id: string; subject: string | null; topic: string | null; status: DoubtStatus; ai_attempts: number; updated_at: string }>;
}

export interface AppNotification { id: string; kind: string; title: string; body: string; link: string | null; read: boolean; created_at: string }

export interface DoubtQuery {
  kind?: string; status?: string; board?: string; grade?: string; subject?: string; chapter?: string; topic?: string;
  student_id?: string; q?: string; sort?: "recent" | "oldest"; limit?: number; offset?: number;
}
export type Facet = { value: string; count: number; label?: string };
export interface DoubtStats {
  with_ai: number; open: number; in_progress: number; completed: number; total: number; oldest_wait_hours: number;
  subjects: Facet[]; classes: Facet[]; chapters: Facet[]; topics: Facet[]; students: Facet[];
}
export interface TeacherOverview {
  subject: string | null; subjects: string[]; classes: string[]; class_teacher_of: string[];
  students: number; mentees: number; avg_progress: number;
  doubts: { open: number; in_progress: number; completed: number; with_ai: number };
  hot_topics: Array<{ subject: string | null; topic: string; count: number }>;
  focus: TeacherStudent[];
  tests: { count: number; attempts: number; avg_pct: number | null };
}

export type StageGame = "quiz" | "truefalse" | "match" | "oddone";
export interface JourneyStage { id: string; title: string; number: string; game: StageGame; stars: number; done: boolean; unlocked: boolean }
export interface JourneyLevel { id: string; number: number; title: string; stages: JourneyStage[]; stars: number; max_stars: number; done: boolean; unlocked: boolean }
export interface Journey2 { subject: string; levels: JourneyLevel[]; coins: number; hint_price: number; total_chapters: number; demo_chapters: number }
export interface GameBoard { rows: LeaderRow[]; me: LeaderRow | null; board: string; grade: string; gap: { name: string; points: number } | null }
export interface TestBoard { title: string; rows: LeaderRow[]; me: LeaderRow | null; due_at: string | null; final: boolean; submitted: number; class_size: number; duration_min: number }
