import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VoteButtons from "./VoteButtons";
import { Quote } from "lucide-react";

interface ReferencedTerm {
  term: string;
  slug: string;
}

interface TermCardProps {
  term: string;
  definitionId: number;
  title: string;
  example?: string;
  submittedBy?: string;
  initialVotes?: number;
  initialUserVote?: "up" | "down" | null;
  references?: ReferencedTerm[];
}

/**
 * Renders text with preserved line breaks and dialogue formatting
 */
function renderTextWithLineBreaks(text: string): React.ReactNode {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        const isDialogue = line.trim().startsWith("-");
        line = line.replace("-", "");
        return (
          <span key={i}>
            {isDialogue ? (
              <span className="flex items-start pl-2 border-muted-foreground/30">
                <span className="shrink-0 mr-1.5 text-muted-foreground leading-none mt-0.5">
                  –
                </span>
                {line}
              </span>
            ) : (
              line
            )}
            {i < lines.length - 1 && <div className="my-2" />}
          </span>
        );
      })}
    </>
  );
}

export default function TermCard({
  term,
  definitionId,
  title,
  example = "<παράδειγμα λείπει>",
  submittedBy,
  initialVotes = 0,
  initialUserVote = null,
  references = [],
}: TermCardProps) {
  return (
    <Card className="gap-0 relative mb-6">
      <CardContent className="pt-7.5 grid gap-4.5 mb-6">
        {/* Term badge at top - "clippy" style */}
        <div className="absolute top-1 left-5">
          <span className="bg-lime-400/15 text-lime-700 dark:text-lime-400 px-3.5 py-2 rounded-b-lg text-lg font-semibold border border-lime-400/30">
            {term}
          </span>
        </div>

        {/* Definition - clean, no background */}
        <div className="">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Ορισμός:
          </p>
          <p className="text-sm leading-relaxed font-medium">{title}</p>
        </div>

        {/* Example with label */}
        <div className="">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide  mb-1 ">
            Παράδειγμα:
          </p>
          <div className="italic text-sm text-secondary-foreground/80 pl-3 border-l-2 border-muted-foreground/20">
            {renderTextWithLineBreaks(example)}
          </div>
        </div>

        {/* Related terms with label */}
        {references.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Σχετικοί όροι:
            </p>
            <div className="flex flex-wrap gap-0.5">
              {references.map((ref) => (
                <a key={ref.slug} href={`/terms/${ref.slug}`}>
                  <Badge
                    variant="secondary"
                    className="hover:bg-lime-400/80 cursor-pointer text-[0.75rem] px-2.5 py-1"
                  >
                    {ref.term}
                  </Badge>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center border-t">
        <VoteButtons
          definitionId={definitionId}
          initialVotes={initialVotes}
          initialUserVote={initialUserVote}
        />
        {submittedBy && (
          <span className="text-xs text-muted-foreground">
            Υποβλήθηκε από: <span className="font-medium">{submittedBy}</span>
          </span>
        )}
      </CardFooter>
    </Card>
  );
}
