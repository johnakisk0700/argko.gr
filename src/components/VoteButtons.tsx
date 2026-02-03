import { useState } from "react";
import { ArrowBigUp, ArrowBigDown } from "lucide-react";
import { Button } from "./ui/button";
import { CardAction } from "./ui/card";
import { authClient } from "@/lib/auth-client";

interface VoteButtonsProps {
  definitionId: number;
  initialVotes?: number;
  initialUserVote?: "up" | "down" | null;
}

export default function VoteButtons({
  definitionId,
  initialVotes = 0,
  initialUserVote = null,
}: VoteButtonsProps) {
  const [votes, setVotes] = useState(initialVotes);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(
    initialUserVote,
  );
  const { data: session } = authClient.useSession();

  // Vote colors
  const upvoteColors = {
    bg: "bg-lime-100 dark:bg-lime-900",
    arrow: "fill-lime-500 text-lime-500",
  };

  const downvoteColors = {
    bg: "bg-red-100 dark:bg-red-900",
    arrow: "fill-red-500 text-red-500",
  };

  const sendVote = async (type: "up" | "down" | "remove") => {
    if (!session) {
      // TODO: Show login modal or redirect
      alert("Πρέπει να είσαι συνδεδεμένος για να ψηφίσεις!");
      return;
    }

    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          definitionId,
          voteType: type,
        }),
      });
    } catch (error) {
      console.error("Failed to vote:", error);
      // Ideally revert state here, but for now we keep it optimistic
    }
  };

  const handleUpvote = () => {
    if (!session) {
      alert("Πρέπει να είσαι συνδεδεμένος για να ψηφίσεις!");
      return;
    }

    if (userVote === "up") {
      // Remove upvote
      setVotes(votes - 1);
      setUserVote(null);
      sendVote("remove");
    } else if (userVote === "down") {
      // Change from downvote to upvote
      setVotes(votes + 2);
      setUserVote("up");
      sendVote("up");
    } else {
      // New upvote
      setVotes(votes + 1);
      setUserVote("up");
      sendVote("up");
    }
  };

  const handleDownvote = () => {
    if (!session) {
      alert("Πρέπει να είσαι συνδεδεμένος για να ψηφίσεις!");
      return;
    }

    if (userVote === "down") {
      // Remove downvote
      setVotes(votes + 1);
      setUserVote(null);
      sendVote("remove");
    } else if (userVote === "up") {
      // Change from upvote to downvote
      setVotes(votes - 2);
      setUserVote("down");
      sendVote("down");
    } else {
      // New downvote
      setVotes(votes - 1);
      setUserVote("down");
      sendVote("down");
    }
  };

  return (
    <CardAction
      className={`flex items-center justify-center rounded-full p-0.5 gap-1  ${
        userVote === "up"
          ? upvoteColors.bg
          : userVote === "down"
            ? downvoteColors.bg
            : "bg-secondary-foreground/20"
      }`}
    >
      <Button
        onClick={handleUpvote}
        variant="ghost"
        size="icon"
        className="rounded-full [&_svg:not([class*='size-'])]:size-4.5"
      >
        <ArrowBigUp className={userVote === "up" ? upvoteColors.arrow : ""} />
      </Button>

      <span className="text-sm font-medium min-w-5 text-center">{votes}</span>

      <Button
        onClick={handleDownvote}
        variant="ghost"
        size="icon"
        className="rounded-full [&_svg:not([class*='size-'])]:size-4.5"
      >
        <ArrowBigDown
          className={userVote === "down" ? downvoteColors.arrow : ""}
        />
      </Button>
    </CardAction>
  );
}
