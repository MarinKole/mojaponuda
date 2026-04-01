"use client";

import { useEffect, useState } from "react";
import { FollowButton } from "./opportunity-actions";

interface Props {
  opportunityId: string;
  signupHref: string;
}

export function OpportunityActionsWrapper({ opportunityId, signupHref }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`/api/opportunities/${opportunityId}/follow`)
      .then((r) => {
        if (r.status === 401) setIsLoggedIn(false);
        else setIsLoggedIn(true);
      })
      .catch(() => setIsLoggedIn(false));
  }, [opportunityId]);

  if (isLoggedIn === null) return null;

  if (!isLoggedIn) {
    return (
      <a
        href={signupHref}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-blue-700 transition-colors"
      >
        Prati ovu priliku
      </a>
    );
  }

  return <FollowButton opportunityId={opportunityId} />;
}
