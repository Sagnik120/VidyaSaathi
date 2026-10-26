# Gemini prompts for the VidyaSaathi diagrams (v3: standalone)

Each prompt below is **complete on its own**: style, colours, layout and every label are included.

**How to use**
1. Open a **new Gemini chat** for each diagram.
2. Copy **one** prompt block, paste it, and send.
3. Compare the result with the **Check** list under the prompt. If one thing is off, reply only: *"Keep everything else exactly the same. Only change: …"*
4. If the text looks soft, reply: *"Same image, sharper text."*

| # | Diagram | Deck slide |
|---|---|---|
| 1 | Learner model | new slide after "Five signals build a live picture of each student" |
| 2 | Student journey | "A student's journey through VidyaSaathi" |
| 3 | System architecture | "Overall architecture" |
| 4 | Adaptive teaching engine | "Adaptive teaching engine" |
| 5 | Doubt resolution + teacher escalation | "Doubt resolution and teacher escalation" |

---

## 1 · Learner model (signals in → decisions out)

```
Create ONE flat, clean, presentation-ready diagram image for a PowerPoint slide.

CONTEXT: VidyaSaathi is an adaptive learning app for Indian school students in Classes 6 to 10. This diagram shows how the app builds a picture of each student from five signals and turns it into decisions for the student, for practice and for the teacher.

HARD RULES
1. Landscape 16:9, clear empty margin on all four sides.
2. NO heading or title text anywhere. Start directly with the diagram.
3. Use ONLY the words given in quotes below, spelled exactly. No other words, no logos, no watermark, no people or animal drawings.
4. Nothing overlaps: no box over a box, no arrow through text or through a box.
5. All text horizontal. Labels bold and large, descriptions regular and smaller, nothing tiny.
6. Boxes in the same column have identical width and height and equal spacing.

STYLE
- Background: plain flat warm off-white #FBFAF6 (no grid, no texture).
- Text and arrows: ink navy #1E2942.
- Blue = student signals: border #3B66AE, fill #DFEAF9.
- Marigold = student decisions: border #F0C35A, fill #FFF9E8.
- Sage green = practice decisions: border #5F9474, fill #E3F0E7.
- Coral = teacher decisions: border #E5917F, fill #FBE7E2.
- Rounded rectangles, 2px borders, very soft shadow, flat vector, no 3D, no gradients.
- Simple thin-line icons (Lucide style) in navy. Clean sans-serif font (Inter or Poppins).

LAYOUT: three columns, hub-and-spoke.

LEFT COLUMN: small uppercase column label "SIGNALS IN" above 5 identical blue boxes stacked vertically:
  "Placement check" (icon: clipboard-check)
  "Lesson checkpoints" (icon: help-circle)
  "Doubts asked" (icon: message-circle)
  "Tests & practice scores" (icon: bar-chart)
  "Activity & streaks" (icon: flame)
From the right edge of each box, ONE straight navy arrow points into the left side of the centre circle (5 arrows total, fanning in, not crossing each other).

CENTRE: one large circle filled ink navy #1E2942. Inside it, in white:
  a small brain icon at the top,
  bold "Learner model",
  then four short lines: "mastery per concept", "difficulty level 1-5", "weak concepts", "review due dates".

RIGHT COLUMN: small uppercase column label "DECISIONS OUT" above 3 grouped containers stacked vertically. From the right side of the circle, ONE navy arrow goes to the left edge of each container (3 arrows total).
  Marigold container, bold header "For the student", three rows inside: "What to learn next", "How it is explained", "How fast to go".
  Sage container, bold header "For practice", two rows inside: "Targeted questions", "Spaced review dates".
  Coral container, bold header "For the teacher", two rows inside: "Focus score 0-100 with reasons", "Topic-wise class report".

TOTAL: 5 signal boxes, 1 circle, 3 containers, 8 arrows. Nothing else.
```

**Check:** no title at top · 5 arrows in, 3 arrows out · nothing crosses the circle text.

---

## 2 · Student journey

```
Create ONE flat, clean, presentation-ready flow diagram image for a PowerPoint slide.

CONTEXT: VidyaSaathi is an adaptive learning app for Indian school students in Classes 6 to 10 (CBSE and ICSE boards). This diagram shows a student's journey through the app, and where the teacher steps in.

HARD RULES
1. Landscape 16:9, clear empty margin on all four sides.
2. NO heading or title text anywhere. Start directly with the diagram.
3. Use ONLY the words given in quotes below, spelled exactly. No other words, no logos, no watermark. NO snakes, animals, people, characters or decorative drawings of any kind.
4. Nothing overlaps: no box over a box, no arrow through text or through a box, no arrow crossing another arrow.
5. Each step number appears ONCE, as a small white circle badge with a navy number on the box's top-left corner. Do NOT repeat the number inside the label.
6. Every arrow starts on the edge of one box and its arrowhead touches the edge of the named target box, pointing exactly the stated direction.
7. All text horizontal. Labels bold, descriptions smaller and regular, nothing tiny.
8. Boxes in a row have identical size and equal spacing, on a strict grid.

STYLE
- Background: plain flat warm off-white #FBFAF6 (no grid, no texture).
- Text and arrows: ink navy #1E2942. Descriptions: #4A5671.
- Step boxes: blue border #3B66AE, light blue fill #DFEAF9.
- Decision diamond and "simpler" box: marigold border #F0C35A, fill #FFF9E8.
- Success: sage green border #5F9474, fill #E3F0E7.
- Teacher: coral border #E5917F, fill #FBE7E2.
- Rounded rectangles, 2px borders, soft shadow, flat vector, no 3D, no gradients.
- Thin-line navy icons (Lucide style) at the top of each box. Clean sans-serif font (Inter or Poppins).
- Description text sits INSIDE its box, under the label.

LAYOUT: two horizontal rows that BOTH read left to right, then a teacher strip at the bottom.

ROW 1 (top): 5 blue boxes in one straight line, joined by navy arrows pointing RIGHT (1→2→3→4→5):
  badge "1": "Sign up" / "Pick board (CBSE / ICSE), class 6-10 and language" / icon: user-plus
  badge "2": "Placement check" / "~6 questions find the starting level" / icon: clipboard-check
  badge "3": "Learning path" / "Chapter → topic in textbook order; known topics skipped" / icon: map
  badge "4": "Video lesson" / "Avatar teacher + visual boards, English or Hindi" / icon: play-circle
  badge "5": "Checkpoint" / "Lesson pauses with a quick question" / icon: help-circle
To the right of box 5: a marigold diamond with "Understood?" (arrow from box 5 pointing RIGHT into it).
  From the diamond's top-right: arrow labelled "Yes" going UP-RIGHT into a small sage box "Go deeper".
  From the diamond's bottom-right: arrow labelled "No" going DOWN-RIGHT into a small marigold box "Simpler re-explain".
  From the bottom of "Simpler re-explain": ONE dashed navy arrow that runs LEFT in the gap between the rows and ends pointing UP into the bottom of box 4. Label it "retry".

CONNECTOR: from the right edge of "Go deeper", one solid navy arrow goes down along the right margin, then LEFT along the bottom of the gap between the rows (below the "retry" arrow, never touching it), and ends pointing DOWN into the top of box 6. Label it "next step".

ROW 2 (middle): 4 blue boxes in one straight line, left-aligned under boxes 1-4, joined by navy arrows pointing RIGHT (6→7→8→9):
  badge "6": "Ask a doubt" / "AI doubt agents answer at class level" / icon: message-circle-question
  badge "7": "Practice & games" / "Aimed at weakest concepts; simulations" / icon: flask-conical
  badge "8": "Class test" / "Teacher-built MCQ / MSQ with topic report" / icon: clipboard-list
  badge "9": "Spaced review" / "Concepts return after 2, 5, 12, 30, 60 days" / icon: refresh-cw
From the right edge of box 9: one dashed sage-green arrow going RIGHT then UP into the right side of a small sage pill "Path updates with mastery", placed to the right of box 9. (Do not draw any long arrow back to Row 1.)

TEACHER STRIP (bottom): a full-width light coral band with a small uppercase label "TEACHER" at its left end, horizontal text.
  Inside it, directly under box 6: coral box "Subject teacher replies" / "text, notes, video or live class" / icon: presentation.
  Exactly ONE coral arrow goes straight DOWN from the bottom of box 6 to the top of this box, labelled "after 3 tries".
  Inside it, directly under box 8: coral box "Teacher sees results" / "who needs help, on which topic" / icon: users.
  Exactly ONE coral arrow goes straight DOWN from the bottom of box 8 to the top of this box.

TOTAL: 9 numbered blue boxes, 1 diamond, "Go deeper", "Simpler re-explain", 1 sage pill, 2 coral teacher boxes. Nothing else.
```

**Check:** both rows read left→right · numbers 1–9 appear once each · no snake · "retry" goes into box 4 · one arrow into each teacher box.

---

## 3 · System architecture

```
Create ONE flat, clean, presentation-ready layered software architecture diagram image for a PowerPoint slide.

CONTEXT: VidyaSaathi is an adaptive learning platform for Indian school students in Classes 6 to 10, their teachers and the school admin. This diagram shows its system architecture in four horizontal layers.

HARD RULES
1. Landscape 16:9, clear empty margin on all four sides.
2. NO heading or title text anywhere. Start directly with the diagram.
3. Use ONLY the words given in quotes below, spelled exactly. No other words, no logos, no watermark, no people drawings.
4. Nothing overlaps: no box over a box, no arrow through text or through a box, no two arrows crossing.
5. Every arrow starts on the edge of one box and its arrowhead touches the edge of the named target box.
6. Layer labels sit at the LEFT end of each layer in a narrow label column, written horizontally (not rotated): a small grey "LAYER n" above a bold uppercase name.
7. Boxes in the same layer have identical height and equal spacing.
8. All text horizontal, nothing tiny.

STYLE
- Background: plain flat warm off-white #FBFAF6 (no grid, no texture).
- Text and arrows: ink navy #1E2942. Descriptions: #4A5671.
- Each layer is a full-width rounded container:
  Layer 1: white with light border #E7E3D8.
  Layer 2: light blue fill #DFEAF9, border #3B66AE.
  Layer 3: white with navy border.
  Layer 4: light sage fill #E3F0E7, border #5F9474.
- Service box colours: marigold (border #F0C35A, fill #FFF9E8) for AI; blue (border #3B66AE, fill #DFEAF9) for content and media; coral (border #E5917F, fill #FBE7E2) for teacher.
- Rounded rectangles, 2px borders, soft shadow, flat vector, no 3D, no gradients. Thin-line navy icons (Lucide style). Clean sans-serif (Inter or Poppins).

LAYER 1 "USERS": three white cards side by side, each with a coloured round icon:
  "Student" / "Class 6-10" (blue icon: graduation-cap)
  "Teacher" / "Subject & class teacher" (coral icon: presentation)
  "School admin" / "Assigns teachers" (sage icon: school)

One navy arrow DOWN from Layer 1 to Layer 2.

LAYER 2 "APPS": two cards side by side:
  "Web app" / "Next.js · React · English / हिन्दी" (icon: monitor)
  "Mobile app" / "Android & iOS · React Native (Expo)" (icon: smartphone)

One navy double-headed arrow between Layer 2 and Layer 3, labelled "REST + WebSocket (live lessons)".

LAYER 3 "BACKEND & AI": the tallest layer.
  Top row: one full-width dark navy bar (#1E2942) with white text "API gateway · FastAPI · Login (JWT + OTP) · Notifications".
  Middle: a small marigold pill centred above the first two service boxes: "LLM: Google Gemini + offline fallback teacher".
  Bottom row: five equal service boxes:
    "Adaptive teaching engine" / "7-step loop · difficulty 1-5" (marigold, icon: sliders)
    "Doubt agents" / "Listener · Librarian · Tutor · Checker" (marigold, icon: message-circle-question)
    "Syllabus grounding (RAG)" / "BGE-M3 hybrid search · reranker" (blue, icon: book-open)
    "Media engine" / "Voice · avatar · visual boards · FFmpeg" (blue, icon: video)
    "Teacher & school services" / "Focus score · tests · escalations" (coral, icon: users)
  Connections in Layer 3 (exactly these three, all drawn BELOW the service boxes as short curved arrows so they cross nothing):
    "Adaptive teaching engine" → "Media engine", labelled "lesson script"
    "Doubt agents" → "Teacher & school services", labelled "escalate after 3 tries" (coral arrow)
    "Doubt agents" ↔ "Syllabus grounding (RAG)" (short double-headed arrow between these two adjacent boxes, no label)
  Right edge of Layer 3: a narrow sage pill with an eye icon and horizontal text "Why? log & agent trace".

One navy double-headed arrow between Layer 3 and Layer 4.

LAYER 4 "DATA": four items side by side, each a navy database-cylinder icon with text to its right:
  "Learner database" / "mastery · paths · tests · doubts"
  "Vector store" / "CBSE / ICSE syllabus content"
  "Media store" / "lessons · teacher videos (7-day expiry)"
  "Syllabus map" / "560 chapters · ~1,580 topics"

TOTAL: 4 layers, 3 user cards, 2 app cards, 1 gateway bar, 1 pill, 5 service boxes, 1 side pill, 4 data items. Nothing else.
```

**Check:** layer labels horizontal · the "escalate" arrow ends at Teacher & school services · no arrows crossing.

---

## 4 · Adaptive teaching engine

```
Create ONE flat, clean, presentation-ready process diagram image for a PowerPoint slide.

CONTEXT: VidyaSaathi is an adaptive learning app for Indian school students in Classes 6 to 10. This diagram shows the 7-step teaching loop that runs inside every lesson, and how it adapts when a student answers right or wrong.

HARD RULES
1. Landscape 16:9, clear empty margin on all four sides.
2. NO heading or title text anywhere. Start directly with the diagram.
3. Use ONLY the words given in quotes below, spelled exactly. No other words, no logos, no watermark, no people or animal drawings.
4. Nothing overlaps: no box over a box, no arrow through text or through a box, no two arrows crossing.
5. The 7 steps are in ONE STRAIGHT HORIZONTAL ROW (NOT a circle), read left to right.
6. Each step number appears ONCE, as a small white circle badge with a navy number on the box's top-left corner. Do NOT repeat the number in the label.
7. Every arrow starts on the edge of one box and its arrowhead touches the edge of the named target, pointing exactly the stated direction.
8. All text horizontal. Labels bold, descriptions smaller and regular, nothing tiny.

STYLE
- Background: plain flat warm off-white #FBFAF6 (no grid, no texture).
- Text and arrows: ink navy #1E2942. Descriptions: #4A5671.
- Step boxes: white fill, navy 2px border.
- Inputs: blue border #3B66AE, fill #DFEAF9.
- "Adapt" step and wrong-answer ladder: marigold #F0C35A (fill #FFF9E8 for the light ones).
- Right answer: sage green border #5F9474, fill #E3F0E7.
- Teacher: coral border #E5917F, fill #FBE7E2.
- Rounded rectangles, soft shadow, flat vector, no 3D, no gradients. Thin-line navy icons (Lucide style). Clean sans-serif (Inter or Poppins).

TOP-LEFT: a small blue container labelled "INPUTS" (uppercase) with three small stacked boxes:
  "Placement result" (icon: clipboard-check), "Concept mastery" (icon: pie-chart), "Board + class syllabus" (icon: book-open).
  ONE navy arrow from the right edge of the INPUTS container to the left edge of step 1.

MAIN ROW, to the right of INPUTS: 7 step boxes in one straight horizontal line, each joined to the next by a navy arrow pointing RIGHT (1→2→3→4→5→6→7):
  badge "1": "Understand" / "what the student knows" / icon: search
  badge "2": "Plan" / "lesson from goal + mastery" / icon: map
  badge "3": "Explain" / "video at current level" / icon: play-circle
  badge "4": "Question" / "in-lesson checkpoint" / icon: help-circle
  badge "5": "Evaluate" / "grade + spot misconceptions" / icon: check-square
  badge "6": "Adapt" / "change level, style, pace" / icon: sliders. This box is slightly larger, filled solid marigold #F0C35A, with a thick navy border.
  badge "7": "Continue" / "next part or next topic" / icon: arrow-right

RETURN LOOP: ONE dashed navy arrow leaves the TOP of step 7, arcs left ABOVE the main row, and ends pointing DOWN into the top of step 2. Label it at the top of the arc: "repeat until the topic is mastered".

BELOW STEP 6: two arrows go down from the bottom of step 6 into two panels side by side:
  Left arrow, sage, labelled "right": into a sage panel with header "IF RIGHT" containing one box "Step up: harder, deeper" and the caption "after 2 right in a row".
  Right arrow, marigold, labelled "wrong": into a marigold panel with header "IF WRONG" containing three boxes stacked top to bottom, joined by short downward arrows:
    "Re-explain with a new Indian example" (light marigold) — caption to its right "1st miss"
    "Rebuild from the prerequisite" (light marigold, thicker border) — caption "still wrong"
    "Hand to the teacher" (coral) — caption "still stuck"

BOTTOM-LEFT (under steps 1-3): a light blue panel with bold "Live difficulty level" and five small circles in a row numbered "1" "2" "3" "4" "5", the first three filled blue.
BOTTOM-CENTRE (under steps 3-5): a white note card with a lightbulb icon, bold "Why? log" and then "every change explained in plain words".

TOTAL: 3 input boxes, 7 step boxes, 2 panels (1 + 3 boxes), 1 difficulty panel, 1 note card. Nothing else.
```

**Check:** steps run 1→7 left to right · the loop goes from 7 back to 2 · "Step up" is only in IF RIGHT · numbers appear once.

---

## 5 · Doubt resolution with teacher escalation

```
Create ONE flat, clean, presentation-ready flow diagram image for a PowerPoint slide.

CONTEXT: VidyaSaathi is an adaptive learning app for Indian school students in Classes 6 to 10. When a student asks a doubt during a lesson, a team of four AI agents answers it at the student's class level, getting simpler on each try. After 3 tries the doubt goes to the student's own subject teacher.

HARD RULES
1. Landscape 16:9, clear empty margin on all four sides.
2. NO heading or title text anywhere. Start directly with the diagram.
3. Use ONLY the words given in quotes below, spelled exactly. No other words, no logos, no watermark, no decorative drawings.
4. Nothing overlaps: no box over a box, no tag over a tag, no arrow through text or through a box, no two arrows crossing.
5. Each agent number appears ONCE, as a small white circle badge with a navy number on the box's top-left corner. Do NOT repeat the number in the label.
6. Every arrow starts on the edge of one element and its arrowhead touches the edge of the named target, pointing exactly the stated direction.
7. All text horizontal. Labels bold, descriptions smaller and regular, nothing tiny.
8. The four agent boxes have identical size and equal spacing.

STYLE
- Background: plain flat warm off-white #FBFAF6 (no grid, no texture).
- Text and arrows: ink navy #1E2942. Descriptions: #4A5671.
- Student: blue border #3B66AE, fill #DFEAF9.
- AI agents and decision: marigold border #F0C35A, fill #FFF9E8.
- Success: sage green border #5F9474, fill #E3F0E7.
- Teacher: coral border #E5917F, fill #FBE7E2.
- Rounded rectangles, 2px borders, soft shadow, flat vector, no 3D, no gradients. Thin-line navy icons (Lucide style). Clean sans-serif (Inter or Poppins).

TOP ROW, left to right, all on one horizontal line:
  1) Far left: a blue speech-bubble box "Why does ice float on water?" with a small simple blue person icon under it, and the caption below "asked mid-lesson in English, Hindi or Hinglish".
  2) Four marigold agent boxes, each with icon, bold label and a short description inside:
     badge "1": "Listener" / "what kind of doubt: meaning, why, how, example, numerical" / icon: ear
     badge "2": "Librarian" / "board, class, chapter + what this lesson said" / icon: book-open
     badge "3": "Tutor" / "explains at the student's class level" / icon: sparkles
     badge "4": "Checker" / "ends with one tiny self-test question" / icon: check-circle
  3) A marigold diamond "Clear now?".
  4) Far right: a sage box "Back to the lesson" with a check icon.
  Arrows, all navy and pointing RIGHT: speech bubble → Listener → Librarian → Tutor → Checker → diamond. From the diamond, a sage arrow labelled "Yes" pointing RIGHT into "Back to the lesson".

BELOW the Librarian and Tutor boxes: a small blue database cylinder "Syllabus content (RAG)". ONE short navy arrow goes UP from it into the bottom of "Tutor".

ABOVE the top row: ONE dashed navy arrow leaves the TOP of the diamond, arcs left above the Checker box, and ends pointing DOWN into the top of "Tutor". Label it "No: try again, simpler".
  Above this arc (not touching it), three separate small marigold tags in one horizontal row with clear gaps between them:
  "Try 1: direct answer"   "Try 2: step by step with an Indian example"   "Try 3: from the most basic idea"

ESCALATION (bottom right): ONE thick coral arrow goes straight DOWN from the bottom of the diamond, labelled "after 3 tries", into the top of a coral container with the bold header "TEACHER (human in the loop)".
  Inside the container, left to right:
    a coral box "Doubt inbox" / "full conversation + lesson context",
    ONE arrow pointing RIGHT from it, splitting into three branches, each ending in one of three small coral boxes stacked vertically or side by side:
    "Text / notes"   "Recorded video (deleted after 7 days)"   "Live class"
  From the left edge of the TEACHER container: ONE coral arrow runs LEFT along the bottom of the image and then UP into the bottom of the student's person icon. Label it "answer + notification". It must pass below the RAG cylinder without touching it.

BOTTOM-LEFT CORNER, a small sage note (not touching any arrow): "Unresolved doubts raise the student on the teacher's focus list".

TOTAL: 1 speech bubble, 4 agent boxes, 1 diamond, 1 sage box, 1 cylinder, 3 tags, 1 teacher container with 4 boxes, 1 note. Nothing else.
```

**Check:** the three Try tags are separate · the dashed loop goes from the diamond into Tutor · the return arrow doesn't cross the cylinder or the note.
