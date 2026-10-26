import { Brain, ClipboardList, Gauge, GraduationCap, Hand, LayoutDashboard, MessageCircleQuestion, Radio, School, Server, Sparkles, Users } from "lucide-react";
import type { MessageKey } from "@/core/i18n";
import type { User } from "@/core/types";

export type TeacherTab = "home" | "doubts" | "students" | "tests";
export type AdminTab = "overview" | "teachers" | "learners" | "doubts" | "live" | "escalations" | "insights" | "quality" | "pipeline";
export type StaffTab = AdminTab;

type Tab<T> = { v: T; k: MessageKey; icon: React.ReactNode };
const I = "h-[18px] w-[18px]";

/** The teacher's desk: their students, their subject's doubts, their tests. */
export const TEACHER_TABS: Array<Tab<TeacherTab>> = [
  { v: "home", k: "teacher.home", icon: <LayoutDashboard className={I} /> },
  { v: "doubts", k: "admin.doubts", icon: <MessageCircleQuestion className={I} /> },
  { v: "students", k: "admin.students", icon: <GraduationCap className={I} /> },
  { v: "tests", k: "admin.tests", icon: <ClipboardList className={I} /> },
];

/** The admin portal: the whole school, teachers and the system. */
export const ADMIN_TABS: Array<Tab<AdminTab>> = [
  { v: "overview", k: "admin.overview", icon: <Gauge className={I} /> },
  { v: "teachers", k: "admin.teachers", icon: <School className={I} /> },
  { v: "learners", k: "admin.users", icon: <Users className={I} /> },
  { v: "doubts", k: "admin.doubts", icon: <MessageCircleQuestion className={I} /> },
  { v: "live", k: "admin.live", icon: <Radio className={I} /> },
  { v: "escalations", k: "admin.escalations", icon: <Hand className={I} /> },
  { v: "insights", k: "admin.insights", icon: <Brain className={I} /> },
  { v: "quality", k: "admin.quality", icon: <Sparkles className={I} /> },
  { v: "pipeline", k: "admin.pipeline", icon: <Server className={I} /> },
];

export const isStaff = (u?: Pick<User, "role"> | null) => u?.role === "admin" || u?.role === "teacher";
export const isTeacher = (u?: Pick<User, "role"> | null) => u?.role === "teacher";
export const isAdmin = (u?: Pick<User, "role"> | null) => u?.role === "admin";
export const tabsFor = (_u?: Pick<User, "role"> | null) => ADMIN_TABS;

/** Where each role lands after signing in. */
export const portalFor = (u?: Pick<User, "role"> | null) => (u?.role === "admin" ? "/admin" : u?.role === "teacher" ? "/teacher" : "/dashboard");

/** Pages that only make sense for a learner; staff are sent to their own home. */
export const LEARNER_ONLY = ["/dashboard", "/new", "/lessons", "/progress", "/learn", "/review", "/report", "/tests", "/doubts", "/path"];
