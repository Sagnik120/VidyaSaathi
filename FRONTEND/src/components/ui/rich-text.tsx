"use client";

/** Light markdown: **bold**, numbered / bulleted lines, paragraphs. */
export function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, j) =>
            part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part.startsWith("*") && part.length > 2 ? <em key={j}>{part.slice(1, -1)}</em> : part)}
        </p>
      ))}
    </div>
  );
}
